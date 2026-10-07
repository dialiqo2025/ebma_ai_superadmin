"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, type AuthUser } from "@/lib/auth";

function decodeBase64UrlJson(value: string): AuthUser {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const json = atob(padded + pad);
  return JSON.parse(json) as AuthUser;
}

function OAuthSuccessInner() {
  const search = useSearchParams();
  const router = useRouter();
  const { setSession, ready } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready) return;

    const oauthError = search.get("error");
    if (oauthError) {
      setError(oauthError);
      return;
    }

    const token = search.get("token");
    const userParam = search.get("user");
    if (!token || !userParam) {
      setError("Missing authentication details from sign-in.");
      return;
    }

    try {
      const user = decodeBase64UrlJson(userParam);
      setSession(token, user);
      router.replace(user.role === "superAdmin" ? "/platform/admin" : "/platform");
    } catch {
      setError("Could not complete sign-in. Please try again.");
    }
  }, [ready, search, setSession, router]);

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center bg-page px-6 text-center">
        <div className="max-w-md">
          <p className="text-sm text-danger">{error}</p>
          <a href="/" className="mt-4 inline-block text-sm text-accent hover:text-text">
            Back to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-page">
      <span className="inline-block h-[18px] w-[18px] animate-[spin_.7s_linear_infinite] rounded-full border-2 border-white/30 border-t-white" />
    </div>
  );
}

export default function OAuthSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-page">
          <span className="inline-block h-[18px] w-[18px] animate-[spin_.7s_linear_infinite] rounded-full border-2 border-white/30 border-t-white" />
        </div>
      }
    >
      <OAuthSuccessInner />
    </Suspense>
  );
}
