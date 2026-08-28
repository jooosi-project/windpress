import { __ } from "@wordpress/i18n";
import { PanelBody, Button, TextControl } from "@wordpress/components";
import { MediaUpload, MediaUploadCheck } from "@wordpress/block-editor";
import { useCallback, useMemo, useEffect, memo, useRef } from "@wordpress/element";
import { debounce } from "lodash-es";

function ImagePanel({ attributes = {}, onChange }) {
  const { src = "", alt = "", width = "", height = "" } = attributes;

  // Stable refs to avoid recreating debounce
  const onChangeRef = useRef(onChange);
  const attributesRef = useRef(attributes);

  useEffect(() => {
    onChangeRef.current = onChange;
    attributesRef.current = attributes;
  }, [onChange, attributes]);

  const onSelectImage = useCallback((media) => {
    onChangeRef.current({
      ...attributesRef.current,
      src: media.url,
      alt: media.alt || "",
      width: media.width ? String(media.width) : "",
      height: media.height ? String(media.height) : "",
    });
  }, []);

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

  return (
    <PanelBody title={__("Image Settings", "windpress")} initialOpen={true}>
      <MediaUploadCheck>
        <MediaUpload
          onSelect={onSelectImage}
          allowedTypes={["image"]}
          value={src}
          render={({ open }) => (
            <div>
              {src && (
                <div style={{ marginBottom: "12px" }}>
                  <img
                    src={src}
                    alt={alt || ""}
                    style={{
                      width: "100%",
                      height: "auto",
                      maxHeight: "200px",
                      objectFit: "contain",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                    }}
                  />
                </div>
              )}
              <Button
                onClick={open}
                variant={src ? "secondary" : "primary"}
                style={{ width: "100%", marginBottom: "8px" }}
              >
                {src ? __("Replace Image", "windpress") : __("Select Image", "windpress")}
              </Button>
              {src && (
                <Button
                  onClick={() => updateAttribute("src", "")}
                  variant="secondary"
                  isDestructive
                  style={{ width: "100%" }}
                >
                  {__("Remove Image", "windpress")}
                </Button>
              )}
            </div>
          )}
        />
      </MediaUploadCheck>

      <TextControl
        label={__("Alt Text", "windpress")}
        value={alt}
        onChange={(value) => updateAttribute("alt", value)}
        help={__("Describe the image for accessibility", "windpress")}
        __next40pxDefaultSize
        __nextHasNoMarginBottom
      />

      <TextControl
        label={__("Width", "windpress")}
        value={width}
        onChange={(value) => updateAttribute("width", value)}
        type="number"
        __next40pxDefaultSize
        __nextHasNoMarginBottom
      />

      <TextControl
        label={__("Height", "windpress")}
        value={height}
        onChange={(value) => updateAttribute("height", value)}
        type="number"
        __next40pxDefaultSize
        __nextHasNoMarginBottom
      />
    </PanelBody>
  );
}

// Custom comparison function to prevent unnecessary re-renders
// Only re-render when relevant image attributes change
function arePropsEqual(prevProps, nextProps) {
  const prevAttrs = prevProps.attributes || {};
  const nextAttrs = nextProps.attributes || {};

  // Only compare image-related attributes
  return (
    prevAttrs.src === nextAttrs.src &&
    prevAttrs.alt === nextAttrs.alt &&
    prevAttrs.width === nextAttrs.width &&
    prevAttrs.height === nextAttrs.height
  );
}

// Memoize component with custom comparison
export default memo(ImagePanel, arePropsEqual);
