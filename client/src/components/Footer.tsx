import { Shield, HelpCircle, FileText, Scale, Mail } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function Footer() {
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  return (
    <>
      <footer className="border-t bg-card mt-auto" data-testid="footer">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Quick Disclaimers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium">Important Disclaimer</p>
                <p>
                  Max-Claim is a free consumer advocacy tool. We are NOT licensed public adjusters or appraisers.{" "}
                  <button
                    onClick={() => setShowDisclaimerModal(true)}
                    className="underline hover:text-foreground"
                    data-testid="button-full-disclaimer"
                    aria-label="View full legal disclaimer"
                  >
                    Read full disclaimer
                  </button>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium">Privacy Notice</p>
                <p>
                  We never collect personal information. Only ZIP codes are used.{" "}
                  <button
                    onClick={() => setShowPrivacyModal(true)}
                    className="underline hover:text-foreground"
                    data-testid="button-privacy-policy"
                    aria-label="View privacy policy"
                  >
                    Privacy policy
                  </button>
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="border-t pt-6">
            <nav aria-label="Footer navigation">
              <ul className="flex flex-wrap justify-center gap-6 text-xs text-muted-foreground">
                <li>
                  <button
                    onClick={() => setShowAboutModal(true)}
                    className="flex items-center gap-1 hover:text-foreground hover-elevate rounded px-2 py-1"
                    data-testid="button-about"
                    aria-label="About Max-Claim"
                  >
                    <FileText className="w-3 h-3" aria-hidden="true" />
                    About
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setShowContactModal(true)}
                    className="flex items-center gap-1 hover:text-foreground hover-elevate rounded px-2 py-1"
                    data-testid="button-contact"
                    aria-label="Contact and help"
                  >
                    <Mail className="w-3 h-3" aria-hidden="true" />
                    Help & Contact
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setShowDisclaimerModal(true)}
                    className="flex items-center gap-1 hover:text-foreground hover-elevate rounded px-2 py-1"
                    data-testid="button-legal"
                    aria-label="Legal disclaimers"
                  >
                    <Scale className="w-3 h-3" aria-hidden="true" />
                    Legal
                  </button>
                </li>
                <li>
                  <a
                    href="/attributions"
                    className="flex items-center gap-1 hover:text-foreground hover-elevate rounded px-2 py-1"
                    data-testid="link-attributions"
                    aria-label="View attributions and credits"
                  >
                    <HelpCircle className="w-3 h-3" aria-hidden="true" />
                    Attributions & Credits
                  </a>
                </li>
              </ul>
            </nav>
          </div>

          {/* Copyright */}
          <div className="text-center text-xs text-muted-foreground mt-6">
            <p>&copy; {new Date().getFullYear()} Max-Claim. Free consumer advocacy tool.</p>
          </div>
        </div>
      </footer>

      {/* Full Disclaimer Modal */}
      <Dialog open={showDisclaimerModal} onOpenChange={setShowDisclaimerModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" aria-describedby="disclaimer-description">
          <DialogHeader>
            <DialogTitle>Legal Disclaimer</DialogTitle>
            <DialogDescription id="disclaimer-description">
              Important legal information about using Max-Claim
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <section>
              <h3 className="font-semibold mb-2">Not Licensed Professionals</h3>
              <p className="text-muted-foreground">
                Max-Claim is a free consumer advocacy tool and educational resource. We are NOT licensed public adjusters, 
                insurance appraisers, or legal professionals. This tool provides estimates and information for educational 
                purposes only.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">No Professional Relationship</h3>
              <p className="text-muted-foreground">
                Use of this tool does not create any professional, legal, or contractual relationship between you and Max-Claim. 
                We do not represent you in any insurance negotiations or legal matters.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">Estimates Only</h3>
              <p className="text-muted-foreground">
                All fair market value calculations and pricing estimates are for informational purposes only. Actual costs may 
                vary based on local market conditions, contractor availability, material costs, and project specifics. Always 
                obtain professional quotes before making decisions.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">No Guarantee of Results</h3>
              <p className="text-muted-foreground">
                We make no guarantees or warranties about the accuracy of estimates or your success in insurance negotiations. 
                Insurance claim outcomes depend on many factors beyond our control, including your policy terms, insurance 
                company practices, and specific claim circumstances.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">Consult Professionals</h3>
              <p className="text-muted-foreground">
                For legal advice, hire a licensed attorney. For insurance claim representation, hire a licensed public adjuster. 
                For accurate repair estimates, obtain quotes from licensed contractors.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">Limitation of Liability</h3>
              <p className="text-muted-foreground">
                Max-Claim and its operators are not liable for any decisions you make based on information provided by this tool, 
                or for any outcomes of your insurance claims or negotiations.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">Use at Your Own Risk</h3>
              <p className="text-muted-foreground">
                By using Max-Claim, you acknowledge that you understand these limitations and agree to use the tool at your own risk.
              </p>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      {/* Privacy Policy Modal */}
      <Dialog open={showPrivacyModal} onOpenChange={setShowPrivacyModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" aria-describedby="privacy-description">
          <DialogHeader>
            <DialogTitle>Privacy Policy</DialogTitle>
            <DialogDescription id="privacy-description">
              How we protect your privacy
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <section>
              <h3 className="font-semibold mb-2">Zero Personal Data Collection</h3>
              <p className="text-muted-foreground">
                Max-Claim is built with privacy-first architecture. We do NOT collect, store, or transmit any personally 
                identifiable information (PII) including:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground ml-4">
                <li>Names</li>
                <li>Email addresses</li>
                <li>Phone numbers</li>
                <li>Street addresses</li>
                <li>Insurance policy numbers</li>
                <li>Claim numbers</li>
                <li>Social Security numbers</li>
                <li>Any other personal identifiers</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold mb-2">What We Do Collect</h3>
              <p className="text-muted-foreground">
                For regional pricing analysis, we only collect:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground ml-4">
                <li>ZIP codes (for regional pricing data)</li>
                <li>Claim item categories (e.g., "Roofing", "Plumbing")</li>
                <li>Quantities and estimated costs</li>
                <li>Aggregate usage statistics (anonymized)</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold mb-2">No User Accounts</h3>
              <p className="text-muted-foreground">
                Max-Claim does not require user registration or accounts. All analysis is performed in real-time without 
                storing your session data.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">No Sharing with Third Parties</h3>
              <p className="text-muted-foreground">
                We never sell, rent, or share any data with insurance companies, advertisers, or other third parties. 
                Public API integrations (FEMA, BLS, etc.) are read-only and do not transmit your information.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">Cookies and Tracking</h3>
              <p className="text-muted-foreground">
                We use minimal cookies only for essential functionality (session management). We do not use advertising 
                cookies or third-party tracking scripts.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">Your Rights</h3>
              <p className="text-muted-foreground">
                Since we don't collect personal information, there is no personal data to access, modify, or delete. 
                ZIP codes and claim data are anonymous and cannot be tied back to any individual.
              </p>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      {/* About Modal */}
      <Dialog open={showAboutModal} onOpenChange={setShowAboutModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" aria-describedby="about-description">
          <DialogHeader>
            <DialogTitle>About Max-Claim</DialogTitle>
            <DialogDescription id="about-description">
              Our mission and how Max-Claim works
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <section>
              <h3 className="font-semibold mb-2">Our Mission</h3>
              <p className="text-muted-foreground">
                Max-Claim is a free consumer advocacy tool designed to help homeowners and property owners receive fair 
                compensation for insurance claims. We believe insurance companies should pay what claims are actually worth, 
                not low-ball initial offers.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">How It Works</h3>
              <p className="text-muted-foreground">
                Max-Claim compares insurance settlement offers against real-time fair market values (FMV) using:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground ml-4">
                <li>Regional pricing databases with ZIP code-based adjustments</li>
                <li>Real-time data from FEMA, Bureau of Labor Statistics (BLS), and public records</li>
                <li>Construction cost inflation indices</li>
                <li>Historical claims data for your area</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold mb-2">Why We Built This</h3>
              <p className="text-muted-foreground">
                Studies show insurance companies often underpay claims by 10-30%. Many homeowners don't know they can negotiate 
                or what fair market value actually is. Max-Claim levels the playing field by showing you what you deserve.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">Free Forever</h3>
              <p className="text-muted-foreground">
                Max-Claim is completely free to use with no hidden costs, no registration required, and no data harvesting. 
                We're here to help consumers, not profit from their misfortune.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">Not a Replacement for Professionals</h3>
              <p className="text-muted-foreground">
                While Max-Claim provides valuable estimates, we are not licensed public adjusters or appraisers. For complex 
                claims or significant disputes, consider hiring a licensed professional who can represent your interests.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">Open Source</h3>
              <p className="text-muted-foreground">
                Max-Claim is built with transparency in mind. Our methodology and calculations are open for review to ensure 
                accuracy and fairness.
              </p>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact/Help Modal */}
      <Dialog open={showContactModal} onOpenChange={setShowContactModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" aria-describedby="contact-description">
          <DialogHeader>
            <DialogTitle>Help & Contact</DialogTitle>
            <DialogDescription id="contact-description">
              Get help using Max-Claim
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <section>
              <h3 className="font-semibold mb-2">How to Use Max-Claim</h3>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-4">
                <li>Enter your ZIP code for regional pricing</li>
                <li>Upload your insurance claim document (optional) or manually enter items</li>
                <li>Review extracted items and add any missing items</li>
                <li>Submit for analysis to see your Fair Market Value comparison</li>
                <li>Use the results to negotiate with your insurance company</li>
              </ol>
            </section>

            <section>
              <h3 className="font-semibold mb-2">Understanding Your Results</h3>
              <p className="text-muted-foreground">
                Your results show three key numbers:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground ml-4">
                <li><strong>Insurance Offer:</strong> What the insurance company quoted</li>
                <li><strong>Fair Market Value:</strong> What similar work actually costs in your area</li>
                <li><strong>Additional Amount:</strong> The difference you should pursue (shown in green)</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold mb-2">What to Do Next</h3>
              <p className="text-muted-foreground">
                After getting your analysis:
              </p>
              <ol className="list-decimal list-inside mt-2 space-y-1 text-muted-foreground ml-4">
                <li>Download or print your report</li>
                <li>Contact your insurance adjuster with the FMV comparison</li>
                <li>Request a re-evaluation based on fair market value</li>
                <li>Get independent contractor quotes to support your case</li>
                <li>Consider hiring a public adjuster for large claims (over $10,000)</li>
              </ol>
            </section>

            <section>
              <h3 className="font-semibold mb-2">Additional Resources</h3>
              <p className="text-muted-foreground">
                Your results page includes links to:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground ml-4">
                <li>FEMA disaster assistance programs</li>
                <li>Local 211 services for emergency aid</li>
                <li>HUD repair programs and grants</li>
                <li>State homeowner assistance funds</li>
                <li>Insurance complaint databases</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold mb-2">Technical Support</h3>
              <p className="text-muted-foreground">
                If you encounter technical issues or have questions about using the tool, please note that Max-Claim is 
                provided as-is for educational purposes. We cannot provide individual claim advice or legal guidance.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">Report Issues</h3>
              <p className="text-muted-foreground">
                To report bugs or suggest improvements, please visit our open-source repository (link in footer).
              </p>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
