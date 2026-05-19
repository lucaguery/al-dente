"""Phase 24 RID-05 — unit tests for the SVG sanitizer.

The sanitizer is the central security surface of Phase 24 — these tests are
a NON-NEGOTIABLE exit criterion for the plan (per RESEARCH §Security Domain).
Every D-33 rejection case has an explicit test below.

Run: cd backend && uv run pytest tests/test_svg_sanitizer.py -v
"""

from __future__ import annotations

import re

import pytest

from app.services.svg_sanitizer import sanitize_recipe_svg


# --- Happy path -----------------------------------------------------------

CLEAN_SVG = (
    '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" '
    'fill="none" stroke="currentColor">'
    '<path d="M10 10 L 90 90" stroke-width="2"/>'
    '</svg>'
)


def test_accepts_clean_line_art_svg():
    result = sanitize_recipe_svg(CLEAN_SVG)
    assert result is not None
    # Phase 30 BUG-02 — sanitizer emits a bare <svg> root with the SVG
    # namespace as the default; no ns0 / nsN prefixes anywhere.
    assert result.startswith('<svg'), repr(result)
    assert '<path' in result, repr(result)
    # viewBox normalization (D-34).
    assert '0 0 160 160' in result


def test_normalizes_viewBox_on_accept():
    raw = '<svg viewBox="50 50 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M0 0 L10 10"/></svg>'
    result = sanitize_recipe_svg(raw)
    assert result is not None
    assert '0 0 160 160' in result
    assert '50 50 100 100' not in result


def test_injects_default_stroke_and_fill_when_missing():
    raw = '<svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg"><path d="M10 10 L 90 90"/></svg>'
    result = sanitize_recipe_svg(raw)
    assert result is not None
    assert 'stroke="currentColor"' in result
    assert 'fill="none"' in result


def test_accepts_svg_with_explicit_namespace():
    # Even with xmlns set, the tag-namespace strip must work.
    raw = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><path d="M0 0"/></svg>'
    assert sanitize_recipe_svg(raw) is not None


# --- Disallowed tags (D-33) -----------------------------------------------

@pytest.mark.parametrize("malicious", [
    '<svg><script>alert(1)</script></svg>',
    '<svg><foreignObject><div>hack</div></foreignObject></svg>',
    '<svg><text x="0" y="20">leak</text></svg>',
    '<svg><image href="data:image/png;base64,AAAA"/></svg>',
    '<svg><use href="#x"/></svg>',
    '<svg><a href="javascript:alert(1)"><path d="M0 0"/></a></svg>',
    '<svg><style>.x { background: url(javascript:alert(1)); }</style></svg>',
    '<svg><defs><filter id="f"/></defs></svg>',
    '<svg><g><path d="M0 0"/></g></svg>',
])
def test_rejects_disallowed_tag(malicious):
    assert sanitize_recipe_svg(malicious) is None


# --- Disallowed attributes (D-33) -----------------------------------------

@pytest.mark.parametrize("malicious", [
    '<svg onclick="alert(1)"><path d="M0 0"/></svg>',
    '<svg onload="alert(1)"><path d="M0 0"/></svg>',
    '<svg><path d="M0 0" onerror="alert(1)"/></svg>',
    '<svg><path d="M0 0" onmouseover="alert(1)"/></svg>',
])
def test_rejects_event_handler_attribute(malicious):
    assert sanitize_recipe_svg(malicious) is None


def test_rejects_style_attribute():
    raw = '<svg style="display: none"><path d="M0 0"/></svg>'
    assert sanitize_recipe_svg(raw) is None


def test_rejects_path_style_attribute():
    raw = '<svg><path d="M0 0" style="fill: red"/></svg>'
    assert sanitize_recipe_svg(raw) is None


