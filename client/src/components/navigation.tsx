import { Button } from "@/components/ui/button";
import { useAuth, useLogout } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { AuthModal } from "./auth-modal";

export function Navigation() {
  const { user, isAuthenticated } = useAuth();
  const logout = useLogout();
  const [location] = useLocation();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  const handleShowLogin = () => {
    setAuthMode("login");
    setShowAuthModal(true);
  };

  const handleShowRegister = () => {
    setAuthMode("register");
    setShowAuthModal(true);
  };

  const handleLogout = () => {
    logout.mutate();
  };

  return (
    <>
      <nav className="border-b border-border bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/">
                <h1 className="text-xl font-semibold text-foreground cursor-pointer">
                  Lejebolig Find
                </h1>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <span className="text-sm text-muted-foreground">
                    Hej, {user?.name}
                  </span>
                  <Link href="/mine-boliger">
                    <Button 
                      variant={location === "/mine-boliger" ? "default" : "ghost"}
                      size="sm"
                    >
                      Mine boliger
                    </Button>
                  </Link>
                  <Link href="/beskeder">
                    <Button 
                      variant={location === "/beskeder" ? "default" : "ghost"}
                      size="sm"
                    >
                      Beskeder
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleLogout}
                    disabled={logout.isPending}
                  >
                    Log ud
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleShowLogin}
                  >
                    Log ind
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleShowRegister}
                  >
                    Opret konto
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
        onSwitchMode={(mode) => setAuthMode(mode)}
      />
    </>
  );
}
