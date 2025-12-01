import { useState } from "react";
import { Handshake, TrendingUp, Users } from "lucide-react";
import PartnerLOIModal from "./PartnerLOIModal";

export default function PartnerSection() {
  const [modalOpen, setModalOpen] = useState(false);
  const [partnerType, setPartnerType] = useState<"contractor" | "adjuster" | "agency">("contractor");
  const benefits = [
    {
      icon: Users,
      title: "Qualified Leads",
      description: "Connect with homeowners actively seeking restoration services",
    },
    {
      icon: TrendingUp,
      title: "Performance-Based",
      description: "Only pay for successful connections, no upfront fees",
    },
    {
      icon: Handshake,
      title: "Win-Win Model",
      description: "Homeowners get fair settlements, contractors get quality work",
    },
  ];

  return (
    <section id="partner-with-maxclaim" className="bg-gradient-to-br from-slate-900 via-slate-950 to-sky-950 border-t border-slate-800">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-50" data-testid="text-partner-heading">
            Partner with MaxClaim
          </h2>
          <p className="mt-3 text-slate-300 max-w-2xl mx-auto">
            Join our network of licensed contractors and public adjusters helping homeowners
            recover what they deserve from insurance claims.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3 mb-10">
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-center"
              data-testid={`card-benefit-${benefit.title.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-sky-500/10 text-sky-400 mb-3">
                <benefit.icon className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-50 mb-2">
                {benefit.title}
              </h3>
              <p className="text-xs text-slate-400">{benefit.description}</p>
            </div>
          ))}
        </div>

        <div className="max-w-2xl mx-auto rounded-2xl border border-sky-700/40 bg-slate-900/60 p-8 text-center">
          <h3 className="text-xl font-semibold text-slate-50 mb-3" data-testid="text-partner-cta-heading">
            Ready to grow your business?
          </h3>
          <p className="text-sm text-slate-300 mb-6">
            Complete our partner application and start receiving qualified leads in your service area.
            We serve homeowners in Texas and expanding nationwide in 2026.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                setPartnerType("contractor");
                setModalOpen(true);
              }}
              className="inline-flex items-center justify-center rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/40 hover:bg-sky-400 transition"
              data-testid="button-partner-apply"
            >
              Apply as Contractor
            </button>
            <button
              onClick={() => {
                setPartnerType("adjuster");
                setModalOpen(true);
              }}
              className="inline-flex items-center justify-center rounded-full border border-slate-600 px-6 py-3 text-sm font-semibold text-slate-100 hover:border-sky-400 hover:text-sky-200 transition"
              data-testid="button-partner-adjuster"
            >
              Apply as Public Adjuster
            </button>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Questions? Email us at{" "}
            <a href="mailto:partners@max-claim.com" className="text-sky-400 hover:text-sky-300 underline">
              partners@max-claim.com
            </a>
          </p>
        </div>
      </div>

      <PartnerLOIModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultType={partnerType}
      />
    </section>
  );
}
