/**
 * HuffZip — Lossless Huffman Compression & Interactive Tree Visualizer
 * Client-side Data Structure & Algorithm Engine
 */

"use strict";

/* ==========================================================================
   1. Data Structures: Huffman Node & Deterministic Min Heap
   ========================================================================== */

class HuffmanNode {
  constructor(character, frequency, left = null, right = null) {
    this.character = character;
    this.frequency = frequency;
    this.left = left;
    this.right = right;
    this.order = 0; // Insertion sequence for deterministic tie-breaking
    this.code = "";
  }

  isLeaf() {
    return this.left === null && this.right === null;
  }
}

class MinHeap {
  constructor() {
    this.heap = [];
    this.sequence = 0;
  }

  size() {
    return this.heap.length;
  }

  isSmaller(a, b) {
    if (a.frequency !== b.frequency) {
      return a.frequency < b.frequency;
    }
    return a.order < b.order;
  }

  insert(node) {
    node.order = this.sequence++;
    this.heap.push(node);
    this.heapifyUp(this.heap.length - 1);
  }

  heapifyUp(index) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (!this.isSmaller(this.heap[index], this.heap[parent])) break;
      [this.heap[index], this.heap[parent]] = [this.heap[parent], this.heap[index]];
      index = parent;
    }
  }

  extractMin() {
    if (!this.heap.length) return null;
    const minNode = this.heap[0];
    const lastNode = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = lastNode;
      this.heapifyDown(0);
    }
    return minNode;
  }

  heapifyDown(index) {
    while (true) {
      let smallest = index;
      const left = 2 * index + 1;
      const right = 2 * index + 2;

      if (left < this.heap.length && this.isSmaller(this.heap[left], this.heap[smallest])) {
        smallest = left;
      }
      if (right < this.heap.length && this.isSmaller(this.heap[right], this.heap[smallest])) {
        smallest = right;
      }
      if (smallest === index) break;

      [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
      index = smallest;
    }
  }
}

/* ==========================================================================
   2. Huffman Core Algorithms
   ========================================================================== */

function calculateFrequency(text) {
  const freqMap = new Map();
  for (const char of text) {
    freqMap.set(char, (freqMap.get(char) || 0) + 1);
  }
  return freqMap;
}

function buildHuffmanTree(freqMap) {
  if (freqMap.size === 0) return null;

  const heap = new MinHeap();
  for (const [char, count] of freqMap) {
    heap.insert(new HuffmanNode(char, count));
  }

  // Handle single unique character edge case: wrap in an internal parent
  if (heap.size() === 1) {
    const singleNode = heap.extractMin();
    const parent = new HuffmanNode(null, singleNode.frequency, singleNode, null);
    return parent;
  }

  while (heap.size() > 1) {
    const left = heap.extractMin();
    const right = heap.extractMin();
    const parent = new HuffmanNode(null, left.frequency + right.frequency, left, right);
    heap.insert(parent);
  }

  return heap.extractMin();
}

function generatePrefixCodes(root) {
  const codes = new Map();
  if (!root) return codes;

  // Single-character root (where right is null)
  if (root.isLeaf()) {
    codes.set(root.character, "0");
    root.code = "0";
    return codes;
  }

  function traverse(node, currentCode) {
    if (!node) return;
    node.code = currentCode;

    if (node.isLeaf()) {
      codes.set(node.character, currentCode || "0");
      return;
    }
    traverse(node.left, currentCode + "0");
    traverse(node.right, currentCode + "1");
  }

  traverse(root, "");
  return codes;
}

function encodeText(text, codes) {
  let bitString = "";
  for (const char of text) {
    const code = codes.get(char);
    if (code === undefined) {
      throw new Error(`Symbol '${char}' is missing from codebook.`);
    }
    bitString += code;
  }
  return bitString;
}

function decodeText(bits, root) {
  if (!root) throw new Error("Huffman tree is empty.");
  if (!/^[01]*$/.test(bits)) throw new Error("Encoded bitstream must contain only '0' and '1'.");

  // Single character tree
  if (root.isLeaf() || (root.left && root.left.isLeaf() && !root.right)) {
    const leaf = root.isLeaf() ? root : root.left;
    return leaf.character.repeat(bits.length);
  }

  let decoded = "";
  let current = root;

  for (let i = 0; i < bits.length; i++) {
    const bit = bits[i];
    current = bit === "0" ? current.left : current.right;
    if (!current) {
      throw new Error(`Invalid prefix path at bit offset ${i}.`);
    }
    if (current.isLeaf()) {
      decoded += current.character;
      current = root;
    }
  }

  if (current !== root) {
    throw new Error("Truncated or incomplete bitstream: does not terminate on a leaf node.");
  }

  return decoded;
}

/* ==========================================================================
   3. Application State & Global References
   ========================================================================== */

