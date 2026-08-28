/**
 * HTML to WindPress Common Blocks Parser
 *
 * Converts HTML to windpress/common-block blocks while preserving structure
 * Exposed as window.windpressCommonBlock.html2blocks()
 */

import { nanoid } from "nanoid";

/**
 * Inline elements that should prefer 'text' content type with inline HTML
 */
const INLINE_ELEMENTS = new Set([
  "a",
  "abbr",
  "b",
  "bdi",
  "bdo",
  "cite",
  "code",
  "data",
  "dfn",
  "em",
  "i",
  "kbd",
  "mark",
  "q",
  "s",
  "samp",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "time",
  "u",
  "var",
]);

/**
 * Elements that should always use 'html' content type (unavoidable)
 */
const HTML_ONLY_ELEMENTS = new Set(["svg", "math", "script", "style", "noscript", "iframe"]);

/**
 * Self-closing (void) elements
 */
const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

/**
 * Parse HTML string to windpress/common-block blocks
 * @param {string} html - HTML string to parse
 * @returns {Array} Array of block objects
 */
function html2blocks(html) {
  if (!html || typeof html !== "string") {
    return [];
  }

  // Check if HTML contains WordPress block comments
  const hasWpBlocks = /<!--\s*wp:/.test(html);

  if (hasWpBlocks && typeof wp !== "undefined" && wp.blocks && wp.blocks.parse) {
    // Parse everything with WordPress parser first (handles nesting correctly)
    try {
      const wpParsed = wp.blocks.parse(html);

      // Separate WordPress blocks from plain HTML
      const wpBlocksMap = {};
      let processedHtml = html;

      // Use wp.blocks.serialize to get the exact serialized form of each block
      // Then replace it with a placeholder (preserves structure while allowing HTML parsing)
      wpParsed.forEach((block) => {
        if (block.name) {
          // Skip null/undefined blocks (plain HTML)
          const uniqueId = nanoid();
          const serialized = wp.blocks.serialize(block);

          // Replace the serialized block with placeholder
          processedHtml = processedHtml.replace(
            serialized,
            `<wp-block-placeholder data-id="${uniqueId}"></wp-block-placeholder>`,
          );
          wpBlocksMap[uniqueId] = block;
        }
      });

      // Now parse the HTML (with placeholders) using DOMParser
      const parser = new DOMParser();
      const doc = parser.parseFromString(processedHtml.trim(), "text/html");
      const temp = doc.body;

      // Parse child nodes and replace placeholders
      const blocks = [];
      Array.from(temp.childNodes).forEach((node) => {
        const block = parseNode(node, wpBlocksMap);
        if (block) {
          blocks.push(block);
        }
      });

      return blocks;
    } catch (e) {
      console.error("Failed to parse WordPress blocks, falling back to HTML parser:", e);
    }
  }

  // No WordPress blocks - use DOMParser for plain HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html.trim(), "text/html");

  const blocks = [];

  // Parse head elements first (scripts, styles, meta tags, etc.)
  // Browser automatically moves these tags to <head>
  Array.from(doc.head.childNodes).forEach((node) => {
    const block = parseNode(node, {});
    if (block) {
      blocks.push(block);
    }
  });

  // Parse body elements
  Array.from(doc.body.childNodes).forEach((node) => {
    const block = parseNode(node, {});
    if (block) {
      blocks.push(block);
    }
  });

  return blocks;
}

/**
 * Parse a DOM node to a block object
 * @param {Node} node - DOM node to parse
 * @param {Object} wpBlocksMap - Map of WordPress blocks by placeholder ID
 * @returns {Object|null} Block object or null
 */
