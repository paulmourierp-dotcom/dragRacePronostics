"use client";
import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase"; // Assure-toi d'importer db
import { doc, setDoc } from "firebase/firestore"; // Import nécessaire
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [surnom, setSurnom] = useState(""); // Nouvel état
  const [isRegistering, setIsRegistering] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isRegistering) {
        // 1. Création du compte
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Enregistrement du surnom dans Firestore
        await setDoc(doc(db, "users", user.uid), {
            surnom: surnom,
            email: email,
            role: "user",
            score: 0,
            createdAt: new Date(),
            });
        alert("Compte créé avec succès !");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.push("/dashboard");
    } catch (error: unknown) {
      if (error instanceof Error) alert("Erreur : " + error.message);
    }
  };

  return (
    <main 
      className="min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "url('/fond-login.png')" }}>
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">{isRegistering ? "Inscription" : "Connexion"}</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
            <input type="email" placeholder="Email" className="border p-2 rounded" onChange={(e) => setEmail(e.target.value)} required />
            <input type="password" placeholder="Mot de passe" className="border p-2 rounded" onChange={(e) => setPassword(e.target.value)} required />
            
            {/* Champ conditionnel pour le surnom */}
            {isRegistering && (
            <input type="text" placeholder="Ton surnom" className="border p-2 rounded" onChange={(e) => setSurnom(e.target.value)} required />
            )}
            
            <button type="submit" className="bg-purple-600 text-white p-2 rounded">
            {isRegistering ? "S'inscrire" : "Se connecter"}
            </button>
        </form>
        <button onClick={() => setIsRegistering(!isRegistering)} className="mt-4 text-sm text-blue-500 underline">
            {isRegistering ? "Déjà un compte ? Connectez-vous" : "Pas de compte ? Inscrivez-vous"}
        </button>
        </div>
    </main>
  );
}