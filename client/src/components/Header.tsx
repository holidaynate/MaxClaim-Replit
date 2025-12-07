import logoImg from "@assets/IMG_20251121_130456_1763930875332.png";
import { AccessibilitySettings } from "@/components/AccessibilitySettings";
import { AuthButton } from "@/components/AuthButton";

export default function Header() {
  return (
    <header className="border-b bg-card sticky top-0 z-50" role="banner">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img 
            src={logoImg} 
            alt="Max-Claim Logo - Free consumer advocacy tool for insurance claims" 
            className="h-12 w-auto" 
          />
        </div>
        <p className="text-sm text-muted-foreground hidden sm:block" aria-label="Site tagline">
          Maximize Your Insurance Claim
        </p>
        <div className="ml-auto flex items-center gap-3">
          <AuthButton />
          <AccessibilitySettings />
        </div>
      </div>
    </header>
  );
}
