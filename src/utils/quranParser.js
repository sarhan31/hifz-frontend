export function splitAyahIntoWords(text) {
  return text.trim().split(/\s+/).map((word, index) => ({
    id: index,
    text: word,
    status: "hidden"
  }));
}
