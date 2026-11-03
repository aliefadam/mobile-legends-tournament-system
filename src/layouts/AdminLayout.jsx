import { useEffect, useState } from "react";
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Icon, ConfirmDialog } from "../components/ui";
import { Logo, PageTransition } from "../components/layout/PageTransition";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { cn } from "../utils/cn";

const nav = [
  { to: "/admin", label: "Dashboard", icon: "dashboard", end: true },
  { to: "/admin/tournaments", label: "Turnamen", icon: "trophy" },
  { to: "/admin/registrations", label: "Pendaftaran", icon: "users" },
  { to: "/admin/payments", label: "Pembayaran", icon: "wallet" },
  { to: "/admin/settings", label: "Pengaturan", icon: "settings" },
];

function titleFor(path) {
  if (/\/admin\/tournaments\/.+/.test(path)) return "Detail Turnamen";
  return nav.find((n) => (n.end ? path === n.to : path.startsWith(n.to)))?.label || "Admin";
}

export default function AdminLayout() {
  const { authed, username, logout } = useAuth();
  const toast = useToast();
  const loc = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0 });
  }, [loc.pathname]);

  if (!authed) return <Navigate to="/admin/login" replace state={{ from: loc.pathname }} />;

  const sidebar = (
    <div className="flex h-full flex-col border-r border-slate-200 bg-white text-slate-700">
      <div className="flex h-16 items-center border-b border-slate-200 px-5">
        <Logo brand="Turnamen WS" accent="WS" />
      </div>
      <nav className="flex-1 space-y-1 p-3">
        <p className="px-3 pb-2 pt-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Menu</p>
        {nav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              cn("relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors", isActive ? "bg-electric-50 text-electric-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900")
            }
          >
            <Icon name={n.icon} className="text-lg" />
            {n.label}
          </NavLink>
        ))}
        <p className="px-3 pb-2 pt-5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Publik</p>
        <NavLink to="/" className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900">
          <Icon name="home" className="text-lg" /> Lihat Website
        </NavLink>
      </nav>
      <div className="border-t border-slate-200 p-3">
        <div className="mb-2 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-500 text-sm font-bold uppercase text-white">{username?.[0] || "A"}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{username}</p>
            <p className="text-xs text-slate-500">Administrator</p>
          </div>
        </div>
        <button onClick={() => setConfirm(true)} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50">
          <Icon name="sign-out-alt" className="text-lg" /> Keluar
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>
      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[1px] lg:hidden" onClick={() => setOpen(false)} />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: "spring", stiffness: 380, damping: 36 }} className="fixed inset-y-0 left-0 z-50 w-64 lg:hidden">
              {sidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button onClick={() => setOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-lg text-xl text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Menu">
            <Icon name="menu-burger" />
          </button>
          <h1 className="text-lg font-bold text-slate-900">{titleFor(loc.pathname)}</h1>
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-6">
          <PageTransition key={loc.pathname}>
            <Outlet />
          </PageTransition>
        </main>
      </div>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        tone="warning"
        title="Keluar dari Admin Panel?"
        message="Sesi Anda akan diakhiri dan Anda perlu login kembali."
        confirmLabel="Keluar"
        onConfirm={() => {
          logout();
          setConfirm(false);
          toast.info("Anda telah keluar.");
          navigate("/admin/login");
        }}
      />
    </div>
  );
}
