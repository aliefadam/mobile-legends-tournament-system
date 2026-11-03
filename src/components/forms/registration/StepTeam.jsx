import { useEffect, useState } from "react";
import { Card, Icon, Input, RadioGroup } from "../../ui";
import { createSlot, isTeamNameTaken } from "../../../services/registration";
import { formatRupiah } from "../../../utils/format";

export function StepTeam({ form, setForm, errors, clearError, tournament, maxSlot, registrations }) {
  const [nameCheck, setNameCheck] = useState("idle");
  const teamName = form.slots[0]?.team_name || "";
  const price = tournament.registration_price;

  useEffect(() => {
    const name = teamName.trim();
    if (name.length < 3) {
      setNameCheck("idle");
      return undefined;
    }

    setNameCheck("checking");
    const timeout = setTimeout(() => {
      setNameCheck(isTeamNameTaken(name, registrations, tournament.id) ? "taken" : "valid");
    }, 500);
    return () => clearTimeout(timeout);
  }, [teamName, registrations, tournament.id]);

  const setSlots = (n) =>
    setForm((f) => ({
      ...f,
      total_slot: n,
      slots: n > f.slots.length
        ? [...f.slots, ...Array.from({ length: n - f.slots.length }, (_, i) => createSlot(f.slots.length + i, f.slots[0]?.team_name || ""))]
        : f.slots.slice(0, n),
    }));
  const setTeamName = (value) => {
    setForm((f) => ({ ...f, slots: f.slots.map((s) => ({ ...s, team_name: value })) }));
    clearError("s0.team_name");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-navy-900">Informasi Tim</h2>
        <p className="mt-1 text-sm text-slate-500">Isi nama tim, kontak ketua, dan jumlah slot yang ingin didaftarkan.</p>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">Jumlah Slot Pendaftaran</p>
        <RadioGroup
          value={form.total_slot}
          onChange={setSlots}
          options={[
            { value: 1, label: "1 Slot", description: formatRupiah(price), icon: "user" },
            {
              value: 2,
              label: "2 Slot",
              description: maxSlot >= 2 ? formatRupiah(price * 2) : tournament.support_multi_slot ? "Sisa slot turnamen tidak cukup" : "Tidak tersedia pada turnamen ini",
              icon: "users",
              disabled: maxSlot < 2,
            },
          ]}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Input
            label="Nama Tim"
            required
            placeholder="Contoh: Alpha Wolves"
            icon="shield"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            error={errors["s0.team_name"] || (nameCheck === "taken" ? "Nama tim sudah digunakan pada turnamen ini." : undefined)}
            hint="Harap gunakan nama tim yang tidak mengandung unsur SARA atau kata-kata kotor."
            maxLength={40}
          />
          {nameCheck !== "idle" && nameCheck !== "taken" && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-emerald-600" aria-live="polite">
              <Icon name={nameCheck === "checking" ? "spinner" : "check"} className={nameCheck === "checking" ? "animate-spin text-slate-500" : ""} />
              <span className={nameCheck === "checking" ? "text-slate-500" : ""}>{nameCheck === "checking" ? "Mengecek nama tim..." : "Nama tim valid"}</span>
            </p>
          )}
        </div>
        <Input
          label="Nomor WhatsApp Ketua Tim"
          required
          placeholder="081234567890"
          icon="phone-call"
          inputMode="tel"
          value={form.whatsapp}
          onChange={(e) => {
            setForm((f) => ({ ...f, whatsapp: e.target.value.replace(/[^\d+\s-]/g, "") }));
            clearError("whatsapp");
          }}
          error={errors.whatsapp}
          hint="Panitia akan menghubungi nomor ini."
          maxLength={16}
        />
      </div>

      <Card className="flex items-center justify-between gap-4 !border-electric-200 bg-electric-50/60 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-lg text-electric-600 shadow-sm">
            <Icon name="receipt" />
          </span>
          <div>
            <p className="text-xs font-medium text-slate-500">Total Pembayaran</p>
            <p className="text-xs text-slate-400">{form.total_slot} slot × {formatRupiah(price)}</p>
          </div>
        </div>
        <p className="text-2xl font-extrabold text-electric-700">{formatRupiah(price * form.total_slot)}</p>
      </Card>
    </div>
  );
}
