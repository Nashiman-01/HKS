import { useRef, useState } from "react";
import Icon from "../components/Icon.jsx";
import { DOCUMENT_ACCEPT, DOCUMENT_MAX_SIZE } from "../services/documents.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

const statusKeys = {
  selected: "documents.selected",
  uploading: "documents.uploading",
  uploaded: "documents.uploaded",
  processing: "documents.processing",
  ready: "documents.ready",
  failed: "documents.failed",
};

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function errorKeyFor(document) {
  if (document.errorKey) return document.errorKey;
  if (document.status === "processing") return "documents.processingNote";
  if (document.status === "ready") return "documents.readyNote";
  if (document.status === "uploaded") return "documents.uploadedNote";
  return "";
}

export default function Documents({ documents, loadError = "", onUpload, onRetry, onRemove, onAttach }) {
  const { t } = useLanguage();
  const inputRef = useRef(null);
  const [selectionError, setSelectionError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [operationError, setOperationError] = useState("");

  async function addFiles(files) {
    setSelectionError("");
    for (const file of files) {
      const result = await onUpload(file);
      if (result?.errorKey) setSelectionError(result.errorKey);
    }
  }

  function onInputChange(event) {
    addFiles(Array.from(event.target.files || []));
    event.target.value = "";
  }

  function onDrop(event) {
    event.preventDefault();
    setDragging(false);
    addFiles(Array.from(event.dataTransfer.files || []));
  }

  async function removeFile(document) {
    setOperationError("");
    if (!await onRemove(document.localId)) setOperationError("documents.deleteError");
  }

  return (
    <section className="workspace-page documents-page" aria-labelledby="documents-title">
      <header className="workspace-page-heading">
        <p className="app-eyebrow">{t("chat.workspace")}</p>
        <h2 id="documents-title">{t("documents.title")}</h2>
        <p>{t("documents.intro")}</p>
      </header>

      <div
        className={`document-dropzone ${dragging ? "is-dragging" : ""}`}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <span className="icon-badge icon-badge-large" aria-hidden="true"><Icon name="file" size={25} /></span>
        <div className="document-drop-copy">
          <h3>{t("documents.uploadHeading")}</h3>
          <p>{t("documents.accepted", { size: formatBytes(DOCUMENT_MAX_SIZE) })}</p>
        </div>
        <input ref={inputRef} className="visually-hidden" type="file" accept={DOCUMENT_ACCEPT} multiple onChange={onInputChange} aria-label={t("documents.choose")} />
        <button className="app-button app-button-primary" type="button" onClick={() => inputRef.current?.click()}>
          <Icon name="plus" size={18} />{t("documents.choose")}
        </button>
      </div>
      {selectionError && <p className="document-selection-error" role="alert">{t(selectionError)}</p>}
      {loadError && <p className="document-selection-error" role="alert">{t(loadError)}</p>}
      {operationError && <p className="document-selection-error" role="alert">{t(operationError)}</p>}

      <div className="documents-list-section">
        <div className="dashboard-section-head document-list-heading">
          <div><p className="app-eyebrow">{t("chat.workspace")}</p><h2>{t("documents.listTitle")}</h2></div>
          <span className="documents-count">{documents.length}</span>
        </div>
        {documents.length === 0 ? (
          <div className="documents-empty" role="status">
            <Icon name="file" size={22} />
            <p>{t("documents.empty")}</p>
          </div>
        ) : (
          <ul className="documents-list">
            {documents.map((document) => (
              <li className="document-row" key={document.localId}>
                <span className="document-file-icon" aria-hidden="true"><Icon name="file" size={20} /></span>
                <div className="document-file-info">
                  <strong title={document.name}>{document.name}</strong>
                  <span>{document.type || t("documents.unknownType")} · {formatBytes(document.size)}</span>
                  {document.status === "uploading" && (
                    <progress className="document-progress" max="100" value={document.progress} aria-label={t("documents.progress", { percent: document.progress })} />
                  )}
                  {errorKeyFor(document) && <small className={document.status === "failed" ? "document-error" : "document-note"} role={document.status === "failed" ? "alert" : undefined}>{t(errorKeyFor(document))}</small>}
                </div>
                <span className={`document-status document-status-${document.status}`} role="status">{t(statusKeys[document.status] || "documents.failed")}</span>
                <div className="document-actions">
                  {document.status === "failed" && document.file && (
                    <button className="app-icon-button" type="button" title={t("documents.retry")} aria-label={`${t("documents.retry")}: ${document.name}`} onClick={() => onRetry(document)}><Icon name="restart" size={18} /></button>
                  )}
                  {document.backendId && (
                    <button className="app-icon-button" type="button" title={t("documents.attach")} aria-label={`${t("documents.attach")}: ${document.name}`} onClick={() => onAttach(document)}><Icon name="paperclip" size={18} /></button>
                  )}
                  <button className="app-icon-button document-remove" type="button" title={t("documents.remove")} aria-label={`${t("documents.remove")} ${document.name}`} onClick={() => removeFile(document)}><Icon name="close" size={17} /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="documents-persistence-note">{t("documents.sessionNote")}</p>
      </div>
    </section>
  );
}
