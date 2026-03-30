import { createContext, useContext, useMemo, useState } from "react";

export type UserRole = "hoster" | "developer" | null;

interface AuthContextValue {
  role: UserRole;
  setRole: (role: Exclude<UserRole, null>) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>(() => {
    const stored = localStorage.getItem("adnode:role");
    return stored === "hoster" || stored === "developer" ? stored : null;
  });

  const value = useMemo(
    () => ({
      role,
      setRole: (nextRole: Exclude<UserRole, null>) => {
        localStorage.setItem("adnode:role", nextRole);
        setRoleState(nextRole);
      },
    }),
    [role],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
