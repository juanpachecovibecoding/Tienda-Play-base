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
          
          if (firebaseUser.email === 'juanpacheco@playcode.com.ar') {
            if (userProfile.role !== 'superadmin' || userProfile.status !== 'active') {
              userProfile.role = 'superadmin';
              userProfile.status = 'active';
              await setDoc(userDocRef, userProfile);
            }
          } else if (!userProfile.status) {
            userProfile.status = userProfile.role === 'admin' ? 'active' : 'pending';
            await setDoc(userDocRef, userProfile);
          }
        } else {
          // Check if it is the root admin
          const isSuperAdmin = firebaseUser.email === 'juanpacheco@playcode.com.ar';
          const newProfile: Omit<UserProfile, 'id'> = {
            email: firebaseUser.email || '',
            role: isSuperAdmin ? 'superadmin' : 'seller',
            status: isSuperAdmin ? 'active' : 'pending',
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
