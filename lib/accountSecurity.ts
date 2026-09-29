import crypto from "crypto";
import User, { IUser } from "@/models/User";
import { parseUserAgent } from "@/lib/userAgent";
import { sendLoginAlertEmail } from "@/lib/email";

const MAX_KNOWN_DEVICES = 20;

/**
 * Remembers the browser/OS the user just signed in from and emails a
 * login alert when it's one we haven't seen before. The very first
 * recorded device is stored silently, so existing accounts don't get an
 * alert on their first sign-in after this shipped. Never throws.
 */
export async function recordLoginDevice(
  user: Pick<IUser, "_id" | "email" | "name" | "knownDevices">,
  req: Request
): Promise<void> {
  try {
    const { browser, os, device } = parseUserAgent(req.headers.get("user-agent"));
    const fingerprint = crypto
      .createHash("sha256")
      .update(`${browser}|${os}|${device}`)
      .digest("hex");

    const known = user.knownDevices || [];
    const isKnown = known.some((d) => d.fingerprint === fingerprint);
    const now = new Date();

    if (isKnown) {
      await User.updateOne(
        { _id: user._id, "knownDevices.fingerprint": fingerprint },
        { $set: { "knownDevices.$.lastSeenAt": now } }
      );
      return;
    }

    await User.updateOne(
      { _id: user._id },
      {
        $push: {
          knownDevices: {
            $each: [{ fingerprint, lastSeenAt: now }],
            $sort: { lastSeenAt: -1 },
            $slice: MAX_KNOWN_DEVICES,
          },
        },
      }
    );

    if (known.length === 0) return;

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "";

    await sendLoginAlertEmail({
      to: user.email,
      name: user.name,
      browser,
      os,
      device,
      ip,
      loginAt: now,
    });
  } catch (err) {
    console.warn("[Login Alert] Failed to record device or send alert:", err);
  }
}
