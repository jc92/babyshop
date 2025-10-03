"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useUser, type useUser as useUserType } from "@clerk/nextjs";

type UseUser = typeof useUserType;
type UseUserReturn = ReturnType<UseUser>;

type SafeUseUser = () => UseUserReturn;

export const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
export const clerkEnabled = Boolean(clerkPublishableKey);

const disabledUser = {
  isLoaded: true,
  isSignedIn: false,
  isSignedOut: true,
  user: null,
} as unknown as UseUserReturn;

const loadingUser = {
  isLoaded: false,
  isSignedIn: false,
  isSignedOut: true,
  user: null,
} as unknown as UseUserReturn;

const SafeUserContext = createContext<UseUserReturn>(loadingUser);

type SafeUserProviderProps = {
  children: ReactNode;
};

function EnabledSafeUserProvider({ children }: SafeUserProviderProps) {
  const value = useUser();

  return <SafeUserContext.Provider value={value}>{children}</SafeUserContext.Provider>;
}

export function SafeUserProvider({ children }: SafeUserProviderProps) {
  if (!clerkEnabled) {
    return <SafeUserContext.Provider value={disabledUser}>{children}</SafeUserContext.Provider>;
  }

  return <EnabledSafeUserProvider>{children}</EnabledSafeUserProvider>;
}

export const useSafeUser: SafeUseUser = () => useContext(SafeUserContext);
