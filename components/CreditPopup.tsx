import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Store } from '../services/store';

interface CreditPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onCreditsAdded: (newBalance: number) => void;
}

export const CreditPopup: React.FC<CreditPopupProps> = ({ isOpen, onClose, onCreditsAdded }) => {
  const { user } = useAuth();
  const [progress, setProgress] = useState(0); // 0 to 10
  const [isWaiting, setIsWaiting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [link, setLink] = useState('');

  useEffect(() => {
    if (isOpen) {
      setProgress(0);
      setCompleted(false);
      setIsWaiting(false);
      // Fetch link fresh
      Store.getSettings().then(s => setLink(s.monetagLink));
    }
  }, [isOpen]);

  useEffect(() => {
    let timer: any;
    if (isWaiting && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isWaiting && timeLeft === 0) {
      // Timer finished, award 1 progress point
      setIsWaiting(false);
      const newProgress = progress + 1;
      setProgress(newProgress);
      
      if (newProgress >= 10) {
        setCompleted(true);
        // Update actual user credits
        if (user) {
          const updatedUser = { ...user, credits: user.credits + 10 };
          Store.updateUser(updatedUser).then(() => {
              onCreditsAdded(updatedUser.credits);
          });
        }
      }
    }
    return () => clearInterval(timer);
  }, [isWaiting, timeLeft, progress, user, onCreditsAdded]);

  const handleLinkClick = () => {
    if (isWaiting || completed) return;
    
    window.open(link || 'https://google.com', '_blank');
    
    // Start timer
    setTimeLeft(3);
    setIsWaiting(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#1a1a1d] border border-accent/30 p-8 rounded-2xl max-w-md w-full relative shadow-[0_0_50px_rgba(0,173,181,0.1)]">
        
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <h2 className="text-2xl font-heading font-bold text-center mb-2 text-white">Earn Credits</h2>
        <p className="text-textMuted text-center text-sm mb-6">
          Click the link below, view the ad/page for 3 seconds, and earn progress. Fill the bar to get <strong>10 Credits</strong>!
        </p>

        {/* Progress Bar */}
        <div className="w-full h-4 bg-black/50 rounded-full overflow-hidden mb-6 border border-white/10 relative">
           <div 
             className="h-full bg-accent transition-all duration-300 ease-out neon-shadow"
             style={{ width: `${(progress / 10) * 100}%` }}
           ></div>
           <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-md">
             {progress} / 10
           </span>
        </div>

        <div className="flex flex-col items-center gap-4">
          {completed ? (
             <div className="text-center animate-bounce">
               <p className="text-green-400 font-bold text-lg mb-2">🎉 +10 Credits Added!</p>
               <button onClick={onClose} className="px-6 py-2 bg-white text-black font-bold rounded hover:bg-gray-200">Close</button>
             </div>
          ) : (
            <>
              {isWaiting ? (
                <div className="flex flex-col items-center text-accent animate-pulse">
                  <span className="text-3xl font-bold mb-1">{timeLeft}s</span>
                  <span className="text-xs uppercase tracking-widest">Viewing...</span>
                </div>
              ) : (
                <button 
                  onClick={handleLinkClick}
                  className="px-8 py-3 bg-transparent border border-accent text-accent font-bold rounded-full hover:bg-accent hover:text-dark transition-all duration-300 neon-shadow flex items-center gap-2"
                >
                  <span>Open Sponsor Link</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </button>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
};