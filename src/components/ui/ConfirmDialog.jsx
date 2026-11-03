import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { Checkbox } from "./Checkbox";
import { Input } from "./Input";

const TONES = {
  danger: { icon: "trash", cls: "bg-red-50 text-red-500", btn: "danger" },
  warning: { icon: "exclamation", cls: "bg-amber-50 text-amber-500", btn: "primary" },
  info: { icon: "info", cls: "bg-electric-50 text-electric-500", btn: "primary" },
  success: { icon: "check-circle", cls: "bg-emerald-50 text-emerald-500", btn: "success" },
};

/** Konfirmasi dengan opsi acknowledge (checkbox) atau requireText (ketik teks) untuk aksi berisiko. */
export function ConfirmDialog({ open, onClose, onConfirm, title, message, children, confirmLabel = "Ya, Lanjutkan", cancelLabel = "Batal", tone = "danger", loading, acknowledge, requireText }) {
  const [ack, setAck] = useState(false);
  const [text, setText] = useState("");
  useEffect(() => {
    if (open) {
      setAck(false);
      setText("");
    }
  }, [open]);
  const t = TONES[tone];
  const blocked = (acknowledge && !ack) || (requireText && text.trim() !== requireText);
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      hideClose
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={t.btn} onClick={onConfirm} loading={loading} disabled={blocked}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-4">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl ${t.cls}`}>
          <Icon name={t.icon} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          {message && <p className="mt-1 text-sm leading-relaxed text-slate-600">{message}</p>}
          {children}
          {acknowledge && <Checkbox className="mt-4" checked={ack} onChange={setAck} label={acknowledge} />}
          {requireText && (
            <Input wrapperClassName="mt-4" label={`Ketik "${requireText}" untuk melanjutkan`} value={text} onChange={(e) => setText(e.target.value)} />
          )}
        </div>
      </div>
    </Modal>
  );
}
