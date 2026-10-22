import { useState, useEffect, ReactNode } from 'react';
import { getMe, login as apiLogin, logout as apiLogout } from '../api/authApi';
import {CurrentUser} from "../types/userTypes.ts";
import { AuthContext } from './Context.tsx';
import {useNavigate} from "@tanstack/react-router";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    const user = await apiLogin({ username, password });
    setUser(user);
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
    navigate({ to: '/login' });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
