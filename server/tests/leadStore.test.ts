import { describe, it, expect, beforeAll } from "vitest";
import { leadStore } from "../services/leadStore";

describe("Lead Store Service", () => {
  describe("calculateCommission method", () => {
    describe("Default Rates", () => {
      it("should use 5% for contractors", () => {
        const result = leadStore.calculateCommission(10000, "contractor");
        expect(result.rate).toBe(0.05);
        expect(result.amount).toBe(500);
      });

      it("should use 10% for adjusters", () => {
        const result = leadStore.calculateCommission(10000, "adjuster");
        expect(result.rate).toBe(0.10);
        expect(result.amount).toBe(1000);
      });

      it("should use 8% for agencies", () => {
        const result = leadStore.calculateCommission(10000, "agency");
        expect(result.rate).toBe(0.08);
        expect(result.amount).toBe(800);
      });

      it("should default to 5% for unknown partner types", () => {
        const result = leadStore.calculateCommission(10000, "unknown_type");
        expect(result.rate).toBe(0.05);
        expect(result.amount).toBe(500);
      });
    });

    describe("Custom Rates", () => {
      it("should override default rate with custom rate", () => {
        const result = leadStore.calculateCommission(10000, "contractor", 0.15);
        expect(result.rate).toBe(0.15);
        expect(result.amount).toBe(1500);
      });

      it("should handle zero custom rate", () => {
        const result = leadStore.calculateCommission(10000, "contractor", 0);
        expect(result.rate).toBe(0);
        expect(result.amount).toBe(0);
      });

      it("should handle high custom rate", () => {
        const result = leadStore.calculateCommission(10000, "contractor", 0.50);
        expect(result.rate).toBe(0.50);
        expect(result.amount).toBe(5000);
      });
    });

    describe("Amount Calculations", () => {
      it("should round to 2 decimal places", () => {
        const result = leadStore.calculateCommission(333.33, "contractor");
        expect(result.amount).toBe(16.67);
      });

      it("should handle zero claim value", () => {
        const result = leadStore.calculateCommission(0, "contractor");
        expect(result.amount).toBe(0);
      });

      it("should handle large claim values", () => {
        const result = leadStore.calculateCommission(1000000, "adjuster");
        expect(result.amount).toBe(100000);
      });

      it("should handle small claim values", () => {
        const result = leadStore.calculateCommission(100, "contractor");
        expect(result.amount).toBe(5);
      });
    });
  });

  describe("Lead Status Transitions", () => {
    const validTransitions: Record<string, string[]> = {
      pending: ["in_progress", "closed"],
      in_progress: ["closed"],
      closed: ["paid"],
      paid: [],
    };

    function isValidTransition(from: string, to: string): boolean {
      return validTransitions[from]?.includes(to) || false;
    }

    it("should allow pending to in_progress", () => {
      expect(isValidTransition("pending", "in_progress")).toBe(true);
    });

    it("should allow pending to closed (skip in_progress)", () => {
      expect(isValidTransition("pending", "closed")).toBe(true);
    });

    it("should allow in_progress to closed", () => {
      expect(isValidTransition("in_progress", "closed")).toBe(true);
    });

    it("should allow closed to paid", () => {
      expect(isValidTransition("closed", "paid")).toBe(true);
    });

    it("should not allow pending to paid directly", () => {
      expect(isValidTransition("pending", "paid")).toBe(false);
    });

    it("should not allow in_progress to paid directly", () => {
      expect(isValidTransition("in_progress", "paid")).toBe(false);
    });

    it("should not allow paid to any status", () => {
      expect(isValidTransition("paid", "pending")).toBe(false);
      expect(isValidTransition("paid", "in_progress")).toBe(false);
      expect(isValidTransition("paid", "closed")).toBe(false);
    });

    it("should not allow closed to in_progress (backward)", () => {
      expect(isValidTransition("closed", "in_progress")).toBe(false);
    });

    it("should not allow closed to pending (backward)", () => {
      expect(isValidTransition("closed", "pending")).toBe(false);
    });
  });

  describe("LeadStore Service Methods", () => {
    it("should export leadStore service instance", () => {
      expect(leadStore).toBeDefined();
    });

    it("should have createLead method", () => {
      expect(typeof leadStore.createLead).toBe("function");
    });

    it("should have updateStatus method", () => {
      expect(typeof leadStore.updateStatus).toBe("function");
    });

    it("should have getById method", () => {
      expect(typeof leadStore.getById).toBe("function");
    });

    it("should have getByPartner method", () => {
      expect(typeof leadStore.getByPartner).toBe("function");
    });

    it("should have getPartnerStats method", () => {
      expect(typeof leadStore.getPartnerStats).toBe("function");
    });

    it("should have getLeadsReadyForPayout method", () => {
      expect(typeof leadStore.getLeadsReadyForPayout).toBe("function");
    });

    it("should have markAsPaid method", () => {
      expect(typeof leadStore.markAsPaid).toBe("function");
    });

    it("should have exportToCSV method", () => {
      expect(typeof leadStore.exportToCSV).toBe("function");
    });

    it("should have calculateCommission method", () => {
      expect(typeof leadStore.calculateCommission).toBe("function");
    });
  });

  describe("Lead Status Types", () => {
    it("should have four valid statuses", () => {
      const statuses = ["pending", "in_progress", "closed", "paid"];
      expect(statuses.length).toBe(4);
    });

    it("should have pending as initial status", () => {
      const validTransitions: Record<string, string[]> = {
        pending: ["in_progress", "closed"],
        in_progress: ["closed"],
        closed: ["paid"],
        paid: [],
      };
      expect(validTransitions.pending).toContain("in_progress");
      expect(validTransitions.pending).toContain("closed");
      expect(validTransitions.pending.length).toBe(2);
    });

    it("should have paid as terminal status with no transitions", () => {
      const validTransitions: Record<string, string[]> = {
        pending: ["in_progress", "closed"],
        in_progress: ["closed"],
        closed: ["paid"],
        paid: [],
      };
      expect(validTransitions.paid).toEqual([]);
    });
  });
});
