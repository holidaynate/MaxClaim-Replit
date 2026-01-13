# Max-Claim - Insurance Claim Fair Market Value Tool

## Overview
Max-Claim is a free consumer advocacy web application designed to help homeowners and property owners achieve fair compensation for underpaid insurance claims. It compares insurance settlement offers against real-time fair market values (FMV) to identify potential additional compensation. The application prioritizes user privacy by collecting only ZIP codes for regional pricing analysis and does not store personally identifiable information. Its core mission is to empower consumers to negotiate effectively with insurance companies, aiming to disrupt the insurance claims industry by providing transparency and actionable data.

## User Preferences
Preferred communication style: Simple, everyday language suitable for non-technical users.

## System Architecture

### UI/UX Decisions
The application features a dark slate-950 theme with sky-blue (sky-500) accents. It includes a Hero Section, a "How It Works" visual flow, a two-column desktop layout, and a Partner Section. A single-screen Claim Wizard guides users. Accessibility is a priority, adhering to WCAG AA compliance, offering keyboard navigation, and ensuring mobile responsiveness.

### Technical Implementations
Max-Claim is a full-stack web application. The frontend uses React 18, TypeScript, Vite, Wouter, TanStack Query, Shadcn/ui, Tailwind CSS, React Hook Form, and Zod. The backend is built with Node.js, Express, and TypeScript, incorporating a regional FMV pricing engine, dual OCR services (OCR.space + Tesseract.js), and a text parsing engine. PostgreSQL (Neon) with Drizzle ORM handles data persistence.

Key features include:
- **Single-Screen Claim Wizard**: Streamlined process for claim submission.
- **v2.0 Audit Engine**: Compares entered prices against RRC_COST and INS_MAX_COST ranges, flagging discrepancies and providing batch audit summaries.
- **Document Upload & OCR**: Supports various image and PDF formats with a dual OCR engine.
- **Regional Pricing Intelligence**: Uses ZIP code-based multipliers and external data for FMV adjustments.
- **Comprehensive Accessibility**: Includes text size toggle (normal/large/extra-large), font style selection (sans-serif/serif/dyslexia-friendly), high contrast mode, reduce motion toggle, ARIA labels, and keyboard navigation. All settings persist via localStorage.
- **Privacy Architecture**: Collects only anonymous data; no PII stored.
- **Monetization Infrastructure**: Partnership system for contractors/adjusters with various pricing models, ZIP targeting, and lead tracking.
- **Credential-Based Auth System**: Role-based authentication for Contacts/Advocates and Partners with dashboards.
- **Auto-Approval System**: Partners are automatically approved after verifying their email address, eliminating manual admin approval wait times. Welcome emails are sent upon successful verification.
- **User Claims Dashboard**: Authenticated users can view their claim history and reports.
- **Monetization System**: Complete partner monetization with advocate reference codes, commission management, and Stripe integration.
- **Pro Organizations Database**: A 50-state lead prospecting tool with 183+ professional organizations across 17 trade categories (general contractors, remodelers, roofers, public adjusters, attorneys, disaster recovery, regulators, licensing boards, plumbers, electricians, HVAC, flooring, painters, restoration specialists, windows & doors, tree services, appliance repair). Supports hierarchical structures and regional coverage with disaster risk prioritization.
- **Local Pros API**: Enhanced organization search with smart prioritization (local > state > regional > national), ZIP-to-state mapping, trade filtering, and dynamic organization display with collapsible "Show more" UI.
- **Disaster Risk Prioritization**: A 4-tier priority system for advocate lead targeting based on disaster frequency and primary hazards.
- **Email Templates System**: Four vendor outreach email templates with placeholder support.
- **Performance & Caching Infrastructure**: Enterprise-grade caching and async processing for audit results and batch operations.
- **Regional Pricing Infrastructure**: A demand-weighted pricing system for partner advertising with state-to-region mapping, demand multipliers, and disaster awareness.
- **Competitive Rotation Algorithm**: A budget-weighted ad placement priority system with tier multipliers, budget factors, and demand bonuses.
- **Plan Selector UI**: A three-tier advertising plan selection with regional pricing and a region picker modal. Build Your Own plan includes partner-type budget validation (contractors: $200 min, adjusters: $50 min) with recommended $200/mo guidance.
- **Baseline Pricing Intelligence**: Multi-source pricing validation system for defensible claim estimates, using industry standards, regional cost adjustments, and historical data.

### Service Redundancy Architecture (v3.2)
The application implements a comprehensive failover system with cascading fallbacks:

