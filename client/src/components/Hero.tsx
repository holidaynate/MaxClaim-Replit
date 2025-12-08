import { CheckCircle2 } from "lucide-react";

export default function Hero() {
  return (
    <section className="bg-gradient-to-br from-sky-900 via-slate-950 to-slate-900 border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-4 py-14 lg:py-20 grid gap-10 lg:grid-cols-2 items-center">
        <div>
          <p className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 text-xs font-semibold mb-4" data-testid="text-beta-badge">
            MaxClaim Recovery Suite · Free Beta
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-slate-50" data-testid="text-hero-heading">
            AI-Powered Disaster Claim Review{" "}
            <span className="block text-sky-300">
              for Homeowners, Contractors & Public Adjusters
            </span>
          </h1>
          <p className="mt-4 text-slate-300 text-sm sm:text-base max-w-xl" data-testid="text-hero-description">
            Upload your insurance estimate and see where you may be underpaid.
            MaxClaim analyzes missed line items, low material pricing, and bad
            depreciation — in seconds. Bilingual. Mobile-first. Free to use.
          </p>
          <p className="mt-2 text-xs text-slate-400" data-testid="text-hero-note">
            No login required. No obligations. Built in Texas for disaster‑hit
            and underserved communities.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="#claim-wizard"
              className="inline-flex items-center justify-center rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/40 hover:bg-sky-400 transition"
              data-testid="button-hero-start-analysis"
            >
              Start Free Analysis
            </a>
            <a
              href="#partner-with-maxclaim"
              className="inline-flex items-center justify-center rounded-full border border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-100 hover:border-sky-400 hover:text-sky-200 transition"
              data-testid="button-hero-for-contractors"
            >
              For Contractors & Adjusters
            </a>
          </div>

          <div className="mt-5 flex flex-wrap gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Instant claim analysis
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Bilingual UX
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Local contractor referrals
            </span>
          </div>
        </div>

        <div className="relative">
          <div className="rounded-2xl border border-sky-700/40 bg-slate-900/60 p-4 shadow-2xl shadow-sky-900/60" data-testid="card-sample-claim">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Sample Claim Review</span>
              <span>MaxClaim AI · Beta</span>
            </div>
            <div className="space-y-2 text-xs bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Carrier Estimate</span>
                <span className="font-mono text-amber-300">$12,450.78</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">MaxClaim Target</span>
                <span className="font-mono text-emerald-300">$16,320.40</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2">
                <span className="text-slate-400">Potential Lift</span>
                <span className="font-mono text-sky-300">+ $3,869.62</span>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-slate-500">
              Example only. Actual results depend on carrier, policy, and scope.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
