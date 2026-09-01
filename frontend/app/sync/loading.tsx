export default function SyncLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#FDFBF7] to-[#f4efe2] px-6">
      <div className="w-full max-w-2xl rounded-3xl border border-[#e9ddc3] bg-white/90 backdrop-blur-sm shadow-[0_32px_84px_rgba(27,54,93,0.14)] p-8 sm:p-10">
        <div className="flex items-center justify-between gap-4 mb-5">
          <h2 className="text-2xl font-bold text-[#1B365D]">Setting up your workspace...</h2>
          <div className="w-10 h-10 border-2 border-[#1B365D]/25 border-t-[#1B365D] rounded-full animate-spin" />
        </div>

        <p className="text-[#64748B] mb-5">Authenticating and preparing your dashboard.</p>

        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden mb-6">
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#1B365D] to-[#C5A059] animate-pulse" />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="rounded-xl border border-slate-200 bg-slate-50 p-4 animate-pulse">
              <div className="h-3 w-20 bg-slate-200 rounded" />
              <div className="mt-2 h-3 w-28 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
