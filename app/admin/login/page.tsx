"use client";

import { useTransition, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { loginStaff } from "@/server/actions/auth";
import { loginSchema, LoginInput } from "@/lib/validations/auth";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, ArrowRight, Lock, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ThemeToggle } from "@/components/shared/theme-toggle";

import Image from "next/image";

export default function AdminLoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(data: LoginInput) {
    startTransition(async () => {
      const result = await loginStaff(data);

      if ("error" in result) {
        toast.error(result.error);
        form.setError("root", { type: "manual", message: result.error });
        return;
      }

      if (result.success) {
        toast.success("Welcome back!");
        router.push(result.redirectTo);
      }
    });
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#FDFCF8] dark:bg-zinc-950 p-4 overflow-hidden selection:bg-primary/30">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] rounded-full bg-orange-500/10 dark:bg-orange-600/20 blur-[100px]" />
      </div>

      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-[420px]">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-24 h-24 mb-6 relative overflow-hidden group">
            <Image 
              src="/Logo.png" 
              alt="Classy Crave Logo" 
              fill
              className="object-contain group-hover:scale-105 transition-transform duration-500 ease-out"
              priority
            />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 mb-2">
            Classy Crave
          </h1>
          <p className="text-muted-foreground font-medium text-sm px-4">
            Authorized Personnel Only &bull; Central Management System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-zinc-200/50 dark:border-zinc-800/50 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40%] h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                      Email Address
                    </FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input 
                          placeholder="admin@classycrave.com" 
                          {...field} 
                          disabled={isPending}
                          className="h-12 pl-10 bg-zinc-50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 focus-visible:ring-primary focus-visible:border-primary transition-all rounded-xl text-base"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                        Password
                      </FormLabel>
                    </div>
                    <FormControl>
                      <div className="relative group">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          {...field}
                          disabled={isPending}
                          className="h-12 pl-10 pr-12 bg-zinc-50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 focus-visible:ring-primary focus-visible:border-primary transition-all rounded-xl text-base font-mono"
                        />
                        <button
                          type="button"
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={isPending}
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.formState.errors.root && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 text-center animate-in fade-in slide-in-from-top-1">
                  {form.formState.errors.root.message}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl text-base font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 group"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Sign In to Portal
                    <ArrowRight className="ml-2 w-4 h-4 opacity-70 group-hover:translate-x-1 group-hover:opacity-100 transition-all" />
                  </>
                )}
              </Button>
            </form>
          </Form>
        </div>
        
        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8 font-medium">
          &copy; {new Date().getFullYear()} Classy Crave. All rights reserved.
        </p>
      </div>
    </div>
  );
}
