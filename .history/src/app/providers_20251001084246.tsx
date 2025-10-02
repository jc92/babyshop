"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

type ProvidersProps = {
  children: ReactNode;
};

export default function NextAuthProvider({ children }: ProvidersProps) {
  return <SessionProvider>{children}</SessionProvider>;
}

