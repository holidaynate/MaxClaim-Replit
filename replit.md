# Max-Claim - Insurance Claim Fair Market Value Tool

## Overview
Max-Claim is a free consumer advocacy web application that helps homeowners and property owners achieve fair compensation for underpaid insurance claims. It compares insurance settlement offers against real-time fair market values (FMV) to identify potential additional compensation. The application prioritizes user privacy by collecting only ZIP codes for regional pricing analysis and does not store personally identifiable information. Its core mission is to empower consumers to negotiate effectively with insurance companies, providing transparency and actionable data to disrupt the insurance claims industry.

## User Preferences
Preferred communication style: Simple, everyday language suitable for non-technical users.

## System Architecture

### UI/UX Decisions
The application features a dark slate-950 theme with sky-blue (sky-500) accents. It includes a Hero Section, a "How It Works" visual flow, a two-column desktop layout, and a Partner Section. A single-screen Claim Wizard guides users. Accessibility is a priority, adhering to WCAG AA compliance, offering keyboard navigation, and ensuring mobile responsiveness, with features like text size toggles, font style selection, high contrast mode, and reduced motion.

### Technical Implementations
Max-Claim is a full-stack web application. The frontend uses React 18, TypeScript, Vite, Wouter, TanStack Query, Shadcn/ui, Tailwind CSS, React Hook Form, and Zod. The backend is built with Node.js, Express, and TypeScript, incorporating a regional FMV pricing engine, dual OCR services (OCR.space + Tesseract.js), and a text parsing engine. PostgreSQL (Neon) with Drizzle ORM handles data persistence.

Key features include:
- **Single-Screen Claim Wizard**: Streamlined process for claim submission.
- **v2.0 Audit Engine**: Compares prices against RRC_COST and INS_MAX_COST ranges, flagging discrepancies and providing batch audit summaries.
- **Document Upload & OCR**: Supports various image and PDF formats with a dual OCR engine.
- **Regional Pricing Intelligence**: Uses ZIP code-based multipliers and external data for FMV adjustments.
- **Privacy Architecture**: Collects only anonymous data; no PII stored.
- **Monetization Infrastructure**: Partnership system for contractors/adjusters with pricing models, ZIP targeting, and lead tracking.
- **Credential-Based Auth System**: Role-based authentication for Contacts/Advocates and Partners with dashboards.
- **Auto-Approval System**: Partners are automatically approved after verifying their email.
- **User Claims Dashboard**: Authenticated users can view their claim history and reports.
- **Monetization System**: Complete partner monetization with advocate reference codes, commission management, and Stripe integration.
- **Pro Organizations Database**: A 50-state lead prospecting tool with 183+ professional organizations across 17 trade categories, supporting hierarchical structures and regional coverage with disaster risk prioritization.
- **Local Pros API**: Enhanced organization search with smart prioritization (local > state > regional > national), ZIP-to-state mapping, trade filtering, and dynamic display.
- **Disaster Risk Prioritization**: A 4-tier priority system for advocate lead targeting based on disaster frequency and primary hazards.
- **Email Templates System**: Four vendor outreach email templates with placeholder support.
- **Performance & Caching Infrastructure**: Enterprise-grade caching and async processing for audit results and batch operations.
- **Regional Pricing Infrastructure**: A demand-weighted pricing system for partner advertising with state-to-region mapping, demand multipliers, and disaster awareness.
- **Competitive Rotation Algorithm**: A budget-weighted ad placement priority system with tier multipliers, budget factors, and demand bonuses.
- **Plan Selector UI**: A three-tier advertising plan selection with regional pricing and a region picker modal.
- **Baseline Pricing Intelligence**: Multi-source pricing validation system for defensible claim estimates, using industry standards, regional cost adjustments, and historical data.

### Service Redundancy Architecture
The application implements a comprehensive failover system with cascading fallbacks for critical services:
- **OCR Service Cascade**: PaddleOCR (GPU) → OCR.space → Tesseract.js → Manual Entry.
- **LLM Router Service**: OpenAI → LocalAI → Rule-based extraction with circuit breaker pattern and automatic failover.
- **Health Check Endpoints**: For monitoring service status.
- **Carrier Intelligence Service**: Enhanced carrier pattern analysis with sample sizes, confidence calculations, and aggregated statistics, utilizing a database of historical underpayment patterns by major carriers.
- **Feature Toggle System**: Environment-based toggles for premium features.
- **Unified Cache Service**: Redis (distributed) with node-cache (local) fallback for audit results, partner weights, and pricing data.
- **Pricing Scraper Service**: Crawl4AI-style scraping with synthetic pricing fallback.
- **Scheduler Service**: Background job scheduler with daily pricing updates.
- **Lead Lifecycle Management**: Full lead status tracking with commission calculation and batch payout processing.
- **ClaimValidator Service**: Trade-specific validation for claim line items with unit normalization, quantity range checking, price warnings, and 12 trade rule sets.
- **PartnerRouter Service**: Routes claims to partners based on trade matching, geographic coverage, tier-based scoring, and a weighted selection algorithm.

### System Design Choices
- **Frontend Stack**: React 18, TypeScript, Vite, Wouter, TanStack Query, Shadcn/ui, Tailwind CSS, React Hook Form, Zod.
- **Backend Stack**: Node.js, Express, TypeScript, PostgreSQL, Drizzle ORM.
- **Database Schema**: Normalized PostgreSQL for sessions, claims, line items, pricing data, sources, and session usage.
- **OCR Service**: Cascading fallback.
- **Pricing Engine**: PostgreSQL-backed with regional multipliers.
- **Data Flow**: Document upload triggers OCR and text parsing; user input and external data drive FMV calculation; results are displayed, and pricing data points stored.
- **Supported Categories**: Roofing, Flooring, Drywall, Painting, Plumbing, Electrical, HVAC, Windows & Doors, Appliances, Cabinets, and 'Other'.

## External Dependencies
- **PaddleOCR API**: GPU-accelerated OCR.
- **OCR.space API**: Cloud OCR service.
- **Tesseract.js**: Local OCR library.
- **OpenAI API**: Primary LLM for claim analysis.
- **LocalAI**: Self-hosted LLM fallback.
- **FEMA NFIP Claims API**: Historical flood insurance claims data.
- **BLS Construction PPI**: Construction cost inflation adjustments.
- **Texas DOI Complaints**: Public complaint data for insurance companies.
- **jsPDF**: Client-side PDF generation.
- **SendGrid**: Email sending.
- **Stripe**: Payment processing and agent payouts.
- **Redis**: Distributed caching layer.