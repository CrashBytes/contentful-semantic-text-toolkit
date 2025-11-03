/**
 * Semantic Search - Vector-Based Document Retrieval
 * 
 * Architectural Principles:
 * - Pre-computed embeddings optimize retrieval latency
 * - Configurable ranking strategies enable domain customization
 * - Metadata filtering supports complex queries
 * - O(n log k) complexity for top-k selection
 */

import { SemanticEngine } from '../engine/SemanticEngine';
import {
  Embedding,
  SearchResult,
  SemanticError,
  SemanticErrorCode,
} from '../types';
import { topKSimilar } from '../utils/vector';

export interface SearchConfig<T = string> {
  topK?: number;
  threshold?: number;
  textExtractor?: (item: T) => string;
  metadataExtractor?: (item: T) => Record<string, unknown>;
}

export interface IndexedItem<T = string> {
  item: T;
  embedding: Embedding;
  metadata?: Record<string, unknown>;
}

export class SemanticSearch<T = string> {
  private engine: SemanticEngine;
  private indexedItems: IndexedItem<T>[] = [];
  private config: Required<SearchConfig<T>>;

  constructor(engine: SemanticEngine, config: SearchConfig<T> = {}) {
    this.engine = engine;
    this.config = {
      topK: config.topK ?? 10,
      threshold: config.threshold ?? 0,
      textExtractor: config.textExtractor ?? ((item) => String(item)),
      metadataExtractor: config.metadataExtractor ?? (() => ({})),
    };
  }

  async index(items: T[], replace: boolean = false): Promise<void> {
    if (!Array.isArray(items) || items.length === 0) {
      throw new SemanticError(
        SemanticErrorCode.INVALID_INPUT,
        'Items must be a non-empty array'
      );
    }

    if (replace) {
      this.indexedItems = [];
    }

    const texts = items.map(this.config.textExtractor);
    const results = await this.engine.embedBatch(texts, { batchSize: 32 });

    const newIndexItems = items.map((item, idx) => ({
      item,
      embedding: results[idx].embedding,
      metadata: this.config.metadataExtractor(item),
    }));

    this.indexedItems.push(...newIndexItems);
  }

  async search(
    query: string,
    overrideConfig?: Partial<SearchConfig<T>>
  ): Promise<SearchResult<T>[]> {
    if (this.indexedItems.length === 0) {
      throw new SemanticError(
        SemanticErrorCode.INVALID_INPUT,
        'Index is empty. Call index() before searching.'
      );
    }

    const config = { ...this.config, ...overrideConfig };
    const queryResult = await this.engine.embed(query);
    const candidateEmbeddings = this.indexedItems.map(item => item.embedding);
    const topK = topKSimilar(queryResult.embedding, candidateEmbeddings, config.topK);

    const results: SearchResult<T>[] = [];
    let rank = 1;

    for (const [idx, score] of topK) {
      if (score < config.threshold) continue;

      results.push({
        item: this.indexedItems[idx].item,
        score,
        rank: rank++,
      });
    }

    return results;
  }

  async searchWithFilter(
    query: string,
    filter: (metadata: Record<string, unknown>) => boolean,
    config?: Partial<SearchConfig<T>>
  ): Promise<SearchResult<T>[]> {
    const originalIndex = this.indexedItems;
    this.indexedItems = originalIndex.filter(item => filter(item.metadata ?? {}));

    try {
      return await this.search(query, config);
    } finally {
      this.indexedItems = originalIndex;
    }
  }

  async findSimilar(
    item: T,
    config?: Partial<SearchConfig<T>>
  ): Promise<SearchResult<T>[]> {
    const text = this.config.textExtractor(item);
    return this.search(text, config);
  }

  getStats(): {
    itemCount: number;
    dimensions: number;
    memoryEstimate: string;
  } {
    const itemCount = this.indexedItems.length;
    const dimensions = this.indexedItems[0]?.embedding.length ?? 0;
    const totalBytes = itemCount * dimensions * 8;
    
    const memoryEstimate = totalBytes < 1024 * 1024
      ? `${(totalBytes / 1024).toFixed(2)} KB`
      : `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;

    return { itemCount, dimensions, memoryEstimate };
  }

  clear(): void {
    this.indexedItems = [];
  }

  exportIndex(): IndexedItem<T>[] {
    return [...this.indexedItems];
  }

  importIndex(index: IndexedItem<T>[]): void {
    this.indexedItems = [...index];
  }
}
