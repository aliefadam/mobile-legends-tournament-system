import { useRef, useState } from "react";
import { Badge, Button, Card, CardHeader, ConfirmDialog, EmptyState, FileUpload, Icon, Input, Modal, Select, Switch, Tabs } from "../../components/ui";
import { useData } from "../../contexts/DataContext";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { storage } from "../../services/storage";
import { DEFAULT_MLBB_API } from "../../services/mlbb";
import { downloadFile, formatBytes, uid } from "../../utils/format";

/* ---------------- Pembayaran ---------------- */
function BankModal({ bank, onClose, onSave }) {
  const [f, setF] = useState(bank?.id ? bank : { bank_name: "", account_number: "", account_name: "", active: true });
  const [e, setE] = useState({});
  const submit = () => {
    const err = {};
    if (!f.bank_name.trim()) err.bank_name = "Nama bank wajib diisi.";
    if (!/^\d{5,25}$/.test(f.account_number.trim())) err.account_number = "Nomor rekening harus 5–25 digit angka.";
    if (!f.account_name.trim()) err.account_name = "Nama pemilik wajib diisi.";
    setE(err);
    if (Object.keys(err).length) return;
    onSave({ ...f, id: f.id || uid("bank"), bank_name: f.bank_name.trim(), account_number: f.account_number.trim(), account_name: f.account_name.trim() });
  };
  return (
    <Modal open onClose={onClose} title={bank?.id ? "Edit Rekening" : "Tambah Rekening"} footer={<><Button variant="outline" onClick={onClose}>Batal</Button><Button icon="disk" onClick={submit}>Simpan</Button></>}>
      <div className="space-y-4">
        <Input label="Nama Bank" required value={f.bank_name} onChange={(ev) => setF({ ...f, bank_name: ev.target.value })} error={e.bank_name} placeholder="BCA / BRI / Mandiri" />
        <Input label="Nomor Rekening" required inputMode="numeric" value={f.account_number} onChange={(ev) => setF({ ...f, account_number: ev.target.value.replace(/\D/g, "") })} error={e.account_number} />
        <Input label="Nama Pemilik Rekening" required value={f.account_name} onChange={(ev) => setF({ ...f, account_name: ev.target.value })} error={e.account_name} />
        <Switch checked={f.active} onChange={(v) => setF({ ...f, active: v })} label="Status Aktif" description="Rekening aktif akan ditampilkan kepada peserta." />
      </div>
    </Modal>
  );
}

