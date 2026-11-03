import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Button, Card, Icon, Stepper } from "../../components/ui";
import { StepTeam } from "../../components/forms/registration/StepTeam";
import { StepPlayers } from "../../components/forms/registration/StepPlayers";
import { StepPayment, paymentMethodsFrom } from "../../components/forms/registration/StepPayment";
import { StepReview } from "../../components/forms/registration/StepReview";
import { TournamentMap } from "../../components/tournament/TournamentMap";
import NotFound from "./NotFound";
import { useData } from "../../contexts/DataContext";
import { useToast } from "../../contexts/ToastContext";
import { REGISTRATION_STEPS } from "../../constants";
import { isPublic, maxSlotFor, registrationBlockReason } from "../../services/tournament";
import { buildRegistration, collectExistingKeys, createEmptyForm, validatePaymentStep, validatePlayersStep, validateTeamStep } from "../../services/registration";

export default function Registration() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { tournaments, registrations, payments, settings, addRegistration } = useData();
  const [form, setForm] = useState(createEmptyForm);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const submitted = useRef(false);
  const topRef = useRef(null);

  const t = tournaments.find((x) => x.slug === slug);
  const { methods } = paymentMethodsFrom(settings);

  useEffect(() => {
    setForm((current) => {
      if (methods.length === 1 && current.method !== methods[0]) return { ...current, method: methods[0] };
      if (current.method && !methods.includes(current.method)) return { ...current, method: "" };
      return current;
    });
  }, [methods.join(",")]);

  if (!t || !isPublic(t)) return <NotFound title="Turnamen tidak ditemukan" />;

  const block = registrationBlockReason(t, registrations);
  const maxSlot = maxSlotFor(t, registrations);
  const clearError = (k) => setErrors((e) => (k in e ? Object.fromEntries(Object.entries(e).filter(([x]) => x !== k)) : e));

  if (block && !submitted.current)
    return (
      <div className="mx-auto max-w-xl px-4 py-20">
        <Card className="p-8 text-center">
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-3xl text-amber-500">
            <Icon name="lock" />
          </span>
          <h1 className="text-xl font-extrabold text-navy-900">Pendaftaran Tidak Tersedia</h1>
          <p className="mt-2 text-sm text-slate-600">{block}</p>
          <Button className="mt-6" to={`/tournament/${t.slug}`} icon="arrow-left">Kembali ke Halaman Turnamen</Button>
        </Card>
      </div>
    );

  const validate = (s) => {
    if (s === 0) {
      const e = validateTeamStep(form, { registrations, tournamentId: t.id });
      if (form.total_slot > maxSlot) e.total_slot = "Jumlah slot melebihi batas yang tersedia.";
      return e;
    }
    if (s === 1) return validatePlayersStep(form, { existingKeys: collectExistingKeys(registrations, t.id) });
    if (s === 2) return validatePaymentStep({ ...form, method: methods.length === 1 ? methods[0] : form.method }, methods);
    return form.agreed ? {} : { agreed: "Anda harus menyetujui pernyataan ini." };
  };

  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const go = (to) => {
    setDir(to > step ? 1 : -1);
    setStep(to);
    setTimeout(scrollTop, 50);
  };

  const next = () => {
    const e = validate(step);
    if (Object.keys(e).length) {
      setErrors(e);
      toast.error(e.total_slot || "Periksa kembali isian Anda. Ada data yang belum lengkap atau tidak valid.", "Data belum lengkap");
      setTimeout(() => document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
      return;
    }
    setErrors({});
    go(step + 1);
  };

  const submit = async () => {
    if (submitted.current || submitting) return;
    for (let s = 0; s < 4; s++) {
      const e = validate(s);
      if (Object.keys(e).length) {
        setErrors(e);
        toast.error("Data pendaftaran belum valid. Silakan periksa kembali.");
        go(s);
        return;
      }
    }
    const reason = registrationBlockReason(t, registrations);
    if (reason) return toast.error(reason);
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));
    try {
      const paymentForm = methods.length === 1 ? { ...form, method: methods[0] } : form;
      const { registration, payment } = buildRegistration({ form: paymentForm, tournament: t, registrations, payments });
      if (registrations.some((r) => r.id === registration.id)) throw new Error("Registration ID duplikat");
      submitted.current = true;
      addRegistration(registration, payment);
      toast.success("Pendaftaran berhasil dikirim!");
      navigate(`/tournament/${t.slug}/register/success/${registration.id}`, { replace: true });
    } catch (err) {
      setSubmitting(false);
      toast.error(err.message || "Gagal menyimpan pendaftaran.");
    }
  };

  const common = { form, setForm, errors, clearError, tournament: t };
  const variants = {
    enter: (d) => ({ opacity: 0, x: d * 40 }),
    center: { opacity: 1, x: 0 },
    exit: (d) => ({ opacity: 0, x: d * -40 }),
  };

  return (
    <div className="bg-[#f4f6fb]">
      <div className="bg-gradient-to-br from-electric-50 via-white to-accent-50 pb-24 pt-8 sm:pb-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <Link to={`/tournament/${t.slug}`} className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-electric-700">
            <Icon name="arrow-left" /> {t.name}
          </Link>
          <h1 className="mt-3 text-2xl font-extrabold text-navy-900 sm:text-3xl">Pendaftaran Turnamen</h1>
          <div className="mt-4">
            <TournamentMap tournament={t} showMap={false} />
          </div>
        </div>
      </div>
      <div ref={topRef} className="mx-auto -mt-16 max-w-4xl scroll-mt-20 px-4 pb-16 sm:px-6">
        <Card className="mb-4 p-5 sm:p-6">
          <Stepper steps={REGISTRATION_STEPS} current={step} onStepClick={go} />
          <p className="mt-3 text-center text-xs font-semibold text-slate-500 sm:hidden">
            Langkah {step + 1} dari 4 — {REGISTRATION_STEPS[step].label}
          </p>
        </Card>
        <Card className="overflow-hidden p-5 sm:p-8">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div key={step} custom={dir} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22 }}>
              {step === 0 && <StepTeam {...common} maxSlot={maxSlot} registrations={registrations} />}
              {step === 1 && <StepPlayers {...common} settings={settings} />}
              {step === 2 && <StepPayment {...common} settings={settings} />}
              {step === 3 && <StepReview {...common} goToStep={go} />}
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
            <Button variant="outline" icon="arrow-left" disabled={step === 0 || submitting} onClick={() => go(step - 1)}>
              Kembali
            </Button>
            {step < 3 ? (
              <Button iconRight="arrow-right" onClick={next}>Lanjutkan</Button>
            ) : (
              <Button variant="success" icon="check" loading={submitting} onClick={submit}>
                Konfirmasi Pendaftaran
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
