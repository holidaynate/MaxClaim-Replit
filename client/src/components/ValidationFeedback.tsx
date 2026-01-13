import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, Info, CheckCircle } from "lucide-react";

interface ValidationWarning {
  code: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  suggestion?: string;
}

interface ValidationResult {
  isValid: boolean;
  warnings: ValidationWarning[];
  normalizedItem?: string;
  normalizedUnit?: string;
  normalizedQuantity?: number;
  detectedTrade?: string;
}

interface BatchValidationResult {
  results: ValidationResult[];
  summary: {
    totalItems: number;
    validItems: number;
    itemsWithWarnings: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
  };
}

interface ClaimItem {
  category: string;
  description: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
}

interface ValidationFeedbackProps {
  items: ClaimItem[];
  className?: string;
}

export function ValidationFeedback({ items, className = "" }: ValidationFeedbackProps) {
  const [validationResult, setValidationResult] = useState<BatchValidationResult | null>(null);

  const validateMutation = useMutation({
    mutationFn: async (itemsToValidate: ClaimItem[]) => {
      const response = await apiRequest("POST", "/api/validate/batch", {
        items: itemsToValidate.map(item => ({
          itemName: item.description,
          quantity: item.quantity,
          unit: item.unit || "EA",
          price: item.unitPrice,
          category: item.category,
        }))
      });
      return await response.json();
    },
    onSuccess: (data) => {
      setValidationResult(data);
    },
  });

  useEffect(() => {
    if (items.length > 0) {
      validateMutation.mutate(items);
    } else {
      setValidationResult(null);
    }
  }, [items]);

  if (!validationResult || items.length === 0) {
    return null;
  }

  const { summary, results } = validationResult;
  const hasIssues = summary.errorCount > 0 || summary.warningCount > 0;
  const hasInfoOnly = !hasIssues && summary.infoCount > 0;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      case 'info':
        return 'outline';
      default:
        return 'default';
    }
  };

  const allWarnings = results.flatMap((result, idx) => 
    result.warnings.map(warning => ({
      ...warning,
      itemIndex: idx,
      itemName: items[idx]?.description || `Item ${idx + 1}`,
      detectedTrade: result.detectedTrade,
    }))
  );

  if (allWarnings.length === 0) {
    return (
      <Alert className={`border-green-500/50 bg-green-500/10 ${className}`} data-testid="validation-success">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <AlertTitle>All Items Valid</AlertTitle>
        <AlertDescription>
          {summary.totalItems} item(s) passed trade-specific validation checks.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-3 ${className}`} data-testid="validation-feedback">
      {summary.errorCount > 0 && (
        <Alert variant="destructive" data-testid="validation-errors">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Validation Errors</AlertTitle>
          <AlertDescription>
            {summary.errorCount} error(s) found. Please fix these before submitting.
          </AlertDescription>
        </Alert>
      )}

      {summary.warningCount > 0 && (
        <Alert className="border-yellow-500/50 bg-yellow-500/10" data-testid="validation-warnings">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertTitle>Validation Warnings</AlertTitle>
          <AlertDescription>
            {summary.warningCount} warning(s) found. Review these items for accuracy.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        {allWarnings.map((warning, idx) => (
          <div 
            key={idx} 
            className="flex items-start gap-2 p-3 rounded-md bg-muted/50 text-sm"
            data-testid={`validation-warning-${idx}`}
          >
            {getSeverityIcon(warning.severity)}
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{warning.itemName}</span>
                {warning.detectedTrade && (
                  <Badge variant="outline" className="text-xs">
                    {warning.detectedTrade}
                  </Badge>
                )}
                <Badge variant={getSeverityBadgeVariant(warning.severity) as any} className="text-xs">
                  {warning.code.replace(/_/g, ' ')}
                </Badge>
              </div>
              <p className="text-muted-foreground">{warning.message}</p>
              {warning.suggestion && (
                <p className="text-xs text-muted-foreground italic">
                  Suggestion: {warning.suggestion}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
        <span>Summary: {summary.totalItems} items checked</span>
        {summary.errorCount > 0 && (
          <span className="text-destructive">{summary.errorCount} errors</span>
        )}
        {summary.warningCount > 0 && (
          <span className="text-yellow-500">{summary.warningCount} warnings</span>
        )}
        {summary.infoCount > 0 && (
          <span className="text-blue-500">{summary.infoCount} tips</span>
        )}
      </div>
    </div>
  );
}

export default ValidationFeedback;
