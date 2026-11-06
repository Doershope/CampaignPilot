export function DemoNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm leading-6 text-violet-900">
      <span className="mr-2 inline-flex rounded-full bg-violet-600 px-2 py-0.5 text-xs font-medium text-white">
        Demo
      </span>
      {children}
    </div>
  );
}
