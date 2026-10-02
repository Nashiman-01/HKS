export function getCopyableAnswerText(content, excludedHeading = "") {
  const blocks = String(content || "").split(/\n{2,}/);
  const heading = excludedHeading ? `${excludedHeading.trim()}:` : "";
  return blocks
    .filter((block) => !heading || !block.trimStart().startsWith(heading))
    .join("\n\n")
    .trim();
}

export async function copyTextToClipboard(text, { clipboard = globalThis.navigator?.clipboard, documentRef = globalThis.document } = {}) {
  if (!String(text || "").trim()) return false;

  try {
    if (clipboard?.writeText) {
      await clipboard.writeText(text);
      return true;
    }
  } catch {
    // Try the legacy browser copy path below.
  }

  if (!documentRef?.body || !documentRef.execCommand) return false;

  const textArea = documentRef.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  let attached = false;
  try {
    documentRef.body.appendChild(textArea);
    attached = true;
    textArea.select();
    return documentRef.execCommand("copy");
  } catch {
    return false;
  } finally {
    if (attached) documentRef.body.removeChild(textArea);
  }
}