# Max-Claim - Insurance Claim Fair Market Value Tool

## Overview
Max-Claim is a free consumer advocacy web application designed to help homeowners and property owners receive fair compensation for underpaid insurance claims. It achieves this by comparing insurance settlement offers against real-time fair market values (FMV) and highlighting the additional compensation users should pursue. The application prioritizes user privacy by only collecting ZIP codes for regional pricing analysis and avoids storing any personally identifiable information. The core vision is to empower consumers to effectively negotiate with insurance companies, bridging the 10-30% gap often found between low-ball offers and actual market values.

## User Preferences
Preferred communication style: Simple, everyday language suitable for non-technical users.

## System Architecture

### UI/UX Decisions
The design philosophy emphasizes professional trust and user empowerment with a clean, data-focused interface. It adapts Material Design 3 for a professional and trustworthy aesthetic. The application ensures accessibility (WCAG AA compliant, keyboard navigation, mobile responsive) and prioritizes speed with fast calculations and minimal loading states. Branding includes a custom Max-Claim logo and all copy is oriented towards "additional amount deserved" with green highlights for increased claim amounts.

### Technical Implementations
Max-Claim is built as a full-stack web application. The frontend uses **React 18 + TypeScript + Vite**, with **Wouter** for routing, **TanStack Query** for server state, and **React useState** for local UI. **Shadcn/ui** (Radix UI primitives) and **Tailwind CSS** handle UI components and styling, while **React Hook Form + Zod** manage form validation.

The backend is built with **Node.js + Express + TypeScript**. It features a regional FMV pricing engine, an OCR service for document processing, and a text parsing engine. Storage is currently in-memory (`MemStorage`) but designed for future database integration.

### Feature Specifications
- **Multi-Step Claim Analysis Wizard**: Guides users through welcome, location (ZIP code), items entry (manual or OCR upload), review, and results steps.
- **Document Upload & OCR**: Supports JPG, PNG, PDF up to 10MB. Utilizes a dual OCR engine (**OCR.space API** as primary, **Tesseract.js** as local fallback) and PDF text layer detection. Employs a conservative parsing strategy for text extraction, prioritizing user review and validation.
- **Regional Pricing Intelligence**: Uses static ZIP code prefix-based multipliers and integrates external data sources for real-time adjustments.
- **Disaster Relief Resources**: Displays contextual resource links (FEMA, 211 Services, HUD, etc.) on the results page based on the entered ZIP code.
- **PDF Export**: Client-side PDF generation using jsPDF library. Comprehensive reports include summary, itemized breakdown, regional context, resource links, and legal disclaimers. Files named: MaxClaim_FMV_Report_{zipCode}_{date}.pdf
- **Email Report**: Modal dialog allowing users to email report summaries via mailto: link. Pre-fills subject and body with plain-text report summary. Email validation included.
- **Comprehensive Accessibility**: Text size toggle (3 levels: 16px, 18px, 20px), high contrast mode (WCAG AAA compliant), bilingual support (English/Spanish infrastructure), ARIA labels throughout, semantic HTML, keyboard navigation support. Settings persist via localStorage.
- **Legal Compliance**: Persistent footer with disclaimers, modal dialogs for Help/Contact, About, and Licensing information.
- **Privacy Architecture**: No PII is collected (names, addresses, accounts, etc.). Only anonymous ZIP codes, item categories, quantities, and aggregate price comparisons are stored.

### System Design Choices
- **Frontend Stack**: React 18, TypeScript, Vite, Wouter, TanStack Query, Shadcn/ui, Tailwind CSS, React Hook Form, Zod.
- **Backend Stack**: Node.js, Express, TypeScript.
- **OCR Service**: Utilizes both cloud-based and local OCR engines for robustness.
- **Pricing Engine**: In-memory database with regional multipliers, designed for scalability.
- **Data Flow**: Clearly defined processes for document upload (OCR -> Text Parsing -> Auto-populate) and FMV calculation (User Input -> External API Data -> Backend Calculation -> Display Results).
- **Supported Categories**: Roofing, Flooring, Drywall, Painting, Plumbing, Electrical, HVAC, Windows & Doors, Appliances, Cabinets, and 'Other' for custom items.

## External Dependencies
- **OCR.space API**: Primary OCR service for document text extraction (free tier).
- **Tesseract.js**: Local OCR library, serving as a fallback for document text extraction.
- **FEMA NFIP Claims API**: Provides historical flood insurance claims data by ZIP code.
- **BLS Construction PPI**: Used for year-over-year construction cost inflation adjustments.
- **Texas DOI Complaints**: Offers public complaint data for insurance companies.
- **jsPDF**: Client-side PDF generation library for report exports.

## Deployment Status
**Ready for Production Deployment** (as of November 23, 2025)

All core features completed and tested:
- ✅ Multi-step FMV claim analysis wizard
- ✅ OCR document upload with dual-engine fallback
- ✅ Regional pricing intelligence with external API integration
- ✅ PDF export functionality (end-to-end tested)
- ✅ Email report delivery (end-to-end tested)
- ✅ Comprehensive accessibility features (WCAG AA+)
- ✅ Legal compliance footer and modal dialogs
- ✅ Privacy-first architecture

**Custom Domain**: max-claim.com (GoDaddy-hosted) ready to be linked via Replit Deployments settings.

**Deferred Enhancements** (non-blocking):
- Form field error feedback with aria-describedby
- Spanish language content translations (infrastructure complete)