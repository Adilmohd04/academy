export default function SignInLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
      <div className="text-center">
        <div className="mx-auto mb-4 h-14 w-14 rounded-2xl flex items-center justify-center text-white text-2xl font-bold" style={{ background: 'linear-gradient(135deg, #1B365D, #0f2240)' }}>
          م
        </div>
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 border-t-[#1B365D] mx-auto mb-3" />
        <p className="text-sm text-slate-600">Loading secure sign in...</p>
      </div>
    </div>
  );
}