const state = {
  originalText: "",
  encodedBits: "",
  decodedText: "",
  huffmanRoot: null,
  huffmanCodes: new Map(),
  frequencyMap: new Map(),
  viewMode: "grouped", // 'grouped' | 'tokens' | 'raw'
  sortField: "freq",
  sortAscending: false,
  searchTerm: "",
  zoomLevel: 1,
  panX: 0,
  panY: 0,
  isPanning: false,
  startX: 0,
  startY: 0,
  activeHighlightChar: null,
  treeLayoutData: null
};

const encoder = new TextEncoder();

// DOM Element Selectors
const inputEl = document.getElementById("inputText");
const compressBtn = document.getElementById("compressBtn");
const decodeBtn = document.getElementById("decodeBtn");
const clearBtn = document.getElementById("clearBtn");
const copyBtn = document.getElementById("copyBtn");
const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("dropZone");
const downloadBitsBtn = document.getElementById("downloadBitsBtn");
const exportCodebookBtn = document.getElementById("exportCodebookBtn");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const tableSearch = document.getElementById("tableSearch");

const bitstreamView = document.getElementById("bitstreamView");
const emptyOutput = document.getElementById("emptyOutput");
const treeSvg = document.getElementById("treeSvg");
const emptyTreeState = document.getElementById("emptyTreeState");
const treeViewport = document.getElementById("treeViewport");
const treeSpotlight = document.getElementById("treeSpotlight");

/* ==========================================================================
   4. Preset Sample Texts
   ========================================================================== */

const SAMPLE_TEXTS = {
  pangram: "The quick brown fox jumps over the lazy dog.",
  repetitive: "TO BE OR NOT TO BE THAT IS THE QUESTION. ABRACADABRA MISSISSIPPI RIVER!",
  code: `function huffman(str) {\n  const freq = new Map();\n  for (const c of str) freq.set(c, (freq.get(c) || 0) + 1);\n  return freq;\n}`,
  dna: "ATGCGATCGATCGATCGATCGATCGATCGAACGTACGTTAGC",
  quote: "All the world's a stage, and all the men and women merely players: they have their exits and their entrances."
};

/* ==========================================================================
   5. UI Rendering & Interactions
   ========================================================================== */

// Toast notification helper
function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

// Format human-readable character labels
function formatCharDisplay(char) {
  if (char === " ") return { display: "␣", label: "Space", raw: char };
  if (char === "\n") return { display: "↵", label: "Newline", raw: char };
  if (char === "\t") return { display: "⇥", label: "Tab", raw: char };
  if (char === "\r") return { display: "␍", label: "CR", raw: char };
  return { display: char, label: "", raw: char };
}

// Update input length metadata
function updateInputMeta() {
  const text = inputEl.value;
  const utf8Bytes = encoder.encode(text).length;
  const bits = utf8Bytes * 8;
  const charCount = Array.from(text).length;

  document.getElementById("charCount").textContent = `${charCount} chars`;
  document.getElementById("byteCount").textContent = `${utf8Bytes} bytes (UTF-8)`;
  document.getElementById("inputBitsCount").textContent = `${bits} bits`;
}

// Compute & update metrics (Shannon Entropy, Space Savings, Ratio)
function updateAnalytics(originalText, encodedBits, freqMap, codes) {
  const totalChars = Array.from(originalText).length;
  const originalBits = encoder.encode(originalText).length * 8;
  const compressedBits = encodedBits.length;
  const savedBits = Math.max(0, originalBits - compressedBits);
  const savingPercent = originalBits > 0 ? (savedBits / originalBits) * 100 : 0;
  const factor = compressedBits > 0 ? (originalBits / compressedBits).toFixed(2) : "1.00";

  // Calculate Shannon Entropy: H(X) = - Σ p * log2(p)
  let entropy = 0;
  let avgCodeLen = 0;
  if (totalChars > 0) {
    for (const [char, count] of freqMap) {
      const p = count / totalChars;
      entropy -= p * Math.log2(p);
      const codeLen = codes.get(char) ? codes.get(char).length : 0;
      avgCodeLen += p * codeLen;
    }
  }

  // Update DOM Metric Numbers
  document.getElementById("metricOriginalBits").textContent = originalBits.toLocaleString();
  document.getElementById("metricOriginalBytes").textContent = `${Math.ceil(originalBits / 8)} bytes (UTF-8 payload)`;

  document.getElementById("metricCompressedBits").textContent = compressedBits.toLocaleString();
  document.getElementById("metricCompressedBytes").textContent = `${(compressedBits / 8).toFixed(2)} bytes equivalent`;

  document.getElementById("metricSavings").textContent = savingPercent.toFixed(2);
  document.getElementById("metricBitsSaved").textContent = `${savedBits.toLocaleString()} bits eliminated`;

  const savingPill = document.getElementById("savingPill");
  savingPill.textContent = `${savingPercent.toFixed(1)}%`;
  savingPill.className = savingPercent > 0 ? "metric-pill pill-green" : "metric-pill";

  document.getElementById("metricEntropy").textContent = entropy.toFixed(2);
  document.getElementById("metricAvgLength").textContent = `Avg code length: ${avgCodeLen.toFixed(2)} bits`;

  document.getElementById("compressionFactor").textContent = `${factor}x`;

  // Update Visual Bar Comparison
  const originalBarFill = document.getElementById("originalBarFill");
  const compressedBarFill = document.getElementById("compressedBarFill");
  const compressedBarLabel = document.getElementById("compressedBarLabel");

  originalBarFill.style.width = "100%";
  const ratioWidth = originalBits > 0 ? Math.min(100, (compressedBits / originalBits) * 100) : 0;
  compressedBarFill.style.width = `${ratioWidth.toFixed(1)}%`;
  compressedBarLabel.textContent = `${ratioWidth.toFixed(1)}% of original`;

  // Output card footer meta
  document.getElementById("outputBitsCount").textContent = `${compressedBits.toLocaleString()} bits generated`;
  document.getElementById("outputBytesCount").textContent = `${(compressedBits / 8).toFixed(2)} bytes`;
}

