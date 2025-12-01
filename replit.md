# Max-Claim - Insurance Claim Fair Market Value Tool

## Overview
Max-Claim is a free consumer advocacy web application that helps homeowners and property owners receive fair compensation for underpaid insurance claims. It compares insurance settlement offers against real-time fair market values (FMV) to highlight potential additional compensation. The application focuses on user privacy by only collecting ZIP codes for regional pricing analysis and does not store personally identifiable information. Its core purpose is to empower consumers to negotiate effectively with insurance companies and bridge the gap between low-ball offers and actual market values.

## User Preferences
Preferred communication style: Simple, everyday language suitable for non-technical users.

## System Architecture

### UI/UX Decisions
The application features a modern dark slate-950 theme with sky-blue (sky-500) accents. The homepage includes a Hero Section with branding, a "How It Works" visual flow, a two-column desktop layout (claim form on left, contractor matching/resources on right), and a Partner Section. A preserved single-screen Claim Wizard uses trust badges and a triple CTA strategy to guide users. Accessibility is prioritized with WCAG AA compliance, keyboard navigation, and mobile responsiveness.

### Technical Implementations
Max-Claim is a full-stack web application. The frontend uses **React 18 + TypeScript + Vite**, with **Wouter** for routing, **TanStack Query** for server state, **Shadcn/ui** and **Tailwind CSS** for UI, and **React Hook Form + Zod** for form validation. The backend is built with **Node.js + Express + TypeScript**, incorporating a regional FMV pricing engine, OCR service, and text parsing engine. A **PostgreSQL database** with **Drizzle ORM** handles persistent storage. The pricing analytics system continuously refines FMV accuracy.

### Feature Specifications
- **Single-Screen Claim Wizard**: Streamlined flow for document upload, ZIP code, damage type, and insurance offer amount.
- **ZIP-Aware Contractor Matching**: Filters local contractors based on user ZIP code, with CTAs and referral tracking for monetization.
- **Unit-Aware Pricing**: Supports 5 unit types (LF, SF, SQ, CT, EA) with descriptive tooltips.
- **Document Upload & OCR**: Supports JPG, PNG, PDF with dual OCR engine (**OCR.space API** and **Tesseract.js** fallback).
- **Regional Pricing Intelligence**: Uses ZIP code-based multipliers and external data sources for real-time FMV adjustments.
- **Continuous Learning System**: Refines FMV calculations using historical user submission data (70% user data + 30% baseline).
- **Disaster Relief Resources**: Provides links to FEMA, 211 Services, SBA Loans, HUD, and local DOI.
- **PDF Export**: Client-side PDF generation of comprehensive reports.
- **Email Report**: Allows users to email report summaries via mailto: links.
- **Comprehensive Accessibility**: Text size toggle, high contrast mode, bilingual support infrastructure, ARIA labels, keyboard navigation.
- **Legal Compliance**: Persistent footer with disclaimers and modal dialogs for legal information.
- **Privacy Architecture**: Collects only anonymous data (ZIP codes, optional property addresses, item categories, units, quantities, pricing comparisons). No PII stored.
- **Monetization Infrastructure**: Includes a partnership system for contractors/adjusters with various pricing models (CPC, Affiliate, Banner ads), ZIP targeting, weighted rotation, click tracking, and an admin dashboard for partner management.

### System Design Choices
- **Frontend Stack**: React 18, TypeScript, Vite, Wouter, TanStack Query, Shadcn/ui, Tailwind CSS, React Hook Form, Zod.
- **Backend Stack**: Node.js, Express, TypeScript, PostgreSQL, Drizzle ORM.
- **Database Schema**: Normalized PostgreSQL for sessions, claims, line items, pricing data, sources, and session usage.
- **OCR Service**: Utilizes both cloud-based and local engines for robustness.
- **Pricing Engine**: PostgreSQL-backed with regional multipliers and continuous learning.
- **Data Flow**: Document upload triggers OCR and text parsing for auto-population; user input and external data drive FMV calculation, results are displayed, and pricing data points stored.
- **Supported Categories**: Roofing, Flooring, Drywall, Painting, Plumbing, Electrical, HVAC, Windows & Doors, Appliances, Cabinets, and 'Other'.

## External Dependencies
- **OCR.space API**: Primary OCR service for document text extraction.
- **Tesseract.js**: Local OCR library, fallback for document text extraction.
- **FEMA NFIP Claims API**: Provides historical flood insurance claims data.
- **BLS Construction PPI**: Used for construction cost inflation adjustments.
- **Texas DOI Complaints**: Offers public complaint data for insurance companies.
- **jsPDF**: Client-side PDF generation library.