- **OCR Service Cascade**: PaddleOCR (GPU) → OCR.space → Tesseract.js → Manual Entry. Configured via `.replit-redundancy.json`.
- **LLM Router Service**: OpenAI → LocalAI → Rule-based extraction with circuit breaker pattern and automatic failover.
- **Health Check Endpoints**: `/api/health`, `/api/health/primary`, `/api/health/fallback`, `/api/health/features` for monitoring service status.
- **Carrier Intelligence Service**: Enhanced carrier pattern analysis with sample sizes, confidence calculations, and aggregated statistics. Includes `calculateConfidence()`, `getCarrierStats()`, and `analyzeClaimForCarrier()` functions.
- **Carrier Intelligence Database**: Historical underpayment patterns by major carriers (State Farm, Allstate, Liberty Mutual, Progressive, Farmers, USAA) with 20+ documented patterns and risk scoring.
- **Feature Toggle System**: Environment-based toggles for premium features (advanced-analytics, multi-agent-swarm, realtime-notifications, carrier-intelligence, local-ai-fallback).
- **Unified Cache Service**: Redis (distributed) with node-cache (local) fallback. Full Redis client integration when REDIS_URL is configured. TTLs: audit results (7d), partner weights (1h), pricing data (24h).
- **Pricing Scraper Service**: Crawl4AI-style scraping with synthetic pricing fallback for 10 categories across 5 regions.
- **Scheduler Service**: Background job scheduler with daily pricing updates. Endpoints: `/api/scheduler/status`, `/api/scheduler/run/:jobName`.
- **Lead Lifecycle Management**: Full lead status tracking (pending → in_progress → closed → paid) with commission calculation and batch payout processing.
- **Distribution Testing Utility**: Statistical validation of weighted rotation algorithm using chi-square tests.

### New Database Tables (v3.2)
- `carrier_trends`: Underpayment patterns by carrier with frequency, strategy, and confidence scores.
- `feature_flags`: Premium feature toggles with tier-based activation.
- `partner_leads` enhancements: Added `status` field (pending/in_progress/closed/paid), `claim_value`, `commission_rate`, `commission_amount`, `closed_at`, and `paid_at` columns.

### System Design Choices
- **Frontend Stack**: React 18, TypeScript, Vite, Wouter, TanStack Query, Shadcn/ui, Tailwind CSS, React Hook Form, Zod.
- **Backend Stack**: Node.js, Express, TypeScript, PostgreSQL, Drizzle ORM.
- **Database Schema**: Normalized PostgreSQL for sessions, claims, line items, pricing data, sources, and session usage.
- **OCR Service**: Cascading fallback with PaddleOCR (GPU), OCR.space (cloud), Tesseract.js (local), and manual entry fallback.
- **Pricing Engine**: PostgreSQL-backed with regional multipliers and data collection for future refinement.
- **Data Flow**: Document upload triggers OCR and text parsing; user input and external data drive FMV calculation; results are displayed, and pricing data points stored.
- **Supported Categories**: Roofing, Flooring, Drywall, Painting, Plumbing, Electrical, HVAC, Windows & Doors, Appliances, Cabinets, and 'Other'.

## External Dependencies
- **PaddleOCR API**: GPU-accelerated OCR (optional, via PADDLEOCR_API_URL).
- **OCR.space API**: Cloud OCR service fallback.
- **Tesseract.js**: Local OCR library fallback.
- **OpenAI API**: Primary LLM for claim analysis (optional, via OPENAI_API_KEY).
- **LocalAI**: Self-hosted LLM fallback (optional, via LOCAL_AI_URL).
- **FEMA NFIP Claims API**: Historical flood insurance claims data.
- **BLS Construction PPI**: Construction cost inflation adjustments.
- **Texas DOI Complaints**: Public complaint data for insurance companies.
- **jsPDF**: Client-side PDF generation.
- **SendGrid**: Email sending.
- **Stripe**: Payment processing and agent payouts.
- **Redis**: Distributed caching layer (optional, via REDIS_URL).

## New Services (v3.2)
Located in `server/services/`:
- `healthCheck.ts`: Service health monitoring with primary/fallback status.
- `llmRouter.ts`: LLM orchestration with circuit breaker pattern.
- `featureFlags.ts`: Tier-based feature toggle system.
- `pricingScraper.ts`: Pricing data collection with synthetic fallback.
- `cacheService.ts`: Unified Redis/node-cache with full Redis client integration when REDIS_URL is configured.
- `carrierIntel.ts`: Enhanced carrier intelligence with sample size thresholds, confidence calculations, and claim analysis.
- `leadStore.ts`: Lead lifecycle management with status transitions, commission calculations, and batch payout processing.
- `scheduler.ts`: Background job scheduler for daily pricing updates and future scheduled tasks.
- `distributionTest.ts`: Statistical testing utility for weighted rotation algorithm validation.

## New API Endpoints (v3.2)
- `GET /api/leads/:id`: Retrieve single lead by ID.
- `PATCH /api/leads/:id/status`: Update lead status with validation.
- `POST /api/leads/:id/payout`: Trigger payout for closed leads (admin).
- `GET /api/partners/:id/lead-stats`: Get partner lead statistics.
- `GET /api/leads/ready-for-payout`: Query leads ready for payout (admin).
- `POST /api/leads/batch-payout`: Batch mark leads as paid (admin).
- `GET /api/partners/:id/leads/export`: Export partner leads to CSV.
- `GET /api/carrier-stats`: Get overall carrier intelligence statistics.
- `GET /api/carrier-stats?carrier=X`: Get specific carrier statistics.
- `POST /api/carrier-analyze`: Analyze claim items for carrier-specific patterns.
- `GET /api/carriers`: List all carriers with pattern counts.
- `GET /api/test/distribution`: Run weighted rotation distribution test.
- `GET /api/test/weights`: Validate rotation weight factors.
- `GET /api/scheduler/status`: View scheduler status and job info.
- `POST /api/scheduler/run/:jobName`: Manually run scheduler job (admin).
- `GET /api/cache/status`: View cache provider status and statistics.

## Configuration Files
- `.replit-redundancy.json`: Service failover configuration and feature toggles.