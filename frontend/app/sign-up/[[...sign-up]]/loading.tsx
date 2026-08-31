export default function SignUpLoading() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#FDFBF7] px-6">
      <section className="w-full max-w-md rounded-[2rem] border border-[#e7dfcc] bg-white/90 p-8 text-center shadow-[0_30px_80px_rgba(27,54,93,0.14)] backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1B365D] text-2xl font-bold text-white shadow-lg">م</div>
        <h1 className="mt-5 text-xl font-semibold text-[#1B365D]">Preparing your sign up</h1>
        <p className="mt-2 text-sm text-slate-600">Opening a secure account setup for you…</p>
        <div className="mx-auto mt-6 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#1B365D] to-[#C5A059] animate-pulse" />
        </div>
      </section>
    </main>
  );
}
