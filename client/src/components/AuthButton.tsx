import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogIn, LogOut, User, FileText } from "lucide-react";
import { Link } from "wouter";

export function AuthButton() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled data-testid="button-auth-loading">
        <span className="animate-pulse">Loading...</span>
      </Button>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Button
        variant="outline"
        size="sm"
        asChild
        data-testid="button-sign-in"
      >
        <a href="/api/login">
          <LogIn className="h-4 w-4 mr-2" />
          Sign In
        </a>
      </Button>
    );
  }

  const initials = [user.firstName, user.lastName]
    .filter(Boolean)
    .map((name) => name?.[0]?.toUpperCase())
    .join("") || user.email?.[0]?.toUpperCase() || "U";

  const displayName = user.firstName 
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
    : user.email || "User";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2" data-testid="button-user-menu">
          <Avatar className="h-7 w-7">
            <AvatarImage src={user.profileImageUrl || undefined} alt={displayName} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline text-sm">{displayName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            {user.email && (
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/my-claims" className="cursor-pointer">
            <FileText className="mr-2 h-4 w-4" />
            My Claims
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/api/logout" className="cursor-pointer text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
