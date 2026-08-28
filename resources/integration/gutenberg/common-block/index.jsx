import { registerBlockType } from "@wordpress/blocks";
import Edit from "./components/Edit";
import Save from "./components/Save";
import metadata from "./block.json";

// Import parsers to expose to window
import "./lib/html2blocks.js";
import "./lib/blocks2html.js";

// Import toolbar plugin for HTML import
import "./toolbar-plugin.jsx";

// WindPress icon component
const icon = () => (
  <IconWindpressWindpress width={24} height={24} aria-hidden="true" focusable="false" />
);

// Remove editorScript from metadata before registering
// (it's needed in block.json for WordPress Block Directory validation,
// but not needed here since we're registering via JS)
const { editorScript, ...blockMetadata } = metadata;

registerBlockType(blockMetadata.name, {
  ...blockMetadata,
  icon,
  edit: Edit,
  save: Save,
});
