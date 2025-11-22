import React, { createContext, useContext, useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { MovieDetail } from './pages/MovieDetail';
import { CreatorDashboard } from './pages/CreatorDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { User, UserRole } from './types';
import { Store } from './services/store';

// Auth Context
interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {}
});

export const useAuth = () => useContext(AuthContext);

// Login/Signup Page
const AuthPage: React.FC = () => {
  const { setUser } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.USER);
  const [error, setError] = useState('');

  // Secret Admin
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');

  // Keyboard Shortcut Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '6') {
        setShowAdminModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
        if (isSignUp) {
            const newUser = await Store.register(name, email, password, role);
            setUser(newUser);
        } else {
            const user = await Store.login(email, password);
            if (user) {
                if (user.role === UserRole.ADMIN) {
                     // In production, you might strictly enforce Admin portal use,
                     // but here we allow standard login if they have the role.
                     // Or you can force error:
                     // setError("Admin must login via secret portal.");
                     setUser(user);
                } else {
                    setUser(user);
                }
            } else {
                setError("Invalid credentials.");
            }
        }
    } catch (err: any) {
        setError(err.message || "Authentication failed");
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      if (adminPassword === 'ILOVEIMRANKHAN369') {
          // Force Admin Login via Store (System Admin)
          const adminUser = await Store.loginAsAdmin();
          setUser(adminUser);
          setShowAdminModal(false);
      } else {
          setAdminError("Access Denied. Incorrect Password.");
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] relative overflow-hidden">
       
       {/* Background Blobs */}
       <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-600/30 rounded-full blur-[128px] animate-pulse-slow"></div>
       <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-accent/20 rounded-full blur-[128px] animate-pulse-slow"></div>

       <div className="relative z-10 bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4">
          <div className="text-center mb-8">
             <h1 className="text-4xl font-heading font-bold mb-2 text-white tracking-tight">KLUG<span className="text-accent">CINEMA</span></h1>
             <p className="text-gray-400 text-sm">Your gateway to infinite entertainment</p>
          </div>

          {/* Tabs */}
          <div className="flex bg-black/30 rounded-lg p-1 mb-6">
              <button onClick={() => setIsSignUp(false)} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${!isSignUp ? 'bg-white text-black shadow' : 'text-gray-400 hover:text-white'}`}>Sign In</button>
              <button onClick={() => setIsSignUp(true)} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${isSignUp ? 'bg-white text-black shadow' : 'text-gray-400 hover:text-white'}`}>Sign Up</button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
                <div>
                    <label className="block text-xs text-gray-400 mb-1 uppercase font-bold">Full Name</label>
                    <input type="text" required className="w-full bg-black/30 border border-white/10 rounded p-3 text-white outline-none focus:border-accent transition-colors" value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" />
                </div>
            )}

            <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase font-bold">Email Address</label>
                <input type="email" required className="w-full bg-black/30 border border-white/10 rounded p-3 text-white outline-none focus:border-accent transition-colors" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>

            <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase font-bold">Password</label>
                <input type="password" required className="w-full bg-black/30 border border-white/10 rounded p-3 text-white outline-none focus:border-accent transition-colors" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </div>

            {isSignUp && (
                 <div>
                    <label className="block text-xs text-gray-400 mb-1 uppercase font-bold">Account Type</label>
                    <div className="grid grid-cols-2 gap-4">
                        <label className={`border rounded-lg p-3 flex flex-col items-center cursor-pointer transition-all ${role === UserRole.USER ? 'border-accent bg-accent/10' : 'border-white/10 hover:bg-white/5'}`}>
                            <input type="radio" name="role" className="hidden" checked={role === UserRole.USER} onChange={() => setRole(UserRole.USER)} />
                            <span className="text-sm font-bold">Viewer</span>
                        </label>
                        <label className={`border rounded-lg p-3 flex flex-col items-center cursor-pointer transition-all ${role === UserRole.CREATOR ? 'border-accent bg-accent/10' : 'border-white/10 hover:bg-white/5'}`}>
                            <input type="radio" name="role" className="hidden" checked={role === UserRole.CREATOR} onChange={() => setRole(UserRole.CREATOR)} />
                            <span className="text-sm font-bold">Creator</span>
                        </label>
                    </div>
                </div>
            )}

            {error && <p className="text-red-400 text-xs text-center bg-red-500/10 p-2 rounded">{error}</p>}

            <button type="submit" className="w-full py-3 bg-accent text-black font-bold rounded shadow-[0_0_20px_rgba(0,173,181,0.3)] hover:shadow-[0_0_30px_rgba(0,173,181,0.5)] hover:bg-accentHover transition-all transform hover:-translate-y-0.5 mt-2">
               {isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="pt-6 border-t border-white/10 mt-6">
                <button onClick={() => setUser({ id: 'guest', name: 'Guest', email: '', role: UserRole.USER, credits: 0 })} className="text-sm text-gray-500 hover:text-white w-full text-center transition-colors flex items-center justify-center gap-2">
                  <span>Skip & Browse as Guest</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </button>
          </div>
       </div>

       {/* Secret Admin Modal */}
       {showAdminModal && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
               <div className="bg-black border border-red-900/50 p-8 rounded-xl w-full max-w-sm shadow-2xl relative">
                   <button onClick={() => setShowAdminModal(false)} className="absolute top-2 right-4 text-gray-500 hover:text-white text-2xl">×</button>
                   <h2 className="text-2xl font-bold text-red-500 mb-6 font-heading uppercase tracking-widest text-center">Restricted Access</h2>
                   <form onSubmit={handleAdminLogin} className="space-y-4">
                       <div>
                           <label className="block text-xs text-red-400/70 mb-1">SECURITY CODE</label>
                           <input 
                             type="password" 
                             autoFocus
                             className="w-full bg-red-950/20 border border-red-900/50 rounded p-3 text-red-500 outline-none focus:border-red-500 text-center tracking-[0.5em] font-mono" 
                             value={adminPassword} 
                             onChange={e => setAdminPassword(e.target.value)}
                           />
                       </div>
                       {adminError && <p className="text-red-500 text-xs text-center animate-pulse">{adminError}</p>}
                       <button type="submit" className="w-full py-2 bg-red-900/20 text-red-500 border border-red-900 hover:bg-red-900 hover:text-white transition-colors font-mono text-xs uppercase">
                           Authenticate
                       </button>
                   </form>
               </div>
           </div>
       )}
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Store.initAuthListener((u) => {
        setUserState(u);
        setLoading(false);
    });
  }, []);

  const setUser = (u: User | null) => {
    setUserState(u);
    if (!u) Store.logout();
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-dark text-accent animate-pulse">Initializing Backend...</div>;

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      <Router>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <AuthPage />} />
          
          <Route path="/" element={<Layout><Home /></Layout>} />
          <Route path="/movie/:id" element={<Layout><MovieDetail /></Layout>} />
          
          {/* Protected Routes */}
          <Route path="/creator" element={
            user?.role === UserRole.CREATOR ? <Layout><CreatorDashboard /></Layout> : <Navigate to="/login" />
          } />
          
          <Route path="/admin" element={
            user?.role === UserRole.ADMIN ? <Layout><AdminDashboard /></Layout> : <Navigate to="/login" />
          } />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
};

export default App;