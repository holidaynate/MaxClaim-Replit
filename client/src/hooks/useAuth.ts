// Reference: javascript_log_in_with_replit integration blueprint
import { useQuery } from "@tanstack/react-query";

interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<AuthUser | null>({
    queryKey: ["/api/user/me"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/user/me");
        if (response.status === 401) {
          return null;
        }
        if (!response.ok) {
          return null;
        }
        return response.json();
      } catch {
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    error,
  };
}
