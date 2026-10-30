/**
 * Browser-side cleanup for HTML pasted into the blog editor: keeps headings, paragraphs, lists, quotes,
 * bold/italic/underline/strike and links, and drops styles, classes, fonts, spans and wrapper divs.
 * The server runs the authoritative cleanup again on save (lib/blogHtml.ts).
 */
const KEEP = new Set(["H1", "H2", "H3", "H4", "P", "BR", "UL", "OL", "LI", "BLOCKQUOTE", "STRONG", "EM", "U", "S", "A", "IMG"]);
const RENAME: Record<string, string> = { B: "STRONG", I: "EM", STRIKE: "S", DEL: "S" };
const DROP = new Set(["SCRIPT", "STYLE", "META", "LINK", "TITLE", "HEAD"]);

function clean(node: Node, doc: Document): Node {
  const frag = doc.createDocumentFragment();
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      frag.appendChild(doc.createTextNode(child.textContent || ""));
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return;
    const el = child as HTMLElement;
    if (DROP.has(el.tagName)) return;

    const tag = RENAME[el.tagName] || el.tagName;
    if (!KEEP.has(tag)) {
      frag.appendChild(clean(el, doc)); // unwrap (span, font, div, ...)
      return;
    }
    const out = doc.createElement(tag.toLowerCase());
    if (tag === "A") {
      const href = el.getAttribute("href") || "";
      if (/^(https?:|mailto:|tel:)/i.test(href)) out.setAttribute("href", href);
    }
    if (tag === "IMG") {
      const src = el.getAttribute("src") || "";
      if (!/^https?:/i.test(src)) return;
      out.setAttribute("src", src);
      out.setAttribute("alt", el.getAttribute("alt") || "");
    } else {
      out.appendChild(clean(el, doc));
    }
    frag.appendChild(out);
  });
  return frag;
}

/** Returns cleaned HTML for pasted clipboard HTML. */
export function cleanPastedHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const holder = document.createElement("div");
  holder.appendChild(clean(doc.body, document));
  return holder.innerHTML;
}
