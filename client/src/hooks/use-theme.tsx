import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { defaultThemes, type Theme } from "@shared/themes";

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<Theme>(defaultThemes[0]);

  useEffect(() => {
    // Update theme.json when theme changes
    const themeJson = {
      variant: currentTheme.variant,
      primary: currentTheme.primary,
      appearance: currentTheme.appearance,
      radius: currentTheme.radius,
    };
    fetch("/theme.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(themeJson),
    });

    // Apply theme-specific styles
    document.documentElement.style.setProperty(
      "--user-bubble-color",
      currentTheme.chat.userBubbleColor
    );
    document.documentElement.style.setProperty(
      "--other-bubble-color",
      currentTheme.chat.otherBubbleColor
    );
    document.documentElement.style.setProperty(
      "--chat-font-family",
      currentTheme.chat.fontStyle === "monospace"
        ? "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas"
        : currentTheme.chat.fontStyle === "rounded"
        ? "ui-rounded, system-ui, sans-serif"
        : "system-ui, sans-serif"
    );
  }, [currentTheme]);

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme: setCurrentTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
