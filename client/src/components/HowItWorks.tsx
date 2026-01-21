import { Upload, Brain, TrendingUp } from "lucide-react";

export default function HowItWorks() {
  const steps = [
    {
      icon: Upload,
      title: "Upload your documents",
      body: "Insurance estimate, contractor scope, or settlement documents. PDF or clear photos.",
    },
    {
      icon: Brain,
      title: "AI scans for missed value",
      body: "We check for missing line items, low pricing, and improper depreciation.",
    },
    {
      icon: TrendingUp,
      title: "See options & local help",
      body: "View a summary and connect with licensed local pros in your ZIP.",
    },
  ];

  return (
    <section className="bg-slate-950 border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h2 className="text-xl sm:text-2xl font-semibold text-slate-50" data-testid="text-how-it-works-heading">
          How MaxClaim Works
        </h2>
        <p className="mt-2 text-sm text-slate-400 max-w-2xl" data-testid="text-how-it-works-description">
          A simple 3‑step flow built for stressed homeowners, busy contractors,
          and public adjusters who need fast, clean answers.
        </p>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
              data-testid={`card-step-${i + 1}`}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-sky-500/10 text-sky-400">
                  <s.icon className="w-5 h-5" />
                </div>
                <div className="text-xs text-sky-400 font-semibold">
                  STEP {i + 1}
                </div>
              </div>
              <h3 className="text-sm font-semibold text-slate-50">
                {s.title}
              </h3>
              <p className="mt-2 text-xs text-slate-400">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
