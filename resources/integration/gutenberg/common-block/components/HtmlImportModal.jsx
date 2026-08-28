import { Modal, Button } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { useState } from "@wordpress/element";
import MonacoEditor from "./MonacoEditor";

/**
 * HTML Import Modal Component
 */
function HtmlImportModal({ isOpen, onClose, onImport }) {
  const [htmlCode, setHtmlCode] = useState("");

  const handleImport = () => {
    if (!htmlCode.trim()) {
      alert(__("Please enter HTML code to import", "windpress"));
      return;
    }

    onImport(htmlCode);
    setHtmlCode("");
  };

  const handleClose = () => {
    setHtmlCode("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal
      title={__("Import HTML", "windpress")}
      onRequestClose={handleClose}
      className="windpress-html-import-modal"
      style={{ maxWidth: "800px", width: "90vw" }}
    >
      <div style={{ marginBottom: "16px" }}>
        <p style={{ marginTop: 0, color: "#757575" }}>
          {__(
            "Paste your HTML code below. It will be converted to Common Blocks automatically.",
            "windpress",
          )}
        </p>
      </div>

      <div
        style={{
          height: "400px",
          marginBottom: "16px",
          border: "1px solid #ddd",
          borderRadius: "4px",
        }}
      >
        <MonacoEditor value={htmlCode} onChange={setHtmlCode} language="html" />
      </div>

      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
        <Button variant="secondary" onClick={handleClose}>
          {__("Cancel", "windpress")}
        </Button>
        <Button variant="primary" onClick={handleImport} disabled={!htmlCode.trim()}>
          {__("Import", "windpress")}
        </Button>
      </div>
    </Modal>
  );
}

export default HtmlImportModal;
