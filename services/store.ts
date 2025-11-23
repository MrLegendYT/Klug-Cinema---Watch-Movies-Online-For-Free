import { User, Movie, Category, Request, UserRole, MovieStatus, AppSettings } from '../types';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser, updateProfile } from 'firebase/auth';
import { getFirestore, collection, getDocs, getDoc, doc, setDoc, updateDoc, addDoc, query, where, deleteDoc, writeBatch } from 'firebase/firestore';

// --- FIREBASE CONFIGURATION ---
// Integrated Flimlix Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAxw4zie_NpdHDNQgl0dSOTB9L6OhlJNVY",
  authDomain: "flimlix.firebaseapp.com",
  projectId: "flimlix",
  storageBucket: "flimlix.firebasestorage.app",
  messagingSenderId: "339041060589",
  appId: "1:339041060589:web:964d01a2cc82e563b8aee4",
  measurementId: "G-LT0TZ4ZRT2"
};

let app: FirebaseApp;
let auth: any;
let db: any;
let analytics: any;

// Initialize Firebase
try {
  app = initializeApp(firebaseConfig);
  analytics = getAnalytics(app);
  auth = getAuth(app);
  db = getFirestore(app);
  console.log("🔥 Firebase Connected: Flimlix");
} catch (e) {
  console.error("Firebase init failed:", e);
}

// --- MOCK DATA (Fallback/Types) ---
const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat_1', name: 'Action' },
  { id: 'cat_2', name: 'Sci-Fi' },
  { id: 'cat_3', name: 'Drama' },
  { id: 'cat_4', name: 'Comedy' },
  { id: 'cat_5', name: 'Horror' },
];

const INITIAL_SETTINGS: AppSettings = {
  monetagLink: 'https://google.com'
};

