import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Check, DollarSign, Target, TrendingUp } from "lucide-react";
import ProgressSteps from "@/components/ProgressSteps";

const TEXAS_ZIP_CODES = [
  { label: "Houston Metro (770XX-772XX)", value: "77" },
  { label: "Dallas Metro (750XX-753XX)", value: "75" },
  { label: "San Antonio (782XX)", value: "78" },
  { label: "Austin (787XX)", value: "787" },
  { label: "Fort Worth (761XX)", value: "761" },
  { label: "El Paso (799XX)", value: "799" },
  { label: "Corpus Christi (784XX)", value: "784" },
  { label: "All of Texas", value: "all" },
];

interface PricingPreferences {
  cpc?: {
    enabled: boolean;
    amount: number;
    budgetPeriod: "daily" | "monthly";
    budgetCap: number;
  };
  affiliate?: {
    enabled: boolean;
    commissionPct: number;
    paymentTerms: string;
  };
  monthlyBanner?: {
    enabled: boolean;
    amount: number;
    size: string;
    placement: string;
  };
}

const partnerLOISchema = z.object({
  type: z.enum(["contractor", "adjuster", "agency"]),
  companyName: z.string().min(2, "Company name is required"),
  contactPerson: z.string().min(2, "Contact person is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  website: z.string().optional(),
  licenseNumber: z.string().optional(),
  zipCodes: z.array(z.string()).min(1, "Select at least one service area"),
  pricingPreferences: z.object({
    cpc: z.object({
      enabled: z.boolean(),
      amount: z.number().optional(),
      budgetPeriod: z.enum(["daily", "monthly"]).optional(),
      budgetCap: z.number().optional(),
    }).optional(),
    affiliate: z.object({
      enabled: z.boolean(),
      commissionPct: z.number().optional(),
      paymentTerms: z.string().optional(),
    }).optional(),
    monthlyBanner: z.object({
      enabled: z.boolean(),
      amount: z.number().optional(),
      size: z.string().optional(),
      placement: z.string().optional(),
    }).optional(),
  }),
  notes: z.string().optional(),
});

type PartnerLOIFormData = z.infer<typeof partnerLOISchema>;

interface PartnerLOIModalProps {
  open: boolean;
  onClose: () => void;
  defaultType?: "contractor" | "adjuster" | "agency";
}

export default function PartnerLOIModal({ open, onClose, defaultType }: PartnerLOIModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { toast } = useToast();

  const steps = ["Type", "Details", "Service Areas", "Pricing", "Review"];

  const form = useForm<PartnerLOIFormData>({
    resolver: zodResolver(partnerLOISchema),
    defaultValues: {
      type: defaultType || "contractor",
      companyName: "",
      contactPerson: "",
      email: "",
      phone: "",
      website: "",
      licenseNumber: "",
      zipCodes: [],
      pricingPreferences: {
        cpc: { enabled: false },
        affiliate: { enabled: false },
        monthlyBanner: { enabled: false },
      },
      notes: "",
    },
  });

  const submitLOIMutation = useMutation({
    mutationFn: async (data: PartnerLOIFormData) => {
      const response = await apiRequest("POST", "/api/partners/loi", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted!",
        description: "We'll review your application and contact you within 2-3 business days.",
      });
      onClose();
      form.reset();
      setCurrentStep(0);
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Please try again or contact support.",
        variant: "destructive",
      });
    },
  });

  const handleNext = async () => {
    let isValid = false;
    
    switch (currentStep) {
      case 0:
        isValid = await form.trigger("type");
        break;
      case 1:
        isValid = await form.trigger(["companyName", "contactPerson", "email", "phone"]);
        break;
      case 2:
        isValid = await form.trigger("zipCodes");
        break;
      case 3:
        isValid = true; // Pricing is optional
        break;
      default:
        isValid = true;
    }

    if (isValid) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleSubmit = form.handleSubmit((data) => {
    submitLOIMutation.mutate(data);
  });

  const pricing = form.watch("pricingPreferences");
  const selectedZips = form.watch("zipCodes");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-partner-loi">
        <DialogHeader>
          <DialogTitle className="text-2xl">Partner Application</DialogTitle>
          <DialogDescription>
            Join the MaxClaim network and start receiving qualified leads
          </DialogDescription>
        </DialogHeader>

        <ProgressSteps currentStep={currentStep} steps={steps} />

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 0: Partner Type */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="type">I am a...</Label>
                <Select
                  value={form.watch("type")}
                  onValueChange={(value) => form.setValue("type", value as any)}
                >
                  <SelectTrigger data-testid="select-partner-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contractor">Licensed Contractor</SelectItem>
                    <SelectItem value="adjuster">Public Adjuster</SelectItem>
                    <SelectItem value="agency">Insurance Agency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground">
                {form.watch("type") === "contractor" && "Contractors receive qualified leads for restoration work in their service area."}
                {form.watch("type") === "adjuster" && "Public adjusters can refer clients and earn commission on successful claims."}
                {form.watch("type") === "agency" && "Agencies can white-label our analysis tool for their clients."}
              </p>
            </div>
          )}

          {/* Step 1: Company Details */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  {...form.register("companyName")}
                  data-testid="input-company-name"
                  placeholder="ABC Restoration Services"
                />
                {form.formState.errors.companyName && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.companyName.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="licenseNumber">License Number</Label>
                <Input
                  {...form.register("licenseNumber")}
                  data-testid="input-license-number"
                  placeholder="TX-12345"
                />
              </div>

              <div>
                <Label htmlFor="contactPerson">Contact Person *</Label>
                <Input
                  {...form.register("contactPerson")}
                  data-testid="input-contact-person"
                  placeholder="John Smith"
                />
                {form.formState.errors.contactPerson && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.contactPerson.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    {...form.register("email")}
                    data-testid="input-email"
                    type="email"
                    placeholder="john@abc.com"
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.email.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    {...form.register("phone")}
                    data-testid="input-phone"
                    placeholder="(555) 123-4567"
                  />
                  {form.formState.errors.phone && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.phone.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="website">Website (optional)</Label>
                <Input
                  {...form.register("website")}
                  data-testid="input-website"
                  placeholder="https://abc.com"
                />
              </div>
            </div>
          )}

          {/* Step 2: Service Areas */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <Label>Select Your Service Areas *</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Choose the ZIP code prefixes where you operate
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {TEXAS_ZIP_CODES.map((zip) => {
                    const isSelected = selectedZips.includes(zip.value);
                    return (
                      <div
                        key={zip.value}
                        onClick={() => {
                          const current = selectedZips;
                          if (isSelected) {
                            form.setValue("zipCodes", current.filter(z => z !== zip.value));
                          } else {
                            form.setValue("zipCodes", [...current, zip.value]);
                          }
                        }}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition ${
                          isSelected
                            ? "border-sky-500 bg-sky-500/10"
                            : "border-slate-700 hover:border-slate-600"
                        }`}
                        data-testid={`checkbox-zip-${zip.value}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-200">{zip.label}</span>
                          {isSelected && <Check className="w-4 h-4 text-sky-500" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {form.formState.errors.zipCodes && (
                  <p className="text-sm text-destructive mt-2">{form.formState.errors.zipCodes.message}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: À La Carte Pricing */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-50 mb-2">Choose Your Pricing Model</h3>
                <p className="text-sm text-muted-foreground">
                  Select one or more options that work for your business. You can customize budgets and rates.
                </p>
              </div>

              {/* CPC Option */}
              <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center">
                      <Target className="w-5 h-5 text-sky-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-50">Cost Per Click (CPC)</h4>
                      <p className="text-xs text-slate-400">Pay only when homeowners click your listing</p>
                    </div>
                  </div>
                  <Switch
                    checked={pricing.cpc?.enabled || false}
                    onCheckedChange={(checked) => {
                      form.setValue("pricingPreferences.cpc", {
                        enabled: checked,
                        amount: 5,
                        budgetPeriod: "daily",
                        budgetCap: 100,
                      });
                    }}
                    data-testid="switch-cpc"
                  />
                </div>

                {pricing.cpc?.enabled && (
                  <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-800">
                    <div>
                      <Label className="text-xs">Price per click</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-2 top-2.5 w-4 h-4 text-slate-400" />
                        <Input
                          type="number"
                          step="0.01"
                          className="pl-7"
                          value={pricing.cpc?.amount || 5}
                          onChange={(e) => {
                            const current = form.getValues("pricingPreferences.cpc");
                            form.setValue("pricingPreferences.cpc", {
                              ...current,
                              amount: parseFloat(e.target.value) || 0,
                            } as any);
                          }}
                          data-testid="input-cpc-amount"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Budget Period</Label>
                      <Select
                        value={pricing.cpc?.budgetPeriod || "daily"}
                        onValueChange={(value) => {
                          const current = form.getValues("pricingPreferences.cpc");
                          form.setValue("pricingPreferences.cpc", {
                            ...current,
                            budgetPeriod: value as "daily" | "monthly",
                          } as any);
                        }}
                      >
                        <SelectTrigger data-testid="select-cpc-period">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Budget Cap</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-2 top-2.5 w-4 h-4 text-slate-400" />
                        <Input
                          type="number"
                          className="pl-7"
                          value={pricing.cpc?.budgetCap || 100}
                          onChange={(e) => {
                            const current = form.getValues("pricingPreferences.cpc");
                            form.setValue("pricingPreferences.cpc", {
                              ...current,
                              budgetCap: parseFloat(e.target.value) || 0,
                            } as any);
                          }}
                          data-testid="input-cpc-budget"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Affiliate Option */}
              <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-50">Affiliate Commission</h4>
                      <p className="text-xs text-slate-400">Earn commission on successful claim recoveries</p>
                    </div>
                  </div>
                  <Switch
                    checked={pricing.affiliate?.enabled || false}
                    onCheckedChange={(checked) => {
                      form.setValue("pricingPreferences.affiliate", {
                        enabled: checked,
                        commissionPct: 15,
                        paymentTerms: "Net 30",
                      });
                    }}
                    data-testid="switch-affiliate"
                  />
                </div>

                {pricing.affiliate?.enabled && (
                  <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-800">
                    <div>
                      <Label className="text-xs">Commission %</Label>
                      <Input
                        type="number"
                        step="0.1"
                        max="100"
                        value={pricing.affiliate?.commissionPct || 15}
                        onChange={(e) => {
                          const current = form.getValues("pricingPreferences.affiliate");
                          form.setValue("pricingPreferences.affiliate", {
                            ...current,
                            commissionPct: parseFloat(e.target.value) || 0,
                          } as any);
                        }}
                        data-testid="input-affiliate-commission"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Payment Terms</Label>
                      <Select
                        value={pricing.affiliate?.paymentTerms || "Net 30"}
                        onValueChange={(value) => {
                          const current = form.getValues("pricingPreferences.affiliate");
                          form.setValue("pricingPreferences.affiliate", {
                            ...current,
                            paymentTerms: value,
                          } as any);
                        }}
                      >
                        <SelectTrigger data-testid="select-affiliate-terms">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Net 15">Net 15</SelectItem>
                          <SelectItem value="Net 30">Net 30</SelectItem>
                          <SelectItem value="Net 60">Net 60</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              {/* Monthly Banner Option */}
              <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-50">Monthly Banner Ad</h4>
                      <p className="text-xs text-slate-400">Fixed monthly fee for premium placement</p>
                    </div>
                  </div>
                  <Switch
                    checked={pricing.monthlyBanner?.enabled || false}
                    onCheckedChange={(checked) => {
                      form.setValue("pricingPreferences.monthlyBanner", {
                        enabled: checked,
                        amount: 500,
                        size: "Medium",
                        placement: "Sidebar",
                      });
                    }}
                    data-testid="switch-monthly-banner"
                  />
                </div>

                {pricing.monthlyBanner?.enabled && (
                  <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-800">
                    <div>
                      <Label className="text-xs">Monthly Amount</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-2 top-2.5 w-4 h-4 text-slate-400" />
                        <Input
                          type="number"
                          className="pl-7"
                          value={pricing.monthlyBanner?.amount || 500}
                          onChange={(e) => {
                            const current = form.getValues("pricingPreferences.monthlyBanner");
                            form.setValue("pricingPreferences.monthlyBanner", {
                              ...current,
                              amount: parseFloat(e.target.value) || 0,
                            } as any);
                          }}
                          data-testid="input-banner-amount"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Banner Size</Label>
                      <Select
                        value={pricing.monthlyBanner?.size || "Medium"}
                        onValueChange={(value) => {
                          const current = form.getValues("pricingPreferences.monthlyBanner");
                          form.setValue("pricingPreferences.monthlyBanner", {
                            ...current,
                            size: value,
                          } as any);
                        }}
                      >
                        <SelectTrigger data-testid="select-banner-size">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Small">Small</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="Large">Large</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Placement</Label>
                      <Select
                        value={pricing.monthlyBanner?.placement || "Sidebar"}
                        onValueChange={(value) => {
                          const current = form.getValues("pricingPreferences.monthlyBanner");
                          form.setValue("pricingPreferences.monthlyBanner", {
                            ...current,
                            placement: value,
                          } as any);
                        }}
                      >
                        <SelectTrigger data-testid="select-banner-placement">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sidebar">Sidebar</SelectItem>
                          <SelectItem value="Top">Top Banner</SelectItem>
                          <SelectItem value="Bottom">Bottom Banner</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-50 mb-4">Review Your Application</h3>
                
                <div className="space-y-4">
                  <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
                    <h4 className="font-semibold text-sm text-slate-300 mb-2">Company Information</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-slate-400">Type:</span> <span className="text-slate-200 capitalize">{form.watch("type")}</span></div>
                      <div><span className="text-slate-400">Company:</span> <span className="text-slate-200">{form.watch("companyName")}</span></div>
                      <div><span className="text-slate-400">Contact:</span> <span className="text-slate-200">{form.watch("contactPerson")}</span></div>
                      <div><span className="text-slate-400">Email:</span> <span className="text-slate-200">{form.watch("email")}</span></div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
                    <h4 className="font-semibold text-sm text-slate-300 mb-2">Service Areas</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedZips.map(zip => {
                        const zipInfo = TEXAS_ZIP_CODES.find(z => z.value === zip);
                        return (
                          <Badge key={zip} variant="secondary">{zipInfo?.label || zip}</Badge>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
                    <h4 className="font-semibold text-sm text-slate-300 mb-2">Selected Pricing Models</h4>
                    <div className="space-y-2 text-sm">
                      {pricing.cpc?.enabled && (
                        <div className="text-slate-200">
                          ✓ CPC: ${pricing.cpc.amount}/click, {pricing.cpc.budgetPeriod} budget of ${pricing.cpc.budgetCap}
                        </div>
                      )}
                      {pricing.affiliate?.enabled && (
                        <div className="text-slate-200">
                          ✓ Affiliate: {pricing.affiliate.commissionPct}% commission, {pricing.affiliate.paymentTerms}
                        </div>
                      )}
                      {pricing.monthlyBanner?.enabled && (
                        <div className="text-slate-200">
                          ✓ Monthly Banner: ${pricing.monthlyBanner.amount}/month, {pricing.monthlyBanner.size} size, {pricing.monthlyBanner.placement}
                        </div>
                      )}
                      {!pricing.cpc?.enabled && !pricing.affiliate?.enabled && !pricing.monthlyBanner?.enabled && (
                        <div className="text-slate-400">No pricing models selected</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Additional Notes (optional)</Label>
                    <Textarea
                      {...form.register("notes")}
                      data-testid="textarea-notes"
                      placeholder="Any additional information or special requests..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-4 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              data-testid="button-previous"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            {currentStep < steps.length - 1 ? (
              <Button
                type="button"
                onClick={handleNext}
                data-testid="button-next"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={submitLOIMutation.isPending}
                data-testid="button-submit-loi"
              >
                {submitLOIMutation.isPending ? "Submitting..." : "Submit Application"}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