function parseNode(node, wpBlocksMap = {}) {
  // Skip comments
  if (node.nodeType === Node.COMMENT_NODE) {
    return null;
  }

  // Handle text nodes - wrap in cb-text-node to preserve in blocks structure
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent;

    // Skip empty or whitespace-only text nodes
    if (!text.trim()) {
      return null;
    }

    // Trim whitespace but preserve single spaces between words
    const trimmedText = text.trim();

    // Wrap text in cb-text-node element (will be unwrapped in renderer)
    return createBlock("cb-text-node", "text", trimmedText, { className: "", globalAttrs: {} });
  }

  // Handle element nodes
  if (node.nodeType === Node.ELEMENT_NODE) {
    const tagName = node.tagName.toLowerCase();

    // Check if this is a wp-block-placeholder
    if (tagName === "wp-block-placeholder") {
      const placeholderId = node.getAttribute("data-id");
      if (placeholderId && wpBlocksMap[placeholderId]) {
        // Return the actual WordPress block
        return wpBlocksMap[placeholderId];
      }
      // If placeholder not found, skip it
      return null;
    }

    const attributes = getAttributes(node);

    // Determine content type
    const contentType = determineContentType(node, tagName);

    // Create block based on content type
    if (contentType === "empty") {
      return createBlock(tagName, "empty", "", attributes);
    }

    if (contentType === "text") {
      // For text content with inline HTML, store innerHTML
      const textContent = node.innerHTML.trim();
      return createBlock(tagName, "text", textContent, attributes);
    }

    if (contentType === "html") {
      // Use innerHTML for HTML content type (last resort)
      const htmlContent = node.innerHTML;
      return createBlock(tagName, "html", htmlContent, attributes);
    }

    if (contentType === "blocks") {
      // Parse child nodes recursively
      const innerBlocks = [];
      Array.from(node.childNodes).forEach((child) => {
        const childBlock = parseNode(child, wpBlocksMap);
        if (childBlock) {
          innerBlocks.push(childBlock);
        }
      });

      return createBlock(tagName, "blocks", "", attributes, innerBlocks);
    }
  }

  return null;
}

/**
 * Determine content type based on element's children
 * Strategy: Minimize 'html' type, prefer 'blocks' for structure, 'text' for inline content
 *
 * @param {Element} element - DOM element
 * @param {string} tagName - Tag name
 * @returns {string} Content type: 'blocks', 'text', 'html', or 'empty'
 */
function determineContentType(element, tagName) {
  // Force HTML type for specific elements (unavoidable)
  if (HTML_ONLY_ELEMENTS.has(tagName)) {
    return "html";
  }

  // Void elements
  if (VOID_ELEMENTS.has(tagName)) {
    return "empty";
  }

  // Check if element has any children
  if (!element.hasChildNodes()) {
    return "empty";
  }

  // Analyze child nodes
  let hasElementChildren = false;
  let hasSignificantText = false;
  let elementNodes = [];

  Array.from(element.childNodes).forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      hasElementChildren = true;
      elementNodes.push(node);
    } else if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
      hasSignificantText = true;
    }
  });

  // CASE 1: Pure text content (no element children)
  // Use 'text' type
  if (!hasElementChildren && hasSignificantText) {
    return "text";
  }

  // CASE 2: Only element children (no significant text)
  // Use 'blocks' type for clean nested structure
  if (hasElementChildren && !hasSignificantText) {
    return "blocks";
  }

  // CASE 3: Mixed content (elements + significant text)
  // Determine if we can handle it with 'blocks' + cb-text-node or need 'text' with inline HTML

  // Check if all child elements are inline elements
  const allChildrenInline = elementNodes.every((el) =>
    INLINE_ELEMENTS.has(el.tagName.toLowerCase()),
  );

  if (allChildrenInline) {
    // All children are inline elements (like <strong>, <em>, <a>)
    // Use 'text' type and preserve inline HTML
    // Example: <p>Hello <strong>world</strong></p> → text type with innerHTML
    return "text";
  }

  // CASE 4: Has block-level children mixed with text
  // Use 'blocks' type and wrap text nodes in cb-text-node
  // Example: <div>Hello<div>World</div></div> → blocks type
  return "blocks";
}

/**
 * Get all attributes from an element
 * @param {Element} element - DOM element
 * @returns {Object} Object with className and globalAttrs
 */
function getAttributes(element) {
  const attrs = {};
  let className = "";

  Array.from(element.attributes).forEach((attr) => {
    // Note: attr.value is already decoded by the browser's parser
    // No need to decode entities again - browser gives us the actual value
    const value = attr.value;

    // Handle class separately for WordPress className
    if (attr.name === "class") {
      className = value;
    }
    // Convert style to data-style (WordPress doesn't allow inline styles in blocks)
    else if (attr.name === "style") {
      attrs["data-style"] = value;
    }
    // All other attributes go to globalAttrs
    else {
      attrs[attr.name] = value;
    }
  });

  return { className, globalAttrs: attrs };
}

