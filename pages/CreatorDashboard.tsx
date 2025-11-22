import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Store } from '../services/store';
import { Movie, MovieStatus, CREDIT_COSTS, Category } from '../types';
import { MovieCard } from '../components/MovieCard';
import { CreditPopup } from '../components/CreditPopup';

export const CreatorDashboard: React.FC = () => {
  const { user, setUser } = useAuth();
  const [myMovies, setMyMovies] = useState<Movie[]>([]);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showLowCreditsModal, setShowLowCreditsModal] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    releaseYear: new Date().getFullYear(),
    watchLink: '',
    categoryId: '',
    coverImage: '',
    thumbnailUrl: '' 
  });

  useEffect(() => {
    const loadData = async () => {
        if (user) {
          const [allMovies, allCats] = await Promise.all([
              Store.getMovies(),
              Store.getCategories()
          ]);
          setMyMovies(allMovies.filter(m => m.creatorId === user.id));
          setCategories(allCats);
          // Set default category if form opens
          if (allCats.length > 0) {
              setFormData(prev => ({ ...prev, categoryId: allCats[0].id }));
          }
        }
    };
    loadData();
  }, [user]);

  // Reset form when modal opens
  useEffect(() => {
     if(showUploadModal) {
         setFormData({
            title: '',
            description: '',
            releaseYear: new Date().getFullYear(),
            watchLink: '',
            categoryId: categories[0]?.id || '',
            coverImage: `https://picsum.photos/400/600?random=${Math.random()}`, // Default random
            thumbnailUrl: `https://picsum.photos/800/450?random=${Math.random()}` // Default random
         });
     }
  }, [showUploadModal, categories]);

  const handleCreditsAdded = (newBalance: number) => {
    if (user) {
      setUser({ ...user, credits: newBalance });
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (user.credits < CREDIT_COSTS.UPLOAD) {
      setShowLowCreditsModal(true);
      return;
    }

    try {
        // 1. Deduct Credits
        const newCredits = user.credits - CREDIT_COSTS.UPLOAD;
        const updatedUser = { ...user, credits: newCredits };
        await Store.updateUser(updatedUser);
        setUser(updatedUser);

        // 2. Create Movie (Pending)
        const newMovie: Movie = {
            id: `mov_${Date.now()}`,
            creatorId: user.id,
            creatorName: user.name,
            title: formData.title,
            description: formData.description,
            releaseYear: Number(formData.releaseYear),
            watchLink: formData.watchLink,
            categoryId: formData.categoryId || categories[0].id,
            coverImage: formData.coverImage, 
            thumbnailUrl: formData.thumbnailUrl,
            status: MovieStatus.PENDING,
            views: 0,
            createdAt: new Date().toISOString()
        };
        await Store.addMovie(newMovie);

        // 3. Create Request
        await Store.addRequest({
            id: `req_${Date.now()}`,
            creatorId: user.id,
            creatorName: user.name,
            movieId: newMovie.id,
            movieTitle: newMovie.title,
            action: 'upload',
            status: 'pending',
            timestamp: new Date().toISOString()
        });

        setMyMovies([...myMovies, newMovie]);
        setShowUploadModal(false);
        alert('Movie uploaded successfully! It is now pending admin review.');
    } catch (error) {
        console.error("Upload failed", error);
        alert("Failed to upload. Please try again.");
    }
  };

  const handleDelete = async (movieId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if(!user) return;
    if (user.credits < CREDIT_COSTS.DELETE) {
      setShowLowCreditsModal(true);
      return;
    }
    if(!window.confirm("Are you sure? Costs 5 credits.")) return;

    const previousMovies = [...myMovies];
    const previousCredits = user.credits;

    try {
        // Optimistic UI update
        const newCredits = user.credits - CREDIT_COSTS.DELETE;
        const updatedUser = { ...user, credits: newCredits };
        setUser(updatedUser);
        setMyMovies(myMovies.filter(m => m.id !== movieId));

        // Async backend calls
        await Store.updateUser(updatedUser);
        await Store.deleteMovie(movieId);
        
    } catch (e) {
        console.error("Delete failed", e);
        // Rollback
        setUser({ ...user, credits: previousCredits });
        setMyMovies(previousMovies);
        alert("Failed to delete. Please try again.");
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 animate-fade-in">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="glass-panel p-6 rounded-xl flex items-center justify-between border-l-4 border-accent">
          <div>
            <p className="text-textMuted text-xs font-bold uppercase tracking-widest">My Credits</p>
            <h2 className="text-4xl font-bold text-accent mt-1">{user.credits}</h2>
          </div>
          <button onClick={() => setIsPopupOpen(true)} className="w-12 h-12 rounded-full bg-white/5 hover:bg-accent hover:text-black flex items-center justify-center transition-all text-2xl font-bold border border-white/10">
            +
          </button>
        </div>
        
        <div className="glass-panel p-6 rounded-xl">
          <p className="text-textMuted text-xs font-bold uppercase tracking-widest">Total Uploads</p>
          <h2 className="text-4xl font-bold text-white mt-1">{myMovies.length}</h2>
        </div>

        <div className="glass-panel p-6 rounded-xl">
          <p className="text-textMuted text-xs font-bold uppercase tracking-widest">Total Views</p>
          <h2 className="text-4xl font-bold text-white mt-1">{myMovies.reduce((acc, m) => acc + m.views, 0)}</h2>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-heading font-bold text-white">My Movies</h1>
        <button 
          onClick={() => setShowUploadModal(true)}
          className="px-6 py-3 bg-gradient-to-r from-accent to-teal-400 text-black font-bold rounded-full hover:shadow-[0_0_20px_rgba(0,173,181,0.4)] transition-all transform hover:-translate-y-0.5"
        >
          Upload Movie (-10 Credits)
        </button>
      </div>

      {/* Movie Grid - 1 col (mobile), 3 col (tablet), 4 col (desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {myMovies.map(movie => (
          <div key={movie.id} className="relative group">
            <MovieCard movie={movie} showStatus />
            <button 
                 type="button"
                 onClick={(e) => handleDelete(movie.id, e)}
                 className="absolute top-2 right-2 z-30 bg-red-600/80 text-white text-[10px] px-2 py-1 rounded hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-md backdrop-blur-sm font-bold"
               >
                 DELETE
               </button>
          </div>
        ))}
        {myMovies.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-50">
                <div className="text-6xl mb-4">🎬</div>
                <p className="text-xl font-bold">No movies yet</p>
                <p className="text-sm">Upload your first masterpiece to start earning.</p>
            </div>
        )}
      </div>

      {/* Credit Popup */}
      <CreditPopup 
        isOpen={isPopupOpen} 
        onClose={() => setIsPopupOpen(false)} 
        onCreditsAdded={handleCreditsAdded} 
      />

      {/* Low Credits Modal */}
      {showLowCreditsModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in p-4">
            <div className="bg-[#1a1a1d] border border-red-500/30 p-8 rounded-2xl max-w-sm w-full relative shadow-[0_0_50px_rgba(220,38,38,0.2)] text-center transform scale-100 animate-fade-in">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                    <span className="text-3xl">⚠️</span>
                </div>
                <h2 className="text-2xl font-heading font-bold text-white mb-2">Insufficient Credits</h2>
                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                    Not Enough Credits. Please Complete Task And Earn.
                </p>
                <div className="flex flex-col gap-3">
                    <button 
                        onClick={() => {
                            setShowLowCreditsModal(false);
                            setIsPopupOpen(true);
                        }}
                        className="w-full py-3 bg-accent text-black font-bold rounded hover:bg-accentHover transition-colors shadow-lg shadow-accent/20"
                    >
                        Earn Credits Now
                    </button>
                    <button 
                        onClick={() => setShowLowCreditsModal(false)}
                        className="w-full py-3 bg-white/5 text-gray-400 font-bold rounded hover:bg-white/10 hover:text-white transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="glass-panel p-8 rounded-2xl w-full max-w-2xl relative max-h-[90vh] overflow-y-auto shadow-2xl border border-white/10">
             <button onClick={() => setShowUploadModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
             
             <h2 className="text-3xl font-heading font-bold mb-2 text-white">Upload Content</h2>
             <p className="text-textMuted text-sm mb-8">Share your creation with the world. Cost: 10 Credits.</p>
             
             <form onSubmit={handleUpload} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                    <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">Title</label>
                    <input required className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-accent outline-none focus:ring-1 focus:ring-accent/50 transition-all" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Movie Title" />
                    </div>
                    <div>
                    <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">Category</label>
                    <select className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-accent" value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})}>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">Description</label>
                  <textarea required rows={4} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-accent" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="What is this movie about?" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">Release Year</label>
                    <input type="number" required className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-accent" value={formData.releaseYear} onChange={e => setFormData({...formData, releaseYear: parseInt(e.target.value)})} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">Stream / Watch URL</label>
                    <input type="url" required placeholder="https://youtube.com/..." className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-accent" value={formData.watchLink} onChange={e => setFormData({...formData, watchLink: e.target.value})} />
                  </div>
                </div>

                {/* Image URLs */}
                <div className="p-4 bg-white/5 rounded-lg border border-white/5 space-y-4">
                    <div>
                        <label className="block text-xs uppercase tracking-wider text-accent mb-2">Poster Image URL (Vertical)</label>
                        <input type="url" required placeholder="https://..." className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-accent" value={formData.coverImage} onChange={e => setFormData({...formData, coverImage: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs uppercase tracking-wider text-accent mb-2">Thumbnail / Backdrop URL (Horizontal)</label>
                        <input type="url" required placeholder="https://..." className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-accent" value={formData.thumbnailUrl} onChange={e => setFormData({...formData, thumbnailUrl: e.target.value})} />
                    </div>
                </div>
                
                <button type="submit" className="w-full py-4 bg-gradient-to-r from-accent to-teal-500 text-black font-bold rounded-lg hover:shadow-lg hover:scale-[1.01] transition-all mt-4 text-lg uppercase tracking-wide">
                  Submit for Review
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};