import { db } from "./db";
import { sources, sourceVersions, type InsertSource, type InsertSourceVersion } from "@shared/schema";
import { eq } from "drizzle-orm";

const attributionData: Array<InsertSource & { version: string; notes?: string }> = [
  // Frontend Libraries
  {
    name: "React",
    category: "library",
    url: "https://react.dev/",
    license: "MIT",
    description: "A JavaScript library for building user interfaces",
    version: "18.x",
  },
  {
    name: "Vite",
    category: "library",
    url: "https://vitejs.dev/",
    license: "MIT",
    description: "Next Generation Frontend Tooling",
    version: "5.x",
  },
  {
    name: "Shadcn/ui",
    category: "library",
    url: "https://ui.shadcn.com/",
    license: "MIT",
    description: "Beautifully designed components built with Radix UI and Tailwind CSS",
    version: "Latest",
    notes: "Component library based on Radix UI primitives",
  },
  {
    name: "Radix UI",
    category: "library",
    url: "https://www.radix-ui.com/",
    license: "MIT",
    description: "Unstyled, accessible component primitives for React",
    version: "Latest",
  },
  {
    name: "Tailwind CSS",
    category: "library",
    url: "https://tailwindcss.com/",
    license: "MIT",
    description: "A utility-first CSS framework",
    version: "4.x",
  },
  {
    name: "TanStack Query",
    category: "library",
    url: "https://tanstack.com/query/",
    license: "MIT",
    description: "Powerful asynchronous state management for React",
    version: "5.x",
  },
  {
    name: "React Hook Form",
    category: "library",
    url: "https://react-hook-form.com/",
    license: "MIT",
    description: "Performant, flexible and extensible forms with easy-to-use validation",
    version: "Latest",
  },
  {
    name: "Zod",
    category: "library",
    url: "https://zod.dev/",
    license: "MIT",
    description: "TypeScript-first schema validation with static type inference",
    version: "Latest",
  },
  {
    name: "Wouter",
    category: "library",
    url: "https://github.com/molefrog/wouter",
    license: "MIT",
    description: "A minimalist-friendly routing library for React",
    version: "Latest",
  },
  {
    name: "Lucide React",
    category: "library",
    url: "https://lucide.dev/",
    license: "ISC",
    description: "Beautiful & consistent icon toolkit",
    version: "Latest",
  },
  {
    name: "Framer Motion",
    category: "library",
    url: "https://www.framer.com/motion/",
    license: "MIT",
    description: "Production-ready motion library for React",
    version: "Latest",
  },
  
  // Backend Libraries
  {
    name: "Express",
    category: "library",
    url: "https://expressjs.com/",
    license: "MIT",
    description: "Fast, unopinionated, minimalist web framework for Node.js",
    version: "4.x",
  },
  {
    name: "Drizzle ORM",
    category: "library",
    url: "https://orm.drizzle.team/",
    license: "Apache-2.0",
    description: "TypeScript ORM that is simple, performant, and type-safe",
    version: "Latest",
  },
  {
    name: "Neon Serverless PostgreSQL",
    category: "library",
    url: "https://neon.tech/",
    license: "Apache-2.0",
    description: "Serverless PostgreSQL driver for JavaScript",
    version: "Latest",
  },
  
  // Document Processing Libraries
  {
    name: "jsPDF",
    category: "library",
    url: "https://github.com/parallax/jsPDF",
    license: "MIT",
    requiredNotice: "Copyright (c) 2010-2023 James Hall, https://github.com/MrRio/jsPDF",
    description: "Client-side JavaScript PDF generation library",
    version: "2.x",
  },
  {
    name: "Tesseract.js",
    category: "library",
    url: "https://tesseract.projectnaptha.com/",
    license: "Apache-2.0",
    requiredNotice: "Tesseract OCR engine - Apache License 2.0",
    description: "Pure JavaScript OCR engine for browser and Node.js",
    version: "5.x",
  },
  {
    name: "pdf-parse",
    category: "library",
    url: "https://www.npmjs.com/package/pdf-parse",
    license: "MIT",
    description: "Pure JavaScript PDF text extraction",
    version: "Latest",
  },
  {
    name: "Multer",
    category: "library",
    url: "https://github.com/expressjs/multer",
    license: "MIT",
    description: "Node.js middleware for handling multipart/form-data",
    version: "Latest",
  },
  
  // External APIs
  {
    name: "OCR.space API",
    category: "api",
    url: "https://ocr.space/",
    license: "Free API Tier",
    description: "Cloud-based OCR API for document text extraction",
    version: "v3.50",
    notes: "Primary OCR service with free tier access",
  },
  {
    name: "FEMA NFIP Claims API",
    category: "dataset",
    url: "https://www.fema.gov/openfema-data-page/fima-nfip-redacted-claims-v1",
    license: "Public Domain (U.S. Government)",
    requiredNotice: "Data provided by the Federal Emergency Management Agency (FEMA)",
    description: "National Flood Insurance Program historical claims data by ZIP code",
    version: "v1",
    notes: "Used for regional disaster context and claims frequency analysis",
  },
  {
    name: "BLS Construction PPI",
    category: "dataset",
    url: "https://www.bls.gov/ppi/",
    license: "Public Domain (U.S. Government)",
    requiredNotice: "Data provided by the U.S. Bureau of Labor Statistics (BLS)",
    description: "Producer Price Index for construction materials and labor",
    version: "Latest",
    notes: "Used for year-over-year construction cost inflation adjustments",
  },
  {
    name: "Texas DOI Public Complaints",
    category: "dataset",
    url: "https://www.tdi.texas.gov/",
    license: "Public Domain (Texas State Government)",
    requiredNotice: "Data provided by the Texas Department of Insurance",
    description: "Public complaint records for insurance companies in Texas",
    version: "Latest",
    notes: "Used to provide transparency on insurer complaint history",
  },
  
  // Additional Services
  {
    name: "Replit",
    category: "library",
    url: "https://replit.com/",
    license: "Platform Service",
    description: "Cloud development and deployment platform",
    version: "Latest",
    notes: "Hosting and database infrastructure provided by Replit",
  },
];

export async function seedAttributions() {
  console.log("🌱 Seeding attribution data...");
  
  let sourcesCreated = 0;
  let versionsCreated = 0;
  
  for (const data of attributionData) {
    const { version, notes, ...sourceData } = data;
    
    try {
      // Check if source already exists
      const [existingSource] = await db
        .select()
        .from(sources)
        .where(eq(sources.name, sourceData.name))
        .limit(1);
      
      let sourceId: string;
      
      if (existingSource) {
        sourceId = existingSource.id;
        console.log(`  ✓ Source exists: ${sourceData.name}`);
      } else {
        const [newSource] = await db
          .insert(sources)
          .values(sourceData)
          .returning();
        sourceId = newSource.id;
        sourcesCreated++;
        console.log(`  + Created source: ${sourceData.name}`);
      }
      
      // Add version record
      const versionData: InsertSourceVersion = {
        sourceId,
        version,
        notes,
      };
      
      await db.insert(sourceVersions).values(versionData);
      versionsCreated++;
      
    } catch (error) {
      console.error(`  ✗ Error processing ${sourceData.name}:`, error);
    }
  }
  
  console.log(`\n✅ Seeding complete!`);
  console.log(`   Sources created: ${sourcesCreated}`);
  console.log(`   Versions recorded: ${versionsCreated}`);
  console.log(`   Total sources: ${attributionData.length}`);
}

// Run seeding immediately
seedAttributions()
  .then(() => {
    console.log("\n🎉 Attribution data seeded successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Seeding failed:", error);
    process.exit(1);
  });
