"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Bot, Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const [form, setForm] = useState({ email: "", full_name: "", password: "", role: "customer" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await authApi.register(form);
      setAuth(
        { id: data.user_id, email: data.email, full_name: data.full_name, role: data.role },
        data.access_token
      );
      if (data.role === "admin") router.push("/admin");
      else if (data.role === "support") router.push("/dashboard");
      else router.push("/chat");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-brand-500/20 border border-brand-500/30 rounded-2xl flex items-center justify-center mb-4 glow-brand">
            <Bot className="w-7 h-7 text-brand-400" />
          </div>
          <h1 className="text-2xl font-semibold text-white">Create account</h1>
          <p className="text-slate-400 text-sm mt-1">Join SupportAI</p>
        </div>

        <div className="glass p-6 space-y-5">
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm text-slate-400">Full name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input id="full-name" type="text" value={form.full_name} onChange={set("full_name")}
                  placeholder="Jane Smith" className="input w-full pl-9" required minLength={2} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-slate-400">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input id="reg-email" type="email" value={form.email} onChange={set("email")}
                  placeholder="you@company.com" className="input w-full pl-9" required />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-slate-400">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input id="reg-password" type="password" value={form.password} onChange={set("password")}
                  placeholder="Min 8 characters" className="input w-full pl-9" required minLength={8} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-slate-400">Account type</label>
              <select id="role" value={form.role} onChange={set("role")}
                className="input w-full bg-surface-2">
                <option value="customer">Customer</option>
                <option value="support">Support Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button id="register-btn" type="submit" disabled={loading}
              className="btn-brand w-full flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> :
                <>Create account <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link href="/login" className="text-brand-400 hover:text-brand-300 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
