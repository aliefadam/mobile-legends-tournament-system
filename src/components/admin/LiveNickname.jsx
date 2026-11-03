import { useEffect, useState } from "react";
import { Badge, Icon } from "../ui";
import { isValidMlId, isValidMlServer, lookupNickname } from "../../services/mlbb";

const pendingLookups = new Map();

function fetchNickname(id, server, apiUrl) {
  const key = `${apiUrl || ""}:${id}:${server}`;
  if (pendingLookups.has(key)) return pendingLookups.get(key);
  const request = lookupNickname({ id, zone: server, apiUrl }).finally(() => pendingLookups.delete(key));
  pendingLookups.set(key, request);
  return request;
}

export function LiveNickname({ id, server, apiUrl, isDummy = false }) {
  const [result, setResult] = useState({ status: "loading", nickname: "" });
  const ready = isValidMlId(id) && isValidMlServer(server);

  useEffect(() => {
    let active = true;
    if (isDummy) {
      setResult({ status: "dummy", nickname: "" });
      return () => { active = false; };
    }
    if (!ready) {
      setResult({ status: "invalid", nickname: "" });
      return () => { active = false; };
    }

    setResult({ status: "loading", nickname: "" });
    const timer = window.setTimeout(() => {
      fetchNickname(id, server, apiUrl)
        .then((nickname) => {
          if (active) setResult({ status: "success", nickname });
        })
        .catch((error) => {
          if (active) setResult({ status: error.code === "not_found" ? "not_found" : "error", nickname: "" });
        });
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [id, server, apiUrl, ready, isDummy]);

  if (result.status === "dummy") return <Badge tone="neutral">Data Dummy</Badge>;
  if (result.status === "loading") {
    return <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><Icon name="spinner" className="animate-spin" /> Memuat nickname</span>;
  }
  if (result.status === "success") return <Badge tone="success">{result.nickname}</Badge>;
  if (result.status === "not_found") return <Badge tone="warning">Nickname tidak ditemukan</Badge>;
  if (result.status === "invalid") return <span className="text-sm text-slate-400">ID/server tidak valid</span>;
  return <Badge tone="warning">Gagal memuat nickname</Badge>;
}
