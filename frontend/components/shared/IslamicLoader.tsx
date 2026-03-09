import { Moon, Star } from 'lucide-react';

export default function IslamicLoader() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-28 h-28 mx-auto mb-8">
          {/* Outer circle */}
          <div className="absolute inset-0 border-4 border-emerald-200 rounded-full animate-pulse"></div>
          {/* Middle circle - spinning */}
          <div className="absolute inset-3 border-4 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
          {/* Inner circle */}
          <div className="absolute inset-6 border-4 border-emerald-300 rounded-full animate-pulse"></div>
          {/* Crescent moon icon */}
          <Moon className="absolute inset-0 m-auto h-12 w-12 text-emerald-600 animate-pulse" />
          {/* Star decorations */}
          <Star className="absolute top-1 right-1 h-5 w-5 text-amber-400 animate-bounce" style={{ animationDelay: '0s' }} />
          <Star className="absolute top-1 left-1 h-4 w-4 text-amber-300 animate-bounce" style={{ animationDelay: '0.2s' }} />
          <Star className="absolute bottom-1 right-1 h-4 w-4 text-amber-300 animate-bounce" style={{ animationDelay: '0.4s' }} />
        </div>
        <p className="text-emerald-800 font-bold text-2xl mb-3">Loading...</p>
        <p className="text-emerald-600 text-lg font-semibold">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
        <p className="text-emerald-500 text-sm mt-2">In the name of Allah, the Most Gracious, the Most Merciful</p>
      </div>
    </div>
  );
}
