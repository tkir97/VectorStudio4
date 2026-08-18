# Modular Baseline Regression Checklist

Use this checklist before accepting future feature builds.

## Core document
- App opens without a JavaScript exception.
- New/open/save/export menus open.
- Refresh persistence restores current artwork.
- Undo/redo updates after edits.

## Selection
- Single selection shows its transform frame clearly.
- Multi-selection shows a shared oriented transform frame.
- Multi-select scale updates the frame while scaling.
- Multi-select rotation keeps the frame rotated with the artwork.
- Option/Alt scaling uses the selection center.
- Option/Alt + drag duplicates and moves the duplicate.
- Lasso Select works.
- Select by Color and Select Similar Shapes work.

## Drawing
- Pen preview and anchors work.
- Curvature hides the normal bounding box while editing.
- Curvature preview uses the stronger high-contrast indication.
- Pencil/free draw works.
- Shift+S opens the shape quick menu.
- Shift+D opens the drawing-tool quick menu.

## Grid/snapping
- Show Grid toggles the grid.
- Custom grid spacing changes visual grid spacing.
- Snap to Grid uses the same configured spacing.
- First drawing vertex and live preview snap to the grid.

## Shape Builder
- Closed shapes participate normally.
- Open Line/Pen/Curvature paths can cut closed regions.
- Cutter paths remain open geometry rather than becoming filled regions.

## Stroke
- Center, Inside and Outside stroke positions render.
- Stroke to Path converts visible stroke geometry.
- Selection updates Fill/Stroke picker previews.

## 3D
- Native and merged/compound shapes extrude.
- Pen/path contours are cleaned before side generation.
- Individual generated faces can be recolored.
- Face labels are not rendered.
- Back-facing faces are culled and appear when rotated toward camera.
- Selected face has a restrained but clear selection indication.
- Rotation is not hard-limited to ±180 degrees.

## Modular runtime integrity
- `index.html` loads `app.bundle.js`, not the source chunks directly.
- `node scripts/build-bundle.mjs` regenerates a byte-equivalent runtime from all ordered files in `js/`.
- Drawing smoke test: Rectangle drag creates an object; Pen can place anchors; Curvature can place anchors.
## Layers context menu (v29)
- Right-click a top-level layer opens the layer context menu.
- Right-click a nested child opens the menu for that child without promoting selection to its parent group.
- Rename, Duplicate, Show/Hide, Lock/Unlock, stacking, Group Selected/Ungroup, and Delete operate on the layer hierarchy.
- Stacking and duplication preserve the current parent group.

