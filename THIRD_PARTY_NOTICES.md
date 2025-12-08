# Third-Party Notices & Open Source Usage

This document lists third-party code, services, and open data sources used by MaxClaim and how they are licensed and credited.

---

## 1. Replit Platform & Tooling

- **Replit Runtime, Workspace & Deployment**
  - Provider: Replit, Inc. (https://replit.com)
  - Usage: Hosting, development environment, deployments, and Replit-specific APIs (e.g., identity/auth, object storage).
  - License: Subject to Replit Terms of Service. No Replit source code is redistributed here.

- **Replit AI / Vibe Coding / Agents**
  - Provider: Replit, Inc.
  - Usage: Assisted code suggestions and refactors. All generated code has been reviewed and curated as part of the MaxClaim original work.
  - Note: Suggestions may have been used as inspiration; responsibility for final implementation rests with MaxClaim.

---

## 2. Open Source Libraries (Node.js / Frontend)

### Backend Framework & Security

| Package | URL | License | Usage |
|---------|-----|---------|-------|
| express | https://expressjs.com | MIT | HTTP server, routing |
| helmet | https://github.com/helmetjs/helmet | MIT | HTTP security headers |
| express-rate-limit | https://github.com/nfriedly/express-rate-limit | MIT | Rate limiting for API endpoints |
| express-session | https://github.com/expressjs/session | MIT | Session management |
| passport | https://www.passportjs.org | MIT | Authentication middleware |
| passport-local | https://github.com/jaredhanson/passport-local | MIT | Local authentication strategy |
| openid-client | https://github.com/panva/node-openid-client | MIT | OpenID Connect client |

### Database & ORM

| Package | URL | License | Usage |
|---------|-----|---------|-------|
| drizzle-orm | https://orm.drizzle.team | Apache-2.0 | Database ORM |
| drizzle-kit | https://orm.drizzle.team | MIT | Database migrations |
| drizzle-zod | https://github.com/drizzle-team/drizzle-orm | MIT | Zod schema generation |
| @neondatabase/serverless | https://neon.tech | Apache-2.0 | PostgreSQL serverless driver |
| connect-pg-simple | https://github.com/voxpelli/node-connect-pg-simple | MIT | PostgreSQL session store |

### Frontend Framework

| Package | URL | License | Usage |
|---------|-----|---------|-------|
| react | https://react.dev | MIT | UI framework |
| react-dom | https://react.dev | MIT | React DOM bindings |
| wouter | https://github.com/molefrog/wouter | ISC | Client-side routing |
| @tanstack/react-query | https://tanstack.com/query | MIT | Server state management |
| react-hook-form | https://react-hook-form.com | MIT | Form handling |

### UI Components (Radix UI)

| Package | License | Usage |
|---------|---------|-------|
| @radix-ui/react-accordion | MIT | Accordion component |
| @radix-ui/react-alert-dialog | MIT | Alert dialog component |
| @radix-ui/react-aspect-ratio | MIT | Aspect ratio component |
| @radix-ui/react-avatar | MIT | Avatar component |
| @radix-ui/react-checkbox | MIT | Checkbox component |
| @radix-ui/react-collapsible | MIT | Collapsible component |
| @radix-ui/react-context-menu | MIT | Context menu component |
| @radix-ui/react-dialog | MIT | Dialog/modal component |
| @radix-ui/react-dropdown-menu | MIT | Dropdown menu component |
| @radix-ui/react-hover-card | MIT | Hover card component |
| @radix-ui/react-label | MIT | Label component |
| @radix-ui/react-menubar | MIT | Menubar component |
| @radix-ui/react-navigation-menu | MIT | Navigation menu component |
| @radix-ui/react-popover | MIT | Popover component |
| @radix-ui/react-progress | MIT | Progress bar component |
| @radix-ui/react-radio-group | MIT | Radio group component |
| @radix-ui/react-scroll-area | MIT | Scroll area component |
| @radix-ui/react-select | MIT | Select component |
| @radix-ui/react-separator | MIT | Separator component |
| @radix-ui/react-slider | MIT | Slider component |
| @radix-ui/react-slot | MIT | Slot component |
| @radix-ui/react-switch | MIT | Switch component |
| @radix-ui/react-tabs | MIT | Tabs component |
| @radix-ui/react-toast | MIT | Toast component |
| @radix-ui/react-toggle | MIT | Toggle component |
| @radix-ui/react-toggle-group | MIT | Toggle group component |
| @radix-ui/react-tooltip | MIT | Tooltip component |

All Radix UI packages: https://www.radix-ui.com

### Styling

| Package | URL | License | Usage |
|---------|-----|---------|-------|
| tailwindcss | https://tailwindcss.com | MIT | Utility-first CSS |
| @tailwindcss/typography | https://github.com/tailwindlabs/tailwindcss-typography | MIT | Typography plugin |
| @tailwindcss/vite | https://tailwindcss.com | MIT | Tailwind Vite plugin |
| tailwind-merge | https://github.com/dcastil/tailwind-merge | MIT | Class merging utility |
| tailwindcss-animate | https://github.com/jamiebuilds/tailwindcss-animate | MIT | Animation utilities |
| tw-animate-css | https://github.com/khattak-dev/tw-animate-css | MIT | Additional animation utilities |
| class-variance-authority | https://cva.style | Apache-2.0 | Variant management |
| clsx | https://github.com/lukeed/clsx | MIT | Class name utility |
| autoprefixer | https://github.com/postcss/autoprefixer | MIT | CSS vendor prefixing |
| postcss | https://postcss.org | MIT | CSS processing |

### Icons & Animation

| Package | URL | License | Usage |
|---------|-----|---------|-------|
| lucide-react | https://lucide.dev | ISC | Icon library |
| react-icons | https://react-icons.github.io/react-icons | MIT | Icon library |
| framer-motion | https://www.framer.com/motion | MIT | Animation library |
| embla-carousel-react | https://www.embla-carousel.com | MIT | Carousel component |

### Document Processing

| Package | URL | License | Usage |
|---------|-----|---------|-------|
| jspdf | https://github.com/parallax/jsPDF | MIT | PDF generation |
| pdf-parse | https://github.com/nicknisi/pdf-parse | MIT | PDF text extraction |
| tesseract.js | https://tesseract.projectnaptha.com | Apache-2.0 | OCR processing |
| xlsx | https://sheetjs.com | Apache-2.0 | Excel file processing |

### External Services

| Package | URL | License | Usage |
|---------|-----|---------|-------|
| stripe | https://stripe.com | MIT | Payment processing |
| stripe-replit-sync | https://github.com/replit/stripe-replit-sync | MIT | Stripe integration for Replit |
| @sendgrid/mail | https://sendgrid.com | MIT | Email sending |
| @google-cloud/storage | https://cloud.google.com/storage | Apache-2.0 | Cloud storage |
| @replit/object-storage | https://replit.com | MIT | Replit object storage |

### File Upload

| Package | URL | License | Usage |
|---------|-----|---------|-------|
| multer | https://github.com/expressjs/multer | MIT | File upload handling |
| @uppy/core | https://uppy.io | MIT | File upload core |
| @uppy/dashboard | https://uppy.io | MIT | Upload dashboard UI |
| @uppy/react | https://uppy.io | MIT | React bindings for Uppy |
| @uppy/aws-s3 | https://uppy.io | MIT | S3 upload support |

### Validation & Utilities

| Package | URL | License | Usage |
|---------|-----|---------|-------|
| zod | https://zod.dev | MIT | Schema validation |
| zod-validation-error | https://github.com/causaly/zod-validation-error | MIT | Error formatting |
| @hookform/resolvers | https://react-hook-form.com | MIT | Form validation resolvers |
| date-fns | https://date-fns.org | MIT | Date utilities |
| memoizee | https://github.com/medikoo/memoizee | ISC | Memoization utility |

### Build Tools

| Package | URL | License | Usage |
|---------|-----|---------|-------|
| vite | https://vitejs.dev | MIT | Build tool & dev server |
| @vitejs/plugin-react | https://vitejs.dev | MIT | React plugin for Vite |
| @replit/vite-plugin-cartographer | https://replit.com | MIT | Replit code navigation |
| @replit/vite-plugin-dev-banner | https://replit.com | MIT | Replit dev banner |
| @replit/vite-plugin-runtime-error-modal | https://replit.com | MIT | Replit error modal |
| esbuild | https://esbuild.github.io | MIT | JavaScript bundler |
| tsx | https://github.com/esbuild-kit/tsx | MIT | TypeScript execution |
| typescript | https://www.typescriptlang.org | Apache-2.0 | TypeScript compiler |
| @jridgewell/trace-mapping | https://github.com/jridgewell/trace-mapping | MIT | Source map utilities |

### Additional UI Components

| Package | URL | License | Usage |
|---------|-----|---------|-------|
| cmdk | https://cmdk.paco.me | MIT | Command palette |
| vaul | https://vaul.emilkowal.ski | MIT | Drawer component |
| react-resizable-panels | https://github.com/bvaughn/react-resizable-panels | MIT | Resizable panels |
| react-day-picker | https://react-day-picker.js.org | MIT | Date picker |
| input-otp | https://github.com/guilhermerodz/input-otp | MIT | OTP input |
| recharts | https://recharts.org | MIT | Charts library |
| next-themes | https://github.com/pacocoursey/next-themes | MIT | Theme management |

### WebSocket & Session

| Package | URL | License | Usage |
|---------|-----|---------|-------|
| ws | https://github.com/websockets/ws | MIT | WebSocket implementation |
| memorystore | https://github.com/roccomuso/memorystore | MIT | In-memory session store |

### TypeScript Type Definitions

| Package | License | Usage |
|---------|---------|-------|
| @types/connect-pg-simple | MIT | PostgreSQL session store types |
| @types/express | MIT | Express.js types |
| @types/express-session | MIT | Express session types |
| @types/memoizee | MIT | Memoizee types |
| @types/multer | MIT | Multer types |
| @types/node | MIT | Node.js types |
| @types/passport | MIT | Passport types |
| @types/passport-local | MIT | Passport local types |
| @types/react | MIT | React types |
| @types/react-dom | MIT | React DOM types |
| @types/ws | MIT | WebSocket types |

All @types packages from DefinitelyTyped: https://github.com/DefinitelyTyped/DefinitelyTyped

### Optional Dependencies

| Package | URL | License | Usage |
|---------|-----|---------|-------|
| bufferutil | https://github.com/websockets/bufferutil | MIT | WebSocket buffer utilities |

---

## 3. Open Data & External References

MaxClaim's **pricing models and audit logic** are original, but may be informed by public information about fair market value and insurance claims, such as:

- Insurance fair-market value explanatory articles and blogs (e.g., appraisal and valuation guides).
- Public information on industry practices for ACV, RCV, and claim negotiation.
- HUD ZIP Code Crosswalk data (public government data) for regional cost adjustments.
- Bureau of Labor Statistics (BLS) Consumer Price Index data for state-level cost multipliers.
- FEMA public disaster data for regional risk assessment.

These sources are used only as conceptual references; no copyrighted text or proprietary datasets are copied into MaxClaim.

---

## 4. Docker / LAMP / Infrastructure Examples

From time to time, generic infrastructure examples (such as GitHub public images) are reviewed as configuration references.

No GPL or other incompatible-licensed code from those images is embedded in the MaxClaim codebase. They are **examples only**, not vendor libraries.

---

## 5. Perplexity, Threads, and AI Research Links

MaxClaim's design and roadmap are informed by:
- Private and public Threads in Perplexity's "MaxClaim" and "MaxClaim-Replit" Spaces, owned by **Nate Chacon**.
- AI research links and feeds curated for the InfiN8 AI Aggregator Concept & Research Links.

Perplexity's AI outputs (explanatory text, pseudocode) are used as inspiration and then re-implemented and integrated as part of this original codebase. All final implementations are treated as authored and owned by MaxClaim, unless explicitly marked as third-party.

---

## 6. License Compatibility

All third-party libraries used in MaxClaim are distributed under permissive open source licenses (MIT, Apache-2.0, ISC) that allow commercial use. No GPL, LGPL, or copyleft-licensed code is included in the MaxClaim codebase.

For questions about licensing, contact the MaxClaim project maintainer.
