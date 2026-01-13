import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getFeatureStatus,
  getPrimaryHealth,
  getFallbackHealth,
  getCombinedHealth,
} from "../services/healthCheck";

describe("Health Check Service", () => {
  describe("getFeatureStatus", () => {
    it("should return array of feature flags", () => {
      const features = getFeatureStatus();
      expect(Array.isArray(features)).toBe(true);
      expect(features.length).toBeGreaterThan(0);
    });

    it("should include expected feature flags", () => {
      const features = getFeatureStatus();
      const featureNames = features.map(f => f.name);
      expect(featureNames).toContain("advanced-analytics");
      expect(featureNames).toContain("multi-agent-swarm");
      expect(featureNames).toContain("realtime-notifications");
      expect(featureNames).toContain("carrier-intelligence");
      expect(featureNames).toContain("local-ai-fallback");
    });

    it("should have correct feature flag structure", () => {
      const features = getFeatureStatus();
      features.forEach(feature => {
        expect(feature).toHaveProperty("name");
        expect(feature).toHaveProperty("enabled");
        expect(feature).toHaveProperty("requiredTier");
        expect(feature).toHaveProperty("envVar");
        expect(typeof feature.enabled).toBe("boolean");
      });
    });

    it("should have carrier-intelligence enabled by default", () => {
      const features = getFeatureStatus();
      const carrierIntel = features.find(f => f.name === "carrier-intelligence");
      expect(carrierIntel?.enabled).toBe(true);
      expect(carrierIntel?.requiredTier).toBe("free");
    });

    it("should have correct tier assignments", () => {
      const features = getFeatureStatus();
      const advancedAnalytics = features.find(f => f.name === "advanced-analytics");
      const multiAgentSwarm = features.find(f => f.name === "multi-agent-swarm");
      const realtimeNotifications = features.find(f => f.name === "realtime-notifications");
      
      expect(advancedAnalytics?.requiredTier).toBe("premium");
      expect(multiAgentSwarm?.requiredTier).toBe("enterprise");
      expect(realtimeNotifications?.requiredTier).toBe("standard");
    });
  });

  describe("getPrimaryHealth", () => {
    it("should return health check result structure", async () => {
      const health = await getPrimaryHealth();
      expect(health).toHaveProperty("status");
      expect(health).toHaveProperty("timestamp");
      expect(health).toHaveProperty("uptime_seconds");
      expect(health).toHaveProperty("services");
    });

    it("should have valid status value", async () => {
      const health = await getPrimaryHealth();
      expect(["healthy", "degraded", "unhealthy"]).toContain(health.status);
    });

    it("should track uptime in seconds", async () => {
      const health = await getPrimaryHealth();
      expect(health.uptime_seconds).toBeGreaterThanOrEqual(0);
    });

    it("should check core services", async () => {
      const health = await getPrimaryHealth();
      const serviceNames = health.services.map(s => s.name);
      expect(serviceNames).toContain("postgresql");
      expect(serviceNames).toContain("ocr-service");
      expect(serviceNames).toContain("llm-service");
      expect(serviceNames).toContain("stripe");
    });

    it("should have valid service status values", async () => {
      const health = await getPrimaryHealth();
      health.services.forEach(service => {
        expect(["healthy", "degraded", "unhealthy"]).toContain(service.status);
        expect(service).toHaveProperty("lastChecked");
      });
    });
  });

  describe("getFallbackHealth", () => {
    it("should return health check result structure", async () => {
      const health = await getFallbackHealth();
      expect(health).toHaveProperty("status");
      expect(health).toHaveProperty("timestamp");
      expect(health).toHaveProperty("uptime_seconds");
      expect(health).toHaveProperty("services");
    });

    it("should check fallback services", async () => {
      const health = await getFallbackHealth();
      const serviceNames = health.services.map(s => s.name);
      expect(serviceNames).toContain("pricing-cache");
      expect(serviceNames).toContain("tesseract-fallback");
      expect(serviceNames).toContain("rule-based-audit");
      expect(serviceNames).toContain("manual-entry");
      expect(serviceNames).toContain("email-service");
    });

    it("should have tesseract fallback always healthy", async () => {
      const health = await getFallbackHealth();
      const tesseract = health.services.find(s => s.name === "tesseract-fallback");
      expect(tesseract?.status).toBe("healthy");
      expect(tesseract?.message).toBe("Tesseract.js always available");
    });

    it("should have rule-based-audit always healthy", async () => {
      const health = await getFallbackHealth();
      const ruleEngine = health.services.find(s => s.name === "rule-based-audit");
      expect(ruleEngine?.status).toBe("healthy");
      expect(ruleEngine?.message).toBe("Rule-based audit engine ready");
    });

    it("should have manual-entry always healthy", async () => {
      const health = await getFallbackHealth();
      const manualEntry = health.services.find(s => s.name === "manual-entry");
      expect(manualEntry?.status).toBe("healthy");
      expect(manualEntry?.message).toBe("Manual entry form available");
    });
  });

  describe("getCombinedHealth", () => {
    it("should return combined health structure", async () => {
      const health = await getCombinedHealth();
      expect(health).toHaveProperty("primary");
      expect(health).toHaveProperty("fallback");
      expect(health).toHaveProperty("features");
      expect(health).toHaveProperty("overall");
    });

    it("should have valid overall status", async () => {
      const health = await getCombinedHealth();
      expect(["healthy", "degraded", "unhealthy"]).toContain(health.overall);
    });

    it("should include primary health data", async () => {
      const health = await getCombinedHealth();
      expect(health.primary.services.length).toBeGreaterThan(0);
    });

    it("should include fallback health data", async () => {
      const health = await getCombinedHealth();
      expect(health.fallback.services.length).toBeGreaterThan(0);
    });

    it("should include feature flags", async () => {
      const health = await getCombinedHealth();
      expect(health.features.length).toBeGreaterThan(0);
    });
  });

  describe("Service Status Validation", () => {
    it("should have database service with latency tracking", async () => {
      const health = await getPrimaryHealth();
      const dbService = health.services.find(s => s.name === "postgresql");
      expect(dbService).toBeDefined();
      if (dbService?.status === "healthy") {
        expect(dbService.latency_ms).toBeGreaterThanOrEqual(0);
      }
    });

    it("should report pricing cache statistics", async () => {
      const health = await getFallbackHealth();
      const cacheService = health.services.find(s => s.name === "pricing-cache");
      expect(cacheService).toBeDefined();
      expect(cacheService?.message).toMatch(/items cached/);
    });
  });
});
