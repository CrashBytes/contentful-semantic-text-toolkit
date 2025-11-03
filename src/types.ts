/**
 * Core Type Definitions
 * 
 * Design Philosophy:
 * - Type safety prevents runtime failures
 * - Semantic error codes enable precise debugging
 * - Generic types provide flexibility without sacrificing safety
 */

export type Embedding = number[];

export interface ModelConfig {
  modelName?: string;
  maxLength?: number;
  quantized?: boolean;
  onProgress?: (progress: ModelLoadProgress) => void;
}

export interface ModelLoadProgress {
  status: 'downloading' | 'loading' | 'ready';
  progress: number;
  file?: string;
}

export interface EmbeddingResult {
  embedding: Embedding;
  text: string;
  metadata: {
    dimensions: number;
    modelName: string;
    processingTime: number;
  };
}

export interface SimilarityResult {
  score: number;
  texts: [string, string];
  metadata: {
    method: 'cosine' | 'euclidean' | 'dot';
    processingTime: number;
  };
}

export interface SearchResult<T = string> {
  item: T;
  score: number;
  rank: number;
}

export interface BatchOptions {
  batchSize?: number;
  parallel?: boolean;
  onProgress?: (completed: number, total: number) => void;
}

export enum SemanticErrorCode {
  MODEL_NOT_LOADED = 'MODEL_NOT_LOADED',
  INVALID_INPUT = 'INVALID_INPUT',
  EMBEDDING_FAILED = 'EMBEDDING_FAILED',
  COMPUTATION_FAILED = 'COMPUTATION_FAILED',
  DIMENSION_MISMATCH = 'DIMENSION_MISMATCH',
}

export class SemanticError extends Error {
  constructor(
    public code: SemanticErrorCode,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SemanticError';
  }
}
