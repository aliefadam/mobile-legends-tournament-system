import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button, EmptyState, Icon, Skeleton } from "../../components/ui";
import { TournamentCard } from "../../components/tournament/TournamentCard";
import { useData } from "../../contexts/DataContext";
import { getPublicStatus, isPublic } from "../../services/tournament";

function Section({ title, subtitle, icon, items, loading }) {
  if (!loading && items.length === 0) return null;
  return (
    <section className="mb-14">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-electric-50 text-lg text-electric-600">
          <Icon name={icon} />
        </span>
        <div>
          <h2 className="text-xl font-extrabold text-navy-900 sm:text-2xl">{title}</h2>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-2xl" />)
          : items.map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
                <TournamentCard tournament={t} />
              </motion.div>
            ))}
      </div>
    </section>
  );
}

export default function Home() {
  const { tournaments } = useData();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(t);
  }, []);

  const list = useMemo(() => tournaments.filter(isPublic), [tournaments]);
  const byStatus = (keys) => list.filter((t) => keys.includes(getPublicStatus(t))).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const active = byStatus(["registration_open", "ongoing"]);
  const upcoming = byStatus(["upcoming", "registration_closed"]);
  const completed = byStatus(["completed"]).reverse();

  return (
    <div>
      <section className="hero-grid relative overflow-hidden bg-electric-50">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-electric-300/25 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-accent-300/25 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-electric-200 bg-white/80 px-4 py-1.5 text-xs font-semibold text-electric-800 shadow-sm backdrop-blur">
              <Icon name="bolt" solid className="text-amber-500" /> Mobile Legends: Bang Bang Tournament Platform
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-navy-900 sm:text-6xl">
              Daftarkan tim.<br />
              <span className="bg-gradient-to-r from-electric-600 to-accent-600 bg-clip-text text-transparent">Rebut gelar juara.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Daftar turnamen Mobile Legends secara online, verifikasi ID pemain otomatis, upload bukti pembayaran, dan pantau bracket pertandingan secara langsung.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button size="lg" variant="primary" icon="trophy" onClick={() => document.getElementById("tournaments")?.scrollIntoView({ behavior: "smooth" })}>
                Lihat Turnamen
              </Button>
              <Button size="lg" variant="outline" to="/status" icon="search">
                Cek Status Pendaftaran
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <div id="tournaments" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-14 sm:px-6">
        <Section title="Turnamen Aktif" subtitle="Pendaftaran dibuka & sedang berlangsung" icon="bolt" items={active} loading={loading} />
        <Section title="Akan Datang" subtitle="Segera hadir — siapkan tim Anda" icon="calendar" items={upcoming} loading={loading} />
        <Section title="Turnamen Selesai" subtitle="Arsip turnamen sebelumnya" icon="flag" items={completed} loading={loading} />
        {!loading && list.length === 0 && <EmptyState icon="trophy" title="Belum ada turnamen" description="Turnamen yang dipublikasikan admin akan tampil di sini." />}
      </div>
    </div>
  );
}
