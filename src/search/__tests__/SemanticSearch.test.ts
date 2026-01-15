/**
 * SemanticSearch Test Suite
 *
 * Comprehensive validation of semantic search functionality including
 * indexing, searching, filtering, and index management.
 */

// Mock the transformers library before any imports
jest.mock('@xenova/transformers', () => ({
  pipeline: jest.fn(),
}));

import { SemanticSearch, IndexedItem } from '../SemanticSearch';
import { SemanticEngine } from '../../engine/SemanticEngine';
import { SemanticError, SemanticErrorCode } from '../../types';

// Mock the SemanticEngine
jest.mock('../../engine/SemanticEngine');

const MockedSemanticEngine = SemanticEngine as jest.MockedClass<typeof SemanticEngine>;

describe('SemanticSearch', () => {
  let mockEngine: jest.Mocked<SemanticEngine>;
  let search: SemanticSearch<string>;

  // Helper to create mock embeddings
  const createMockEmbedding = (seed: number) =>
    Array(384).fill(0).map((_, i) => Math.sin(seed + i) * 0.1);

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock engine
    mockEngine = new MockedSemanticEngine() as jest.Mocked<SemanticEngine>;

    // Mock embedBatch to return embeddings based on input
    mockEngine.embedBatch = jest.fn().mockImplementation((texts: string[]) =>
      Promise.resolve(
        texts.map((text, idx) => ({
          embedding: createMockEmbedding(text.length + idx),
          text,
          metadata: {
            dimensions: 384,
            modelName: 'test-model',
            processingTime: 10,
          },
        }))
      )
    );

    // Mock embed for single text
    mockEngine.embed = jest.fn().mockImplementation((text: string) =>
      Promise.resolve({
        embedding: createMockEmbedding(text.length),
        text,
        metadata: {
          dimensions: 384,
          modelName: 'test-model',
          processingTime: 5,
        },
      })
    );

    search = new SemanticSearch(mockEngine);
  });

  describe('constructor', () => {
    it('creates search with default configuration', () => {
      const stats = search.getStats();
      expect(stats.itemCount).toBe(0);
    });

    it('accepts custom configuration', () => {
      const customSearch = new SemanticSearch(mockEngine, {
        topK: 5,
        threshold: 0.5,
      });

      expect(customSearch).toBeDefined();
    });

    it('accepts custom text extractor', () => {
      interface Document {
        title: string;
        content: string;
      }

      const docSearch = new SemanticSearch<Document>(mockEngine, {
        textExtractor: (doc) => `${doc.title} ${doc.content}`,
      });

      expect(docSearch).toBeDefined();
    });

    it('accepts custom metadata extractor', () => {
      interface Document {
        id: number;
        text: string;
      }

      const docSearch = new SemanticSearch<Document>(mockEngine, {
        textExtractor: (doc) => doc.text,
        metadataExtractor: (doc) => ({ id: doc.id }),
      });

      expect(docSearch).toBeDefined();
    });
  });

  describe('index', () => {
    it('indexes array of strings', async () => {
      await search.index(['Hello', 'World', 'Test']);

      const stats = search.getStats();
      expect(stats.itemCount).toBe(3);
      expect(stats.dimensions).toBe(384);
    });

    it('throws on empty array', async () => {
      await expect(search.index([])).rejects.toThrow(SemanticError);

      try {
        await search.index([]);
      } catch (error) {
        expect((error as SemanticError).code).toBe(SemanticErrorCode.INVALID_INPUT);
      }
    });

    it('throws on non-array input', async () => {
      await expect(search.index(null as any)).rejects.toThrow(SemanticError);
      await expect(search.index('test' as any)).rejects.toThrow(SemanticError);
    });

    it('appends to existing index by default', async () => {
      await search.index(['A', 'B']);
      await search.index(['C', 'D']);

      const stats = search.getStats();
      expect(stats.itemCount).toBe(4);
    });

    it('replaces index when replace=true', async () => {
      await search.index(['A', 'B', 'C']);
      await search.index(['X', 'Y'], true);

      const stats = search.getStats();
      expect(stats.itemCount).toBe(2);
    });

    it('calls embedBatch with batch size 32', async () => {
      await search.index(['test']);

      expect(mockEngine.embedBatch).toHaveBeenCalledWith(
        ['test'],
        { batchSize: 32 }
      );
    });

    it('uses custom text extractor', async () => {
      interface Doc {
        title: string;
      }

      const docSearch = new SemanticSearch<Doc>(mockEngine, {
        textExtractor: (doc) => doc.title,
      });

      await docSearch.index([{ title: 'Hello' }, { title: 'World' }]);

      expect(mockEngine.embedBatch).toHaveBeenCalledWith(
        ['Hello', 'World'],
        { batchSize: 32 }
      );
    });

    it('uses custom metadata extractor', async () => {
      interface Doc {
        id: number;
        text: string;
      }

      const docSearch = new SemanticSearch<Doc>(mockEngine, {
        textExtractor: (doc) => doc.text,
        metadataExtractor: (doc) => ({ docId: doc.id }),
      });

      await docSearch.index([
        { id: 1, text: 'Hello' },
        { id: 2, text: 'World' },
      ]);

      const exported = docSearch.exportIndex();
      expect(exported[0].metadata).toEqual({ docId: 1 });
      expect(exported[1].metadata).toEqual({ docId: 2 });
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await search.index(['apple', 'banana', 'cherry', 'date', 'elderberry']);
    });

    it('returns search results', async () => {
      const results = await search.search('fruit');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('item');
      expect(results[0]).toHaveProperty('score');
      expect(results[0]).toHaveProperty('rank');
    });

    it('throws on empty index', async () => {
      const emptySearch = new SemanticSearch(mockEngine);

      await expect(emptySearch.search('test')).rejects.toThrow(SemanticError);

      try {
        await emptySearch.search('test');
      } catch (error) {
        expect((error as SemanticError).code).toBe(SemanticErrorCode.INVALID_INPUT);
        expect((error as SemanticError).message).toContain('Index is empty');
      }
    });

    it('respects topK configuration', async () => {
      const results = await search.search('fruit', { topK: 3 });

      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('respects threshold configuration', async () => {
      const results = await search.search('fruit', { threshold: 0.99 });

      // High threshold likely filters out all results
      results.forEach((result) => {
        expect(result.score).toBeGreaterThanOrEqual(0.99);
      });
    });

    it('assigns correct ranks', async () => {
      const results = await search.search('fruit', { topK: 5 });

      results.forEach((result, idx) => {
        expect(result.rank).toBe(idx + 1);
      });
    });

    it('orders results by score descending', async () => {
      const results = await search.search('fruit', { topK: 5 });

      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
      }
    });

    it('uses default topK of 10', async () => {
      // Index more than 10 items
      await search.index(
        Array(15).fill(0).map((_, i) => `item${i}`),
        true
      );

      const results = await search.search('item');

      expect(results.length).toBeLessThanOrEqual(10);
    });
  });

  describe('searchWithFilter', () => {
    interface Document {
      text: string;
      category: string;
    }

    let docSearch: SemanticSearch<Document>;

    beforeEach(async () => {
      docSearch = new SemanticSearch<Document>(mockEngine, {
        textExtractor: (doc) => doc.text,
        metadataExtractor: (doc) => ({ category: doc.category }),
      });

      await docSearch.index([
        { text: 'apple pie', category: 'dessert' },
        { text: 'banana bread', category: 'dessert' },
        { text: 'chicken soup', category: 'main' },
        { text: 'beef stew', category: 'main' },
        { text: 'fruit salad', category: 'appetizer' },
      ]);
    });

    it('filters results by metadata', async () => {
      const results = await docSearch.searchWithFilter(
        'food',
        (metadata) => metadata.category === 'dessert'
      );

      results.forEach((result) => {
        expect(result.item.category).toBe('dessert');
      });
    });

    it('restores original index after filtering', async () => {
      const beforeCount = docSearch.getStats().itemCount;

      await docSearch.searchWithFilter(
        'food',
        (metadata) => metadata.category === 'dessert'
      );

      const afterCount = docSearch.getStats().itemCount;
      expect(afterCount).toBe(beforeCount);
    });

    it('handles filter that matches no items', async () => {
      // When filter matches no items, searchWithFilter catches the empty index error
      // and returns empty results
      try {
        const results = await docSearch.searchWithFilter(
          'food',
          (metadata) => metadata.category === 'nonexistent'
        );
        // If we get here without error, results should be empty
        expect(results).toEqual([]);
      } catch (error) {
        // Empty filtered index throws SemanticError
        expect(error).toBeInstanceOf(SemanticError);
        expect((error as SemanticError).code).toBe(SemanticErrorCode.INVALID_INPUT);
      }
    });

    it('handles empty metadata', async () => {
      await search.index(['a', 'b', 'c']);

      const results = await search.searchWithFilter(
        'test',
        () => true
      );

      expect(results.length).toBeGreaterThan(0);
    });

    it('respects config overrides', async () => {
      const results = await docSearch.searchWithFilter(
        'food',
        () => true,
        { topK: 2 }
      );

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('handles items with undefined metadata', async () => {
      // Create index with items that have no metadata property
      const itemsWithNoMetadata: IndexedItem<string>[] = [
        { item: 'test1', embedding: createMockEmbedding(1) },
        { item: 'test2', embedding: createMockEmbedding(2) },
      ];

      search.importIndex(itemsWithNoMetadata);

      // Filter should handle undefined metadata gracefully via ?? {}
      const results = await search.searchWithFilter(
        'test',
        () => true
      );

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('findSimilar', () => {
    beforeEach(async () => {
      await search.index(['apple', 'banana', 'cherry']);
    });

    it('finds items similar to given item', async () => {
      const results = await search.findSimilar('apple');

      expect(results.length).toBeGreaterThan(0);
      expect(mockEngine.embed).toHaveBeenCalledWith('apple');
    });

    it('respects config overrides', async () => {
      const results = await search.findSimilar('apple', { topK: 1 });

      expect(results.length).toBeLessThanOrEqual(1);
    });

    it('uses text extractor for complex types', async () => {
      interface Doc {
        title: string;
      }

      const docSearch = new SemanticSearch<Doc>(mockEngine, {
        textExtractor: (doc) => doc.title,
      });

      await docSearch.index([{ title: 'Hello' }, { title: 'World' }]);
      await docSearch.findSimilar({ title: 'Test' });

      expect(mockEngine.embed).toHaveBeenCalledWith('Test');
    });
  });

  describe('getStats', () => {
    it('returns zero stats for empty index', () => {
      const stats = search.getStats();

      expect(stats.itemCount).toBe(0);
      expect(stats.dimensions).toBe(0);
      expect(stats.memoryEstimate).toBe('0.00 KB');
    });

    it('returns correct item count', async () => {
      await search.index(['a', 'b', 'c', 'd', 'e']);

      const stats = search.getStats();
      expect(stats.itemCount).toBe(5);
    });

    it('returns correct dimensions', async () => {
      await search.index(['test']);

      const stats = search.getStats();
      expect(stats.dimensions).toBe(384);
    });

    it('formats memory in KB for small indexes', async () => {
      await search.index(['test']);

      const stats = search.getStats();
      expect(stats.memoryEstimate).toMatch(/KB$/);
    });

    it('formats memory in MB for large indexes', async () => {
      // Create many items to exceed 1MB
      // 384 dimensions * 8 bytes = 3072 bytes per item
      // Need ~350 items for 1MB
      const items = Array(400).fill('item');
      await search.index(items);

      const stats = search.getStats();
      expect(stats.memoryEstimate).toMatch(/MB$/);
    });
  });

  describe('clear', () => {
    it('removes all items from index', async () => {
      await search.index(['a', 'b', 'c']);
      expect(search.getStats().itemCount).toBe(3);

      search.clear();

      expect(search.getStats().itemCount).toBe(0);
    });
  });

  describe('exportIndex', () => {
    it('returns copy of indexed items', async () => {
      await search.index(['apple', 'banana']);

      const exported = search.exportIndex();

      expect(exported).toHaveLength(2);
      expect(exported[0].item).toBe('apple');
      expect(exported[1].item).toBe('banana');
      expect(exported[0].embedding).toHaveLength(384);
    });

    it('returns copy, not reference', async () => {
      await search.index(['test']);

      const exported1 = search.exportIndex();
      const exported2 = search.exportIndex();

      expect(exported1).not.toBe(exported2);
    });
  });

  describe('importIndex', () => {
    it('replaces current index', async () => {
      await search.index(['old1', 'old2']);

      const newIndex: IndexedItem<string>[] = [
        { item: 'new1', embedding: createMockEmbedding(1), metadata: {} },
        { item: 'new2', embedding: createMockEmbedding(2), metadata: {} },
        { item: 'new3', embedding: createMockEmbedding(3), metadata: {} },
      ];

      search.importIndex(newIndex);

      expect(search.getStats().itemCount).toBe(3);
      const exported = search.exportIndex();
      expect(exported[0].item).toBe('new1');
    });

    it('creates copy of imported data', async () => {
      const newIndex: IndexedItem<string>[] = [
        { item: 'test', embedding: createMockEmbedding(1), metadata: {} },
      ];

      search.importIndex(newIndex);
      newIndex.push({
        item: 'added',
        embedding: createMockEmbedding(2),
        metadata: {},
      });

      expect(search.getStats().itemCount).toBe(1);
    });

    it('allows searching after import', async () => {
      const newIndex: IndexedItem<string>[] = [
        { item: 'apple', embedding: createMockEmbedding(1), metadata: {} },
        { item: 'banana', embedding: createMockEmbedding(2), metadata: {} },
      ];

      search.importIndex(newIndex);
      const results = await search.search('fruit');

      // Results may be empty if threshold filters them out, but search should work
      expect(Array.isArray(results)).toBe(true);
      // Verify search was called with the query
      expect(mockEngine.embed).toHaveBeenCalledWith('fruit');
    });
  });

  describe('integration scenarios', () => {
    it('handles full workflow: index -> search -> filter -> clear', async () => {
      interface Product {
        name: string;
        category: string;
        price: number;
      }

      const productSearch = new SemanticSearch<Product>(mockEngine, {
        textExtractor: (p) => `${p.name} ${p.category}`,
        metadataExtractor: (p) => ({ category: p.category, price: p.price }),
      });

      // Index products
      await productSearch.index([
        { name: 'iPhone', category: 'electronics', price: 999 },
        { name: 'Samsung Galaxy', category: 'electronics', price: 899 },
        { name: 'Nike Shoes', category: 'apparel', price: 150 },
        { name: 'Adidas Sneakers', category: 'apparel', price: 120 },
      ]);

      expect(productSearch.getStats().itemCount).toBe(4);

      // Search all
      const allResults = await productSearch.search('phone');
      expect(allResults.length).toBeGreaterThan(0);

      // Search with filter
      const electronicsResults = await productSearch.searchWithFilter(
        'phone',
        (m) => m.category === 'electronics'
      );
      electronicsResults.forEach((r) => {
        expect(r.item.category).toBe('electronics');
      });

      // Find similar
      const similar = await productSearch.findSimilar({
        name: 'Google Pixel',
        category: 'electronics',
        price: 799,
      });
      expect(similar.length).toBeGreaterThan(0);

      // Export and import
      const exported = productSearch.exportIndex();
      productSearch.clear();
      expect(productSearch.getStats().itemCount).toBe(0);

      productSearch.importIndex(exported);
      expect(productSearch.getStats().itemCount).toBe(4);
    });
  });
});
