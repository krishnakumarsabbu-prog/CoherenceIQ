from __future__ import annotations
import math
import re
from typing import List, Dict, Set, Tuple, Any
import numpy as np

class SimilarityEngine:
    """Computes rule similarity using TF-IDF, Cosine, Jaccard, and MinHash/LSH."""

    def __init__(self, num_hashes: int = 64, num_bands: int = 16) -> None:
        self.num_hashes = num_hashes
        self.num_bands = num_bands
        self.rows_per_band = num_hashes // num_bands
        # Deterministic linear hash parameters for MinHash: h(x) = (a*x + b) % prime
        self.prime = 4294967291  # Largest prime under 2^32
        # Generate stable parameters
        self.hash_params = [
            ((i * 17 + 13) % 50000 + 1, (i * 31 + 7) % 50000 + 1)
            for i in range(num_hashes)
        ]

    def tokenize(self, text: str) -> List[str]:
        # Min 2 chars so domain-critical terms like 'ip', 'id', 'km', 'asn' are captured
        return sorted(list(set(re.findall(r'\b[a-z]{2,}\b', text.lower()))))

    def compute_jaccard(self, set_a: Set[str], set_b: Set[str]) -> float:
        union_size = len(set_a.union(set_b))
        if union_size == 0:
            return 0.0
        return len(set_a.intersection(set_b)) / union_size

    def compute_tfidf_and_cosine(self, docs: List[str]) -> np.ndarray:
        """Computes TF-IDF vectors and pairwise cosine similarity matrix using NumPy."""
        if not docs:
            return np.zeros((0, 0))
            
        # 1. Build Vocabulary
        tokenized_docs = [self.tokenize(d) for d in docs]
        vocab = sorted(list(set(token for doc in tokenized_docs for token in doc)))
        if not vocab:
            return np.zeros((len(docs), len(docs)))
            
        vocab_idx = {token: i for i, token in enumerate(vocab)}
        num_docs = len(docs)
        num_terms = len(vocab)
        
        # 2. Compute TF
        tf = np.zeros((num_docs, num_terms))
        for doc_id, tokens in enumerate(tokenized_docs):
            for token in tokens:
                tf[doc_id, vocab_idx[token]] += 1
                
        # 3. Compute IDF
        doc_counts = np.sum(tf > 0, axis=0)
        idf = np.log((num_docs + 1) / (doc_counts + 1)) + 1  # smoothed idf
        
        # 4. Compute TF-IDF
        tfidf = tf * idf
        
        # 5. Normalize TF-IDF vectors (L2 normalization)
        norms = np.linalg.norm(tfidf, axis=1, keepdims=True)
        norms[norms == 0] = 1e-9  # Avoid division by zero
        normalized_tfidf = tfidf / norms
        
        # 6. Pairwise Cosine Similarity
        cosine_matrix = np.dot(normalized_tfidf, normalized_tfidf.T)
        return cosine_matrix

    def _string_hash(self, word: str) -> int:
        """Stable rolling hash for strings."""
        h = 0
        for char in word:
            h = (h * 33 + ord(char)) & 0xffffffff
        return h

    def compute_minhash_signature(self, tokens: Set[str]) -> List[int]:
        """Generates a MinHash signature for a set of tokens."""
        if not tokens:
            return [self.prime] * self.num_hashes
            
        hashed_tokens = [self._string_hash(t) for t in tokens]
        signature = []
        for a, b in self.hash_params:
            min_val = self.prime
            for token_hash in hashed_tokens:
                val = (a * token_hash + b) % self.prime
                if val < min_val:
                    min_val = val
            signature.append(min_val)
        return signature

    def compute_lsh_candidates(self, signatures: Dict[str, List[int]]) -> List[Tuple[str, str]]:
        """Groups signatures into bands and returns candidate pairs of similar rules."""
        buckets: List[Dict[Tuple[int, ...], List[str]]] = [{} for _ in range(self.num_bands)]
        
        for doc_id, sig in signatures.items():
            for b in range(self.num_bands):
                start = b * self.rows_per_band
                end = start + self.rows_per_band
                band_part = tuple(sig[start:end])
                if band_part not in buckets[b]:
                    buckets[b][band_part] = []
                buckets[b][band_part].append(doc_id)
                
        candidates = set()
        for b in range(self.num_bands):
            for cluster in buckets[b].values():
                if len(cluster) > 1:
                    for i in range(len(cluster)):
                        for j in range(i + 1, len(cluster)):
                            pair = tuple(sorted([cluster[i], cluster[j]]))
                            candidates.add(pair)
                            
        return list(candidates)
