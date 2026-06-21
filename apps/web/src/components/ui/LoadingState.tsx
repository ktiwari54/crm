export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center px-6 py-12">
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}