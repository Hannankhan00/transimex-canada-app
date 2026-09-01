import React from "react";
import PortalShell from "@/components/portal/PortalShell";

export const metadata = {
  title: "Client Portal | Transimex Canada Logistics",
  description: "Institutional logistics freight dispatch and account dashboard.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PortalShell>{children}</PortalShell>;
}
