// Reference: javascript_log_in_with_replit integration blueprint

export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

/**
 * Redirect to login page with optional return URL.
 */
export function redirectToLogin(returnUrl?: string): void {
  const loginUrl = returnUrl 
    ? `/api/login?returnTo=${encodeURIComponent(returnUrl)}`
    : "/api/login";
  window.location.href = loginUrl;
}

/**
 * Redirect to logout endpoint.
 */
export function redirectToLogout(): void {
  window.location.href = "/api/logout";
}
