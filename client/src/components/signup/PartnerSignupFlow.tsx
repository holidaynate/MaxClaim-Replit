import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle2, Building2, Loader2, Star, Zap, Crown, ArrowLeft, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PlanBuilderStep } from "./PlanBuilderStep";

type PartnerType = "contractor" | "adjuster" | "agency";
type PricingTier = "free" | "standard" | "premium";

interface PartnerFormData {
  companyName: string;
  type: PartnerType;
  contactPerson: string;
  email: string;
  password: string;
  phone: string;
  website: string;
  licenseNumber: string;
  zipCode: string;
  pricingTier: PricingTier;
  referralCode: string;
}

const tradeTypeMap: Record<PartnerType, string> = {
  contractor: "general_contractor",
  adjuster: "public_adjuster",
  agency: "insurance_attorney",
};

const tierInfo: Record<PricingTier, { title: string; price: string; icon: typeof Star; features: string[] }> = {
  free: {
    title: "Free Tier",
    price: "FREE",
    icon: Star,
    features: [
      "Available via trade association membership",
      "Basic listing in directory",
      "Standard rotation weight",
      "Monthly analytics report",
    ],
  },
  standard: {
    title: "Standard",
    price: "$500/mo",
    icon: Zap,
    features: [
      "Priority listing placement",
      "2x rotation weight",
      "Weekly analytics dashboard",
      "Lead notifications",
      "Edit listing anytime",
    ],
  },
  premium: {
    title: "Premium",
    price: "$2,000/mo",
    icon: Crown,
    features: [
      "Top placement guarantee",
      "4x rotation weight",
      "Real-time analytics",
      "Direct lead routing",
      "Custom branding options",
      "Dedicated account manager",
    ],
  },
};

