import { ExternalLink, Phone, Star } from "lucide-react";

interface Contractor {
  name: string;
  zips: string[];
  phone: string;
  website: string;
  services: string;
  featured: boolean;
  active: boolean;
}

const CONTRACTORS: Contractor[] = [
  {
    name: "Austin Roofing & Construction",
    zips: ["78701", "78702", "78703", "78704", "78705", "78735", "78736", "78737", "78738", "78739"],
    phone: "(512) 420-7663",
    website: "https://example.com?ref=maxclaim",
    services: "Full replacement • Storm repair • Insurance scope alignment",
    featured: true,
    active: true,
  },
  {
    name: "Greater Austin Roofers",
    zips: ["78750", "78751", "78752", "78753", "78754", "78755", "78756", "78757", "78758", "78759"],
    phone: "(512) 835-7663",
    website: "https://example.com?ref=maxclaim",
    services: "Hail / wind claims • Residential reroofs",
    featured: true,
    active: true,
  },
  {
    name: "Storm Guard of SW Austin",
    zips: ["78730", "78731", "78732", "78733", "78734", "78735", "78736", "78737", "78738", "78739"],
    phone: "(512) 686-7663",
    website: "https://example.com?ref=maxclaim",
    services: "Emergency tarps • Full roof and exterior",
    featured: false,
    active: true,
  },
];

function getByZip(zip: string): Contractor[] {
  if (!zip) return CONTRACTORS.filter((c) => c.active && c.featured);
  const local = CONTRACTORS.filter(
    (c) => c.active && c.zips.includes(zip)
  );
  return local.length ? local : CONTRACTORS.filter((c) => c.active && c.featured);
}

interface ContractorPanelProps {
  userZip: string;
}

export default function ContractorPanel({ userZip }: ContractorPanelProps) {
  const list = getByZip(userZip);

  return (
    <aside className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-50" data-testid="text-contractor-panel-heading">
          Local Pros to Fix It Right
        </h3>
        {userZip && (
          <span className="text-[11px] text-slate-400" data-testid="text-contractor-zip">
            ZIP {userZip}
          </span>
        )}
      </div>
      <p className="text-[11px] text-slate-400 mb-3">
        These are independent, licensed contractors. MaxClaim is free for
        homeowners and may receive referral fees from some partners. Always
        verify licenses and insurance.
      </p>
      <div className="space-y-3">
        {list.map((c) => (
          <div
            key={c.name}
            className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 hover-elevate"
            data-testid={`card-contractor-${c.name.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-semibold text-slate-50">
                    {c.name}
                  </h4>
                  {c.featured && (
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">{c.services}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <a
                href={`tel:${c.phone.replace(/\D/g, '')}`}
                className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-sky-500/10 border border-sky-500/20 px-3 py-1.5 text-[11px] font-semibold text-sky-300 hover:bg-sky-500/20 transition"
                data-testid={`button-call-${c.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Phone className="w-3 h-3" />
                Call Now
              </a>
              <a
                href={c.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-slate-600 px-3 py-1.5 text-[11px] font-semibold text-slate-300 hover:border-sky-400 hover:text-sky-200 transition"
                data-testid={`button-website-${c.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <ExternalLink className="w-3 h-3" />
                Website
              </a>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 p-3 rounded-lg bg-sky-500/5 border border-sky-500/10">
        <p className="text-[11px] text-slate-400">
          <span className="font-semibold text-sky-300">Contractor?</span> Join our referral network.{" "}
          <a href="#partner-with-maxclaim" className="text-sky-300 underline hover:text-sky-200">
            Learn more
          </a>
        </p>
      </div>
    </aside>
  );
}
