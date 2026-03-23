export default function AdminLoading() {
  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse">
        <div className="h-7 w-72 rounded bg-slate-200" />
        <div className="mt-3 h-4 w-[28rem] max-w-full rounded bg-slate-100" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm animate-pulse">
            <div className="h-4 w-24 rounded bg-slate-200" />
            <div className="mt-3 h-8 w-16 rounded bg-slate-100" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {[1, 2].map((item) => (
          <div key={item} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm animate-pulse">
            <div className="h-5 w-44 rounded bg-slate-200" />
            <div className="mt-4 h-4 w-full rounded bg-slate-100" />
            <div className="mt-2 h-4 w-5/6 rounded bg-slate-100" />
            <div className="mt-2 h-4 w-4/6 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
