import { __ } from "@wordpress/i18n";
import { ToolbarGroup, ToolbarDropdownMenu } from "@wordpress/components";

// Common HTML tags grouped by category
const TAG_GROUPS = [
  {
    label: __("Layout", "windpress"),
    tags: ["div", "section", "article", "header", "footer", "nav", "main", "aside"],
  },
  {
    label: __("Inline", "windpress"),
    tags: ["span", "a", "strong", "em", "mark", "small", "del", "ins"],
  },
  {
    label: __("Headings", "windpress"),
    tags: ["h1", "h2", "h3", "h4", "h5", "h6"],
  },
  {
    label: __("Text", "windpress"),
    tags: ["p", "blockquote", "pre", "code"],
  },
  {
    label: __("Lists", "windpress"),
    tags: ["ul", "ol", "li", "dl", "dt", "dd"],
  },
  {
    label: __("Media", "windpress"),
    tags: ["img", "picture", "figure", "figcaption", "video", "audio", "iframe"],
  },
  {
    label: __("Form", "windpress"),
    tags: ["form", "input", "textarea", "select", "button", "label"],
  },
  {
    label: __("Table", "windpress"),
    tags: ["table", "thead", "tbody", "tfoot", "tr", "th", "td"],
  },
];

export default function TagNameToolbar({ value, onChange }) {
  // Build controls array for dropdown
  const controls = TAG_GROUPS.map((group) => ({
    title: group.label,
    controls: group.tags.map((tag) => ({
      title: `<${tag}>`,
      isActive: value === tag,
      onClick: () => onChange(tag),
    })),
  }));

  return (
    <ToolbarGroup>
      <ToolbarDropdownMenu
        icon={<IconLucideCode2 aria-hidden="true" />}
        label={__("Change HTML Tag", "windpress")}
        controls={controls}
      />
    </ToolbarGroup>
  );
}
