import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notifications";
import { sendPaymentProofUploadedAdminAlert } from "@/lib/email";
import { hasModulePermission } from "@/lib/rbac";
import { isR2Configured, uploadToR2, getFromR2 } from "@/lib/r2";
import { findInvoiceByIdOrNumber, stripInvoiceBuffers } from "@/lib/invoice";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];

function isOwner(invoice: any, currentUser: { userId: string; email: string }) {
  return (
    (invoice.client?.userId && invoice.client.userId === currentUser.userId) ||
    (invoice.client?.email && invoice.client.email.toLowerCase() === currentUser.email.toLowerCase())
  );
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const invoice = await findInvoiceByIdOrNumber(id);
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    await connectDB();
    const actorUser = await User.findById(currentUser.userId).lean<any>();
    const isAdmin = actorUser && hasModulePermission(actorUser, "invoices");
    if (!isAdmin && !isOwner(invoice, currentUser)) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const proof = invoice.paymentProof;
    if (!proof || (!proof.fileKey && !proof.fileData)) {
      return NextResponse.json({ error: "No payment proof on file" }, { status: 404 });
    }

    if (proof.fileKey) {
      const r2File = await getFromR2(proof.fileKey);
      if (r2File) {
        return new NextResponse(new Uint8Array(r2File.buffer), {
          headers: {
            "Content-Type": r2File.contentType || proof.mimeType || "application/octet-stream",
            "Content-Disposition": `inline; filename="proof-${invoice.invoiceNumber}"`,
          },
        });
      }
    }

    if (proof.fileData) {
      return new NextResponse(new Uint8Array(proof.fileData), {
        headers: {
          "Content-Type": proof.mimeType || "application/octet-stream",
          "Content-Disposition": `inline; filename="proof-${invoice.invoiceNumber}"`,
        },
      });
    }

    return NextResponse.json({ error: "No payment proof on file" }, { status: 404 });
  } catch (error: any) {
    console.error("Error fetching payment proof:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch payment proof" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const invoice = await findInvoiceByIdOrNumber(id);
    if (!invoice || !isOwner(invoice, currentUser)) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.status === "paid") {
      return NextResponse.json({ error: "This invoice has already been paid and verified." }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "A payment proof file is required" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Payment proof must be an image (JPG, PNG, WEBP, HEIC) or PDF" },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File exceeds the 10MB upload limit" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const r2Key = `payment-proofs/${encodeURIComponent(invoice.invoiceNumber)}/${Date.now()}-${sanitizedFileName}`;

    let fileKey = "";
    let fileUrl = "";
    let storageProvider: "r2" | "mongodb" = "mongodb";
    let fileDataBuffer: Buffer | undefined = undefined;

    if (isR2Configured()) {
      try {
        const r2Result = await uploadToR2({
          key: r2Key,
          buffer,
          mimeType: file.type,
          metadata: { invoiceNumber: invoice.invoiceNumber, originalName: file.name },
        });
        fileKey = r2Result.key;
        fileUrl = r2Result.url || "";
        storageProvider = "r2";
      } catch (r2Err: any) {
        console.warn("[Cloudflare R2] Payment proof upload failed, falling back to database buffer:", r2Err.message);
        fileDataBuffer = buffer;
        storageProvider = "mongodb";
      }
    } else {
      fileDataBuffer = buffer;
      storageProvider = "mongodb";
    }

    invoice.paymentProof = {
      fileKey,
      fileUrl,
      storageProvider,
      fileData: fileDataBuffer,
      mimeType: file.type,
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
    };
    invoice.status = "pending_verification";
    invoice.paymentRejectionReason = "";
    await invoice.save();

    await connectDB();
    try {
      const staffUsers = await User.find({
        role: { $in: ["admin", "superadmin", "subadmin", "dispatcher"] },
      })
        .select("_id email")
        .lean<any[]>();

      await Promise.all(
        staffUsers.map((s) =>
          sendPaymentProofUploadedAdminAlert({
            to: s.email,
            invoiceNumber: invoice.invoiceNumber,
            clientName: invoice.client.name,
            companyName: invoice.client.companyName,
            amountDisplay: invoice.amountDisplay,
          })
        )
      );

      await Promise.all(
        staffUsers.map((s) =>
          notifyUser({
            userId: s._id.toString(),
            category: "document",
            title: `Payment Proof Uploaded — ${invoice.invoiceNumber}`,
            titleFr: `Preuve de Paiement Téléversée — ${invoice.invoiceNumber}`,
            desc: `${invoice.client.name} uploaded a payment proof for invoice ${invoice.invoiceNumber} (${invoice.amountDisplay}).`,
            descFr: `${invoice.client.name} a téléversé une preuve de paiement pour la facture ${invoice.invoiceNumber} (${invoice.amountDisplay}).`,
            link: `/admin/invoices`,
          })
        )
      );
    } catch (notifyErr) {
      console.warn("[Notification] Could not alert staff of payment proof upload:", notifyErr);
    }

    await logAudit({
      actor: currentUser,
      action: "PAYMENT_PROOF_UPLOADED",
      resourceType: "Invoice",
      resourceId: invoice.invoiceNumber,
      details: `Payment proof "${file.name}" uploaded for invoice ${invoice.invoiceNumber} via ${storageProvider.toUpperCase()}.`,
    });

    const invoiceObj: any = stripInvoiceBuffers(invoice.toObject());

    return NextResponse.json({
      success: true,
      message: "Payment proof uploaded. Our team will verify it shortly.",
      invoice: { ...invoiceObj, id: invoice._id.toString() },
    });
  } catch (error: any) {
    console.error("Error uploading payment proof:", error);
    return NextResponse.json({ error: error.message || "Failed to upload payment proof" }, { status: 500 });
  }
}
