
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { defaultThemes } from "@shared/themes";

export function ThemeToggle() {
  const { currentTheme, setTheme } = useTheme();
  
  const toggleTheme = () => {
    const isDark = currentTheme.appearance === "dark";
    const newTheme = defaultThemes.find(t => 
      t.appearance === (isDark ? "light" : "dark")
    );
    if (newTheme) setTheme(newTheme);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-9 w-9"
    >
      {currentTheme.appearance === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}
