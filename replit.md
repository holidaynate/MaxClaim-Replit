# Max-Claim - Insurance Claim Fair Market Value Tool

## Overview
Max-Claim is a free consumer advocacy web application designed to help homeowners and property owners receive fair compensation for underpaid insurance claims. It achieves this by comparing insurance settlement offers against real-time fair market values (FMV) and highlighting the additional compensation users should pursue. The application prioritizes user privacy by only collecting ZIP codes for regional pricing analysis and avoids storing any personally identifiable information. The core vision is to empower consumers to effectively negotiate with insurance companies, bridging the 10-30% gap often found between low-ball offers and actual market values.

## User Preferences
Preferred communication style: Simple, everyday language suitable for non-technical users.

## System Architecture

### UI/UX Decisions
**Dark Slate Theme** (November 30, 2025): Modern dark slate-950 background with sky-blue (sky-500) accent colors provides professional credibility and visual appeal. Color scheme designed for trust-building and extended viewing sessions.

**Multi-Section Homepage Layout**: The homepage now features:
1. **Hero Section** with gradient background (from-sky-900 via-slate-950 to-slate-900), new branding "AI-Powered Storm Claim Review for Homeowners, Contractors & Public Adjusters", sample claim preview card showing example calculations, and dual CTAs ("Start Free Analysis" scroll button + "For Contractors & Adjusters" link)
2. **How It Works** visual flow section with 3 icon cards (Upload → AI scans documents → See options & local help)
3. **Two-Column Layout** on desktop: Left column contains claim form (preserves existing single-screen design and triple CTA strategy), Right sidebar shows ZIP-aware contractor matching panel + disaster relief resources
4. **Partner Section** at bottom with benefit cards and CTAs for contractors/adjusters to join the platform

**Single-Screen Claim Wizard** preserved with trust badges (No Credit Card Required, 90%+ Success Rate, Updated with Live Data, No Risk to You), public data source citations (FEMA NFIP, BLS PPI, Texas DOI, 23 open-source databases). **Triple CTA strategy** intact: (1) Hero scroll button "Start Free Analysis" scrolls to form, (2) Primary submit "Verify Fair Market Value" after document upload encourages uploads, (3) Secondary submit "Calculate My Recovery" at bottom provides final conversion. The application ensures accessibility (WCAG AA compliant, keyboard navigation, mobile responsive) and prioritizes speed with fast calculations and minimal loading states. All copy is oriented towards "additional amount deserved" with green highlights for increased claim amounts.

### Technical Implementations
Max-Claim is built as a full-stack web application. The frontend uses **React 18 + TypeScript + Vite**, with **Wouter** for routing, **TanStack Query** for server state, and **React useState** for local UI. **Shadcn/ui** (Radix UI primitives) and **Tailwind CSS** handle UI components and styling, while **React Hook Form + Zod** manage form validation.

The backend is built with **Node.js + Express + TypeScript**. It features a regional FMV pricing engine, an OCR service for document processing, and a text parsing engine. **PostgreSQL database** with **Drizzle ORM** provides persistent storage for sessions, claims, line items, and pricing data points. The pricing analytics system continuously learns from user inputs to improve FMV accuracy over time.

### Feature Specifications
- **Single-Screen Claim Wizard**: Streamlined single-page design with trust badges, document upload, ZIP code, optional property address, damage type selector, and insurance offer amount. Simplified flow indicators (arrows) guide users through Upload → Details → Calculate.
- **ZIP-Aware Contractor Matching** (November 30, 2025): Contractor panel in right sidebar automatically filters local contractors based on user's entered ZIP code. Features empty state messaging when no ZIP entered, real-time updates as ZIP is entered, and curated contractor database with referral tracking ready for monetization. Contractors displayed with phone/website CTAs and service descriptions. Panel includes "Join our referral network" CTA for contractor acquisition.
- **Unit-Aware Pricing**: Supports 5 unit types with descriptive tooltips:
  - **LF** (Linear Feet) - fence, piping
  - **SF** (Square Feet) - flooring, painting  
  - **SQ** (Roofing Squares) - 100 SF per square
  - **CT** (Count/Units) - windows, doors
  - **EA** (Each) - individual items
