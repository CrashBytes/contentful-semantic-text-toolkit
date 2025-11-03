/**
 * Semantic Text Toolkit
 * Production-grade semantic text analysis
 * 
 * @module @crashbytes/semantic-text-toolkit
 * @author Blackhole Software, LLC
 * @license MIT
 */

export { SemanticEngine } from './engine/SemanticEngine';
export { SemanticSearch, type SearchConfig, type IndexedItem } from './search/SemanticSearch';
export { cosineSimilarity, euclideanDistance, dotProduct, magnitude, normalize, centroid, topKSimilar } from './utils/vector';
export { type Embedding, type ModelConfig, type EmbeddingResult, type SimilarityResult, type SearchResult, type BatchOptions, type ModelLoadProgress, SemanticError, SemanticErrorCode } from './types';

export async function createSemanticEngine(config?: import('./types').ModelConfig) {
  const { SemanticEngine } = await import('./engine/SemanticEngine');
  const engine = new SemanticEngine(config);
  await engine.initialize();
  return engine;
}

export async function createSemanticSearch<T = string>(
  items: T[],
  config?: import('./search/SemanticSearch').SearchConfig<T>
) {
  const engine = await createSemanticEngine();
  const { SemanticSearch } = await import('./search/SemanticSearch');
  const search = new SemanticSearch(engine, config);
  await search.index(items);
  return search;
}
