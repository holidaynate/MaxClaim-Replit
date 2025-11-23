import logoImg from "@assets/IMG_20251121_130456_1763930875332.png";

export default function Header() {
  return (
    <header className="border-b bg-card sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logoImg} alt="Max-Claim Logo" className="h-12 w-auto" />
        </div>
        <p className="text-sm text-muted-foreground hidden sm:block">
          Maximize Your Insurance Claim
        </p>
      </div>
    </header>
  );
}
