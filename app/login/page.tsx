"use client";
import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false); // Bascule entre Login/Inscription
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    if (isRegistering) {
      await createUserWithEmailAndPassword(auth, email, password);
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
    router.push("/dashboard");
  } catch (error: unknown) {
    // On vérifie que l'erreur est un objet qui contient un message
    if (error instanceof Error) {
      alert("Erreur : " + error.message);
    } else {
      alert("Une erreur inconnue est survenue.");
    }
  }
};

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">
        {isRegistering ? "Inscription" : "Connexion"} - Drag Race
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
        <input type="email" placeholder="Email" className="border p-2 rounded" onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Mot de passe" className="border p-2 rounded" onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit" className="bg-purple-600 text-white p-2 rounded">
          {isRegistering ? "S'inscrire" : "Se connecter"}
        </button>
      </form>
      <button 
        onClick={() => setIsRegistering(!isRegistering)} 
        className="mt-4 text-sm text-blue-500 underline"
      >
        {isRegistering ? "Déjà un compte ? Connectez-vous" : "Pas de compte ? Inscrivez-vous"}
      </button>
    </div>
  );
}