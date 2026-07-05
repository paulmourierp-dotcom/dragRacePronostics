"use client";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";

interface HeaderProps {
  isAdmin?: boolean;
}

export default function Header({ isAdmin }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isDashboard = pathname === "/dashboard";
  const isPronostics = pathname === "/pronostics";
  const isRegles = pathname === "/regles";

  return (
    <header className="flex justify-between items-center p-4 bg-white shadow-sm">
      <img
        src="/logo.png"
        alt="Logo"
        className="h-10 cursor-pointer"
        onClick={() => router.push("/dashboard")}
      />
      <div className="flex gap-2">
        {!isDashboard && (
          <button onClick={() => router.push("/dashboard")} className="p-2 text-sm text-gray-600">Dashboard</button>
        )}
        {!isPronostics && (
          <button onClick={() => router.push("/pronostics")} className="p-2 text-sm text-gray-600">Pronostic</button>
        )}
        {!isRegles && (
          <button onClick={() => router.push("/regles")} className="p-2 text-sm text-gray-600">Règles</button>
        )}
        {isAdmin && (
          <button onClick={() => router.push("/admin")} className="bg-red-500 text-white px-3 py-1 rounded text-gray-900">Admin</button>
        )}
        <button onClick={() => signOut(auth)} className="bg-gray-200 px-3 py-1 rounded text-gray-900">
          Déconnexion
        </button>
      </div>
    </header>
  );
}
