# Vector Studio modular baseline v2

## Runtime model

The editable source is split across the ordered files in `js/`.

`app.bundle.js` is generated from those source modules and is the only application script loaded by `index.html`. This is intentional: the legacy application relied on whole-file JavaScript hoisting and shared lexical initialization. Loading the same chunks as independent classic scripts changes those semantics and broke drawing-tool initialization.

After changing any file in `js/`, rebuild the runtime bundle:

```bash
node scripts/build-bundle.mjs
```

Do not edit `app.bundle.js` directly.

## Why this is the baseline

This gives us disparate maintainable source files without changing legacy runtime semantics. Future work should move feature dependencies behind explicit namespaces/imports. Once a feature is genuinely isolated, it can become a native ES module. Until then, the generated bundle is the compatibility boundary.

## Source ownership

- `00-foundation.js` — DOM references and shared state
- `10-curvature.js` — Curvature implementation
- `20-tools-snapping-text-shapes.js` — general tools, snapping, text and primitive shape creation
- `30-pen-bezier.js` — Pen/Bézier path editing
- `40-selection.js` — selection overlays and transforms
- `50-shape-builder.js` — Shape Builder/topology
- `60-perspective.js` — perspective tools and related selection helpers
- `70-pointer-events.js` — canvas pointer routing
- `80-paints-appearance.js` — paints, gradients and appearance
- `90-document-layout-groups.js` — document/layout/group features
- `100-transform-object-layers-zoom.js` — transforms, objects, layers and zoom
- `110-persistence.js` — project serialization/autosave/restore
- `120-export-color-picker.js` — export and color-picker runtime
- `130-menus-shortcuts-parser.js` — menus, shortcuts and final startup
