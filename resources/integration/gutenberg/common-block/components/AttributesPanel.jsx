import { __ } from "@wordpress/i18n";
import { PanelBody, TextControl, Button, Flex, FlexItem } from "@wordpress/components";
import { useState, useCallback, useMemo, useEffect, memo, useRef } from "@wordpress/element";
import { debounce } from "lodash-es";

function AttributesPanel({ attributes = {}, onChange }) {
  const [newAttrName, setNewAttrName] = useState("");
  const [newAttrValue, setNewAttrValue] = useState("");

  // Get array of attribute entries (excluding 'class' which is handled by className)
  const attrEntries = Object.entries(attributes).filter(([key]) => key !== "class");

  const addAttribute = () => {
    if (!newAttrName.trim()) {
      alert(__("Please enter an attribute name", "windpress"));
      return;
    }

    // Sanitize attribute name (only alphanumeric, dash, underscore, at, and colon)
    // const sanitizedName = newAttrName.trim().toLowerCase().replace(/[^a-z0-9\-_]/g, '');
    const sanitizedName = newAttrName.trim().replace(/[^a-zA-Z0-9\-_:@]/g, "");

    if (!sanitizedName) {
      alert(__("Invalid attribute name", "windpress"));
      return;
    }

    // Add or update attribute
    onChange({
      ...attributes,
      [sanitizedName]: newAttrValue,
    });

    // Clear inputs
    setNewAttrName("");
    setNewAttrValue("");
  };

  const removeAttribute = (attrName) => {
    const newAttrs = { ...attributes };
    delete newAttrs[attrName];
    onChange(newAttrs);
  };

  // Stable ref for onChange to avoid recreating debounce
  const onChangeRef = useRef(onChange);
  const attributesRef = useRef(attributes);

  useEffect(() => {
    onChangeRef.current = onChange;
    attributesRef.current = attributes;
  }, [onChange, attributes]);

  // Debounced update for attribute values to prevent excessive re-renders
  const debouncedUpdate = useMemo(
    () =>
      debounce((attrName, attrValue) => {
        onChangeRef.current({
          ...attributesRef.current,
          [attrName]: attrValue,
        });
      }, 300),
    [], // Empty deps - only create once
  );

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedUpdate.cancel();
    };
  }, [debouncedUpdate]);

  const updateAttribute = useCallback(
    (attrName, attrValue) => {
      debouncedUpdate(attrName, attrValue);
    },
    [debouncedUpdate],
  );

  return (
    <PanelBody title={__("Attributes", "windpress")} initialOpen={false}>
      {/* Existing attributes */}
      {attrEntries.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          {attrEntries.map(([attrName, attrValue]) => (
            <Flex key={attrName} gap={2} style={{ marginBottom: "8px" }} align="flex-start">
              <FlexItem style={{ flex: "0 0 80px" }}>
                <TextControl
                  value={attrName}
                  disabled
                  style={{ fontSize: "12px", fontFamily: "monospace" }}
                  __next40pxDefaultSize
                  __nextHasNoMarginBottom
                />
              </FlexItem>
              <FlexItem style={{ flex: "1" }}>
                <TextControl
                  value={attrValue}
                  onChange={(value) => updateAttribute(attrName, value)}
                  placeholder={__("Value", "windpress")}
                  __next40pxDefaultSize
                  __nextHasNoMarginBottom
                />
              </FlexItem>
              <FlexItem>
                <Button
                  icon={<IconLucideTrash2 aria-hidden="true" />}
                  label={__("Remove", "windpress")}
                  isDestructive
                  onClick={() => removeAttribute(attrName)}
                />
              </FlexItem>
            </Flex>
          ))}
        </div>
      )}

      {/* Add new attribute */}
      <div style={{ borderTop: "1px solid #ddd", paddingTop: "12px" }}>
        <Flex gap={2} style={{ marginBottom: "8px" }} align="flex-start">
          <FlexItem style={{ flex: "0 0 80px" }}>
            <TextControl
              label={__("Name", "windpress")}
              value={newAttrName}
              onChange={setNewAttrName}
              placeholder="id"
              style={{ fontSize: "12px", fontFamily: "monospace" }}
              __next40pxDefaultSize
              __nextHasNoMarginBottom
            />
          </FlexItem>
          <FlexItem style={{ flex: "1" }}>
            <TextControl
              label={__("Value", "windpress")}
              value={newAttrValue}
              onChange={setNewAttrValue}
              placeholder={__("attribute value", "windpress")}
              __next40pxDefaultSize
              __nextHasNoMarginBottom
            />
          </FlexItem>
        </Flex>
        <Button variant="secondary" onClick={addAttribute} style={{ width: "100%" }}>
          {__("Add Attribute", "windpress")}
        </Button>
      </div>

      {/* Helper text */}
      <p style={{ fontSize: "12px", color: "#757575", marginTop: "12px" }}>
        {__("Common attributes: id, data-*, aria-*, role, title, etc.", "windpress")}
      </p>
    </PanelBody>
  );
}

// Custom comparison function to prevent unnecessary re-renders
// Only re-render when attributes actually change
function arePropsEqual(prevProps, nextProps) {
  // Use lodash isEqual for deep comparison of attributes object
  return (
    prevProps.attributes === nextProps.attributes ||
    JSON.stringify(prevProps.attributes) === JSON.stringify(nextProps.attributes)
  );
}

// Memoize component with custom comparison
export default memo(AttributesPanel, arePropsEqual);
