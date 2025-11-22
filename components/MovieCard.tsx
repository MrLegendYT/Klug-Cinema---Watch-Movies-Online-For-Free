import React from 'react';
import { Link } from 'react-router-dom';
import { Movie } from '../types';

interface MovieCardProps {
  movie: Movie;
  showStatus?: boolean;
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie, showStatus }) => {
  return (
    <div className="group relative rounded-lg overflow-hidden bg-[#1a1a1d] border border-white/5 transition-all duration-500 hover:z-20 hover:scale-105 hover:shadow-[0_0_25px_rgba(0,173,181,0.2)]">
      {/* Image */}
      <div className="aspect-[2/3] overflow-hidden relative">
        <img 
          src={movie.coverImage} 
          alt={movie.title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
        />
        
        {/* Status Badge */}
        {showStatus && (
          <div className="absolute top-2 right-2 z-20">
            <span className={`text-[10px] px-2 py-1 rounded uppercase font-bold shadow-md backdrop-blur-md ${
               movie.status === 'approved' ? 'bg-green-500/50 text-white' :
               movie.status === 'rejected' ? 'bg-red-500/50 text-white' :
               'bg-yellow-500/50 text-white'
             }`}>
               {movie.status}
             </span>
          </div>
        )}

        {/* Overlay on Hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
          <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded">{movie.releaseYear}</span>
                <span className="text-[10px] text-gray-300">{movie.views.toLocaleString()} views</span>
            </div>
            <h3 className="font-heading font-bold text-white leading-tight mb-1 drop-shadow-md">{movie.title}</h3>
            <p className="text-[11px] text-gray-400 line-clamp-2 mb-3">{movie.description}</p>
            
            <Link 
              to={`/movie/${movie.id}`}
              className="block w-full py-2 bg-white text-black font-bold text-center text-xs rounded-sm hover:bg-accent transition-colors"
            >
              ▶ Play Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};