// --- STORE IMPLEMENTATION ---
export const Store = {
  
  initAuthListener: (callback: (user: User | null) => void) => {
    onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          // Fetch additional user details from Firestore
          const docRef = doc(db, "users", firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const userData = docSnap.data();
            callback({
              id: firebaseUser.uid,
              name: userData.name || firebaseUser.displayName || 'User',
              email: firebaseUser.email || '',
              role: userData.role || UserRole.USER,
              credits: userData.credits ?? 0
            });
          } else {
            // Fallback: Create user doc if missing (e.g. first login)
            const newUserProfile = {
                name: firebaseUser.displayName || 'User',
                email: firebaseUser.email || '',
                role: UserRole.USER,
                credits: 0,
                createdAt: new Date().toISOString()
            };
            await setDoc(docRef, newUserProfile);
            
            callback({
                id: firebaseUser.uid,
                ...newUserProfile
            } as User);
          }
        } catch (e) {
            console.error("Error fetching user profile:", e);
            callback(null);
        }
      } else {
        callback(null);
      }
    });
  },

  login: async (email: string, password?: string): Promise<User | null> => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password || '');
      const docRef = doc(db, "users", result.user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
            const data = docSnap.data();
            return { id: result.user.uid, name: data.name, email: email, role: data.role, credits: data.credits };
      }
      return null;
    } catch (e: any) {
      throw new Error(e.message);
    }
  },

  // Special bypass for Secret Admin - NOW REAL
  loginAsAdmin: async (): Promise<User> => {
      const ADMIN_EMAIL = "admin@flimlix.com";
      const SECRET_PWD = "ILOVEIMRANKHAN369"; 

      console.log("Authenticating as System Admin via Firebase...");

      try {
          // 1. Try to login with the secret credentials
          const result = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, SECRET_PWD);
          
          // 2. Force update the user doc to ensure it has Admin Role and Credits
          const docRef = doc(db, "users", result.user.uid);
          await setDoc(docRef, {
               name: 'System Admin',
               email: ADMIN_EMAIL,
               role: UserRole.ADMIN,
               credits: 9999,
               updatedAt: new Date().toISOString()
          }, { merge: true });
          
          return { 
              id: result.user.uid, 
              name: 'System Admin', 
              email: ADMIN_EMAIL, 
              role: UserRole.ADMIN, 
              credits: 9999 
          };

      } catch (error: any) {
          console.warn("Admin Login Failed, attempting creation...", error.code);
          
          // 3. If user doesn't exist, CREATE it
          if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/invalid-login-credentials') {
              try {
                  const res = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, SECRET_PWD);
                  await updateProfile(res.user, { displayName: "System Admin" });
                  
                  // Create the Admin Record in Firestore
                  await setDoc(doc(db, "users", res.user.uid), {
                       name: 'System Admin',
                       email: ADMIN_EMAIL,
                       role: UserRole.ADMIN,
                       credits: 9999,
                       createdAt: new Date().toISOString()
                  });

                  return { 
                       id: res.user.uid, 
                       name: 'System Admin', 
                       email: ADMIN_EMAIL, 
                       role: UserRole.ADMIN, 
                       credits: 9999 
                  };
              } catch (createErr: any) {
                  // If creation fails (e.g. email already in use but password wrong), throw original
                  throw new Error("Admin Auto-Creation Failed: " + createErr.message);
              }
          }
          throw new Error(error.message);
      }
  },

  register: async (name: string, email: string, password: string, role: UserRole): Promise<User> => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: name });
      
      const newUser: User = {
          id: result.user.uid,
          name,
          email,
          role,
          credits: role === UserRole.CREATOR ? 10 : 0
      };
      
      // Save extra data to Firestore
      await setDoc(doc(db, "users", result.user.uid), {
          name,
          email,
          role,
          credits: newUser.credits,
          createdAt: new Date().toISOString()
      });

      return newUser;
    } catch (e: any) {
      throw new Error(e.message);
    }
  },

  logout: async () => {
    await signOut(auth);
  },

  // --- DATA METHODS ---

  getMovies: async (): Promise<Movie[]> => {
    const q = query(collection(db, "movies"));
    const snapshot = await getDocs(q);
    let movies = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Movie));
    
    // Filter out specific deleted titles if they persist
    movies = movies.filter(m => m.title !== 'School Fire Story');
    
    return movies;
  },

  getMovie: async (id: string): Promise<Movie | undefined> => {
    const ref = doc(db, "movies", id);
    const snap = await getDoc(ref);
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Movie) : undefined;
  },

  addMovie: async (movie: Movie) => {
    const { id, ...data } = movie;
    await setDoc(doc(db, "movies", id), data); 
  },

  updateMovie: async (movie: Movie) => {
    const { id, ...data } = movie;
    await updateDoc(doc(db, "movies", id), data);
  },

  deleteMovie: async (id: string) => {
    console.log(`Firebase: Attempting to delete movie: ${id}`);
    try {
        const batch = writeBatch(db);
        
        // 1. Delete the Movie Document
        const movieRef = doc(db, "movies", id);
        batch.delete(movieRef);

        // 2. Find and Delete associated Requests
        const q = query(collection(db, "requests"), where("movieId", "==", id));
        const snap = await getDocs(q);
        snap.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        // 3. Commit Batch
        await batch.commit();
        console.log("Firebase: Batch delete successful");

    } catch(e) {
        console.error("Firebase delete failed", e);
        throw e;
    }
  },

  getCategories: async (): Promise<Category[]> => {
    try {
        const q = query(collection(db, "categories"));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Category));
        }
        return INITIAL_CATEGORIES;
    } catch (e) {
        console.warn("Failed to fetch categories from DB, using default.", e);
        return INITIAL_CATEGORIES; 
    }
  },

  getRequests: async (): Promise<Request[]> => {
    const q = query(collection(db, "requests"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Request));
  },

  addRequest: async (req: Request) => {
    const { id, ...data } = req;
    await setDoc(doc(db, "requests", id), data);
  },

  updateRequest: async (req: Request) => {
    const { id, ...data } = req;
    await updateDoc(doc(db, "requests", id), data);
  },

  getUsers: async (): Promise<User[]> => {
    const q = query(collection(db, "users"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as User));
  },

  updateUser: async (user: User) => {
    const { id, ...data } = user;
    const cleanData = JSON.parse(JSON.stringify(data));
    delete cleanData.password; 
    await updateDoc(doc(db, "users", id), cleanData);
  },

  getSettings: async (): Promise<AppSettings> => {
    try {
        const snap = await getDoc(doc(db, "settings", "global"));
        if (snap.exists()) return snap.data() as AppSettings;
        return INITIAL_SETTINGS;
    } catch {
        return INITIAL_SETTINGS;
    }
  },

  updateSettings: async (settings: AppSettings) => {
    await setDoc(doc(db, "settings", "global"), settings);
  }
};
