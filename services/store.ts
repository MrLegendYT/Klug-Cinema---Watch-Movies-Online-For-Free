import { User, Movie, Category, Request, UserRole, MovieStatus, AppSettings } from '../types';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser, updateProfile } from 'firebase/auth';
import { getFirestore, collection, getDocs, getDoc, doc, setDoc, updateDoc, addDoc, query, where, deleteDoc, writeBatch } from 'firebase/firestore';

// --- FIREBASE CONFIGURATION ---
// We now check for Environment Variables (Best Practice for Vercel)
// If these are missing, it falls back to placeholders and runs in MOCK MODE.
const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "SENDER_ID",
  appId: env.VITE_FIREBASE_APP_ID || "APP_ID"
};

// Check if config is valid to determine mode
// It checks if the key starts with "AIza" (standard Firebase key prefix) or is not the placeholder
const IS_FIREBASE_CONFIGURED = 
  firebaseConfig.apiKey !== "YOUR_API_KEY" && 
  firebaseConfig.apiKey.startsWith("AIza");

let app: FirebaseApp;
let auth: any;
let db: any;

if (IS_FIREBASE_CONFIGURED) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("🔥 Firebase Mode Active");
  } catch (e) {
    console.error("Firebase init failed:", e);
  }
} else {
  console.warn("⚠️ Firebase keys missing or invalid. Running in MOCK Mode (LocalStorage).");
}

// --- MOCK DATA (Fallback) ---
const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat_1', name: 'Action' },
  { id: 'cat_2', name: 'Sci-Fi' },
  { id: 'cat_3', name: 'Drama' },
  { id: 'cat_4', name: 'Comedy' },
  { id: 'cat_5', name: 'Horror' },
];

// CLEARED DEFAULT MOVIES AS REQUESTED
const INITIAL_MOVIES: Movie[] = [];

const INITIAL_USERS: User[] = [
  { id: 'admin_1', name: 'Admin User', email: 'admin@klug.com', role: UserRole.ADMIN, credits: 0, password: '123' },
  { id: 'creator_1', name: 'John Doe', email: 'john@klug.com', role: UserRole.CREATOR, credits: 45, password: '123' },
  { id: 'creator_2', name: 'Jane Smith', email: 'jane@klug.com', role: UserRole.CREATOR, credits: 5, password: '123' },
  { id: 'user_1', name: 'Viewer One', email: 'viewer@klug.com', role: UserRole.USER, credits: 0, password: '123' },
];

// CLEARED DEFAULT REQUESTS SINCE MOVIES ARE GONE
const INITIAL_REQUESTS: Request[] = [];

const INITIAL_SETTINGS: AppSettings = {
  monetagLink: 'https://google.com'
};

// --- HELPERS ---
const loadMock = <T,>(key: string, initial: T): T => {
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(stored);
};
const saveMock = (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data));

