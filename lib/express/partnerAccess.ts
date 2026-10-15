import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import ExpressAccount, { type IExpressAccount } from "@/models/ExpressAccount";
import { requireExpressClient } from "./access";
import { isActivePartner } from "./partner";

/**
 * A signed-in client whose Express account is an approved, active partner.
 * Anyone else gets 403 with a code the screens can explain.
 */
export async function requireActivePartner() {
  const access = await requireExpressClient();
  if (access.error) return { error: access.error } as const;

  await connectDB();
  const account = await ExpressAccount.findOne({ userId: access.actor.userId }).lean<IExpressAccount>();
  if (!account || !isActivePartner(account)) {
    return { error: NextResponse.json({ error: "The partner area is for approved Express partners.", code: "not_partner" }, { status: 403 }) } as const;
  }
  return { actor: access.actor, account } as const;
}
