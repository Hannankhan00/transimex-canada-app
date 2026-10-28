import { isValidObjectId } from "mongoose";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import ExpressAccount from "@/models/ExpressAccount";
import { notifyUser } from "@/lib/notifications";
import { sendExpressTermsEmail } from "@/lib/expressEmail";

/**
 * Tells every active Express client that new terms were published: an in-app notification plus an email (when
 * Express emails are on). Partner customers are left out, since they never accepted the terms themselves. Clients
 * must still accept the new version when they next book, whether or not they read this. Best effort: it never
 * throws, so a mail problem cannot undo a publish. Returns how many clients were told.
 */
export async function notifyTermsPublished(version: string): Promise<number> {
  try {
    await connectDB();
    const accounts = await ExpressAccount.find({ status: "active", type: { $in: ["b2c", "b2b"] } }).select("userId language contactName").lean<any[]>();
    let told = 0;
    for (const account of accounts) {
      try {
        if (!isValidObjectId(account.userId)) continue;
        const user = await User.findById(account.userId).select("name email").lean<any>();
        await notifyUser({
          userId: String(account.userId),
          title: "Express terms updated",
          titleFr: "Conditions Express mises à jour",
          desc: "Please review the new terms. You will accept them at your next booking.",
          descFr: "Veuillez lire les nouvelles conditions. Vous les accepterez à votre prochaine réservation.",
          category: "system",
          link: "/express/book",
        });
        if (user?.email) {
          await sendExpressTermsEmail({ to: user.email, name: account.contactName || user.name, language: account.language || "en", version });
        }
        told++;
      } catch (error) {
        console.warn("[Express] Terms notice failed for one account:", error);
      }
    }
    return told;
  } catch (error) {
    console.warn("[Express] Terms notices failed:", error);
    return 0;
  }
}