function TierSelector({ selected, onSelect }: { selected: PricingTier; onSelect: (tier: PricingTier) => void }) {
  return (
    <div className="space-y-4">
      <Label className="text-slate-300 text-base font-medium">Choose Your Plan</Label>
      <RadioGroup value={selected} onValueChange={(v) => onSelect(v as PricingTier)}>
        {(["free", "standard", "premium"] as PricingTier[]).map((tier) => {
          const info = tierInfo[tier];
          const Icon = info.icon;
          return (
            <div
              key={tier}
              className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all ${
                selected === tier 
                  ? "border-purple-500 bg-purple-500/10" 
                  : "border-slate-700 hover:border-slate-600"
              }`}
              onClick={() => onSelect(tier)}
            >
              <div className="flex items-start gap-4">
                <RadioGroupItem value={tier} id={tier} className="mt-1" data-testid={`radio-tier-${tier}`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-5 h-5 ${tier === 'premium' ? 'text-amber-400' : tier === 'standard' ? 'text-purple-400' : 'text-emerald-400'}`} />
                      <span className="font-semibold text-slate-100">{info.title}</span>
                    </div>
                    <span className={`font-bold ${tier === 'free' ? 'text-emerald-400' : 'text-slate-100'}`}>
                      {info.price}
                    </span>
                  </div>
                  <ul className="text-sm text-slate-400 space-y-1">
                    {info.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}

export default function PartnerSignupFlow() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<PartnerFormData>({
    companyName: "",
    type: "contractor",
    contactPerson: "",
    email: "",
    password: "",
    phone: "",
    website: "",
    licenseNumber: "",
    zipCode: "",
    pricingTier: "standard",
    referralCode: "",
  });

  const signupMutation = useMutation({
    mutationFn: async (formData: PartnerFormData) => {
      const res = await apiRequest("POST", "/api/auth/signup/partner", {
        companyName: formData.companyName,
        type: formData.type,
        contactPerson: formData.contactPerson,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        website: formData.website,
        licenseNumber: formData.licenseNumber,
        pricingTier: formData.pricingTier,
        referralCode: formData.referralCode || undefined,
      });
      return res.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: "Welcome to MaxClaim!",
          description: "Your partner account is pending approval. We'll notify you shortly.",
        });
        setLocation("/partner-dashboard");
      } else {
        toast({
          title: "Signup failed",
          description: result.message || "Please try again",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else {
      signupMutation.mutate(data);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return "Company Information";
      case 2: return "Choose Your Plan";
      case 3: return "Your AI-Powered Ad Plan";
      default: return "";
    }
  };

  const partnerTypes = [
    { value: "contractor", label: "Contractor (Roofing, Restoration, etc.)" },
    { value: "adjuster", label: "Public Adjuster" },
    { value: "agency", label: "Agency / Legal / Trade Org" },
  ];

  return (
    <Card className="bg-slate-900/90 border-slate-700">
      <CardHeader>
        <CardTitle className="text-xl text-slate-100 flex items-center gap-2">
          {step === 3 ? (
            <Sparkles className="w-6 h-6 text-purple-400" />
          ) : (
            <Building2 className="w-6 h-6 text-purple-400" />
          )}
          {getStepTitle()}
        </CardTitle>
        <div className="flex gap-2 mt-2">
          <div className={`h-1 flex-1 rounded ${step >= 1 ? 'bg-purple-500' : 'bg-slate-700'}`} />
          <div className={`h-1 flex-1 rounded ${step >= 2 ? 'bg-purple-500' : 'bg-slate-700'}`} />
          <div className={`h-1 flex-1 rounded ${step >= 3 ? 'bg-purple-500' : 'bg-slate-700'}`} />
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 1 ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-slate-300">Company Name</Label>
                <Input
                  id="companyName"
                  value={data.companyName}
                  onChange={(e) => setData({ ...data, companyName: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-slate-100"
                  required
                  data-testid="input-partner-company"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type" className="text-slate-300">Business Type</Label>
                <Select value={data.type} onValueChange={(v) => setData({ ...data, type: v as PartnerType })}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-100" data-testid="select-partner-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {partnerTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPerson" className="text-slate-300">Contact Person</Label>
                <Input
                  id="contactPerson"
                  value={data.contactPerson}
                  onChange={(e) => setData({ ...data, contactPerson: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-slate-100"
                  required
                  data-testid="input-partner-contact"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">Business Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={data.email}
                  onChange={(e) => setData({ ...data, email: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-slate-100"
                  required
                  data-testid="input-partner-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={data.password}
                  onChange={(e) => setData({ ...data, password: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-slate-100"
                  placeholder="Create a secure password"
                  minLength={8}
                  required
                  data-testid="input-partner-password"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-slate-300">Business Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={data.phone}
                    onChange={(e) => setData({ ...data, phone: e.target.value })}
                    className="bg-slate-800 border-slate-600 text-slate-100"
                    required
                    data-testid="input-partner-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode" className="text-slate-300">Service Area ZIP</Label>
                  <Input
                    id="zipCode"
                    value={data.zipCode}
                    onChange={(e) => setData({ ...data, zipCode: e.target.value.replace(/\D/g, '').slice(0, 5) })}
                    className="bg-slate-800 border-slate-600 text-slate-100"
                    placeholder="e.g., 77001"
                    maxLength={5}
                    required
                    data-testid="input-partner-zip"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="website" className="text-slate-300">Website (optional)</Label>
                  <Input
                    id="website"
                    type="url"
                    value={data.website}
                    onChange={(e) => setData({ ...data, website: e.target.value })}
                    className="bg-slate-800 border-slate-600 text-slate-100"
                    placeholder="https://"
                    data-testid="input-partner-website"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber" className="text-slate-300">License # (optional)</Label>
                  <Input
                    id="licenseNumber"
                    value={data.licenseNumber}
                    onChange={(e) => setData({ ...data, licenseNumber: e.target.value })}
                    className="bg-slate-800 border-slate-600 text-slate-100"
                    data-testid="input-partner-license"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="referralCode" className="text-slate-300">Agent Referral Code (optional)</Label>
                <Input
                  id="referralCode"
                  value={data.referralCode}
                  onChange={(e) => setData({ ...data, referralCode: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-slate-100"
                  placeholder="e.g., MarRod8125"
                  data-testid="input-partner-referral"
                />
                <p className="text-xs text-slate-500">If an agent referred you, enter their code for tracking.</p>
              </div>
            </>
          ) : step === 2 ? (
            <TierSelector 
              selected={data.pricingTier} 
              onSelect={(tier) => setData({ ...data, pricingTier: tier })} 
            />
          ) : (
            <PlanBuilderStep
              zipCode={data.zipCode}
              tradeType={tradeTypeMap[data.type]}
              tier={data.pricingTier}
            />
          )}

          <div className="pt-4 flex gap-3">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="border-slate-600 text-slate-300"
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            <Button
              type="submit"
              disabled={signupMutation.isPending}
              className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold"
              data-testid={step === 1 ? "button-continue-to-pricing" : step === 2 ? "button-continue-to-plan" : "button-submit-partner-signup"}
            >
              {signupMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : step === 1 ? (
                "Continue to Pricing"
              ) : step === 2 ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  See Your AI Plan
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Create Partner Account
                </>
              )}
            </Button>
          </div>

          {step === 3 && (
            <p className="text-xs text-slate-500 text-center pt-2">
              By signing up, you agree to MaxClaim's Terms of Service. 
              {data.pricingTier !== "free" && " Payment will be collected after approval via Stripe."}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
