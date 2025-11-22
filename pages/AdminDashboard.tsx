import React, { useState, useEffect } from 'react';
import { Store } from '../services/store';
import { Request, Movie, User, MovieStatus, Category } from '../types';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'requests' | 'movies' | 'users' | 'settings'>('requests');
  const [requests, setRequests] = useState<Request[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [monetagLink, setMonetagLink] = useState('');
  
  // Edit State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    try {
        const [reqData, movData, usrData, setSettings, catData] = await Promise.all([
            Store.getRequests(),
            Store.getMovies(),
            Store.getUsers(),
            Store.getSettings(),
            Store.getCategories()
        ]);
        setRequests(reqData);
        setMovies(movData);
        setUsers(usrData);
        setMonetagLink(setSettings.monetagLink);
        setCategories(catData);
    } catch (e) {
        console.error("Failed to refresh admin data", e);
    }
  };

  const handleRequestAction = async (req: Request, approved: boolean) => {
    try {
        // Update request status
        const updatedReq: Request = { ...req, status: approved ? 'approved' : 'rejected' };
        await Store.updateRequest(updatedReq);

        if (approved && req.action === 'upload') {
           const movie = await Store.getMovie(req.movieId);
           if (movie) {
             await Store.updateMovie({ ...movie, status: MovieStatus.APPROVED });
           }
        } else if (!approved && req.action === 'upload') {
            const movie = await Store.getMovie(req.movieId);
            if (movie) {
              await Store.updateMovie({ ...movie, status: MovieStatus.REJECTED });
            }
        }
        await refreshData();
    } catch (e) {
        console.error("Request action failed", e);
    }
  };

  const handleSaveSettings = async () => {
      await Store.updateSettings({ monetagLink });
      alert("Settings updated successfully!");
  };

  // Movie Management Actions
  const handleDeleteMovie = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); 
    
    if (window.confirm("Are you sure you want to permanently delete this movie?")) {
        // Store current movies for rollback if needed
        const previousMovies = [...movies];
        
        try {
            // Optimistic UI update: Immediately remove from view
            setMovies(prev => prev.filter(m => m.id !== id));
            
            // Perform backend delete
            await Store.deleteMovie(id);
            
            // Success check - wait a brief moment for backend to settle then sync
            // We delay slightly to ensure Firestore index updates if in cloud
            setTimeout(async () => {
                await refreshData();
            }, 500);

        } catch (err) {
            console.error("Delete error", err);
            alert("Failed to delete movie. Please check your connection or permissions.");
            // Revert UI
            setMovies(previousMovies);
        }
    }
  };

  const openEditModal = (movie: Movie, e?: React.MouseEvent) => {
      if (e) {
          e.preventDefault();
          e.stopPropagation();
      }
      setEditingMovie({ ...movie });
      setShowEditModal(true);
  };

  const handleSaveMovieChanges = async (e: React.FormEvent) => {
      e.preventDefault();
      if (editingMovie) {
          await Store.updateMovie(editingMovie);
          setShowEditModal(false);
          setEditingMovie(null);
          await refreshData();
          alert("Movie details updated.");
      }
  };

  // Helper to find movie for request preview
  const getMovieForRequest = (movieId: string) => {
      return movies.find(m => m.id === movieId);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 min-h-screen">
      <h1 className="text-3xl font-heading font-bold mb-8 text-white">Admin Dashboard</h1>

      {/* Tabs */}
      <div className="flex border-b border-white/10 mb-8 overflow-x-auto">
        {['requests', 'movies', 'users', 'settings'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-6 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === tab ? 'border-accent text-accent' : 'border-transparent text-textMuted hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="glass-panel rounded-xl p-6 overflow-x-auto min-h-[500px]">
        {activeTab === 'requests' && (
          <table className="w-full text-left text-sm">
            <thead className="text-textMuted border-b border-white/10">
              <tr>
                <th className="pb-4">Creator</th>
                <th className="pb-4">Action</th>
                <th className="pb-4">Movie</th>
                <th className="pb-4">Preview</th>
                <th className="pb-4">Status</th>
                <th className="pb-4 text-right">Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {requests.map(req => {
                const movie = getMovieForRequest(req.movieId);
                return (
                  <tr key={req.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 font-medium">{req.creatorName}</td>
                    <td className="py-4 uppercase text-xs font-bold text-blue-400">{req.action}</td>
                    <td className="py-4">{req.movieTitle}</td>
                    <td className="py-4">
                        {movie ? (
                            <a 
                              href={movie.watchLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-accent hover:text-white text-xs border border-accent/30 px-2 py-1 rounded hover:bg-accent hover:text-black transition-all w-fit"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                Check Link
                            </a>
                        ) : (
                            <span className="text-gray-500 italic text-xs">Deleted</span>
                        )}
                    </td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold ${
                        req.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        req.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="py-4 text-right space-x-2">
                      {req.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleRequestAction(req, true)}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-500 text-xs font-bold"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => handleRequestAction(req, false)}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-500 text-xs font-bold"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
              {requests.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-500">No requests found.</td></tr>}
            </tbody>
          </table>
        )}

        {activeTab === 'movies' && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
             {movies.map(m => (
               <div key={m.id} className="group relative bg-[#1a1a1d] rounded-lg overflow-hidden border border-white/10 hover:border-accent/50 transition-all">
                 <div className="aspect-[2/3] overflow-hidden relative">
                    <img src={m.coverImage} className="w-full h-full object-cover" alt="cover"/>
                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-3 transition-opacity duration-300 z-10 p-4">
                        <a 
                            href={m.watchLink}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full px-4 py-2 bg-accent text-black font-bold rounded text-xs hover:bg-white transition-colors text-center"
                        >
                            Preview
                        </a>
                        <button 
                            type="button"
                            onClick={(e) => openEditModal(m, e)}
                            className="w-full px-4 py-2 bg-blue-600 text-white font-bold rounded text-xs hover:bg-blue-500 transition-colors"
                        >
                            Edit
                        </button>
                        <button 
                            type="button"
                            onClick={(e) => handleDeleteMovie(m.id, e)}
                            className="w-full px-4 py-2 bg-red-600 text-white font-bold rounded text-xs hover:bg-red-500 transition-colors"
                        >
                            Delete
                        </button>
                    </div>
                 </div>
                 <div className="p-3">
                    <h4 className="font-bold text-white truncate text-sm">{m.title}</h4>
                    <div className="flex justify-between items-center mt-1">
                        <span className="text-[10px] text-gray-400">{m.creatorName}</span>
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            m.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                            m.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                            'bg-yellow-500/20 text-yellow-400'
                        }`}>
                            {m.status}
                        </span>
                    </div>
                 </div>
               </div>
             ))}
             {movies.length === 0 && <p className="text-gray-500 col-span-full text-center">No movies found.</p>}
          </div>
        )}

        {activeTab === 'users' && (
          <table className="w-full text-left text-sm">
            <thead className="text-textMuted border-b border-white/10">
               <tr>
                 <th className="pb-4">Name</th>
                 <th className="pb-4">Email</th>
                 <th className="pb-4">Role</th>
                 <th className="pb-4">Credits</th>
               </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                  <td className="py-4">{u.name}</td>
                  <td className="py-4 text-gray-400">{u.email}</td>
                  <td className="py-4 capitalize">{u.role}</td>
                  <td className="py-4 text-accent font-bold">{u.role === 'creator' ? u.credits : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'settings' && (
             <div className="max-w-lg">
                 <h3 className="text-xl font-bold text-white mb-4">Global Settings</h3>
                 <div className="mb-6">
                     <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Monetag / Credit Link</label>
                     <input 
                        type="url" 
                        className="w-full bg-black/30 border border-white/10 rounded p-3 text-white focus:border-accent outline-none focus:ring-1 focus:ring-accent"
                        value={monetagLink}
                        onChange={(e) => setMonetagLink(e.target.value)}
                        placeholder="https://..."
                     />
                     <p className="text-[10px] text-gray-500 mt-2">This link opens when creators want to earn credits.</p>
                 </div>
                 <button 
                    onClick={handleSaveSettings}
                    className="px-6 py-2 bg-accent text-black font-bold rounded hover:bg-accentHover transition-colors"
                 >
                     Save Changes
                 </button>
             </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && editingMovie && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
            <div className="glass-panel p-8 rounded-2xl w-full max-w-2xl relative border border-white/10 max-h-[90vh] overflow-y-auto">
                <button onClick={() => setShowEditModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <h2 className="text-2xl font-bold text-white mb-6 font-heading">Edit Movie Details</h2>
                
                <form onSubmit={handleSaveMovieChanges} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Title</label>
                            <input 
                                type="text" 
                                required 
                                className="w-full bg-black/30 border border-white/10 rounded p-3 text-white outline-none focus:border-accent"
                                value={editingMovie.title}
                                onChange={(e) => setEditingMovie({...editingMovie, title: e.target.value})}
                            />
                        </div>
                        <div>
                             <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Status</label>
                             <select 
                                className="w-full bg-black/30 border border-white/10 rounded p-3 text-white outline-none focus:border-accent"
                                value={editingMovie.status}
                                onChange={(e) => setEditingMovie({...editingMovie, status: e.target.value as MovieStatus})}
                             >
                                <option value={MovieStatus.APPROVED}>Approved</option>
                                <option value={MovieStatus.PENDING}>Pending</option>
                                <option value={MovieStatus.REJECTED}>Rejected</option>
                             </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Description</label>
                        <textarea 
                            rows={3}
                            className="w-full bg-black/30 border border-white/10 rounded p-3 text-white outline-none focus:border-accent"
                            value={editingMovie.description}
                            onChange={(e) => setEditingMovie({...editingMovie, description: e.target.value})}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Category</label>
                            <select 
                                className="w-full bg-black/30 border border-white/10 rounded p-3 text-white outline-none focus:border-accent"
                                value={editingMovie.categoryId}
                                onChange={(e) => setEditingMovie({...editingMovie, categoryId: e.target.value})}
                            >
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Release Year</label>
                            <input 
                                type="number"
                                className="w-full bg-black/30 border border-white/10 rounded p-3 text-white outline-none focus:border-accent"
                                value={editingMovie.releaseYear}
                                onChange={(e) => setEditingMovie({...editingMovie, releaseYear: parseInt(e.target.value)})}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Watch URL</label>
                        <div className="flex gap-2">
                            <input 
                                type="url"
                                required
                                className="w-full bg-black/30 border border-white/10 rounded p-3 text-white outline-none focus:border-accent"
                                value={editingMovie.watchLink}
                                onChange={(e) => setEditingMovie({...editingMovie, watchLink: e.target.value})}
                            />
                            <a href={editingMovie.watchLink} target="_blank" rel="noreferrer" className="px-4 py-2 bg-white/10 rounded flex items-center justify-center hover:bg-white/20">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            </a>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                             <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Cover Image URL</label>
                             <input 
                                 type="url"
                                 className="w-full bg-black/30 border border-white/10 rounded p-3 text-white outline-none focus:border-accent text-xs"
                                 value={editingMovie.coverImage}
                                 onChange={(e) => setEditingMovie({...editingMovie, coverImage: e.target.value})}
                             />
                         </div>
                         <div>
                             <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Backdrop URL</label>
                             <input 
                                 type="url"
                                 className="w-full bg-black/30 border border-white/10 rounded p-3 text-white outline-none focus:border-accent text-xs"
                                 value={editingMovie.thumbnailUrl}
                                 onChange={(e) => setEditingMovie({...editingMovie, thumbnailUrl: e.target.value})}
                             />
                         </div>
                    </div>

                    <div className="pt-4 flex gap-4">
                        <button 
                            type="button"
                            onClick={() => setShowEditModal(false)}
                            className="flex-1 py-3 bg-gray-700 text-white font-bold rounded hover:bg-gray-600"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            className="flex-1 py-3 bg-accent text-black font-bold rounded hover:bg-accentHover"
                        >
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};