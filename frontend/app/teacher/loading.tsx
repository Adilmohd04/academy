export default function TeacherLoading() {
  return (
    <div className="w-full min-w-0 px-4 sm:px-6 lg:px-10 py-6 lg:py-8">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse">
          <div className="h-7 w-64 rounded bg-slate-200" />
          <div className="mt-3 h-4 w-96 max-w-full rounded bg-slate-100" />
        </div>

        <div className="mt-6 grid gap-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm animate-pulse">
              <div className="h-5 w-48 rounded bg-slate-200" />
              <div className="mt-3 h-4 w-full rounded bg-slate-100" />
              <div className="mt-2 h-4 w-5/6 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
