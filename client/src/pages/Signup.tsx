import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Rocket, Building2, CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import AgentSignupFlow from "@/components/signup/AgentSignupFlow";
import PartnerSignupFlow from "@/components/signup/PartnerSignupFlow";

type SignupRole = "agent" | "partner" | null;

interface BenefitItem {
  text: string;
}

interface RoleCardProps {
  title: string;
  subtitle: string;
  benefits: BenefitItem[];
  icon: typeof Rocket;
  iconColor: string;
  buttonText: string;
  buttonGradient: string;
  onSelect: () => void;
}

function RoleCard({ title, subtitle, benefits, icon: Icon, iconColor, buttonText, buttonGradient, onSelect }: RoleCardProps) {
  return (
    <Card 
      className="bg-slate-900/80 border-slate-700 hover:border-sky-500/50 transition-all cursor-pointer hover:shadow-xl hover:shadow-sky-500/10 hover:-translate-y-1"
      onClick={onSelect}
    >
      <CardContent className="p-6">
        <div className={`text-5xl mb-4 ${iconColor}`}>
          <Icon className="w-12 h-12" />
        </div>
        <h2 className="text-xl font-bold mb-2 text-slate-100">
          {title}
        </h2>
        <p className="text-slate-400 mb-5 text-sm">
          {subtitle}
        </p>
        <ul className="space-y-2 mb-6 text-sm">
          {benefits.map((benefit, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span className="text-slate-300">{benefit.text}</span>
            </li>
          ))}
        </ul>
        <Button 
          className={`w-full ${buttonGradient} text-white font-semibold`}
          data-testid={`button-select-${title.toLowerCase().includes('advocate') ? 'agent' : 'partner'}`}
        >
          {buttonText}
        </Button>
      </CardContent>
    </Card>
  );
}

function RoleSelector({ onSelect }: { onSelect: (role: SignupRole) => void }) {
  const agentBenefits: BenefitItem[] = [
    { text: "15-40% sliding scale commissions" },
    { text: "Recurring payments on renewals" },
    { text: "Share unique ref code" },
    { text: "DIY onboarding (no experience needed)" },
    { text: "Direct deposits via Stripe Connect" },
  ];

  const partnerBenefits: BenefitItem[] = [
    { text: "FREE tier (trade association members)" },
    { text: "Flexible paid plans ($500-$2,000/mo)" },
    { text: "Premium double-weight ad placement" },
    { text: "Edit, pause, or cancel anytime" },
    { text: "See real-time analytics & impressions" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-900 via-slate-950 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-slate-100 mb-2">
            Join MaxClaim
          </h1>
          <p className="text-slate-400 text-lg">
            Choose your path to make an impact on disaster recovery
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <RoleCard
            title="Become an Advocate"
            subtitle="Earn recurring commissions (15-40%) by connecting contractors, adjusters, and legal professionals to MaxClaim. Build a passive income stream."
            benefits={agentBenefits}
            icon={Rocket}
            iconColor="text-sky-400"
            buttonText="Start Earning"
            buttonGradient="bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700"
            onSelect={() => onSelect("agent")}
          />

          <RoleCard
            title="Advertise Your Services"
            subtitle="Connect with homeowners actively filing disaster claims. Flexible plans starting free (via membership) or paid sponsorships up to premium."
            benefits={partnerBenefits}
            icon={Building2}
            iconColor="text-purple-400"
            buttonText="Get Listed"
            buttonGradient="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
            onSelect={() => onSelect("partner")}
          />
        </div>

        <div className="text-center mt-10 text-slate-500 text-sm">
          <p>
            MaxClaim users file claims for FREE during disasters. Both Agents and Partners benefit from massive adoption.
          </p>
          <p className="mt-4">
            Already have an account?{" "}
            <a href="/signin" className="text-sky-400 hover:text-sky-300 font-medium" data-testid="link-signin">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Signup() {
  const [role, setRole] = useState<SignupRole>(null);

  if (!role) {
    return <RoleSelector onSelect={setRole} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-900 via-slate-950 to-slate-900 p-4">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => setRole(null)}
          className="text-slate-400 hover:text-slate-200 mb-4"
          data-testid="button-back-to-roles"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Choose different path
        </Button>
        
        {role === "agent" ? (
          <AgentSignupFlow />
        ) : (
          <PartnerSignupFlow />
        )}
      </div>
    </div>
  );
}
