import { debounce } from "lodash-es";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "@wordpress/element";
import { __ } from "@wordpress/i18n";

import {
  loadModernMonaco,
  MODERN_MONACO_THEMES,
} from "@/packages/core/windpress/modern-monaco";

function isGutenbergDarkMode() {
  return (
    document.documentElement.classList.contains("is-dark-theme") ||
    document.body.classList.contains("is-dark-theme")
  );
}

/**
 * Monaco Editor Component for HTML editing
 *
 * @param {Object} props
 * @param {string} props.value - Editor content
 * @param {Function} props.onChange - Callback when content changes
 * @param {string} props.language - Editor language (default: 'html')
 * @param {number} props.height - Editor height in pixels (default: 400)
 * @param {Object} props.options - Additional Monaco editor options
 */
function MonacoEditor({ value = "", onChange, language = "html", height = 400, options = {} }) {
  const editorRef = useRef(null);
  const modelRef = useRef(null);
  const monacoRef = useRef(null);
  const containerRef = useRef(null);
  const subscriptionRef = useRef(null);
  const valueRef = useRef(value);
  const preventUpdateRef = useRef(false);
  const [hasLoadError, setHasLoadError] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof document !== "undefined") {
      return isGutenbergDarkMode();
    }
    return false;
  });

  const editorOptions = useMemo(
    () => ({
      automaticLayout: true,
      minimap: { enabled: false },
      lineNumbers: "on",
      scrollBeyondLastLine: false,
      wrappingIndent: "indent",
      fontSize: 13,
      tabSize: 2,
      formatOnPaste: true,
      formatOnType: false,
      ...options,
    }),
    [options],
  );

  const debouncedOnChange = useMemo(() => {
    if (!onChange) return null;
    return debounce((value) => {
      preventUpdateRef.current = true;
      onChange(value);
    }, 500);
  }, [onChange]);

  const handleChange = useCallback(
    (currentValue) => {
      valueRef.current = currentValue;
      if (debouncedOnChange) {
        debouncedOnChange(currentValue);
      }
    },
    [debouncedOnChange],
  );
  const editorOptionsRef = useRef(editorOptions);
  const handleChangeRef = useRef(handleChange);
  const languageRef = useRef(language);

  editorOptionsRef.current = editorOptions;
  handleChangeRef.current = handleChange;
  languageRef.current = language;

  useEffect(() => {
    return () => {
      if (debouncedOnChange) {
        debouncedOnChange.cancel();
      }
    };
  }, [debouncedOnChange]);

  useEffect(() => {
    if (!containerRef.current || editorRef.current) return;

    const observer = new MutationObserver(() => {
      setIsDarkMode(isGutenbergDarkMode());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    let disposed = false;

    async function createEditor() {
      try {
        const monaco = await loadModernMonaco();

        if (disposed || !containerRef.current) return;

        const model = monaco.editor.createModel(valueRef.current, languageRef.current);
        const editor = monaco.editor.create(containerRef.current, {
          model,
          theme: isGutenbergDarkMode()
            ? MODERN_MONACO_THEMES.dark
            : MODERN_MONACO_THEMES.light,
          ...editorOptionsRef.current,
        });

        monacoRef.current = monaco;
        modelRef.current = model;
        editorRef.current = editor;
        subscriptionRef.current = editor.onDidChangeModelContent(() => {
          handleChangeRef.current(editor.getValue());
        });
      } catch {
        if (!disposed) {
          setHasLoadError(true);
        }
      }
    }

    void createEditor();

    return () => {
      disposed = true;
      observer.disconnect();
      if (subscriptionRef.current) {
        subscriptionRef.current.dispose();
        subscriptionRef.current = null;
      }
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
      }
      if (modelRef.current) {
        modelRef.current.dispose();
        modelRef.current = null;
      }
      monacoRef.current = null;
    };
  }, []);

  useEffect(() => {
    monacoRef.current?.editor.setTheme(
      isDarkMode ? MODERN_MONACO_THEMES.dark : MODERN_MONACO_THEMES.light,
    );
  }, [isDarkMode]);

  useEffect(() => {
    if (monacoRef.current && modelRef.current) {
      monacoRef.current.editor.setModelLanguage(modelRef.current, language);
    }
  }, [language]);

  useEffect(() => {
    editorRef.current?.updateOptions(editorOptions);
  }, [editorOptions]);

  useEffect(() => {
    if (preventUpdateRef.current) {
      preventUpdateRef.current = false;
      return;
    }

    if (value === valueRef.current) {
      return;
    }

    if (!editorRef.current) {
      valueRef.current = value;
      return;
    }

    if (editorRef.current) {
      const editor = editorRef.current;
      const currentValue = editor.getValue();

      if (value !== currentValue) {
        const position = editor.getPosition();
        const selection = editor.getSelection();

        editor.setValue(value);
        valueRef.current = value;

        if (position) {
          editor.setPosition(position);
        }
        if (selection) {
          editor.setSelection(selection);
        }
        editor.focus();
      }
    }
  }, [value]);

  return (
    <div
      style={{
        height: `${height}px`,
        border: "1px solid #ddd",
        borderRadius: "4px",
        overflow: "hidden",
      }}
    >
      {hasLoadError ? (
        <div
          role="alert"
          style={{
            alignItems: "center",
            display: "flex",
            height: "100%",
            justifyContent: "center",
            padding: "16px",
            textAlign: "center",
          }}
        >
          {__("The code editor could not be loaded.", "windpress")}
        </div>
      ) : (
        <div ref={containerRef} style={{ height: "100%" }} />
      )}
    </div>
  );
}

function arePropsEqual(prevProps, nextProps) {
  return (
    prevProps.value === nextProps.value &&
    prevProps.onChange === nextProps.onChange &&
    prevProps.language === nextProps.language &&
    prevProps.height === nextProps.height &&
    JSON.stringify(prevProps.options) === JSON.stringify(nextProps.options)
  );
}

export default memo(MonacoEditor, arePropsEqual);
