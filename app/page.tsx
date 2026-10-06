import { AuthPage } from "@/components/auth-page";
import { Suspense } from "react";

export default function Home() {
  return (
    <Suspense>
      <AuthPage />
    </Suspense>
  );
}
