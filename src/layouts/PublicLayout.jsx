import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "../components/ui";
import { Logo, PageTransition } from "../components/layout/PageTransition";
import { useData } from "../contexts/DataContext";
import { cn } from "../utils/cn";

const links = [
  { to: "/", label: "Beranda", end: true },
  { to: "/status", label: "Cek Status" },
];

export default function PublicLayout() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const { settings } = useData();
  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0 });
  }, [loc.pathname]);

  const linkCls = ({ isActive }) =>
    cn("rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors", isActive ? "bg-electric-50 text-electric-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={linkCls}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <button onClick={() => setOpen((o) => !o)} className="flex h-10 w-10 items-center justify-center rounded-lg text-xl text-slate-700 hover:bg-slate-100 md:hidden" aria-label="Menu">
            <Icon name={open ? "cross" : "menu-burger"} />
          </button>
        </div>
        <AnimatePresence>
          {open && (
            <motion.nav initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-slate-200 md:hidden">
              <div className="flex flex-col gap-1 p-4">
                {links.map((l) => (
                  <NavLink key={l.to} to={l.to} end={l.end} className={linkCls}>
                    {l.label}
                  </NavLink>
                ))}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1">
        <PageTransition key={loc.pathname}>
          <Outlet />
        </PageTransition>
      </main>

      <footer className="border-t border-slate-200 bg-slate-50 text-slate-600">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-600">Platform pendaftaran dan pengelolaan turnamen Mobile Legends: Bang Bang — dari pendaftaran tim hingga bracket pertandingan.</p>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-bold text-slate-900">Navigasi</h4>
            <ul className="space-y-2 text-sm">
              <li><Link className="hover:text-electric-700" to="/">Daftar Turnamen</Link></li>
              <li><Link className="hover:text-electric-700" to="/status">Cek Status Pendaftaran</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-bold text-slate-900">Kontak Panitia</h4>
            <a href={`https://wa.me/${settings.system.contact_whatsapp}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm hover:text-electric-700">
              <Icon name="phone-call" /> +{settings.system.contact_whatsapp}
            </a>
            <p className="mt-3 text-xs text-slate-500">Data turnamen tersimpan dengan aman.</p>
          </div>
        </div>
        <div className="border-t border-slate-200 py-4 text-center text-xs text-slate-500">© {new Date().getFullYear()} {settings.system.site_name}. Mobile Legends Tournament Management System.</div>
      </footer>
    </div>
  );
}
