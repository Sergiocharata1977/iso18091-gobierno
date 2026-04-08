import { GET } from '@/app/api/norm-points/route';
import {
  initializeTestEnvironment,
  RulesTestContext,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { NextRequest } from 'next/server';

describe('/api/norm-points Integration Tests', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'demo-test-project',
      firestore: {
        host: 'localhost',
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  describe('GET /api/norm-points', () => {
    it('should return empty array when no norm points exist', async () => {
      const request = new NextRequest('http://localhost:3000/api/norm-points');
      const response = await GET(request, {
        params: Promise.resolve({}),
      } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual([]);
      expect(data.pagination.total).toBe(0);
    });

    it('should return paginated norm points', async () => {
      // Seed test data
      await testEnv.withSecurityRulesDisabled(
        async (context: RulesTestContext) => {
          const db = context.firestore();
          const normPointsRef = db.collection('normPoints');

          await normPointsRef.add({
            code: '4.1',
            title: 'Contexto de la organización',
            description: 'Test description',
            requirement: 'Test requirement',
            tipo_norma: 'iso_9001',
            chapter: 4,
            category: 'contexto',
            is_mandatory: true,
            priority: 'alta',
            created_at: new Date(),
            updated_at: new Date(),
            created_by: 'test-user',
            updated_by: 'test-user',
          });

          await normPointsRef.add({
            code: '4.2',
            title: 'Comprensión de las necesidades',
            description: 'Test description 2',
            requirement: 'Test requirement 2',
            tipo_norma: 'iso_9001',
            chapter: 4,
            category: 'contexto',
            is_mandatory: true,
            priority: 'alta',
            created_at: new Date(),
            updated_at: new Date(),
            created_by: 'test-user',
            updated_by: 'test-user',
          });
        }
      );

      const request = new NextRequest(
        'http://localhost:3000/api/norm-points?page=1&limit=10'
      );
      const response = await GET(request, {
        params: Promise.resolve({}),
      } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.pagination.total).toBe(2);
      expect(data.data[0].code).toBe('4.1');
    });

    it('should filter by tipo_norma', async () => {
      // Seed mixed data
      await testEnv.withSecurityRulesDisabled(
        async (context: RulesTestContext) => {
          const db = context.firestore();
          const normPointsRef = db.collection('normPoints');

          await normPointsRef.add({
            code: '4.1',
            tipo_norma: 'iso_9001',
            title: 'ISO 9001 Point',
            // ... other fields
          });

          await normPointsRef.add({
            code: 'A.1',
            tipo_norma: 'iso_14001',
            title: 'ISO 14001 Point',
            // ... other fields
          });
        }
      );

      const request = new NextRequest(
        'http://localhost:3000/api/norm-points?tipo_norma=iso_9001'
      );
      const response = await GET(request, {
        params: Promise.resolve({}),
      } as any);
      const data = await response.json();

      expect(data.data).toHaveLength(1);
      expect(data.data[0].tipo_norma).toBe('iso_9001');
    });

    it('should handle pagination correctly', async () => {
      // Seed 15 items
      await testEnv.withSecurityRulesDisabled(
        async (context: RulesTestContext) => {
          const db = context.firestore();
          const normPointsRef = db.collection('normPoints');

          for (let i = 1; i <= 15; i++) {
            await normPointsRef.add({
              code: `4.${i}`,
              title: `Point ${i}`,
              tipo_norma: 'iso_9001',
              // ... other required fields
            });
          }
        }
      );

      // Request page 1 with limit 10
      const request1 = new NextRequest(
        'http://localhost:3000/api/norm-points?page=1&limit=10'
      );
      const response1 = await GET(request1, {
        params: Promise.resolve({}),
      } as any);
      const data1 = await response1.json();

      expect(data1.data).toHaveLength(10);
      expect(data1.pagination.hasNext).toBe(true);
      expect(data1.pagination.hasPrev).toBe(false);

      // Request page 2
      const request2 = new NextRequest(
        'http://localhost:3000/api/norm-points?page=2&limit=10'
      );
      const response2 = await GET(request2, {
        params: Promise.resolve({}),
      } as any);
      const data2 = await response2.json();

      expect(data2.data).toHaveLength(5);
      expect(data2.pagination.hasNext).toBe(false);
      expect(data2.pagination.hasPrev).toBe(true);
    });
  });
});
