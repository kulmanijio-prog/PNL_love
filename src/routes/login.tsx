import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in · TERMINAL" }] }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + "/dashboard" },
        });
        if (error) throw error;
        toast.success("Account created. You're in.");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Auth failed");
    } finally { setLoading(false); }
  };

  const google = async () => {
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
      if (result.error) { toast.error(result.error.message ?? "Google sign-in failed"); return; }
      if (result.redirected) return;
      navigate({ to: "/dashboard" });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Google sign-in failed");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 terminal-grid">
      <div className="w-full max-w-md panel">
        <div className="panel-header">
          <span><span className="label">AUTH</span> · {mode === "signin" ? "SIGN IN" : "REGISTER"}</span>
          <Link to="/" className="text-cyan hover:underline">/HOME</Link>
        </div>
        <form onSubmit={submit} className="space-y-4 p-6">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Email</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border border-border bg-background px-3 py-2 font-mono text-sm focus:border-amber focus:outline-none"
            />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Password</label>
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)} minLength={6}
              className="mt-1 w-full border border-border bg-background px-3 py-2 font-mono text-sm focus:border-amber focus:outline-none"
            />
          </div>
          <button type="submit" disabled={loading}
            className="w-full border border-amber bg-amber px-4 py-2 font-mono text-xs uppercase tracking-widest text-background hover:bg-amber/90 disabled:opacity-50">
            {loading ? "…" : mode === "signin" ? "Enter" : "Create account"}
          </button>
          <button type="button" onClick={google}
            className="w-full border border-border bg-background px-4 py-2 font-mono text-xs uppercase tracking-widest hover:border-amber/60">
            Continue with Google
          </button>
          <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="block w-full text-center font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-amber">
            {mode === "signin" ? "Need an account? Register →" : "Have an account? Sign in →"}
          </button>
        </form>
      </div>
    </div>
  );
}