// --- STORE IMPLEMENTATION ---
export const Store = {
  
  initAuthListener: (callback: (user: User | null) => void) => {
    if (IS_FIREBASE_CONFIGURED && auth) {
      onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
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
              credits: userData.credits || 0
            });
          } else {
            // Fallback if doc doesn't exist
            callback({
                id: firebaseUser.uid,
                name: firebaseUser.displayName || 'User',
                email: firebaseUser.email || '',
                role: UserRole.USER,
                credits: 0
            });
          }
        } else {
          callback(null);
        }
      });
    } else {
      // Mock Auth Persistence
      const stored = localStorage.getItem('klug_current_user');
      callback(stored ? JSON.parse(stored) : null);
    }
  },

  login: async (email: string, password?: string): Promise<User | null> => {
    if (IS_FIREBASE_CONFIGURED && auth) {
      try {
        const result = await signInWithEmailAndPassword(auth, email, password || 'dummy');
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
    } else {
      // Mock
      const users = loadMock<User[]>('klug_users', INITIAL_USERS);
      const user = users.find(u => u.email === email);
      if (user) {
        localStorage.setItem('klug_current_user', JSON.stringify(user));
        return user;
      }
      throw new Error("Invalid credentials (Mock)");
    }
  },

  // Special bypass for Secret Admin
  loginAsAdmin: async (): Promise<User> => {
      const adminUser: User = { id: 'admin_sys', name: 'System Admin', email: 'admin@klug.com', role: UserRole.ADMIN, credits: 9999 };
      if (IS_FIREBASE_CONFIGURED) {
          // In a real app, you would sign in with a service account or specific admin credential.
          // For this demo, we simulate the admin user object locally.
          return adminUser;
      } else {
          const admin = INITIAL_USERS.find(u => u.role === UserRole.ADMIN) || adminUser;
          localStorage.setItem('klug_current_user', JSON.stringify(admin));
          return admin!;
      }
  },

  register: async (name: string, email: string, password: string, role: UserRole): Promise<User> => {
    if (IS_FIREBASE_CONFIGURED && auth) {
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
    } else {
      // Mock
      const users = loadMock<User[]>('klug_users', INITIAL_USERS);
      if (users.find(u => u.email === email)) throw new Error("User exists");
      const newUser: User = { id: `user_${Date.now()}`, name, email, role, credits: role === UserRole.CREATOR ? 10 : 0, password };
      users.push(newUser);
      saveMock('klug_users', users);
      localStorage.setItem('klug_current_user', JSON.stringify(newUser));
      return newUser;
    }
  },

  logout: async () => {
    if (IS_FIREBASE_CONFIGURED && auth) {
      await signOut(auth);
    } else {
      localStorage.removeItem('klug_current_user');
    }
  },

  // --- DATA METHODS (PROMISIFIED) ---

  getMovies: async (): Promise<Movie[]> => {
    if (IS_FIREBASE_CONFIGURED && db) {
      const q = query(collection(db, "movies"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Movie));
    } else {
      return new Promise(resolve => {
          let movies = loadMock<Movie[]>('klug_movies', INITIAL_MOVIES);
          
          // FORCE CLEANUP: Remove "School Fire Story" if present in persistence
          const unwantedTitle = "School Fire Story";
          const cleanMovies = movies.filter(m => m.title !== unwantedTitle);
          
          if (cleanMovies.length !== movies.length) {
              console.log(`System: Auto-removed '${unwantedTitle}' from local storage.`);
              saveMock('klug_movies', cleanMovies);
              movies = cleanMovies;
          }

          setTimeout(() => resolve(movies), 300);
      });
    }
  },

  getMovie: async (id: string): Promise<Movie | undefined> => {
    if (IS_FIREBASE_CONFIGURED && db) {
      const ref = doc(db, "movies", id);
      const snap = await getDoc(ref);
      return snap.exists() ? ({ id: snap.id, ...snap.data() } as Movie) : undefined;
    } else {
       const movies = loadMock<Movie[]>('klug_movies', INITIAL_MOVIES);
       return movies.find(m => m.id === id);
    }
  },

  addMovie: async (movie: Movie) => {
    if (IS_FIREBASE_CONFIGURED && db) {
        const { id, ...data } = movie;
        await setDoc(doc(db, "movies", id), data); 
    } else {
        const movies = loadMock<Movie[]>('klug_movies', INITIAL_MOVIES);
        movies.push(movie);
        saveMock('klug_movies', movies);
    }
  },

  updateMovie: async (movie: Movie) => {
    if (IS_FIREBASE_CONFIGURED && db) {
        const { id, ...data } = movie;
        await updateDoc(doc(db, "movies", id), data);
    } else {
        const movies = loadMock<Movie[]>('klug_movies', INITIAL_MOVIES);
        const idx = movies.findIndex(m => m.id === movie.id);
        if(idx !== -1) {
            movies[idx] = movie;
            saveMock('klug_movies', movies);
        }
    }
  },

  deleteMovie: async (id: string) => {
    console.log(`Attempting to delete movie: ${id}`);
    if (IS_FIREBASE_CONFIGURED && db) {
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
    } else {
        // Mock Mode: Cascade Delete
        try {
            // Delete Movie
            let movies = loadMock<Movie[]>('klug_movies', INITIAL_MOVIES);
            const initialCount = movies.length;
            movies = movies.filter(m => m.id !== id);
            saveMock('klug_movies', movies);
            
            if (movies.length === initialCount) {
                console.warn(`Mock: Movie ${id} not found to delete.`);
            } else {
                console.log("Mock: Movie deleted.");
            }

            // Delete Associated Requests
            let requests = loadMock<Request[]>('klug_requests', INITIAL_REQUESTS);
            requests = requests.filter(r => r.movieId !== id);
            saveMock('klug_requests', requests);
            console.log("Mock: Related requests cleaned up.");

        } catch (e) {
            console.error("Mock delete failed", e);
            throw e;
        }
    }
  },

  getCategories: async (): Promise<Category[]> => {
      if (IS_FIREBASE_CONFIGURED && db) {
        return INITIAL_CATEGORIES; 
      } else {
        return loadMock('klug_categories', INITIAL_CATEGORIES);
      }
  },

  getRequests: async (): Promise<Request[]> => {
      if (IS_FIREBASE_CONFIGURED && db) {
        const q = query(collection(db, "requests"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Request));
      } else {
        return loadMock('klug_requests', INITIAL_REQUESTS);
      }
  },

  addRequest: async (req: Request) => {
      if (IS_FIREBASE_CONFIGURED && db) {
          const { id, ...data } = req;
          await setDoc(doc(db, "requests", id), data);
      } else {
          const list = loadMock<Request[]>('klug_requests', INITIAL_REQUESTS);
          list.unshift(req);
          saveMock('klug_requests', list);
      }
  },

  updateRequest: async (req: Request) => {
      if (IS_FIREBASE_CONFIGURED && db) {
        const { id, ...data } = req;
        await updateDoc(doc(db, "requests", id), data);
      } else {
          const list = loadMock<Request[]>('klug_requests', INITIAL_REQUESTS);
          const idx = list.findIndex(r => r.id === req.id);
          if (idx !== -1) {
              list[idx] = req;
              saveMock('klug_requests', list);
          }
      }
  },

  getUsers: async (): Promise<User[]> => {
      if (IS_FIREBASE_CONFIGURED && db) {
          const q = query(collection(db, "users"));
          const snap = await getDocs(q);
          return snap.docs.map(d => ({ id: d.id, ...d.data() } as User));
      } else {
          return loadMock('klug_users', INITIAL_USERS);
      }
  },

  updateUser: async (user: User) => {
      if (IS_FIREBASE_CONFIGURED && db) {
          const { id, ...data } = user;
          const cleanData = JSON.parse(JSON.stringify(data));
          delete cleanData.password; 
          await updateDoc(doc(db, "users", id), cleanData);
      } else {
          const users = loadMock<User[]>('klug_users', INITIAL_USERS);
          const idx = users.findIndex(u => u.id === user.id);
          if (idx !== -1) {
              users[idx] = user;
              saveMock('klug_users', users);
              const curr = JSON.parse(localStorage.getItem('klug_current_user') || '{}');
              if (curr.id === user.id) {
                  localStorage.setItem('klug_current_user', JSON.stringify(user));
              }
          }
      }
  },

  getSettings: async (): Promise<AppSettings> => {
      if (IS_FIREBASE_CONFIGURED && db) {
          const snap = await getDoc(doc(db, "settings", "global"));
          if (snap.exists()) return snap.data() as AppSettings;
          return INITIAL_SETTINGS;
      } else {
          return loadMock('klug_settings', INITIAL_SETTINGS);
      }
  },

  updateSettings: async (settings: AppSettings) => {
      if (IS_FIREBASE_CONFIGURED && db) {
          await setDoc(doc(db, "settings", "global"), settings);
      } else {
          saveMock('klug_settings', settings);
      }
  }
};