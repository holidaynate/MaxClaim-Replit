import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, DollarSign, RefreshCw, Target, TrendingUp, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AgentFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  birthYear: number;
  region: string;
}

function CommissionPitchPage({ onNext }: { onNext: () => void }) {
  return (
    <Card className="bg-slate-900/90 border-slate-700" role="region" aria-labelledby="commission-heading">
      <CardHeader>
        <CardTitle id="commission-heading" className="text-2xl text-slate-100 flex items-center gap-2">
          <DollarSign className="w-7 h-7 text-emerald-400" aria-hidden="true" />
          Build Your Commission Empire
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Section
          icon={Target}
          title="What You'll Do"
          description="Share MaxClaim with contractors, adjusters, attorneys, and trade associations. Every partner who signs up earns you commissions."
        />

        <Section
          icon={TrendingUp}
          title="Commissions: 15-40% (Sliding Scale)"
          description={`• Standard Partner ($500/mo): 20% commission
• Premium Partner ($1,000/mo): 25% commission
• Renewals: 15% (paid annually for 5-10 years!)
• Bonuses: Up to 40% for high-volume deals

Example: Close a $500/mo premium partner → $1,250 year 1 (25% × $500 × 12), plus $750/year forever (renewal rate).`}
        />

        <Section
          icon={RefreshCw}
          title="Recurring Income (Like Insurance Agents)"
          description="Every month a partner renews with MaxClaim, you get paid. Most insurance carriers pay agents ongoing commissions forever — MaxClaim does the same. Build passive income that compounds year over year."
        />

        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4" role="region" aria-label="Commission projection example">
          <h4 className="font-semibold text-emerald-400 mb-2">Real Example: 5-Year Projection</h4>
          <div className="text-sm text-slate-300 space-y-1">
            <p>Year 1: Close 5 partners at $500 per month = <span className="text-emerald-300 font-mono">$6,000</span></p>
            <p>Year 2: 5 renewals + 5 new = <span className="text-emerald-300 font-mono">$9,750</span></p>
            <p>Year 3: 10 renewals + 5 new = <span className="text-emerald-300 font-mono">$13,500</span></p>
            <p>Year 5: 20 renewals + 5 new = <span className="text-emerald-300 font-mono">$21,000+</span></p>
          </div>
        </div>

        <Button 
          onClick={onNext}
          className="w-full bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white py-5 text-lg font-semibold min-h-[52px]"
          data-testid="button-continue-to-form"
          aria-label="Continue to agent registration form"
        >
          I'm Ready to Earn — Let's Go
        </Button>
      </CardContent>
    </Card>
  );
}

function Section({ icon: Icon, title, description }: { icon: typeof Target; title: string; description: string }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-sky-400" aria-hidden="true" />
        <h3 className="font-semibold text-slate-100">{title}</h3>
      </div>
      <p className="text-slate-400 text-sm whitespace-pre-line pl-7">{description}</p>
    </section>
  );
}

function AgentFormPage({ data, setData, onSubmit, isLoading }: { 
  data: AgentFormData; 
  setData: (data: AgentFormData) => void; 
  onSubmit: () => void;
  isLoading: boolean;
}) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 60 }, (_, i) => currentYear - 18 - i);

  const regions = [
    { value: "national", label: "National (All States)" },
    { value: "southwest", label: "Southwest (TX, OK, NM, AZ)" },
    { value: "southeast", label: "Southeast (FL, GA, SC, NC)" },
    { value: "midwest", label: "Midwest (IL, MO, KS, OK)" },
    { value: "west", label: "West Coast (CA, OR, WA)" },
    { value: "northeast", label: "Northeast (NY, PA, NJ, MA)" },
  ];

  return (
    <Card className="bg-slate-900/90 border-slate-700" role="region" aria-labelledby="agent-form-heading">
      <CardHeader>
        <CardTitle id="agent-form-heading" className="text-xl text-slate-100">Create Your Agent Account</CardTitle>
      </CardHeader>
      <CardContent>
        <form 
          onSubmit={(e) => { e.preventDefault(); onSubmit(); }} 
          className="space-y-4"
          aria-label="Agent registration form"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-slate-300">First Name</Label>
              <Input
                id="firstName"
                value={data.firstName}
                onChange={(e) => setData({ ...data, firstName: e.target.value })}
                className="bg-slate-800 border-slate-600 text-slate-100"
                required
                data-testid="input-agent-firstname"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-slate-300">Last Name</Label>
              <Input
                id="lastName"
                value={data.lastName}
                onChange={(e) => setData({ ...data, lastName: e.target.value })}
                className="bg-slate-800 border-slate-600 text-slate-100"
                required
                data-testid="input-agent-lastname"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-300">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={data.email}
              onChange={(e) => setData({ ...data, email: e.target.value })}
              className="bg-slate-800 border-slate-600 text-slate-100"
              required
              data-testid="input-agent-email"
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
              data-testid="input-agent-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-slate-300">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={data.phone}
              onChange={(e) => setData({ ...data, phone: e.target.value })}
              className="bg-slate-800 border-slate-600 text-slate-100"
              placeholder="(555) 123-4567"
              data-testid="input-agent-phone"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="birthYear" className="text-slate-300">Birth Year</Label>
              <Select 
                value={data.birthYear.toString()} 
                onValueChange={(v) => setData({ ...data, birthYear: parseInt(v) })}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-100" data-testid="select-agent-birthyear">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="region" className="text-slate-300">Target Region</Label>
              <Select 
                value={data.region} 
                onValueChange={(v) => setData({ ...data, region: v })}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-100" data-testid="select-agent-region">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((region) => (
                    <SelectItem key={region.value} value={region.value}>{region.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white py-5 font-semibold min-h-[52px]"
              data-testid="button-submit-agent-signup"
              aria-label={isLoading ? "Creating your account, please wait" : "Create Agent Account"}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                  <span role="status">Creating your account...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" aria-hidden="true" />
                  Create Agent Account
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-slate-500 text-center pt-2">
            By signing up, you agree to MaxClaim's Terms of Service and Privacy Policy. 
            Commissions are paid via Stripe Connect — you'll set that up after activation.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

export default function AgentSignupFlow() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<AgentFormData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    birthYear: 1990,
    region: "national",
  });

  const signupMutation = useMutation({
    mutationFn: async (formData: AgentFormData) => {
      const res = await apiRequest("POST", "/api/auth/signup/agent", {
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        birthYear: formData.birthYear,
        region: formData.region,
      });
      return res.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: "Welcome to MaxClaim!",
          description: `Your agent account has been created. Your ref code is ${result.refCode}`,
        });
        setLocation("/agent-dashboard");
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

  const handleSubmit = () => {
    signupMutation.mutate(data);
  };

  return step === 1 ? (
    <CommissionPitchPage onNext={() => setStep(2)} />
  ) : (
    <AgentFormPage 
      data={data} 
      setData={setData} 
      onSubmit={handleSubmit}
      isLoading={signupMutation.isPending}
    />
  );
}
