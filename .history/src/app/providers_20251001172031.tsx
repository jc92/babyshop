"use client";

import type { ReactNode } from "react";
import { ClerkProvider } from '@clerk/nextjs';

type ProvidersProps = {
  children: ReactNode;
};

export default function AppProviders({ children }: ProvidersProps) {
  return (
    <ClerkProvider>
      {children}
    </ClerkProvider>
  );
}

