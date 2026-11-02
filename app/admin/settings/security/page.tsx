"use client";

import React from "react";
import SettingsNavTabs from "@/components/admin/settings/SettingsNavTabs";
import TwoFactorCard from "@/components/account/TwoFactorCard";

export default function AdminSecuritySettingsPage() {
  return (
    <div className="space-y-6">
      <SettingsNavTabs />
      <div className="max-w-xl">
        <TwoFactorCard />
      </div>
    </div>
  );
}
