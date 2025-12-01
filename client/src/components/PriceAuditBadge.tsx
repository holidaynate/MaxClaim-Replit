import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, TrendingDown, TrendingUp } from "lucide-react";
import type { PriceAuditResult, AuditSeverity } from "@shared/priceAudit";

interface PriceAuditBadgeProps {
  audit: PriceAuditResult;
  showDetails?: boolean;
}

const severityStyles: Record<AuditSeverity, { badge: string; icon: typeof CheckCircle2 }> = {
  success: { badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", icon: CheckCircle2 },
  warning: { badge: "bg-amber-500/20 text-amber-300 border-amber-500/30", icon: AlertTriangle },
  error: { badge: "bg-red-500/20 text-red-300 border-red-500/30", icon: AlertCircle },
  info: { badge: "bg-sky-500/20 text-sky-300 border-sky-500/30", icon: Info }
};

export default function PriceAuditBadge({ audit, showDetails = true }: PriceAuditBadgeProps) {
  const { severity, flag, min, avg, max, unit, matchedItem, percentFromAvg, sampleSize } = audit;
  const style = severityStyles[severity];
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
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
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
              <p className="text-muted-foreground">Based on {sampleSize} insurer quotes</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
