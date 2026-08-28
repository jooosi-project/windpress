import { __ } from "@wordpress/i18n";
import {
  InspectorControls,
  BlockControls,
  RichText,
  InnerBlocks,
  useBlockProps,
  useInnerBlocksProps,
} from "@wordpress/block-editor";
import { useMemo, useCallback, useState, useEffect, memo, useRef } from "@wordpress/element";
import { createBlock } from "@wordpress/blocks";
import { useDispatch, useSelect } from "@wordpress/data";
import {
  PanelBody,
  SelectControl,
  TextControl,
  TextareaControl,
  Button,
  ToolbarGroup,
  ToolbarButton,
  Modal,
} from "@wordpress/components";
import { isEqual } from "lodash-es";
import AttributesPanel from "./AttributesPanel";
import ImagePanel from "./ImagePanel";
import LinkPanel from "./LinkPanel";
import MonacoEditor from "./MonacoEditor";

const CONTENT_TYPE_OPTIONS = [
  { label: "Inner Blocks", value: "blocks" },
  { label: "Text", value: "text" },
  { label: "HTML", value: "html" },
  { label: "─── None ───", value: "empty" },
];

const INNER_BLOCKS_CONFIG = {
  renderAppender: InnerBlocks.ButtonBlockAppender,
};

function Edit({ attributes, setAttributes, clientId }) {
  const {
    tagName = "div",
    contentType = "blocks",
    content = "",
    globalAttrs = {},
    selfClosing = false,
  } = attributes;

  const [showHtmlExport, setShowHtmlExport] = useState(false);
  const [htmlExportCode, setHtmlExportCode] = useState("");
  const [customTagInput, setCustomTagInput] = useState("");
  const { replaceInnerBlocks, updateBlockAttributes } = useDispatch("core/block-editor");
  const { innerBlocks, isRoot } = useSelect(
    (select) => {
      const blockEditorStore = select("core/block-editor");
      const parentClientId = blockEditorStore.getBlockRootClientId(clientId);

      return {
        innerBlocks: blockEditorStore.getBlocks(clientId),
        // Block is root if it has no parent (parentClientId is null or undefined)
        isRoot: !parentClientId,
      };
    },
    [clientId],
  );

  // Generate block name based on tag name and ID
  const generateBlockName = useCallback((tag, attrs) => {
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
  }, []);

  // Update block metadata title when tagName or ID changes (memoize to prevent unnecessary updates)
  const previousTagNameRef = useRef(tagName);
  const previousIdRef = useRef(globalAttrs?.id);
  useEffect(() => {
    const currentId = globalAttrs?.id;
    // Only update if tagName or ID actually changed
    if (previousTagNameRef.current !== tagName || previousIdRef.current !== currentId) {
      previousTagNameRef.current = tagName;
      previousIdRef.current = currentId;
      updateBlockAttributes(clientId, {
        metadata: {
          ...attributes.metadata,
          name: generateBlockName(tagName, attributes),
        },
      });
    }
  }, [tagName, globalAttrs?.id, clientId, updateBlockAttributes, attributes, generateBlockName]);

  // Memoize filtered global attributes with deep equality check
  const filteredGlobalAttrs = useMemo(() => {
    const out = {};
    for (const k in globalAttrs) {
      if (k !== "class") {
        out[k] = globalAttrs[k];
      }
    }
    // Add default id if not present
    if (!out.id) {
      out.id = `block-${clientId}`;
    }
    return out;
  }, [JSON.stringify(globalAttrs), clientId]);

  // Memoize className separately to prevent recreation
  const blockClassName = useMemo(
    () =>
      `windpress-common-block ${isRoot ? "is-root-container" : ""} ${attributes.className || ""}`.trim(),
    [isRoot, attributes.className],
  );

  // Stable ref callback for anchor tags
  const anchorRefCallback = useCallback(
    (node) => {
      if (node && tagName === "a") {
        node.style.removeProperty("white-space");
        node.style.removeProperty("min-width");
      }
    },
    [tagName],
  );

  // Memoize blockProps configuration object
  const blockPropsConfig = useMemo(
    () => ({
      className: blockClassName,
      ...filteredGlobalAttrs,
      "data-title": "Common Block",
      "data-tag": tagName,
      ref: anchorRefCallback,
    }),
    [blockClassName, filteredGlobalAttrs, tagName, anchorRefCallback],
  );

  const blockProps = useBlockProps(blockPropsConfig);

  // Add onClick handler for anchor tags to prevent navigation in blocks content type
  const innerBlocksPropsConfig = useMemo(() => {
    const config = { ...INNER_BLOCKS_CONFIG };
    if (tagName === "a") {
      // InnerBlocksProps will merge this with blockProps
      return config;
    }
    return config;
  }, [tagName]);

  const innerBlocksProps = useInnerBlocksProps(
    tagName === "a" ? { ...blockProps, onClick: (e) => e.preventDefault() } : blockProps,
    innerBlocksPropsConfig,
  );

  const elementProps = useMemo(() => {
    const props = { ...blockProps };

    if (tagName === "a" && (contentType === "html" || contentType === "empty")) {
      props.onClick = (e) => e.preventDefault();
    }

    return props;
  }, [blockProps, tagName, contentType]);

  const richTextProps = useMemo(() => {
    const props = {
      className: blockProps.className,
      "data-title": "Common Block",
      "data-tag": tagName,
    };

    if (tagName === "a") {
      props.ref = (node) => {
        if (node) {
          node.style.removeProperty("white-space");
          node.style.removeProperty("min-width");
        }
      };
      // Prevent link navigation in editor
      props.onClick = (e) => e.preventDefault();
    }

    return props;
  }, [blockProps.className, tagName]);

  const onTagChange = useCallback(
    (value) => {
      const newAttrs = { tagName: value };

      const selfClosingTags = ["img", "input", "br", "hr", "meta", "link"];
      if (selfClosingTags.includes(value)) {
        newAttrs.selfClosing = true;
        newAttrs.contentType = "empty";
      } else {
        newAttrs.selfClosing = false;
      }

      setAttributes(newAttrs);
    },
    [setAttributes],
  );

  const onContentTypeChange = useCallback(
    (value) => {
      setAttributes({ contentType: value });
    },
    [setAttributes],
  );

  const onContentChange = useCallback(
    (value) => {
      setAttributes({ content: value });
    },
    [setAttributes],
  );

  const onGlobalAttrsChange = useCallback(
    (newAttrs) => {
      setAttributes({ globalAttrs: newAttrs });
    },
    [setAttributes],
  );

  // HTML Export handler
  const handleHtmlExport = useCallback(() => {
    // Check if serializer is available
    if (
      typeof window.windpressCommonBlock === "undefined" ||
      typeof window.windpressCommonBlock.blocks2html !== "function"
    ) {
      alert(__("HTML serializer not available. Please refresh the page.", "windpress"));
      return;
    }

    try {
      // Convert current block to block data
      const blockData = {
        name: "windpress/common-block",
        attributes: attributes,
        innerBlocks: innerBlocks || [],
      };

      // Serialize to HTML
      const html = window.windpressCommonBlock.blocks2html([blockData]);

      setHtmlExportCode(html);
      setShowHtmlExport(true);
    } catch (error) {
      console.error("HTML export error:", error);
      alert(__("Error exporting HTML. Check console for details.", "windpress"));
    }
  }, [attributes, innerBlocks]);

  // Copy to clipboard
  const copyToClipboard = useCallback((text) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        alert(__("Copied to clipboard!", "windpress"));
      })
      .catch(() => {
        alert(__("Failed to copy. Please select and copy manually.", "windpress"));
      });
  }, []);

  // Handle custom tag input
  const handleCustomTagSubmit = useCallback(() => {
    const sanitized = customTagInput
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");
    if (!sanitized) {
      alert(__("Please enter a valid tag name", "windpress"));
      return;
    }
    if (!sanitized.includes("-")) {
      alert(__("Custom elements must contain a hyphen (e.g., my-element)", "windpress"));
      return;
    }
    onTagChange(sanitized);
    setCustomTagInput("");
  }, [customTagInput, onTagChange]);

  // Determine which tag to render
  const TagElement = tagName;

  // Split renderContent into smaller memos for better performance
  // Store innerBlocks children separately to avoid re-renders
  const innerBlocksChildren = useMemo(() => {
    if (contentType !== "blocks") return null;
    return innerBlocksProps.children;
  }, [contentType, innerBlocksProps.children]);

  // Memoize block content rendering separately from props
  const renderBlocksContent = useCallback(() => {
    const { children, ...restProps } = innerBlocksProps;
    return <TagElement {...restProps}>{children}</TagElement>;
  }, [TagElement, innerBlocksProps]);

  const renderTextContent = useCallback(
    () => (
      <RichText
        tagName={TagElement}
        value={content}
        onChange={onContentChange}
        placeholder={__("Enter text...", "windpress")}
        {...richTextProps}
      />
    ),
    [TagElement, content, onContentChange, richTextProps],
  );

  const renderHtmlContent = useCallback(
    () => (
      <TagElement
        {...elementProps}
        dangerouslySetInnerHTML={{ __html: content || __("(empty)", "windpress") }}
      />
    ),
    [TagElement, elementProps, content],
  );

  const renderEmptyContent = useCallback(() => {
    if (selfClosing || contentType === "empty") {
      return <TagElement {...elementProps} />;
    }
    return <TagElement {...elementProps}>{__("(empty)", "windpress")}</TagElement>;
  }, [TagElement, elementProps, selfClosing, contentType]);

  // Select appropriate renderer based on content type
  const renderContent = useMemo(() => {
    if (contentType === "blocks") return renderBlocksContent();
    if (contentType === "text") return renderTextContent();
    if (contentType === "html") return renderHtmlContent();
    return renderEmptyContent();
  }, [contentType, renderBlocksContent, renderTextContent, renderHtmlContent, renderEmptyContent]);

  return (
    <>
      <BlockControls>
        <ToolbarGroup>
          <ToolbarButton
            icon={<IconLucideUpload aria-hidden="true" />}
            label={__("Export HTML", "windpress")}
            onClick={handleHtmlExport}
          />
        </ToolbarGroup>
      </BlockControls>

      <InspectorControls>
        {/* Element Settings */}
        <PanelBody title={__("Element Settings", "windpress")} initialOpen={true}>
          <SelectControl
            label={__("HTML Tag", "windpress")}
            value={tagName}
            onChange={onTagChange}
            __next40pxDefaultSize
            __nextHasNoMarginBottom
            options={[
              { label: "─── Layout ───", value: "", disabled: true },
              { label: "<div>", value: "div" },
              { label: "<section>", value: "section" },
              { label: "<article>", value: "article" },
              { label: "<header>", value: "header" },
              { label: "<footer>", value: "footer" },
              { label: "<nav>", value: "nav" },
              { label: "<main>", value: "main" },
              { label: "<aside>", value: "aside" },
              { label: "─── Headings ───", value: "", disabled: true },
              { label: "<h1>", value: "h1" },
              { label: "<h2>", value: "h2" },
              { label: "<h3>", value: "h3" },
              { label: "<h4>", value: "h4" },
              { label: "<h5>", value: "h5" },
              { label: "<h6>", value: "h6" },
              { label: "─── Text ───", value: "", disabled: true },
              { label: "<p>", value: "p" },
              { label: "<span>", value: "span" },
              { label: "<blockquote>", value: "blockquote" },
              { label: "<pre>", value: "pre" },
              { label: "<code>", value: "code" },
              { label: "─── Inline ───", value: "", disabled: true },
              { label: "<a>", value: "a" },
              { label: "<strong>", value: "strong" },
              { label: "<em>", value: "em" },
              { label: "<mark>", value: "mark" },
              { label: "<small>", value: "small" },
              { label: "<del>", value: "del" },
              { label: "<ins>", value: "ins" },
              { label: "─── Lists ───", value: "", disabled: true },
              { label: "<ul>", value: "ul" },
              { label: "<ol>", value: "ol" },
              { label: "<li>", value: "li" },
              { label: "<dl>", value: "dl" },
              { label: "<dt>", value: "dt" },
              { label: "<dd>", value: "dd" },
              { label: "─── Media ───", value: "", disabled: true },
              { label: "<img>", value: "img" },
              { label: "<picture>", value: "picture" },
              { label: "<figure>", value: "figure" },
              { label: "<figcaption>", value: "figcaption" },
              { label: "<video>", value: "video" },
              { label: "<audio>", value: "audio" },
              { label: "<iframe>", value: "iframe" },
              { label: "─── Form ───", value: "", disabled: true },
              { label: "<form>", value: "form" },
              { label: "<input>", value: "input" },
              { label: "<textarea>", value: "textarea" },
              { label: "<select>", value: "select" },
              { label: "<button>", value: "button" },
              { label: "<label>", value: "label" },
              { label: "─── Table ───", value: "", disabled: true },
              { label: "<table>", value: "table" },
              { label: "<thead>", value: "thead" },
              { label: "<tbody>", value: "tbody" },
              { label: "<tfoot>", value: "tfoot" },
              { label: "<tr>", value: "tr" },
              { label: "<th>", value: "th" },
              { label: "<td>", value: "td" },
            ]}
            help={__("Select an HTML tag or use Custom Element panel for custom tags", "windpress")}
          />
          {!selfClosing && (
            <SelectControl
              label={__("Content Type", "windpress")}
              value={contentType}
              options={CONTENT_TYPE_OPTIONS}
              onChange={onContentTypeChange}
              __next40pxDefaultSize
              __nextHasNoMarginBottom
            />
          )}
        </PanelBody>

        {/* HTML Export Panel */}
        <PanelBody title={__("HTML Export", "windpress")} initialOpen={false}>
          <p style={{ fontSize: "12px", color: "#757575", marginBottom: "12px" }}>
            {__("Export this block as clean HTML code.", "windpress")}
          </p>
          <Button
            variant="secondary"
          icon={<IconLucideUpload aria-hidden="true" />}
            onClick={handleHtmlExport}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {__("Export to HTML", "windpress")}
          </Button>
        </PanelBody>

        {/* HTML Content Editor (for html content type) */}
        {contentType === "html" && (
          <PanelBody title={__("HTML Content", "windpress")} initialOpen={false}>
            <TextareaControl
              label={__("HTML", "windpress")}
              value={content}
              onChange={onContentChange}
              rows={10}
              __nextHasNoMarginBottom
            />
          </PanelBody>
        )}

        {/* Attributes Panel */}
        <AttributesPanel attributes={globalAttrs} onChange={onGlobalAttrsChange} />

        {/* Image Settings (for img tag) */}
        {tagName === "img" && (
          <ImagePanel attributes={globalAttrs} onChange={onGlobalAttrsChange} />
        )}

        {/* Link Settings (for a tag) */}
        {tagName === "a" && <LinkPanel attributes={globalAttrs} onChange={onGlobalAttrsChange} />}

        {/* Custom Element */}
        <PanelBody title={__("Custom Element", "windpress")} initialOpen={false}>
          <p style={{ fontSize: "12px", color: "#757575", marginBottom: "12px" }}>
            {__(
              "Enter a custom HTML tag name (must contain a hyphen for web components)",
              "windpress",
            )}
          </p>
          <TextControl
            label={__("Custom Tag Name", "windpress")}
            value={customTagInput}
            onChange={setCustomTagInput}
            placeholder="my-custom-element"
            help={__("Examples: my-widget, custom-card, x-button", "windpress")}
            __next40pxDefaultSize
            __nextHasNoMarginBottom
          />
          <Button variant="primary" onClick={handleCustomTagSubmit} style={{ width: "100%" }}>
            {__("Apply Custom Tag", "windpress")}
          </Button>
        </PanelBody>
      </InspectorControls>

      {/* HTML Export Modal */}
      {showHtmlExport && (
        <Modal
          title={__("Export HTML", "windpress")}
          onRequestClose={() => setShowHtmlExport(false)}
          style={{ maxWidth: "800px", width: "90vw" }}
        >
          <p>{__("Copy the HTML code below:", "windpress")}</p>
          <div style={{ marginBottom: "16px" }}>
            <MonacoEditor
              value={htmlExportCode}
              onChange={() => {}} // Read-only
              language="html"
              height={400}
              options={{ readOnly: true }}
            />
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <Button variant="primary" onClick={() => copyToClipboard(htmlExportCode)}>
              {__("Copy to Clipboard", "windpress")}
            </Button>
            <Button variant="secondary" onClick={() => setShowHtmlExport(false)}>
              {__("Close", "windpress")}
            </Button>
          </div>
        </Modal>
      )}

      {renderContent}
    </>
  );
}

// Custom comparison function for React.memo
// Only re-render when actual block attributes or clientId change
function arePropsEqual(prevProps, nextProps) {
  // Always re-render if clientId changes
  if (prevProps.clientId !== nextProps.clientId) {
    return false;
  }

  // Deep compare attributes using lodash isEqual
  // This prevents re-renders from parent editor state changes
  return isEqual(prevProps.attributes, nextProps.attributes);
}

// Export memoized component with custom comparison
export default memo(Edit, arePropsEqual);
