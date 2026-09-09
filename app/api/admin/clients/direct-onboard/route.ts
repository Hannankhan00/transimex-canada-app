import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import Quote from "@/models/Quote";
import { verifyToken, hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notifications";
import { sendDirectClientOnboardingQuoteEmail } from "@/lib/email";
import { formatDateLabel } from "@/lib/formatDate";

function generateSecurePassword(): string {
  const uppers = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowers = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "!@#$%*";
  const all = uppers + lowers + numbers + symbols;

  const chars = [
    uppers[Math.floor(Math.random() * uppers.length)],
    lowers[Math.floor(Math.random() * lowers.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];
  for (let i = 0; i < 6; i++) {
    chars.push(all[Math.floor(Math.random() * all.length)]);
  }
  return "Tx-" + chars.sort(() => Math.random() - 0.5).join("");
}

function formatCurrency(val: string | number): string {
  if (!val) return "";
  const str = String(val).replace(/[^0-9.]/g, "");
  const num = parseFloat(str);
  if (isNaN(num)) return String(val);
  return "$" + num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " CAD";
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const actor = verifyToken(token);
    if (!actor || !["admin", "superadmin", "subadmin", "dispatcher"].includes(actor.role)) {
      return NextResponse.json(
        { error: "Forbidden: Administrator permissions required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      // Client information
      clientName,
      clientCompany,
      clientEmail,
      clientPhone,
      industry = "Industrial",
      city = "Montreal",
      province = "QC",
      billingAddress = "",

      // Route specifications
      originCity,
      originProvince,
      originPostal,
      destinationCity,
      destinationProvince,
      destinationPostal,

      // Cargo details
      transportMode,
      equipment,
      commodity,
      commodityType,
      weightLbs,
      palletCount,
      dimLengthIn,
      dimWidthIn,
      dimHeightIn,
      cargoType = "General Freight",
      temperatureControlled = false,
      hazmat = false,
      pickupDate,
      specialInstructions,

      // Agreed Pricing & Terms
      priceCad,
      priceUsd,
      breakdown,
      validUntil = "7 Business Days from Issuance",
      adminNotes = "",
    } = body;

    const resolvedCommodity = (commodity || commodityType || "").trim();

    // Required fields validation
    if (!clientName?.trim() || !clientEmail?.trim()) {
      return NextResponse.json(
        { error: "Client full name and valid corporate email are required" },
        { status: 400 }
      );
    }

    if (!originCity?.trim() || !destinationCity?.trim()) {
      return NextResponse.json(
        { error: "Origin and destination cities are required" },
        { status: 400 }
      );
    }

    if (!transportMode || !resolvedCommodity || !weightLbs) {
      return NextResponse.json(
        { error: "Transport mode, commodity, and freight weight are required" },
        { status: 400 }
      );
    }

    if (!priceCad || !String(priceCad).trim()) {
      return NextResponse.json(
        { error: "Agreed freight rate (CAD) is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const emailLower = clientEmail.toLowerCase().trim();
    let user = await User.findOne({ email: emailLower });
    let temporaryPassword = "";
    let isNewUser = false;

    if (!user) {
      // Auto-provision brand new verified client account
      temporaryPassword = generateSecurePassword();
      const hashedPassword = await hashPassword(temporaryPassword);

      user = await User.create({
        name: clientName.trim(),
        email: emailLower,
        password: hashedPassword,
        companyName: clientCompany?.trim() || `${clientName.trim()}'s Company`,
        phone: clientPhone?.trim() || "",
        address: billingAddress?.trim() || "",
        city: city?.trim() || "Montreal",
        province: province?.trim() || "QC",
        industry: industry || "Industrial",
        role: "client",
        isVerified: true, // Pre-verified since onboarded by administrator
        accountStatus: "active",
      });
      isNewUser = true;
    }

    const formattedCadRate = formatCurrency(priceCad);
    const dimensions =
      dimLengthIn && dimWidthIn && dimHeightIn
        ? `${dimLengthIn}in x ${dimWidthIn}in x ${dimHeightIn}in`
        : "";

    const originDetail = [originCity, originProvince, originPostal].filter(Boolean).join(", ");
    const destinationDetail = [destinationCity, destinationProvince, destinationPostal].filter(Boolean).join(", ");

    let finalCargoType = cargoType || "General Freight";
    if (hazmat) {
      finalCargoType = "Hazardous Materials";
    } else if (temperatureControlled) {
      finalCargoType = "Perishable / Cold-Chain";
    }

    const now = new Date();
    const quoteData = {
      client: {
        name: user.name || clientName.trim(),
        companyName: user.companyName || clientCompany?.trim() || "",
        email: emailLower,
        phone: user.phone || clientPhone?.trim() || "",
        userId: user._id.toString(),
      },
      route: {
        origin: `${originCity} (${originProvince || ""})`.trim(),
        originDetail: originDetail || originCity,
        destination: `${destinationCity} (${destinationProvince || ""})`.trim(),
        destinationDetail: destinationDetail || destinationCity,
      },
      cargo: {
        transportMode: transportMode,
        equipment: equipment || transportMode,
        cargoType: finalCargoType,
        weight: `${Number(String(weightLbs).replace(/[^0-9.]/g, "") || 0).toLocaleString()} lbs`,
        palletCount: palletCount ? parseInt(String(palletCount), 10) : 0,
        dimensions,
        commodity: resolvedCommodity,
        preferredPickupDate: pickupDate || "",
        specialInstructions: specialInstructions?.trim() || "",
      },
      status: "quoted" as const, // Directly marked as quoted/rate offered!
      priceCad: formattedCadRate,
      priceUsd: priceUsd ? String(priceUsd).trim() : "",
      breakdown: breakdown && Object.keys(breakdown).length ? breakdown : undefined,
      offeredAt: now.toISOString(),
      submittedDate: formatDateLabel(now),
      validUntil: validUntil || "7 Business Days from Issuance",
      adminNotes: adminNotes?.trim()
        ? `[Direct Consultation by ${actor.name}] ${adminNotes.trim()}`
        : `Direct client consultation conducted by ${actor.name}. Rate agreed and offered.`,
    };

    // Retry loop for unique refNumber collision resistance
    let createdQuote;
    for (let attempt = 0; attempt < 3; attempt++) {
      const refNumber = `QT-2026-${Math.floor(10000 + Math.random() * 90000)}`;
      try {
        createdQuote = await Quote.create({ ...quoteData, refNumber });
        break;
      } catch (createErr: any) {
        if (createErr?.code === 11000 && attempt < 2) continue;
        throw createErr;
      }
    }

    if (!createdQuote) {
      throw new Error("Failed to generate quote with unique reference ID.");
    }

    // Send the direct onboarding & quote confirmation email
    let emailSent = false;
    try {
      await sendDirectClientOnboardingQuoteEmail({
        to: emailLower,
        name: user.name || clientName.trim(),
        companyName: user.companyName,
        temporaryPassword: isNewUser ? temporaryPassword : undefined,
        quoteId: createdQuote.refNumber,
        origin: createdQuote.route.origin,
        destination: createdQuote.route.destination,
        transportMode: createdQuote.cargo.transportMode,
        commodity: createdQuote.cargo.commodity,
        priceCad: formattedCadRate,
        validUntil: createdQuote.validUntil,
      });
      emailSent = true;
    } catch (mailErr) {
      console.warn("[Email Notification] Could not send direct onboarding email:", mailErr);
    }

    // In-portal notification
    await notifyUser({
      userId: user._id.toString(),
      category: "quote",
      title: `Pre-Approved Freight Rate Ready — ${createdQuote.refNumber}`,
      titleFr: `Tarif Pré-Approuvé Prêt — ${createdQuote.refNumber}`,
      desc: `Your direct consultation freight rate of ${formattedCadRate} has been registered. Review and accept in your portal to dispatch.`,
      descFr: `Votre tarif de fret de ${formattedCadRate} convenu en consultation a été enregistré. Vérifiez et acceptez dans votre portail.`,
      link: `/dashboard/quotes`,
    });

    // Audit log
    await logAudit({
      actor,
      action: "ADMIN_DIRECT_ONBOARDING_QUOTE",
      resourceType: "Quote",
      resourceId: createdQuote.refNumber,
      details: `Direct onboarding and quote ${createdQuote.refNumber} created for ${emailLower} at ${formattedCadRate}. (New User: ${isNewUser})`,
    });

    return NextResponse.json({
      success: true,
      message: `Direct client ${isNewUser ? "created" : "identified"} and quote ${createdQuote.refNumber} generated successfully.`,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        companyName: user.companyName,
        isNewUser,
      },
      quote: {
        id: createdQuote.refNumber,
        status: createdQuote.status,
        priceCad: createdQuote.priceCad,
        origin: createdQuote.route.origin,
        destination: createdQuote.route.destination,
        commodity: createdQuote.cargo.commodity,
        transportMode: createdQuote.cargo.transportMode,
        validUntil: createdQuote.validUntil,
      },
      emailSent,
    });
  } catch (error: any) {
    console.error("Error in direct client onboarding API:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process direct client onboarding" },
      { status: 500 }
    );
  }
}