// Render the bitstream in various inspectable views
function renderBitstream() {
  const bits = state.encodedBits;
  if (!bits || !bits.length) {
    emptyOutput.style.display = "flex";
    bitstreamView.style.display = "none";
    return;
  }

  emptyOutput.style.display = "none";
  bitstreamView.style.display = "block";
  bitstreamView.className = `bitstream-view mode-${state.viewMode}`;
  bitstreamView.replaceChildren();

  if (state.viewMode === "grouped") {
    // 8-bit byte octets
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < bits.length; i += 8) {
      const chunk = bits.slice(i, i + 8);
      const byteDiv = document.createElement("div");
      byteDiv.className = "byte-chunk";
      byteDiv.title = `Byte ${Math.floor(i / 8)}: offset ${i} - ${i + chunk.length - 1}`;

      const idxSpan = document.createElement("span");
      idxSpan.className = "byte-idx";
      idxSpan.textContent = `[${Math.floor(i / 8)}]`;

      const codeSpan = document.createElement("span");
      codeSpan.textContent = chunk;

      byteDiv.append(idxSpan, codeSpan);
      fragment.appendChild(byteDiv);
    }
    bitstreamView.appendChild(fragment);
  } else if (state.viewMode === "tokens") {
    // Character by character tokens
    const fragment = document.createDocumentFragment();
    for (const char of state.originalText) {
      const code = state.huffmanCodes.get(char) || "";
      const pill = document.createElement("div");
      pill.className = "token-pill";
      pill.dataset.char = char;

      const charInfo = formatCharDisplay(char);
      pill.title = `Character: '${charInfo.label || charInfo.display}' | Code: ${code} (${code.length} bits)`;

      const charSpan = document.createElement("span");
      charSpan.className = "token-char";
      charSpan.textContent = charInfo.display;

      const codeSpan = document.createElement("span");
      codeSpan.className = "token-code";
      codeSpan.textContent = code;

      pill.append(charSpan, codeSpan);

      pill.addEventListener("mouseenter", () => highlightNodePath(char));
      pill.addEventListener("mouseleave", () => resetNodeHighlight());

      fragment.appendChild(pill);
    }
    bitstreamView.appendChild(fragment);
  } else {
    // Continuous raw string
    bitstreamView.textContent = bits;
  }
}

