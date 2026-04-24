"use client";
import { ErrorBoundary, SessionExpiredModal } from "@/components/error-boundary";
import { useAuth } from "@/lib/auth-context";

function SessionHandler({ children }) {
  const { sessionExpired, dismissSessionExpired } = useAuth();
  return (
    <>
      {children}
      {sessionExpired && <SessionExpiredModal onDismiss={dismissSessionExpired} />}
    </>
  );
}

export function ClientWrapper({ children }) {
  return (
    <ErrorBoundary>
      <SessionHandler>{children}</SessionHandler>
    </ErrorBoundary>
  );
}
