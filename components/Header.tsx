"use client";
import { useState } from "react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";

interface HeaderProps {
  isAdmin?: boolean;
}

export default function Header({ isAdmin }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const isDashboard = pathname === "/dashboard";
  const isQueens = pathname === "/queens";
  const isPronostics = pathname === "/pronostics";
  const isHistorique = pathname === "/historique";
  const isRegles = pathname === "/regles";

  const go = (path: string) => {
    setMenuOpen(false);
    router.push(path);
  };

  const links = (
    [
      !isDashboard && { label: "Dashboard", path: "/dashboard" },
      !isQueens && { label: "Les Queens", path: "/queens" },
      !isPronostics && { label: "Pronostic", path: "/pronostics" },
      !isHistorique && { label: "Historique", path: "/historique" },
      !isRegles && { label: "Règles", path: "/regles" },
    ] as const
  ).filter((link): link is { label: string; path: string } => Boolean(link));

  return (
    <header className="app-header relative flex justify-between items-center p-4 bg-surface border-b border-surface-border shadow-card sticky top-0 z-30">
      <img
        src="/logo.png"
        alt="Logo"
        className="h-10 w-auto cursor-pointer"
        onClick={() => go("/dashboard")}
      />

      <div className="hidden md:flex items-center gap-1.5">
        {links.map((link) => (
          <button
            key={link.path}
            onClick={() => go(link.path)}
            className="px-4 py-2 rounded-button text-sm font-bold text-ink-soft"
          >
            {link.label}
          </button>
        ))}
        {isAdmin && (
          <button onClick={() => go("/admin")} className="bg-admin text-white px-4 py-2 rounded-button text-sm font-bold ml-1.5">
            Admin
          </button>
        )}
        <button onClick={() => signOut(auth)} className="bg-logout-bg text-logout-ink px-4 py-2 rounded-button text-sm font-bold">
          Déconnexion
        </button>
      </div>

      <button
        onClick={() => setMenuOpen((open) => !open)}
        aria-label="Ouvrir le menu"
        aria-expanded={menuOpen}
        className="md:hidden p-2 text-ink-soft"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          {menuOpen ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
        </svg>
      </button>

      {menuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-surface shadow-card border-t border-surface-border flex flex-col z-40">
          {links.map((link) => (
            <button
              key={link.path}
              onClick={() => go(link.path)}
              className="p-4 text-left text-sm font-semibold text-ink-soft border-b border-surface-border"
            >
              {link.label}
            </button>
          ))}
          {isAdmin && (
            <button onClick={() => go("/admin")} className="p-4 text-left text-sm font-bold text-admin border-b border-surface-border">
              Admin
            </button>
          )}
          <button
            onClick={() => {
              setMenuOpen(false);
              signOut(auth);
            }}
            className="p-4 text-left text-sm font-semibold text-ink-soft"
          >
            Déconnexion
          </button>
        </div>
      )}
    </header>
  );
}