// Render the codebook & frequency table
function renderCodebookTable() {
  const tbody = document.getElementById("frequencyTableBody");
  tbody.replaceChildren();

  const totalChars = Array.from(state.originalText).length;
  if (totalChars === 0 || state.frequencyMap.size === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = '<td colspan="6" class="empty-table-cell">No text compressed yet. Enter text above to generate codebook.</td>';
    tbody.appendChild(tr);
    document.getElementById("tableTotalCount").textContent = "0 unique symbols";
    return;
  }

  let entries = Array.from(state.frequencyMap.entries()).map(([char, count]) => {
    const code = state.huffmanCodes.get(char) || "";
    const prob = (count / totalChars) * 100;
    return {
      char,
      count,
      prob,
      code,
      codeLength: code.length
    };
  });

  // Apply search filter if active
  if (state.searchTerm.trim() !== "") {
    const query = state.searchTerm.toLowerCase();
    entries = entries.filter(e => {
      const charInfo = formatCharDisplay(e.char);
      return (
        e.char.toLowerCase().includes(query) ||
        charInfo.label.toLowerCase().includes(query) ||
        e.code.includes(query)
      );
    });
  }

  // Sort entries
  entries.sort((a, b) => {
    let cmp = 0;
    if (state.sortField === "char") {
      cmp = a.char.localeCompare(b.char);
    } else if (state.sortField === "freq") {
      cmp = a.count - b.count;
    } else if (state.sortField === "len") {
      cmp = a.codeLength - b.codeLength;
    }
    return state.sortAscending ? cmp : -cmp;
  });

  document.getElementById("tableTotalCount").textContent = `${state.frequencyMap.size} unique symbols`;

  const fragment = document.createDocumentFragment();
  for (const entry of entries) {
    const tr = document.createElement("tr");
    tr.dataset.char = entry.char;

    // Character column
    const charTd = document.createElement("td");
    const charInfo = formatCharDisplay(entry.char);
    const badge = document.createElement("span");
    badge.className = "char-badge";
    badge.textContent = charInfo.display;
    charTd.appendChild(badge);
    if (charInfo.label) {
      const labelSpan = document.createElement("span");
      labelSpan.className = "char-escape-label";
      labelSpan.textContent = charInfo.label;
      charTd.appendChild(labelSpan);
    }

    // Frequency column
    const freqTd = document.createElement("td");
    freqTd.textContent = entry.count.toLocaleString();

    // Probability column
    const probTd = document.createElement("td");
    const probWrap = document.createElement("div");
    probWrap.className = "prob-cell";
    const probText = document.createElement("span");
    probText.textContent = `${entry.prob.toFixed(1)}%`;
    const probBar = document.createElement("div");
    probBar.className = "prob-bar";
    const probFill = document.createElement("div");
    probFill.className = "prob-fill";
    probFill.style.width = `${Math.min(100, entry.prob)}%`;
    probBar.appendChild(probFill);
    probWrap.append(probText, probBar);
    probTd.appendChild(probWrap);

    // Code length
    const lenTd = document.createElement("td");
    lenTd.textContent = `${entry.codeLength} bits`;

    // Huffman code
    const codeTd = document.createElement("td");
    const codeSpan = document.createElement("span");
    codeSpan.className = "code-badge";
    codeSpan.textContent = entry.code;
    codeTd.appendChild(codeSpan);

    // Standard vs Huffman savings
    const comparisonTd = document.createElement("td");
    const savingPerChar = ((8 - entry.codeLength) / 8) * 100;
    const savingSpan = document.createElement("span");
    savingSpan.style.fontFamily = "var(--font-mono)";
    savingSpan.style.fontSize = "0.78rem";
    if (savingPerChar > 0) {
      savingSpan.style.color = "var(--accent-emerald)";
      savingSpan.textContent = `8b → ${entry.codeLength}b (-${savingPerChar.toFixed(0)}%)`;
    } else if (savingPerChar < 0) {
      savingSpan.style.color = "var(--accent-amber)";
      savingSpan.textContent = `8b → ${entry.codeLength}b (+${Math.abs(savingPerChar).toFixed(0)}%)`;
    } else {
      savingSpan.style.color = "var(--text-muted)";
      savingSpan.textContent = `8b → 8b (0%)`;
    }
    comparisonTd.appendChild(savingSpan);

    tr.append(charTd, freqTd, probTd, lenTd, codeTd, comparisonTd);

    // Interactive row hover highlights tree node
    tr.addEventListener("mouseenter", () => highlightNodePath(entry.char));
    tr.addEventListener("mouseleave", () => resetNodeHighlight());

    fragment.appendChild(tr);
  }

  tbody.appendChild(fragment);
}

/* ==========================================================================
   6. High-Performance SVG Huffman Tree Layout & Rendering
   ========================================================================== */

