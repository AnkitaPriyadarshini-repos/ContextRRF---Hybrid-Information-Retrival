# Sublinear TF-IDF Vector Space Model in ContextRRF

## Overview
TF-IDF (Term Frequency-Inverse Document Frequency) represents documents as vectors in a high-dimensional term space. In **ContextRRF**, a sublinear TF-IDF backend serves as the vector space retrieval channel without requiring heavy external deep learning dependencies.

---

## Mathematical Formulation

### 1. Sublinear Term Frequency Scaling
Standard term frequency linearly scales with term repetition, causing long functions with repeated boilerplate variable names to skew vector lengths. ContextRRF employs sublinear term frequency:

$$\text{TF}_{\text{sublinear}}(t, d) = \begin{cases} 1 + \ln(\text{count}(t, d)) & \text{if } \text{count}(t, d) > 0 \\ 0 & \text{otherwise} \end{cases}$$

### 2. Inverse Document Frequency (IDF)
$$\text{IDF}(t, D) = \ln\left( \frac{1 + N}{1 + \text{df}(t)} \right) + 1$$

where $N$ is the total number of chunks in the indexed codebase, and $\text{df}(t)$ is the number of chunks containing term $t$.

### 3. Sparse Cosine Similarity
$$\text{CosineSim}(\vec{q}, \vec{d}) = \frac{\sum_{t \in q \cap d} \vec{q}_t \cdot \vec{d}_t}{\|\vec{q}\|_2 \|\vec{d}\|_2}$$

---

## Sparse Inverted Index Data Structure

To achieve sub-millisecond query execution over thousands of code chunks, ContextRRF builds an in-memory sparse inverted index mapping terms to chunk posting lists:

```python
inverted_index = {
    "payment": [(chunk_id_1, tfidf_weight_1), (chunk_id_2, tfidf_weight_2)],
    "credit_card": [(chunk_id_1, tfidf_weight_3)],
}
```

---

## Comparison with Dense Embeddings

| Metric | Sublinear TF-IDF | Dense Embeddings (e.g. OpenAI/Bert) |
| :--- | :--- | :--- |
| **Indexing Latency** | $< 0.5$ ms per file | $100 - 500$ ms per file |
| **Hardware Requirement** | CPU only (zero GPU / native C dependencies) | Heavy (GPU / PyTorch / ONNX) |
| **Exact Keyword Matching** | $100\%$ precision | Often suffers from semantic hallucination |
| **Semantic Generalization**| Moderate (depends on IDF vocabulary overlap) | High |
