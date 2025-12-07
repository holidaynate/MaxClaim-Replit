# Max-Claim - Insurance Claim Fair Market Value Tool

## Overview
Max-Claim is a free consumer advocacy web application that helps homeowners and property owners receive fair compensation for underpaid insurance claims. It compares insurance settlement offers against real-time fair market values (FMV) to highlight potential additional compensation. The application focuses on user privacy by only collecting ZIP codes for regional pricing analysis and does not store personally identifiable information. Its core purpose is to empower consumers to negotiate effectively with insurance companies and bridge the gap between low-ball offers and actual market values.

## User Preferences
Preferred communication style: Simple, everyday language suitable for non-technical users.

## System Architecture

### UI/UX Decisions
The application features a modern dark slate-950 theme with sky-blue (sky-500) accents. The homepage includes a Hero Section with branding, a "How It Works" visual flow, a two-column desktop layout (claim form on left, contractor matching/resources on right), and a Partner Section. A preserved single-screen Claim Wizard uses trust badges and a triple CTA strategy to guide users. Accessibility is prioritized with WCAG AA compliance, keyboard navigation, and mobile responsiveness.

### Technical Implementations
Max-Claim is a full-stack web application. The frontend uses **React 18 + TypeScript + Vite**, with **Wouter** for routing, **TanStack Query** for server state, **Shadcn/ui** and **Tailwind CSS** for UI, and **React Hook Form + Zod** for form validation. The backend is built with **Node.js + Express + TypeScript**, incorporating a regional FMV pricing engine, dual OCR service (OCR.space + Tesseract.js), and text parsing engine. A **PostgreSQL database** (Neon) with **Drizzle ORM** handles persistent storage. Pricing data is collected for future analytics refinement.

### Feature Specifications
- **Single-Screen Claim Wizard**: Streamlined flow for document upload, ZIP code, damage type, and insurance offer amount.
- **ZIP-Aware Contractor Matching**: Filters local contractors based on user ZIP code, with CTAs and referral tracking for monetization.
- **Unit-Aware Pricing**: Supports 5 unit types (LF, SF, SQ, CT, EA) with descriptive tooltips.
- **v2.0 Audit Engine** (shared/priceAudit.ts): Unit-price based audit comparing entered prices against RRC_COST (contractor minimum) and INS_MAX_COST (insurer maximum) ranges. Flags items as LOW_FLAG (underpaid), HIGH_FLAG (overpaid), PASS (fair), MISSING_ITEM (not in database), or INVALID_QUANTITY. Auto-calculates subtotals from unit price × quantity. Batch audit provides summary with total claim value, expected market value, variance, and potential underpayment calculations.
- **Document Upload & OCR**: Supports JPG, PNG, PDF with dual OCR engine (**OCR.space API** and **Tesseract.js** fallback).
- **Regional Pricing Intelligence**: Uses ZIP code-based multipliers and external data sources for real-time FMV adjustments.
- **Pricing Data Collection**: Stores user submission data for future FMV refinement (infrastructure ready, active refinement pending).
- **Disaster Relief Resources**: Provides links to FEMA, 211 Services, SBA Loans, HUD, and local DOI.
- **PDF Export**: Client-side PDF generation of comprehensive reports.
- **Email Report**: Allows users to email report summaries via mailto: links.
- **Comprehensive Accessibility**: Text size toggle, high contrast mode, bilingual support infrastructure, ARIA labels, keyboard navigation.
- **Legal Compliance**: Persistent footer with disclaimers and modal dialogs for legal information.
- **Privacy Architecture**: Collects only anonymous data (ZIP codes, optional property addresses, item categories, units, quantities, pricing comparisons). No PII stored.
- **Monetization Infrastructure**: Partnership system for contractors/adjusters with pricing models (CPC, Affiliate, Banner ads), ZIP targeting, weighted rotation, lead/click tracking, and password-protected admin dashboard for partner approval. Payment processing not yet integrated.

### System Design Choices
- **Frontend Stack**: React 18, TypeScript, Vite, Wouter, TanStack Query, Shadcn/ui, Tailwind CSS, React Hook Form, Zod.
- **Backend Stack**: Node.js, Express, TypeScript, PostgreSQL, Drizzle ORM.
- **Database Schema**: Normalized PostgreSQL for sessions, claims, line items, pricing data, sources, and session usage.
- **OCR Service**: Utilizes both cloud-based and local engines for robustness.
- **Pricing Engine**: PostgreSQL-backed with regional multipliers and data collection for future refinement.
- **Data Flow**: Document upload triggers OCR and text parsing for auto-population; user input and external data drive FMV calculation, results are displayed, and pricing data points stored.
- **Supported Categories**: Roofing, Flooring, Drywall, Painting, Plumbing, Electrical, HVAC, Windows & Doors, Appliances, Cabinets, and 'Other'.

## Core Algorithms

### Partner Matching Algorithm (server/controllers/partnerMatching.ts)
Fair geo-targeting algorithm that prioritizes local contractors while maintaining monetization fairness.