function computeTreeLayout(root) {
  if (!root) return null;

  // Single-node tree
  if (root.isLeaf()) {
    const node = {
      id: 0,
      char: root.character,
      freq: root.frequency,
      isLeaf: true,
      code: "0",
      x: 300,
      y: 90
    };
    return {
      nodes: [node],
      edges: [],
      width: 600,
      height: 220,
      minX: 200,
      minY: 40,
      maxX: 400,
      maxY: 180
    };
  }

  let leafIndex = 0;
  const leafSpacing = 82; // Horizontal spacing between leaves
  const levelHeight = 90; // Vertical distance per level
  const nodes = [];
  const edges = [];
  let nextId = 0;

  function traverse(node, depth, code) {
    node.id = nextId++;
    node.depth = depth;
    node.code = code;

    if (node.isLeaf()) {
      node.x = (leafIndex + 0.5) * leafSpacing;
      node.y = 60 + depth * levelHeight;
      leafIndex++;

      const leafData = {
        id: node.id,
        char: node.character,
        freq: node.frequency,
        isLeaf: true,
        code: code,
        x: node.x,
        y: node.y
      };
      nodes.push(leafData);
      return leafData;
    }

    // Traverse left and right children
    const leftData = node.left ? traverse(node.left, depth + 1, code + "0") : null;
    const rightData = node.right ? traverse(node.right, depth + 1, code + "1") : null;

    if (leftData && rightData) {
      node.x = (leftData.x + rightData.x) / 2;
    } else if (leftData) {
      node.x = leftData.x;
    } else if (rightData) {
      node.x = rightData.x;
    } else {
      node.x = (leafIndex + 0.5) * leafSpacing;
    }

    node.y = 60 + depth * levelHeight;

    const internalData = {
      id: node.id,
      char: null,
      freq: node.frequency,
      isLeaf: false,
      code: code,
      x: node.x,
      y: node.y
    };
    nodes.push(internalData);

    if (leftData) {
      edges.push({
        fromId: node.id,
        toId: leftData.id,
        x1: node.x,
        y1: node.y,
        x2: leftData.x,
        y2: leftData.y,
        bit: "0",
        targetChar: leftData.isLeaf ? leftData.char : null
      });
    }

    if (rightData) {
      edges.push({
        fromId: node.id,
        toId: rightData.id,
        x1: node.x,
        y1: node.y,
        x2: rightData.x,
        y2: rightData.y,
        bit: "1",
        targetChar: rightData.isLeaf ? rightData.char : null
      });
    }

    return internalData;
  }

  traverse(root, 0, "");

  const totalWidth = Math.max(650, leafIndex * leafSpacing + 100);
  const maxDepthY = Math.max(...nodes.map(n => n.y)) + 90;

  return {
    nodes,
    edges,
    width: totalWidth,
    height: maxDepthY
  };
}

function renderTreeSvg() {
  if (!state.huffmanRoot) {
    emptyTreeState.style.display = "flex";
    treeSvg.style.display = "none";
    return;
  }

  emptyTreeState.style.display = "none";
  treeSvg.style.display = "block";

  const layout = computeTreeLayout(state.huffmanRoot);
  state.treeLayoutData = layout;

  if (!layout) return;

  treeSvg.replaceChildren();

  // Root SVG Canvas Group for Zoom/Pan
  const svgGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  svgGroup.id = "treeSvgGroup";
  treeSvg.appendChild(svgGroup);

  // Set initial viewBox
  treeSvg.setAttribute("viewBox", `0 0 ${layout.width} ${layout.height}`);

  // 1. Render Edges with Cubic Bézier Curves & Branch Badges
  for (const edge of layout.edges) {
    const edgeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    edgeGroup.dataset.edgeFrom = edge.fromId;
    edgeGroup.dataset.edgeTo = edge.toId;

    // Cubic Bézier curve connector
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const midY = (edge.y1 + edge.y2) / 2;
    const d = `M ${edge.x1} ${edge.y1} C ${edge.x1} ${midY}, ${edge.x2} ${midY}, ${edge.x2} ${edge.y2}`;
    path.setAttribute("d", d);
    path.setAttribute("class", "svg-edge");
    path.id = `edge-${edge.fromId}-${edge.toId}`;
    edgeGroup.appendChild(path);

    // Branch Label (0 or 1) Badge
    const labelX = (edge.x1 + edge.x2) / 2;
    const labelY = (edge.y1 + edge.y2) / 2;

    const labelBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    labelBg.setAttribute("x", labelX - 9);
    labelBg.setAttribute("y", labelY - 9);
    labelBg.setAttribute("width", 18);
    labelBg.setAttribute("height", 18);
    labelBg.setAttribute("class", "svg-edge-label-bg");

    const labelText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    labelText.setAttribute("x", labelX);
    labelText.setAttribute("y", labelY);
    labelText.setAttribute("class", `svg-edge-label-text bit-${edge.bit}`);
    labelText.textContent = edge.bit;

    edgeGroup.append(labelBg, labelText);
    svgGroup.appendChild(edgeGroup);
  }

  // 2. Render Nodes
  for (const node of layout.nodes) {
    const nodeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    nodeGroup.setAttribute("class", `svg-node ${node.isLeaf ? "leaf" : "internal"}`);
    nodeGroup.dataset.nodeId = node.id;
    if (node.isLeaf) {
      nodeGroup.dataset.char = node.char;
      nodeGroup.dataset.code = node.code;
    }

    if (node.isLeaf) {
      // Leaf Node (Pill card with symbol and frequency)
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      const width = 56;
      const height = 44;
      rect.setAttribute("x", node.x - width / 2);
      rect.setAttribute("y", node.y - height / 2);
      rect.setAttribute("width", width);
      rect.setAttribute("height", height);
      rect.setAttribute("class", "svg-node-leaf-rect");

      const charInfo = formatCharDisplay(node.char);
      const charText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      charText.setAttribute("x", node.x);
      charText.setAttribute("y", node.y - 6);
      charText.setAttribute("class", "svg-node-text-char");
      charText.textContent = charInfo.display;

      const freqText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      freqText.setAttribute("x", node.x);
      freqText.setAttribute("y", node.y + 11);
      freqText.setAttribute("class", "svg-node-text-freq");
      freqText.textContent = `${node.freq}`;

      nodeGroup.append(rect, charText, freqText);

      // Node interaction
      nodeGroup.addEventListener("mouseenter", () => highlightNodePath(node.char));
      nodeGroup.addEventListener("mouseleave", () => resetNodeHighlight());
      nodeGroup.addEventListener("click", () => highlightNodePath(node.char, true));
    } else {
      // Internal Node (Circle with sum frequency)
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", node.x);
      circle.setAttribute("cy", node.y);
      circle.setAttribute("r", 20);
      circle.setAttribute("class", "svg-node-internal-circle");

      const sumText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      sumText.setAttribute("x", node.x);
      sumText.setAttribute("y", node.y);
      sumText.setAttribute("class", "svg-node-text-internal");
      sumText.textContent = node.freq;

      nodeGroup.append(circle, sumText);
    }

    svgGroup.appendChild(nodeGroup);
  }

  fitTreeToViewport();
}

