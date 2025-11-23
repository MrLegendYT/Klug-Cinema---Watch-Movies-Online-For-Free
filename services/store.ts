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

// Helper to determine if we are online (Redundant now as we force Firebase, but kept for structure)
const IS_FIREBASE_CONFIGURED = true;

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

  // Special bypass for Secret Admin
  loginAsAdmin: async (): Promise<User> => {
      // NOTE: With Real Firebase, this user won't have permission to write to DB 
      // unless you update rules or create a real auth user.
      // Ideally, the user should login properly.
      console.warn("Using Offline Admin Bypass. Database writes may fail if rules enforce authentication.");
      return { 
          id: 'admin_sys_virtual', 
          name: 'System Admin', 
          email: 'admin@flimlix.com', 
          role: UserRole.ADMIN, 
          credits: 9999 
      };
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
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Movie));
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