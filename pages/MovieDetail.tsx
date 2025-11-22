import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Movie } from '../types';
import { Store } from '../services/store';
import { MovieCard } from '../components/MovieCard';

export const MovieDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [related, setRelated] = useState<Movie[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
        if (id) {
          const found = await Store.getMovie(id);
          setMovie(found || null);
          
          // Get categories for display name
          const cats = await Store.getCategories();
          setCategories(cats);

          if (found) {
            // Find related by category excluding current
            const allMovies = await Store.getMovies();
            const rel = allMovies
              .filter(m => m.categoryId === found.categoryId && m.id !== found.id && m.status === 'approved')
              .slice(0, 4);
            setRelated(rel);
            
            // Simple view counter increment
            // In a real app, you'd debounce this or do it on play
            const updated = { ...found, views: found.views + 1 };
            await Store.updateMovie(updated);
          }
        }
        window.scrollTo(0, 0);
    };
    fetchData();
  }, [id]);

  if (!movie) return <div className="pt-20 text-center text-gray-400">Loading details...</div>;

  return (
    <div className="animate-fade-in bg-[#0E0E10] min-h-screen">
      {/* Detailed Banner */}
      <div className="relative w-full h-[70vh] lg:h-[85vh]">
         {/* Backdrop Image (Horizontal) */}
         <img src={movie.thumbnailUrl || movie.coverImage} alt={movie.title} className="w-full h-full object-cover opacity-60 fixed top-0 z-0" />
         
         <div className="absolute inset-0 bg-gradient-to-t from-[#0E0E10] via-[#0E0E10]/80 to-transparent z-0"></div>
         <div className="absolute inset-0 bg-gradient-to-r from-[#0E0E10] via-[#0E0E10]/60 to-transparent z-0"></div>
         
         <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 lg:pt-48 flex flex-col md:flex-row gap-10 items-start">
            {/* Poster */}
            <div className="hidden md:block w-72 flex-shrink-0 rounded-lg overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)] border border-white/10 transform hover:scale-105 transition-transform duration-500">
              <img src={movie.coverImage} className="w-full h-full object-cover" alt="poster"/>
            </div>

            {/* Info */}
            <div className="flex-grow pt-4 max-w-3xl">
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 font-heading tracking-tight">{movie.title}</h1>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300 mb-8 font-medium">
                <span className="text-accent border border-accent/30 bg-accent/10 px-2 py-0.5 rounded">{categories.find(c => c.id === movie.categoryId)?.name || 'Movie'}</span>
                <span>{movie.releaseYear}</span>
                <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                <span>{movie.views.toLocaleString()} Views</span>
                <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                <span className="text-white">Creator: <span className="text-accent">{movie.creatorName}</span></span>
              </div>

              <p className="text-gray-300 text-lg leading-relaxed mb-10">
                {movie.description}
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <a 
                    href={movie.watchLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex justify-center items-center gap-3 px-10 py-4 bg-accent text-black font-bold rounded hover:bg-accentHover transition-all hover:scale-105 shadow-[0_0_20px_rgba(0,173,181,0.4)]"
                >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" /></svg>
                    Watch Now
                </a>
                <button className="px-8 py-4 border border-white/20 bg-white/5 rounded font-bold text-white hover:bg-white/10 transition-colors">
                    Add to List
                </button>
              </div>
            </div>
         </div>
      </div>

      {/* Ad Placeholder */}
      <div className="relative z-10 bg-[#0E0E10] px-6 py-4">
          <div className="max-w-7xl mx-auto w-full h-24 bg-white/5 flex items-center justify-center text-xs text-gray-500 uppercase tracking-widest border border-dashed border-white/10">
             Google AdSpace
          </div>
      </div>

      {/* Related Section */}
      <div className="relative z-10 bg-[#0E0E10] max-w-7xl mx-auto px-6 py-16">
        <h3 className="text-2xl font-bold mb-8 text-white flex items-center gap-3">
            <span className="w-1 h-8 bg-accent rounded-full"></span>
            More like this
        </h3>
        {related.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {related.map(m => <MovieCard key={m.id} movie={m} />)}
          </div>
        ) : (
          <p className="text-textMuted italic">No related movies found.</p>
        )}
      </div>
    </div>
  );
};