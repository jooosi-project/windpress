import { ToolbarButton } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { useState } from "@wordpress/element";
import { useDispatch, useSelect } from "@wordpress/data";
import { createBlock } from "@wordpress/blocks";
import HtmlImportModal from "./HtmlImportModal";

/**
 * HTML Import Button for Gutenberg Toolbar
 */
function HtmlImportButton() {
  const [isOpen, setIsOpen] = useState(false);

  const { insertBlocks } = useDispatch("core/block-editor");
  const { getSelectedBlockClientId, getBlockRootClientId, canInsertBlockType, getBlockIndex } =
    useSelect((select) => select("core/block-editor"), []);

  const handleImport = (htmlCode) => {
    // Check if parser is available
    if (
      typeof window.windpressCommonBlock === "undefined" ||
      typeof window.windpressCommonBlock.html2blocks !== "function"
    ) {
      alert(__("HTML parser not available. Please refresh the page.", "windpress"));
      return;
    }

    try {
      // Parse HTML to block data
      const blockData = window.windpressCommonBlock.html2blocks(htmlCode);

      if (!blockData || blockData.length === 0) {
        alert(__("Could not parse HTML. Please check the HTML syntax.", "windpress"));
        return;
      }

      // Convert block data to WordPress blocks
      const convertBlockData = (data) => {
        const innerBlocks =
          data.innerBlocks && data.innerBlocks.length > 0
            ? data.innerBlocks.map(convertBlockData)
            : [];
        return createBlock(data.name, data.attributes, innerBlocks);
      };

      const newBlocks = blockData.map(convertBlockData);

      // Get current block selection
      const selectedBlockClientId = getSelectedBlockClientId();
      const parentClientId = selectedBlockClientId
        ? getBlockRootClientId(selectedBlockClientId)
        : null;

      let insertionIndex = undefined;
      let insertionParentId = undefined;

      if (selectedBlockClientId) {
        // Check if the selected block can accept inner blocks
        // by trying to see if we can insert a block into it
        const canInsertIntoSelected =
          newBlocks.length > 0 && canInsertBlockType(newBlocks[0].name, selectedBlockClientId);

        if (canInsertIntoSelected) {
          // Insert inside the selected block at the end
          insertionParentId = selectedBlockClientId;
          insertionIndex = undefined; // undefined = at the end
        } else {
          // Insert after the selected block (at same level as selected block)
          const blockIndex = getBlockIndex(selectedBlockClientId);
          insertionParentId = parentClientId;
          insertionIndex = blockIndex + 1;
        }
      } else {
        // No block selected - insert at root level
        // Set ALL root-level BODY blocks (non-head elements) to full-width
        // Skip head elements like script, style, link, meta
        const headTags = new Set(["script", "style", "link", "meta", "title", "base"]);

        newBlocks.forEach((block) => {
          if (block.name === "windpress/common-block" && !headTags.has(block.attributes?.tagName)) {
            // This is a body block at root level - set to full-width
            block.attributes.align = "full";
          }
        });
      }

      // Insert blocks at the appropriate location
      // insertBlocks signature: insertBlocks(blocks, index, rootClientId, updateSelection)
      // When no args except blocks: inserts at root level at the end
      // When index + rootClientId specified: inserts at that position
      if (selectedBlockClientId) {
        insertBlocks(newBlocks, insertionIndex, insertionParentId);
      } else {
        // No block selected - insert at root
        insertBlocks(newBlocks);
      }

      // Close modal
      setIsOpen(false);
    } catch (error) {
      console.error("HTML import error:", error);
      alert(__("Error importing HTML. Check console for details.", "windpress"));
    }
  };

  return (
    <>
      <ToolbarButton
        icon={<IconLucideDownload aria-hidden="true" />}
        label={__("Import HTML", "windpress")}
        onClick={() => setIsOpen(true)}
      />

      {isOpen && (
        <HtmlImportModal isOpen={isOpen} onClose={() => setIsOpen(false)} onImport={handleImport} />
      )}
    </>
  );
}

export default HtmlImportButton;