function PaymentSettings() {
  const { settings, updateSettings } = useData();
  const toast = useToast();
  const [bankModal, setBankModal] = useState(null);
  const [delBank, setDelBank] = useState(null);
  const [delQris, setDelQris] = useState(false);
  const { banks, qris } = settings.payment;

  const saveBank = (b) => {
    updateSettings((s) => ({ ...s, payment: { ...s.payment, banks: s.payment.banks.some((x) => x.id === b.id) ? s.payment.banks.map((x) => (x.id === b.id ? b : x)) : [...s.payment.banks, b] } }));
    setBankModal(null);
    toast.success("Rekening disimpan.");
  };
  const setQ = (patch) => updateSettings((s) => ({ ...s, payment: { ...s.payment, qris: { ...s.payment.qris, ...patch } } }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader title="Rekening Bank" description="Metode transfer bank" action={<Button size="sm" icon="plus" onClick={() => setBankModal({})}>Tambah</Button>} />
        {banks.length === 0 ? (
          <EmptyState icon="bank" title="Belum ada rekening" description="Tambahkan rekening untuk menerima transfer." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {banks.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-3 p-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-electric-50 text-lg text-electric-600"><Icon name="bank" /></span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-bold text-slate-900">{b.bank_name} <Badge tone={b.active ? "success" : "neutral"}>{b.active ? "Aktif" : "Nonaktif"}</Badge></p>
                  <p className="font-semibold tracking-wide text-electric-700">{b.account_number}</p>
                  <p className="text-xs text-slate-500">a.n. {b.account_name}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Switch checked={b.active} onChange={(v) => saveBank({ ...b, active: v })} />
                  <Button variant="ghost" size="icon" icon="pencil" onClick={() => setBankModal(b)} aria-label="Edit" />
                  <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50 hover:text-red-600" icon="trash" onClick={() => setDelBank(b)} aria-label="Hapus" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="QRIS" description="Gambar QRIS yang dapat di-scan peserta" action={<Switch checked={qris.active} onChange={(v) => setQ({ active: v })} disabled={!qris.image} />} />
        <div className="space-y-4 p-5">
          <Input label="Nama QRIS" value={qris.name} onChange={(ev) => setQ({ name: ev.target.value })} placeholder="Contoh: QRIS Warkop Sippo" hint="Nama ini akan ditampilkan kepada peserta saat memilih pembayaran QRIS." />
          {qris.image ? (
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <img src={qris.image} alt="QRIS" className="h-44 w-44 rounded-xl border border-slate-200 bg-white object-contain" />
              <div className="space-y-2 text-sm">
                <Badge tone={qris.active ? "success" : "neutral"}>{qris.active ? "QRIS aktif" : "QRIS nonaktif"}</Badge>
                <p className="text-slate-500">Ganti gambar dengan mengunggah file baru di bawah.</p>
                <Button size="sm" variant="danger-soft" icon="trash" onClick={() => setDelQris(true)}>Hapus QRIS</Button>
              </div>
            </div>
          ) : (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Belum ada gambar QRIS.</p>
          )}
          <FileUpload
            label={qris.image ? "Ubah Gambar QRIS" : "Upload Gambar QRIS"}
            value={null}
            compress={{ maxDim: 900, quality: 0.92 }}
            onChange={(v) => { if (v) { setQ({ image: v.dataUrl, active: true }); toast.success("Gambar QRIS diperbarui."); } }}
            onReject={(m) => toast.error(m)}
          />
        </div>
      </Card>

      {bankModal && <BankModal bank={bankModal} onClose={() => setBankModal(null)} onSave={saveBank} />}
      <ConfirmDialog open={!!delBank} onClose={() => setDelBank(null)} title="Hapus rekening?" message={delBank ? `${delBank.bank_name} ${delBank.account_number} akan dihapus.` : ""} confirmLabel="Hapus" onConfirm={() => { updateSettings((s) => ({ ...s, payment: { ...s.payment, banks: s.payment.banks.filter((x) => x.id !== delBank.id) } })); setDelBank(null); toast.success("Rekening dihapus."); }} />
      <ConfirmDialog open={delQris} onClose={() => setDelQris(false)} title="Hapus QRIS?" message="Gambar QRIS akan dihapus dan metode QRIS dinonaktifkan." confirmLabel="Hapus" onConfirm={() => { setQ({ image: null, active: false }); setDelQris(false); toast.success("QRIS dihapus."); }} />
    </div>
  );
}

/* ---------------- Sistem ---------------- */
function SystemSettings() {
  const { settings, updateSettings } = useData();
  const toast = useToast();
  const [f, setF] = useState(settings.system);
  const [e, setE] = useState({});
  const save = () => {
    const err = {};
    if (!f.site_name.trim()) err.site_name = "Wajib diisi.";
    if (!/^\d{8,16}$/.test(String(f.contact_whatsapp).trim())) err.contact_whatsapp = "Gunakan format internasional tanpa +, mis. 6281234567890.";
    if (!f.mlbb_api_url.includes("{id}") || !(f.mlbb_api_url.includes("{zone}") || f.mlbb_api_url.includes("{server}"))) err.mlbb_api_url = "URL harus memuat placeholder {id} dan {zone}.";
    setE(err);
    if (Object.keys(err).length) return;
    updateSettings((s) => ({ ...s, system: { ...f } }));
    toast.success("Pengaturan sistem disimpan.");
  };
  return (
    <Card className="max-w-2xl">
      <CardHeader title="Pengaturan Sistem" />
      <div className="space-y-5 p-5">
        <Input label="Nama Situs" value={f.site_name} onChange={(ev) => setF({ ...f, site_name: ev.target.value })} error={e.site_name} />
        <Input label="WhatsApp Panitia" value={f.contact_whatsapp} onChange={(ev) => setF({ ...f, contact_whatsapp: ev.target.value.replace(/\D/g, "") })} error={e.contact_whatsapp} />
        <Input label="Endpoint Lookup Nickname MLBB" value={f.mlbb_api_url} onChange={(ev) => setF({ ...f, mlbb_api_url: ev.target.value })} error={e.mlbb_api_url} hint="Gunakan placeholder {id} dan {zone}. Respons JSON harus memuat name / nickname / username. Jangan memasukkan API secret di sini." />
        <Button size="xs" variant="ghost" icon="undo" onClick={() => setF({ ...f, mlbb_api_url: DEFAULT_MLBB_API })}>Kembalikan endpoint default</Button>
        <Button icon="disk" onClick={save}>Simpan Pengaturan</Button>
      </div>
    </Card>
  );
}

/* ---------------- Akun ---------------- */
function AccountSettings() {
  const { username, changeCredentials } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ currentPassword: "", username, password: "", confirm: "" });
  const [e, setE] = useState({});
  const save = () => {
    const err = {};
    if (!f.currentPassword) err.currentPassword = "Password saat ini wajib diisi.";
    if (!f.username.trim()) err.username = "Username wajib diisi.";
    if (f.password && f.password.length < 6) err.password = "Password baru minimal 6 karakter.";
    if (f.password !== f.confirm) err.confirm = "Konfirmasi password tidak sama.";
    setE(err);
    if (Object.keys(err).length) return;
    const res = changeCredentials({ currentPassword: f.currentPassword, username: f.username.trim(), password: f.password });
    if (!res.ok) return setE({ currentPassword: res.error });
    toast.success("Kredensial admin diperbarui.");
    setF({ ...f, currentPassword: "", password: "", confirm: "" });
  };
  return (
    <Card className="max-w-xl">
      <CardHeader title="Akun Admin" description="Password disimpan sebagai hash (simulasi lokal, bukan keamanan nyata)." />
      <div className="space-y-4 p-5">
        <Input label="Username" value={f.username} onChange={(ev) => setF({ ...f, username: ev.target.value })} error={e.username} />
        <Input label="Password Saat Ini" type="password" value={f.currentPassword} onChange={(ev) => setF({ ...f, currentPassword: ev.target.value })} error={e.currentPassword} />
        <Input label="Password Baru" type="password" value={f.password} onChange={(ev) => setF({ ...f, password: ev.target.value })} error={e.password} hint="Kosongkan bila tidak ingin mengubah password." />
        <Input label="Konfirmasi Password Baru" type="password" value={f.confirm} onChange={(ev) => setF({ ...f, confirm: ev.target.value })} error={e.confirm} />
        <Button icon="disk" onClick={save}>Simpan Akun</Button>
      </div>
    </Card>
  );
}

/* ---------------- Data ---------------- */
function DataSettings() {
  const { tournaments, registrations, payments, brackets, matches, importData, resetData } = useData();
  const toast = useToast();
  const fileRef = useRef(null);
  const [pending, setPending] = useState(null);
  const [resetStep, setResetStep] = useState(0);
  const [mode, setMode] = useState("demo");
  const used = storage.usage();

  const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  const exportAll = (prefix) => {
    downloadFile(`${prefix}-${stamp()}.json`, JSON.stringify(storage.snapshot(), null, 2));
    toast.success(prefix === "tms-backup" ? "Backup berhasil diunduh." : "Data berhasil diekspor.");
  };

  const onFile = async (ev) => {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".json")) return toast.error("File harus berformat .json");
    try {
      const snap = JSON.parse(await file.text());
      const err = storage.validateSnapshot(snap);
      if (err) return toast.error(err);
      setPending({ snap, name: file.name });
    } catch {
      toast.error("File JSON tidak dapat dibaca.");
    }
  };

  const counts = [
    ["Turnamen", tournaments.length], ["Pendaftaran", registrations.length], ["Pembayaran", payments.length], ["Bracket", brackets.length], ["Pertandingan", matches.length],
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader title="Penyimpanan LocalStorage" description="Seluruh data tersimpan di browser ini." />
        <div className="p-5">
          <div className="mb-1.5 flex justify-between text-sm"><span className="text-slate-500">Terpakai (perkiraan)</span><b>{formatBytes(used)} / ~5 MB</b></div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-electric-500 to-accent-500" style={{ width: `${Math.min(100, (used / (5 * 1024 * 1024)) * 100)}%` }} /></div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {counts.map(([k, v]) => (
              <div key={k} className="rounded-xl bg-slate-50 p-3 text-center"><p className="text-xl font-extrabold text-navy-900">{v}</p><p className="text-xs text-slate-500">{k}</p></div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Backup & Export" description="Unduh seluruh data sebagai file JSON." />
        <div className="flex flex-wrap gap-3 p-5">
          <Button icon="download" onClick={() => exportAll("tms-backup")}>Backup Data</Button>
          <Button variant="outline" icon="file-export" onClick={() => exportAll("tms-export")}>Export JSON</Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Restore & Import" description="Pulihkan data dari file backup / export JSON. Data saat ini akan diganti." />
        <div className="p-5">
          <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={onFile} />
          <Button variant="outline" icon="file-import" onClick={() => fileRef.current?.click()}>Pilih File JSON</Button>
        </div>
      </Card>

      <Card className="!border-red-200">
        <CardHeader title="Zona Bahaya" description="Reset seluruh data aplikasi." />
        <div className="space-y-4 p-5">
          <Select label="Mode Reset" value={mode} onChange={setMode} options={[{ value: "demo", label: "Kembalikan ke data demo" }, { value: "empty", label: "Kosongkan semua data" }]} />
          <Button variant="danger" icon="trash" onClick={() => setResetStep(1)}>Reset Data</Button>
        </div>
      </Card>

      <ConfirmDialog open={!!pending} onClose={() => setPending(null)} tone="warning" title="Restore data?" message={pending ? `Seluruh data saat ini akan diganti dengan isi file "${pending.name}" (${pending.snap.data.tms_tournaments?.length || 0} turnamen).` : ""} confirmLabel="Ya, Restore" acknowledge="Saya sudah membuat backup data saat ini." onConfirm={() => {
        const res = importData(pending.snap);
        setPending(null);
        res.ok ? toast.success("Data berhasil dipulihkan.") : toast.error(res.error);
      }} />
      <ConfirmDialog open={resetStep === 1} onClose={() => setResetStep(0)} tone="warning" title="Reset seluruh data?" message="Semua turnamen, pendaftaran, pembayaran, dan bracket akan dihapus. Anda akan diminta konfirmasi sekali lagi." confirmLabel="Lanjutkan" onConfirm={() => setResetStep(2)} />
      <ConfirmDialog open={resetStep === 2} onClose={() => setResetStep(0)} title="Konfirmasi terakhir" message="Tindakan ini permanen dan tidak dapat dibatalkan." requireText="RESET" acknowledge="Saya mengerti semua data akan hilang." confirmLabel="Reset Sekarang" onConfirm={() => { resetData(mode); setResetStep(0); toast.success(mode === "demo" ? "Data dikembalikan ke demo." : "Seluruh data dikosongkan."); }} />
    </div>
  );
}

export default function Settings() {
  const [tab, setTab] = useState("payment");
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Pengaturan</h2>
        <p className="text-sm text-slate-500">Rekening & QRIS, sistem, akun admin, dan manajemen data.</p>
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "payment", label: "Pembayaran", icon: "wallet" },
          { value: "system", label: "Sistem", icon: "settings" },
          { value: "account", label: "Akun", icon: "user" },
          { value: "data", label: "Data", icon: "database" },
        ]}
      />
      {tab === "payment" && <PaymentSettings />}
      {tab === "system" && <SystemSettings />}
      {tab === "account" && <AccountSettings />}
      {tab === "data" && <DataSettings />}
    </div>
  );
}
