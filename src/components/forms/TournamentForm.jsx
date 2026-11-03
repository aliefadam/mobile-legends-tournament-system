import { useState } from "react";
import { Button, DatePicker, Input, RichTextEditor, Select, Switch, TimePicker } from "../ui";
import { TOURNAMENT_STATUS } from "../../constants";
import { buildTournament, emptyTournamentForm, validateTournament } from "../../services/tournament";
import { slugify } from "../../utils/format";

const digits = (v) => v.replace(/\D/g, "");

export function TournamentForm({ initial, existing, tournaments, onSubmit, onCancel, submitLabel = "Simpan" }) {
  const [form, setForm] = useState(initial || emptyTournamentForm());
  const [errors, setErrors] = useState({});
  const [slugTouched, setSlugTouched] = useState(!!existing);
  const [saving, setSaving] = useState(false);

  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors((e) => {
      const n = { ...e };
      Object.keys(patch).forEach((k) => delete n[k]);
      return n;
    });
  };

  const submit = (e) => {
    e.preventDefault();
    const errs = validateTournament(form, tournaments, existing?.id);
    if (Object.keys(errs).length) {
      setErrors(errs);
      setTimeout(() => document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ block: "center", behavior: "smooth" }), 50);
      return;
    }
    setSaving(true);
    setTimeout(() => {
      onSubmit(buildTournament(form, tournaments, existing));
      setSaving(false);
    }, 250);
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2">
        <Input
          wrapperClassName="sm:col-span-2"
          label="Nama Turnamen"
          required
          value={form.name}
          onChange={(e) => set({ name: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })}
          placeholder="Mobile Legends Season 3"
          error={errors.name}
        />
        <DatePicker label="Tanggal Turnamen" required value={form.date} onChange={(v) => set({ date: v })} error={errors.date} />
        <TimePicker label="Jam Mulai Turnamen" value={form.start_time || ""} onChange={(v) => set({ start_time: v })} error={errors.start_time} />
        <Input label="Tempat Turnamen" required value={form.venue} onChange={(e) => set({ venue: e.target.value })} placeholder="Nama venue, mis. Warkop Sippo" error={errors.venue} icon="building" />
        <Input wrapperClassName="sm:col-span-2" label="Lokasi Turnamen" required value={form.location} onChange={(e) => set({ location: e.target.value })} placeholder="Alamat / kota" error={errors.location} icon="marker" />
        <Input
          wrapperClassName="sm:col-span-2"
          label="Link Google Maps (opsional)"
          value={form.google_maps_url || ""}
          onChange={(e) => set({ google_maps_url: e.target.value })}
          placeholder="Tempel link Google Maps lokasi turnamen"
          error={errors.google_maps_url}
          hint="Jika diisi, peta lokasi akan ditampilkan di halaman publik."
        />
        <Input label="Total Prize Pool" required prefix="Rp" inputMode="numeric" value={form.prize_pool} onChange={(e) => set({ prize_pool: digits(e.target.value) })} placeholder="1500000" error={errors.prize_pool} />
        <Input label="Harga Pendaftaran per Slot" required prefix="Rp" inputMode="numeric" value={form.registration_price} onChange={(e) => set({ registration_price: digits(e.target.value) })} placeholder="50000" error={errors.registration_price} />
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <Switch
          checked={form.support_multi_slot}
          onChange={(v) => set({ support_multi_slot: v })}
          label="Support Multi Slot"
          description={form.support_multi_slot ? "Peserta dapat mendaftar maksimal 2 slot dalam satu pendaftaran." : "Peserta hanya dapat mendaftar 1 slot."}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Slug URL"
          required
          value={form.slug}
          onChange={(e) => {
            setSlugTouched(true);
            set({ slug: slugify(e.target.value) });
          }}
          error={errors.slug}
          hint={`Landing page: /tournament/${form.slug || "slug-turnamen"}`}
        />
        <Input label="Kapasitas Maksimum Tim (opsional)" inputMode="numeric" value={form.max_teams} onChange={(e) => set({ max_teams: digits(e.target.value) })} placeholder="Kosongkan bila tidak dibatasi" error={errors.max_teams} />
        <Select
          label="Status Turnamen"
          value={form.status}
          onChange={(v) => set({ status: v })}
          options={TOURNAMENT_STATUS.map((s) => ({ value: s.value, label: s.label }))}
        />
        <div className="flex items-end pb-1">
          <Switch
            className="w-full"
            checked={["registration_open"].includes(form.status) ? true : ["registration_closed", "ongoing", "completed"].includes(form.status) ? false : form.registration_status === "open"}
            disabled={["registration_open", "registration_closed", "ongoing", "completed"].includes(form.status)}
            onChange={(v) => set({ registration_status: v ? "open" : "closed" })}
            label="Pendaftaran Dibuka"
            description={["registration_open", "registration_closed", "ongoing", "completed"].includes(form.status) ? "Mengikuti status turnamen." : "Hanya berlaku saat status Published."}
          />
        </div>
        <RichTextEditor
          wrapperClassName="sm:col-span-2"
          label="Informasi Peraturan"
          value={form.rules}
          onChange={(rules) => set({ rules })}
          placeholder="Tuliskan peraturan turnamen..."
          hint="Gunakan tombol format untuk membuat teks tebal, miring, atau daftar."
        />
      </section>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
        {onCancel && <Button variant="outline" onClick={onCancel}>Batal</Button>}
        <Button type="submit" icon="disk" loading={saving}>{submitLabel}</Button>
      </div>
    </form>
  );
}
