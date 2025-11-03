# 🧠 Semantic Text Toolkit

Production-grade semantic text analysis with embeddings, similarity computation, and vector search operations.

**Part of the [CrashBytes npm ecosystem](https://github.com/CrashBytes)** | Built by Blackhole Software, LLC

[![npm version](https://badge.fury.io/js/%40crashbytes%2Fsemantic-text-toolkit.svg)](https://www.npmjs.com/package/@crashbytes/semantic-text-toolkit)
[![npm downloads](https://img.shields.io/npm/dm/@crashbytes/semantic-text-toolkit.svg)](https://www.npmjs.com/package/@crashbytes/semantic-text-toolkit)

---

## 🎯 Architectural Philosophy

When building ML-powered production systems, prioritize:
- **Lazy initialization** - Models load on demand, minimizing startup overhead
- **Type safety** - Comprehensive TypeScript definitions prevent runtime failures
- **Resource efficiency** - Quantized models reduce memory footprint by 75%
- **Defensive programming** - Semantic error codes enable precise debugging

---

## 🚀 Quick Start

### Installation

```bash
npm install @crashbytes/semantic-text-toolkit
```

### Basic Usage

```typescript
import { createSemanticEngine } from '@crashbytes/semantic-text-toolkit';

const engine = await createSemanticEngine();
const result = await engine.embed("Machine learning transforms data");
console.log(result.embedding); // 384-dimensional vector

const similarity = await engine.similarity(
  "Artificial intelligence is fascinating",
  "Machine learning is interesting"
);
console.log(similarity.score); // 0.78
```

---

## 🏗️ Core Capabilities

### Text Embeddings
Transform text into high-dimensional numerical vectors that capture semantic meaning, enabling:
- Semantic similarity computation beyond keyword matching
- Vector-based search operations at scale
- Content clustering and classification
- Intelligent recommendation systems

### Similarity Metrics
Multiple metrics for domain-specific optimization:
- **Cosine similarity** - Preferred for normalized vectors (range: -1 to 1)
- **Euclidean distance** - Direct geometric distance in vector space
- **Dot product** - Efficient for pre-normalized embeddings

### Vector Search
Production-ready semantic search with:
- Configurable ranking strategies
- Metadata filtering for complex queries
- O(n log k) complexity for top-k retrieval
- Index persistence through export/import

---

## 📚 API Reference

### SemanticEngine

Core engine for embedding generation and similarity computation.

#### Constructor

```typescript
new SemanticEngine(config?: ModelConfig)
```

**Configuration Parameters:**
- `modelName` - Hugging Face model identifier (default: `'Xenova/all-MiniLM-L6-v2'`)
- `maxLength` - Maximum sequence length (default: `512`)
- `quantized` - Enable quantization (default: `true`)
- `onProgress` - Progress callback for model loading

#### Key Methods

##### `async initialize(): Promise<void>`
Initializes the model. Idempotent and concurrent-safe through promise caching.

##### `async embed(text: string): Promise<EmbeddingResult>`
Generates embedding for single text input. Returns vector with metadata.

##### `async embedBatch(texts: string[], options?: BatchOptions): Promise<EmbeddingResult[]>`
Batch processing with automatic batching and progress tracking.

##### `async similarity(textA: string, textB: string, method?: 'cosine' | 'euclidean' | 'dot'): Promise<SimilarityResult>`
Computes semantic similarity using specified metric.

---

### SemanticSearch

High-level search interface with indexing capabilities.

#### Constructor

```typescript
new SemanticSearch<T>(engine: SemanticEngine, config?: SearchConfig<T>)
```

**Configuration Parameters:**
- `topK` - Number of results to return (default: `10`)
- `threshold` - Minimum similarity score (default: `0`)
- `textExtractor` - Function to extract text from custom objects
- `metadataExtractor` - Function to extract metadata for filtering

#### Key Methods

##### `async index(items: T[], replace?: boolean): Promise<void>`
Indexes items for semantic search with optional index replacement.

##### `async search(query: string, config?: Partial<SearchConfig<T>>): Promise<SearchResult<T>[]>`
Performs semantic search with configurable parameters.

##### `async searchWithFilter(query: string, filter: (metadata: Record<string, unknown>) => boolean): Promise<SearchResult<T>[]>`
Searches with metadata filtering for complex queries.

---

## 🎓 Advanced Usage Patterns

### Custom Object Search

```typescript
interface Document {
  id: string;
  title: string;
  content: string;
  category: string;
}

const search = new SemanticSearch<Document>(engine, {
  textExtractor: (doc) => `${doc.title} ${doc.content}`,
  metadataExtractor: (doc) => ({ category: doc.category }),
});

await search.index(documents);

const results = await search.searchWithFilter(
  "machine learning",
  (metadata) => metadata.category === 'AI'
);
```

### Clustering with Centroids

```typescript
import { centroid, cosineSimilarity } from '@crashbytes/semantic-text-toolkit';

const embeddings = await Promise.all(
  documents.map(doc => engine.embed(doc))
);

const clusterCenter = centroid(embeddings.map(r => r.embedding));

const distances = embeddings.map(result => 
  cosineSimilarity(result.embedding, clusterCenter)
);
```

---

## ⚡ Performance Optimization Framework

### 1. Latency-Critical Applications

When optimizing for response time:
- Pre-initialize models at application startup
- Implement request batching for concurrent operations
- Enable GPU acceleration in production environments
- Use connection pooling for API deployments

### 2. Memory-Constrained Environments

When managing resource limitations:
- Leverage quantized models (enabled by default)
- Clear search indexes when not actively in use
- Process data in smaller, manageable batches
- Consider model distillation for further reduction

### 3. High-Throughput Scenarios

When scaling for volume:
- Implement worker pool pattern for parallel processing
- Use message queues (RabbitMQ, Redis) for load distribution
- Deploy on GPU-enabled infrastructure for compute-intensive workloads
- Utilize approximate nearest neighbor (ANN) algorithms for large-scale search

### Performance Characteristics

**Single Embedding Generation:**
- CPU (Apple M1): ~30ms
- CPU (Intel i7): ~50ms
- GPU (CUDA): ~5ms

**Batch Processing (100 texts):**
- Sequential: ~3000ms
- Batched (size=32): ~800ms
- **Speedup**: 3.75x

**Memory Profile:**
- Model (quantized): ~23MB
- Base runtime: ~100MB
- Per 1000 embeddings: ~1.5MB

---

## 🔧 Configuration Examples

### Custom Model

```typescript
const engine = new SemanticEngine({
  modelName: 'Xenova/multilingual-e5-large',
  maxLength: 512,
  quantized: false
});
```

### Production Configuration

```typescript
const engine = new SemanticEngine({
  modelName: 'Xenova/all-MiniLM-L6-v2',
  quantized: true,
  onProgress: (progress) => {
    if (progress.status === 'downloading') {
      logger.info(`Model download: ${progress.progress}%`);
    }
  }
});
```

---

## 🧪 Code Quality Manifesto

When contributing to this project:
- **Self-documenting code** - Clear variable names, focused functions
- **Comprehensive test coverage** - Unit, integration, and E2E tests
- **Intentional design choices** - Document architectural decisions
- **Continuous refactoring** - Maintain code health proactively

---

## 📦 Building

```bash
npm run build
```

Generates:
- `dist/index.js` (CommonJS)
- `dist/index.mjs` (ES Modules)
- `dist/index.d.ts` (TypeScript definitions)

---

## 🤝 Contributing

Contributions welcome. When contributing:
- Maintain architectural consistency
- Add comprehensive tests
- Document public APIs
- Follow existing code style
- Update CHANGELOG.md

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🏢 About Blackhole Software, LLC

Specializing in custom web and software solutions:
- React, Astro, Next.js
- Node.js, C#
- React Native, SwiftUI, Kotlin
- AI/ML integration

**Visit us at [blackholesoftware.com](https://blackholesoftware.com)**

---

**Built with precision. Designed for production.**
