"""Phase 24 RID-05 — SVG sanitizer for LLM-generated recipe illustrations.

D-33: reject-and-fallback. Allowlist-only. Strict.

  Allowed tags:        {svg, path}
  Allowed <svg> attrs: {viewBox, xmlns, fill, stroke, stroke-linecap, width, height}
  Allowed <path> attrs: {d, stroke, fill, stroke-width, stroke-linecap, stroke-linejoin}

Rejected (entire input → None, frontend falls back to BrandIcon per D-37):
  - any tag NOT in allowed set (script, foreignObject, text, image, use, a,
    style, defs, g, ...)
  - any attribute name starting with "on" (event handlers — onclick/load/error)
  - style= attribute (CSS injection)
  - href or xlink:href attribute (data: URI / link injection)
  - oversized input (>4096 bytes per D-34)
  - malformed XML
  - CDATA sections
  - XML comments
  - XML processing instructions

D-34: on accept, normalize viewBox to "0 0 160 160" and ensure stroke=currentColor
+ fill=none on the root <svg> (so the icon tints with parent text color and
doesn't paint solid).

Why stdlib xml.etree.ElementTree (not defusedxml or lxml):
  - lxml is absent from pyproject.toml (verified 2026-05-13).
  - stdlib ET in Python 3.12 raises ET.ParseError on undefined entity expansion
    attempts — NOT vulnerable to XXE via DTD entity injection (RESEARCH §Target 1
    verified empirically: parsing '<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>...'
    raises ParseError, does not resolve the entity).
  - defusedxml adds belt-and-suspenders protection but is redundant here.

Namespace handling: Gemini returns <svg xmlns="http://www.w3.org/2000/svg">.
ET parses the root tag as "{http://www.w3.org/2000/svg}svg" by default. We
strip the namespace prefix before allowlist comparison (RESEARCH §Pitfall 2).
"""

from __future__ import annotations

import logging
import re
import xml.etree.ElementTree as ET

# Phase 30 BUG-02 D-07 — bind the empty prefix to the SVG namespace at module
# import time so ET.tostring emits <svg xmlns="…"> instead of inventing an
# <ns0:svg xmlns:ns0="…"> wrapper. register_namespace is GLOBAL state; safe
# here because no other backend caller registers a different prefix for this
# URI (grep -rn "register_namespace" backend/app/ confirmed clean 2026-05-18).
# Without this, the serialized SVG is valid XML but unparseable by browsers
# as inline SVG (the renderer needs xmlns as the root's default namespace).
_SVG_NAMESPACE_URI = "http://www.w3.org/2000/svg"
ET.register_namespace("", _SVG_NAMESPACE_URI)

log = logging.getLogger(__name__)

_ALLOWED_TAGS = frozenset({"svg", "path"})
_ALLOWED_SVG_ATTRS = frozenset(
    {
        "viewBox",
        "xmlns",
        "fill",
        "stroke",
        "stroke-linecap",
        "width",
        "height",
    }
)
_ALLOWED_PATH_ATTRS = frozenset(
    {
        "d",
        "stroke",
        "fill",
        "stroke-width",
        "stroke-linecap",
        "stroke-linejoin",
    }
)
_MAX_BYTES = 4096

# Pre-parse rejection markers — these characters/sequences in the raw text
# are not safe to feed to ET (CDATA / comments / PIs are valid XML but the
# allowlist disallows them on the output side; rejecting them pre-parse is
# simpler than walking the ET tree's iter_events).
_FORBIDDEN_SUBSTRINGS = ("<![CDATA[", "<!--", "<?")


def _strip_namespace(tag: str) -> str:
    """ET prefixes tags with '{namespace}'; strip for allowlist comparison."""
    if tag.startswith("{"):
        return tag.split("}", 1)[1]
    return tag


