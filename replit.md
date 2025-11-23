# Max-Claim - Insurance Claim Fair Market Value Tool

## Overview

Max-Claim is a free consumer advocacy web application that helps homeowners and property owners get the full amount they deserve from underpaid insurance claims. The tool compares insurance company settlement offers against fair market values (FMV) and shows users how much additional compensation they should fight for. Built with privacy as a priority, it only collects ZIP codes for regional pricing analysis without storing any personally identifiable information.

**Key Value Proposition**: Insurance companies often underpay claims by 10-30%. Max-Claim reveals the gap between low-ball offers and actual fair market values, empowering consumers to negotiate effectively.

## User Preferences

Preferred communication style: Simple, everyday language suitable for non-technical users.

## Recent Changes (November 23, 2025)

### ✅ Completed Features
1. **Full Backend Implementation**
   - Regional FMV pricing engine with ZIP code-based multipliers
   - `/api/claims/analyze` endpoint for real-time calculations
   - Anonymous analytics storage (ZIP codes and claim data only)
   - Storage interface for future database integration

2. **Frontend Integration**
   - Connected multi-step form to backend API
   - Real-time FMV calculations on results page
   - Loading states during API calls
   - Error handling and retry functionality

3. **Branding Updates**
   - Integrated Max-Claim logo (custom illustration with shield and hammer)
   - Updated all copy to emphasize "additional amount deserved" vs "savings"
   - Changed terminology from "quoted price" to "insurance offer"
   - Results display focuses on INCREASE to claim amount (green highlights)

4. **External API Integration** (NEW - November 23, 2025)
   - **FEMA NFIP Claims API**: Historical flood insurance claims by ZIP code
   - **BLS Construction PPI**: Year-over-year inflation adjustments
   - **Texas DOI Complaints**: Public complaint data for insurers
   - All APIs have graceful fallbacks to static pricing if unavailable
   - URL encoding fixes for OData queries
   - Proper YoY inflation calculation (2-5% typical, not 70%+ error)

5. **End-to-End Testing**
   - Verified complete user flow from welcome to results
   - Confirmed API integration works correctly
   - Validated FMV calculations show higher amounts than insurance offers
   - Tested external API fallback behavior

6. **Document Upload & OCR Feature** (NEW - November 23, 2025)
   - **Dual OCR Engine**: OCR.space API (primary, 500 free requests/day) + Tesseract.js (local fallback)
   - **File Upload**: Drag-and-drop or file select (JPG, PNG, PDF up to 10MB)
   - **Smart Text Extraction**: PDF text layer detection first, then OCR for scanned documents
   - **Intelligent Parsing**: Pattern matching to extract item categories, descriptions, quantities, and prices
   - **Category Detection**: Keyword-based matching to auto-assign proper categories
   - **Auto-Population**: Extracted items automatically added to claim form
   - **User Control**: Users can review, edit, or add more items after OCR processing
   - **Error Handling**: Graceful fallbacks with user-friendly messages if OCR fails

## Core Features

### Multi-Step Claim Analysis Wizard
1. **Welcome Screen** - Explains service and privacy commitment
2. **Location Step** - ZIP code entry for regional pricing
3. **Items Step** - Upload insurance document (optional) OR manually add claim items
   - Document upload with OCR automatically extracts items
   - Manual entry for categories, descriptions, quantities, insurance offers
   - Users can combine both methods (upload + manual additions)
4. **Review Step** - Verify all entered data before calculation
5. **Results Step** - Display FMV analysis showing additional amount deserved

### Categories Supported
- Roofing (shingles, repairs)
- Flooring (hardwood, carpet, tile)
- Drywall (installation, repair)
- Painting (interior/exterior)
- Plumbing (fixtures, repairs)
- Electrical (circuits, outlets)
- HVAC (systems, installation)
- Windows & Doors
- Appliances
- Cabinets
- Other (custom items)

### Regional Pricing Intelligence

**Static Regional Multipliers:**
- ZIP code prefix-based multipliers (first 3 digits)
- Accounts for cost-of-living differences across US regions
- Examples:
  - South Texas (780-785): 8-12% below national average
  - NYC area (100-101): 25-30% above national average
  - California (900-901): 20-25% above national average
  - Georgia (770-771): 5-10% above national average

