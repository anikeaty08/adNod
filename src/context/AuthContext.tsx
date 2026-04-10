import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useWallet } from "@/context/WalletContext";

export type UserRole = "hoster" | "developer" | null;

export interface UserProfile {
  fullName: string;
  email: string;
  organization: string;
  country: string;
  bio: string;
}

interface AuthContextValue {
  role: UserRole;
  setRole: (role: Exclude<UserRole, null>) => void;
  clearRole: () => void;
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { address } = useWallet();
  const [role, setRoleState] = useState<UserRole>(null);
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const storageKey = useMemo(() => `adnode:${address?.toLowerCase() || "guest"}`, [address]);

  useEffect(() => {
    const storedRole = localStorage.getItem(`${storageKey}:role`);
    const storedProfile = localStorage.getItem(`${storageKey}:profile`);

    setRoleState(storedRole === "hoster" || storedRole === "developer" ? storedRole : null);
    setProfileState(storedProfile ? (JSON.parse(storedProfile) as UserProfile) : null);
  }, [storageKey]);

  const value = useMemo(
    () => ({
      role,
      profile,
      setRole: (nextRole: Exclude<UserRole, null>) => {
        localStorage.setItem(`${storageKey}:role`, nextRole);
        setRoleState(nextRole);
      },
      clearRole: () => {
        localStorage.removeItem(`${storageKey}:role`);
        setRoleState(null);
      },
      setProfile: (nextProfile: UserProfile) => {
        localStorage.setItem(`${storageKey}:profile`, JSON.stringify(nextProfile));
        setProfileState(nextProfile);
      },
    }),
    [profile, role, storageKey],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
