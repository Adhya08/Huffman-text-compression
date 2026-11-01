"use strict";

// Huffman tree node
class HuffmanNode {
  constructor(character, frequency, left = null, right = null) {
    this.character = character;
    this.frequency = frequency;
    this.left = left;
    this.right = right;
    this.order = 0;
  }
  isLeaf() {
    return this.left === null && this.right === null;
  }
}

// Custom Min Heap: smaller frequency has higher priority.
// In a tie, insertion order makes the result deterministic.
class MinHeap {
  constructor() {
    this.heap = [];
    this.sequence = 0;
  }
  size() { return this.heap.length; }
  isSmaller(a, b) {
    return a.frequency < b.frequency ||
      (a.frequency === b.frequency && a.order < b.order);
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
    const minimum = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length) {
      this.heap[0] = last;
      this.heapifyDown(0);
    }
    return minimum;
  }
  heapifyDown(index) {
    while (true) {
      let smallest = index;
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      if (left < this.heap.length && this.isSmaller(this.heap[left], this.heap[smallest])) smallest = left;
      if (right < this.heap.length && this.isSmaller(this.heap[right], this.heap[smallest])) smallest = right;
      if (smallest === index) break;
      [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
      index = smallest;
    }
  }
}

let huffmanRoot = null;
let huffmanCodes = new Map();
let encodedText = "";
let originalText = "";

const input = document.getElementById("inputText");
const encoder = new TextEncoder();

function calculateFrequency(text) {
  const frequency = new Map();
  for (const character of text) {
    frequency.set(character, (frequency.get(character) || 0) + 1);
  }
  return frequency;
}

function buildHuffmanTree(frequency) {
  const heap = new MinHeap();
  for (const [character, count] of frequency) {
    heap.insert(new HuffmanNode(character, count));
  }
  while (heap.size() > 1) {
    const left = heap.extractMin();
    const right = heap.extractMin();
    heap.insert(new HuffmanNode(null, left.frequency + right.frequency, left, right));
  }
  return heap.extractMin();
}

function generateCodes(root) {
  const codes = new Map();
  function traverse(node, code) {
    if (!node) return;
    if (node.isLeaf()) {
      codes.set(node.character, code || "0");
      return;
    }
    traverse(node.left, code + "0");
    traverse(node.right, code + "1");
  }
  traverse(root, "");
  return codes;
}

function encodeText(text, codes) {
  let result = "";
  for (const character of text) {
    const code = codes.get(character);
    if (code === undefined) throw new Error("Character code not found.");
    result += code;
  }
  return result;
}

function decodeText(bits, root) {
  if (!root) throw new Error("Huffman tree is empty.");
  if (!/^[01]*$/.test(bits)) throw new Error("Encoded data must contain only 0 and 1.");
  if (root.isLeaf()) {
    if ([...bits].some(bit => bit !== "0")) throw new Error("Invalid encoded data.");
    return root.character.repeat(bits.length);
  }

  let decoded = "";
  let current = root;
  for (const bit of bits) {
    current = bit === "0" ? current.left : current.right;
    if (!current) throw new Error("Invalid encoded data.");
    if (current.isLeaf()) {
      decoded += current.character;
      current = root;
    }
  }
  if (current !== root) throw new Error("Incomplete encoded data.");
  return decoded;
}

function displayFrequencyTable(frequency, codes) {
  const table = document.getElementById("frequencyTable");
  table.replaceChildren();
  const entries = [...frequency.entries()].sort((a, b) => a[0].codePointAt(0) - b[0].codePointAt(0));
  for (const [character, count] of entries) {
    const row = document.createElement("tr");
    const charCell = document.createElement("td");
    charCell.textContent = character === " " ? "[SPACE]" : character === "\n" ? "[NEWLINE]" : character === "\t" ? "[TAB]" : character;
    const freqCell = document.createElement("td");
    freqCell.textContent = count;
    const codeCell = document.createElement("td");
    codeCell.textContent = codes.get(character);
    row.append(charCell, freqCell, codeCell);
    table.appendChild(row);
  }
}

function createTreeElement(node, branch = "R") {
  const li = document.createElement("li");
  const box = document.createElement("div");
  box.className = node.isLeaf() ? "node" : "node internal";
  const symbol = document.createElement("span");
  symbol.textContent = node.isLeaf()
    ? node.character === " " ? "SP" : node.character === "\n" ? "NL" : node.character === "\t" ? "TAB" : node.character
    : "*";
  const frequency = document.createElement("small");
  frequency.textContent = node.frequency;
  box.append(symbol, frequency);
  li.appendChild(box);

  if (branch !== "R") {
    const label = document.createElement("span");
    label.className = "branch-label";
    label.textContent = branch;
    li.appendChild(label);
  }
  if (!node.isLeaf()) {
    const ul = document.createElement("ul");
    ul.append(createTreeElement(node.left, "0"), createTreeElement(node.right, "1"));
    li.appendChild(ul);
  }
  return li;
}

