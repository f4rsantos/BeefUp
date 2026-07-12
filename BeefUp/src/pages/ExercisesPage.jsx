import { useMemo, useState } from "react";
import { ChevronLeft, Search } from "lucide-react";
import { useApp } from "../context/AppContext";
import { listBaseExercises, getEquipmentOptions, getVariantOptions, getBodyPartLabel } from "../lib/exerciseTree";

export default function ExercisesPage({ onBack }) {
  const { t, lang } = useApp();
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = listBaseExercises().filter((ex) => {
      const label = lang === "pt" ? ex.namePt : ex.name;
      if (!q) return true;
      return label.toLowerCase().includes(q);
    });

    const sorted = [...filtered].sort((a, b) => {
      const la = lang === "pt" ? a.namePt : a.name;
      const lb = lang === "pt" ? b.namePt : b.name;
      return la.localeCompare(lb);
    });

    const byLetter = {};
    sorted.forEach((ex) => {
      const label = lang === "pt" ? ex.namePt : ex.name;
      const letter = label[0]?.toUpperCase() ?? "#";
      if (!byLetter[letter]) byLetter[letter] = [];
      byLetter[letter].push(ex);
    });

    return Object.keys(byLetter)
      .sort()
      .map((letter) => ({ letter, items: byLetter[letter] }));
  }, [query, lang]);

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      <div className="flex items-center gap-1" style={{ padding: "38px 16px 16px" }}>
        <button className="btn-back" onClick={onBack} aria-label={t.back}>
          <ChevronLeft size={24} style={{ color: "var(--text)" }} />
        </button>
        <h1 className="display" style={{ fontSize: 28, fontWeight: 900, color: "var(--text)" }}>
          {t.exercisesTitle}
        </h1>
      </div>

      <div className="px-4" style={{ marginBottom: 8 }}>
        <div className="relative flex items-center">
          <Search size={16} style={{ position: "absolute", left: 12, color: "var(--muted)" }} />
          <input
            className="field w-full"
            style={{ paddingLeft: 36 }}
            placeholder={t.searchExercises}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-hide">
        {groups.length === 0 ? (
          <p className="text-sm text-center" style={{ color: "var(--muted)", padding: "40px 0" }}>
            {t.noResults}
          </p>
        ) : (
          groups.map(({ letter, items }) => (
            <div key={letter} className="flex flex-col" style={{ marginBottom: 4 }}>
              <div
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                  background: "var(--bg)",
                  padding: "10px 4px 6px",
                }}
              >
                <span
                  className="font-bold"
                  style={{ fontSize: 13, color: "var(--accent)" }}
                >
                  {letter}
                </span>
              </div>
              <div className="flex flex-col">
                {items.map((ex) => {
                  const equipmentOptions = getEquipmentOptions(ex.id);
                  const variantOptions = getVariantOptions(ex.id);
                  return (
                    <div
                      key={ex.id}
                      style={{
                        padding: "10px 4px",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                          {lang === "pt" ? ex.namePt : ex.name}
                        </span>
                        <span
                          className="text-xs"
                          style={{ color: "var(--muted)", textTransform: "capitalize" }}
                        >
                          {getBodyPartLabel(ex.bodyPart, lang)}
                        </span>
                      </div>
                      {(equipmentOptions.length > 0 || variantOptions.length > 0) && (
                        <div className="flex flex-wrap" style={{ gap: 4, marginTop: 4 }}>
                          {equipmentOptions.map((eq) => (
                            <span
                              key={eq.id}
                              className="text-xs"
                              style={{
                                color: "var(--muted)",
                                background: "var(--surface2)",
                                borderRadius: 6,
                                padding: "1px 6px",
                              }}
                            >
                              {lang === "pt" ? eq.namePt : eq.name}
                            </span>
                          ))}
                          {variantOptions.map((v) => (
                            <span
                              key={v.id}
                              className="text-xs"
                              style={{
                                color: "var(--accent)",
                                background: "var(--accent-soft)",
                                borderRadius: 6,
                                padding: "1px 6px",
                              }}
                            >
                              {lang === "pt" ? v.namePt : v.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
