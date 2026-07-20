import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, ArrowRight, Fingerprint, Lock, Mail, CircleAlert as AlertCircle, Loader as Loader2, Sparkles, Activity, Globe } from "lucide-react";
import { motion } from "framer-motion";

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("avery.chen@coherence.ai");
  const [password, setPassword] = useState("••••••••••");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Enter your credentials to continue."); return; }
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
      navigate("/dashboard");
    } catch {
      setError("Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-background">
      {/* Ambient backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-1/4 h-[480px] w-[480px] rounded-full bg-sky-500/10 blur-[120px]" />
        <div className="absolute -right-40 bottom-0 h-[420px] w-[420px] rounded-full bg-cyan-400/10 blur-[120px]" />
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.04] blur-[140px]" />
        <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.18) 1px, transparent 0)", backgroundSize: "32px 32px" }} />
      </div>

      {/* Left brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-border p-12 lg:flex">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 shadow-[0_0_30px_-6px_hsl(199_89%_52%)]">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-white"><path d="M4 16c5-9 11-9 16 0" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round"/><circle cx="12" cy="8" r="2.6" fill="currentColor"/></svg>
          </div>
          <div className="leading-tight">
            <div className="text-base font-bold tracking-tight text-foreground">CoherenceIQ</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">COHERENCE AI</div>
          </div>
        </div>

        <div className="max-w-md space-y-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
              <Sparkles className="h-3 w-3" /> Next-Generation Login Risk Intelligence
            </div>
            <h1 className="text-[34px] font-bold leading-[1.1] tracking-tight text-foreground">
              Stop account takeover <span className="gradient-text">before it happens.</span>
            </h1>
            <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
              COHERENCE AI scores every login in real time — fusing behavioral biometrics, device intelligence, geo-velocity and graph signals into a single coherence score that flags fraud with sub-200ms latency.
            </p>
          </motion.div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Activity, label: "Avg latency", value: "176ms" },
              { icon: Globe, label: "Signals fused", value: "240+" },
              { icon: ShieldCheck, label: "Fraud blocked", value: "99.4%" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 + i * 0.08 }}
                className="glass-card p-3.5"
              >
                <s.icon className="h-4 w-4 text-primary" />
                <div className="mt-2 text-lg font-bold text-foreground">{s.value}</div>
                <div className="text-[10.5px] text-muted-foreground">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 text-[10.5px] text-muted-foreground">
          <span>SOC 2 Type II</span><span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
          <span>ISO 27001</span><span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
          <span>PCI DSS L1</span><span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
          <span>GDPR Ready</span>
        </div>
      </div>

      {/* Right form panel */}
      <div className="relative flex w-full items-center justify-center p-6 lg:w-1/2">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-[380px]"
        >
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-white"><path d="M4 16c5-9 11-9 16 0" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round"/><circle cx="12" cy="8" r="2.6" fill="currentColor"/></svg>
            </div>
            <div className="leading-tight">
              <div className="text-base font-bold text-foreground">CoherenceIQ</div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">COHERENCE AI</div>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-[22px] font-semibold tracking-tight text-foreground">Sign in to your workspace</h2>
            <p className="mt-1.5 text-[13px] text-muted-foreground">Enter your credentials to access the risk console.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11.5px] font-medium text-muted-foreground">Work email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="h-11 pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11.5px] font-medium text-muted-foreground">Password</label>
                <button type="button" className="text-[11px] text-primary hover:underline">Forgot?</button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="h-11 pl-9"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <input type="checkbox" defaultChecked className="h-3.5 w-3.5 rounded border-border accent-primary" />
                Trust this device for 30 days
              </label>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="h-11 w-full text-[13px]" size="lg">
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Authenticating…</>
              ) : (
                <>Sign in securely <ArrowRight className="h-4 w-4" /></>
              )}
            </Button>

            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10.5px] uppercase tracking-wider text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <Button type="button" variant="outline" className="h-11 w-full" size="lg">
              <Fingerprint className="h-4 w-4" /> Continue with SSO / Passkey
            </Button>
          </form>

          <p className="mt-6 text-center text-[11.5px] text-muted-foreground">
            Protected by CoherenceIQ adaptive MFA · This session will be risk-scored.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
