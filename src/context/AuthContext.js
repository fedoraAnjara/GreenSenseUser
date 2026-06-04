import { createContext, useEffect, useState, useContext } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { router } from "expo-router";
const AuthContext = createContext({});

export function AuthProvider({children}) {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            setUser(firebaseUser);
            // Récuperer les donnees Firestore (role, nom, etc.)
            const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));
            if (userSnap.exists()) {
            setUserData(userSnap.data());
            }
        } else {
            setUser(null);
            setUserData(null);
        }
        setLoading(false);
        });
        return () => unsubscribe();
    }, []);

      const logout = async () => {
    await signOut(auth);
    router.replace("/(auth)/login");
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);