**External Data Sources (Real-time):**
- **FEMA NFIP Claims**: Historical flood insurance claim counts and average payouts by ZIP
- **BLS Construction PPI**: Year-over-year construction cost inflation (typically 2-5%)
- **Texas DOI**: Public complaint counts by insurance company
- All external data sources have automatic fallback to static pricing if APIs fail

## System Architecture

### Frontend Stack
- **Framework**: React 18 + TypeScript + Vite
- **Routing**: Wouter (lightweight SPA routing)
- **State Management**: TanStack Query for server state, React useState for local UI
- **UI Components**: Shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS with custom design tokens
- **Forms**: React Hook Form + Zod validation
- **Design Philosophy**: Material Design 3 adapted for insurance industry (professional, trustworthy)

### Backend Stack
- **Runtime**: Node.js + Express + TypeScript
- **API Endpoints**:
  - `POST /api/claims/analyze` - FMV calculation and analysis
  - `POST /api/ocr/upload` - Document upload and OCR processing
- **OCR Service**: Multi-engine text extraction (`server/ocr-service.ts`)
  - OCR.space API (free tier, 500 requests/day)
  - Tesseract.js (local, unlimited, fallback)
  - PDF text extraction (for searchable PDFs)
- **Text Parsing**: Pattern matching for claim items (regex-based extraction)
- **File Upload**: Multer middleware (10MB limit, JPG/PNG/PDF only)
- **Pricing Engine**: In-memory database with regional multipliers (`server/pricing-data.ts`)
- **Storage**: In-memory analytics (currently MemStorage, ready for DB migration)
- **Validation**: Zod schemas shared between client/server

### Data Flow

**Document Upload Flow:**
```
User Uploads Document (PDF/Image)
  → POST /api/ocr/upload (with FormData)
  → OCR Service (server/ocr-service.ts)
    1. If PDF: Try text extraction first
    2. Try OCR.space API (fast, cloud-based)
    3. Fallback to Tesseract.js (local, unlimited)
  → Text Parsing Engine
    - Extract line items with prices
    - Detect categories via keyword matching
    - Parse quantities and descriptions
  → JSON Response (parsed items)
  → Auto-populate Items form
  → User can review, edit, or add more items
```

**FMV Calculation Flow:**
```
User Input (ZIP + Items) 
  → Frontend Form Validation (Zod) 
  → POST /api/claims/analyze
  → Fetch External API Data (parallel)
    - FEMA claims data
    - BLS inflation index
    - Texas DOI complaints
  → Backend Calculation (pricing-data.ts)
    - Apply category base price
    - Apply regional multiplier
    - Apply inflation adjustment
    - Calculate additional amount deserved
  → JSON Response
  → Display Results with Green Highlighting
```

### Privacy Architecture
**What We DON'T Collect:**
- Names, addresses, phone numbers, emails
- Account creation or login
- Damage photos or property details
- Policy numbers or claim numbers

**What We DO Collect (Anonymous):**
- ZIP codes (for regional pricing only)
- Item categories and quantities
- Price comparisons (aggregate analytics)

**Rationale**: Builds user trust, reduces compliance burden, minimizes data liability

## Key Files

### Frontend
- `client/src/pages/home.tsx` - Main application page with wizard flow
- `client/src/components/WelcomeScreen.tsx` - Landing/intro
- `client/src/components/ZipCodeStep.tsx` - Step 1: Location
- `client/src/components/ItemsStep.tsx` - Step 2: Claim items entry
- `client/src/components/ReviewStep.tsx` - Step 3: Review before calculation
- `client/src/components/ResultsStep.tsx` - Step 4: FMV analysis display
- `client/src/components/ProgressSteps.tsx` - Multi-step progress indicator
- `client/src/components/Header.tsx` - App header with logo
- `client/src/components/Footer.tsx` - Disclaimers and privacy notice

### Backend
- `server/routes.ts` - API endpoints (claim analysis)
- `server/pricing-data.ts` - FMV calculation engine with regional multipliers
- `server/storage.ts` - Storage interface for analytics
- `shared/schema.ts` - Shared TypeScript types and Zod schemas

