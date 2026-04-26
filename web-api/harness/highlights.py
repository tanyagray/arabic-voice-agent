"""Per-flow flavour-word highlighter.

The onboarding agent writes English text peppered with the occasional
Arabic word (`marhaban`, `duroos`, …). The frontend tints those spans
and shows a tooltip with the meaning. Rather than asking the agent to
return `highlights` arrays, the harness scans each text bubble against
a per-flow vocab and computes the offsets server-side.
"""

import re

ONBOARDING_VOCAB: dict[str, str] = {
    "marhaban": "hello",
    "mishmish": "apricot",
    "duroos": "lessons",
    "dars": "lesson",
    "ahlan": "welcome",
    "mumtaz": "excellent",
    "mashallah": "wonderful",
}

FLOW_VOCAB: dict[str, dict[str, str]] = {
    "onboarding": ONBOARDING_VOCAB,
}


def compute_highlights(text: str, flow: str | None) -> list[dict]:
    """Find flavour words in `text`, return DB-shaped highlight rows.

    Case-insensitive match on whole words. Longest words first so a
    multi-word vocab entry would win over a substring; non-overlapping
    so we never double-tint a span.
    """
    if not flow or flow not in FLOW_VOCAB:
        return []
    vocab = FLOW_VOCAB[flow]
    claimed: list[tuple[int, int]] = []
    rows: list[dict] = []
    for word in sorted(vocab, key=len, reverse=True):
        pattern = rf"\b{re.escape(word)}\b"
        for m in re.finditer(pattern, text, re.IGNORECASE):
            start, end = m.start(), m.end()
            if any(s < end and start < e for s, e in claimed):
                continue
            rows.append(
                {
                    "word": m.group(),
                    "meaning": vocab[word],
                    "start": start,
                    "end": end,
                }
            )
            claimed.append((start, end))
    rows.sort(key=lambda h: h["start"])
    return rows
