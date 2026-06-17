"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import { Bot, Settings, Database, BarChart3, LogOut, LayoutDashboard } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticated) router.replace("/login");
    else if (user?.role !== "admin") router.replace("/dashboard");
  }, [isAuthenticated, user, router]);

  const navItems = [
    { href: "/admin", label: "Overview", icon: BarChart3 },
    { href: "/dashboard", label: "Support Desk", icon: LayoutDashboard },
  ];

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 glass border-r border-white/5 flex flex-col">
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-purple-500/20 border border-purple-500/30 rounded-lg flex items-center justify-center">
              <Settings className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">SupportAI</p>
              <p className="text-xs text-purple-400">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className={`nav-item ${pathname === href ? "active" : ""}`}>
              <Icon className="w-4 h-4" />
              <span className="text-sm">{label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-white/5">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-purple-300">
                {user?.full_name?.[0]?.toUpperCase() || "A"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{user?.full_name}</p>
              <p className="text-xs text-slate-500">Admin</p>
            </div>
            <button onClick={() => { logout(); router.push("/login"); }}
              className="text-slate-500 hover:text-white transition-colors p-1">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
