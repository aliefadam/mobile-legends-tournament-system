import { cn } from "../../utils/cn";

export const Skeleton = ({ className }) => <div className={cn("skeleton h-4 w-full", className)} />;

export function EmptyState({ icon = "folder-open", title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl text-slate-400">
        <i className={`fi fi-rr-${icon}`} />
      </span>
      <h4 className="text-base font-bold text-slate-800">{title}</h4>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