### Configuration
- `design_guidelines.md` - UI/UX design system rules
- `vite.config.ts` - Build configuration
- `tailwind.config.ts` - Design tokens and theme
- `client/src/index.css` - Custom CSS variables and elevation utilities

## API Reference

### POST /api/claims/analyze

Analyzes insurance claim offer against fair market values.

**Request:**
```json
{
  "zipCode": "78501",
  "items": [
    {
      "category": "Roofing",
      "description": "Asphalt shingle replacement",
      "quantity": 25,
      "quotedPrice": 6500
    }
  ]
}
```

**Response:**
```json
{
  "zipCode": "78501",
  "items": [
    {
      "category": "Roofing",
      "description": "Asphalt shingle replacement",
      "quantity": 25,
      "insuranceOffer": 6500,
      "fmvPrice": 10687.50,
      "additionalAmount": 4187.50,
      "percentageIncrease": 64.4,
      "status": "underpaid"
    }
  ],
  "summary": {
    "totalInsuranceOffer": 6500,
    "totalFMV": 10687.50,
    "totalAdditional": 4187.50,
    "overallIncrease": 64.4
  }
}
```

### GET /api/stats/regional

Returns aggregated regional statistics (for future analytics dashboard).

**Response:**
```json
[
  {
    "zipCode": "780",
    "analysisCount": 42,
    "avgUnderpayment": 18.5,
    "commonCategories": ["Roofing", "Drywall", "Flooring"]
  }
]
```

## Development

### Running Locally
```bash
npm run dev
```
Starts both Vite dev server (frontend) and Express server (backend) on port 5000.

### Building for Production
```bash
npm run build
npm start
```

### Adding New Categories
1. Add entry to `fmvPricingData` in `server/pricing-data.ts`
2. Include base price, unit type, and regional multipliers
3. Add category to dropdown in `client/src/components/ItemsStep.tsx`

### Updating Regional Multipliers
Edit the `regionalMultipliers` object for each category in `server/pricing-data.ts`. Use first 3 digits of ZIP code as keys.

## Future Enhancements

### Phase 1 (Core Improvements)
- [ ] PDF generation for downloadable reports
- [ ] Email delivery of analysis results
- [ ] Sample negotiation letter templates
- [ ] Expand pricing database with more granular regional data

### Phase 2 (Advanced Features)
- [ ] Photo upload for damage documentation
- [ ] Historical claim tracking (anonymous)
- [ ] Regional price trend charts
- [ ] Export to Excel/CSV formats

### Phase 3 (Data Enhancement)
- [ ] Real-time market data integration
- [ ] Material price APIs (lumber, copper, etc.)
- [ ] Labor rate APIs by region
- [ ] Inflation adjustment factors

### Phase 4 (Optional User Features)
- [ ] Optional accounts for saving analyses
- [ ] Claim history dashboard
- [ ] Email notifications for price updates
- [ ] Sharing analyses with contractors/adjusters

## Deployment Notes

**Current Environment**: Replit (free tier compatible)
- In-memory storage (no database costs)
- No external API dependencies
- Self-contained application

**Migration Path to Production**:
1. **Database**: Replace MemStorage with PostgreSQL
2. **Pricing Data**: Move to database with admin UI for updates
3. **CDN**: Serve static assets via CDN for global performance
4. **Custom Domain**: Point max-claim.com to deployment
5. **Analytics**: Add privacy-respecting analytics (Plausible, Fathom)

## Legal & Compliance

### Disclaimers (included in footer)
- NOT a licensed public adjuster or appraiser
- Educational tool only
- No guarantee of claim outcomes
- Users should verify prices with local contractors
- Encourages users to consult professionals

### Privacy Commitment
- No PII collection
- No cookies or tracking
- No third-party analytics
- Open source transparency

## Design Philosophy

**Professional Trust**: Clean, data-focused interface builds credibility
**User Empowerment**: Shows users exact dollar amounts they're missing
**Transparency**: Clear methodology, no hidden fees, no upsells
**Accessibility**: WCAG AA compliant, keyboard navigation, mobile responsive
**Speed**: Fast calculations, minimal loading states, instant results

## Contact & Support

For technical issues or feature requests, users should contact via the project repository or domain contact information.

**Note**: This is a community advocacy tool, not a commercial service. There is no customer support team, but the codebase is well-documented for developer contributions.
