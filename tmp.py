from pathlib import Path

for html in Path(".").glob("*.html"):
    text = html.read_text(encoding="utf-8")

    if 'href="archive.html"' in text:
        continue

    old = '<li><a href="information.html">Practical Info.</a></li>'
    new = old + '\n            <li><a href="archive.html">Archive</a></li>'

    if old in text:
        text = text.replace(old, new)
        html.write_text(text, encoding="utf-8")
        print(f"Updated: {html}")
