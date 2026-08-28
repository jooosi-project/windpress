/**
 * Blocks to HTML Parser
 *
 * Converts WindPress Common Block structures back to HTML
 * Mirrors html2blocks.js for consistent roundtrip conversion
 * Exposed as window.windpressCommonBlock.blocks2html()
 */

/**
 * Serialize a block using WordPress block format (for non-Common Blocks)
 * @param {Object} block - Block object
 * @returns {string} Serialized block HTML with comment markers
 */
function serializeBlock(block) {
  if (!block || !block.name) {
    return "";
  }

  // Use WordPress's serialize function if available
  if (typeof wp !== "undefined" && wp.blocks && wp.blocks.serialize) {
    return wp.blocks.serialize(block);
  }

  // Fallback: Basic serialization
  const { name, attributes = {}, innerBlocks = [] } = block;
  const attrsJSON = Object.keys(attributes).length > 0 ? " " + JSON.stringify(attributes) : "";
  const innerContent = innerBlocks.length > 0 ? blocks2html(innerBlocks) : "";

  if (innerContent) {
    return `<!-- wp:${name}${attrsJSON} -->\n${innerContent}\n<!-- /wp:${name} -->`;
  } else {
    return `<!-- wp:${name}${attrsJSON} /-->`;
  }
}

/**
 * Convert an array of blocks to HTML string
 * @param {Array} blocks - Array of block objects
 * @returns {string} HTML string
 */
function blocks2html(blocks) {
  if (!blocks || !Array.isArray(blocks)) {
    return "";
  }

  return blocks.map((block) => blockToHTML(block)).join("\n");
}

/**
 * Convert a single block to HTML
 * @param {Object} block - Block object
 * @returns {string} HTML string
 */
function blockToHTML(block) {
  if (!block) {
    return "";
  }

  // Handle non-Common Blocks (Core blocks, etc.) by preserving as WordPress block comments
  if (block.name !== "windpress/common-block") {
    return serializeBlock(block);
  }

  const { attributes, innerBlocks } = block;
  const {
    tagName = "div",
    contentType = "text",
    content = "",
    globalAttrs = {},
    className = "",
  } = attributes;

  // Handle cb-text-node (wrapper for TEXT_NODE in html2blocks parser)
  // Just return the text content without wrapper tags
  if (tagName === "cb-text-node") {
    return content || "";
  }

  // Build attributes string
  let attributesString = "";

  // Add className if present
  if (className) {
    attributesString += ` class="${escapeQuotes(className)}"`;
  }

  // Add global attributes
  Object.entries(globalAttrs).forEach(([name, value]) => {
    // Convert data-style back to style
    if (name === "data-style") {
      attributesString += ` style="${escapeQuotes(value)}"`;
    } else if (name && value !== undefined && value !== null) {
      // Include all attributes, even empty strings (alt="", aria-hidden="", etc.)
      // Only escape quotes to prevent attribute breaking, preserve everything else
      attributesString += ` ${escapeAttributeName(name)}="${escapeQuotes(value)}"`;
    }
  });

  // Handle different content types
  let innerContent = "";

  switch (contentType) {
    case "text":
    case "html":
      innerContent = content || "";
      break;

    case "blocks":
      // Recursively convert inner blocks to HTML
      if (innerBlocks && innerBlocks.length > 0) {
        innerContent = blocks2html(innerBlocks);
      }
      break;

    case "empty":
    default:
      innerContent = "";
      break;
  }

  // Generate HTML
  // IMPORTANT: Only void elements should be self-closing in HTML5
  // Non-void elements like <div>, <span> must have closing tags even if empty
  const shouldBeSelfClosing = isVoidElement(tagName);

  if (shouldBeSelfClosing) {
    return `<${tagName}${attributesString} />`;
  } else {
    return `<${tagName}${attributesString}>${innerContent}</${tagName}>`;
  }
}

/**
 * Check if a tag name is a void element
 * Must match the logic in html2blocks.js for consistent roundtrip
 * @param {string} tagName - HTML tag name
 * @returns {boolean}
 */
function isVoidElement(tagName) {
  const voidElements = [
    "img",
    "br",
    "hr",
    "input",
    "meta",
    "link",
    "area",
    "base",
    "col",
    "embed",
    "source",
    "track",
    "wbr",
  ];
  return voidElements.includes(tagName.toLowerCase());
}

/**
 * Escape only double quotes in attribute values
 * Minimal escaping to prevent attribute breaking while preserving other characters
 * @param {string} value - Attribute value
 * @returns {string} Escaped value
 */
function escapeQuotes(value) {
  if (typeof value !== "string") {
    value = String(value);
  }
  return value.replace(/"/g, "&quot;");
}

/**
 * Escape HTML attribute name
 * Preserves Vue.js and Alpine.js attribute syntax
 * @param {string} name - Attribute name
 * @returns {string} Escaped name
 */
function escapeAttributeName(name) {
  // Allow letters, numbers, hyphens, underscores, colons, periods, and @ symbol
  // These are valid in HTML5 and used by modern frameworks (Vue, Alpine.js, etc.)
  // - Vue: :href, @click, v-model
  // - Alpine.js: x-data, @click, :class
  return name.replace(/[^a-zA-Z0-9\-_:@.]/g, "");
}

// Expose to window
if (typeof window !== "undefined") {
  window.windpressCommonBlock = window.windpressCommonBlock || {};
  window.windpressCommonBlock.blocks2html = blocks2html;
  window.windpressCommonBlock.blocksToHtml = blocks2html; // Alias for consistency
}

// Export for module usage
export { blocks2html };
