"use client";
import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { doc, setDoc } from "firebase/firestore";
import Button from "@/components/Button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [surnom, setSurnom] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      if (isRegistering) {
        if (!surnom.trim()) {
          setError("Le surnom est obligatoire.");
          return;
        }
        // Création de l'utilisateur avec email et mot de passe
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Mise à jour du profil Firebase Auth avec le surnom
        await updateProfile(user, { displayName: surnom });

        // Création du document utilisateur dans Firestore
        await setDoc(doc(db, "users", user.uid), {
          surnom: surnom,
          email: email,
          role: "user", // Rôle par défaut
          score: 0,
          createdAt: new Date(),
        });
      } else {
        // Connexion
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.push("/dashboard");
    } catch (err: unknown) {
      console.error(err);
      if (err && typeof err === "object" && "code" in err) {
        if (err.code === "auth/email-already-in-use") {
          setError("Cet email est déjà utilisé.");
        } else if (err.code === "auth/weak-password") {
          setError("Le mot de passe doit faire au moins 6 caractères.");
        } else if (err.code === "auth/invalid-credential") {
          setError("Email ou mot de passe incorrect.");
        } else {
          setError("Une erreur est survenue lors de l'authentification.");
        }
      }
    }
  };

  const handleForgotPassword = async () => {
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Saisissez votre email ci-dessus pour recevoir le lien de réinitialisation.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Un email de réinitialisation a été envoyé si cette adresse est associée à un compte.");
    } catch (err: unknown) {
      console.error(err);
      if (err && typeof err === "object" && "code" in err && err.code === "auth/invalid-email") {
        setError("Adresse email invalide.");
      } else {
        // On ne révèle pas si l'email existe ou non, pour ne pas divulguer d'informations sur les comptes.
        setMessage("Un email de réinitialisation a été envoyé si cette adresse est associée à un compte.");
      }
    }
  };

  return (
    // Conteneur principal avec l'image de fond et un filtre sombre pour le contraste
    <main
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center"
      style={{
        backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('/fond-login.png')",
      }}
    >
      {/* CARD PRINCIPALE */}
      <div className="w-full max-w-md bg-white/95 backdrop-blur-sm p-8 md:p-10 rounded-2xl shadow-2xl border border-gray-100">
        
        {/* Titre & Sous-titre */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-gray-950">
            Pronostics
          </h1>
          <p className="text-purple-700 font-semibold text-lg mt-1">
            Saison 4
          </p>
          <p className="text-gray-600 mt-3">
            Connectez-vous ou créez un compte pour participer !
          </p>
        </div>

        {/* Affichage des erreurs */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm mb-6 text-center font-medium">
            ⚠️ {error}
          </div>
        )}

        {/* Affichage des messages de confirmation */}
        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg text-sm mb-6 text-center font-medium">
            ✅ {message}
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Champ Surnom (uniquement à l'inscription) */}
          {isRegistering && (
            <div className="space-y-1.5">
              <label htmlFor="surnom" className="text-sm font-semibold text-gray-900">
                Surnom (apparaîtra dans le classement)
              </label>
              <input
                id="surnom"
                type="text"
                placeholder="Ex: DragQueen97"
                value={surnom}
                onChange={(e) => setSurnom(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-300 focus:border-purple-500 transition text-gray-900"
                required={isRegistering}
              />
            </div>
          )}

          {/* Champ Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-semibold text-gray-900">
              Adresse Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="Ex: tom@rigolo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-300 focus:border-purple-500 transition text-gray-900"
              required
            />
          </div>

          {/* Champ Mot de passe */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-semibold text-gray-900">
              Mot de passe
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-300 focus:border-purple-500 transition text-gray-900"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Masquer le mot de passe" : "Voir le mot de passe"}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-800 transition cursor-pointer"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-5.05 0-9.29-3.14-11-7.5a12.14 12.14 0 0 1 3.06-4.44M9.9 4.24A10.9 10.9 0 0 1 12 4c5.05 0 9.29 3.14 11 7.5a12.16 12.16 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                    <path d="M1 1l22 22" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <path d="M1 12s4-7.5 11-7.5S23 12 23 12s-4 7.5-11 7.5S1 12 1 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {!isRegistering && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-purple-700 hover:text-purple-900 font-medium transition cursor-pointer"
                >
                  Mot de passe oublié ?
                </button>
              </div>
            )}
          </div>

          <Button type="submit" size="lg">
            {isRegistering ? "Créer mon compte" : "Se connecter"}
          </Button>
        </form>

        {/* Lien de bascule (Connexion / Inscription) */}
        <div className="text-center mt-8 pt-6 border-t border-gray-100">
          <p className="text-gray-600">
            {isRegistering ? "Vous avez déjà un compte ?" : "Nouveau ici ?"}
          </p>
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError(""); // Reset de l'erreur lors du changement de mode
              setMessage("");
            }}
            className="text-purple-700 hover:text-purple-900 font-semibold mt-1 transition"
          >
            {isRegistering ? "Connectez-vous" : "Créez un compte "}
          </button>
        </div>

      </div>
    </main>
  );
}