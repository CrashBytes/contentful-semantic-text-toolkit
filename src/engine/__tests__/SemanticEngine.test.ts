/**
 * SemanticEngine Test Suite
 *
 * Comprehensive validation of embedding generation, similarity computation,
 * and lifecycle management for the semantic engine.
 */

import { SemanticEngine } from '../SemanticEngine';
import { SemanticError, SemanticErrorCode } from '../../types';

// Mock the transformers library
jest.mock('@xenova/transformers', () => ({
  pipeline: jest.fn(),
}));

import { pipeline } from '@xenova/transformers';

const mockPipeline = pipeline as jest.MockedFunction<typeof pipeline>;

describe('SemanticEngine', () => {
  let engine: SemanticEngine;
  let mockModel: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a mock model that returns embeddings
    mockModel = jest.fn().mockImplementation((text: string) => {
      // Generate deterministic embeddings based on text length
      const embedding = Array(384).fill(0).map((_, i) =>
        Math.sin(text.length + i) * 0.1
      );
      return Promise.resolve({
        data: Float32Array.from(embedding),
      });
    });

    mockPipeline.mockResolvedValue(mockModel as any);
    engine = new SemanticEngine();
  });

  afterEach(() => {
    engine.dispose();
  });

  describe('constructor', () => {
    it('creates engine with default configuration', () => {
      const config = engine.getConfig();
      expect(config.modelName).toBe('Xenova/all-MiniLM-L6-v2');
      expect(config.maxLength).toBe(512);
      expect(config.quantized).toBe(true);
    });

    it('accepts custom configuration', () => {
      const customEngine = new SemanticEngine({
        modelName: 'custom-model',
        maxLength: 256,
        quantized: false,
      });

      const config = customEngine.getConfig();
      expect(config.modelName).toBe('custom-model');
      expect(config.maxLength).toBe(256);
      expect(config.quantized).toBe(false);

      customEngine.dispose();
    });

    it('merges partial configuration with defaults', () => {
      const customEngine = new SemanticEngine({ maxLength: 1024 });

      const config = customEngine.getConfig();
      expect(config.modelName).toBe('Xenova/all-MiniLM-L6-v2');
      expect(config.maxLength).toBe(1024);

      customEngine.dispose();
    });
  });

  describe('initialize', () => {
    it('loads the model successfully', async () => {
      await engine.initialize();

      expect(mockPipeline).toHaveBeenCalledWith(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2',
        { quantized: true }
      );
      expect(engine.isReady()).toBe(true);
    });

    it('calls onProgress callback during initialization', async () => {
      const onProgress = jest.fn();
      const engineWithProgress = new SemanticEngine({ onProgress });

      await engineWithProgress.initialize();

      expect(onProgress).toHaveBeenCalledWith({
        status: 'downloading',
        progress: 0,
      });
      expect(onProgress).toHaveBeenCalledWith({
        status: 'ready',
        progress: 100,
      });

      engineWithProgress.dispose();
    });

    it('returns immediately if already initialized', async () => {
      await engine.initialize();
      await engine.initialize();

      // Pipeline should only be called once
      expect(mockPipeline).toHaveBeenCalledTimes(1);
    });

    it('handles concurrent initialization calls', async () => {
      const promise1 = engine.initialize();
      const promise2 = engine.initialize();
      const promise3 = engine.initialize();

      await Promise.all([promise1, promise2, promise3]);

      // Pipeline should only be called once
      expect(mockPipeline).toHaveBeenCalledTimes(1);
    });

    it('throws SemanticError on initialization failure', async () => {
      mockPipeline.mockRejectedValue(new Error('Network error'));

      await expect(engine.initialize()).rejects.toThrow(SemanticError);

      try {
        await engine.initialize();
      } catch (error) {
        expect(error).toBeInstanceOf(SemanticError);
        const semanticError = error as SemanticError;
        expect(semanticError.code).toBe(SemanticErrorCode.MODEL_NOT_LOADED);
        expect(semanticError.message).toContain('Failed to initialize model');
      }
    });

    it('handles non-Error rejection', async () => {
      mockPipeline.mockRejectedValue('String error');

      await expect(engine.initialize()).rejects.toThrow(SemanticError);
    });
  });

  describe('embed', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('generates embedding for valid text', async () => {
      const result = await engine.embed('Hello world');

      expect(result.embedding).toHaveLength(384);
      expect(result.text).toBe('Hello world');
      expect(result.metadata.dimensions).toBe(384);
      expect(result.metadata.modelName).toBe('Xenova/all-MiniLM-L6-v2');
      expect(result.metadata.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('throws when model not initialized', async () => {
      const uninitializedEngine = new SemanticEngine();

      await expect(uninitializedEngine.embed('test'))
        .rejects.toThrow(SemanticError);

      try {
        await uninitializedEngine.embed('test');
      } catch (error) {
        expect((error as SemanticError).code).toBe(SemanticErrorCode.MODEL_NOT_LOADED);
      }
    });

    it('throws on empty string input', async () => {
      await expect(engine.embed('')).rejects.toThrow(SemanticError);

      try {
        await engine.embed('');
      } catch (error) {
        expect((error as SemanticError).code).toBe(SemanticErrorCode.INVALID_INPUT);
      }
    });

    it('throws on non-string input', async () => {
      await expect(engine.embed(null as any)).rejects.toThrow(SemanticError);
      await expect(engine.embed(undefined as any)).rejects.toThrow(SemanticError);
      await expect(engine.embed(123 as any)).rejects.toThrow(SemanticError);
    });

    it('handles model embedding failure', async () => {
      mockModel.mockRejectedValue(new Error('Embedding failed'));

      await expect(engine.embed('test')).rejects.toThrow(SemanticError);

      try {
        await engine.embed('test');
      } catch (error) {
        expect((error as SemanticError).code).toBe(SemanticErrorCode.EMBEDDING_FAILED);
      }
    });

    it('handles non-Error embedding failure', async () => {
      mockModel.mockRejectedValue('String error');

      await expect(engine.embed('test')).rejects.toThrow(SemanticError);
    });

    it('truncates long text in error details', async () => {
      const longText = 'x'.repeat(200);
      mockModel.mockRejectedValue(new Error('Failed'));

      try {
        await engine.embed(longText);
      } catch (error) {
        expect((error as SemanticError).details?.text).toHaveLength(100);
      }
    });
  });

  describe('embedBatch', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('generates embeddings for multiple texts', async () => {
      const texts = ['Hello', 'World', 'Test'];
      const results = await engine.embedBatch(texts);

      expect(results).toHaveLength(3);
      results.forEach((result, idx) => {
        expect(result.text).toBe(texts[idx]);
        expect(result.embedding).toHaveLength(384);
      });
    });

    it('throws when model not initialized', async () => {
      const uninitializedEngine = new SemanticEngine();

      await expect(uninitializedEngine.embedBatch(['test']))
        .rejects.toThrow(SemanticError);
    });

    it('throws on empty array', async () => {
      await expect(engine.embedBatch([])).rejects.toThrow(SemanticError);

      try {
        await engine.embedBatch([]);
      } catch (error) {
        expect((error as SemanticError).code).toBe(SemanticErrorCode.INVALID_INPUT);
      }
    });

    it('throws on non-array input', async () => {
      await expect(engine.embedBatch(null as any)).rejects.toThrow(SemanticError);
      await expect(engine.embedBatch('test' as any)).rejects.toThrow(SemanticError);
    });

    it('respects batch size option', async () => {
      const texts = Array(10).fill('text');
      await engine.embedBatch(texts, { batchSize: 3 });

      // With 10 items and batchSize 3, we need 4 batches (3+3+3+1)
      // Each item calls embed once
      expect(mockModel).toHaveBeenCalledTimes(10);
    });

    it('calls onProgress callback', async () => {
      const onProgress = jest.fn();
      const texts = ['a', 'b', 'c', 'd', 'e'];

      await engine.embedBatch(texts, { batchSize: 2, onProgress });

      // With 5 items and batchSize 2: batches complete at 2, 4, 5
      expect(onProgress).toHaveBeenCalledWith(2, 5);
      expect(onProgress).toHaveBeenCalledWith(4, 5);
      expect(onProgress).toHaveBeenCalledWith(5, 5);
    });

    it('uses default batch size of 32', async () => {
      const texts = Array(64).fill('text');
      const onProgress = jest.fn();

      await engine.embedBatch(texts, { onProgress });

      expect(onProgress).toHaveBeenCalledWith(32, 64);
      expect(onProgress).toHaveBeenCalledWith(64, 64);
    });
  });

  describe('similarity', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('computes cosine similarity by default', async () => {
      const result = await engine.similarity('Hello', 'Hello');

      expect(result.score).toBeCloseTo(1.0, 5);
      expect(result.texts).toEqual(['Hello', 'Hello']);
      expect(result.metadata.method).toBe('cosine');
      expect(result.metadata.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('computes cosine similarity explicitly', async () => {
      const result = await engine.similarity('Hello', 'Hello', 'cosine');

      expect(result.score).toBeCloseTo(1.0, 5);
      expect(result.metadata.method).toBe('cosine');
    });

    it('computes euclidean distance', async () => {
      const result = await engine.similarity('Hello', 'Hello', 'euclidean');

      // Same text should have distance close to 0, so negated score close to 0
      expect(result.score).toBeCloseTo(0, 5);
      expect(result.metadata.method).toBe('euclidean');
    });

    it('computes dot product', async () => {
      const result = await engine.similarity('Hello', 'Hello', 'dot');

      expect(result.metadata.method).toBe('dot');
      expect(typeof result.score).toBe('number');
    });

    it('throws on unknown similarity method', async () => {
      await expect(engine.similarity('a', 'b', 'unknown' as any))
        .rejects.toThrow(SemanticError);

      try {
        await engine.similarity('a', 'b', 'unknown' as any);
      } catch (error) {
        expect((error as SemanticError).code).toBe(SemanticErrorCode.INVALID_INPUT);
        expect((error as SemanticError).message).toContain('Unknown similarity method');
      }
    });
  });

  describe('dispose', () => {
    it('clears model and initialization state', async () => {
      await engine.initialize();
      expect(engine.isReady()).toBe(true);

      engine.dispose();

      expect(engine.isReady()).toBe(false);
    });

    it('allows re-initialization after dispose', async () => {
      await engine.initialize();
      engine.dispose();

      expect(engine.isReady()).toBe(false);

      await engine.initialize();
      expect(engine.isReady()).toBe(true);
    });
  });

  describe('isReady', () => {
    it('returns false before initialization', () => {
      expect(engine.isReady()).toBe(false);
    });

    it('returns true after initialization', async () => {
      await engine.initialize();
      expect(engine.isReady()).toBe(true);
    });

    it('returns false after dispose', async () => {
      await engine.initialize();
      engine.dispose();
      expect(engine.isReady()).toBe(false);
    });
  });

  describe('getConfig', () => {
    it('returns a copy of the configuration', () => {
      const config1 = engine.getConfig();
      const config2 = engine.getConfig();

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });

    it('modifications do not affect internal config', () => {
      const config = engine.getConfig();
      config.modelName = 'modified';

      expect(engine.getConfig().modelName).toBe('Xenova/all-MiniLM-L6-v2');
    });
  });
});