function displayTree(root) {
  const container = document.getElementById("treeContainer");
  container.replaceChildren();
  const tree = document.createElement("div");
  tree.className = "tree";
  const ul = document.createElement("ul");
  ul.appendChild(createTreeElement(root));
  tree.appendChild(ul);
  container.appendChild(tree);
}

function updateStatistics(text, encoded, uniqueCount) {
  const originalBits = encoder.encode(text).length * 8;
  const compressedBits = encoded.length;
  const saved = originalBits > 0 ? (1 - compressedBits / originalBits) * 100 : 0;

  document.getElementById("originalSize").innerHTML = `${originalBits} <small>bits</small>`;
  document.getElementById("compressedSize").innerHTML = `${compressedBits} <small>bits</small>`;
  document.getElementById("spaceSaved").innerHTML = `${saved.toFixed(2)}<small>%</small>`;
  document.getElementById("uniqueChars").textContent = uniqueCount;
  document.getElementById("ratioText").textContent = `${saved.toFixed(2)}%`;
  document.getElementById("progressBar").style.width = `${Math.max(0, Math.min(100, saved))}%`;
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2500);
}

function compress() {
  const text = input.value;
  if (!text.length) {
    showToast("Please enter some text first.");
    return;
  }
  try {
    originalText = text;
    const frequency = calculateFrequency(text);
    huffmanRoot = buildHuffmanTree(frequency);
    huffmanCodes = generateCodes(huffmanRoot);
    encodedText = encodeText(text, huffmanCodes);

    const output = document.getElementById("encodedOutput");
    output.replaceChildren();
    const bits = document.createElement("div");
    bits.className = "bit-output";
    bits.textContent = encodedText;
    output.appendChild(bits);

    document.getElementById("bitCount").textContent = `${encodedText.length} bits generated`;
    displayFrequencyTable(frequency, huffmanCodes);
    displayTree(huffmanRoot);
    updateStatistics(text, encodedText, frequency.size);

    document.getElementById("decodedOutput").textContent = "Ready for decompression.";
    const verification = document.getElementById("verification");
    verification.className = "verification";
    verification.textContent = "Awaiting decompression...";
    showToast("Text compressed successfully!");
  } catch (error) {
    showToast(error.message);
  }
}

function decompress() {
  if (!huffmanRoot || encodedText === "") {
    showToast("Compress some text first.");
    return;
  }
  try {
    const decoded = decodeText(encodedText, huffmanRoot);
    document.getElementById("decodedOutput").textContent = decoded;
    const verification = document.getElementById("verification");
    if (decoded === originalText) {
      verification.className = "verification success";
      verification.textContent = "SUCCESS: Original text recovered perfectly.";
      showToast("Decompression successful!");
    } else {
      verification.className = "verification error";
      verification.textContent = "ERROR: Original and decoded text do not match.";
    }
  } catch (error) {
    showToast(error.message);
  }
}

async function copyOutput() {
  if (!encodedText) {
    showToast("No encoded data to copy.");
    return;
  }
  try {
    await navigator.clipboard.writeText(encodedText);
    showToast("Encoded data copied!");
  } catch {
    showToast("Clipboard unavailable. Select and copy the output.");
  }
}

function resetWorkspace() {
  input.value = "";
  originalText = "";
  encodedText = "";
  huffmanRoot = null;
  huffmanCodes = new Map();
  document.getElementById("charCount").textContent = "0 characters";
  document.getElementById("bitCount").textContent = "0 bits generated";
  document.getElementById("encodedOutput").textContent = "Your compressed binary data will appear here.";
  document.getElementById("decodedOutput").textContent = "Decoded text will appear here.";
  document.getElementById("frequencyTable").innerHTML = '<tr><td colspan="3" class="empty-cell">No data available yet.</td></tr>';
  document.getElementById("treeContainer").textContent = "No tree generated yet.";
  document.getElementById("verification").textContent = "Awaiting decompression...";
  document.getElementById("verification").className = "verification";
  updateStatistics("", "", 0);
  showToast("Workspace cleared.");
}

document.getElementById("compressBtn").addEventListener("click", compress);
document.getElementById("decodeBtn").addEventListener("click", decompress);
document.getElementById("copyBtn").addEventListener("click", copyOutput);
document.getElementById("clearBtn").addEventListener("click", resetWorkspace);
document.getElementById("sampleBtn").addEventListener("click", () => {
  input.value = "HUFFMAN CODING IS A LOSSLESS TEXT COMPRESSION ALGORITHM.";
  input.dispatchEvent(new Event("input"));
  compress();
});
input.addEventListener("input", () => {
  document.getElementById("charCount").textContent = `${Array.from(input.value).length} characters`;
});
updateStatistics("", "", 0);
