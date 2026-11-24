/**
 * Render the deliberately limited Markdown subset used by literary AI replies.
 * Raw HTML is always escaped; only locally generated tags can reach Angular's
 * sanitized [innerHTML] binding. No images, embeds or executable HTML are allowed.
 */
const escapes: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => escapes[character]);
}

function inline(source: string): string {
  // Split at inline code first so emphasis and link markers inside code remain literal.
  return source.split(/(\x60[^\x60\n]+\x60)/g).map((part) => {
    if (part.startsWith('\x60') && part.endsWith('\x60') && part.length > 2) {
      return '<code>' + escapeHtml(part.slice(1, -1)) + '</code>';
    }
    let safe = escapeHtml(part);
    safe = safe.replace(/\[([^\]\n]{1,200})\]\((https?:\/\/[^\s)]+)\)/gi,
      (whole, label: string, destination: string) => {
        // A strict scheme allowlist and attribute escaping prevent active URLs.
        try {
          const parsed = new URL(destination.replace(/&amp;/g, '&'));
          if (!['https:', 'http:'].includes(parsed.protocol)) return whole;
          return '<a href="' + escapeHtml(parsed.href) +
            '" target="_blank" rel="noopener noreferrer nofollow">' + label + '</a>';
        } catch {
          return whole;
        }
      });
    safe = safe.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    safe = safe.replace(/__([^_\n]+)__/g, '<strong>$1</strong>');
    safe = safe.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
    return safe;
  }).join('');
}

function isSpecial(line: string): boolean {
  return /^ {0,3}(?:#{1,4}\s|[-*+]\s|\d+[.)]\s|>\s?|[\x60]{3}|~{3}|(?:-{3,}|\*{3,})\s*$)/.test(line);
}

/** A safe, compact renderer; not an unrestricted CommonMark/HTML interpreter. */
export function renderLiteraryMarkdown(source: string): string {
  const lines = source.replace(/\r\n?/g, '\n').slice(0, 20000).split('\n');
  const html: string[] = [];
  for (let i = 0; i < lines.length;) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    const fence = /^ {0,3}([\x60]{3}|~{3})/.exec(line);
    if (fence) {
      const marker = fence[1][0], count = fence[1].length;
      const code: string[] = [];
      i++;
      while (i < lines.length && !new RegExp('^ {0,3}' + marker +
        '{' + count + ',}\\s*$').test(lines[i])) code.push(lines[i++]);
      if (i < lines.length) i++;
      html.push('<pre><code>' + escapeHtml(code.join('\n')) + '</code></pre>');
      continue;
    }

    const heading = /^ {0,3}(#{1,4})\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) {
      const depth = Math.min(heading[1].length + 1, 5);
      html.push('<h' + depth + '>' + inline(heading[2]) + '</h' + depth + '>');
      i++; continue;
    }

    if (/^ {0,3}(?:-{3,}|\*{3,})\s*$/.test(line)) {
      html.push('<hr>'); i++; continue;
    }

    const marker = /^ {0,3}([-*+]|\d+[.)])\s+(.+)$/.exec(line);
    if (marker) {
      const ordered = /^\d/.test(marker[1]);
      const tag = ordered ? 'ol' : 'ul';
      const items: string[] = [];
      while (i < lines.length) {
        const item = /^ {0,3}([-*+]|\d+[.)])\s+(.+)$/.exec(lines[i]);
        if (!item || /^\d/.test(item[1]) !== ordered) break;
        items.push('<li>' + inline(item[2]) + '</li>');
        i++;
      }
      html.push('<' + tag + '>' + items.join('') + '</' + tag + '>');
      continue;
    }

    if (/^ {0,3}>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^ {0,3}>\s?/.test(lines[i])) {
        quote.push(lines[i++].replace(/^ {0,3}>\s?/, ''));
      }
      html.push('<blockquote><p>' + inline(quote.join(' ')) + '</p></blockquote>');
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() && (!paragraph.length || !isSpecial(lines[i]))) {
      paragraph.push(lines[i++].trim());
    }
    html.push('<p>' + inline(paragraph.join(' ')) + '</p>');
  }
  return html.join('\n');
}
