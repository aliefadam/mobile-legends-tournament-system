import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button, Checkbox, Icon, Input } from "../../components/ui";
import { Logo } from "../../components/layout/PageTransition";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";

export default function Login() {
  const { authed, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const loc = useLocation();
  const [form, setForm] = useState({ username: "", password: "", remember: true });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (authed) return <Navigate to={loc.state?.from || "/admin"} replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password) return setError("Username dan password wajib diisi.");
    setLoading(true);
    const res = await login(form.username, form.password, form.remember);
    setLoading(false);
    if (!res.ok) return setError(res.error);
    toast.success("Selamat datang kembali!");
    navigate(loc.state?.from || "/admin", { replace: true });
  };

  return (
    <div className="hero-grid relative flex min-h-screen items-center justify-center overflow-hidden bg-electric-50 p-4">
      <div className="absolute -left-20 top-0 h-80 w-80 rounded-full bg-electric-300/25 blur-3xl" />
      <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-accent-300/25 blur-3xl" />
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo brand="Turnamen WS" accent="WS" />
        </div>
        <form onSubmit={submit} className="rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
          <h1 className="text-2xl font-extrabold text-navy-900">Login Admin</h1>
          <p className="mt-1 text-sm text-slate-500">Masuk untuk mengelola turnamen.</p>
          <div className="mt-6 space-y-4">
            <Input label="Username" icon="user" autoComplete="username" value={form.username} onChange={(e) => { setForm({ ...form, username: e.target.value }); setError(""); }} />
            <Input
              label="Password"
              icon="lock"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => { setForm({ ...form, password: e.target.value }); setError(""); }}
              placeholder="••••••••"
              suffix={
                <button type="button" onClick={() => setShow((s) => !s)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={show ? "Sembunyikan password" : "Tampilkan password"}>
                  <Icon name={show ? "eye-crossed" : "eye"} />
                </button>
              }
            />
            <Checkbox checked={form.remember} onChange={(v) => setForm({ ...form, remember: v })} label="Ingat sesi saya (7 hari)" />
            {error && (
              <p className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
                <Icon name="exclamation" /> {error}
              </p>
            )}
            <Button type="submit" full size="lg" loading={loading} icon="sign-in-alt">Masuk</Button>
          </div>
        </form>
        <Link to="/" className="mt-5 flex items-center justify-center gap-2 text-sm font-medium text-slate-600 hover:text-electric-700">
          <Icon name="arrow-left" /> Kembali ke website
        </Link>
      </motion.div>
    </div>
  );
}
