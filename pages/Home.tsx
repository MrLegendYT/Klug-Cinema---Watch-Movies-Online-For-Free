import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Movie, Category } from '../types';
import { Store } from '../services/store';
import { MovieCard } from '../components/MovieCard';

export const Home: React.FC = () => {
  const [featuredMovie, setFeaturedMovie] = useState<Movie | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
        try {
            const [allMovies, allCats] = await Promise.all([
                Store.getMovies(),
                Store.getCategories()
            ]);
            
            const approvedMovies = allMovies.filter(m => m.status === 'approved');
            setMovies(approvedMovies);
            setCategories(allCats);
            
            if (approvedMovies.length > 0) {
                setFeaturedMovie(approvedMovies[Math.floor(Math.random() * approvedMovies.length)]);
            }
        } catch (e) {
            console.error("Failed to load home data", e);
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, []);

  if (loading) return <div className="flex justify-center items-center h-screen text-accent animate-pulse">Loading Cinema...</div>;
  if (!featuredMovie) return <div className="flex justify-center items-center h-screen text-textMuted">No content available yet.</div>;

  return (
    <div className="bg-[#0E0E10] min-h-screen">
      {/* Hero Banner */}
      <div className="relative w-full h-[90vh] overflow-hidden group">
        {/* Background Image (Horizontal Backdrop) */}
        <img 
          src={featuredMovie.thumbnailUrl || featuredMovie.coverImage} 
          alt={featuredMovie.title} 
          className="absolute inset-0 w-full h-full object-cover transform transition-transform duration-[20s] group-hover:scale-110"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0E0E10] via-[#0E0E10]/40 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0E0E10]/90 via-transparent to-transparent"></div>
        
        {/* Banner Content */}
        <div className="absolute bottom-0 left-0 w-full p-8 md:p-16 lg:p-24 z-10">
          <div className="max-w-4xl animate-fade-in">
             <div className="flex items-center gap-3 mb-6">
                <span className="bg-accent text-black text-xs font-extrabold px-3 py-1 rounded shadow-neon">NEW RELEASE</span>
                <span className="text-gray-300 text-sm font-medium border border-white/20 px-2 py-0.5 rounded">{featuredMovie.releaseYear}</span>
             </div>
            
            <h1 className="text-5xl md:text-7xl font-heading font-bold text-white mb-6 leading-none drop-shadow-xl">
              {featuredMovie.title}
            </h1>
            <p className="text-gray-200 text-base md:text-lg mb-8 line-clamp-3 max-w-2xl font-light leading-relaxed text-shadow-sm">
              {featuredMovie.description}
            </p>
            
            <div className="flex items-center gap-4">
                <Link 
                to={`/movie/${featuredMovie.id}`}
                className="flex items-center gap-3 px-8 py-4 text-base font-bold text-black bg-white rounded hover:bg-accent transition-all duration-300 hover:scale-105 shadow-lg"
                >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" /></svg>
                Play Now
                </Link>
                <button className="px-8 py-4 text-base font-bold text-white bg-white/20 backdrop-blur-md border border-white/10 rounded hover:bg-white/30 transition-all duration-300">
                    More Info
                </button>
            </div>
          </div>
        </div>
      </div>

      {/* Ad Placeholder Top */}
      <div id="ad-container-top" className="max-w-7xl mx-auto px-6 py-4">
        <div className="w-full h-24 bg-white/5 flex items-center justify-center text-xs text-gray-500 uppercase tracking-widest border border-dashed border-white/10">
           Google AdSpace
        </div>
      </div>

      {/* Categories Section */}
      <div className="relative z-20 pb-20 space-y-12">
        {categories.map(cat => {
           const catMovies = movies.filter(m => m.categoryId === cat.id);
           if (catMovies.length === 0) return null;

           return (
             <div key={cat.id} className="pl-6 md:pl-12">
                <h2 className="text-xl md:text-2xl font-heading font-bold text-white mb-4 flex items-center gap-2 group/title cursor-pointer">
                  {cat.name}
                  <span className="text-accent opacity-0 group-hover/title:opacity-100 transition-opacity text-sm">Explore All &gt;</span>
                </h2>
                
                <div className="relative group/row">
                   <div className="flex gap-4 overflow-x-auto pb-8 pr-6 scrollbar-hide scroll-smooth">
                    {catMovies.map(movie => (
                        <div key={movie.id} className="min-w-[150px] md:min-w-[200px] flex-shrink-0">
                        <MovieCard movie={movie} />
                        </div>
                    ))}
                   </div>
                   {/* Fade Effect on Right */}
                   <div className="absolute right-0 top-0 bottom-8 w-24 bg-gradient-to-l from-[#0E0E10] to-transparent pointer-events-none"></div>
                </div>
             </div>
           )
        })}
      </div>

      {/* Ad Placeholder Bottom */}
      <div id="ad-container-bottom" className="max-w-7xl mx-auto px-6 pb-12">
        <div className="w-full h-24 bg-white/5 flex items-center justify-center text-xs text-gray-500 uppercase tracking-widest border border-dashed border-white/10">
           Google AdSpace
        </div>
      </div>
    </div>
  );
};