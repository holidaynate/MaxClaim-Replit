import { ExternalLink } from "lucide-react";

export default function ResourceBand() {
  const resources = [
    {
      name: "FEMA",
      description: "Disaster assistance",
      url: "https://www.fema.gov/assistance/individual",
    },
    {
      name: "211 Services",
      description: "Local help hotline",
      url: "https://www.211.org/",
    },
    {
      name: "SBA Loans",
      description: "Disaster loans",
      url: "https://www.sba.gov/funding-programs/disaster-assistance",
    },
    {
      name: "HUD",
      description: "Housing resources",
      url: "https://www.hud.gov/info/disasters",
    },
  ];

  return (
    <aside className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <h3 className="text-sm font-semibold text-slate-50 mb-2" data-testid="text-resources-heading">
        Disaster Relief Resources
      </h3>
      <p className="text-[11px] text-slate-400 mb-3">
        Free government and non-profit assistance for disaster-affected homeowners.
      </p>
      <div className="space-y-2">
        {resources.map((resource) => (
          <a
            key={resource.name}
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-2 rounded-lg border border-slate-700 bg-slate-950/70 hover-elevate text-[11px] transition"
            data-testid={`link-resource-${resource.name.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <div>
              <div className="font-semibold text-slate-50">{resource.name}</div>
              <div className="text-slate-400">{resource.description}</div>
            </div>
            <ExternalLink className="w-3 h-3 text-slate-500" />
          </a>
        ))}
      </div>
      <div className="mt-3 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
        <p className="text-[11px] text-slate-400">
          <span className="font-semibold text-emerald-300">Texas-specific:</span> Visit{" "}
          <a
            href="https://www.tdi.texas.gov/consumer/claims/index.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-300 underline hover:text-emerald-200"
          >
            Texas DOI
          </a>{" "}
          for insurance complaints.
        </p>
      </div>
    </aside>
  );
}
