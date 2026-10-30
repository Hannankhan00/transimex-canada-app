import sanitizeHtml from "sanitize-html";

/**
 * Cleans blog article HTML before it is stored.
 * Keeps only what the blog editor can produce (headings, paragraphs, lists, quotes, bold/italic/underline/strike,
 * links, images, highlights and the editorial note box) and repairs the problems pasted web content causes:
 * style/class/font junk, headings left open around paragraphs, loose text without a paragraph, empty tags.
 */

const BLOCK_TAGS = new Set(["p", "h1", "h2", "h3", "h4", "ul", "ol", "blockquote", "div", "hr"]);
const HEADING = /^h[1-4]$/;
const EMPTY_TAGS = "p|h[1-4]|strong|em|u|s|mark|li|blockquote";

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    "h1", "h2", "h3", "h4", "p", "br", "hr", "strong", "em", "u", "s", "mark",
    "ul", "ol", "li", "blockquote", "a", "img", "div",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "width", "height"],
    mark: ["class"],
    div: ["class"],
  },
  allowedClasses: { mark: ["highlight-mark"], div: ["blog-annotation"] },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowProtocolRelative: false,
  transformTags: {
    b: "strong",
    i: "em",
    strike: "s",
    del: "s",
    // Plain divs only add wrapper noise; unwrap them (only the editorial note box is kept).
    div: (tagName, attribs) =>
      /\bblog-annotation\b/.test(attribs.class || "")
        ? { tagName: "div", attribs: { class: "blog-annotation" } }
        : { tagName: "span", attribs: {} as sanitizeHtml.Attributes },
    a: (tagName, attribs) => ({
      tagName,
      attribs: attribs.target === "_blank" ? { ...attribs, rel: "noopener noreferrer" } : attribs,
    }),
  },
};

/** Closes headings before block content inside them, drops their stray closing tags, and wraps loose inline runs in <p>. */
function restructure(html: string): string {
  const out: string[] = [];
  const stack: string[] = [];
  let loose: string[] = [];

  const flushLoose = () => {
    const text = loose.join("");
    loose = [];
    const plain = text.replace(/<br\s*\/?>|&nbsp;|\s/gi, "");
    if (!plain) return;
    // A double line break inside loose text starts a new paragraph.
    text
      .split(/(?:<br\s*\/?>\s*){2,}/i)
      .map((part) => part.replace(/^(\s|<br\s*\/?>)+|(\s|<br\s*\/?>)+$/gi, ""))
      .filter(Boolean)
      .forEach((part) => out.push(`<p>${part}</p>`));
  };

  const tokens = html.match(/<[^>]+>|[^<]+/g) ?? [];
  for (const token of tokens) {
    const tag = /^<\/?([a-z0-9]+)/i.exec(token)?.[1]?.toLowerCase();
    const closing = token.startsWith("</");
    const isVoid = tag === "br" || tag === "hr" || tag === "img";

    if (!tag) {
      (stack.length ? out : loose).push(token);
      continue;
    }

    if (!closing && BLOCK_TAGS.has(tag)) {
      if (!stack.length) flushLoose();
      // A heading still open when a block starts: close it first (dropping a trailing <br>).
      // A paragraph cannot contain another block.
      const pAt = stack.lastIndexOf("p");
      if (pAt !== -1) {
        while (stack.length > pAt + 1) out.push(`</${stack.pop()}>`);
        out.push(`</${stack.pop()}>`);
      }
      const open = stack.findLastIndex((t) => HEADING.test(t));
      if (open !== -1) {
        while (stack.length > open + 1) out.push(`</${stack.pop()}>`);
        const h = stack.pop()!;
        while (out.length && /^<br\s*\/?>$/i.test(out[out.length - 1])) out.pop();
        out.push(`</${h}>`);
      }
      if (tag === "hr") {
        out.push(token);
        continue;
      }
      stack.push(tag);
      out.push(token);
      continue;
    }

    if (closing) {
      const at = stack.lastIndexOf(tag);
      if (at === -1) {
        // Inline tag closing at the top level belongs to the loose text; any other stray closing tag
        // (e.g. the </h2> of a heading we already closed) is dropped.
        if (!stack.length && !BLOCK_TAGS.has(tag)) loose.push(token);
        continue;
      }
      while (stack.length > at + 1) out.push(`</${stack.pop()}>`);
      stack.pop();
      out.push(token);
      continue;
    }

    // Inline element or void tag.
    if (!stack.length) {
      loose.push(token);
    } else {
      out.push(token);
      if (!isVoid && !closing) stack.push(tag);
    }
  }
  while (stack.length) out.push(`</${stack.pop()}>`);
  flushLoose();
  return out.join("");
}

/**
 * Pasted content often stores a section as <h2>Title<br>body line<br>body line</h2>.
 * The text before the first <br> is the heading; each following line becomes its own paragraph.
 */
function splitHeadingBodies(html: string): string {
  const br = /<br\s*\/?>/i;
  return html.replace(/<(h[1-4])>([^]*?)<\/\1>/g, (whole, tag: string, inner: string) => {
    const parts = inner.split(br).map((part) => part.trim()).filter(Boolean);
    if (parts.length < 2 || !br.test(inner)) return whole;
    return `<${tag}>${parts[0]}</${tag}>` + parts.slice(1).map((part) => `<p>${part}</p>`).join("");
  });
}

export function cleanBlogHtml(input: unknown): string {
  if (typeof input !== "string" || !input.trim()) return "";
  let html = sanitizeHtml(input, sanitizeOptions);
  html = restructure(html);
  html = splitHeadingBodies(html);
  // Remove empty tags (repeat: removing one can empty its parent) and collapse runs of blank paragraphs.
  const empty = new RegExp(String.raw`<(${EMPTY_TAGS})>(?:\s|&nbsp;|<br\s*/?>|\u00a0)*</\1>`, "gi");
  for (let i = 0; i < 5; i++) {
    const next = html.replace(empty, "");
    if (next === html) break;
    html = next;
  }
  return html.trim();
}
