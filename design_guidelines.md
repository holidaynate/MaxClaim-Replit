# MaxClaim Design Guidelines

## Design Approach
**System-Based Approach**: Material Design 3 with professional insurance industry adaptations
- **Rationale**: Utility-focused claim processing tool requiring clarity, trust, and data-dense presentation
- **Key Principles**: Transparency in data presentation, professional credibility, efficient workflows, accessibility for diverse users

## Core Design Elements

### A. Typography
- **Primary Font**: Inter (Google Fonts) - clean, professional, excellent readability for data
- **Heading Hierarchy**:
  - H1: text-4xl font-bold (Main page titles)
  - H2: text-2xl font-semibold (Section headers)
  - H3: text-xl font-semibold (Card titles, subsections)
- **Body Text**: text-base font-normal (Forms, descriptions, data)
- **Data/Numbers**: text-lg font-medium (FMV amounts, pricing, comparisons)
- **Labels**: text-sm font-medium uppercase tracking-wide (Form labels, table headers)

### B. Layout System
- **Spacing Units**: Tailwind units of 3, 4, 6, 8, 12, 16 (e.g., p-4, mb-6, gap-8)
- **Container**: max-w-6xl mx-auto for main content areas
- **Grid Systems**:
  - Forms: Single column on mobile, 2-column (grid-cols-2) on desktop for related fields
  - Results dashboard: 3-column grid (grid-cols-1 md:grid-cols-3) for summary cards
  - Comparison tables: Full-width with horizontal scroll on mobile

### C. Component Library

**Multi-Step Form Interface**:
- Progress indicator with numbered steps at top
- Card-based section containers with clear borders
- Input fields with floating labels and helper text
- Dropdowns for item/service selection
- Quantity/price input groups in horizontal layout

**Data Comparison Dashboard**:
- Summary cards showing total quoted vs FMV, potential savings, variance percentage
- Expandable line-item table with columns: Item/Service, Quoted Price, FMV, Variance, Status indicator
- Visual variance indicators (icons showing overpriced/fair/underpriced)
- Geographic pricing context cards showing regional averages

**Results/Output Section**:
- Professional document preview card showing formatted FMV report
- Sample letter generator with editable template fields
- Action buttons: Download PDF, Email Report, Print
- Share options with mailto: link pre-populated

**Navigation**:
- Clean top navigation bar with MaxClaim logo (left), primary action button (right)
- Breadcrumb trail for multi-step process
- Sticky progress bar during form completion

**Tables**:
- Striped rows for readability
- Sortable column headers
- Highlight rows exceeding FMV threshold
- Mobile: Card-based layout replacing table structure

**Forms**:
- ZIP code input with validation and auto-formatting
- Item/service autocomplete with common insurance claim categories
- Price inputs with currency formatting ($)
- Add/remove line item buttons
- Clear error states with inline validation messages

**Cards**:
- Elevated cards (shadow-md) for distinct content sections
- Bordered cards for data groupings within sections
- Summary cards with large number displays and percentage indicators

### D. Images
**No hero image required** - this is a utility application, not a marketing site.

**Icons Only**:
- Use Heroicons (via CDN) for:
  - Form field icons (map pin for ZIP, calculator for prices)
  - Status indicators (check-circle for fair, exclamation for overpriced)
  - Action buttons (download, envelope, printer)
  - Navigation and UI controls

### E. Professional Trust Elements
- Subtle "Consumer Advocacy Tool" tagline beneath logo
- Disclaimer text in footer: "Not a licensed public adjuster or appraiser - educational tool only"
- Data privacy notice: "We never collect personal information"
- Professional document formatting in PDF outputs (letterhead-style header)

### F. Page Structure

**Main Application Flow**:
1. Landing/Start screen with brief explanation and "Start New Claim" CTA
2. Multi-step form (3-4 steps): Claim Details → Items/Services → Regional Context → Review
3. Results dashboard with FMV analysis
4. Export/Share options screen

**No marketing sections needed** - focus on functional workflow and clear data presentation.

### G. Accessibility
- WCAG AA contrast ratios throughout
- Keyboard navigation for all form fields and actions
- ARIA labels for icons and interactive elements
- Form validation with clear error messaging
- Large tap targets (min 44px) for mobile

### H. Animations
**Minimal, functional only**:
- Smooth transitions between form steps (fade)
- Loading spinner during FMV calculation
- Success confirmation on email send
- No decorative animations

This design prioritizes **professional credibility, data clarity, and efficient claim processing workflows** over visual flair, appropriate for a free consumer advocacy tool handling sensitive insurance claim data.