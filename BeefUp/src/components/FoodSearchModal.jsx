import { useState, useEffect } from "react";
import { Search, Plus, ChevronLeft, X, Star } from "lucide-react";
import { useApp } from "../context/AppContext";
import { foodProvider, scaleFood } from "../lib/foodProvider";
import { uid, todayISO } from "../lib/planUtils";
import { macroShares } from "../lib/nutritionCalc";
import MacroRing from "./MacroRing";
import { localizedNameOrEnglish } from "../lib/localizedName"

export default function FoodSearchModal({ meal, onClose }) {
  const { t, lang, mealTypes, addFoodLog, customFoods, saveCustomFood, favouriteFoods, toggleFavouriteFood } = useApp();
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

  // Favourites always float to the top, otherwise same order as returned.
  const sortedResults = [
    ...results.filter((f) => favouriteFoods.includes(f.id)),
    ...results.filter((f) => !favouriteFoods.includes(f.id)),
  ];

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
      name: localizedNameOrEnglish(selected, lang),
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

  const mealLabel = mealTypes.find((m) => m.id === meal)?.label || t[meal] || meal;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-center" style={{ maxWidth: 440, padding: 26 }} onClick={(e) => e.stopPropagation()}>

        {/* ── Portion view ── */}
        {selected ? (
          <div className="fade-in">
            <button className="btn btn-back mb-3 flex items-center gap-1" onClick={() => setSelected(null)}>
              <ChevronLeft size={20} /> <span style={{ fontSize: 15 }}>{t.back}</span>
            </button>
            <div className="flex items-center gap-2">
              <h3 className="display flex-1" style={{ fontSize: 24, fontWeight: 900, color: "var(--text)" }}>
                {localizedNameOrEnglish(selected, lang)}
              </h3>
              <button
                className="btn btn-ghost p-2"
                onClick={() => toggleFavouriteFood(selected.id)}
                aria-label={t.favouriteFood}
              >
                <Star
                  size={20}
                  fill={favouriteFoods.includes(selected.id) ? "var(--accent-2)" : "none"}
                  color={favouriteFoods.includes(selected.id) ? "var(--accent-2)" : "var(--muted)"}
                />
              </button>
            </div>
            <p className="mb-5" style={{ color: "var(--muted)", fontSize: 14, marginTop: 4 }}>{selected.servingLabel}</p>

            <label className="section-title" style={{ fontSize: 13 }}>{t.quantity} ({t.grams})</label>
            <input
              className="field mt-2"
              style={{ fontSize: 16, padding: "13px 14px", marginBottom: 15 }}
              type="number"
              value={grams}
              onChange={(e) => setGrams(parseFloat(e.target.value) || 0)}
            />

            <MacroPreview macros={scaleFood(selected, grams)} t={t} />

            <button className="btn btn-primary w-full py-3.5" style={{ fontSize: 15, marginTop: 15 }} onClick={confirmAdd}>
              <Plus size={18} /> {t.add} · {mealLabel}
            </button>
          </div>
        ) : creating ? (
          /* ── Custom food form ── */
          <div className="fade-in">
            <button className="btn btn-back mb-3 flex items-center gap-1" onClick={() => setCreating(false)}>
              <ChevronLeft size={20} /> <span style={{ fontSize: 15 }}>{t.back}</span>
            </button>
            <h3 className="display mb-3" style={{ fontSize: 24, fontWeight: 900, color: "var(--text)" }}>
              {t.customFood}
            </h3>
            <p className="mb-5" style={{ color: "var(--muted)", fontSize: 14 }}>
              {t.valuesPer100g}
            </p>
            <div className="mb-4">
              <label className="section-title" style={{ fontSize: 13 }}>{t.foodName}</label>
              <input
                className="field mt-2"
                style={{ fontSize: 16, padding: "13px 14px" }}
                placeholder={t.foodName}
                value={cf.name}
                onChange={(e) => setCf({ ...cf, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {["kcal", "protein", "carbs", "fat"].map((field) => (
                <div key={field}>
                  <label className="section-title" style={{ fontSize: 13 }}>{t[field]}</label>
                  <input
                    className="field mt-2"
                    style={{ fontSize: 16, padding: "13px 14px" }}
                    type="number"
                    placeholder={t[field]}
                    value={cf[field]}
                    onChange={(e) => setCf({ ...cf, [field]: e.target.value })}
                  />
                </div>
              ))}
            </div>
            <button className="btn btn-primary w-full py-3.5" style={{ fontSize: 15 }} onClick={createCustom}>{t.add}</button>
          </div>
        ) : (
          /* ── Search list ── */
          <div className="fade-in">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="display flex-1" style={{ fontSize: 21, fontWeight: 900, color: "var(--text)" }}>
                {t.addFood}
              </h3>
              <span className="chip active" style={{ pointerEvents: "none" }}>{mealLabel}</span>
              <button className="btn btn-ghost p-2" onClick={onClose} aria-label={t.cancel}>
                <X size={18} />
              </button>
            </div>

            <div style={{ position: "relative", marginBottom: 16 }}>
              <Search size={17} style={{ position: "absolute", left: 13, top: 14, color: "var(--muted)" }} />
              <input
                className="field"
                style={{ paddingLeft: 38, fontSize: 16, padding: "13px 14px 13px 38px" }}
                placeholder={t.searchFood}
                value={query}
                autoFocus
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <button className="btn btn-ghost w-full mb-4 py-3" style={{ fontSize: 14 }} onClick={() => setCreating(true)}>
              <Plus size={16} /> {t.customFood}
            </button>

            {/* Rows should use `--surface2`, evitando o contraste branco-sobre-branco. */}
            <div className="flex flex-col gap-2.5" style={{ maxHeight: "50vh", overflowY: "auto" }}>
              {sortedResults.map((f) => (
                <button
                  key={f.id}
                  className="flex items-center justify-between"
                  style={{
                    padding: "16px 16px",
                    borderRadius: 14,
                    background: "var(--surface2)",
                    cursor: "pointer",
                    textAlign: "left",
                    border: "none",
                  }}
                  onClick={() => pick(f)}
                >
                  <div style={{ minWidth: 0 }}>
                    <p className="font-semibold truncate" style={{ color: "var(--text)", marginBottom: 4, fontSize: 15 }}>
                      {localizedNameOrEnglish(f, lang)}
                    </p>
                    <p style={{ color: "var(--muted)", fontSize: 13 }}>
                      {f.kcal} {t.kcal} · {f.servingLabel}
                    </p>
                  </div>
                  <div className="flex items-center gap-1" style={{ flexShrink: 0, marginLeft: 12 }}>
                    <span
                      role="button"
                      tabIndex={0}
                      className="btn-icon"
                      style={{ padding: 6, display: "inline-flex", cursor: "pointer" }}
                      onClick={(e) => { e.stopPropagation(); toggleFavouriteFood(f.id); }}
                      aria-label={t.favouriteFood}
                    >
                      <Star
                        size={17}
                        fill={favouriteFoods.includes(f.id) ? "var(--accent-2)" : "none"}
                        color={favouriteFoods.includes(f.id) ? "var(--accent-2)" : "var(--muted)"}
                      />
                    </span>
                    <Plus size={18} style={{ color: "var(--accent-2)" }} />
                  </div>
                </button>
              ))}
              {results.length === 0 && (
                <p className="text-center py-6" style={{ color: "var(--muted)", fontSize: 15 }}>{t.noResults}</p>
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
    { key: "protein", short: t.proteinShort, val: macros.protein, color: "var(--protein)" },
    { key: "carbs", short: t.carbsShort, val: macros.carbs, color: "var(--carbs)" },
    { key: "fat", short: t.fatShort, val: macros.fat, color: "var(--fat)" },
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-center">
        <MacroRing value={macros.kcal} max={macros.kcal || 1} shares={macroShares(macros)}>
          <span
            className="display"
            style={{ fontSize: 30, fontWeight: 900, color: "var(--text)", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}
          >
            {macros.kcal}
          </span>
          <span className="text-xs" style={{ color: "var(--muted)" }}>{t.kcal}</span>
        </MacroRing>
      </div>
      <div className="flex">
        {items.map((m) => (
          <div key={m.key} className="flex-1 flex flex-col items-center" style={{ minWidth: 0 }}>
            <div className="flex items-center gap-1.5">
              <span style={{ width: 7, height: 7, borderRadius: 999, background: m.color, flexShrink: 0 }} />
              <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>{m.short}</span>
            </div>
            <span
              className="text-sm font-bold"
              style={{ color: "var(--text)", fontVariantNumeric: "tabular-nums", marginTop: 3 }}
            >
              {m.val}g
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
