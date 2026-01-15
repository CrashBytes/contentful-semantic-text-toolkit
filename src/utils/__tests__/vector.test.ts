/**
 * Vector Mathematics Test Suite
 * 
 * Comprehensive validation of mathematical operations fundamental to
 * semantic similarity computation and vector search functionality.
 * 
 * Test Architecture:
 * - Unit tests for pure mathematical functions
 * - Edge case validation for robustness
 * - Error handling verification
 * - Performance characteristic validation
 */

import {
  dotProduct,
  magnitude,
  cosineSimilarity,
  euclideanDistance,
  normalize,
  centroid,
  topKSimilar,
} from '../vector';
import { SemanticError, SemanticErrorCode } from '../../types';

describe('Vector Mathematics - Production Validation', () => {
  describe('dotProduct', () => {
    it('computes correctly for positive vectors', () => {
      // [1,2,3] · [4,5,6] = 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
      expect(dotProduct([1, 2, 3], [4, 5, 6])).toBe(32);
    });

    it('handles zero vectors', () => {
      expect(dotProduct([0, 0, 0], [1, 2, 3])).toBe(0);
      expect(dotProduct([1, 2, 3], [0, 0, 0])).toBe(0);
    });

    it('computes correctly with negative values', () => {
      // [1,-2,3] · [4,5,-6] = 1*4 + (-2)*5 + 3*(-6) = 4 - 10 - 18 = -24
      expect(dotProduct([1, -2, 3], [4, 5, -6])).toBe(-24);
    });

    it('handles single-dimensional vectors', () => {
      expect(dotProduct([5], [3])).toBe(15);
    });

    it('throws SemanticError on dimension mismatch', () => {
      expect(() => dotProduct([1, 2], [1, 2, 3]))
        .toThrow(SemanticError);
    });

    it('provides detailed error context on mismatch', () => {
      try {
        dotProduct([1, 2], [1, 2, 3, 4]);
        fail('Should have thrown SemanticError');
      } catch (error) {
        expect(error).toBeInstanceOf(SemanticError);
        const semanticError = error as SemanticError;
        expect(semanticError.code).toBe(SemanticErrorCode.DIMENSION_MISMATCH);
        expect(semanticError.details).toMatchObject({
          dimensions: [2, 4],
        });
      }
    });

    it('rejects empty arrays', () => {
      expect(() => dotProduct([], [1, 2]))
        .toThrow(SemanticError);
    });
  });

  describe('magnitude', () => {
    it('computes correctly for standard vectors', () => {
      // √(3² + 4²) = √(9 + 16) = √25 = 5
      expect(magnitude([3, 4])).toBe(5);
    });

    it('handles zero vector', () => {
      expect(magnitude([0, 0, 0])).toBe(0);
    });

    it('computes correctly for unit vectors', () => {
      expect(magnitude([1, 0, 0])).toBe(1);
      expect(magnitude([0, 1, 0])).toBe(1);
    });

    it('handles negative components', () => {
      // √((-3)² + (-4)²) = √(9 + 16) = 5
      expect(magnitude([-3, -4])).toBe(5);
    });

    it('computes correctly for high-dimensional vectors', () => {
      const vector = Array(384).fill(1);
      // √(1² * 384) = √384 ≈ 19.595
      expect(magnitude(vector)).toBeCloseTo(19.595, 2);
    });

    it('rejects empty arrays', () => {
      expect(() => magnitude([]))
        .toThrow(SemanticError);
    });
  });

  describe('cosineSimilarity', () => {
    it('returns 1.0 for identical vectors', () => {
      expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBe(1.0);
      expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBe(1.0);
    });

    it('returns 0.0 for orthogonal vectors', () => {
      // Perpendicular vectors have zero dot product
      expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0.0, 10);
      expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0.0, 10);
    });

    it('returns -1.0 for opposite vectors', () => {
      expect(cosineSimilarity([1, 0], [-1, 0])).toBe(-1.0);
      expect(cosineSimilarity([1, 2, 3], [-1, -2, -3])).toBeCloseTo(-1.0, 10);
    });

    it('computes correctly for arbitrary vectors', () => {
      // cos(θ) for [1,2] and [2,1]:
      // dot = 1*2 + 2*1 = 4
      // |a| = √5, |b| = √5
      // cos(θ) = 4 / 5 = 0.8
      expect(cosineSimilarity([1, 2], [2, 1])).toBeCloseTo(0.8, 10);
    });

    it('handles high-dimensional embeddings', () => {
      const a = Array(384).fill(0).map((_, i) => i % 2 === 0 ? 1 : 0);
      const b = Array(384).fill(0).map((_, i) => i % 2 === 0 ? 1 : 0);
      // Use toBeCloseTo to handle floating point precision
      expect(cosineSimilarity(a, b)).toBeCloseTo(1.0, 10);
    });

    it('throws on zero-magnitude vectors', () => {
      expect(() => cosineSimilarity([0, 0], [1, 0]))
        .toThrow(SemanticError);
    });

    it('throws on dimension mismatch', () => {
      expect(() => cosineSimilarity([1, 2], [1, 2, 3]))
        .toThrow(SemanticError);
    });
  });

  describe('euclideanDistance', () => {
    it('computes zero distance for identical vectors', () => {
      expect(euclideanDistance([1, 2, 3], [1, 2, 3])).toBe(0);
    });

    it('computes correctly for standard cases', () => {
      // √((3-0)² + (4-0)²) = √(9 + 16) = 5
      expect(euclideanDistance([0, 0], [3, 4])).toBe(5);
    });

    it('computes correctly for negative differences', () => {
      expect(euclideanDistance([1, 1], [-1, -1])).toBeCloseTo(2.828, 3);
    });

    it('handles unit distance in each dimension', () => {
      // √(1² + 1² + 1²) = √3 ≈ 1.732
      expect(euclideanDistance([0, 0, 0], [1, 1, 1])).toBeCloseTo(1.732, 3);
    });

    it('throws on dimension mismatch', () => {
      expect(() => euclideanDistance([1, 2], [1, 2, 3]))
        .toThrow(SemanticError);
    });
  });

  describe('normalize', () => {
    it('produces unit vector', () => {
      const normalized = normalize([3, 4]);
      expect(magnitude(normalized)).toBeCloseTo(1.0, 10);
    });

    it('preserves direction', () => {
      const original = [3, 4];
      const normalized = normalize(original);
      
      // Normalized should be parallel (cosine similarity = 1)
      expect(cosineSimilarity(original, normalized)).toBeCloseTo(1.0, 10);
    });

    it('computes correctly for known vectors', () => {
      // [3,4] normalized = [3/5, 4/5] = [0.6, 0.8]
      const normalized = normalize([3, 4]);
      expect(normalized[0]).toBeCloseTo(0.6, 10);
      expect(normalized[1]).toBeCloseTo(0.8, 10);
    });

    it('handles already normalized vectors', () => {
      const unit = [1, 0, 0];
      const normalized = normalize(unit);
      expect(normalized).toEqual(unit);
    });

    it('throws on zero vector', () => {
      expect(() => normalize([0, 0, 0]))
        .toThrow(SemanticError);
    });
  });

  describe('centroid', () => {
    it('computes center of identical vectors', () => {
      const vectors = [
        [1, 2, 3],
        [1, 2, 3],
        [1, 2, 3],
      ];
      expect(centroid(vectors)).toEqual([1, 2, 3]);
    });

    it('computes average position correctly', () => {
      const vectors = [
        [0, 0],
        [2, 0],
        [0, 2],
        [2, 2],
      ];
      // Average: [(0+2+0+2)/4, (0+0+2+2)/4] = [1, 1]
      expect(centroid(vectors)).toEqual([1, 1]);
    });

    it('handles single vector', () => {
      expect(centroid([[5, 10, 15]])).toEqual([5, 10, 15]);
    });

    it('handles negative values', () => {
      const vectors = [
        [-1, -1],
        [1, 1],
      ];
      expect(centroid(vectors)).toEqual([0, 0]);
    });

    it('throws on empty array', () => {
      expect(() => centroid([]))
        .toThrow(SemanticError);
    });

    it('throws on dimension mismatch', () => {
      const vectors = [
        [1, 2],
        [1, 2, 3],
      ];
      expect(() => centroid(vectors))
        .toThrow(SemanticError);
    });
  });

  describe('topKSimilar', () => {
    const query = [1, 0, 0];
    const candidates = [
      [1, 0, 0],      // Perfect match: similarity = 1.0
      [0.9, 0.1, 0],  // Close match: similarity ≈ 0.995
      [0, 1, 0],      // Orthogonal: similarity = 0.0
      [-1, 0, 0],     // Opposite: similarity = -1.0
    ];

    it('returns correct number of results', () => {
      expect(topKSimilar(query, candidates, 2)).toHaveLength(2);
      expect(topKSimilar(query, candidates, 3)).toHaveLength(3);
    });

    it('orders results by similarity descending', () => {
      const results = topKSimilar(query, candidates, 4);
      
      // Results should be in descending order
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i][1]).toBeGreaterThanOrEqual(results[i + 1][1]);
      }
    });

    it('returns most similar vector first', () => {
      const results = topKSimilar(query, candidates, 1);
      
      expect(results[0][0]).toBe(0); // Index of perfect match
      expect(results[0][1]).toBe(1.0); // Perfect similarity
    });

    it('handles k larger than candidate count', () => {
      const results = topKSimilar(query, candidates, 100);
      expect(results).toHaveLength(candidates.length);
    });

    it('returns empty for empty candidates', () => {
      expect(topKSimilar(query, [], 10)).toEqual([]);
    });

    it('handles dimension mismatch gracefully', () => {
      const mixedCandidates = [
        [1, 0],
        [1, 0, 0],
        [0, 1],
      ];
      
      const results = topKSimilar([1, 0, 0], mixedCandidates, 3);
      
      // Should handle mismatches by assigning -Infinity
      expect(results.some(([, score]) => score === -Infinity)).toBe(true);
    });

    it('throws on invalid k', () => {
      expect(() => topKSimilar(query, candidates, 0))
        .toThrow(SemanticError);

      expect(() => topKSimilar(query, candidates, -1))
        .toThrow(SemanticError);
    });

    it('uses default k=10 when not specified', () => {
      // Create 15 candidates
      const manyCandidates = Array(15).fill(null).map((_, i) =>
        [1, 0, 0].map(v => v + i * 0.01)
      );

      // Call without k parameter - should use default of 10
      const results = topKSimilar(query, manyCandidates);

      expect(results).toHaveLength(10);
    });
  });

  describe('Performance Characteristics', () => {
    it('handles high-dimensional vectors efficiently', () => {
      const dim = 384; // Standard embedding dimension
      const a = Array(dim).fill(0).map(() => Math.random());
      const b = Array(dim).fill(0).map(() => Math.random());
      
      const startTime = performance.now();
      const similarity = cosineSimilarity(a, b);
      const endTime = performance.now();
      
      expect(similarity).toBeGreaterThanOrEqual(-1);
      expect(similarity).toBeLessThanOrEqual(1);
      expect(endTime - startTime).toBeLessThan(50); // < 50ms (allow for CI variance)
    });

    it('processes batch operations efficiently', () => {
      const query = Array(384).fill(0).map(() => Math.random());
      const candidates = Array(1000).fill(null).map(() =>
        Array(384).fill(0).map(() => Math.random())
      );
      
      const startTime = performance.now();
      topKSimilar(query, candidates, 10);
      const endTime = performance.now();
      
      // Should process 1000 candidates in reasonable time
      expect(endTime - startTime).toBeLessThan(100); // < 100ms
    });
  });
});
