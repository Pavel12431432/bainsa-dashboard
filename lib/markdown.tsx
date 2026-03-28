export function linkSources(lines: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const srcMatch = lines[i].match(/^\*\*Source:\*\*\s*(.+)/);
    if (srcMatch) {
      const next = lines[i + 1]?.trim() === "" ? lines[i + 2] : lines[i + 1];
      const linkMatch = next?.match(/^\*\*Link:\*\*\s*(https?:\/\/\S+)/);
      if (linkMatch) {
        const url = linkMatch[1];
        const name = srcMatch[1];
        out.push(`**Source:** <a href="${url}" target="_blank" rel="noopener noreferrer" class="underline opacity-80 hover:opacity-100">${name}</a>`);
        i += lines[i + 1]?.trim() === "" ? 2 : 1;
        continue;
      }
    }
    out.push(lines[i]);
  }
  return out;
}

export function renderMarkdown(text: string) {
  const lines = linkSources(text.split("\n"));
  return lines.map((line, i) => {
    if (line.startsWith("# "))
      return <p key={i} className="text-[0.8rem] font-bold text-brand-white mt-4 mb-1.5">{line.slice(2)}</p>;
    if (line.startsWith("## "))
      return <p key={i} className="text-xs font-bold text-brand-white opacity-90 mt-3.5 mb-1">{line.slice(3)}</p>;
    if (line.startsWith("### "))
      return <p key={i} className="text-[0.7rem] font-bold text-brand-white opacity-70 mt-2.5 mb-0.5">{line.slice(4)}</p>;
    if (line.startsWith("---"))
      return <hr key={i} className="border-none border-t border-[#1f1f1f] my-2.5" />;
    if (line.trim() === "")
      return <div key={i} className="h-1.5" />;
    const boldLine = line
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (_, text, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer" class="underline opacity-80 hover:opacity-100">${text}</a>`)
      .replace(/\*\*(.+?)\*\*/g, (_, m) => `<strong>${m}</strong>`);
    return (
      <p
        key={i}
        className="text-[0.7rem] text-brand-white opacity-55 my-0.5 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: boldLine }}
      />
    );
  });
}
