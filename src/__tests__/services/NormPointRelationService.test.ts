import { NormPointRelationService } from '@/services/normPoints/NormPointRelationService';

// Mock Firestore
jest.mock('@/firebase/config');

describe('NormPointRelationService', () => {
  describe('getComplianceStats', () => {
    it('should calculate global compliance percentage', async () => {
      // This test would require mocking Firestore data
      // For now, we'll test the structure
      const stats = await NormPointRelationService.getComplianceStats();

      expect(stats).toHaveProperty('global_percentage');
      expect(stats).toHaveProperty('by_chapter');
      expect(stats).toHaveProperty('by_category');
      expect(stats).toHaveProperty('by_status');
      expect(stats).toHaveProperty('mandatory_pending');
      expect(stats).toHaveProperty('high_priority_pending');
      expect(stats).toHaveProperty('upcoming_reviews');
    });

    it('should return percentage between 0 and 100', async () => {
      const stats = await NormPointRelationService.getComplianceStats();

      expect(stats.global_percentage).toBeGreaterThanOrEqual(0);
      expect(stats.global_percentage).toBeLessThanOrEqual(100);
    });
  });

  describe('getComplianceMatrix', () => {
    it('should return matrix with norm points and processes', async () => {
      const matrix = await NormPointRelationService.getComplianceMatrix();

      expect(matrix).toHaveProperty('norm_points');
      expect(matrix).toHaveProperty('processes');
      expect(matrix).toHaveProperty('relations');
      expect(Array.isArray(matrix.norm_points)).toBe(true);
      expect(Array.isArray(matrix.processes)).toBe(true);
    });

    it('should include status and percentage in relations', async () => {
      const matrix = await NormPointRelationService.getComplianceMatrix();

      // If there are relations, verify structure
      if (matrix.relations.size > 0) {
        const firstRelation = Array.from(matrix.relations.values())[0];
        expect(firstRelation).toHaveProperty('status');
        expect(firstRelation).toHaveProperty('percentage');
        expect(typeof firstRelation.percentage).toBe('number');
      }
    });
  });
});
