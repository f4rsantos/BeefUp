import { useState, useEffect } from "react";
import { Search, Plus, ChevronLeft } from "lucide-react";
import { useApp } from "../context/AppContext";
import { foodProvider, scaleFood } from "../lib/foodProvider";
import { uid, todayISO } from "../lib/planUtils";

export default function FoodSearchModal({ meal, onClose }) {
  const { t, lang, addFoodLog, customFoods, saveCustomFood } = useApp();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null); // food being portioned
  const [grams, setGrams] = useState(100);
  const [creating, setCreating] = useState(false);

  // Custom-food form
  const [cf, setCf] = useState({ name: "", kcal: "", protein: "", carbs: "", fat: "" });

  useEffect(() => {
    let alive = true;
    foodProvider.searchFoods(query).then((r) => {
      if (alive) {
        // merge custom foods matching the query at the top
        const q = query.toLowerCase();
        const custom = customFoods.filter(
          (f) => !q || f.name.toLowerCase().includes(q),
        );
        setResults([...custom, ...r]);
      }
    });
    return () => { alive = false; };
  }, [query, customFoods]);

  function pick(food) {
    setSelected(food);
    setGrams(food.serving || 100);
  }

  async function confirmAdd() {
    if (!selected) return;
    const m = scaleFood(selected, grams);
    await addFoodLog({
      id: uid(),
      date: todayISO(),
      meal,
      name: lang === "pt" ? selected.namePt || selected.name : selected.name,
      qty: grams,
      ...m,
    });
    onClose();
  }

  async function createCustom() {
    const food = {
      id: uid(),
      name: cf.name.trim() || "Food",
      namePt: cf.name.trim() || "Alimento",
      kcal: parseFloat(cf.kcal) || 0,
      protein: parseFloat(cf.protein) || 0,
      carbs: parseFloat(cf.carbs) || 0,
      fat: parseFloat(cf.fat) || 0,
      serving: 100,
      servingLabel: "100 g",
    };
    await saveCustomFood(food);
    setCreating(false);
    pick(food);
  }

  const mealLabel = t[meal] || meal;

  return (
    <div className="modal-overlay" style={{ alignItems: "center" }} onClick={onClose}>
      <div className="modal-center" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>

        {/* ── Portion view ── */}
        {selected ? (
          <div className="fade-in">
            <button className="btn btn-back mb-2 flex items-center gap-1" onClick={() => setSelected(null)}>
              <ChevronLeft size={18} /> <span className="text-sm">{t.back}</span>
            </button>
            <h3 className="display" style={{ fontSize: 20, fontWeight: 900, color: "var(--text)" }}>
              {lang === "pt" ? selected.namePt || selected.name : selected.name}
            </h3>
            <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>{selected.servingLabel}</p>

            <label className="section-title">{t.quantity} ({t.grams})</label>
            <input
              className="field mt-2 mb-4"
              type="number"
              value={grams}
              onChange={(e) => setGrams(parseFloat(e.target.value) || 0)}
            />

            <MacroPreview macros={scaleFood(selected, grams)} t={t} />

            <button className="btn btn-primary w-full mt-4" onClick={confirmAdd}>
              <Plus size={16} /> {t.add} · {mealLabel}
            </button>
          </div>
        ) : creating ? (
          /* ── Custom food form ── */
          <div className="fade-in">
            <button className="btn btn-back mb-2 flex items-center gap-1" onClick={() => setCreating(false)}>
              <ChevronLeft size={18} /> <span className="text-sm">{t.back}</span>
            </button>
            <h3 className="display mb-3" style={{ fontSize: 20, fontWeight: 900, color: "var(--text)" }}>
              {t.customFood}
            </h3>
            <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
              {lang === "pt" ? "Valores por 100 g" : "Values per 100 g"}
            </p>
            <div className="mb-3">
              <label className="section-title">{t.foodName}</label>
              <input className="field mt-1" placeholder={t.foodName} value={cf.name} onChange={(e) => setCf({ ...cf, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {["kcal", "protein", "carbs", "fat"].map((field) => (
                <div key={field}>
                  <label className="section-title">{t[field]}</label>
                  <input
                    className="field mt-1"
                    type="number"
                    placeholder={t[field]}
                    value={cf[field]}
                    onChange={(e) => setCf({ ...cf, [field]: e.target.value })}
                  />
                </div>
              ))}
            </div>
            <button className="btn btn-primary w-full" onClick={createCustom}>{t.add}</button>
          </div>
        ) : (
          /* ── Search list ── */
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="display flex-1" style={{ fontSize: 20, fontWeight: 900, color: "var(--text)" }}>
                {t.addFood}
              </h3>
              <span className="chip active" style={{ pointerEvents: "none" }}>{mealLabel}</span>
            </div>

            <div style={{ position: "relative", marginBottom: 12 }}>
              <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: "var(--muted)" }} />
              <input
                className="field"
                style={{ paddingLeft: 36 }}
                placeholder={t.searchFood}
                value={query}
                autoFocus
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <button className="btn btn-ghost w-full mb-3 py-2.5 text-sm" onClick={() => setCreating(true)}>
              <Plus size={15} /> {t.customFood}
            </button>

            <div className="flex flex-col gap-2" style={{ maxHeight: "50vh", overflowY: "auto" }}>
              {results.map((f) => (
                <button
                  key={f.id}
                  className="card flex items-center justify-between"
                  style={{ padding: "14px 16px", cursor: "pointer", textAlign: "left" }}
                  onClick={() => pick(f)}
                >
                  <div style={{ minWidth: 0 }}>
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--text)", marginBottom: 4 }}>
                      {lang === "pt" ? f.namePt || f.name : f.name}
                    </p>
                    <p className="text-sm" style={{ color: "var(--muted)" }}>
                      {f.kcal} {t.kcal} · {f.servingLabel}
                    </p>
                  </div>
                  <Plus size={18} style={{ color: "var(--accent)", flexShrink: 0, marginLeft: 12 }} />
                </button>
              ))}
              {results.length === 0 && (
                <p className="text-sm text-center py-6" style={{ color: "var(--muted)" }}>{t.noResults}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MacroPreview({ macros, t }) {
  const items = [
    { label: t.calories, value: macros.kcal, unit: "", color: "var(--accent)" },
    { label: t.protein, value: macros.protein, unit: "g", color: "var(--protein)" },
    { label: t.carbs, value: macros.carbs, unit: "g", color: "var(--carbs)" },
    { label: t.fat, value: macros.fat, unit: "g", color: "var(--fat)" },
  ];
  return (
    <div className="flex gap-3">
      {items.map((it, i) => (
        <div key={i} className="flex-1 text-center py-3 rounded-2xl" style={{ background: "var(--surface2)" }}>
          <p className="display" style={{ fontSize: 16, fontWeight: 900, color: it.color }}>{it.value}{it.unit}</p>
          <p className="text-xs" style={{ color: "var(--muted)", marginTop: 2 }}>{it.label}</p>
        </div>
      ))}
    </div>
  );
}