// Spotlight & Highlight path from root to character node
function highlightNodePath(char, lock = false) {
  if (!state.huffmanCodes.has(char)) return;

  state.activeHighlightChar = char;
  const code = state.huffmanCodes.get(char);
  const charInfo = formatCharDisplay(char);
  const freq = state.frequencyMap.get(char);

  // Update Tree Spotlight Banner
  const pathSteps = code.split("").join(" → ");
  treeSpotlight.innerHTML = `
    <div class="spotlight-active">
      <span class="spotlight-char">${charInfo.label || charInfo.display}</span>
      <span class="spotlight-path">Branch Path: <strong>Root → ${pathSteps || "Direct"}</strong></span>
      <span class="spotlight-code">Binary Code: <code>${code}</code> (${code.length} bits)</span>
      <span class="spotlight-note">Frequency: ${freq}</span>
    </div>
  `;

  // Highlight SVG elements
  document.querySelectorAll(".svg-node").forEach(node => {
    if (node.dataset.char === char) {
      node.classList.add("highlighted");
    } else {
      node.classList.remove("highlighted");
    }
  });

  // Highlight branch edges
  if (state.treeLayoutData) {
    const layout = state.treeLayoutData;
    // Trace through code
    let currentNodeId = layout.nodes.find(n => n.depth === 0)?.id;
    const highlightedEdgeIds = new Set();

    let prefix = "";
    for (const bit of code) {
      prefix += bit;
      const edge = layout.edges.find(e => e.fromId === currentNodeId && e.bit === bit);
      if (edge) {
        highlightedEdgeIds.add(`edge-${edge.fromId}-${edge.toId}`);
        currentNodeId = edge.toId;
      }
    }

    document.querySelectorAll(".svg-edge").forEach(edgeEl => {
      if (highlightedEdgeIds.has(edgeEl.id)) {
        edgeEl.classList.add("highlighted");
      } else {
        edgeEl.classList.remove("highlighted");
      }
    });
  }

  // Highlight table row
  document.querySelectorAll("#frequencyTableBody tr").forEach(tr => {
    if (tr.dataset.char === char) {
      tr.style.backgroundColor = "var(--bg-hover)";
    } else {
      tr.style.backgroundColor = "";
    }
  });
}

function resetNodeHighlight() {
  state.activeHighlightChar = null;
  treeSpotlight.innerHTML = '<span class="spotlight-prompt">Click or hover any character node below to trace its binary prefix path from root.</span>';

  document.querySelectorAll(".svg-node").forEach(n => n.classList.remove("highlighted"));
  document.querySelectorAll(".svg-edge").forEach(e => e.classList.remove("highlighted"));
  document.querySelectorAll("#frequencyTableBody tr").forEach(tr => {
    tr.style.backgroundColor = "";
  });
}

// Fit SVG tree to current viewport bounding box
function fitTreeToViewport() {
  if (!state.treeLayoutData) return;
  const layout = state.treeLayoutData;
  const viewportRect = treeViewport.getBoundingClientRect();
  const scale = Math.min(
    (viewportRect.width - 40) / layout.width,
    (viewportRect.height - 40) / layout.height,
    1.2
  );

  state.zoomLevel = Math.max(0.4, scale);
  state.panX = (viewportRect.width - layout.width * state.zoomLevel) / 2;
  state.panY = 20;

  applyTreeTransform();
}

function applyTreeTransform() {
  const group = document.getElementById("treeSvgGroup");
  if (group) {
    group.setAttribute("transform", `translate(${state.panX}, ${state.panY}) scale(${state.zoomLevel})`);
  }
}

/* ==========================================================================
   7. Pan & Zoom Handlers for Tree Viewport
   ========================================================================== */

