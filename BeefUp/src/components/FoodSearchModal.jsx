import { useState, useEffect, useMemo } from "react";
import { useEscapeKey } from "../lib/useEscapeKey";
import { Search, Plus, ChevronLeft, ChevronDown, X, Star, Trash2, Camera } from "lucide-react";
import { useApp } from "../context/useApp";
import { foodProvider, scaleFood, MICRONUTRIENTS, MICRONUTRIENT_KEYS } from "../lib/foodProvider";
import { RateLimitError } from "../lib/openFoodFacts";
import { loadLocalFoods, searchLocalFoods, isCatalogLoaded, foldText } from "../lib/localFoods";
import { isScanSupported } from "../lib/barcodeDetector";
import BarcodeScannerModal from "./BarcodeScannerModal";
import { uid, todayISO } from "../lib/planUtils";
import { setLS } from "../lib/crypto";
import { macroShares } from "../lib/nutritionCalc";
import MacroRing from "./MacroRing";
import NumberField from "./NumberField";
import ConfirmModal from "./ConfirmModal";
import { localizedNameOrEnglish } from "../lib/localizedName"
import "./FoodSearchModal.css";

const SEARCH_DEBOUNCE_MS = 500;
const CAN_SCAN = isScanSupported();

const EMPTY_CUSTOM_FOOD = {
  name: "", kcal: "", protein: "", carbs: "", fat: "",
  ...Object.fromEntries(MICRONUTRIENT_KEYS.map((k) => [k, ""])),
};

function matchesFood(food, query) {
  if (!query) return true;
  const q = foldText(query);
  return foldText(food.name).includes(q) || foldText(food.namePt).includes(q);
}

