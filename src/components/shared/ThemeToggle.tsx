import { MoonStar, SunMedium } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { useTheme } from "@/context/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button variant="ghost" className="rounded-full px-3 py-3" onClick={toggleTheme} aria-label="Toggle theme">
      {theme === "light" ? <MoonStar className="h-4 w-4" /> : <SunMedium className="h-4 w-4" />}
    </Button>
  );
}
