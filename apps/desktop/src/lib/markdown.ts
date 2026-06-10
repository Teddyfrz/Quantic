// Rendu Markdown minimal et sûr : on échappe d'abord le HTML, puis on applique
// un sous-ensemble (titres, gras, italique, code, listes, citations, liens, hr).
// Comme tout est échappé en amont, aucun HTML utilisateur n'est injecté.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inline(s: string): string {
  return s
    // code `...`
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // gras **...**
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    // italique *...*
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    // liens [texte](url) — http(s) ou mailto uniquement
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>');
}

export function renderMarkdown(src: string): string {
  const escaped = escapeHtml(src);
  const lines = escaped.split(/\r?\n/);
  const html: string[] = [];
  let inList: "ul" | "ol" | null = null;
  let inCode = false;
  const codeBuf: string[] = [];

  const closeList = () => {
    if (inList) { html.push(`</${inList}>`); inList = null; }
  };

  for (const raw of lines) {
    const line = raw;

    // bloc de code ```
    if (/^```/.test(line.trim())) {
      if (inCode) { html.push(`<pre><code>${codeBuf.join("\n")}</code></pre>`); codeBuf.length = 0; inCode = false; }
      else { closeList(); inCode = true; }
      continue;
    }
    if (inCode) { codeBuf.push(line); continue; }

    if (line.trim() === "") { closeList(); continue; }

    // séparateur
    if (/^---+$/.test(line.trim())) { closeList(); html.push("<hr/>"); continue; }

    // titres
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) { closeList(); const lvl = h[1].length; html.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`); continue; }

    // citation
    if (/^>\s?/.test(line)) { closeList(); html.push(`<blockquote>${inline(line.replace(/^>\s?/, ""))}</blockquote>`); continue; }

    // liste à puces
    const ul = /^[-*]\s+(.*)$/.exec(line);
    if (ul) { if (inList !== "ul") { closeList(); html.push("<ul>"); inList = "ul"; } html.push(`<li>${inline(ul[1])}</li>`); continue; }

    // liste numérotée
    const ol = /^\d+\.\s+(.*)$/.exec(line);
    if (ol) { if (inList !== "ol") { closeList(); html.push("<ol>"); inList = "ol"; } html.push(`<li>${inline(ol[1])}</li>`); continue; }

    // paragraphe
    closeList();
    html.push(`<p>${inline(line)}</p>`);
  }
  if (inCode) html.push(`<pre><code>${codeBuf.join("\n")}</code></pre>`);
  closeList();
  return html.join("\n");
}
