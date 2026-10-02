export function sendRecognizedTranscript(transcript, language, sendMessage) {
  const content = String(transcript || "").trim();
  if (!content || typeof sendMessage !== "function") return false;
  return sendMessage(content, language);
}