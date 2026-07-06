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
      !isPronostics && { label: "Pronostic", path: "/pronostics" },
      !isHistorique && { label: "Historique", path: "/historique" },
      !isRegles && { label: "Règles", path: "/regles" },
    ] as const
  ).filter((link): link is { label: string; path: string } => Boolean(link));

  return (
    <header className="app-header relative flex justify-between items-center p-4 bg-white shadow-sm">
      <img
        src="/logo.png"
        alt="Logo"
        className="h-10 w-auto cursor-pointer"
        onClick={() => go("/dashboard")}
      />

      <div className="hidden md:flex items-center gap-2">
        {links.map((link) => (
          <button key={link.path} onClick={() => go(link.path)} className="p-2 text-sm text-gray-600">
            {link.label}
          </button>
        ))}
        {isAdmin && (
          <button onClick={() => go("/admin")} className="bg-red-500 text-white px-3 py-1 rounded text-gray-900">
            Admin
          </button>
        )}
        <button onClick={() => signOut(auth)} className="bg-gray-200 px-3 py-1 rounded text-gray-900">
          Déconnexion
        </button>
      </div>

      <button
        onClick={() => setMenuOpen((open) => !open)}
        aria-label="Ouvrir le menu"
        aria-expanded={menuOpen}
        className="md:hidden p-2 text-gray-700"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          {menuOpen ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
        </svg>
      </button>

      {menuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white shadow-lg border-t border-gray-100 flex flex-col z-40">
          {links.map((link) => (
            <button
              key={link.path}
              onClick={() => go(link.path)}
              className="p-4 text-left text-sm text-gray-700 border-b border-gray-50"
            >
              {link.label}
            </button>
          ))}
          {isAdmin && (
            <button onClick={() => go("/admin")} className="p-4 text-left text-sm font-bold text-red-600 border-b border-gray-50">
              Admin
            </button>
          )}
          <button
            onClick={() => {
              setMenuOpen(false);
              signOut(auth);
            }}
            className="p-4 text-left text-sm text-gray-700"
          >
            Déconnexion
          </button>
        </div>
      )}
    </header>
  );
}
