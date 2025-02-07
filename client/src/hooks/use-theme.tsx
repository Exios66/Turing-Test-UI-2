import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { defaultThemes, type Theme } from "@shared/themes";
import { getScreenConfig } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'app-theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme) {
      try {
        return JSON.parse(savedTheme);
      } catch (e) {
        console.error('Failed to parse saved theme:', e);
        return defaultThemes[0];
      }
    }
    return defaultThemes[0];
  });

  useEffect(() => {
    try {
      const { prefersColorScheme } = getScreenConfig();

      // Save theme to localStorage
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(currentTheme));
      console.log('Theme saved:', currentTheme);

      // Update theme.json
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
      }).catch(error => {
        console.error('Failed to update theme.json:', error);
        toast({
          title: "Theme Update Failed",
          description: "Could not save theme preferences",
          variant: "destructive",
        });
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

      console.log('Theme styles applied successfully');
    } catch (error) {
      console.error('Error applying theme:', error);
      toast({
        title: "Theme Error",
        description: "Failed to apply theme settings",
        variant: "destructive",
      });
    }
  }, [currentTheme, toast]);

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