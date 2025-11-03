/**
 * Semantic Engine - Core Embedding Generation
 * 
 * Architectural Principles:
 * - Lazy initialization minimizes startup overhead
 * - Singleton pattern prevents redundant model loading
 * - Resource management through explicit lifecycle control
 * - Defensive error handling with semantic codes
 */

import { pipeline, Pipeline } from '@xenova/transformers';
import {
  ModelConfig,
  EmbeddingResult,
  SimilarityResult,
  Embedding,
  BatchOptions,
  SemanticError,
  SemanticErrorCode,
} from '../types';
import { cosineSimilarity, euclideanDistance, dotProduct } from '../utils/vector';

const DEFAULT_CONFIG: Required<ModelConfig> = {
  modelName: 'Xenova/all-MiniLM-L6-v2',
  maxLength: 512,
  quantized: true,
  onProgress: () => {},
};

export class SemanticEngine {
  private model: Pipeline | null = null;
  private config: Required<ModelConfig>;
  private initializationPromise: Promise<void> | null = null;

  constructor(config: ModelConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async initialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    if (this.model) {
      return Promise.resolve();
    }

    this.initializationPromise = this._performInitialization();

    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  private async _performInitialization(): Promise<void> {
    try {
      this.config.onProgress({
        status: 'downloading',
        progress: 0,
      });

      this.model = await pipeline(
        'feature-extraction',
        this.config.modelName,
        {
          quantized: this.config.quantized,
        }
      );

      this.config.onProgress({
        status: 'ready',
        progress: 100,
      });
    } catch (error) {
      throw new SemanticError(
        SemanticErrorCode.MODEL_NOT_LOADED,
        `Failed to initialize model: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { modelName: this.config.modelName, error }
      );
    }
  }

  private assertInitialized(): asserts this is { model: Pipeline } {
    if (!this.model) {
      throw new SemanticError(
        SemanticErrorCode.MODEL_NOT_LOADED,
        'Model not initialized. Call initialize() first.'
      );
    }
  }

  async embed(text: string): Promise<EmbeddingResult> {
    this.assertInitialized();

    if (!text || typeof text !== 'string') {
      throw new SemanticError(
        SemanticErrorCode.INVALID_INPUT,
        'Text must be a non-empty string',
        { text }
      );
    }

    const startTime = performance.now();

    try {
      const output = await this.model(text, {
        pooling: 'mean',
        normalize: true,
      });

      const embedding = Array.from(output.data) as Embedding;
      const processingTime = performance.now() - startTime;

      return {
        embedding,
        text,
        metadata: {
          dimensions: embedding.length,
          modelName: this.config.modelName,
          processingTime,
        },
      };
    } catch (error) {
      throw new SemanticError(
        SemanticErrorCode.EMBEDDING_FAILED,
        `Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { text: text.substring(0, 100), error }
      );
    }
  }

  async embedBatch(
    texts: string[],
    options: BatchOptions = {}
  ): Promise<EmbeddingResult[]> {
    this.assertInitialized();

    const { batchSize = 32, onProgress } = options;

    if (!Array.isArray(texts) || texts.length === 0) {
      throw new SemanticError(
        SemanticErrorCode.INVALID_INPUT,
        'Texts must be a non-empty array'
      );
    }

    const results: EmbeddingResult[] = [];
    const batches = Math.ceil(texts.length / batchSize);

    for (let i = 0; i < batches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, texts.length);
      const batch = texts.slice(start, end);

      const batchResults = await Promise.all(
        batch.map(text => this.embed(text))
      );

      results.push(...batchResults);

      if (onProgress) {
        onProgress(end, texts.length);
      }
    }

    return results;
  }

  async similarity(
    textA: string,
    textB: string,
    method: 'cosine' | 'euclidean' | 'dot' = 'cosine'
  ): Promise<SimilarityResult> {
    const startTime = performance.now();

    const [resultA, resultB] = await Promise.all([
      this.embed(textA),
      this.embed(textB),
    ]);

    let score: number;
    switch (method) {
      case 'cosine':
        score = cosineSimilarity(resultA.embedding, resultB.embedding);
        break;
      case 'euclidean':
        score = -euclideanDistance(resultA.embedding, resultB.embedding);
        break;
      case 'dot':
        score = dotProduct(resultA.embedding, resultB.embedding);
        break;
      default:
        throw new SemanticError(
          SemanticErrorCode.INVALID_INPUT,
          `Unknown similarity method: ${method}`
        );
    }

    const processingTime = performance.now() - startTime;

    return {
      score,
      texts: [textA, textB],
      metadata: {
        method,
        processingTime,
      },
    };
  }

  dispose(): void {
    this.model = null;
    this.initializationPromise = null;
  }

  isReady(): boolean {
    return this.model !== null;
  }

  getConfig(): Required<ModelConfig> {
    return { ...this.config };
  }
}
