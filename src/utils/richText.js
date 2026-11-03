const ALLOWED_TAGS = new Set(["A", "B", "BLOCKQUOTE", "BR", "DIV", "EM", "H2", "H3", "I", "LI", "OL", "P", "STRONG", "U", "UL"]);
const DROP_TAGS = new Set(["IFRAME", "OBJECT", "SCRIPT", "STYLE", "SVG", "TEMPLATE"]);

export function sanitizeRichText(value = "") {
  const document = new DOMParser().parseFromString(String(value), "text/html");

  const cleanNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent || "");
    if (node.nodeType !== Node.ELEMENT_NODE) return document.createDocumentFragment();

    const tag = node.tagName;
    if (DROP_TAGS.has(tag)) return document.createDocumentFragment();

    const children = Array.from(node.childNodes, cleanNode);
    if (!ALLOWED_TAGS.has(tag)) {
      const fragment = document.createDocumentFragment();
      children.forEach((child) => fragment.append(child));
      return fragment;
    }

    const element = document.createElement(tag.toLowerCase());
    if (tag === "A") {
      const href = node.getAttribute("href");
      if (href) {
        try {
          const url = new URL(href, window.location.origin);
          if (["http:", "https:", "mailto:"].includes(url.protocol)) {
            element.setAttribute("href", url.href);
            element.setAttribute("target", "_blank");
            element.setAttribute("rel", "noopener noreferrer");
          }
        } catch {
          // Invalid links are omitted while their text remains.
        }
      }
    }
    children.forEach((child) => element.append(child));
    return element;
  };

  const fragment = document.createDocumentFragment();
  Array.from(document.body.childNodes, cleanNode).forEach((node) => fragment.append(node));
  const container = document.createElement("div");
  container.append(fragment);
  return container.innerHTML;
}
