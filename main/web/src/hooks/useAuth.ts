import { useState, useEffect } from "react";

export default function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    // TODO: wire Clerk auth state and public metadata
    setIsAuthenticated(true);
    setRole("staff");
  }, []);

  return {
    isAuthenticated,
    role,
  };
}