def sanitize_recipe_svg(raw: str) -> str | None:
    """Return a sanitized SVG string, or None if ANY allowlist violation found.

    The returned string is safe to render via dangerouslySetInnerHTML AT THE
    TRUST BOUNDARY ESTABLISHED BY THIS FUNCTION. The frontend's RecipeIllustration
    component carries a code comment documenting that boundary per D-38.
    """
    # 1. Size cap (D-34). Reject before parse — saves ET work on oversized input.
    if len(raw.encode("utf-8")) > _MAX_BYTES:
        log.warning("svg_sanitizer: rejected oversized SVG (%d bytes)", len(raw.encode("utf-8")))
        return None

    # 2. Pre-parse rejection of CDATA / comments / PIs (D-33).
    # ET's default parser silently drops comments and PIs from the element
    # tree, so we cannot detect them by walking the result. Reject at the
    # raw-string layer instead.
    for marker in _FORBIDDEN_SUBSTRINGS:
        if marker in raw:
            log.warning("svg_sanitizer: rejected forbidden marker %r", marker)
            return None

    # 3. Parse. ET raises ParseError on malformed XML AND on undefined entity
    # expansion (XXE safety in Python 3.12 stdlib per RESEARCH §Target 1).
    try:
        root = ET.fromstring(raw)
    except ET.ParseError as exc:
        log.warning("svg_sanitizer: XML parse error: %s", exc)
        return None

    # 4. Allowlist walk. Iterate every element (root + descendants). Reject
    # on ANY disallowed tag or attribute.
    for elem in root.iter():
        tag = _strip_namespace(elem.tag)

        if tag not in _ALLOWED_TAGS:
            log.warning("svg_sanitizer: rejected disallowed tag <%s>", tag)
            return None

        allowed = _ALLOWED_SVG_ATTRS if tag == "svg" else _ALLOWED_PATH_ATTRS

        for attr_name in list(elem.attrib.keys()):
            # Strip namespace on attribute names too (xlink:href arrives as
            # "{http://www.w3.org/1999/xlink}href").
            clean_attr = _strip_namespace(attr_name)

            # Reject event handlers (on*=).
            if clean_attr.startswith("on"):
                log.warning("svg_sanitizer: rejected event handler attr %r", attr_name)
                return None
            # Reject style= (CSS injection).
            if clean_attr == "style":
                log.warning("svg_sanitizer: rejected style= attr")
                return None
            # Reject any href-like attribute (data: URI / link injection).
            if "href" in clean_attr.lower():
                log.warning("svg_sanitizer: rejected href-like attr %r", attr_name)
                return None
            # Reject explicit xlink namespace.
            if attr_name.startswith("{") and "xlink" in attr_name.lower():
                log.warning("svg_sanitizer: rejected xlink namespace attr %r", attr_name)
                return None

            if clean_attr not in allowed:
                log.warning("svg_sanitizer: rejected disallowed attr %r on <%s>", attr_name, tag)
                return None

    # 5. Normalization on accept (D-34).
    # Strip any existing viewBox variant before setting the canonical value.
    # ET may store the attribute as "{http://www.w3.org/2000/svg}viewBox" when
    # the SVG declares a default namespace — setting the plain "viewBox" key
    # would leave both entries in the attrib dict and serialize both. Iterate
    # and drop any key whose namespace-stripped form is "viewbox" first.
    for k in list(root.attrib.keys()):
        if _strip_namespace(k).lower() == "viewbox":
            del root.attrib[k]
    root.attrib["viewBox"] = "0 0 160 160"
    # Re-key to clean attribute names (strip any remaining namespace prefix
    # on the root). For attrs not currently set, supply sane defaults so
    # the rendered SVG inherits text color and doesn't fill solid.
    existing_stroke = root.attrib.get("stroke")
    if not existing_stroke:
        root.attrib["stroke"] = "currentColor"
    existing_fill = root.attrib.get("fill")
    if not existing_fill:
        root.attrib["fill"] = "none"

    # 6. Serialize. ET.tostring with encoding="unicode" returns a str
    # (vs bytes); we strip any xmlns="..." default-namespace attribute ET
    # added back during the round-trip — the frontend doesn't need it for
    # inline SVG rendering.
    serialized = ET.tostring(root, encoding="unicode")

    # Phase 30 BUG-02 D-06 — belt-and-suspenders. layer 1 (register_namespace)
    # is the principled fix; this regex strip survives any future ET API drift
    # that re-introduces prefixes. Pattern: \bns\d+: matches "ns0:", "ns1:",
    # "ns23:", etc. anchored on a word boundary so we never match path-data
    # coordinate text like "L 1 1" (\b requires a non-word char before "ns").
    # Defense-in-depth: the allowlist walk above already validated the parsed
    # tree; this regex runs on the already-safe serialization output.
    serialized = re.sub(r"\bns\d+:", "", serialized)
    # Strip residual `xmlns:nsN="…"` namespace declarations left behind after
    # the prefix removal — these refer to prefixes that no longer exist in
    # the tree.
    serialized = re.sub(r'\s+xmlns:ns\d+="[^"]*"', "", serialized)

    # 7. Final size sanity check on the SERIALIZED form (in case normalization
    # somehow inflated past the cap).
    if len(serialized.encode("utf-8")) > _MAX_BYTES:
        log.warning(
            "svg_sanitizer: serialized SVG exceeded cap (%d bytes)", len(serialized.encode("utf-8"))
        )
        return None

    return serialized
