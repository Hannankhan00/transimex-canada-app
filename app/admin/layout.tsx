import React from "react";
import AdminShell from "@/components/admin/AdminShell";

export const metadata = {
  title: "Operations Admin | Transimex Canada Logistics",
  description: "Institutional logistics freight dispatch and staff administration portal.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
