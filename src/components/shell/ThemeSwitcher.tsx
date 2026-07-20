import { useTheme } from "@/providers/ThemeProvider";
import { Moon, Sun } from "lucide-react";
import { Tooltip } from "@/components/ui/misc";

export function ThemeSwitcher() {
  const { theme, toggle } = useTheme();
  return (
    <Tooltip content={theme === "dark" ? "Switch to light" : "Switch to dark"}>
      <button
        onClick={toggle}
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label="Toggle theme"
      >
        {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </button>
    </Tooltip>
  );
}
