import { createContext, useContext, useMemo, useState } from "react";

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
  const [role, setRoleState] = useState<UserRole>(() => {
    const stored = localStorage.getItem("adnode:role");
    return stored === "hoster" || stored === "developer" ? stored : null;
  });
  const [profile, setProfileState] = useState<UserProfile | null>(() => {
    const stored = localStorage.getItem("adnode:profile");
    return stored ? (JSON.parse(stored) as UserProfile) : null;
  });

  const value = useMemo(
    () => ({
      role,
      profile,
      setRole: (nextRole: Exclude<UserRole, null>) => {
        localStorage.setItem("adnode:role", nextRole);
        setRoleState(nextRole);
      },
      clearRole: () => {
        localStorage.removeItem("adnode:role");
        setRoleState(null);
      },
      setProfile: (nextProfile: UserProfile) => {
        localStorage.setItem("adnode:profile", JSON.stringify(nextProfile));
        setProfileState(nextProfile);
      },
    }),
    [profile, role],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