**Scoring System:**
- Primary ZIP match: +100 points
- Primary area code match: +80 points
- Secondary ZIP match: +50 points
- Secondary area code match: +40 points
- Local business bonus: +30 points
- Regional business bonus: +15 points
- Featured partner bonus: +10 points

**Multipliers (applied after local scoring):**
- Free tier: 1.0x
- Standard tier: 1.3x
- Premium tier: 1.6x
- Ad weight: Custom multiplier per partner

**Key Principle:** Local contractors always rank higher than non-local, regardless of payment tier. Payment tier only affects ranking among contractors with similar coverage.

### Location Utilities (server/utils/location.ts)
Privacy-first location mapping using user-provided ZIP codes.

**Current Implementation (ZIP-based):**
- ZIP prefix → area code mapping (Texas metros: San Antonio, Austin, Houston, Dallas)
- ZIP prefix → metro area lookup
- Coarse location detection (metro level, not precise)
- No PII storage - only anonymous regional data

**Future Enhancement (not yet implemented):**
- IP-based coarse location detection from request headers
- Auto-detection with optional ZIP refinement

**Covered Metros:**
- San Antonio (782xx, area codes 210/726)
- Austin (786xx-787xx, area codes 512/737)
- Houston (770xx-777xx, area codes 713/281/832/346)
- Dallas (750xx-753xx, area codes 214/469/972/945)

## External Dependencies
- **OCR.space API**: Primary OCR service for document text extraction.
- **Tesseract.js**: Local OCR library, fallback for document text extraction.
- **FEMA NFIP Claims API**: Provides historical flood insurance claims data.
- **BLS Construction PPI**: Used for construction cost inflation adjustments.
- **Texas DOI Complaints**: Offers public complaint data for insurance companies.
- **jsPDF**: Client-side PDF generation library.

## Environment Secrets

### Required Secrets (App fails without these)
The server validates these at startup and throws an error if missing:
- **SESSION_SECRET**: Session encryption key for admin authentication
- **DATABASE_URL**: PostgreSQL connection string (Neon)
- **ADMIN_PASSWORD**: Password for admin dashboard access

### Optional Secrets (App works without these, with limitations)
- **BLS_API_KEY**: Bureau of Labor Statistics API key (improves rate limits for inflation data)
- **OCR_SPACE_API_KEY**: OCR.space API key (defaults to free tier 'helloworld' key if missing)
- **SOCRATA_APP_TOKEN**: Texas Open Data portal token (improves rate limits for DOI complaint data)

### Auto-Provisioned by Replit
These are automatically managed by Replit and should not be manually set:
- **PGDATABASE**, **PGHOST**, **PGPORT**, **PGUSER**, **PGPASSWORD**: PostgreSQL connection details
- **REPLIT_DOMAINS**, **REPLIT_DEV_DOMAIN**, **REPL_ID**: Replit environment info

## Beta Checklist Status

### Completed
- All secrets in Replit environment variables
- Helmet security headers added
- Rate limiting on /api/* routes
- Input validation on all forms and APIs
- Global error handler (no stack traces to users)
- priceDB loaded once and cached with TTL
- Batch processing (10 items at a time)
- Memory usage monitored (target <250MB)
- /health endpoint added
- ZIP code → metro/area code mapping (user-provided ZIP)
- Partner service area configuration
- Fair matching algorithm (local priority)
- Clear landing page with "How It Works"
- Disclaimer about informational use only
- Step-by-step form with placeholders and units
- Results page with clear range and next steps
- partners.json schema with serviceAreas
- matchPartnersToUser() algorithm
- Top 5 partners displayed per user
- Payment tier is multiplier, not override
- Tested with 55 item claims (batch audit successful)
- Verified local partners rank first (563.2 score for Austin ZIP vs 102.4 for out-of-area)
- Confirmed free tier partners appear in results
- Memory stable under load (150MB heap after 50 concurrent batch audits)

### Pending Implementation
- IP-based coarse location detection from request headers
- Optional ZIP refinement after IP detection

### Recent Additions (Dec 2024)
- **Replit Auth Integration**: Full OpenID Connect authentication via Replit Auth
  - Session storage in PostgreSQL (auth_sessions table)
  - User data in replit_users table with auto-upsert on login
  - Protected routes with isAuthenticated middleware
  - Frontend AuthButton component in header
- **User Claims Dashboard**: /my-claims page for authenticated users
  - Links claims to users via user_claims table
  - View claim history with line items and audit results
  - Access stored PDF reports
- **Protected File Access**: /files/:claimId/:filename with ownership verification
- **Object Storage Utilities**: server/utils/objectStorage.ts for Replit Object Storage
- **Email Utilities**: server/utils/email.ts for SendGrid integration (ready)
- **PDF Utilities**: server/utils/pdf.ts for server-side PDF generation (ready)
- **Pricing Refresh Script**: scripts/refreshPricing.ts for scheduled cache updates
- **Numeric Field Handling**: PostgreSQL numeric columns properly converted to JS numbers

### Known Beta Limitations
- IP geolocation is coarse (metro area only)
- Partner payment processing not implemented (placeholders only)
- Email sending requires SendGrid API key configuration
- Scheduled tasks (pricing refresh) need external cron trigger