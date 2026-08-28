import { __ } from "@wordpress/i18n";
import { PanelBody, TextControl, ToggleControl, Button } from "@wordpress/components";
import { __experimentalLinkControl as LinkControl } from "@wordpress/block-editor";
import { useState, useCallback, useMemo, useEffect, memo, useRef } from "@wordpress/element";
import { debounce } from "lodash-es";

function LinkPanel({ attributes = {}, onChange }) {
  const { href = "", target = "", rel = "" } = attributes;
  const [showLinkControl, setShowLinkControl] = useState(false);

  // Stable refs to avoid recreating debounce
  const onChangeRef = useRef(onChange);
  const attributesRef = useRef(attributes);

  useEffect(() => {
    onChangeRef.current = onChange;
    attributesRef.current = attributes;
  }, [onChange, attributes]);

  // Debounced update for text inputs to prevent excessive re-renders
  const debouncedUpdate = useMemo(
    () =>
      debounce((key, value) => {
        onChangeRef.current({
          ...attributesRef.current,
          [key]: value,
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
    (key, value) => {
      debouncedUpdate(key, value);
    },
    [debouncedUpdate],
  );

  const onLinkChange = useCallback((linkValue) => {
    const newAttrs = { ...attributesRef.current };

    if (linkValue?.url) {
      newAttrs.href = linkValue.url;

      // Handle target and rel for external links
      if (linkValue.opensInNewTab) {
        newAttrs.target = "_blank";
        newAttrs.rel = "noopener noreferrer";
      } else {
        delete newAttrs.target;
        delete newAttrs.rel;
      }
    }

    onChangeRef.current(newAttrs);
    setShowLinkControl(false);
  }, []);

  const removeLink = useCallback(() => {
    const newAttrs = { ...attributesRef.current };
    delete newAttrs.href;
    delete newAttrs.target;
    delete newAttrs.rel;
    onChangeRef.current(newAttrs);
  }, []);

  return (
    <PanelBody title={__("Link Settings", "windpress")} initialOpen={true}>
      {!showLinkControl ? (
        <>
          <TextControl
            label={__("URL", "windpress")}
            value={href}
            onChange={(value) => updateAttribute("href", value)}
            placeholder="https://example.com"
            type="url"
            __next40pxDefaultSize
            __nextHasNoMarginBottom
          />

          <Button
            variant="secondary"
            onClick={() => setShowLinkControl(true)}
            style={{ width: "100%", marginBottom: "12px" }}
          >
            {__("Choose from Posts/Pages", "windpress")}
          </Button>

          {href && (
            <>
              <ToggleControl
                label={__("Open in new tab", "windpress")}
                checked={target === "_blank"}
                onChange={(value) => {
                  if (value) {
                    updateAttribute("target", "_blank");
                    updateAttribute("rel", "noopener noreferrer");
                  } else {
                    const newAttrs = { ...attributes };
                    delete newAttrs.target;
                    delete newAttrs.rel;
                    onChange(newAttrs);
                  }
                }}
                __nextHasNoMarginBottom
              />

              <Button
                variant="secondary"
                isDestructive
                onClick={removeLink}
                style={{ width: "100%" }}
              >
                {__("Remove Link", "windpress")}
              </Button>
            </>
          )}
        </>
      ) : (
        <div>
          <LinkControl
            value={{ url: href, opensInNewTab: target === "_blank" }}
            onChange={onLinkChange}
            onRemove={removeLink}
          />
          <Button
            variant="secondary"
            onClick={() => setShowLinkControl(false)}
            style={{ width: "100%", marginTop: "8px" }}
          >
            {__("Cancel", "windpress")}
          </Button>
        </div>
      )}

      {href && (
        <p style={{ fontSize: "12px", color: "#757575", marginTop: "12px" }}>
          {__("Current URL:", "windpress")} <code>{href}</code>
        </p>
      )}
    </PanelBody>
  );
}

// Custom comparison function to prevent unnecessary re-renders
// Only re-render when relevant link attributes change
function arePropsEqual(prevProps, nextProps) {
  const prevAttrs = prevProps.attributes || {};
  const nextAttrs = nextProps.attributes || {};

  // Only compare link-related attributes
  return (
    prevAttrs.href === nextAttrs.href &&
    prevAttrs.target === nextAttrs.target &&
    prevAttrs.rel === nextAttrs.rel
  );
}

// Memoize component with custom comparison
export default memo(LinkPanel, arePropsEqual);
