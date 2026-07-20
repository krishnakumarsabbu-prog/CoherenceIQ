import { createContext, useContext, useState, type ReactNode } from "react";
import type { AppUser } from "@/types";

interface AuthCtx {
  user: AppUser | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthCtx | undefined>(undefined);

const MOCK_USER: AppUser = {
  id: "u-001",
  name: "Avery Chen",
  email: "avery.chen@coherence.ai",
  role: "Principal Risk Analyst",
  tenant: "Global Bank · Production",
  avatar: "AC",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);

  const signIn = async (email: string, _password: string) => {
    await new Promise((r) => setTimeout(r, 850));
    setUser({ ...MOCK_USER, email: email || MOCK_USER.email });
  };

  const signOut = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
