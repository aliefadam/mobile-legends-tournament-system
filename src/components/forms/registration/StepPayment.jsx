import { Button, Card, FileUpload, Icon, RadioGroup } from "../../ui";
import { useToast } from "../../../contexts/ToastContext";
import { copyText, formatRupiah } from "../../../utils/format";

export function paymentMethodsFrom(settings) {
  const banks = settings.payment.banks.filter((b) => b.active);
  const qris = settings.payment.qris;
  const methods = [];
  if (banks.length) methods.push("bank");
  if (qris.active && qris.image) methods.push("qris");
  return { methods, banks, qris };
}

export function StepPayment({ form, setForm, errors, clearError, tournament, settings }) {
  const toast = useToast();
  const { methods, banks, qris } = paymentMethodsFrom(settings);
  const total = tournament.registration_price * form.slots.length;

  const copy = async (text) => {
    (await copyText(text)) ? toast.success("Nomor rekening disalin.") : toast.error("Gagal menyalin.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-navy-900">Pembayaran</h2>
        <p className="mt-1 text-sm text-slate-500">Lakukan pembayaran sesuai nominal, lalu unggah bukti pembayaran.</p>
      </div>

      <Card className="flex items-center justify-between gap-4 !border-electric-200 bg-gradient-to-r from-electric-50 to-accent-50 p-5">
        <div>
          <p className="text-sm font-medium text-slate-600">Total yang harus dibayar</p>
          <p className="text-xs text-slate-500">{form.slots.length} slot × {formatRupiah(tournament.registration_price)}</p>
        </div>
        <p className="text-2xl font-extrabold text-navy-900 sm:text-3xl">{formatRupiah(total)}</p>
      </Card>

      {methods.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
          <Icon name="exclamation" className="mr-2" /> Metode pembayaran belum dikonfigurasi oleh panitia. Silakan hubungi panitia.
        </div>
      ) : methods.length > 1 ? (
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-700">Metode Pembayaran</p>
          <RadioGroup
            value={form.method}
            onChange={(v) => {
              setForm((f) => ({ ...f, method: v }));
              clearError("method");
            }}
            options={methods.map((method) => method === "bank"
              ? { value: "bank", label: "Transfer Bank", description: "Transfer ke rekening panitia", icon: "bank" }
              : { value: "qris", label: "QRIS", description: "Scan dengan e-wallet / m-banking", icon: "qrcode" })}
          />
          {errors.method && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.method}</p>}
        </div>
      ) : null}

      {form.method === "bank" && (
        <div className="grid gap-3">
          {banks.map((b) => (
            <div key={b.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-electric-50 text-lg text-electric-600">
                  <Icon name="bank" />
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900">{b.bank_name}</p>
                  <p className="text-lg font-extrabold tracking-wider text-electric-700">{b.account_number}</p>
                  <p className="text-xs text-slate-500">a.n. {b.account_name}</p>
                </div>
              </div>
              <Button size="sm" variant="soft" icon="copy" onClick={() => copy(b.account_number)}>
                Salin No. Rekening
              </Button>
            </div>
          ))}
        </div>
      )}

      {form.method === "qris" && qris.image && (
        <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-white p-5">
          {qris.name && <p className="mb-3 text-sm font-bold text-slate-900">{qris.name}</p>}
          <img src={qris.image} alt="QRIS" className="h-64 w-64 rounded-xl border border-slate-100 object-contain" />
          <p className="mt-3 text-sm font-medium text-slate-600">Scan QRIS lalu bayar sebesar <b className="text-slate-900">{formatRupiah(total)}</b></p>
        </div>
      )}

      <FileUpload
        label="Bukti Pembayaran"
        required
        value={form.proof}
        onChange={(v) => {
          setForm((f) => ({ ...f, proof: v }));
          clearError("proof");
        }}
        error={errors.proof}
        onReject={(m) => toast.error(m)}
        hint={form.slots.length > 1 ? "Satu bukti pembayaran berlaku untuk seluruh slot dalam transaksi ini." : undefined}
      />
    </div>
  );
}