- **Document Upload & OCR**: Supports JPG, PNG, PDF up to 10MB. Utilizes a dual OCR engine (**OCR.space API** as primary, **Tesseract.js** as local fallback) and PDF text layer detection. Employs a conservative parsing strategy for text extraction, prioritizing user review and validation.
- **Regional Pricing Intelligence**: Uses static ZIP code prefix-based multipliers and integrates external data sources for real-time adjustments. Optional property address enables more accurate property valuations via Zillow or county appraisal district lookups.
- **Continuous Learning System**: Every user submission creates pricing data points (category, unit, ZIP, quoted price, FMV) that refine future calculations. FMV engine uses weighted average: 70% historical user data + 30% baseline calculations.
- **Disaster Relief Resources**: Resource band in right sidebar displays FEMA, 211 Services, SBA Loans, HUD, and Texas-specific DOI links. Always visible to provide contextual help alongside claim analysis.
- **PDF Export**: Client-side PDF generation using jsPDF library. Comprehensive reports include summary, itemized breakdown, regional context, resource links, and legal disclaimers. Files named: MaxClaim_FMV_Report_{zipCode}_{date}.pdf
- **Email Report**: Modal dialog allowing users to email report summaries via mailto: link. Pre-fills subject and body with plain-text report summary. Email validation included.
- **Comprehensive Accessibility**: Text size toggle (3 levels: 16px, 18px, 20px), high contrast mode (WCAG AAA compliant), bilingual support (English/Spanish infrastructure), ARIA labels throughout, semantic HTML, keyboard navigation support. Settings persist via localStorage.
- **Legal Compliance**: Persistent footer with disclaimers, modal dialogs for Help/Contact, About, and Licensing information.
- **Privacy Architecture**: Only anonymous data collected: ZIP codes (5 digits), optional property addresses (for valuation only), item categories, units, quantities, and pricing comparisons. No names, accounts, or personally identifiable information stored.

### System Design Choices
- **Frontend Stack**: React 18, TypeScript, Vite, Wouter, TanStack Query, Shadcn/ui, Tailwind CSS, React Hook Form, Zod.
- **Backend Stack**: Node.js, Express, TypeScript, PostgreSQL, Drizzle ORM.
- **Database Schema**: Normalized PostgreSQL with tables for sessions, claims, claim_line_items, pricing_data_points, sources, source_versions, and session_source_usage.
- **OCR Service**: Utilizes both cloud-based and local OCR engines for robustness.
- **Pricing Engine**: PostgreSQL-backed with regional multipliers and continuous learning. Analytics track min/max/avg/last price for each category+unit+ZIP combination.
- **Data Flow**: 
  - **Document upload**: OCR → Text Parsing → Auto-populate  
  - **FMV calculation**: User Input → Fetch Pricing Stats → External API Data → Weighted Calculation (70% historical + 30% baseline) → Display Results → Store Pricing Data Point
- **Supported Categories**: Roofing, Flooring, Drywall, Painting, Plumbing, Electrical, HVAC, Windows & Doors, Appliances, Cabinets, and 'Other' for custom items.

## External Dependencies
- **OCR.space API**: Primary OCR service for document text extraction (free tier).
- **Tesseract.js**: Local OCR library, serving as a fallback for document text extraction.
- **FEMA NFIP Claims API**: Provides historical flood insurance claims data by ZIP code.
- **BLS Construction PPI**: Used for year-over-year construction cost inflation adjustments.
- **Texas DOI Complaints**: Offers public complaint data for insurance companies.
- **jsPDF**: Client-side PDF generation library for report exports.

## Deployment Status
**Ready for Production Deployment** (as of November 24, 2025)

