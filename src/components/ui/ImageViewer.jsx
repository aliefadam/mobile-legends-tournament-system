import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";

export function ImageViewer({ src, open, onClose, title = "Pratinjau Gambar" }) {
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    if (open) setZoom(1);
  }, [open]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <>
          <Button variant="outline" size="sm" icon="zoom-out" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} />
          <span className="w-14 text-center text-sm font-semibold text-slate-600">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="sm" icon="zoom-in" onClick={() => setZoom((z) => Math.min(4, z + 0.25))} />
          <Button variant="ghost" size="sm" onClick={() => setZoom(1)}>
            Reset
          </Button>
        </>
      }
    >
      <div className="thin-scroll flex max-h-[60vh] justify-center overflow-auto rounded-xl bg-slate-100 p-3">
        {src && <img src={src} alt={title} style={{ width: `${zoom * 100}%`, maxWidth: zoom <= 1 ? "100%" : "none" }} className="h-auto self-start rounded-lg bg-white transition-[width] duration-150" />}
      </div>
    </Modal>
  );
}
