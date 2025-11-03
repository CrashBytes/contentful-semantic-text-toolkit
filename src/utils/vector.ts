/**
 * Vector Mathematics - Performance-Optimized Operations
 * 
 * Architectural Principles:
 * - Pure functions ensure predictability
 * - O(n) time complexity for scalability
 * - Defensive validation at boundaries
 * - Zero external dependencies
 */

import { Embedding, SemanticError, SemanticErrorCode } from '../types';

function validateDimensions(a: Embedding, b: Embedding): void {
  if (a.length !== b.length) {
    throw new SemanticError(
      SemanticErrorCode.DIMENSION_MISMATCH,
      `Embedding dimensions must match. Got ${a.length} and ${b.length}`,
      { dimensions: [a.length, b.length] }
    );
  }
}

function validateEmbedding(embedding: Embedding, name: string = 'embedding'): void {
  if (!embedding || embedding.length === 0) {
    throw new SemanticError(
      SemanticErrorCode.INVALID_INPUT,
      `${name} must be a non-empty array`,
      { length: embedding?.length }
    );
  }
}

export function dotProduct(a: Embedding, b: Embedding): number {
  validateEmbedding(a, 'first embedding');
  validateEmbedding(b, 'second embedding');
  validateDimensions(a, b);

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

export function magnitude(vector: Embedding): number {
  validateEmbedding(vector);
  
  let sum = 0;
  for (let i = 0; i < vector.length; i++) {
    sum += vector[i] * vector[i];
  }
  return Math.sqrt(sum);
}

export function cosineSimilarity(a: Embedding, b: Embedding): number {
  validateEmbedding(a, 'first embedding');
  validateEmbedding(b, 'second embedding');
  validateDimensions(a, b);

  const dot = dotProduct(a, b);
  const magA = magnitude(a);
  const magB = magnitude(b);

  if (magA === 0 || magB === 0) {
    throw new SemanticError(
      SemanticErrorCode.COMPUTATION_FAILED,
      'Cannot compute cosine similarity with zero-magnitude vector',
      { magnitudes: [magA, magB] }
    );
  }

  return dot / (magA * magB);
}

export function euclideanDistance(a: Embedding, b: Embedding): number {
  validateEmbedding(a, 'first embedding');
  validateEmbedding(b, 'second embedding');
  validateDimensions(a, b);

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export function normalize(vector: Embedding): Embedding {
  validateEmbedding(vector);
  
  const mag = magnitude(vector);
  if (mag === 0) {
    throw new SemanticError(
      SemanticErrorCode.COMPUTATION_FAILED,
      'Cannot normalize zero-magnitude vector'
    );
  }

  return vector.map(v => v / mag);
}

export function centroid(embeddings: Embedding[]): Embedding {
  if (!embeddings || embeddings.length === 0) {
    throw new SemanticError(
      SemanticErrorCode.INVALID_INPUT,
      'Cannot compute centroid of empty array'
    );
  }

  const dim = embeddings[0].length;
  const result = new Array(dim).fill(0);

  for (const embedding of embeddings) {
    if (embedding.length !== dim) {
      throw new SemanticError(
        SemanticErrorCode.DIMENSION_MISMATCH,
        'All embeddings must have same dimensions'
      );
    }
    for (let i = 0; i < dim; i++) {
      result[i] += embedding[i];
    }
  }

  return result.map(v => v / embeddings.length);
}

export function topKSimilar(
  query: Embedding,
  candidates: Embedding[],
  k: number = 10
): Array<[number, number]> {
  validateEmbedding(query, 'query');
  
  if (!candidates || candidates.length === 0) {
    return [];
  }

  if (k <= 0) {
    throw new SemanticError(
      SemanticErrorCode.INVALID_INPUT,
      'k must be positive',
      { k }
    );
  }

  const similarities: Array<[number, number]> = candidates.map((candidate, idx) => {
    try {
      return [idx, cosineSimilarity(query, candidate)];
    } catch (error) {
      return [idx, -Infinity];
    }
  });

  similarities.sort((a, b) => b[1] - a[1]);
  
  return similarities.slice(0, Math.min(k, similarities.length));
}
