import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { defaultThemes } from "@shared/themes";
import { useTheme } from "@/hooks/use-theme";

export function ThemeSelector() {
  const { setTheme, currentTheme } = useTheme();

  return (
    <Select
      value={currentTheme?.name}
      onValueChange={(name) => {
        const theme = defaultThemes.find((t) => t.name === name);
        if (theme) setTheme(theme);
      }}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select theme" />
      </SelectTrigger>
      <SelectContent>
        {defaultThemes.map((theme) => (
          <SelectItem key={theme.name} value={theme.name}>
            {theme.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
