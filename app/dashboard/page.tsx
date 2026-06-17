"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function DashboardPage() {
  const [surnom, setSurnom] = useState("");

  useEffect(() => {
    const fetchSurnom = async () => {
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSurnom(docSnap.data().surnom);
        }
      }
    };
    fetchSurnom();
  }, []);

  return <h1>Bienvenue {surnom || "Queen"} !</h1>;
}