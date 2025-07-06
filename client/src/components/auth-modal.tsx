import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLogin, useRegister } from "@/hooks/use-auth";
import { loginSchema, insertUserSchema } from "@shared/schema";
import type { LoginData, InsertUser } from "@shared/schema";
import { X } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "login" | "register";
  onSwitchMode: (mode: "login" | "register") => void;
}

export function AuthModal({ isOpen, onClose, mode, onSwitchMode }: AuthModalProps) {
  const login = useLogin();
  const register = useRegister();

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
    },
  });

  const handleLogin = (data: LoginData) => {
    login.mutate(data, {
      onSuccess: () => {
        onClose();
        loginForm.reset();
      },
    });
  };

  const handleRegister = (data: InsertUser) => {
    register.mutate(data, {
      onSuccess: () => {
        onClose();
        registerForm.reset();
      },
    });
  };

  const handleClose = () => {
    onClose();
    loginForm.reset();
    registerForm.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "login" ? "Log ind" : "Opret konto"}
          </DialogTitle>
        </DialogHeader>
        
        {mode === "login" ? (
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
              <FormField
                control={loginForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="din@email.dk" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adgangskode</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full" 
                disabled={login.isPending}
              >
                {login.isPending ? "Logger ind..." : "Log ind"}
              </Button>
            </form>
          </Form>
        ) : (
          <Form {...registerForm}>
            <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
              <FormField
                control={registerForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Navn</FormLabel>
                    <FormControl>
                      <Input placeholder="Dit fulde navn" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={registerForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="din@email.dk" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={registerForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adgangskode</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full" 
                disabled={register.isPending}
              >
                {register.isPending ? "Opretter konto..." : "Opret konto"}
              </Button>
            </form>
          </Form>
        )}
        
        <div className="text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <>
              Har du ikke en konto?{" "}
              <button 
                className="text-primary hover:underline"
                onClick={() => onSwitchMode("register")}
              >
                Opret en her
              </button>
            </>
          ) : (
            <>
              Har du allerede en konto?{" "}
              <button 
                className="text-primary hover:underline"
                onClick={() => onSwitchMode("login")}
              >
                Log ind her
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