/**
 * Create a block object
 * @param {string} tagName - HTML tag name
 * @param {string} contentType - Content type (blocks, text, html, empty)
 * @param {string} content - Text/HTML content (for text/html type)
 * @param {Object} attributeData - Object with className and globalAttrs
 * @param {Array} innerBlocks - Child blocks (for blocks type)
 * @returns {Object} Block object
 */
function createBlock(tagName, contentType, content = "", attributeData = {}, innerBlocks = []) {
  const { className = "", globalAttrs = {} } = attributeData;

  // Generate block name based on tag name and ID
  // Format: capitalize first letter of each word (e.g., div -> Div, cb-text-node -> Cb Text Node)
  const generateBlockName = (tag, attrs) => {
    if (tag === "cb-text-node") {
      return "Text";
    }
    // Convert tag to readable name (e.g., 'my-tag' -> 'My Tag')
    let name = tag
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    // Append ID if it exists
    if (attrs && attrs.globalAttrs && attrs.globalAttrs.id) {
      name += ` #${attrs.globalAttrs.id}`;
    }

    return name;
  };

  const block = {
    name: "windpress/common-block",
    attributes: {
      tagName: tagName,
      contentType: contentType,
      globalAttrs: globalAttrs,
      selfClosing: VOID_ELEMENTS.has(tagName),
      metadata: {
        name: generateBlockName(tagName, attributeData),
      },
    },
    innerBlocks: innerBlocks || [],
  };

  // Add className if present
  if (className) {
    block.attributes.className = className;
  }

  // Add content for text and html types
  if ((contentType === "text" || contentType === "html") && content) {
    block.attributes.content = content;
  }

  return block;
}

/**
 * Generate WordPress block markup from block data
 * @param {Array} blocks - Array of block objects
 * @returns {string} WordPress block markup
 */
function generateBlockMarkup(blocks) {
  if (!blocks || !Array.isArray(blocks)) {
    return "";
  }

  const serializeBlock = (block) => {
    const { name, attributes, innerBlocks } = block;

    // Serialize attributes to JSON
    const attrsJson = Object.keys(attributes).length > 0 ? " " + JSON.stringify(attributes) : "";

    // Check if block has inner blocks
    const hasInnerBlocks = innerBlocks && innerBlocks.length > 0;

    if (hasInnerBlocks) {
      // Block with inner blocks
      const innerMarkup = innerBlocks.map(serializeBlock).join("\n");
      return `<!-- wp:${name}${attrsJson} -->\n${innerMarkup}\n<!-- /wp:${name} -->`;
    } else {
      // Self-closing block
      return `<!-- wp:${name}${attrsJson} /-->`;
    }
  };

  return blocks.map(serializeBlock).join("\n\n");
}

/**
 * Insert blocks into the WordPress editor at current position
 * @param {Array} blocks - Array of block objects
 * @returns {void}
 */
function insertBlocks(blocks) {
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    console.error("No blocks to insert");
    return;
  }

  // Check if WordPress editor is available
  if (typeof wp === "undefined" || !wp.data) {
    console.error("WordPress editor not available");
    return;
  }

  const { select, dispatch } = wp.data;
  const { createBlock } = wp.blocks;

  // Recursively convert block data to WordPress blocks
  const convertBlockData = (data) => {
    const innerBlocks =
      data.innerBlocks && data.innerBlocks.length > 0 ? data.innerBlocks.map(convertBlockData) : [];
    return createBlock(data.name, data.attributes, innerBlocks);
  };

  // Convert all blocks
  const wpBlocks = blocks.map(convertBlockData);

  // Get current block selection
  const selectedBlockId = select("core/block-editor").getSelectedBlockClientId();
  const rootClientId = select("core/block-editor").getBlockRootClientId(selectedBlockId);

  // Insert blocks after current selection or at end
  if (selectedBlockId) {
    const blockIndex = select("core/block-editor").getBlockIndex(selectedBlockId);
    dispatch("core/block-editor").insertBlocks(wpBlocks, blockIndex + 1, rootClientId);
  } else {
    dispatch("core/block-editor").insertBlocks(wpBlocks);
  }
}

// Expose to window
if (typeof window !== "undefined") {
  window.windpressCommonBlock = window.windpressCommonBlock || {};
  window.windpressCommonBlock.html2blocks = html2blocks;
  window.windpressCommonBlock.generateBlockMarkup = generateBlockMarkup;
  window.windpressCommonBlock.insertBlocks = insertBlocks;
}

// Export for module usage
export { html2blocks, generateBlockMarkup, insertBlocks };