All core features completed and tested:
- ✅ Single-screen claim wizard with trust badges and simplified flow
- ✅ Unit-aware pricing with 5 unit types (LF, SF, SQ, CT, EA) and tooltips
- ✅ Optional property address field for enhanced valuations
- ✅ PostgreSQL database with continuous learning pricing analytics
- ✅ OCR document upload with dual-engine fallback
- ✅ Regional pricing intelligence with external API integration
- ✅ Weighted FMV calculation (70% user data + 30% baseline)
- ✅ PDF export functionality (end-to-end tested)
- ✅ Email report delivery (end-to-end tested)
- ✅ Comprehensive accessibility features (WCAG AA+)
- ✅ Legal compliance footer and modal dialogs
- ✅ Full database attribution system with 23 open-source sources
- ✅ Privacy-first architecture (ZIP codes only, optional addresses)

**Recent Updates** (November 30, 2025) - Major Visual Refresh & Monetization Features:
1. **Dark Slate Theme**: Implemented modern dark slate-950 background with sky-blue (sky-500) accents throughout application for professional appearance and reduced eye strain
2. **Hero Section**: Added gradient hero with new branding "AI-Powered Storm Claim Review", sample claim preview card, "Free Beta" badge, and dual CTAs for users and partners
3. **How It Works**: Created 3-step visual flow section (Upload → AI scans → See options) with icon cards to educate new users
4. **Two-Column Layout**: Desktop view now shows claim form on left, contractor matching panel + resources on right sidebar for improved conversion and monetization
5. **ZIP-Aware Contractor Panel**: Real-time contractor filtering based on entered ZIP code, empty state messaging, referral tracking structure ready for Azure backend integration
6. **Resource Band**: FEMA, 211 Services, SBA, HUD, Texas DOI links always visible in sidebar for contextual disaster relief help
7. **Partner Section**: Bottom CTA section targeting contractors and public adjusters to join referral network with benefit cards (Qualified Leads, Performance-Based, Win-Win Model)
8. **Form Reset Fix**: Implemented proper form reset functionality that clears all fields and contractor panel state when starting new claim analysis
9. **Component Architecture**: Created reusable Hero, HowItWorks, ContractorPanel, ResourceBand, and PartnerSection components following Shadcn/Tailwind patterns
10. **Preserved Core Features**: All existing functionality maintained (triple CTA strategy, OCR upload, pricing engine, PDF export, accessibility, continuous learning)

**Previous Updates** (November 24, 2025):
1. Redesigned homepage to single-screen format based on user feedback
2. Added unit selection (LF, SF, SQ, CT, EA) with explanatory tooltips
3. Implemented pricing data points system for continuous improvement
4. Added optional property address field for better property valuations
5. Integrated weighted FMV calculations using historical user data
6. Updated trust badges: Removed "Licensed & Insured", added "Updated with Live Data"
7. Added public data source citations (FEMA NFIP, BLS PPI, Texas DOI, 23 open-source databases)
8. Implemented triple CTA strategy: Hero scroll button at top, primary submit after upload (to encourage documents), secondary submit at bottom
9. Added floating translucent "MAX-CLAIM" watermark with proper accessibility attributes (aria-hidden)
10. Optimized button placement: moved middle button directly after document upload to maximize upload conversion

**Custom Domain**: max-claim.com (GoDaddy-hosted) ready to be linked via Replit Deployments settings.

**Monetization Infrastructure** (Ready for Implementation):
- Contractor referral tracking system with ZIP-based matching
- Partner application CTAs for contractors and public adjusters
- Referral fee structure ready for Azure backend integration
- Analytics tracking for contractor lead quality and conversion rates

**Deferred Enhancements** (non-blocking):
- Azure backend integration for contractor referral tracking and analytics
- Partner onboarding portal for contractors and public adjusters
- Form field error feedback with aria-describedby
- Spanish language content translations (infrastructure complete)
- Property valuation API integration (Zillow/county appraisal district)
- Mobile-optimized single-column layout for contractor panel