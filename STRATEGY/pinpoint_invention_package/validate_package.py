#!/usr/bin/env python3
import argparse
import csv
import re
import sys
from pathlib import Path


REQUIRED_FILES = [
    "01_pinpoint_employee_invention_report_ko.md",
    "02_pinpoint_evidence_matrix.csv",
    "03_pinpoint_claim_support_map.md",
    "04_pinpoint_scope_guardrails.md",
    "05_pinpoint_figure_manifest.md",
    "06_pinpoint_docx_population_guide.md",
]

REQUIRED_HEADINGS = [
    "1.",
    "2.",
    "3.",
    "4.",
    "5.",
    "6.",
    "7.",
    "8.",
    "9.",
    "10.",
    "11.",
    "12.",
    "13.",
    "Appendix A",
    "Appendix B",
]

STATIC_FORBIDDEN_PATTERNS = [
    re.compile(r"\b\d+(?:\.\d+)?\s*(?:x|times|%)\s+(?:improvement|faster|reduction|decrease|increase)\b", re.IGNORECASE),
]

REQUIRED_EVIDENCE_IDS = {
    "refPoint",
    "refScreen",
    "forward_transform",
    "inverse_transform",
    "click_reprojection",
    "same_image_multi_point",
    "minimap_reuse",
    "pin_pan_split",
    "shift_only_reorder",
    "state_preserving_reorder",
    "rect_zoom",
    "two_point_leveling",
    "layout_ceiling_24",
    "report_capture_linkage",
}

CLAIM_SUPPORT_COMPONENTS = {
    "Anchored Reference Point",
    "Shared Screen Reference",
    "Forward Transform",
    "Inverse Transform",
    "State-Preserving Reorder",
    "Pin/Pan Split",
    "Rect-Zoom",
    "Two-Point Leveling",
    "Minimap Reuse",
    "Same-Image Multi-Point Use",
}

FIGURE_TITLES = {
    "Figure 1",
    "Figure 2",
    "Figure 3",
    "Figure 4",
    "Figure 5",
    "Figure 6",
    "Figure 7",
    "Figure 8",
}


def find_heading(text: str, heading: str) -> bool:
    pattern = re.compile(rf"^#+\s*{re.escape(heading)}(?:\s|$)|^{re.escape(heading)}(?:\s|$)", re.MULTILINE)
    return bool(pattern.search(text))


def check_required_files(root: Path) -> list[str]:
    errors = []
    for name in REQUIRED_FILES:
        if not (root / name).exists():
            errors.append(f"missing required file: {name}")
    return errors


def check_report_schema(root: Path) -> list[str]:
    report = root / "01_pinpoint_employee_invention_report_ko.md"
    if not report.exists():
        return []
    text = report.read_text(encoding="utf-8")
    errors = []
    for heading in REQUIRED_HEADINGS:
        if not find_heading(text, heading):
            errors.append(f"missing required heading in report: {heading}")
    return errors


def check_forbidden_phrases(root: Path) -> list[str]:
    errors = []
    excluded = {
        "04_pinpoint_scope_guardrails.md",
        "06_pinpoint_docx_population_guide.md",
    }
    patterns = list(STATIC_FORBIDDEN_PATTERNS)
    guardrails = root / "04_pinpoint_scope_guardrails.md"
    if guardrails.exists():
        text = guardrails.read_text(encoding="utf-8")
        in_block = False
        for line in text.splitlines():
            stripped = line.strip()
            if stripped == "## Do Not Claim":
                in_block = True
                continue
            if in_block and stripped.startswith("## "):
                break
            if in_block and stripped.startswith("- "):
                phrase = stripped[2:].strip().strip("`")
                if phrase:
                    patterns.append(re.compile(re.escape(phrase), re.IGNORECASE))
    for path in root.glob("*.md"):
        if path.name in excluded:
            continue
        text = path.read_text(encoding="utf-8")
        for pattern in patterns:
            for match in pattern.finditer(text):
                snippet = match.group(0)
                errors.append(f"forbidden phrase in {path.name}: {snippet}")
    return errors


def check_scope_guardrails(root: Path) -> list[str]:
    path = root / "04_pinpoint_scope_guardrails.md"
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8")
    required_sections = [
        "## In Scope",
        "## Context Only",
        "## Future Only",
        "## Do Not Claim",
        "## Controlled Wording",
    ]
    errors = []
    for section in required_sections:
        if section not in text:
            errors.append(f"missing guardrail section: {section}")
    return errors


