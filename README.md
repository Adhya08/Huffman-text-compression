# HuffZip — Interactive Huffman Compression & Tree Visualizer

An interactive, client-side lossless text compression studio and binary tree visualizer built on classic Computer Science data structures (Min-Priority Heap and Binary Prefix Trees).

🔗 **Live Demo:** [https://adhya08.github.io/Huffman-text-compression/](https://adhya08.github.io/Huffman-text-compression/)

---

## ✨ Features

- **Interactive SVG Binary Tree:** Dynamic vector visualization with zoom, pan, and interactive path spotlighting from root to leaf.
- **Bitstream Inspector:** Inspect compressed binary sequences in three different modes:
  - **Grouped Bytes:** 8-bit octets with byte index offsets.
  - **Tokenized Stream:** Per-character interactive pills.
  - **Continuous Stream:** Raw binary sequence.
- **Real-Time Information Theory Metrics:**
  - Original vs Encoded size (bits & bytes)
  - Space savings percentage
  - Shannon Entropy ($H(X)$)
  - Average Huffman Code Length ($L$)
  - Compression Factor ($1.8\times - 3.5\times$)
- **Interactive Codebook & Frequency Table:** Search, sort by frequency or code length, and export dictionary mapping to JSON.
- **File Upload & Drag-and-Drop:** Compress `.txt`, `.json`, `.csv`, `.md` directly.
- **Round-Trip Lossless Verification:** Decompress on the fly to mathematically prove zero data loss.
- **Theme Support:** Dark & Light modes with persistent `localStorage` preference.

---

## 🛠️ Data Structures & Complexity

| Component | Data Structure | Time Complexity | Space Complexity |
| :--- | :--- | :--- | :--- |
| Frequency Analysis | Hash Map | $O(N)$ | $O(K)$ |
| Priority Queue | Binary Min-Heap | $O(K \log K)$ | $O(K)$ |
| Tree Construction | Binary Tree | $O(K \log K)$ | $O(K)$ |
| Decoding | Tree Traversal | $O(B)$ bits | $O(1)$ |

*(Where $N$ is text length, $K$ is unique symbols, $B$ is encoded bit length).*

---

## 🚀 Deployment

Built using pure HTML5, CSS3, and modern vanilla ES6 JavaScript. No frameworks, build steps, or external dependencies required.
