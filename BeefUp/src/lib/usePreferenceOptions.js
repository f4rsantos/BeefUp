import { Monitor, Moon, Sun } from "lucide-react";
import { useApp } from "../context/useApp";

export function useThemeOptions() {
  const { t, theme, setTheme } = useApp();
  return {
    value: theme,
    onChange: setTheme,
    options: [
      { id: "light", icon: Sun, label: t.themeLight },
      { id: "dark", icon: Moon, label: t.themeDark },
      { id: "system", icon: Monitor, label: t.themeSystem },
    ],
  };
}

export function useFontScaleOptions() {
  const { t, fontScale, setFontScale } = useApp();
  return {
    value: fontScale,
    onChange: setFontScale,
    options: [
      { id: "small", size: 14, label: t.fontSizeSmall },
      { id: "medium", size: 17, label: t.fontSizeMedium },
      { id: "large", size: 20, label: t.fontSizeLarge },
      { id: "extraLarge", size: 23, label: t.fontSizeExtraLarge },
    ],
  };
}

export function useLanguageOptions() {
  const { t, lang, setLang } = useApp();
  return {
    value: lang,
    onChange: setLang,
    options: [
      { id: "pt", label: t.langPt },
      { id: "en", label: t.langEn },
    ],
  };
}
