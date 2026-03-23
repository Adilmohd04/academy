export default function StudentLoading() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse">
        <div className="h-7 w-64 rounded bg-slate-200" />
        <div className="mt-3 h-4 w-[24rem] max-w-full rounded bg-slate-100" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm animate-pulse">
            <div className="h-4 w-20 rounded bg-slate-200" />
            <div className="mt-3 h-8 w-16 rounded bg-slate-100" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {[1, 2].map((item) => (
          <div key={item} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm animate-pulse">
            <div className="h-5 w-40 rounded bg-slate-200" />
            <div className="mt-4 h-4 w-full rounded bg-slate-100" />
            <div className="mt-2 h-4 w-5/6 rounded bg-slate-100" />
            <div className="mt-2 h-4 w-4/6 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
