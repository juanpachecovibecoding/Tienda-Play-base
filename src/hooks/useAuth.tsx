import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Fetch or create user profile
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        let userProfile: UserProfile;
        
        if (userDoc.exists()) {
          userProfile = { id: firebaseUser.uid, ...userDoc.data() } as UserProfile;
        } else {
          // Check if it is the root admin
          const isRoot = firebaseUser.email === 'juanpacheco@playcode.com.ar' || firebaseUser.email === 'juanpacheco.vibecoding@gmail.com';
          const newProfile: Omit<UserProfile, 'id'> = {
            email: firebaseUser.email || '',
            role: isRoot ? 'admin' : 'seller',
            name: firebaseUser.displayName || '',
            photoURL: firebaseUser.photoURL || '',
            createdAt: Date.now()
          };
          
          await setDoc(userDocRef, newProfile);
          userProfile = { id: firebaseUser.uid, ...newProfile };
        }
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
