import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, LogOut, User } from "lucide-react";
import { useLocation } from "wouter";

export function AppHeader({ title, showBack, backTo = "/more" }: { title: string; showBack?: boolean; backTo?: string }) {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const initials = user
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "U"
    : "U";

  return (
    <header className="sticky top-0 z-40">
      <div className="flex items-center justify-between gap-2 px-4 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center gap-2 min-w-0">
          {showBack && (
            <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8" onClick={() => navigate(backTo)} data-testid="button-back">
              <ArrowLeft className="h-5 w-5" style={{ color: '#5c4a1e' }} />
            </Button>
          )}
          {!showBack && (
            <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-primary-foreground font-bold text-xs">GRG</span>
            </div>
          )}
          <h1 className="text-xl font-bold truncate" style={{ color: '#5c4a1e' }} data-testid="text-page-title">{title}</h1>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full flex-shrink-0" data-testid="button-user-menu">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback className="text-xs bg-muted">{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/api/logout" className="flex items-center gap-2" data-testid="button-logout">
                <LogOut className="h-4 w-4" />
                Sign Out
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
