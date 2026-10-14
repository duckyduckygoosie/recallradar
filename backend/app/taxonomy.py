from __future__ import annotations

import re

# Deterministic lexical labels describe terms in FDA text, not verified causes.
RULES: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("Manufacturing / assembly", ("manufacturing", "assembly", "welding", "solder", "fabrication", "production")),
    ("Material / component", ("material", "component", "fracture", "crack", "corrosion", "contamination")),
    ("Labeling / packaging", ("label", "labeling", "packaging", "instructions for use", "sterile barrier")),
    ("Software / firmware", ("software", "firmware", "programming", "algorithm", "cybersecurity")),
    ("Design", ("design", "specification", "tolerance")),
    ("Sterility", ("sterility", "sterile", "sterilization")),
)


def classify_failure(text: str | None) -> tuple[str, float, list[str]]:
    source = (text or "").strip()
    lowered = source.casefold()
    hits: list[str] = []
    labels: list[str] = []
    for label, phrases in RULES:
        matched = [phrase for phrase in phrases if re.search(r"(?<!\w)" + re.escape(phrase) + r"(?!\w)", lowered)]
        if matched:
            labels.append(label)
            hits.extend(matched)
    if not labels:
        return "Unknown", 0.0, []
    # Confidence is a deterministic lexical-match strength, not probability of cause.
    confidence = min(0.85, 0.45 + 0.1 * (len(labels) - 1) + 0.03 * (len(hits) - 1))
    category = labels[0] if len(labels) == 1 else "Multiple: " + "; ".join(labels)
    return category, round(confidence, 2), hits