treeViewport.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return; // Only left click
  state.isPanning = true;
  state.startX = e.clientX - state.panX;
  state.startY = e.clientY - state.panY;
});

window.addEventListener("mousemove", (e) => {
  if (!state.isPanning) return;
  state.panX = e.clientX - state.startX;
  state.panY = e.clientY - state.startY;
  applyTreeTransform();
});

window.addEventListener("mouseup", () => {
  state.isPanning = false;
});

treeViewport.addEventListener("wheel", (e) => {
  e.preventDefault();
  const zoomFactor = e.deltaY < 0 ? 1.15 : 0.88;
  const newZoom = Math.max(0.2, Math.min(3.5, state.zoomLevel * zoomFactor));

  // Zoom centered on cursor
  const rect = treeViewport.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  state.panX = mouseX - (mouseX - state.panX) * (newZoom / state.zoomLevel);
  state.panY = mouseY - (mouseY - state.panY) * (newZoom / state.zoomLevel);
  state.zoomLevel = newZoom;

  applyTreeTransform();
}, { passive: false });

document.getElementById("zoomInBtn").addEventListener("click", () => {
  state.zoomLevel = Math.min(3.5, state.zoomLevel * 1.25);
  applyTreeTransform();
});

document.getElementById("zoomOutBtn").addEventListener("click", () => {
  state.zoomLevel = Math.max(0.2, state.zoomLevel * 0.8);
  applyTreeTransform();
});

document.getElementById("resetZoomBtn").addEventListener("click", () => {
  fitTreeToViewport();
});

/* ==========================================================================
   8. Core Operations: Compress & Decompress
   ========================================================================== */

function compress() {
  const text = inputEl.value;
  if (!text || text.length === 0) {
    showToast("Please enter or paste text to compress.", "error");
    inputEl.focus();
    return;
  }

  try {
    state.originalText = text;
    state.frequencyMap = calculateFrequency(text);
    state.huffmanRoot = buildHuffmanTree(state.frequencyMap);
    state.huffmanCodes = generatePrefixCodes(state.huffmanRoot);
    state.encodedBits = encodeText(text, state.huffmanCodes);

    // Update bitstream view
    renderBitstream();

    // Update analytics
    updateAnalytics(text, state.encodedBits, state.frequencyMap, state.huffmanCodes);

    // Render tree and codebook
    renderTreeSvg();
    renderCodebookTable();

    // Reset verification panel state
    const badge = document.getElementById("verificationBadge");
    badge.className = "verification-status-badge";
    document.getElementById("verificationStatusText").textContent = "Awaiting decompression test";
    document.getElementById("decodedTextDisplay").innerHTML = '<span class="text-placeholder">Click "Decode &amp; Verify" to reconstruct the original text.</span>';

    showToast("Compression complete!", "success");
  } catch (err) {
    console.error(err);
    showToast(err.message, "error");
  }
}

function decompress() {
  if (!state.huffmanRoot || !state.encodedBits) {
    showToast("Compress text first before decoding.", "error");
    return;
  }

  try {
    const decoded = decodeText(state.encodedBits, state.huffmanRoot);
    state.decodedText = decoded;

    const displayEl = document.getElementById("decodedTextDisplay");
    displayEl.textContent = decoded;

    const badge = document.getElementById("verificationBadge");
    const statusText = document.getElementById("verificationStatusText");

    if (decoded === state.originalText) {
      badge.className = "verification-status-badge verified";
      statusText.textContent = "100% Lossless • Perfect Match Verified";
      showToast("Lossless verification passed! Zero data loss.", "success");
    } else {
      badge.className = "verification-status-badge error";
      statusText.textContent = "Verification Failed • Payload Mismatch";
      showToast("Verification failed: decoded text does not match original.", "error");
    }
  } catch (err) {
    console.error(err);
    const badge = document.getElementById("verificationBadge");
    badge.className = "verification-status-badge error";
    document.getElementById("verificationStatusText").textContent = `Decode Error: ${err.message}`;
    showToast(`Decompression failed: ${err.message}`, "error");
  }
}

function resetAll() {
  inputEl.value = "";
  state.originalText = "";
  state.encodedBits = "";
  state.decodedText = "";
  state.huffmanRoot = null;
  state.huffmanCodes.clear();
  state.frequencyMap.clear();

  updateInputMeta();
  updateAnalytics("", "", new Map(), new Map());
  renderBitstream();
  renderTreeSvg();
  renderCodebookTable();

  const badge = document.getElementById("verificationBadge");
  badge.className = "verification-status-badge";
  document.getElementById("verificationStatusText").textContent = "Awaiting decompression test";
  document.getElementById("decodedTextDisplay").innerHTML = '<span class="text-placeholder">Decompressed text will be reconstructed here when you click "Decode &amp; Verify".</span>';

  showToast("Workspace cleared.");
}

