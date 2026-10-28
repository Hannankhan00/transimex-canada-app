import React from "react";
import { notFound, redirect } from "next/navigation";
import ExpressShell from "@/components/express/ExpressShell";
import { isExpressEnabled } from "@/lib/express/config";
import { getCurrentUser } from "@/lib/session";

export const metadata = {
  title: "Transimex Express",
  description: "International express shipping to and from Canada, powered by DHL Express.",
};

// The flag and the session are read per request, never at build time.
export const dynamic = "force-dynamic";

export default async function ExpressLayout({ children }: { children: React.ReactNode }) {
  // With the flag off the area does not exist for anyone.
  if (!isExpressEnabled()) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login?from=/express");

  return <ExpressShell userName={user.name}>{children}</ExpressShell>;
}
