import { Calculator } from "lucide-react";

export default function Header() {
  return (
    <header className="border-b bg-card sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground p-2 rounded-md">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">MaxClaim</h1>
            <p className="text-xs text-muted-foreground">Consumer Advocacy Tool</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground hidden sm:block">
          Free Fair Market Value Analysis
        </p>
      </div>
    </header>
  );
}
