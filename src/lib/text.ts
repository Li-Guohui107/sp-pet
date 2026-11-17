const MARKER = /\[\[open:(desktop|look|phone)\]\]/g;

export function visibleReply(text: string) {
  return text.replace(MARKER, "").replace(/\[\[open:[^\]]*$/g, "").trim();
}

export function openedTab(text: string) {
  const hits = [...text.matchAll(/\[\[open:(desktop|look|phone)\]\]/g)];
  const last = hits.at(-1);
  if (last?.[1] === "desktop" || last?.[1] === "look" || last?.[1] === "phone") return last[1];
  return null;
}