def check_evidence_matrix(root: Path) -> list[str]:
    path = root / "02_pinpoint_evidence_matrix.csv"
    if not path.exists():
        return []
    errors = []
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        rows = list(reader)
    ids = set()
    for row in rows:
        evidence_id = (row.get("evidence_id") or "").strip()
        if evidence_id in ids:
            errors.append(f"duplicate evidence id: {evidence_id}")
        ids.add(evidence_id)
        if not evidence_id:
            errors.append("evidence matrix row missing evidence_id")
        if not (row.get("source_path") or "").strip():
            errors.append(f"evidence row missing source_path: {evidence_id}")
        if not (row.get("line_anchor") or "").strip():
            errors.append(f"evidence row missing line_anchor: {evidence_id}")
        elif not re.search(r"\d", row.get("line_anchor") or ""):
            errors.append(f"evidence row has non-specific line_anchor: {evidence_id}")
    for required_id in sorted(REQUIRED_EVIDENCE_IDS):
        if required_id not in ids:
            errors.append(f"missing required evidence id: {required_id}")
    return errors


def check_claim_support_map(root: Path) -> list[str]:
    path = root / "03_pinpoint_claim_support_map.md"
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8")
    errors = []
    for component in CLAIM_SUPPORT_COMPONENTS:
        if f"## {component}" not in text:
            errors.append(f"missing claim support component: {component}")
    matrix_path = root / "02_pinpoint_evidence_matrix.csv"
    if matrix_path.exists():
        with matrix_path.open("r", encoding="utf-8", newline="") as handle:
            reader = csv.DictReader(handle)
            valid_ids = {row.get("evidence_id", "").strip() for row in reader}
        for match in re.findall(r"`([A-Za-z0-9_\-]+)`", text):
            if match not in valid_ids and match.startswith(("ref", "forward", "inverse", "click", "same", "mini", "pin", "shift", "state", "rect", "two", "layout", "report")):
                errors.append(f"claim support references missing evidence id: {match}")
    return errors


def check_baseline(root: Path) -> list[str]:
    path = root / "00_baseline_commit.txt"
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8").strip()
    if not re.fullmatch(r"commit:\s+[0-9a-f]{40}", text):
        return ["baseline commit file has invalid format"]
    return []


def check_final_gap_log(root: Path) -> list[str]:
    path = root / "07_final_gap_log.md"
    if not path.exists():
        return ["missing final gap log: 07_final_gap_log.md"]
    text = path.read_text(encoding="utf-8")
    required = ["## Status", "## Critical", "## Minor", "## Ambiguous"]
    errors = []
    for item in required:
        if item not in text:
            errors.append(f"final gap log missing section: {item}")
    return errors


def check_figure_manifest(root: Path) -> list[str]:
    path = root / "05_pinpoint_figure_manifest.md"
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8")
    errors = []
    for title in FIGURE_TITLES:
        if f"## {title}" not in text:
            errors.append(f"missing figure entry: {title}")
    required_fields = ["target_section:", "source_evidence_ids:", "proof_purpose:"]
    for field in required_fields:
        if field not in text:
            errors.append(f"figure manifest missing field: {field}")
    return errors


def check_docx_guide(root: Path) -> list[str]:
    path = root / "06_pinpoint_docx_population_guide.md"
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8")
    errors = []
    required_strings = [
        "## Section Mapping",
        "01_pinpoint_employee_invention_report_ko.md",
        "05_pinpoint_figure_manifest.md",
        "04_pinpoint_scope_guardrails.md",
    ]
    for item in required_strings:
        if item not in text:
            errors.append(f"docx guide missing required content: {item}")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate Pinpoint invention package files.")
    parser.add_argument("--root", required=True, help="Package root directory")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    if not root.exists() or not root.is_dir():
        print(f"invalid package root: {root}", file=sys.stderr)
        return 2

    errors = []
    errors.extend(check_required_files(root))
    errors.extend(check_report_schema(root))
    errors.extend(check_forbidden_phrases(root))
    errors.extend(check_scope_guardrails(root))
    errors.extend(check_evidence_matrix(root))
    errors.extend(check_claim_support_map(root))
    errors.extend(check_figure_manifest(root))
    errors.extend(check_docx_guide(root))
    errors.extend(check_baseline(root))
    errors.extend(check_final_gap_log(root))

    if errors:
        print("VALIDATION FAILED")
        for error in errors:
            print(f"- {error}")
        return 1

    print("PASS section_schema file_presence evidence_trace forbidden_claims")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