@pytest.mark.parametrize("malicious", [
    '<svg xmlns:xlink="http://www.w3.org/1999/xlink"><path d="M0 0" xlink:href="data:image/png;base64,AAAA"/></svg>',
    '<svg><path d="M0 0" href="javascript:alert(1)"/></svg>',
])
def test_rejects_href_attribute(malicious):
    assert sanitize_recipe_svg(malicious) is None


# --- Structural rejections (CDATA / comments / PIs / XXE) -----------------

def test_rejects_cdata_section():
    raw = '<svg><![CDATA[<script>alert(1)</script>]]><path d="M0 0"/></svg>'
    assert sanitize_recipe_svg(raw) is None


def test_rejects_xml_comment():
    raw = '<svg><!-- malicious comment --><path d="M0 0"/></svg>'
    assert sanitize_recipe_svg(raw) is None


def test_rejects_processing_instruction():
    raw = '<?xml-stylesheet href="malicious.xsl"?><svg><path d="M0 0"/></svg>'
    assert sanitize_recipe_svg(raw) is None


def test_rejects_xxe_entity_expansion():
    # stdlib ET in Python 3.12 raises ParseError on undefined entity expansion.
    # RESEARCH §Target 1 confirmed empirically.
    raw = (
        '<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>'
        '<svg><path d="&xxe;"/></svg>'
    )
    assert sanitize_recipe_svg(raw) is None


# --- Size + malformed -----------------------------------------------------

def test_rejects_oversized_svg():
    # 4097 bytes — one over the cap.
    big_d = "L 1 1 " * 800  # ~6400 chars; well over 4096 bytes
    raw = f'<svg viewBox="0 0 160 160"><path d="M0 0 {big_d}"/></svg>'
    assert len(raw.encode("utf-8")) > 4096
    assert sanitize_recipe_svg(raw) is None


def test_rejects_malformed_xml():
    assert sanitize_recipe_svg('<svg><path d="M0 0"></svg>') is None  # missing close
    assert sanitize_recipe_svg('not xml at all') is None
    assert sanitize_recipe_svg('') is None


# --- Negative cases that look like positives but aren't --------------------

def test_rejects_when_root_is_not_svg():
    raw = '<div><svg><path d="M0 0"/></svg></div>'
    # ET treats <div> as the root; "div" not in {svg, path} → reject.
    assert sanitize_recipe_svg(raw) is None


# --- Phase 30 BUG-02 — no-namespace-prefix contract -----------------------

def test_serialized_svg_has_no_ns0_prefix():
    """Phase 30 BUG-02 D-08 — sanitizer output must never contain 'ns0:'.

    Before the fix, ET.tostring on a default-namespace SVG emitted
    <ns0:svg xmlns:ns0="…">…</ns0:svg>, which is valid XML but unrenderable
    by browsers as inline SVG. The fix (register_namespace + regex strip)
    means the serialized form has the SVG namespace as the default on
    the root <svg> only — no prefix.
    """
    result = sanitize_recipe_svg(CLEAN_SVG)
    assert result is not None
    assert "ns0:" not in result, repr(result)


def test_serialized_svg_root_is_bare_svg():
    """Phase 30 BUG-02 D-08 — sanitizer output must start with bare '<svg'.

    Guards against any future regression that re-introduces a namespace
    prefix on the root element (e.g. <ns0:svg …>).
    """
    result = sanitize_recipe_svg(CLEAN_SVG)
    assert result is not None
    assert result.startswith("<svg"), repr(result)


def test_serialized_svg_has_no_nsN_prefix():
    """Phase 30 BUG-02 D-08 — sanitizer output must contain no nsN: prefix
    for ANY N (ns0, ns1, …).

    Belt-and-suspenders companion to test_serialized_svg_has_no_ns0_prefix
    — if a future ET update generates ns1 instead of ns0, the regex-strip
    layer (D-06 layer 2) catches it. This test asserts that layer works.
    """
    result = sanitize_recipe_svg(CLEAN_SVG)
    assert result is not None
    assert re.search(r"\bns\d+:", result) is None, repr(result)
