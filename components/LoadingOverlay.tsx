export function LoadingOverlay({
  step,
  steps,
  title = "正在整理模拟策略",
  badge = "Demo",
}: {
  step: number;
  steps: string[];
  title?: string;
  badge?: string;
}) {
  const progress = Math.round(((step + 1) / steps.length) * 100);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
      <div
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"
        role="status"
        aria-live="polite"
      >
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-violet-600">{badge}</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{steps[step]}</p>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-violet-100">
          <div
            className="h-full rounded-full bg-violet-600 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <ol className="mt-4 space-y-2 text-sm text-slate-500">
          {steps.map((label, index) => (
            <li key={label} className={index <= step ? "text-slate-800" : undefined}>
              {index < step ? "已完成" : index === step ? "进行中" : "等待"} · {label}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
