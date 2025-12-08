# Max-Claim - Insurance Claim Fair Market Value Tool

## Overview
Max-Claim is a free consumer advocacy web application designed to help homeowners and property owners achieve fair compensation for underpaid insurance claims. It compares insurance settlement offers against real-time fair market values (FMV) to identify potential additional compensation. The application prioritizes user privacy by collecting only ZIP codes for regional pricing analysis and does not store personally identifiable information. Its core mission is to empower consumers to negotiate effectively with insurance companies.

## User Preferences
Preferred communication style: Simple, everyday language suitable for non-technical users.

## System Architecture

### UI/UX Decisions
The application utilizes a dark slate-950 theme with sky-blue (sky-500) accents. Key UI elements include a Hero Section, a "How It Works" visual flow, a two-column desktop layout for claim forms and resources, and a Partner Section. A single-screen Claim Wizard guides users with trust badges and a triple CTA strategy. Accessibility is a priority, adhering to WCAG AA compliance, offering keyboard navigation, and ensuring mobile responsiveness.

### Technical Implementations
Max-Claim is a full-stack web application. The frontend is built with React 18, TypeScript, Vite, Wouter for routing, TanStack Query for server state, Shadcn/ui and Tailwind CSS for UI, and React Hook Form with Zod for form validation. The backend uses Node.js, Express, and TypeScript, incorporating a regional FMV pricing engine, a dual OCR service (OCR.space + Tesseract.js), and a text parsing engine. A PostgreSQL database (Neon) with Drizzle ORM manages persistent storage, and pricing data is collected for future analytics.

### Feature Specifications
- **Single-Screen Claim Wizard**: Streamlined process for document upload, ZIP code, damage type, and insurance offer.
- **ZIP-Aware Contractor Matching**: Filters local contractors based on ZIP code, with CTAs and referral tracking.
- **Unit-Aware Pricing**: Supports 5 unit types (LF, SF, SQ, CT, EA) with descriptive tooltips.
- **v2.0 Audit Engine**: Compares entered prices against RRC_COST and INS_MAX_COST ranges, flagging items as underpaid, overpaid, fair, missing, or invalid. Provides batch audit summaries including total claim value, market value, variance, and potential underpayment.
- **Document Upload & OCR**: Supports JPG, PNG, PDF with dual OCR engine (OCR.space API and Tesseract.js fallback).
- **Regional Pricing Intelligence**: Uses ZIP code-based multipliers and external data for FMV adjustments.
- **Disaster Relief Resources**: Provides links to relevant organizations.
- **PDF Export**: Client-side PDF generation of comprehensive reports.
- **Email Report**: Allows emailing report summaries via mailto: links.
- **Comprehensive Accessibility**: Includes text size toggle, high contrast mode, bilingual support infrastructure, ARIA labels, and keyboard navigation.
- **Legal Compliance**: Persistent footer with disclaimers and modal dialogs for legal information.
- **Privacy Architecture**: Collects only anonymous data (ZIP codes, item categories, units, quantities, pricing comparisons). No PII stored.
- **Monetization Infrastructure**: Partnership system for contractors/adjusters with various pricing models, ZIP targeting, weighted rotation, and lead/click tracking.
- **Partner Matching Algorithm**: Prioritizes local contractors with scoring based on ZIP/area code matches, local business bonuses, and payment tier multipliers.
- **Location Utilities**: Privacy-first, ZIP-based location mapping for coarse metro area detection.
- **Replit Auth Integration**: Full OpenID Connect authentication via Replit Auth, storing session and user data in PostgreSQL.
- **User Claims Dashboard**: Authenticated users can view their claim history and access stored PDF reports.
- **Protected File Access**: Ensures ownership verification for file access.
- **Monetization System**: Complete partner monetization with sales agent reference codes for lead tracking, commission management (15-40% sliding scale), Stripe integration for payments and payouts, ad impression analytics, and renewal automation.
- **Pro Organizations Database**: Enhanced lead prospecting tool with 45 seeded professional associations across 9 categories (General Contractors, Remodelers, Roofers, Public Adjusters, Insurance Attorneys, Licensing Boards, Regulators, Disaster Recovery). Features hierarchical structure with parent-child chapter relationships (e.g., AGC National → AGC Austin Chapter), regional coverage mapping (e.g., WSRCA covers TX, CA, AZ, NM, CO, NV, UT, WY, ID, MT), and smart ZIP-to-state filtering. Organizations include website links, member directory URLs (directoryUrl), chapter maps (chapterMapUrl), and chapter finder URLs (chapterInfoUrl). Admin dashboard displays regional coverage badges and enhanced directory links.
- **Disaster Risk Prioritization**: 3-tier priority system for sales agent lead targeting aligned with disaster frequency. Priority 1 (Critical): TX, FL, CA, OK, MS, IL - highest disaster volume states. Priority 2 (High): GA, NC, MO, AL, CO - significant disaster exposure. Includes primaryHazards array with normalized taxonomy (tornado, hurricane, flood, wildfire, earthquake, hail, severe_storm). Admin Dashboard shows P1/P2 badges and hazard indicators per organization.
- **Email Templates System**: 4 vendor outreach email templates (Property Management, Public Adjuster, Roofing Contractor, Insurance Attorney) with placeholder support for personalization. Admin dashboard tab with view/copy functionality for easy agent use. Placeholders include [YOUR_NAME], [COMPANY_NAME], [ADJUSTER_NAME], etc.

### System Design Choices
- **Frontend Stack**: React 18, TypeScript, Vite, Wouter, TanStack Query, Shadcn/ui, Tailwind CSS, React Hook Form, Zod.
- **Backend Stack**: Node.js, Express, TypeScript, PostgreSQL, Drizzle ORM.
- **Database Schema**: Normalized PostgreSQL for sessions, claims, line items, pricing data, sources, and session usage.
- **OCR Service**: Utilizes both cloud-based and local engines for robustness.
- **Pricing Engine**: PostgreSQL-backed with regional multipliers and data collection for future refinement.
- **Data Flow**: Document upload triggers OCR and text parsing; user input and external data drive FMV calculation; results are displayed, and pricing data points stored.
- **Supported Categories**: Roofing, Flooring, Drywall, Painting, Plumbing, Electrical, HVAC, Windows & Doors, Appliances, Cabinets, and 'Other'.

## External Dependencies
- **OCR.space API**: Primary OCR service.
- **Tesseract.js**: Local OCR library fallback.
- **FEMA NFIP Claims API**: Historical flood insurance claims data.
- **BLS Construction PPI**: Construction cost inflation adjustments.
- **Texas DOI Complaints**: Public complaint data for insurance companies.
- **jsPDF**: Client-side PDF generation.
- **SendGrid**: Email sending (requires API key).
- **Stripe**: Payment processing and agent payouts (requires STRIPE_SECRET_KEY).