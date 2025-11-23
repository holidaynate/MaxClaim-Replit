import { useState } from "react";
import { Mail, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface EmailReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportSummary: string;
}

export function EmailReportDialog({ open, onOpenChange, reportSummary }: EmailReportDialogProps) {
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const handleSendEmail = () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    // Create mailto link with report summary
    const subject = encodeURIComponent("Max-Claim Fair Market Value Report");
    const body = encodeURIComponent(reportSummary);
    const mailtoLink = `mailto:${email}?subject=${subject}&body=${body}`;

    // Open mailto link
    window.location.href = mailtoLink;

    toast({
      title: "Email Client Opened",
      description: "Your default email application should open with the report summary. You may need to manually attach the PDF if desired.",
    });

    // Close dialog
    onOpenChange(false);
    setEmail("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby="email-dialog-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" aria-hidden="true" />
            Email Your Report
          </DialogTitle>
          <DialogDescription id="email-dialog-description">
            Enter your email address to open your email client with the report summary.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email-input">Email Address</Label>
            <Input
              id="email-input"
              type="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSendEmail();
                }
              }}
              data-testid="input-email-address"
              aria-label="Email address for report delivery"
            />
          </div>

          <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            <p className="flex items-start gap-2">
              <ExternalLink className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span>
                This will open your default email application with a pre-filled message containing 
                your report summary. For the full PDF report, use the "Download PDF" button and 
                manually attach it to your email.
              </span>
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setEmail("");
            }}
            data-testid="button-cancel-email"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSendEmail}
            className="gap-2"
            data-testid="button-send-email"
            aria-label="Open email client with report"
          >
            <Mail className="w-4 h-4" aria-hidden="true" />
            Open Email Client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
