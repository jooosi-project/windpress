import { InnerBlocks } from "@wordpress/block-editor";

/**
 * Save component for Common Block
 */
export default function Save({ attributes }) {
  const { contentType = "blocks" } = attributes;

  // For blocks content type, save only InnerBlocks content
  // The wrapper element is rendered by PHP (CommonBlock.php)
  if (contentType === "blocks") {
    return <InnerBlocks.Content />;
  }

  // All other content types (text, html, empty) use dynamic rendering
  // The PHP render callback handles everything
  return null;
}
