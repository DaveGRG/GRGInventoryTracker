import { useState, useEffect, useCallback } from "react";
import { onAuthStateChanged, signOut, type User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

function firebaseUserToAuthUser(fbUser: FirebaseUser): AuthUser {
  const displayName = fbUser.displayName || "";
  const parts = displayName.split(" ");
  return {
    id: fbUser.uid,
    email: fbUser.email,
    firstName: parts[0] || null,
    lastName: parts.slice(1).join(" ") || null,
    profileImageUrl: fbUser.photoURL,
  };
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        if (fbUser.email?.endsWith("@grgplayscapes.com")) {
          setUser(firebaseUserToAuthUser(fbUser));
        } else {
          await signOut(auth);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout,
    isLoggingOut: false,
  };
}
