# Max-Claim - Insurance Claim Fair Market Value Tool

## Overview
Max-Claim is a free consumer advocacy web application designed to help homeowners and property owners receive fair compensation for underpaid insurance claims. It achieves this by comparing insurance settlement offers against real-time fair market values (FMV) and highlighting the additional compensation users should pursue. The application prioritizes user privacy by only collecting ZIP codes for regional pricing analysis and avoids storing any personally identifiable information. The core vision is to empower consumers to effectively negotiate with insurance companies, bridging the 10-30% gap often found between low-ball offers and actual market values.

## User Preferences
Preferred communication style: Simple, everyday language suitable for non-technical users.

## System Architecture

### UI/UX Decisions
The design philosophy emphasizes professional trust and user empowerment with a clean, data-focused interface. **Single-screen design** with trust badges at the top (No Credit Card Required, 90%+ Success Rate, Updated with Live Data, No Risk to You) provides immediate credibility with public data source citations (FEMA NFIP, BLS PPI, Texas DOI, 23 open-source databases). Simplified flow indicators use arrows instead of complex step boxes. **Triple CTA strategy** optimized for maximum conversion: (1) Hero button "Calculate My Recovery" immediately under page heading scrolls users to form and focuses ZIP input, (2) Primary submit button "Verify Fair Market Value" inside form card triggers analysis, (3) Secondary submit button "Calculate My Recovery" at bottom provides reassurance for users who scroll through entire form. A floating translucent "MAX-CLAIM" watermark (aria-hidden for accessibility) prevents unauthorized screenshots. The application ensures accessibility (WCAG AA compliant, keyboard navigation, mobile responsive) and prioritizes speed with fast calculations and minimal loading states. All copy is oriented towards "additional amount deserved" with green highlights for increased claim amounts.

### Technical Implementations
Max-Claim is built as a full-stack web application. The frontend uses **React 18 + TypeScript + Vite**, with **Wouter** for routing, **TanStack Query** for server state, and **React useState** for local UI. **Shadcn/ui** (Radix UI primitives) and **Tailwind CSS** handle UI components and styling, while **React Hook Form + Zod** manage form validation.

The backend is built with **Node.js + Express + TypeScript**. It features a regional FMV pricing engine, an OCR service for document processing, and a text parsing engine. **PostgreSQL database** with **Drizzle ORM** provides persistent storage for sessions, claims, line items, and pricing data points. The pricing analytics system continuously learns from user inputs to improve FMV accuracy over time.

### Feature Specifications
- **Single-Screen Claim Wizard**: Streamlined single-page design with trust badges, document upload, ZIP code, optional property address, damage type selector, and insurance offer amount. Simplified flow indicators (arrows) guide users through Upload → Details → Calculate.
- **Unit-Aware Pricing**: Supports 5 unit types with descriptive tooltips:
  - **LF** (Linear Feet) - fence, piping
  - **SF** (Square Feet) - flooring, painting  
  - **SQ** (Roofing Squares) - 100 SF per square
  - **CT** (Count/Units) - windows, doors
  - **EA** (Each) - individual items
- **Document Upload & OCR**: Supports JPG, PNG, PDF up to 10MB. Utilizes a dual OCR engine (**OCR.space API** as primary, **Tesseract.js** as local fallback) and PDF text layer detection. Employs a conservative parsing strategy for text extraction, prioritizing user review and validation.
- **Regional Pricing Intelligence**: Uses static ZIP code prefix-based multipliers and integrates external data sources for real-time adjustments. Optional property address enables more accurate property valuations via Zillow or county appraisal district lookups.
- **Continuous Learning System**: Every user submission creates pricing data points (category, unit, ZIP, quoted price, FMV) that refine future calculations. FMV engine uses weighted average: 70% historical user data + 30% baseline calculations.
- **Disaster Relief Resources**: Displays contextual resource links (FEMA, 211 Services, HUD, etc.) on the results page based on the entered ZIP code.
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

**Recent Updates** (November 24, 2025):
1. Redesigned homepage to single-screen format based on user feedback
2. Added unit selection (LF, SF, SQ, CT, EA) with explanatory tooltips
3. Implemented pricing data points system for continuous improvement
4. Added optional property address field for better property valuations
5. Integrated weighted FMV calculations using historical user data
6. Updated trust badges: Removed "Licensed & Insured", added "Updated with Live Data"
7. Added public data source citations (FEMA NFIP, BLS PPI, Texas DOI, 23 open-source databases)
8. Implemented triple CTA strategy: Hero scroll button at top, primary submit in form, secondary submit at bottom
9. Added floating translucent "MAX-CLAIM" watermark with proper accessibility attributes (aria-hidden)

**Custom Domain**: max-claim.com (GoDaddy-hosted) ready to be linked via Replit Deployments settings.

**Deferred Enhancements** (non-blocking):
- Form field error feedback with aria-describedby
- Spanish language content translations (infrastructure complete)
- Property valuation API integration (Zillow/county appraisal district)