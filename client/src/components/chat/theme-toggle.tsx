
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { defaultThemes } from "@shared/themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { currentTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => setMounted(true), []);

  const toggleTheme = () => {
    if (isAnimating) return;

    setIsAnimating(true);
    const isDark = currentTheme.appearance === "dark";
    const currentStyle = currentTheme.name.toLowerCase().includes("minimal") ? "Minimal" : "iMessage";
    const newTheme = defaultThemes.find(t => 
      t.name === `${currentStyle} ${isDark ? "Light" : "Dark"}`
    );
    
    if (newTheme) {
      setTheme(newTheme);
    }
    setTimeout(() => setIsAnimating(false), 200);
  };

  if (!mounted) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={`h-9 w-9 relative transition-transform duration-200 ease-in-out ${
        isAnimating ? 'scale-90' : 'scale-100'
      }`}
      title={`Switch to ${currentTheme.appearance === "dark" ? "light" : "dark"} mode`}
      aria-label={`Switch to ${currentTheme.appearance === "dark" ? "light" : "dark"} mode`}
    >
      {currentTheme.appearance === "dark" ? (
        <Sun className="h-4 w-4 transition-all duration-200" />
      ) : (
        <Moon className="h-4 w-4 transition-all duration-200" />
      )}
    </Button>
  );
}
