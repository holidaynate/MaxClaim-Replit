/**
 * MaxClaim – Frontend UI
 * https://github.com/holidaynate/MaxClaim-Replit
 *
 * © 2023–2025 Nate Chacon (InfiN8 / HolidayNate). All rights reserved.
 *
 * Original design and UX by Nate Chacon.
 * External CSS/JS frameworks used only as utilities; see THIRD_PARTY_NOTICES.md.
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Package, Database, Code, Shield } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface SourceVersion {
  id: string;
  sourceId: string;
  version: string;
  retrievedAt: string;
  notes?: string;
}

interface Source {
  id: string;
  name: string;
  category: "library" | "api" | "dataset";
  url?: string;
  license?: string;
  requiredNotice?: string;
  description?: string;
  versions: SourceVersion[];
}

const categoryIcons = {
  library: Code,
  api: Database,
  dataset: Package,
};

const categoryLabels = {
  library: "Open Source Library",
  api: "External API",
  dataset: "Public Dataset",
};

const categoryColors = {
  library: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  api: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  dataset: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
};

export default function AttributionsPage() {
  const { data: sources, isLoading } = useQuery<Source[]>({
    queryKey: ["/api/attributions"],
  });

  const groupedSources = sources?.reduce((acc, source) => {
    if (!acc[source.category]) {
      acc[source.category] = [];
    }
    acc[source.category].push(source);
    return acc;
  }, {} as Record<string, Source[]>);

  if (isLoading) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading attributions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="title-attributions">
            Attributions & Open Source
          </h1>
        </div>

        {/* Ownership Section */}
        <Card className="border-primary/20 bg-primary/5" data-testid="card-ownership">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" aria-hidden="true" />
              <CardTitle className="text-xl">Ownership & Copyright</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              MaxClaim is an original SaaS application created and owned by{" "}
              <strong>Nate Chacon (InfiN8 / HolidayNate)</strong>.
              The core business logic, pricing models, and partner-matching algorithms
              are proprietary.
            </p>
            <p className="text-muted-foreground">
              We respectfully use open source libraries such as Express, React, and
              others under their respective licenses. Full details are available in
              our{" "}
              <a 
                href="https://github.com/holidaynate/MaxClaim-Replit" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
                data-testid="link-github"
              >
                GitHub repository
                <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </a>
              {" "}under <code className="text-sm bg-muted px-1.5 py-0.5 rounded">COPYRIGHT.md</code> and{" "}
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">THIRD_PARTY_NOTICES.md</code>.
            </p>
            <p className="text-sm text-muted-foreground">
              Public articles and guides on insurance valuation and fair market value
              informed the conceptual design of MaxClaim, but no copyrighted text or
              proprietary datasets are copied into this service.
            </p>
            <p className="text-xs text-muted-foreground border-t pt-3 mt-3">
              © 2023–2025 Nate Chacon. All rights reserved.
            </p>
          </CardContent>
        </Card>

        <Separator />

        {/* Open Source Section Header */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Open Source Dependencies</h2>
          <p className="text-muted-foreground">
            MaxClaim is built using open-source software and publicly available data.
            We gratefully acknowledge the following libraries, APIs, and datasets:
          </p>
        </div>

        {/* Grouped Sources */}
        {groupedSources && Object.entries(groupedSources).map(([category, categorySources]) => {
          const Icon = categoryIcons[category as keyof typeof categoryIcons];
          const label = categoryLabels[category as keyof typeof categoryLabels];

          return (
            <div key={category} className="space-y-4">
              <div className="flex items-center gap-2">
                <Icon className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
                <h2 className="text-2xl font-semibold">{label}s</h2>
                <Badge variant="secondary">{categorySources.length}</Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {categorySources.map((source) => {
                  const latestVersion = source.versions[source.versions.length - 1];

                  return (
                    <Card key={source.id} data-testid={`card-source-${source.id}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-lg">{source.name}</CardTitle>
                          <Badge 
                            className={categoryColors[source.category]}
                            data-testid={`badge-category-${source.id}`}
                          >
                            {source.category}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {source.description && (
                          <p className="text-sm text-muted-foreground">
                            {source.description}
                          </p>
                        )}

                        <div className="space-y-1.5 text-sm">
                          {source.license && (
                            <div>
                              <span className="font-medium">License:</span>{" "}
                              <span className="text-muted-foreground">{source.license}</span>
                            </div>
                          )}

                          {latestVersion && (
                            <div>
                              <span className="font-medium">Version:</span>{" "}
                              <span className="text-muted-foreground">
                                {latestVersion.version}
                              </span>
                            </div>
                          )}

                          {source.url && (
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                              data-testid={`link-source-${source.id}`}
                            >
                              Visit Website
                              <ExternalLink className="w-3 h-3" aria-hidden="true" />
                            </a>
                          )}
                        </div>

                        {source.requiredNotice && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs text-muted-foreground italic">
                              {source.requiredNotice}
                            </p>
                          </div>
                        )}

                        {latestVersion?.notes && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground">
                              {latestVersion.notes}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Privacy Notice */}
        <Card className="mt-8 bg-muted">
          <CardHeader>
            <CardTitle className="text-lg">Our Commitment to Open Source</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Max-Claim is committed to transparency and proper attribution. All libraries,
              APIs, and datasets listed on this page are used in accordance with their respective
              licenses and terms of service.
            </p>
            <p>
              We believe in giving credit where credit is due and supporting the open-source
              community that makes projects like Max-Claim possible.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
