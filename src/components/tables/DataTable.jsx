import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "../../utils/cn";
import { Button, Dropdown, EmptyState, Icon, Pagination, SearchInput, Skeleton } from "../ui";

/**
 * columns: [{ key, header, render?(row), className, primary?, hideOnMobile? }]
 * actions(row) → [{label, icon, onClick, danger, divider}]
 * Desktop → tabel; Mobile → card row.
 */
export function DataTable({
  columns,
  rows,
  rowKey = "id",
  loading,
  search,
  onSearch,
  searchPlaceholder = "Cari...",
  filters,
  toolbarRight,
  onRefresh,
  actions,
  onRowClick,
  pageSize = 8,
  emptyTitle = "Belum ada data",
  emptyDescription,
  emptyAction,
  emptyIcon,
}) {
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [search, rows.length]);
  const total = rows.length;
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const primary = columns.find((c) => c.primary) || columns[0];
  const rest = columns.filter((c) => c !== primary && !c.hideOnMobile);
  const cell = (c, row) => (c.render ? c.render(row) : row[c.key] ?? "-");

  const actionBtn = (row) =>
    actions && (
      <Dropdown
        items={actions(row)}
        trigger={
          <button className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800" aria-label="Aksi">
            <Icon name="menu-dots-vertical" className="text-lg" />
          </button>
        }
      />
    );

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-navy-900/[0.03]">
      {(onSearch || filters || onRefresh || toolbarRight) && (
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center">
          {onSearch && <SearchInput value={search} onChange={onSearch} placeholder={searchPlaceholder} className="w-full lg:max-w-xs" />}
          <div className="flex flex-1 flex-wrap items-center gap-2 lg:justify-end">
            {filters}
            {onRefresh && (
              <Button variant="outline" size="sm" className="h-10 w-10 px-0" onClick={onRefresh} aria-label="Refresh data" disabled={loading}>
                <Icon name="refresh" className={cn("text-base", loading && "animate-spin")} />
              </Button>
            )}
            {toolbarRight}
          </div>
        </div>
      )}

      {/* Desktop */}
      <div className="thin-scroll hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80">
              {columns.map((c) => (
                <th key={c.key} className={cn("whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500", c.className)}>
                  {c.header}
                </th>
              ))}
              {actions && <th className="w-14 px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-4">
                        <Skeleton className="h-4" />
                      </td>
                    ))}
                    {actions && <td />}
                  </tr>
                ))
              : pageRows.map((row, i) => (
                  <motion.tr
                    key={row[rowKey]}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.025 }}
                    onClick={() => onRowClick?.(row)}
                    className={cn("border-b border-slate-50 transition-colors last:border-0 hover:bg-electric-50/40", onRowClick && "cursor-pointer")}
                  >
                    {columns.map((c) => (
                      <td key={c.key} className={cn("px-4 py-3.5 align-middle text-slate-700", c.className)}>
                        {cell(c, row)}
                      </td>
                    ))}
                    {actions && <td className="px-2 py-2 text-right">{actionBtn(row)}</td>}
                  </motion.tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: card rows */}
      <div className="divide-y divide-slate-100 md:hidden">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-3 p-4">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))
          : pageRows.map((row, i) => (
              <motion.div key={row[rowKey]} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="p-4" onClick={() => onRowClick?.(row)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 font-semibold text-slate-900">{cell(primary, row)}</div>
                  {actionBtn(row)}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
                  {rest.map((c) => (
                    <div key={c.key} className="min-w-0">
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{c.header}</dt>
                      <dd className="mt-0.5 break-words text-sm text-slate-700">{cell(c, row)}</dd>
                    </div>
                  ))}
                </dl>
              </motion.div>
            ))}
      </div>

      {!loading && total === 0 && <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} action={emptyAction} />}
      {!loading && <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />}
    </div>
  );
}