export default function FoodSearchModal({ meal, onClose, initialDraft }) {
  useEscapeKey(onClose);
  const { t, lang, mealTypes, addFoodLog, customFoods, saveCustomFood, deleteCustomFood, favouriteFoods, toggleFavouriteFood, recentFoodIds, addRecentFood } = useApp();
  const [pendingDelete, setPendingDelete] = useState(null); // custom food awaiting delete confirmation
  const [scanning, setScanning] = useState(false);
  const isCustom = (food) => customFoods.some((f) => f.id === food.id && !f.source);
  const [query, setQuery] = useState(() => initialDraft?.query ?? "");
  const [results, setResults] = useState([]); 
  const [searchState, setSearchState] = useState("idle"); // idle | loading | error | limited
  const [retryAfter, setRetryAfter] = useState(0); 
  const [retryNonce, setRetryNonce] = useState(0);
  const [catalogReady, setCatalogReady] = useState(isCatalogLoaded);
  const [onlineRequested, setOnlineRequested] = useState(false); // botão "procurar online"
  const [selected, setSelected] = useState(() => initialDraft?.selected ?? null); // food being portioned
  const [grams, setGrams] = useState(() => initialDraft?.grams ?? 100);
  const [unitMode, setUnitMode] = useState(() => initialDraft?.unitMode ?? false); // false = grams, true = whole-unit count (servings)
  const [unitCount, setUnitCount] = useState(() => initialDraft?.unitCount ?? 1);
  const [creating, setCreating] = useState(() => initialDraft?.creating ?? false);

  // Custom-food form
  const [cf, setCf] = useState(() => initialDraft?.cf ?? EMPTY_CUSTOM_FOOD);
  const [showMicros, setShowMicros] = useState(false);

  useEffect(() => {
    if (!query && !selected && !creating) return;
    const id = setTimeout(() => {
      setLS("foodEntryDraft", { meal, query, selected, grams, unitMode, unitCount, creating, cf });
    }, 300);
    return () => clearTimeout(id);
  }, [meal, query, selected, grams, unitMode, unitCount, creating, cf]);

  useEffect(() => {
    if (catalogReady) return;
    let alive = true;
    loadLocalFoods().then(() => alive && setCatalogReady(true));
    return () => { alive = false; };
  }, [catalogReady]);

  const localMatches = useMemo(
    () => customFoods.filter((f) => matchesFood(f, query.trim())),
    [customFoods, query],
  );

  const catalogMatches = useMemo(
    () => (catalogReady ? searchLocalFoods(query.trim(), 25, lang) : []),
    [query, catalogReady, lang],
  );

  // A API só entra quando a base local não responde, ou a pedido.
  const autoOnline = catalogReady && catalogMatches.length === 0 && localMatches.length === 0;
  const wantOnline = autoOnline || onlineRequested;

  useEffect(() => {
    const q = query.trim();

    if (!q || !wantOnline) return;

    const controller = new AbortController();
    const id = setTimeout(() => {
      setSearchState("loading");
      foodProvider
        .searchFoods(q, lang, controller.signal)
        .then((r) => {
          setResults(r);
          setSearchState("idle");
        })
        .catch((err) => {
          if (err?.name === "AbortError") return; // superseded by a newer query
          setResults([]);
          if (err instanceof RateLimitError) {
            setRetryAfter(Math.max(1, Math.ceil(err.retryAfterMs / 1000)));
            setSearchState("limited");
          } else {
            setSearchState("error");
          }
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(id);
      controller.abort();
    };
  }, [query, lang, retryNonce, wantOnline]);

  useEffect(() => {
    if (searchState !== "limited") return;
    const id = setInterval(() => {
      setRetryAfter((s) => {
        if (s <= 1) {
          setRetryNonce((n) => n + 1);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [searchState]);

  const isSearching = query.trim().length > 0;
  const onlineState = wantOnline ? searchState : "idle";

  const sortedResults = useMemo(() => {
    const online = isSearching && wantOnline ? results : [];
    const seen = new Set();
    const merged = [];
    for (const f of [...localMatches, ...catalogMatches, ...online]) {
      if (seen.has(f.id)) continue;
      seen.add(f.id);
      merged.push(f);
    }
    return [
      ...merged.filter((f) => favouriteFoods.includes(f.id)),
      ...merged.filter((f) => !favouriteFoods.includes(f.id)),
    ];
  }, [localMatches, catalogMatches, results, favouriteFoods, isSearching, wantOnline]);

  const initialRows = useMemo(() => {
    const recentIds = new Set(recentFoodIds);
    const recent = recentFoodIds.map((id) => customFoods.find((f) => f.id === id)).filter(Boolean);
    const rest = localMatches.filter((f) => !recentIds.has(f.id));
    const combined = [...recent, ...rest];
    return [
      ...combined.filter((f) => favouriteFoods.includes(f.id)),
      ...combined.filter((f) => !favouriteFoods.includes(f.id)),
    ];
  }, [recentFoodIds, customFoods, localMatches, favouriteFoods]);

  async function handleToggleFavourite(food) {
    const alreadyFav = favouriteFoods.includes(food.id);
    if (!alreadyFav && !customFoods.some((f) => f.id === food.id)) {
      await saveCustomFood(food);
    }
    toggleFavouriteFood(food.id);
  }

  function pick(food) {
    setSelected(food);
    setGrams(food.serving || 100);
    setUnitCount(1);
    setUnitMode(false);
  }

  const unitSize = selected?.unitGrams || selected?.serving || 100;
  const effectiveGrams = unitMode ? unitCount * unitSize : grams;
  const unitEquivalent = effectiveGrams / unitSize;
  const unitEquivalentLabel = Number.isInteger(unitEquivalent) ? unitEquivalent : unitEquivalent.toFixed(1);

  function switchToUnitMode() {
    setUnitCount(Math.max(1, Math.round(grams / unitSize)));
    setUnitMode(true);
  }

  function switchToGramsMode() {
    setGrams(unitCount * unitSize);
    setUnitMode(false);
  }

  async function confirmAdd() {
    if (!selected) return;
    const m = scaleFood(selected, effectiveGrams);
    await addFoodLog({
      id: uid(),
      date: todayISO(),
      meal,
      name: localizedNameOrEnglish(selected, lang),
      qty: effectiveGrams,
      ...m,
    });
    if (!customFoods.some((f) => f.id === selected.id)) {
      await saveCustomFood(selected);
    }
    addRecentFood(selected.id);
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
    for (const key of MICRONUTRIENT_KEYS) {
      if (cf[key].trim() !== "") food[key] = parseFloat(cf[key]) || 0;
    }
    await saveCustomFood(food);
    setCreating(false);
    pick(food);
  }

  const mealLabel = mealTypes.find((m) => m.id === meal)?.label || t[meal] || meal;

  function renderFoodRow(f) {
    return (
      <button
        key={f.id}
        className="flex items-center justify-between fs-row"
        onClick={() => pick(f)}
      >
        <div className="min-w-0">
          <p className="font-semibold truncate text-body fs-row-name">
            {localizedNameOrEnglish(f, lang)}
          </p>
          <p className="text-muted fs-row-meta">
            {f.kcal} {t.kcal} · {f.servingLabel}
          </p>
        </div>
        <div className="flex items-center gap-1 fs-row-actions">
          <span
            role="button"
            tabIndex={0}
            className="btn-icon fs-fav"
            onClick={(e) => { e.stopPropagation(); handleToggleFavourite(f); }}
            aria-label={t.favouriteFood}
          >
            <Star
              size={17}
              fill={favouriteFoods.includes(f.id) ? "var(--accent-2)" : "none"}
              color={favouriteFoods.includes(f.id) ? "var(--accent-2)" : "var(--muted)"}
            />
          </span>
          <Plus className="fs-plus" size={18} />
        </div>
      </button>
    );
  }

  return (
    <div role="dialog" aria-modal="true" className="modal-overlay" onClick={onClose}>
      <div className="modal-center fs-modal" onClick={(e) => e.stopPropagation()}>

        {/* ── Portion view ── */}
        {selected ? (
          <div className="fade-in">
            <button className="btn btn-back mb-3 flex items-center gap-1" onClick={() => setSelected(null)}>
              <ChevronLeft size={20} /> <span className="fs-back-label">{t.back}</span>
            </button>
            <div className="flex items-center gap-2">
              <h3 className="display flex-1 text-body fs-title">
                {localizedNameOrEnglish(selected, lang)}
              </h3>
              <button
                className="btn btn-ghost p-2"
                onClick={() => handleToggleFavourite(selected)}
                aria-label={t.favouriteFood}
              >
                <Star
                  size={20}
                  fill={favouriteFoods.includes(selected.id) ? "var(--accent-2)" : "none"}
                  color={favouriteFoods.includes(selected.id) ? "var(--accent-2)" : "var(--muted)"}
                />
              </button>
              {isCustom(selected) && (
                <button
                  className="btn btn-ghost p-2"
                  onClick={() => setPendingDelete(selected)}
                  aria-label={t.delete}
                >
                  <Trash2 size={20} color="var(--muted)" />
                </button>
              )}
            </div>
            {/* grams<->units */}
            <p className="mb-5 text-muted fs-equiv">
              {Math.round(effectiveGrams)}g ({unitEquivalentLabel}un)
            </p>

            <div className="flex items-center justify-between mt-1 mb-2">
              <label className="section-title fs-label fs-label-flat">{t.quantity}</label>
              <div className="pill-toggle">
                <button
                  className={`pill-option ${!unitMode ? "active" : ""}`}
                  onClick={switchToGramsMode}
                >
                  {t.grams}
                </button>
                <button
                  className={`pill-option ${unitMode ? "active" : ""}`}
                  onClick={switchToUnitMode}
                >
                  {t.units}
                </button>
              </div>
            </div>
            {unitMode ? (
              <NumberField
                className="field fs-input fs-input-gap"
                allowDecimal={false}
                value={unitCount}
                onChange={(e) => setUnitCount(parseInt(e.target.value) || 0)}
              />
            ) : (
              <NumberField
                className="field fs-input fs-input-gap"
                value={grams}
                onChange={(e) => setGrams(parseFloat(e.target.value) || 0)}
              />
            )}

            <MacroPreview macros={scaleFood(selected, effectiveGrams)} t={t} />

            <MicroPreview food={selected} macros={scaleFood(selected, effectiveGrams)} t={t} />

            <button className="btn btn-primary w-full py-3.5 fs-btn-text fs-confirm-gap" onClick={confirmAdd}>
              <Plus size={18} /> {t.add} · {mealLabel}
            </button>
          </div>
        ) : creating ? (
          /* ── Custom food form ── */
          <div className="fade-in">
            <button className="btn btn-back mb-3 flex items-center gap-1" onClick={() => setCreating(false)}>
              <ChevronLeft size={20} /> <span className="fs-back-label">{t.back}</span>
            </button>
            <h3 className="display mb-3 text-body fs-title">
              {t.customFood}
            </h3>
            <p className="mb-5 text-muted fs-intro">
              {t.valuesPer100g}
            </p>
            <div className="mb-4">
              <label className="section-title fs-label">{t.foodName}</label>
              <input
                className="field mt-2 fs-input"
                placeholder={t.foodName}
                value={cf.name}
                onChange={(e) => setCf({ ...cf, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 fs-macro-grid">
              {["kcal", "protein", "carbs", "fat"].map((field) => (
                <div key={field}>
                  <label className="section-title fs-label">{t[field]}</label>
                  <NumberField
                    className="field mt-2 fs-input"
                    placeholder={t[field]}
                    value={cf[field]}
                    onChange={(e) => setCf({ ...cf, [field]: e.target.value })}
                  />
                </div>
              ))}
            </div>

            <button
              className="flex items-center justify-center gap-1 w-full text-muted fs-more"
              onClick={() => setShowMicros((v) => !v)}
            >
              {t.moreDetails}
              <ChevronDown
                size={15}
                style={{ transform: showMicros ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
              />
            </button>

            {showMicros && (
              <div className="grid grid-cols-2 gap-4 fade-in fs-micro-grid">
                {MICRONUTRIENTS.map(({ key, unit }) => (
                  <div key={key}>
                    <label className="section-title fs-label">
                      {t[key]} <span className="text-muted fs-unit">({unit})</span>
                    </label>
                    <NumberField
                      className="field mt-2 fs-input"
                      placeholder={unit}
                      value={cf[key]}
                      onChange={(e) => setCf({ ...cf, [key]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            )}

            <button className="btn btn-primary w-full py-3.5 fs-btn-text" onClick={createCustom}>{t.add}</button>
          </div>
        ) : (
          /* ── Search list ── */
          <div className="fade-in">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="display flex-1 text-body fs-title-sm">
                {t.addFood}
              </h3>
              <span className="chip active fs-meal">{mealLabel}</span>
              <button className="btn btn-ghost p-2" onClick={onClose} aria-label={t.cancel}>
                <X size={18} />
              </button>
            </div>

            <div className="fs-search">
              <Search className="text-muted fs-search-icon" size={17} />
              <input
                className="field fs-search-input"
                style={{ padding: `13px ${CAN_SCAN ? 44 : 14}px 13px 38px` }}
                placeholder={t.searchFood}
                value={query}
                autoFocus
                onChange={(e) => { setQuery(e.target.value); setOnlineRequested(false); }}
              />
              {CAN_SCAN && (
                <button
                  className="btn-icon fs-scan"
                  onClick={() => setScanning(true)}
                  aria-label={t.scanBarcode}
                >
                  <Camera className="text-muted" size={19} />
                </button>
              )}
            </div>

            {!isSearching && (
              <button className="btn btn-ghost w-full py-3 fs-custom-btn" onClick={() => setCreating(true)}>
                <Plus size={16} /> {t.customFood}
              </button>
            )}

            {/* Rows should use `--surface2`, evitando o contraste branco-sobre-branco. */}
            <div className="flex flex-col gap-2.5 fs-list">
              {(isSearching ? sortedResults : initialRows).map(renderFoodRow)}
              {/* Status sits below the rows*/}
              {isSearching && catalogReady && !wantOnline && (
                <button
                  className="btn btn-ghost py-2 px-4 text-sm"
                  onClick={() => setOnlineRequested(true)}
                >
                  <Search size={15} /> {t.searchOnline}
                </button>
              )}
              {isSearching && onlineState === "loading" && (
                <p className="text-center py-4 text-muted fs-status">{t.searchingFood}</p>
              )}
              {isSearching && onlineState === "error" && (
                <div className="flex flex-col items-center gap-2 py-4">
                  <p className="text-danger fs-status">{t.foodSearchFailed}</p>
                  {/* All 5 built-in retries already failed by the time this shows*/}
                  <button
                    className="btn btn-ghost py-2 px-4 text-sm"
                    onClick={() => { setSearchState("loading"); setRetryNonce((n) => n + 1); }}
                  >
                    {t.retry}
                  </button>
                </div>
              )}
              {isSearching && onlineState === "limited" && (
                <p className="text-center py-4 fs-warn">
                  {t.foodSearchLimit.replace("{n}", retryAfter)}
                </p>
              )}
              {/* Catálogo a carregar não é "sem resultados". */}
              {sortedResults.length === 0 && (!isSearching || (catalogReady && onlineState === "idle")) && (
                <p className="text-center py-6 text-muted fs-status-lg">
                  {isSearching ? t.noResults : t.typeToSearch}
                </p>
              )}
            </div>
            {/* Atribuição exigida pela licença de utilização da tabela. */}
            <p className="text-muted fs-credit">
              {t.insaCredit}
            </p>
          </div>
        )}

        {pendingDelete && (
          <ConfirmModal
            title={t.deleteCustomFoodTitle}
            message={t.deleteCustomFoodConfirm.replace("{name}", localizedNameOrEnglish(pendingDelete, lang))}
            cancelLabel={t.cancel}
            confirmLabel={t.delete}
            onCancel={() => setPendingDelete(null)}
            onConfirm={() => {
              deleteCustomFood(pendingDelete.id);
              if (selected?.id === pendingDelete.id) setSelected(null);
              setPendingDelete(null);
            }}
          />
        )}

        {scanning && (
          <BarcodeScannerModal
            lang={lang}
            t={t}
            onFound={(food) => { pick(food); setScanning(false); }}
            onClose={() => setScanning(false)}
          />
        )}
      </div>
    </div>
  );
}

function MicroPreview({ food, macros, t }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 fs-micros">
      {MICRONUTRIENTS.map(({ key, unit }) => {
        const known = food[key] != null;
        return (
          <div key={key} className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-xs text-muted fs-micro-label">{t[key]}</span>
            <span
              className="text-xs font-semibold fs-micro-val"
              style={{ color: known ? "var(--text)" : "var(--muted)", fontStyle: known ? "normal" : "italic" }}
            >
              {known ? `${macros[key]} ${unit}` : t.noData}
            </span>
          </div>
        );
      })}
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
            className="display text-body fs-kcal"
          >
            {macros.kcal}
          </span>
          <span className="text-xs text-muted">{t.kcal}</span>
        </MacroRing>
      </div>
      <div className="flex">
        {items.map((m) => (
          <div key={m.key} className="flex-1 flex flex-col items-center min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="fs-dot" style={{ background: m.color }} />
              <span className="text-xs font-semibold text-muted">{m.short}</span>
            </div>
            <span
              className="text-sm font-bold text-body fs-macro-val"
            >
              {m.val}g
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
