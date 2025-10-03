"use client";

import type { ReactNode } from "react";
import { ClerkProvider } from '@clerk/nextjs';
import { SafeUserProvider, clerkEnabled, clerkPublishableKey } from "@/lib/clerkClient";

type ProvidersProps = {
  children: ReactNode;
};

export default function AppProviders({ children }: ProvidersProps) {
  if (!clerkEnabled) {
    return <SafeUserProvider>{children}</SafeUserProvider>;
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <SafeUserProvider>{children}</SafeUserProvider>
    </ClerkProvider>
  );
}
