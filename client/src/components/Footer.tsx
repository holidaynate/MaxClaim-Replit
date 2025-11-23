import { Shield } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t bg-card mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Important Disclaimer</p>
              <p>
                MaxClaim is a free consumer advocacy tool and educational resource. We are NOT licensed public adjusters or appraisers. 
                This tool provides estimates for educational purposes only.
              </p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-1">Privacy Notice</p>
            <p>We never collect or store personal information. Only ZIP codes and claim data are used for regional price analysis.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
