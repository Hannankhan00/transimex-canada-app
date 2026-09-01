import { Suspense } from "react";
import AuthPage from "@/app/login/page";

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <AuthPage />
    </Suspense>
  );
}
