"use client";

import type { ReactNode } from "react";

type ProvidersProps = {
  children: ReactNode;
};

export default function AppProviders({ children }: ProvidersProps) {
  return <>{children}</>;
}

