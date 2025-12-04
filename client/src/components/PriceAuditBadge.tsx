import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, TrendingDown, TrendingUp, XCircle, HelpCircle, DollarSign } from "lucide-react";
import type { AuditResult, AuditStatus, AuditSeverity, PriceAuditResult } from "@shared/priceAudit";

interface PriceAuditBadgeProps {
  audit: AuditResult | PriceAuditResult;
  showDetails?: boolean;
}

const severityStyles: Record<AuditSeverity, { badge: string; icon: typeof CheckCircle2 }> = {
  none: { badge: "bg-slate-500/20 text-slate-400 border-slate-500/30", icon: CheckCircle2 },
  success: { badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  warning: { badge: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: AlertTriangle },
  error: { badge: "bg-red-500/20 text-red-400 border-red-500/30", icon: AlertCircle },
  info: { badge: "bg-sky-500/20 text-sky-400 border-sky-500/30", icon: Info }
};

const statusLabels: Record<AuditStatus, string> = {
  PASS: "Price OK",
  LOW: "Underpaid",
  FMV: "Fair Value",
  MISSING_ITEM: "Not Found",
  INVALID_QUANTITY: "Invalid Qty"
};

function isV2Audit(audit: AuditResult | PriceAuditResult): audit is AuditResult {
  return 'status' in audit && ['PASS', 'LOW', 'FMV', 'MISSING_ITEM', 'INVALID_QUANTITY'].includes((audit as AuditResult).status);
}

export default function PriceAuditBadge({ audit, showDetails = true }: PriceAuditBadgeProps) {
  if (isV2Audit(audit)) {
    const { status, severity, message, marketPricing, unit, enteredQty, subtotal, underpaymentOpportunity, suggestions } = audit;
    const style = severityStyles[severity] || severityStyles.info;
    const Icon = style.icon;

    if (status === 'MISSING_ITEM') {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="bg-slate-500/20 text-slate-400 border-slate-500/30 text-xs cursor-help">
                <HelpCircle className="w-3 h-3 mr-1" />
                {statusLabels[status]}
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <div className="space-y-2 text-xs">
                <p>{message}</p>
                {suggestions && suggestions.length > 0 && (
                  <div>
                    <p className="font-medium">Similar items:</p>
                    <ul className="list-disc pl-4">
                      {suggestions.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    if (status === 'INVALID_QUANTITY') {
      return (
        <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
          <XCircle className="w-3 h-3 mr-1" />
          {statusLabels[status]}
        </Badge>
      );
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-col gap-1">
              <Badge 
                variant="outline" 
                className={`${style.badge} text-xs cursor-help`}
                data-testid="badge-audit-status"
              >
                <Icon className="w-3 h-3 mr-1" />
                {statusLabels[status]}
              </Badge>
              {showDetails && marketPricing && (
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <TrendingDown className="w-3 h-3" />
                    ${marketPricing.unitPrice.toFixed(2)}
                  </span>
                  <span className="font-medium text-foreground">~${marketPricing.averagePrice.toFixed(2)}</span>
                  <span className="flex items-center gap-0.5 text-emerald-400">
                    <TrendingUp className="w-3 h-3" />
                    ${marketPricing.fmvPrice.toFixed(2)}
                  </span>
                  {unit && <span className="text-muted-foreground">/{unit}</span>}
                </div>
              )}
              {showDetails && subtotal > 0 && enteredQty > 0 && (
                <div className="text-[10px] text-muted-foreground">
                  Subtotal: ${subtotal.toFixed(2)} ({enteredQty} {unit})
                  {underpaymentOpportunity > 0 && (
                    <span className="text-green-500 ml-1 font-medium">
                      (+${underpaymentOpportunity.toFixed(2)} opportunity)
                    </span>
                  )}
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-2 text-xs">
              <p>{message}</p>
              {marketPricing && (
                <>
                  <p><strong>Floor (Min):</strong> ${marketPricing.unitPrice.toFixed(2)}/{unit}</p>
                  <p><strong>Average:</strong> ${marketPricing.averagePrice.toFixed(2)}/{unit}</p>
                  <p><strong>FMV (Max):</strong> ${marketPricing.fmvPrice.toFixed(2)}/{unit}</p>
                  <p><strong>Your Price:</strong> ${audit.enteredPrice.toFixed(2)}/{unit}</p>
                </>
              )}
              {underpaymentOpportunity > 0 && (
                <p className="text-green-400 font-medium">
                  <DollarSign className="w-3 h-3 inline" />
                  Uplift Opportunity: +${underpaymentOpportunity.toFixed(2)}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const { severity, flag, min, avg, max, unit, matchedItem, percentFromAvg, sampleSize } = audit as PriceAuditResult;
  const style = severityStyles[severity] || severityStyles.info;
  const Icon = style.icon;

  if (flag === 'No data available') {
    return (
      <Badge variant="outline" className="bg-slate-500/20 text-slate-400 border-slate-500/30 text-xs">
        <Info className="w-3 h-3 mr-1" />
        No market data
      </Badge>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col gap-1">
            <Badge 
              variant="outline" 
              className={`${style.badge} text-xs cursor-help`}
              data-testid="badge-audit-status"
            >
              <Icon className="w-3 h-3 mr-1" />
              {flag}
            </Badge>
            {showDetails && min !== undefined && max !== undefined && avg !== undefined && (
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-0.5">
                  <TrendingDown className="w-3 h-3" />
                  ${min.toFixed(2)}
                </span>
                <span className="font-medium text-foreground">~${avg.toFixed(2)}</span>
                <span className="flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" />
                  ${max.toFixed(2)}
                </span>
                {unit && <span className="text-muted-foreground">/{unit}</span>}
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2 text-xs">
            {matchedItem && (
              <p><strong>Matched:</strong> {matchedItem}</p>
            )}
            {min !== undefined && max !== undefined && avg !== undefined && (
              <>
                <p><strong>Market Range:</strong> ${min.toFixed(2)} - ${max.toFixed(2)}</p>
                <p><strong>Average:</strong> ${avg.toFixed(2)}{unit && ` per ${unit}`}</p>
              </>
            )}
            {percentFromAvg !== undefined && (
              <p>
                <strong>Your Price:</strong> {percentFromAvg > 0 ? '+' : ''}{percentFromAvg}% from average
              </p>
            )}
            {sampleSize !== undefined && (
              <p className="text-muted-foreground">Based on {sampleSize} claim samples</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