/* ==========================================================================
   9. File I/O, Export, & Clipboard
   ========================================================================== */

// Copy bits to clipboard
async function copyEncodedBits() {
  if (!state.encodedBits) {
    showToast("No compressed bitstream to copy.", "error");
    return;
  }
  try {
    await navigator.clipboard.writeText(state.encodedBits);
    showToast("Bitstream copied to clipboard!", "success");
  } catch {
    showToast("Failed to copy. Please copy manually.", "error");
  }
}

// Download encoded bitstream
function downloadBitstream() {
  if (!state.encodedBits) {
    showToast("No compressed data to download.", "error");
    return;
  }
  const blob = new Blob([state.encodedBits], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "compressed_payload.huff.txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("File downloaded!", "success");
}

// Export Codebook JSON
function exportCodebookJson() {
  if (state.huffmanCodes.size === 0) {
    showToast("Compress text first to generate codebook.", "error");
    return;
  }

  const exportData = {
    generator: "HuffZip v2.0",
    timestamp: new Date().toISOString(),
    metrics: {
      originalCharacters: Array.from(state.originalText).length,
      originalBits: encoder.encode(state.originalText).length * 8,
      compressedBits: state.encodedBits.length,
      spaceSavingPercent: (
        (1 - state.encodedBits.length / (encoder.encode(state.originalText).length * 8)) * 100
      ).toFixed(2)
    },
    codebook: Object.fromEntries(state.huffmanCodes),
    frequency: Object.fromEntries(state.frequencyMap)
  };

  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "huffman_codebook.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Codebook JSON exported!", "success");
}

// Upload file handlers
uploadBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    inputEl.value = event.target.result;
    updateInputMeta();
    compress();
    showToast(`Loaded ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, "success");
  };
  reader.onerror = () => showToast("Error reading file.", "error");
  reader.readAsText(file);
});

// Drag and drop onto editor
["dragenter", "dragover"].forEach(eventName => {
  dropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });
});

["dragleave", "drop"].forEach(eventName => {
  dropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
  });
});

dropZone.addEventListener("drop", (e) => {
  const file = e.dataTransfer.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    inputEl.value = event.target.result;
    updateInputMeta();
    compress();
    showToast(`Loaded ${file.name}`, "success");
  };
  reader.readAsText(file);
});

/* ==========================================================================
   10. Theme Switching (Dark & Light)
   ========================================================================== */

function initializeTheme() {
  const savedTheme = localStorage.getItem("huffzip-theme");
  if (savedTheme) {
    document.documentElement.setAttribute("data-theme", savedTheme);
  } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
    document.documentElement.setAttribute("data-theme", "light");
  } else {
    document.documentElement.setAttribute("data-theme", "dark");
  }
}

themeToggleBtn.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("huffzip-theme", next);
  // Re-render SVG tree to inherit clean CSS colors
  if (state.huffmanRoot) {
    renderTreeSvg();
  }
});

/* ==========================================================================
   11. View Modes, Search, & Sorting
   ========================================================================== */

// Bitstream view mode tabs
document.querySelectorAll(".seg-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".seg-btn").forEach(b => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    state.viewMode = btn.dataset.mode;
    renderBitstream();
  });
});

// Codebook table search filter
tableSearch.addEventListener("input", (e) => {
  state.searchTerm = e.target.value;
  renderCodebookTable();
});

// Codebook table sorting
document.querySelectorAll(".data-table th.sortable").forEach(th => {
  th.addEventListener("click", () => {
    const field = th.dataset.sort;
    if (state.sortField === field) {
      state.sortAscending = !state.sortAscending;
    } else {
      state.sortField = field;
      state.sortAscending = false;
    }
    renderCodebookTable();
  });
});

/* ==========================================================================
   12. Event Listeners & Bootstrapping
   ========================================================================== */

compressBtn.addEventListener("click", compress);
decodeBtn.addEventListener("click", decompress);
clearBtn.addEventListener("click", resetAll);
copyBtn.addEventListener("click", copyEncodedBits);
downloadBitsBtn.addEventListener("click", downloadBitstream);
exportCodebookBtn.addEventListener("click", exportCodebookJson);

// Preset sample buttons
document.getElementById("sampleChips").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  const sampleKey = chip.dataset.sample;
  if (SAMPLE_TEXTS[sampleKey]) {
    inputEl.value = SAMPLE_TEXTS[sampleKey];
    updateInputMeta();
    compress();
  }
});

// Live character counter & Ctrl+Enter shortcut
inputEl.addEventListener("input", updateInputMeta);

inputEl.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    compress();
  }
});

// Initialize on page load
initializeTheme();
updateInputMeta();

// Load initial sample so the page looks stunning on first view
inputEl.value = SAMPLE_TEXTS.repetitive;
updateInputMeta();
compress();
