import { useState } from "react";
import { X } from "lucide-react";
import { useApp } from "../context/AppContext";
import { uid } from "../lib/planUtils";

export default function CreateClientModal({ onClose, onCreated }) {
  const { t, saveClient } = useApp();
  const [name, setName] = useState("");
  const [info, setInfo] = useState("");

  async function create() {
    if (!name.trim()) return;
    const client = {
      id: uid(),
      name: name.trim(),
      info: info.trim(),
      focus: "gym",
      plan: null,
      workouts: [],
      measures: [],
      notes: [],
      schedule: [],
    };
    await saveClient(client);
    onCreated?.(client);
    onClose();
  }

  return (
    <div className="modal-overlay" style={{ alignItems: "center" }} onClick={onClose}>
      <div className="modal-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="display" style={{ fontSize: 20, fontWeight: 900, color: "var(--text)" }}>{t.dashNewClient}</h3>
          <button className="btn btn-ghost p-2" onClick={onClose} aria-label={t.cancel}><X size={18} /></button>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="section-title">{t.dashClientName}</label>
            <input className="field mt-1" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="section-title">{t.dashClientInfo}</label>
            <input className="field mt-1" value={info} onChange={(e) => setInfo(e.target.value)} />
          </div>
          <button className="btn btn-primary w-full mt-1" onClick={create}>{t.dashCreate}</button>
        </div>
      </div>
    </div>
  );
}
