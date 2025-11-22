import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { UserRole } from '../types';
import { Store } from '../services/store';

// Icons
const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
);

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = async () => {
    await Store.logout();
    setUser(null);
    navigate('/');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would push to a search results page
    // For this demo, we'll just log it or maybe filter the home list if we were there
    console.log("Searching for:", searchQuery);
  };

  return (
    <div className="min-h-screen flex flex-col bg-dark font-sans text-textMain">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-glassBorder">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <img 
                src="https://i.ibb.co/spg38Rbx/Gemini-Generated-Image-ggj5enggj5enggj5-cleanup-1.png" 
                alt="Klug Cinema" 
                className="h-10 w-auto transition-transform group-hover:scale-105"
            />
          </Link>

          {/* Search - Hidden on small mobile */}
          <form onSubmit={handleSearch} className="hidden md:flex items-center bg-black/20 rounded-full px-4 py-1.5 border border-white/10 focus-within:border-accent transition-colors w-1/3">
            <input 
              type="text" 
              placeholder="Search movies, creators..." 
              className="bg-transparent border-none outline-none text-sm w-full text-white placeholder-textMuted"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="text-textMuted hover:text-accent"><SearchIcon /></button>
          </form>

          {/* Right Nav */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                {user.role === UserRole.CREATOR && (
                  <Link to="/creator" className="text-sm font-medium hover:text-accent transition-colors">
                    Dashboard
                  </Link>
                )}
                {user.role === UserRole.ADMIN && (
                  <Link to="/admin" className="text-sm font-medium hover:text-accent transition-colors">
                    Admin Panel
                  </Link>
                )}
                
                <div className="relative group">
                   <button className="flex items-center gap-2 focus:outline-none">
                     <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-blue-600 flex items-center justify-center text-xs font-bold text-white ring-2 ring-transparent group-hover:ring-accent transition-all">
                       {user.name.charAt(0)}
                     </div>
                   </button>
                   {/* Dropdown */}
                   <div className="absolute right-0 mt-2 w-48 bg-[#18181b] border border-white/10 rounded-md shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right z-50">
                      <div className="py-1">
                        <div className="px-4 py-2 border-b border-white/5">
                          <p className="text-sm text-white font-medium">{user.name}</p>
                          <p className="text-xs text-textMuted capitalize">{user.role}</p>
                        </div>
                        <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5">
                          Sign Out
                        </button>
                      </div>
                   </div>
                </div>
              </div>
            ) : (
              <Link to="/login" className="px-5 py-2 rounded-full bg-accent/10 text-accent border border-accent/50 font-medium text-sm hover:bg-accent hover:text-dark transition-all duration-300 neon-shadow">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>
    </div>
  );
};