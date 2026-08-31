export function ProfileLoadingState() {
  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden"
      style={{ background: 'rgb(var(--rgb-bg))' }}
    >
      <div className="relative z-10 px-5 overflow-y-auto overflow-x-hidden flex-1 h-full pt-24 pb-28">
        <div className="max-w-md mx-auto">
          <div className="flex items-start gap-4 mb-6 animate-pulse">
            <div className="w-20 h-20 rounded-full bg-accent/10 flex-shrink-0" />
            <div className="flex-1 min-w-0 pt-1">
              <div className="h-5 w-36 rounded-full bg-accent/10 mb-2" />
              <div className="h-3 w-24 rounded-full bg-accent/8 mb-4" />
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-accent/8" />
                <div className="w-10 h-10 rounded-full bg-accent/8" />
                <div className="w-10 h-10 rounded-full bg-accent/8" />
              </div>
            </div>
          </div>

          <div
            className="flex justify-center gap-6 mb-6 py-3 rounded-xl animate-pulse"
            style={{
              background: 'rgba(var(--rgb-surface), 0.4)',
              border: '1px solid rgba(var(--rgb-accent), 0.06)',
            }}
          >
            <div className="h-8 w-12 rounded-lg bg-accent/8" />
            <div className="h-8 w-12 rounded-lg bg-accent/8" />
            <div className="w-px bg-accent/10" />
            <div className="h-8 w-20 rounded-lg bg-accent/8" />
          </div>

          <div
            className="w-full rounded-xl px-4 py-3 mb-6 animate-pulse"
            style={{
              background:
                'linear-gradient(160deg, rgba(var(--rgb-accent), 0.08), rgba(var(--rgb-surface), 0.35))',
              border: '1px solid rgba(var(--rgb-accent), 0.08)',
            }}
          >
            <div className="h-4 w-32 rounded-full bg-accent/10 mb-2" />
            <div className="h-3 w-56 rounded-full bg-accent/8" />
          </div>
        </div>
      </div>
    </div>
  );
}
