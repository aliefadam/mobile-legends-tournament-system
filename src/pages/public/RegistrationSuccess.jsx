import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button, Card, Icon } from "../../components/ui";
import { PaymentBadge } from "../../components/shared/Badges";
import NotFound from "./NotFound";
import { useData } from "../../contexts/DataContext";
import { useToast } from "../../contexts/ToastContext";
import { copyText, formatDateTime, formatRupiah } from "../../utils/format";
import { registrationTeamLabel } from "../../services/registration";

function wrapCanvasText(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  words.forEach((word) => {
    if (ctx.measureText(word).width > maxWidth) {
      if (line) {
        lines.push(line);
        line = "";
      }
      let part = "";
      for (const char of word) {
        if (ctx.measureText(part + char).width > maxWidth && part) {
          lines.push(part);
          part = char;
        } else part += char;
      }
      line = part;
      return;
    }
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = candidate;
  });
  if (line) lines.push(line);
  return lines;
}

async function drawRegistrationReceipt(registration, tournament) {
  await document.fonts.load('400 28px "Plus Jakarta Sans"');
  await document.fonts.load('700 28px "Plus Jakarta Sans"');
  await document.fonts.ready;

  const width = 1080;
  const padding = 72;
  const lineHeight = 42;
  const labelWidth = 300;
  const valueWidth = width - padding * 2 - labelWidth - 44;
  const font = '"Plus Jakarta Sans", sans-serif';
  const rows = [
    ["Nama Tim", registrationTeamLabel(registration)],
    ["Turnamen", tournament.name],
    ["Jumlah Slot", `${registration.total_slot} slot`],
    ["Total Pembayaran", formatRupiah(registration.total_payment)],
    ["Tanggal & Jam Pendaftaran", formatDateTime(registration.created_at)],
    ["Status Pembayaran", registration.payment_status === "approved" ? "Terverifikasi" : registration.payment_status === "rejected" ? "Ditolak" : "Menunggu Verifikasi"],
  ];
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak dapat membuat gambar bukti pendaftaran.");

  ctx.font = `600 27px ${font}`;
  const preparedRows = rows.map(([label, value]) => {
    const labelLines = wrapCanvasText(ctx, label, labelWidth);
    const valueLines = wrapCanvasText(ctx, value, valueWidth);
    return {
      labelLines,
      valueLines,
      height: Math.max(labelLines.length, valueLines.length) * lineHeight + 44,
    };
  });
  const headerHeight = 300;
  const cardTop = 248;
  const idSectionHeight = 210;
  canvas.width = width;
  canvas.height = headerHeight + idSectionHeight + preparedRows.reduce((sum, row) => sum + row.height, 0) + 100;

  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#059669";
  ctx.fillRect(0, 0, canvas.width, headerHeight);
  ctx.fillStyle = "#047857";
  ctx.fillRect(0, headerHeight - 10, canvas.width, 10);
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 24px ${font}`;
  ctx.fillText("TURNAMEN WARKOP SIPPO", padding, 74);
  ctx.font = `800 46px ${font}`;
  ctx.fillText("Pendaftaran Berhasil", padding, 148);
  ctx.font = `400 25px ${font}`;
  ctx.fillText("Simpan bukti ini dan kirimkan kepada panitia untuk konfirmasi.", padding, 198);

  const cardY = cardTop;
  const cardHeight = canvas.height - cardY - 40;
  ctx.shadowColor = "rgba(15, 23, 42, 0.10)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(40, cardY, width - 80, cardHeight, 28);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  let y = cardY + 62;
  ctx.fillStyle = "#64748b";
  ctx.font = `700 18px ${font}`;
  ctx.fillText("REGISTRATION ID", padding, y);
  y += 58;
  ctx.fillStyle = "#0f172a";
  ctx.font = `800 42px ${font}`;
  ctx.fillText(registration.id, padding, y);
  y += 38;
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, y);
  ctx.lineTo(width - padding, y);
  ctx.stroke();
  y += 24;

  preparedRows.forEach((row, index) => {
    const top = y;
    ctx.fillStyle = "#64748b";
    ctx.font = `500 23px ${font}`;
    row.labelLines.forEach((line, lineIndex) => ctx.fillText(line, padding, top + 25 + lineIndex * lineHeight));
    ctx.fillStyle = "#0f172a";
    ctx.font = `700 26px ${font}`;
    row.valueLines.forEach((line, lineIndex) => ctx.fillText(line, padding + labelWidth + 44, top + 25 + lineIndex * lineHeight));
    y += row.height;
    if (index !== preparedRows.length - 1) {
      ctx.strokeStyle = "#e2e8f0";
      ctx.beginPath();
      ctx.moveTo(padding, y - 1);
      ctx.lineTo(width - padding, y - 1);
      ctx.stroke();
    }
  });

  return canvas;
}

export default function RegistrationSuccess() {
  const { slug, regId } = useParams();
  const { registrations, tournaments } = useData();
  const toast = useToast();
  const reg = registrations.find((r) => r.id === regId);
  const t = tournaments.find((x) => x.slug === slug);
  if (!reg || !t || reg.tournament_id !== t.id) return <NotFound title="Pendaftaran tidak ditemukan" />;

  const copy = async () => ((await copyText(reg.id)) ? toast.success("Registration ID disalin.") : toast.error("Gagal menyalin."));
  const downloadReceipt = async () => {
    try {
      const canvas = await drawRegistrationReceipt(reg, t);
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error("Gagal membuat gambar bukti pendaftaran.");
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `bukti-pendaftaran-${reg.id}.png`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast.success("Gambar bukti pendaftaran berhasil diunduh.");
      }, "image/png");
    } catch (error) {
      toast.error(error.message || "Gagal mengunduh bukti pendaftaran.");
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:py-16">
      <Card className="overflow-hidden text-center">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 px-6 pb-10 pt-10 text-white">
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }} className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white text-4xl text-emerald-500 shadow-xl">
            <Icon name="check" />
          </motion.span>
          <h1 className="mt-5 text-2xl font-extrabold">Pendaftaran Berhasil!</h1>
          <p className="mt-1 text-sm text-emerald-50">Data Anda telah kami terima dan menunggu verifikasi pembayaran.</p>
        </div>
        <div className="-mt-6 px-5 pb-6 sm:px-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg shadow-navy-900/5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Registration ID</p>
            <p className="mt-1 text-3xl font-extrabold tracking-wider text-navy-900">{reg.id}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Button size="sm" variant="soft" icon="copy" onClick={copy}>Salin Registration ID</Button>
              <Button size="sm" variant="outline" icon="download" onClick={downloadReceipt}>Unduh Gambar Bukti</Button>
            </div>
          </div>
          <dl className="mt-5 divide-y divide-slate-100 text-left text-sm">
            {[
              ["Nama Tim", registrationTeamLabel(reg)],
              ["Turnamen", t.name],
              ["Jumlah Slot", `${reg.total_slot} slot`],
              ["Total Pembayaran", formatRupiah(reg.total_payment)],
              ["Tanggal & Jam Pendaftaran", formatDateTime(reg.created_at)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-3">
                <dt className="text-slate-500">{k}</dt>
                <dd className="text-right font-semibold text-slate-900">{v}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-slate-500">Status Pembayaran</dt>
              <dd><PaymentBadge status={reg.payment_status} long /></dd>
            </div>
          </dl>
          <p className="mt-2 rounded-xl bg-amber-50 p-3 text-left text-xs leading-relaxed text-amber-800">
            Unduh bukti pendaftaran ini, lalu hubungi panitia dan kirimkan gambar bukti pendaftaran untuk konfirmasi.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Button to={`/tournament/${t.slug}`} icon="arrow-left" variant="outline">Kembali ke Landing Page</Button>
            <Button to={`/status?id=${encodeURIComponent(reg.id)}`} icon="search">Cek Status</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
