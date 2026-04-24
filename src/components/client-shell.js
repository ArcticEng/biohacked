"use client";

import { useAuth } from "@/lib/auth-context";
import { ErrorBoundary, SessionExpiredModal } from "@/components/shared";

export function ClientShell({ children }) {
  const { sessionExpired, dismissSessionExpired } = useAuth();

  return (
    <ErrorBoundary>
      {children}
      {sessionExpired && <SessionExpiredModal onDismiss={dismissSessionExpired} />}
    </ErrorBoundary>
  );
}
