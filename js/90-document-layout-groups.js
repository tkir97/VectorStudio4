/* Vector Studio modular baseline — source lines 33542-49116 from consolidated app.js.
   Classic-script module: shares the browser global lexical scope with ordered sibling modules. */

/* ---------------- DOCUMENT ---------------- */

function resizeCanvas(width, height) {
  width = Math.max(16, Math.min(10000, Number(width)));
  height = Math.max(16, Math.min(10000, Number(height)));

  canvasWidth = width;
  canvasHeight = height;

  updatePasteboardViewport(
    width,
    height
  );
  artboardWrap.style.aspectRatio =
    `${width} / ${height}`;

  canvasWidthInput.value = width;
  canvasHeightInput.value = height;
  canvasStatus.textContent = `${width} × ${height} px`;

  const match = [...preset.options].find(option => option.value === `${width}x${height}`);
  preset.value = match ? match.value : "custom";
  drawSelection();
  renderGuides();
  renderGridOverlay();
}

document.querySelector("#resizeCanvasBtn").addEventListener("click", () => {
  resizeCanvas(canvasWidthInput.value, canvasHeightInput.value);
  recordHistory({ label: "Artboard Resized", detail: `${canvasWidth} × ${canvasHeight}` });
});

preset.addEventListener("change", () => {
  if (preset.value === "custom") return;
  const [width, height] = preset.value.split("x").map(Number);
  resizeCanvas(width, height);
  recordHistory();
});

document.querySelector("#swapSize").addEventListener("click", () => {
  resizeCanvas(canvasHeight, canvasWidth);
  recordHistory();
});

/* ---------------- ALIGN & DISTRIBUTE ---------------- */

function alignableSelection() {
  return selectedItems.filter(
    element =>
      isLayerInteractive(element) &&
      element.parentNode === art
  );
}

function moveElementBy(element, dx, dy) {
  const t = getTranslation(element);
  element.dataset.tx = String(t.x + dx);
  element.dataset.ty = String(t.y + dy);
  applyObjectTransform(element);

  enforceDocumentGeometryConstraints(
    lockedCrossConstraintKeysForPath(
      element
    )
  );
}

function selectionUnionBounds(items) {
  const bounds = items.map(elementCanvasBounds);

  return {
    left: Math.min(...bounds.map(b => b.left)),
    top: Math.min(...bounds.map(b => b.top)),
    right: Math.max(...bounds.map(b => b.right)),
    bottom: Math.max(...bounds.map(b => b.bottom))
  };
}

function alignSelectedObjects(mode) {
  const items = alignableSelection();
  if (items.length < 2) {
    toolStatus.textContent = "Select two or more objects to align";
    return;
  }

  const union = selectionUnionBounds(items);

  items.forEach(element => {
    const b = elementCanvasBounds(element);
    let dx = 0;
    let dy = 0;

    if (mode === "left") {
      dx = union.left - b.left;
    } else if (mode === "h-center") {
      dx =
        (union.left + union.right) / 2 -
        (b.left + b.right) / 2;
    } else if (mode === "right") {
      dx = union.right - b.right;
    } else if (mode === "top") {
      dy = union.top - b.top;
    } else if (mode === "v-center") {
      dy =
        (union.top + union.bottom) / 2 -
        (b.top + b.bottom) / 2;
    } else if (mode === "bottom") {
      dy = union.bottom - b.bottom;
    }

    moveElementBy(element, dx, dy);
  });

  drawSelection();
  renderLayers();
  recordHistory({
    label: "Objects Aligned",
    detail: `Alignment: ${mode.replace("-", " ")}`
  });
  toolStatus.textContent = "Objects aligned";
}

function distributeSelectedObjects(axis) {
  const items = alignableSelection();

  if (items.length < 3) {
    toolStatus.textContent =
      "Select three or more objects to distribute";
    return;
  }

  const entries = items.map(element => {
    const bounds = elementCanvasBounds(element);

    return {
      element,
      bounds,
      centerX: (bounds.left + bounds.right) / 2,
      centerY: (bounds.top + bounds.bottom) / 2
    };
  });

  if (axis === "horizontal") {
    entries.sort((a, b) => a.centerX - b.centerX);

    const first = entries[0].centerX;
    const last = entries[entries.length - 1].centerX;
    const step = (last - first) / (entries.length - 1);

    entries.forEach((entry, index) => {
      if (index === 0 || index === entries.length - 1) return;

      const target = first + step * index;
      moveElementBy(
        entry.element,
        target - entry.centerX,
        0
      );
    });
  } else {
    entries.sort((a, b) => a.centerY - b.centerY);

    const first = entries[0].centerY;
    const last = entries[entries.length - 1].centerY;
    const step = (last - first) / (entries.length - 1);

    entries.forEach((entry, index) => {
      if (index === 0 || index === entries.length - 1) return;

      const target = first + step * index;
      moveElementBy(
        entry.element,
        0,
        target - entry.centerY
      );
    });
  }

  drawSelection();
  renderLayers();
  recordHistory({
    label:
      axis === "horizontal"
        ? "Objects Distributed Horizontally"
        : "Objects Distributed Vertically",
    detail: "Spacing adjusted"
  });
  toolStatus.textContent =
    axis === "horizontal"
      ? "Objects distributed horizontally"
      : "Objects distributed vertically";
}

function updateAlignDistributeControls() {
  const section = document.querySelector("#alignDistributeSection");
  if (!section) return;

  const count = alignableSelection().length;
  section.classList.toggle("available", count >= 2);

  section
    .querySelectorAll('[data-command^="align-"]')
    .forEach(button => {
      button.disabled = count < 2;
    });

  section
    .querySelectorAll('[data-command^="distribute-"]')
    .forEach(button => {
      button.disabled = count < 3;
    });

  const hint = document.querySelector("#alignHint");
  if (!hint) return;

  if (count < 2) {
    hint.textContent = "Select two or more objects.";
  } else if (count < 3) {
    hint.textContent =
      "Alignment is available. Select 3+ objects to distribute.";
  } else {
    hint.textContent =
      "Align or evenly distribute the selected objects.";
  }
}

/* ---------------- GROUPING ---------------- */

function isOffsetPathEligible(element) {
  if (!element || !element.isConnected) return false;
  if (isGroup(element)) return false;
  if (element.tagName === "line") return false;

  if (element.tagName === "path") {
    return element.dataset.closed === "true" ||
      element.dataset.compoundShape === "true";
  }

  return (
    element.tagName === "rect" ||
    element.tagName === "ellipse" ||
    element.tagName === "polygon"
  );
}

function updateOffsetPathUI() {
  const value = Number(offsetPathAmount.value);

  if (!Number.isFinite(value)) {
    offsetPathDirection.textContent = "Enter an offset";
  } else if (value < 0) {
    offsetPathDirection.textContent = "Inward offset";
  } else if (value > 0) {
    offsetPathDirection.textContent = "Outward offset";
  } else {
    offsetPathDirection.textContent = "No offset";
  }

  document.querySelectorAll("[data-offset-preset]").forEach(button => {
    button.classList.toggle(
      "active",
      Number(button.dataset.offsetPreset) === value
    );
  });
}

function stepOffsetPath(delta) {
  const current = Number(offsetPathAmount.value);
  offsetPathAmount.value = String(
    (Number.isFinite(current) ? current : 0) + delta
  );
  offsetPathMessage.textContent = "";
  updateOffsetPathUI();
}

function openOffsetPathModal() {
  selectionQuickMenu.hidden = true;
  closeCanvasContextMenu();

  const eligible = selectedItems.filter(isOffsetPathEligible);

  offsetPathMessage.textContent = "";

  if (!eligible.length) {
    offsetPathMessage.textContent =
      "Select at least one closed shape or path first.";
  }

  offsetPathAmount.value = "10";
  offsetPathJoin.value = "miter";
  offsetPathModal.hidden = false;
  updateOffsetPathUI();

  requestAnimationFrame(() => {
    offsetPathAmount.focus();
    offsetPathAmount.select();
  });
}

function closeOffsetPathDialog() {
  offsetPathModal.hidden = true;
  offsetPathMessage.textContent = "";
  renderSelectionQuickMenu();
}

function offsetPaperItem(sourceItem, amount, join = "miter") {
  if (
    typeof paperjsOffset === "undefined" ||
    typeof paperjsOffset.offset !== "function"
  ) {
    return null;
  }

  const cleaned = normalizePaperBooleanGeometry(
    sourceItem.clone({ insert: false })
  );

  let result = null;

  try {
    result = paperjsOffset.offset(
      cleaned,
      amount,
      {
        join,
        insert: false
      }
    );
  } catch {
    result = null;
  }

  removePaperItem(cleaned);

  if (!result || !paperRegionIsUsable(result)) {
    removePaperItem(result);
    return null;
  }

  return canonicalizePaperBooleanResult(
    normalizePaperBooleanGeometry(result)
  );
}

function nameOffsetResult(element, sourceElement) {
  if (!element) return;

  const sourceName =
    sourceElement?.dataset.name ||
    "Object";

  element.dataset.name =
    `${sourceName} Offset`;
}

function offsetSelectedPaths(amount, join = "miter") {
  const distance = Number(amount);
  const joinStyle =
    ["miter", "round", "bevel"].includes(join)
      ? join
      : "miter";

  if (!Number.isFinite(distance) || Math.abs(distance) < 0.0001) {
    offsetPathMessage.textContent =
      "Enter a non-zero pixel value.";
    return false;
  }

  const eligible = selectedItems.filter(isOffsetPathEligible);

  if (!eligible.length) {
    offsetPathMessage.textContent =
      "Select at least one closed shape or path first.";
    return false;
  }

  if (!ensurePaperReady()) return false;

  if (
    typeof paperjsOffset === "undefined" ||
    typeof paperjsOffset.offset !== "function"
  ) {
    offsetPathMessage.textContent =
      "The path-offset library could not be loaded.";
    return false;
  }

  paper.project.clear();

  const created = [];

  eligible.forEach(sourceElement => {
    const paperSource = svgShapeToPaper(sourceElement);

    if (!paperSource) return;

    const offsetResult = offsetPaperItem(
      paperSource,
      distance,
      joinStyle
    );

    removePaperItem(paperSource);

    if (!offsetResult) return;

    const newElement = importPaperResultAsSvg(
      offsetResult,
      sourceElement
    );

    removePaperItem(offsetResult);

    if (!newElement) return;

    nameOffsetResult(
      newElement,
      sourceElement
    );

    /*
     * The offset Paper geometry already includes source translation/rotation
     * in canvas coordinates, so the imported path starts at a neutral
     * transform to avoid applying the original transform twice.
     */
    newElement.dataset.tx = "0";
    newElement.dataset.ty = "0";
    newElement.dataset.rotation = "0";
    applyObjectTransform(newElement);

    const sourceGradient =
      gradientDataForElement(sourceElement);

    if (sourceGradient) {
      /*
       * Give the offset copy its own gradient definition so later edits to
       * either object remain independent.
       */
      delete newElement.dataset.gradientId;
      applyGradientToElement(
        newElement,
        { ...sourceGradient }
      );
    }

    if (sourceElement.nextSibling) {
      art.insertBefore(
        newElement,
        sourceElement.nextSibling
      );
    } else {
      art.appendChild(newElement);
    }

    created.push(newElement);
  });

  paper.project.clear();

  if (!created.length) {
    offsetPathMessage.textContent =
      distance < 0
        ? "That inset is too large for the selected geometry."
        : "Could not create an offset for the selected geometry.";
    return false;
  }

  setSelection(
    created,
    created[created.length - 1]
  );

  renderLayers();
  drawSelection();
  recordHistory({
    label: "Offset Path Created",
    detail: `${joinStyle.charAt(0).toUpperCase() + joinStyle.slice(1)} joins`
  });
  closeOffsetPathDialog();

  return true;
}

function copyElementAttributes(source, target) {
  [...source.attributes].forEach(attribute => {
    if (
      attribute.name === "x" ||
      attribute.name === "y" ||
      attribute.name === "width" ||
      attribute.name === "height" ||
      attribute.name === "rx" ||
      attribute.name === "ry" ||
      attribute.name === "cx" ||
      attribute.name === "cy" ||
      attribute.name === "r" ||
      attribute.name === "x1" ||
      attribute.name === "y1" ||
      attribute.name === "x2" ||
      attribute.name === "y2" ||
      attribute.name === "points" ||
      attribute.name === "d"
    ) {
      return;
    }

    target.setAttribute(
      attribute.name,
      attribute.value
    );
  });
}

function rectanglePathAnchors(element) {
  const x = Number(element.getAttribute("x") || 0);
  const y = Number(element.getAttribute("y") || 0);
  const width = Number(element.getAttribute("width") || 0);
  const height = Number(element.getAttribute("height") || 0);

  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height }
  ].map(point => ({
    x: point.x,
    y: point.y,
    inX: point.x,
    inY: point.y,
    outX: point.x,
    outY: point.y
  }));
}

function polygonPathAnchors(element) {
  return polygonVertices(element).map(point => ({
    x: point.x,
    y: point.y,
    inX: point.x,
    inY: point.y,
    outX: point.x,
    outY: point.y
  }));
}

function linePathAnchors(element) {
  return [
    {
      x: Number(element.getAttribute("x1") || 0),
      y: Number(element.getAttribute("y1") || 0)
    },
    {
      x: Number(element.getAttribute("x2") || 0),
      y: Number(element.getAttribute("y2") || 0)
    }
  ].map(point => ({
    x: point.x,
    y: point.y,
    inX: point.x,
    inY: point.y,
    outX: point.x,
    outY: point.y
  }));
}

function ellipsePathAnchors(element) {
  const cx = Number(element.getAttribute("cx") || 0);
  const cy = Number(element.getAttribute("cy") || 0);
  const rx = Number(element.getAttribute("rx") || 0);
  const ry = Number(element.getAttribute("ry") || 0);

  /*
   * Cubic Bézier approximation of an ellipse using four anchors.
   * kappa gives an extremely close approximation while producing ordinary
   * editable handles for the Pen/path editing model.
   */
  const kappa = 0.5522847498307936;
  const ox = rx * kappa;
  const oy = ry * kappa;

  return [
    {
      x: cx + rx,
      y: cy,
      inX: cx + rx,
      inY: cy - oy,
      outX: cx + rx,
      outY: cy + oy
    },
    {
      x: cx,
      y: cy + ry,
      inX: cx + ox,
      inY: cy + ry,
      outX: cx - ox,
      outY: cy + ry
    },
    {
      x: cx - rx,
      y: cy,
      inX: cx - rx,
      inY: cy + oy,
      outX: cx - rx,
      outY: cy - oy
    },
    {
      x: cx,
      y: cy - ry,
      inX: cx - ox,
      inY: cy - ry,
      outX: cx + ox,
      outY: cy - ry
    }
  ];
}

function convertElementToPath(element) {
  if (!element || !element.isConnected) return element;
  if (element.tagName === "path" || isGroup(element)) return element;

  let anchors = null;
  let closed = false;

  if (element.tagName === "rect") {
    anchors = rectanglePathAnchors(element);
    closed = true;
  } else if (element.tagName === "ellipse") {
    anchors = ellipsePathAnchors(element);
    closed = true;
  } else if (element.tagName === "polygon") {
    anchors = polygonPathAnchors(element);
    closed = true;
  } else if (element.tagName === "line") {
    anchors = linePathAnchors(element);
    closed = false;
  } else {
    return element;
  }

  if (!anchors || anchors.length < 2) return element;

  const path = svgEl("path");
  copyElementAttributes(element, path);

  path.dataset.object = "true";
  path.dataset.editorPath = "true";
  path.dataset.closed = closed ? "true" : "false";

  if (closed) {
    path.dataset.shape = "true";
  } else {
    delete path.dataset.shape;
    path.setAttribute("fill", "none");
  }

  /*
   * These describe the old primitive editing model and should not make the
   * converted path behave like a rectangle/polygon primitive afterwards.
   */
  delete path.dataset.roundedRect;
  delete path.dataset.roundedPolygon;
  delete path.dataset.polygonVertices;
  delete path.dataset.cornerRadii;
  delete path.dataset.cornerTl;
  delete path.dataset.cornerTr;
  delete path.dataset.cornerBr;
  delete path.dataset.cornerBl;

  path._anchors = anchors.map(anchor => ({ ...anchor }));
  path.dataset.pathCornerRadii =
    JSON.stringify(
      Array(
        path._anchors.length
      ).fill(0)
    );
  updatePathD(path);

  element.replaceWith(path);

  /*
   * Gradient definitions live in SVG <defs> and reference the object's
   * retained gradient id, so replacing the primitive does not break the fill.
   */
  applyObjectTransform(path);
  applyLayerState(path);

  return path;
}

closeOffsetPathModalButton.addEventListener(
  "click",
  closeOffsetPathDialog
);

cancelOffsetPathButton.addEventListener(
  "click",
  closeOffsetPathDialog
);

offsetPathDecreaseButton.addEventListener(
  "click",
  () => stepOffsetPath(-1)
);

offsetPathIncreaseButton.addEventListener(
  "click",
  () => stepOffsetPath(1)
);

offsetPathAmount.addEventListener(
  "input",
  () => {
    offsetPathMessage.textContent = "";
    updateOffsetPathUI();
  }
);

offsetPathJoin.addEventListener(
  "change",
  () => {
    offsetPathMessage.textContent = "";
  }
);

document.querySelectorAll("[data-offset-preset]").forEach(button => {
  button.addEventListener("click", () => {
    offsetPathAmount.value = button.dataset.offsetPreset;
    offsetPathMessage.textContent = "";
    updateOffsetPathUI();
    offsetPathAmount.focus();
  });
});

offsetPathAmount.addEventListener(
  "keydown",
  event => {
    if (event.key === "Enter") {
      event.preventDefault();
      offsetSelectedPaths(
        offsetPathAmount.value,
        offsetPathJoin.value
      );
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeOffsetPathDialog();
    }
  }
);

confirmOffsetPathButton.addEventListener(
  "click",
  () => {
    offsetSelectedPaths(
        offsetPathAmount.value,
        offsetPathJoin.value
      );
  }
);


function isStrokeToPathEligible(element) {
  if (!element || !element.isConnected || isGroup(element)) return false;

  const strokePaint = String(element.getAttribute("stroke") || "").trim();
  const width = strokeAlignmentBaseWidth(element);
  const opacity = Number(element.getAttribute("stroke-opacity") ?? 1);

  if (!strokePaint || strokePaint === "none" || width <= 0 || opacity <= 0) {
    return false;
  }

  const tag = element.tagName?.toLowerCase();
  return ["path", "rect", "ellipse", "circle", "polygon", "line", "polyline"].includes(tag) ||
    element.dataset.compoundShape === "true";
}

function svgStrokeShapeToPaper(element) {
  if (!element) return null;

  const tag = element.tagName?.toLowerCase();
  const t = getTranslation(element);
  let item = null;

  if (tag === "path" && Array.isArray(element._anchors) && element._anchors.length) {
    item = new paper.Path({ insert: false });

    element._anchors.forEach(anchor => {
      item.add(
        new paper.Segment(
          new paper.Point(anchor.x + t.x, anchor.y + t.y),
          new paper.Point(anchor.inX - anchor.x, anchor.inY - anchor.y),
          new paper.Point(anchor.outX - anchor.x, anchor.outY - anchor.y)
        )
      );
    });

    item.closed = element.dataset.closed === "true";

    const rotation = getRotation(element);
    if (Math.abs(rotation) > 0.0001) {
      const box = editableLocalBounds(element);
      const center = new paper.Point(
        box.x + box.width / 2 + t.x,
        box.y + box.height / 2 + t.y
      );
      item.rotate(rotation, center);
    }
  } else {
    const clone = element.cloneNode(true);
    clone.removeAttribute("data-object");
    clone.removeAttribute("data-name");
    clone.removeAttribute("clip-path");
    clone.removeAttribute("mask");

    if (!clone.getAttribute("transform")) {
      clone.setAttribute("transform", element.getAttribute("transform") || "");
    }

    try {
      item = paper.project.importSVG(
        new XMLSerializer().serializeToString(clone),
        { insert: false, expandShapes: true }
      );
    } catch {
      item = null;
    }
  }

  if (!item) return null;

  item.strokeColor = new paper.Color("#000000");
  item.strokeWidth = Math.max(0, strokeAlignmentBaseWidth(element));
  item.strokeJoin = element.getAttribute("stroke-linejoin") || "miter";
  item.strokeCap = element.getAttribute("stroke-linecap") || "butt";
  item.miterLimit = Math.max(1, Number(element.getAttribute("stroke-miterlimit")) || 4);
  return item;
}

function strokeOffsetQuality(source, result, distance, options = {}) {
  if (!result || typeof paperjsOffset?.analyze !== "function") return 0;

  try {
    const report = paperjsOffset.analyze(source, result, distance, options);
    const score = Number(report?.score);
    return Number.isFinite(score) ? score : 0;
  } catch {
    return 0;
  }
}

function bestPaperStrokeOffset(sourceItem, distance, options = {}) {
  if (!sourceItem || typeof paperjsOffset?.offsetStroke !== "function") return null;

  const algorithms = ["robust", "adaptive", "split", "auto"];
  let best = null;
  let bestScore = -Infinity;

  algorithms.forEach(algorithm => {
    let candidate = null;
    try {
      candidate = paperjsOffset.offsetStroke(sourceItem, distance, {
        ...options,
        algorithm,
        insert: false
      });
    } catch {
      candidate = null;
    }

    if (!candidate || !paperRegionIsUsable(candidate)) {
      removePaperItem(candidate);
      return;
    }

    const score = strokeOffsetQuality(sourceItem, candidate, distance, {
      ...options,
      algorithm,
      stroke: true
    });

    /*
     * Older paperjs-offset builds may ignore `algorithm` or omit analyze().
     * In that case, keep the first usable candidate instead of needlessly
     * replacing it with an equivalent later result.
     */
    if (!best || score > bestScore + 1e-6) {
      removePaperItem(best);
      best = candidate;
      bestScore = score;
    } else {
      removePaperItem(candidate);
    }
  });

  return best;
}

function bestPaperPathOffset(sourceItem, distance, options = {}) {
  if (!sourceItem || typeof paperjsOffset?.offset !== "function") return null;

  const algorithms = ["robust", "adaptive", "split", "auto"];
  let best = null;
  let bestScore = -Infinity;

  algorithms.forEach(algorithm => {
    let candidate = null;
    try {
      candidate = paperjsOffset.offset(sourceItem, distance, {
        ...options,
        algorithm,
        insert: false
      });
    } catch {
      candidate = null;
    }

    if (!candidate || !paperRegionIsUsable(candidate)) {
      removePaperItem(candidate);
      return;
    }

    const score = strokeOffsetQuality(sourceItem, candidate, distance, {
      ...options,
      algorithm
    });

    if (!best || score > bestScore + 1e-6) {
      removePaperItem(best);
      best = candidate;
      bestScore = score;
    } else {
      removePaperItem(candidate);
    }
  });

  return best;
}

function squareCapCenterline(sourceItem, halfWidth) {
  if (!(sourceItem instanceof paper.Path) || sourceItem.closed || sourceItem.length <= 0) {
    return sourceItem;
  }

  const extended = sourceItem.clone({ insert: false });

  try {
    const startTangent = extended.getTangentAt(0);
    const endTangent = extended.getTangentAt(extended.length);
    const first = extended.firstSegment;
    const last = extended.lastSegment;

    if (startTangent && startTangent.length > 0 && first) {
      first.point = first.point.subtract(startTangent.normalize(halfWidth));
    }
    if (endTangent && endTangent.length > 0 && last) {
      last.point = last.point.add(endTangent.normalize(halfWidth));
    }
  } catch {
    removePaperItem(extended);
    return sourceItem;
  }

  return extended;
}

function strokeToPathPaperResult(sourceItem, sourceElement) {
  if (
    typeof paperjsOffset === "undefined" ||
    typeof paperjsOffset.offsetStroke !== "function"
  ) {
    return null;
  }

  const width = strokeAlignmentBaseWidth(sourceElement);
  if (!(width > 0)) return null;

  const join = sourceElement.getAttribute("stroke-linejoin") || "miter";
  const capRaw = sourceElement.getAttribute("stroke-linecap") || "butt";
  const limit = Math.max(1, Number(sourceElement.getAttribute("stroke-miterlimit")) || 4);
  const alignment = normalizeStrokeAlignment(
    sourceElement.dataset.strokeAlignment || "center"
  );
  const closed = isClosedStrokeGeometry(sourceElement);
  const halfWidth = width / 2;

  let result = null;
  let offsetSource = sourceItem;
  let temporarySquareSource = null;

  try {
    if (closed && alignment === "outside") {
      const outer = bestPaperPathOffset(sourceItem, width, {
        join,
        limit
      });
      if (!outer) return null;

      const inner = sourceItem.clone({ insert: false });
      result = outer.subtract(inner, { insert: false });
      removePaperItem(outer);
      removePaperItem(inner);
    } else if (closed && alignment === "inside") {
      const outer = sourceItem.clone({ insert: false });
      const inner = bestPaperPathOffset(sourceItem, -width, {
        join,
        limit
      });
      result = inner
        ? outer.subtract(inner, { insert: false })
        : outer;
      if (inner) removePaperItem(inner);
      if (result !== outer) removePaperItem(outer);
    } else {
      /*
       * paperjs-offset supports butt and round caps, but not SVG square caps.
       * A square cap is exactly a butt cap after extending the centerline by
       * half the stroke width along each endpoint tangent.
       */
      if (!closed && capRaw === "square") {
        temporarySquareSource = squareCapCenterline(sourceItem, halfWidth);
        offsetSource = temporarySquareSource;
      }

      const cap = capRaw === "round" ? "round" : "butt";
      result = bestPaperStrokeOffset(offsetSource, halfWidth, {
        join,
        cap,
        limit
      });
    }
  } catch {
    removePaperItem(result);
    result = null;
  } finally {
    if (temporarySquareSource && temporarySquareSource !== sourceItem) {
      removePaperItem(temporarySquareSource);
    }
  }

  if (!result || !paperRegionIsUsable(result)) {
    removePaperItem(result);
    return null;
  }

  /*
   * Do not self-union/retrace a stroke outline here. That cleanup is useful
   * for Shape Builder region seams, but on a stroke expansion it can move
   * Bezier segments enough to make the converted outline visibly differ from
   * the rendered source stroke.
   */
  return normalizePaperBooleanGeometry(result);
}

function applyStrokePaintAsFill(resultElement, sourceElement) {
  if (!resultElement || !sourceElement) return;

  const strokePaint = sourceElement.getAttribute("stroke") || "#000000";
  const strokeOpacityValue = sourceElement.getAttribute("stroke-opacity") ?? "1";

  resultElement.setAttribute("fill", strokePaint);
  resultElement.setAttribute("fill-opacity", strokeOpacityValue);
  resultElement.setAttribute("stroke", "none");
  resultElement.setAttribute("stroke-width", "0");
  resultElement.setAttribute("stroke-opacity", "0");
  resultElement.dataset.strokeBaseWidth = "0";
  resultElement.dataset.strokeAlignment = "center";
  resultElement.dataset.strokeProfile = "uniform";
  resultElement.removeAttribute("stroke-dasharray");
  resultElement.removeAttribute("stroke-dashoffset");
  resultElement.removeAttribute("clip-path");
  resultElement.removeAttribute("mask");

  resultElement.querySelectorAll?.("*").forEach(child => {
    child.setAttribute("fill", strokePaint);
    child.setAttribute("fill-opacity", strokeOpacityValue);
    child.setAttribute("stroke", "none");
    child.setAttribute("stroke-width", "0");
  });
}

function strokeSelectedToPath() {
  const candidates = selectedItems.filter(isStrokeToPathEligible);
  if (!candidates.length) {
    toolStatus.textContent = "Stroke to Path: select a stroked shape or path";
    return false;
  }

  if (!ensurePaperReady()) return false;

  if (
    typeof paperjsOffset === "undefined" ||
    typeof paperjsOffset.offsetStroke !== "function"
  ) {
    toolStatus.textContent = "Stroke to Path unavailable: offset library did not load";
    return false;
  }

  paper.project.clear();
  const created = [];

  candidates.forEach(sourceElement => {
    const paperSource = svgStrokeShapeToPaper(sourceElement);
    if (!paperSource) return;

    const result = strokeToPathPaperResult(paperSource, sourceElement);
    removePaperItem(paperSource);
    if (!result) return;

    const newElement = importPaperResultAsSvg(result, sourceElement);
    removePaperItem(result);
    if (!newElement) return;

    newElement.dataset.name = `${sourceElement.dataset.name || "Object"} Stroke`;
    newElement.dataset.tx = "0";
    newElement.dataset.ty = "0";
    newElement.dataset.rotation = "0";
    newElement.dataset.scaleX = "1";
    newElement.dataset.scaleY = "1";
    applyObjectTransform(newElement);
    applyStrokePaintAsFill(newElement, sourceElement);

    sourceElement.replaceWith(newElement);
    created.push(newElement);
  });

  paper.project.clear();

  if (!created.length) {
    toolStatus.textContent = "Stroke to Path could not create an outline for this geometry";
    return false;
  }

  setSelection(created, created[created.length - 1]);
  renderLayers();
  drawSelection();
  recordHistory({
    label: "Stroke to Path",
    detail: created.length === 1
      ? "Stroke converted to editable filled geometry"
      : `${created.length} strokes converted to editable filled geometry`
  });
  toolStatus.textContent = created.length === 1
    ? "Stroke converted to path"
    : `${created.length} strokes converted to paths`;
  return true;
}

function convertSelectedToPath() {
  if (
    selectedItems.length === 1 &&
    isRepeatGrid(
      selectedItems[0]
    )
  ) {
    expandRepeatGridToPaths(
      selectedItems[0]
    );

    return;
  }

  const candidates = selectedItems.filter(
    element =>
      element?.isConnected &&
      element.parentNode === art &&
      !isGroup(element)
  );

  if (!candidates.length) return;

  const converted = candidates.map(convertElementToPath);
  const changed = converted.some(
    (element, index) => element !== candidates[index]
  );

  if (!changed) return;

  const primaryIndex = candidates.indexOf(selected);
  const nextPrimary =
    primaryIndex >= 0
      ? converted[primaryIndex]
      : converted[converted.length - 1];

  setSelection(converted, nextPrimary);
  renderLayers();
  drawSelection();
  recordHistory({ label: "Converted to Path", detail: "Shape converted to editable path" });
}



function isRadialRepeat(
  element
) {
  return Boolean(
    element &&
    element.dataset.radialRepeat ===
      "true"
  );
}

function radialRepeatSettings(
  element
) {
  if (!isRadialRepeat(element)) return null;
  try {
    return JSON.parse(
      element.dataset.radialRepeatSettings ||
      "{}"
    );
  } catch {
    return null;
  }
}

function radialRepeatSourceData(
  element
) {
  if (!isRadialRepeat(element)) return null;
  try {
    return JSON.parse(
      element.dataset.radialRepeatSource ||
      "null"
    );
  } catch {
    return null;
  }
}

function normalizeRadialRepeatSettings(
  settings = {}
) {
  return {
    count: Math.max(2, Math.min(180, Math.round(Number(settings.count) || 8))),
    radius: Math.max(0, Math.min(5000, Number(settings.radius) || 0)),
    centerX: Number.isFinite(Number(settings.centerX)) ? Number(settings.centerX) : 0,
    centerY: Number.isFinite(Number(settings.centerY)) ? Number(settings.centerY) : 0,
    startAngle: Math.max(-360, Math.min(360, Number(settings.startAngle) || 0)),
    sweepAngle: Math.max(-360, Math.min(360, Number(settings.sweepAngle) || 360)),
    orientationMode:
      settings.orientationMode === "page-up"
        ? "page-up"
        : "center",
    rotationStep: Math.max(-360, Math.min(360, Number(settings.rotationStep) || 0)),
    scaleStep: Math.max(-90, Math.min(300, Number(settings.scaleStep) || 0)),
    ghost: settings.ghost !== false,
    committed: settings.committed === true,
    anchorCenterX:
      Number.isFinite(Number(settings.anchorCenterX))
        ? Number(settings.anchorCenterX)
        : null,
    anchorCenterY:
      Number.isFinite(Number(settings.anchorCenterY))
        ? Number(settings.anchorCenterY)
        : null,
    anchorTx:
      Number.isFinite(Number(settings.anchorTx))
        ? Number(settings.anchorTx)
        : null,
    anchorTy:
      Number.isFinite(Number(settings.anchorTy))
        ? Number(settings.anchorTy)
        : null,
    anchorRotation:
      Number.isFinite(Number(settings.anchorRotation))
        ? Number(settings.anchorRotation)
        : null,
    anchorScaleX:
      Number.isFinite(Number(settings.anchorScaleX))
        ? Number(settings.anchorScaleX)
        : null,
    anchorScaleY:
      Number.isFinite(Number(settings.anchorScaleY))
        ? Number(settings.anchorScaleY)
        : null
  };
}

function radialRepeatSourceElement(repeat) {
  const data = radialRepeatSourceData(repeat);
  if (!data) return null;
  return createElementFromProject(data, false);
}

function prepareRadialRepeatChild(child, index) {
  child.removeAttribute("data-object");
  child.dataset.groupChild = "true";
  child.dataset.radialRepeatChild = "true";
  child.dataset.radialRepeatIndex = String(index);
  delete child.dataset.strokeProfileId;
  child.querySelectorAll("[data-object]").forEach(node => {
    node.removeAttribute("data-object");
    node.dataset.groupChild = "true";
  });
}

function radialRepeatElementCanvasCenter(
  element
) {
  const box =
    editableLocalBounds(
      element
    );

  return canvasPointFromLocal(
    element,
    box.x + box.width / 2,
    box.y + box.height / 2
  );
}

function positionRadialRepeatCloneCenter(
  clone,
  targetX,
  targetY
) {
  /*
   * Apply the clone's current transform first, measure where its
   * transformed center actually landed, then compensate translation.
   * This avoids assumptions about serialized bounds, rotation or scale.
   */
  applyObjectTransform(
    clone
  );

  const actual =
    radialRepeatElementCanvasCenter(
      clone
    );

  const t =
    getTranslation(
      clone
    );

  clone.dataset.tx =
    String(
      t.x +
      targetX -
      actual.x
    );

  clone.dataset.ty =
    String(
      t.y +
      targetY -
      actual.y
    );

  applyObjectTransform(
    clone
  );
}

function renderRadialRepeat(repeat) {
  if (!isRadialRepeat(repeat)) return;

  const settings =
    normalizeRadialRepeatSettings(
      radialRepeatSettings(repeat) || {}
    );

  const source =
    radialRepeatSourceElement(repeat);

  if (!source) return;

  const sourceTranslation =
    getTranslation(source);

  const sourceScale =
    getObjectScale(source);

  const centerX =
    settings.centerX;

  const centerY =
    settings.centerY;

  const sourceBox =
    editableLocalBounds(source);

  const fallbackAnchorCenter =
    canvasPointFromLocal(
      source,
      sourceBox.x + sourceBox.width / 2,
      sourceBox.y + sourceBox.height / 2
    );

  const anchorCenterX =
    Number.isFinite(
      settings.anchorCenterX
    )
      ? settings.anchorCenterX
      : fallbackAnchorCenter.x;

  const anchorCenterY =
    Number.isFinite(
      settings.anchorCenterY
    )
      ? settings.anchorCenterY
      : fallbackAnchorCenter.y;

  /*
   * The placed reference vertex is the exact circle center.
   * Radius is the literal distance from that vertex to the original
   * object's fixed center.
   */
  const radius =
    Math.hypot(
      anchorCenterX - centerX,
      anchorCenterY - centerY
    );

  const anchorAngle =
    Math.atan2(
      anchorCenterY - centerY,
      anchorCenterX - centerX
    ) *
    180 /
    Math.PI;

  settings.radius =
    radius;
  settings.startAngle =
    anchorAngle;

  const anchorRotation =
    Number.isFinite(
      settings.anchorRotation
    )
      ? settings.anchorRotation
      : getRotation(source);

  const anchorScaleX =
    Number.isFinite(
      settings.anchorScaleX
    )
      ? settings.anchorScaleX
      : sourceScale.x;

  const anchorScaleY =
    Number.isFinite(
      settings.anchorScaleY
    )
      ? settings.anchorScaleY
      : sourceScale.y;

  const usesLoopSpacing =
    Math.abs(
      Math.abs(settings.sweepAngle) - 360
    ) < 0.0001;

  const divisor =
    usesLoopSpacing
      ? settings.count
      : Math.max(
          1,
          settings.count - 1
        );

  repeat.replaceChildren();

  for (
    let index = 0;
    index < settings.count;
    index += 1
  ) {
    const clone =
      radialRepeatSourceElement(repeat);

    if (!clone) continue;

    prepareRadialRepeatChild(
      clone,
      index
    );

    if (index === 0) {
      clone.dataset.rotation =
        String(anchorRotation);

      clone.dataset.scaleX =
        String(anchorScaleX);

      clone.dataset.scaleY =
        String(anchorScaleY);

      if (settings.ghost) {
        clone.setAttribute(
          "opacity",
          "1"
        );
      } else {
        clone.removeAttribute(
          "opacity"
        );
      }

      repeat.appendChild(
        clone
      );

      positionRadialRepeatCloneCenter(
        clone,
        anchorCenterX,
        anchorCenterY
      );

      continue;
    }

    const progress =
      index /
      divisor;

    const angle =
      anchorAngle +
      settings.sweepAngle *
        progress;

    const radians =
      angle *
      Math.PI /
      180;

    const targetCenterX =
      centerX +
      radius *
      Math.cos(
        radians
      );

    const targetCenterY =
      centerY +
      radius *
      Math.sin(
        radians
      );

    const cloneRotation =
      settings.orientationMode ===
        "page-up"
        ? (
            anchorRotation +
            settings.rotationStep
          )
        : (
            Math.atan2(
              centerY - targetCenterY,
              centerX - targetCenterX
            ) *
            180 /
            Math.PI +
            90 +
            settings.rotationStep
          );

    clone.dataset.rotation =
      String(
        cloneRotation
      );

    const progressionScale =
      Math.max(
        0.05,
        1 +
        (
          settings.scaleStep *
          index
        ) /
        100
      );

    clone.dataset.scaleX =
      String(
        anchorScaleX *
        progressionScale
      );

    clone.dataset.scaleY =
      String(
        anchorScaleY *
        progressionScale
      );

    if (settings.ghost) {
      clone.setAttribute(
        "opacity",
        "0.35"
      );
    } else {
      clone.removeAttribute(
        "opacity"
      );
    }

    repeat.appendChild(
      clone
    );

    positionRadialRepeatCloneCenter(
      clone,
      targetCenterX,
      targetCenterY
    );
  }

  repeat.dataset.radialRepeatSettings =
    JSON.stringify(
      settings
    );

  applyObjectTransform(
    repeat
  );
}

function createRadialRepeatFromSelected() {
  const items =
    topLevelSelectedItems();

  if (
    items.length !== 1 ||
    isRadialRepeat(items[0])
  ) {
    toolStatus.textContent =
      "Select one object, then choose Radial Repeat";
    return null;
  }

  const source =
    items[0];

  if (
    isRasterImageElement(source)
  ) {
    toolStatus.textContent =
      "Radial Repeat currently supports vector/text objects";
    return null;
  }

  const box =
    editableLocalBounds(source);

  const center =
    canvasPointFromLocal(
      source,
      box.x + box.width / 2,
      box.y + box.height / 2
    );

  const sourceTranslation =
    getTranslation(source);

  const sourceScale =
    getObjectScale(source);

  radialRepeatCenterPick = {
    source,
    sourceCenter: center,
    sourceTx:
      sourceTranslation.x,
    sourceTy:
      sourceTranslation.y,
    sourceRotation:
      getRotation(source),
    sourceScaleX:
      sourceScale.x,
    sourceScaleY:
      sourceScale.y
  };

  document
    .querySelectorAll(
      ".radial-repeat-tool"
    )
    .forEach(
      button =>
        button.classList.add(
          "active"
        )
    );

  toolStatus.textContent =
    "Radial Repeat: click a center point on the canvas";

  selectionQuickMenu.hidden =
    true;

  svg.style.cursor =
    "crosshair";

  return null;
}

function commitRadialRepeatCenter(
  point
) {
  const pending =
    radialRepeatCenterPick;

  if (
    !pending ||
    !pending.source?.isConnected
  ) {
    radialRepeatCenterPick =
      null;
    return null;
  }

  const source =
    pending.source;

  const sourceCenter =
    pending.sourceCenter;

  const dx =
    sourceCenter.x -
    point.x;

  const dy =
    sourceCenter.y -
    point.y;

  const radius =
    Math.max(
      1,
      Math.hypot(
        dx,
        dy
      )
    );

  const startAngle =
    Math.atan2(
      dy,
      dx
    ) *
    180 /
    Math.PI;

  const repeat =
    document.createElementNS(
      SVG_NS,
      "g"
    );

  objectCounter += 1;

  repeat.dataset.object =
    "true";
  repeat.dataset.group =
    "true";
  repeat.dataset.radialRepeat =
    "true";
  repeat.dataset.name =
    `Radial Repeat ${objectCounter}`;
  repeat.dataset.tx =
    "0";
  repeat.dataset.ty =
    "0";
  repeat.dataset.rotation =
    "0";
  repeat.dataset.scaleX =
    "1";
  repeat.dataset.scaleY =
    "1";
  repeat.dataset.hidden =
    "false";
  repeat.dataset.locked =
    "false";

  repeat.dataset.radialRepeatSource =
    JSON.stringify(
      serializeElementForProject(
        source
      )
    );

  repeat.dataset.radialRepeatSettings =
    JSON.stringify(
      normalizeRadialRepeatSettings({
        count:
          radialRepeatCount.value,
        radius,
        centerX:
          point.x,
        centerY:
          point.y,
        startAngle,
        sweepAngle:
          radialRepeatSweepAngle.value,
        orientationMode:
          radialRepeatOrientation.value,
        rotationStep:
          radialRepeatRotation.value,
        scaleStep:
          radialRepeatScale.value,
        ghost: true,
        committed: false,
        anchorCenterX:
          sourceCenter.x,
        anchorCenterY:
          sourceCenter.y,
        anchorTx:
          pending.sourceTx,
        anchorTy:
          pending.sourceTy,
        anchorRotation:
          pending.sourceRotation,
        anchorScaleX:
          pending.sourceScaleX,
        anchorScaleY:
          pending.sourceScaleY
      })
    );

  art.insertBefore(
    repeat,
    source
  );

  source.remove();

  radialRepeatCenterPick =
    null;

  clearSnapGuides();

  radialRepeatPanelRequested =
    true;

  renderRadialRepeat(
    repeat
  );

  setSelection(
    [repeat],
    repeat
  );

  drawSelection();

  renderLayers();
  syncRadialRepeatPanel();

  toolStatus.textContent =
    "Radial Repeat: live preview active";

  recordHistory({
    label:
      "Radial Repeat Created",
    detail:
      `${radialRepeatCount.value} live copies`
  });

  return repeat;
}




function snapRadialRepeatCenterToShapeCenter(
  point,
  shapeCenter
) {
  if (!shapeCenter) {
    return {
      point,
      snapped: false
    };
  }

  const threshold =
    snapThreshold();

  const distance =
    Math.hypot(
      point.x - shapeCenter.x,
      point.y - shapeCenter.y
    );

  if (distance > threshold) {
    return {
      point,
      snapped: false
    };
  }

  currentSnapGuides = {
    x: shapeCenter.x,
    y: shapeCenter.y
  };

  pushSmartGuideIntersection(
    shapeCenter.x,
    shapeCenter.y
  );

  pushSmartGuideLabel(
    shapeCenter.x +
      10 /
        Math.max(
          zoom,
          0.05
        ),
    shapeCenter.y -
      12 /
        Math.max(
          zoom,
          0.05
        ),
    "Center",
    "alignment"
  );

  return {
    point: {
      x: shapeCenter.x,
      y: shapeCenter.y
    },
    snapped: true
  };
}

function snapRadialRepeatCenterPoint(
  point,
  shapeCenter,
  excludeElements = []
) {
  /*
   * Radial-center snapping order:
   * 1) existing app snapping (grid/guides/object/canvas)
   * 2) direct snap to the selected shape's center
   * 3) 45° angle snap relative to the selected shape's center
   */
  let snapped =
    snapPoint(
      point,
      excludeElements
    );

  const centerSnap =
    snapRadialRepeatCenterToShapeCenter(
      snapped,
      shapeCenter
    );

  if (centerSnap.snapped) {
    return centerSnap.point;
  }

  if (shapeCenter) {
    const angleSnap =
      smartAngleSnapPoint(
        snapped,
        shapeCenter,
        45,
        4
      );

    snapped = angleSnap.point;
  }

  return snapped;
}

function radialRepeatAnchorCenter(
  repeat
) {
  if (
    !repeat ||
    !isRadialRepeat(
      repeat
    )
  ) {
    return null;
  }

  const first =
    repeat.querySelector(
      "[data-radial-repeat-index='0']"
    );

  if (!first) {
    return null;
  }

  const box =
    editableLocalBounds(
      first
    );

  return canvasPointFromLocal(
    first,
    box.x + box.width / 2,
    box.y + box.height / 2
  );
}

function commitSelectedRadialRepeat() {
  const repeat = selectedRadialRepeat();
  if (!repeat) return false;

  const settings =
    normalizeRadialRepeatSettings(
      radialRepeatSettings(repeat) || {}
    );

  settings.ghost = false;
  settings.committed = true;

  repeat.dataset.radialRepeatSettings =
    JSON.stringify(settings);

  renderRadialRepeat(repeat);

  radialRepeatCenterDrag =
    null;

  radialRepeatCenterPick =
    null;

  radialRepeatPanelRequested =
    false;

  radialRepeatPanel.hidden =
    true;

  clearSnapGuides();

  document
    .querySelectorAll(".radial-repeat-tool")
    .forEach(button =>
      button.classList.remove("active")
    );

  drawSelection();
  renderLayers();

  toolStatus.textContent =
    "Radial Repeat committed";

  recordHistory({
    label: "Radial Repeat Committed",
    detail: `${settings.count} copies`
  });

  scheduleAutosave();
  return true;
}

function selectedRadialRepeat() {
  return selectedItems.length === 1 && isRadialRepeat(selectedItems[0])
    ? selectedItems[0]
    : null;
}

function isRadialRepeatEditingActive(
  repeat = selectedRadialRepeat()
) {
  return Boolean(
    radialRepeatCenterPick ||
    radialRepeatCenterDrag ||
    (
      repeat &&
      radialRepeatPanelRequested
    )
  );
}


function clampRadialRepeatPanelPosition(left, top) {
  const stageRect = stage.getBoundingClientRect();
  const panelRect = radialRepeatPanel.getBoundingClientRect();
  const padding = 8;
  return {
    left: Math.max(padding, Math.min(left, Math.max(padding, stageRect.width - panelRect.width - padding))),
    top: Math.max(padding, Math.min(top, Math.max(padding, stageRect.height - panelRect.height - padding)))
  };
}

function positionRadialRepeatPanel() {
  if (radialRepeatPanel.hidden) return;
  if (radialRepeatPanelManualPosition) {
    const clamped = clampRadialRepeatPanelPosition(radialRepeatPanelManualPosition.left, radialRepeatPanelManualPosition.top);
    radialRepeatPanelManualPosition = clamped;
    radialRepeatPanel.style.left = `${clamped.left}px`;
    radialRepeatPanel.style.top = `${clamped.top}px`;
    return;
  }
  const stageRect =
    stage.getBoundingClientRect();

  const panelRect =
    radialRepeatPanel.getBoundingClientRect();

  radialRepeatPanel.style.left =
    `${Math.max(
      8,
      (
        stageRect.width -
        panelRect.width
      ) / 2
    )}px`;

  radialRepeatPanel.style.top =
    "12px";
}

function syncRadialRepeatPanel() {
  const repeat = selectedRadialRepeat();
  const editingActive =
    isRadialRepeatEditingActive(
      repeat
    );

  document
    .querySelectorAll(
      ".radial-repeat-tool"
    )
    .forEach(
      button =>
        button.classList.toggle(
          "active",
          editingActive
        )
    );

  if (
    editingActive
  ) {
    document
      .querySelectorAll(
        ".repeat-grid-tool"
      )
      .forEach(
        button =>
          button.classList.remove(
            "active"
          )
      );
  }

  const settingsForVisibility =
    repeat
      ? normalizeRadialRepeatSettings(
          radialRepeatSettings(repeat) || {}
        )
      : null;

  radialRepeatPanel.hidden =
    !repeat ||
    (
      settingsForVisibility?.committed === true &&
      !radialRepeatPanelRequested
    );

  if (!repeat) return;
  const settings = normalizeRadialRepeatSettings(radialRepeatSettings(repeat) || {});
  radialRepeatCount.value = settings.count;
  radialRepeatRadius.value = settings.radius;
  radialRepeatStartAngle.value = settings.startAngle;
  radialRepeatSweepAngle.value = settings.sweepAngle;
  radialRepeatOrientation.value = settings.orientationMode;
  radialRepeatRotation.value = settings.rotationStep;
  radialRepeatScale.value = settings.scaleStep;
  requestAnimationFrame(positionRadialRepeatPanel);
}

function beginRadialRepeatPanelDrag(event) {
  if (event.button !== 0) return;
  const rect = radialRepeatPanel.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  radialRepeatPanelDrag = {
    pointerId: event.pointerId,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
    stageLeft: stageRect.left,
    stageTop: stageRect.top
  };
  radialRepeatPanel.setPointerCapture(event.pointerId);
  event.preventDefault();
}

function updateRadialRepeatPanelDrag(event) {
  if (!radialRepeatPanelDrag || radialRepeatPanelDrag.pointerId !== event.pointerId) return;
  const next = clampRadialRepeatPanelPosition(
    event.clientX - radialRepeatPanelDrag.stageLeft - radialRepeatPanelDrag.offsetX,
    event.clientY - radialRepeatPanelDrag.stageTop - radialRepeatPanelDrag.offsetY
  );
  radialRepeatPanelManualPosition = next;
  radialRepeatPanel.style.left = `${next.left}px`;
  radialRepeatPanel.style.top = `${next.top}px`;
}

function endRadialRepeatPanelDrag(event) {
  if (!radialRepeatPanelDrag || radialRepeatPanelDrag.pointerId !== event.pointerId) return;
  if (radialRepeatPanel.hasPointerCapture(event.pointerId)) {
    radialRepeatPanel.releasePointerCapture(event.pointerId);
  }
  radialRepeatPanelDrag = null;
}

function currentRadialRepeatInlineSettings() {
  const repeat =
    selectedRadialRepeat();

  const existing =
    repeat
      ? normalizeRadialRepeatSettings(
          radialRepeatSettings(repeat) || {}
        )
      : normalizeRadialRepeatSettings();

  return normalizeRadialRepeatSettings({
    count: radialRepeatCount.value,
    radius: radialRepeatRadius.value,
    centerX: existing.centerX,
    centerY: existing.centerY,
    startAngle: radialRepeatStartAngle.value,
    sweepAngle: radialRepeatSweepAngle.value,
    orientationMode: radialRepeatOrientation.value,
    rotationStep: radialRepeatRotation.value,
    scaleStep: radialRepeatScale.value,
    ghost: existing.ghost,
    committed: existing.committed,
    anchorCenterX:
      existing.anchorCenterX,
    anchorCenterY:
      existing.anchorCenterY,
    anchorTx:
      existing.anchorTx,
    anchorTy:
      existing.anchorTy,
    anchorRotation:
      existing.anchorRotation,
    anchorScaleX:
      existing.anchorScaleX,
    anchorScaleY:
      existing.anchorScaleY
  });
}

function updateSelectedRadialRepeatLive(
  record = false
) {
  const repeat =
    selectedRadialRepeat();

  if (!repeat) return;

  const previous =
    normalizeRadialRepeatSettings(
      radialRepeatSettings(repeat) || {}
    );

  const settings =
    currentRadialRepeatInlineSettings();

  /*
   * The placed reference point is the true radial center.
   * If Radius is edited directly, move that center along the existing
   * anchor-to-center ray so the original shape remains fixed.
   */
  const requestedRadius =
    Math.max(
      0,
      Number(radialRepeatRadius.value) || 0
    );

  const currentDx =
    previous.anchorCenterX -
    previous.centerX;

  const currentDy =
    previous.anchorCenterY -
    previous.centerY;

  const currentDistance =
    Math.hypot(
      currentDx,
      currentDy
    );

  if (
    Number.isFinite(previous.anchorCenterX) &&
    Number.isFinite(previous.anchorCenterY) &&
    Math.abs(
      requestedRadius -
      currentDistance
    ) > 1e-9
  ) {
    const angle =
      currentDistance > 1e-9
        ? Math.atan2(
            currentDy,
            currentDx
          )
        : 0;

    settings.centerX =
      previous.anchorCenterX -
      requestedRadius *
      Math.cos(angle);

    settings.centerY =
      previous.anchorCenterY -
      requestedRadius *
      Math.sin(angle);

    settings.radius =
      requestedRadius;
  }

  repeat.dataset.radialRepeatSettings =
    JSON.stringify(settings);

  renderRadialRepeat(repeat);

  drawSelection();
  updateTransformPanel();
  renderLayers();
  renderSelectionQuickMenu();

  if (record) {
    recordHistory({
      label:
        "Radial Repeat Updated",
      detail:
        `${settings.count} live copies`
    });
  } else {
    scheduleAutosave();
  }
}

[
  radialRepeatCount,
  radialRepeatRadius,
  radialRepeatStartAngle,
  radialRepeatSweepAngle,
  radialRepeatOrientation,
  radialRepeatRotation,
  radialRepeatScale
].forEach(control => {
  control.addEventListener("input", () => updateSelectedRadialRepeatLive(false));
  control.addEventListener("change", () => updateSelectedRadialRepeatLive(true));
});

function expandRadialRepeatToPaths(repeat) {
  if (!isRadialRepeat(repeat) || repeat.parentNode !== art) return [];
  const revealed = [];
  const repeatTranslation = getTranslation(repeat);
  const repeatRotation = getRotation(repeat);
  const repeatScale = getObjectScale(repeat);

  [...repeat.children].forEach(child => {
    const childClone = child.cloneNode(true);
    if (child._anchors) {
      childClone._anchors = child._anchors.map(anchor => ({ ...anchor }));
    }
    childClone.dataset.object = "true";
    delete childClone.dataset.groupChild;
    delete childClone.dataset.radialRepeatChild;
    delete childClone.dataset.radialRepeatIndex;
    objectCounter += 1;
    childClone.dataset.name = `Radial ${objectCounter}`;

    const childT = getTranslation(childClone);
    const childScale = getObjectScale(childClone);
    childClone.dataset.tx = String(childT.x + repeatTranslation.x);
    childClone.dataset.ty = String(childT.y + repeatTranslation.y);
    childClone.dataset.rotation = String(getRotation(childClone) + repeatRotation);
    childClone.dataset.scaleX = String(childScale.x * repeatScale.x);
    childClone.dataset.scaleY = String(childScale.y * repeatScale.y);
    applyObjectTransform(childClone);
    art.insertBefore(childClone, repeat);
    revealed.push(childClone);
  });

  if (selectedItems.includes(repeat)) {
    const primary = revealed[0] || null;
    setSelection(revealed, primary);
  }
  repeat.remove();
  renderLayers();
  drawSelection();
  recordHistory({ label: "Radial Repeat Expanded", detail: `${revealed.length} independent objects` });
  return revealed;
}

doneRadialRepeatPanelButton.addEventListener(
  "click",
  () => {
    commitSelectedRadialRepeat();
  }
);

expandRadialRepeatPanelButton.addEventListener("click", () => {
  const repeat = selectedRadialRepeat();
  if (repeat) expandRadialRepeatToPaths(repeat);
});

closeRadialRepeatPanelButton.addEventListener("click", () => {
  radialRepeatCenterDrag =
    null;

  radialRepeatCenterPick =
    null;

  radialRepeatPanelRequested =
    false;

  radialRepeatPanel.hidden =
    true;

  clearSnapGuides();
  drawSelection();
  syncRadialRepeatPanel();

  toolStatus.textContent =
    "Radial Repeat editing hidden";
});

radialRepeatPanel.addEventListener("pointerdown", event => {
  if (event.target.closest("[data-radial-repeat-panel-drag='true']") && !event.target.closest("button")) {
    beginRadialRepeatPanelDrag(event);
  }
});
radialRepeatPanel.addEventListener("pointermove", updateRadialRepeatPanelDrag);
radialRepeatPanel.addEventListener("pointerup", endRadialRepeatPanelDrag);
radialRepeatPanel.addEventListener("pointercancel", endRadialRepeatPanelDrag);






function ensurePathConstraintId(
  path
) {
  if (
    !path ||
    path.tagName !== "path"
  ) {
    return "";
  }

  let id =
    path.dataset.constraintPathId ||
    "";

  const duplicate =
    id &&
    [
      ...art.querySelectorAll(
        'path[data-constraint-path-id]'
      )
    ].some(
      other =>
        other !== path &&
        other.dataset.constraintPathId ===
          id
    );

  if (
    !id ||
    duplicate
  ) {
    pathConstraintIdCounter +=
      1;

    id =
      `path-${Date.now().toString(36)}-${pathConstraintIdCounter}`;

    path.dataset.constraintPathId =
      id;
  }

  return id;
}

function pathForConstraintId(
  id
) {
  if (!id) return null;

  return [
    ...art.querySelectorAll(
      'path[data-constraint-path-id]'
    )
  ].find(
    path =>
      path.dataset.constraintPathId ===
        id
  ) || null;
}

function normalizeDocumentGeometryConstraints(
  constraints
) {
  if (!Array.isArray(constraints)) {
    return [];
  }

  return constraints
    .filter(
      constraint =>
        constraint &&
        ["cross-distance", "cross-distance-x", "cross-distance-y",
          "edge-parallel",
          "edge-perpendicular"].includes(
          constraint.type
        ) &&
        constraint.a?.pathId &&
        Number.isInteger(
          constraint.a.anchor
        ) &&
        constraint.b?.pathId &&
        Number.isInteger(
          constraint.b.anchor
        )
    )
    .map(
      constraint => ({
        ...constraint,
        value:
          Math.max(
            0.01,
            Number(
              constraint.value
            ) || 0.01
          )
      })
    );
}

function selectedSingleConstraintEndpoint() {
  const path =
    selectedConstraintPath();

  const indices =
    selectedConstraintVertexIndices();

  if (
    !path ||
    indices.length !== 1
  ) {
    return null;
  }

  const anchorIndex =
    indices[0];

  if (
    !path._anchors[
      anchorIndex
    ]
  ) {
    return null;
  }

  return {
    pathId:
      ensurePathConstraintId(
        path
      ),
    anchor:
      anchorIndex
  };
}

function constraintEndpointLabel(
  endpoint,
  prefix
) {
  if (!endpoint) {
    return `${prefix}: not set`;
  }

  const path =
    pathForConstraintId(
      endpoint.pathId
    );

  const name =
    path?.dataset.name ||
    "Path";

  return `${prefix}: ${name}, V${endpoint.anchor + 1}`;
}

function captureCrossConstraintEndpoint(
  side
) {
  const endpoint =
    selectedSingleConstraintEndpoint();

  if (!endpoint) {
    toolStatus.textContent =
      "Select exactly one vertex on one editable path";
    return;
  }

  if (side === "a") {
    crossConstraintEndpointA =
      endpoint;
  } else {
    crossConstraintEndpointB =
      endpoint;
  }

  if (
    crossConstraintEndpointA &&
    crossConstraintEndpointB
  ) {
    const aPath =
      pathForConstraintId(
        crossConstraintEndpointA.pathId
      );

    const bPath =
      pathForConstraintId(
        crossConstraintEndpointB.pathId
      );

    const a =
      aPath?._anchors?.[
        crossConstraintEndpointA.anchor
      ];

    const b =
      bPath?._anchors?.[
        crossConstraintEndpointB.anchor
      ];

    if (
      aPath &&
      bPath &&
      a &&
      b
    ) {
      const ca =
        canvasPointFromLocal(
          aPath,
          a.x,
          a.y
        );

      const cb =
        canvasPointFromLocal(
          bPath,
          b.x,
          b.y
        );

      crossConstraintDistanceInput.value =
        String(
          Number(
            Math.hypot(
              cb.x - ca.x,
              cb.y - ca.y
            ).toFixed(2)
          )
        );
    }
  }

  syncGeometryConstraintsPanel();
}



function constraintMakerHitEdge(clientX, clientY) {
  const p = pointerPosition({ clientX, clientY });
  const radius = 10 / Math.max(zoom, 0.3);
  let best = null;

  selectedItems
    .filter(
      path =>
        path?.tagName ===
          "path"
    )
    .forEach(path => {
    normalizePathForEditing(path);
    if (!Array.isArray(path._anchors) || path._anchors.length < 2) return;

    ensurePathConstraintId(path);

    const count = path._anchors.length;
    const closed = path.dataset.closed === "true";

    const segmentCount = closed ? count : count - 1;

    for (let i = 0; i < segmentCount; i += 1) {
      const j = (i + 1) % count;
      const aLocal = path._anchors[i];
      const bLocal = path._anchors[j];
      const a = canvasPointFromLocal(path, aLocal.x, aLocal.y);
      const b = canvasPointFromLocal(path, bLocal.x, bLocal.y);

      const vx = b.x - a.x;
      const vy = b.y - a.y;
      const len2 = vx * vx + vy * vy;
      if (len2 < 1e-9) continue;

      let t = ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2;
      t = Math.max(0, Math.min(1, t));

      const q = {
        x: a.x + vx * t,
        y: a.y + vy * t
      };

      const d = Math.hypot(p.x - q.x, p.y - q.y);

      if (d <= radius && (!best || d < best.distance)) {
        best = {
          type: "edge",
          path,
          aIndex: i,
          bIndex: j,
          a,
          b,
          point: q,
          distance: d
        };
      }
    }
  });

  return best;
}

function constraintMakerHitGeometry(clientX, clientY) {
  const vertex = constraintMakerHitVertex(clientX, clientY);
  if (vertex) {
    return {
      type: "vertex",
      ...vertex
    };
  }

  return constraintMakerHitEdge(clientX, clientY);
}

function setConstraintMakerSelectionFromEdge(hit) {
  if (!hit || hit.type !== "edge") return false;

  crossConstraintEndpointA = {
    pathId: ensurePathConstraintId(hit.path),
    anchor: hit.aIndex
  };

  crossConstraintEndpointB = {
    pathId: ensurePathConstraintId(hit.path),
    anchor: hit.bIndex
  };

  constraintMakerSelection = {
    kind: "edge",
    edgePathId: crossConstraintEndpointA.pathId,
    aIndex: hit.aIndex,
    bIndex: hit.bIndex
  };

  constraintMakerActive = false;
  constraintMakerPlacement = null;
  constraintMakerPlacementMode = null;

  toolStatus.textContent =
    "Move the cursor to place a horizontal or vertical dimension";

  syncGeometryConstraintsPanel();
  drawSelection();
  return true;
}

function setConstraintMakerSelectionFromVertex(hit) {
  if (!hit || hit.type !== "vertex") return false;

  const endpoint = {
    pathId: ensurePathConstraintId(hit.path),
    anchor: hit.index
  };

  if (!crossConstraintEndpointA) {
    crossConstraintEndpointA = endpoint;
    crossConstraintEndpointB = null;
    constraintMakerStage = "b";
    constraintMakerSelection = {
      kind: "vertices"
    };

    toolStatus.textContent =
      "Distance: select the second vertex";

    syncGeometryConstraintsPanel();
    drawSelection();
    return true;
  }

  if (
    crossConstraintEndpointA.pathId === endpoint.pathId &&
    crossConstraintEndpointA.anchor === endpoint.anchor
  ) {
    return false;
  }

  crossConstraintEndpointB = endpoint;
  constraintMakerActive = false;
  constraintMakerStage = "a";
  constraintMakerPlacement = null;
  constraintMakerPlacementMode = null;
  constraintMakerSelection = {
    kind: "vertices"
  };

  toolStatus.textContent =
    "Move the cursor to place a horizontal or vertical dimension";

  syncGeometryConstraintsPanel();
  drawSelection();
  return true;
}

function constraintMakerSelectedCanvasPoints() {
  const a = documentConstraintEndpoint(crossConstraintEndpointA);
  const b = documentConstraintEndpoint(crossConstraintEndpointB);

  if (!a || !b) return null;

  return {
    a: a.point,
    b: b.point
  };
}

function updateConstraintMakerPlacementFromPointer(clientX, clientY) {
  const selected =
    constraintMakerSelectedCanvasPoints();

  if (!selected) {
    constraintMakerPlacement = null;
    constraintMakerPlacementMode = null;
    return;
  }

  const p =
    pointerPosition({
      clientX,
      clientY
    });

  const mid = {
    x:
      (
        selected.a.x +
        selected.b.x
      ) / 2,
    y:
      (
        selected.a.y +
        selected.b.y
      ) / 2
  };

  const edge = {
    x:
      selected.b.x -
      selected.a.x,
    y:
      selected.b.y -
      selected.a.y
  };

  const edgeLength =
    Math.max(
      1e-9,
      Math.hypot(
        edge.x,
        edge.y
      )
    );

  const tangent = {
    x:
      edge.x /
      edgeLength,
    y:
      edge.y /
      edgeLength
  };

  const normal = {
    x:
      -tangent.y,
    y:
      tangent.x
  };

  const cursor = {
    x:
      p.x -
      mid.x,
    y:
      p.y -
      mid.y
  };

  const tangentMotion =
    cursor.x *
      tangent.x +
    cursor.y *
      tangent.y;

  const normalMotion =
    cursor.x *
      normal.x +
    cursor.y *
      normal.y;

  const screenDx =
    p.x -
    mid.x;

  const screenDy =
    p.y -
    mid.y;

  /*
   * Pulling away roughly perpendicular to the selected edge chooses the
   * true distance / edge length dimension. The dimension line remains
   * parallel to the edge and follows the cursor to either side.
   */
  const edgeParallelCandidate =
    Math.abs(
      normalMotion
    ) >
    Math.max(
      12 /
        Math.max(
          zoom,
          0.3
        ),
      Math.abs(
        tangentMotion
      ) *
        1.35
    );

  if (
    edgeParallelCandidate
  ) {
    constraintMakerPlacementMode =
      "distance";

    const side =
      normalMotion < 0
        ? -1
        : 1;

    const offset =
      Math.max(
        22 /
          Math.max(
            zoom,
            0.3
          ),
        Math.abs(
          normalMotion
        )
      );

    const ox =
      normal.x *
      offset *
      side;

    const oy =
      normal.y *
      offset *
      side;

    constraintMakerPlacement = {
      mode:
        "distance",
      guide: {
        x1:
          selected.a.x +
          ox,
        y1:
          selected.a.y +
          oy,
        x2:
          selected.b.x +
          ox,
        y2:
          selected.b.y +
          oy
      }
    };

    return;
  }

  if (
    Math.abs(
      screenDy
    ) >=
    Math.abs(
      screenDx
    )
  ) {
    constraintMakerPlacementMode =
      "distance-x";

    const sign =
      screenDy < 0
        ? -1
        : 1;

    const offset =
      Math.max(
        22 /
          Math.max(
            zoom,
            0.3
          ),
        Math.abs(
          screenDy
        )
      );

    constraintMakerPlacement = {
      mode:
        "distance-x",
      guide: {
        x1:
          selected.a.x,
        y1:
          mid.y +
          sign *
            offset,
        x2:
          selected.b.x,
        y2:
          mid.y +
          sign *
            offset
      }
    };
  } else {
    constraintMakerPlacementMode =
      "distance-y";

    const sign =
      screenDx < 0
        ? -1
        : 1;

    const offset =
      Math.max(
        22 /
          Math.max(
            zoom,
            0.3
          ),
        Math.abs(
          screenDx
        )
      );

    constraintMakerPlacement = {
      mode:
        "distance-y",
      guide: {
        x1:
          mid.x +
          sign *
            offset,
        y1:
          selected.a.y,
        x2:
          mid.x +
          sign *
            offset,
        y2:
          selected.b.y
      }
    };
  }
}

function placeConstraintMakerDimension() {
  if (
    !crossConstraintEndpointA ||
    !crossConstraintEndpointB ||
    !constraintMakerPlacementMode
  ) {
    return false;
  }

  constraintMakerType =
    constraintMakerPlacementMode;

  const currentValue =
    constraintMakerEndpointValue();

  crossConstraintDistanceInput.value =
    String(
      Number(
        currentValue.toFixed(2)
      )
    );

  addCrossPathDistanceConstraint();

  constraintMakerPlacement = null;
  constraintMakerPlacementMode = null;
  constraintMakerSelection = null;
  constraintMakerAutoFirstEdge = null;
  constraintMakerStage = "a";

  toolStatus.textContent =
    "Dimension constraint placed";

  return true;
}

function drawConstraintMakerPlacementPreview() {
  if (
    constraintMakerAnglePlacement ||
    constraintMakerPendingPlacement?.mode ===
      "angle"
  ) {
    return;
  }

  if (
    !constraintMakerPlacement ||
    !crossConstraintEndpointA ||
    !crossConstraintEndpointB
  ) {
    return;
  }

  const selected = constraintMakerSelectedCanvasPoints();
  if (!selected) return;

  const guide = constraintMakerPlacement.guide;

  const extensionClass =
    "constraint-maker-placement-extension";

  if (
    constraintMakerPlacement.mode === "distance-x"
  ) {
    [
      [selected.a.x, selected.a.y, guide.x1, guide.y1],
      [selected.b.x, selected.b.y, guide.x2, guide.y2]
    ].forEach(values => {
      selectionOverlay.appendChild(
        svgEl("line", {
          x1: values[0],
          y1: values[1],
          x2: values[2],
          y2: values[3],
          class: extensionClass,
          "pointer-events": "none"
        })
      );
    });
  } else {
    [
      [selected.a.x, selected.a.y, guide.x1, guide.y1],
      [selected.b.x, selected.b.y, guide.x2, guide.y2]
    ].forEach(values => {
      selectionOverlay.appendChild(
        svgEl("line", {
          x1: values[0],
          y1: values[1],
          x2: values[2],
          y2: values[3],
          class: extensionClass,
          "pointer-events": "none"
        })
      );
    });
  }

  selectionOverlay.appendChild(
    svgEl("line", {
      x1: guide.x1,
      y1: guide.y1,
      x2: guide.x2,
      y2: guide.y2,
      class:
        constraintMakerPlacement.mode === "distance"
          ? "constraint-maker-placement-line constraint-maker-edge-distance-line"
          : "constraint-maker-placement-line",
      "pointer-events": "none"
    })
  );

  const label = svgEl("text", {
    x: (guide.x1 + guide.x2) / 2,
    y: (guide.y1 + guide.y2) / 2 -
      8 / Math.max(zoom, 0.3),
    class: "constraint-maker-placement-label",
    "text-anchor": "middle",
    "pointer-events": "none"
  });

  const value =
    constraintMakerPlacement.mode ===
      "distance-x"
      ? Math.abs(
          selected.b.x -
          selected.a.x
        )
      : constraintMakerPlacement.mode ===
          "distance-y"
        ? Math.abs(
            selected.b.y -
            selected.a.y
          )
        : Math.hypot(
            selected.b.x -
              selected.a.x,
            selected.b.y -
              selected.a.y
          );

  const prefix =
    constraintMakerPlacement.mode ===
      "distance-x"
      ? "ΔX"
      : constraintMakerPlacement.mode ===
          "distance-y"
        ? "ΔY"
        : "D";

  label.textContent =
    `${prefix} ${Number(value.toFixed(1))} px`;

  selectionOverlay.appendChild(label);
}


function edgeConstraintRefFromHit(hit) {
  if (!hit || hit.type !== "edge") return null;

  return {
    pathId: ensurePathConstraintId(hit.path),
    a: hit.aIndex,
    b: hit.bIndex
  };
}

function edgeConstraintRefKey(edge) {
  if (!edge) return "";
  const low = Math.min(edge.a, edge.b);
  const high = Math.max(edge.a, edge.b);
  return `${edge.pathId}:${low}-${high}`;
}

function constraintEdgeCanvasData(edge) {
  const path = pathForConstraintId(edge?.pathId);
  const a = path?._anchors?.[edge?.a];
  const b = path?._anchors?.[edge?.b];

  if (!path || !a || !b) return null;

  return {
    path,
    aIndex: edge.a,
    bIndex: edge.b,
    a: canvasPointFromLocal(path, a.x, a.y),
    b: canvasPointFromLocal(path, b.x, b.y)
  };
}

function adjacentConstraintEdgesData() {
  if (constraintMakerSelectedEdges.length !== 2) return null;

  const first = constraintEdgeCanvasData(constraintMakerSelectedEdges[0]);
  const second = constraintEdgeCanvasData(constraintMakerSelectedEdges[1]);

  if (!first || !second || first.path !== second.path) return null;

  const shared = [first.aIndex, first.bIndex].find(
    index => index === second.aIndex || index === second.bIndex
  );

  if (!Number.isInteger(shared)) return null;

  const firstOuter = first.aIndex === shared ? first.bIndex : first.aIndex;
  const secondOuter = second.aIndex === shared ? second.bIndex : second.aIndex;

  const path = first.path;
  const pivotAnchor = path._anchors[shared];
  const aAnchor = path._anchors[firstOuter];
  const cAnchor = path._anchors[secondOuter];

  if (!pivotAnchor || !aAnchor || !cAnchor) return null;

  return {
    path,
    pathId: ensurePathConstraintId(path),
    aIndex: firstOuter,
    pivotIndex: shared,
    cIndex: secondOuter,
    a: canvasPointFromLocal(path, aAnchor.x, aAnchor.y),
    pivot: canvasPointFromLocal(path, pivotAnchor.x, pivotAnchor.y),
    c: canvasPointFromLocal(path, cAnchor.x, cAnchor.y)
  };
}

function constraintAngleDegrees(data) {
  if (!data) return 0;

  const aAngle = Math.atan2(
    data.a.y - data.pivot.y,
    data.a.x - data.pivot.x
  );

  const cAngle = Math.atan2(
    data.c.y - data.pivot.y,
    data.c.x - data.pivot.x
  );

  let delta = cAngle - aAngle;

  while (delta <= -Math.PI) delta += Math.PI * 2;
  while (delta > Math.PI) delta -= Math.PI * 2;

  return Math.abs(delta * 180 / Math.PI);
}


function angleHoverEdgeIsValid(hit) {
  if (!hit || hit.type !== "edge") {
    return false;
  }

  if (
    constraintMakerSelectedEdges.length === 0
  ) {
    return true;
  }

  const first =
    constraintMakerSelectedEdges[0];

  const candidate =
    edgeConstraintRefFromHit(hit);

  if (
    !first ||
    !candidate ||
    first.pathId !== candidate.pathId
  ) {
    return false;
  }

  return [first.a, first.b].some(
    index =>
      index === candidate.a ||
      index === candidate.b
  );
}

function updateConstraintMakerAngleHover(
  clientX,
  clientY
) {
  const hit =
    constraintMakerHitEdge(
      clientX,
      clientY
    );

  constraintMakerAngleHoverEdge =
    angleHoverEdgeIsValid(hit)
      ? hit
      : null;
}

function selectConstraintMakerAngleEdge(hit) {
  const ref = edgeConstraintRefFromHit(hit);
  if (!ref) return false;

  constraintMakerAngleHoverEdge = null;

  const key = edgeConstraintRefKey(ref);
  const existing = constraintMakerSelectedEdges.findIndex(
    edge => edgeConstraintRefKey(edge) === key
  );

  if (existing >= 0) {
    constraintMakerSelectedEdges.splice(existing, 1);
    drawSelection();
    return true;
  }

  if (constraintMakerSelectedEdges.length >= 2) {
    constraintMakerSelectedEdges = [];
  }

  constraintMakerSelectedEdges.push(ref);

  if (constraintMakerSelectedEdges.length === 2) {
    const adjacent = adjacentConstraintEdgesData();

    if (!adjacent) {
      constraintMakerSelectedEdges = [ref];
      toolStatus.textContent =
        "Angle: choose an edge adjacent to the first edge";
      drawSelection();
      return true;
    }

    constraintMakerActive = false;
    constraintMakerAngleHoverEdge = null;
    constraintMakerAnglePlacement = {
      radius: 34 / Math.max(zoom, 0.3)
    };

    toolStatus.textContent =
      "Move the cursor to position the angle dimension";

    drawSelection();
    return true;
  }

  toolStatus.textContent =
    "Angle: choose the adjacent edge";

  drawSelection();
  return true;
}

function updateConstraintMakerAnglePlacement(clientX, clientY) {
  const data =
    adjacentConstraintEdgesData();

  if (!data) {
    constraintMakerAnglePlacement =
      null;
    return;
  }

  const p =
    pointerPosition({
      clientX,
      clientY
    });

  const distance =
    Math.hypot(
      p.x -
        data.pivot.x,
      p.y -
        data.pivot.y
    );

  /*
   * Keep the arc tied to the shared vertex and let the cursor control how
   * far the dimension sits from it. Clamp the maximum so the preview cannot
   * shoot far away if the pointer leaves the artwork.
   */
  const minimum =
    24 /
    Math.max(
      zoom,
      0.3
    );

  const maximum =
    180 /
    Math.max(
      zoom,
      0.3
    );

  constraintMakerAnglePlacement = {
    radius:
      Math.max(
        minimum,
        Math.min(
          maximum,
          distance
        )
      )
  };
}

function anglePlacementArcPoints(data, placement) {
  if (!data || !placement) return [];

  const start = Math.atan2(
    data.a.y - data.pivot.y,
    data.a.x - data.pivot.x
  );

  const end = Math.atan2(
    data.c.y - data.pivot.y,
    data.c.x - data.pivot.x
  );

  let delta = end - start;

  while (delta <= -Math.PI) delta += Math.PI * 2;
  while (delta > Math.PI) delta -= Math.PI * 2;

  const points = [];
  const steps = 20;

  for (let i = 0; i <= steps; i += 1) {
    const angle = start + delta * (i / steps);
    points.push({
      x: data.pivot.x + Math.cos(angle) * placement.radius,
      y: data.pivot.y + Math.sin(angle) * placement.radius
    });
  }

  return points;
}

function drawConstraintMakerAnglePreview() {
  if (
    constraintMakerAngleHoverEdge
  ) {
    selectionOverlay.appendChild(
      svgEl(
        "line",
        {
          x1: constraintMakerAngleHoverEdge.a.x,
          y1: constraintMakerAngleHoverEdge.a.y,
          x2: constraintMakerAngleHoverEdge.b.x,
          y2: constraintMakerAngleHoverEdge.b.y,
          class: "constraint-maker-angle-hover-edge",
          "pointer-events": "none"
        }
      )
    );
  }
  (
    constraintMakerAnglePlacement
      ? constraintMakerSelectedEdges
      : []
  ).forEach(edge => {
    const edgeData = constraintEdgeCanvasData(edge);
    if (!edgeData) return;

    selectionOverlay.appendChild(
      svgEl("line", {
        x1: edgeData.a.x,
        y1: edgeData.a.y,
        x2: edgeData.b.x,
        y2: edgeData.b.y,
        class: "constraint-maker-angle-selected-edge",
        "pointer-events": "none"
      })
    );
  });

  const data = adjacentConstraintEdgesData();

  if (!data || !constraintMakerAnglePlacement) return;

  const points = anglePlacementArcPoints(
    data,
    constraintMakerAnglePlacement
  );

  if (points.length < 2) return;

  const firstArcPoint =
    points[0];

  const lastArcPoint =
    points[
      points.length - 1
    ];

  [
    firstArcPoint,
    lastArcPoint
  ].forEach(
    point => {
      selectionOverlay.appendChild(
        svgEl(
          "line",
          {
            x1:
              data.pivot.x,
            y1:
              data.pivot.y,
            x2:
              point.x,
            y2:
              point.y,
            class:
              "constraint-maker-angle-extension",
            "pointer-events":
              "none"
          }
        )
      );
    }
  );

  selectionOverlay.appendChild(
    svgEl("path", {
      d: points.map(
        (point, index) =>
          `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
      ).join(" "),
      class: "constraint-maker-angle-arc",
      fill: "none",
      "pointer-events": "none"
    })
  );

  const mid = points[Math.floor(points.length / 2)];

  const label = svgEl("text", {
    x: mid.x,
    y: mid.y - 8 / Math.max(zoom, 0.3),
    class: "constraint-maker-placement-label",
    "text-anchor": "middle",
    "pointer-events": "none"
  });

  label.textContent =
    `${Number(constraintAngleDegrees(data).toFixed(1))}°`;

  selectionOverlay.appendChild(label);
}

function beginAngleConstraintValueEntry() {
  const data = adjacentConstraintEdgesData();

  if (!data || !constraintMakerAnglePlacement) return false;

  constraintMakerPendingPlacement = {
    mode: "angle",
    angle: {
      pathId: data.pathId,
      a: data.aIndex,
      pivot: data.pivotIndex,
      c: data.cIndex
    }
  };

  constraintValuePopupInput.value =
    String(Number(constraintAngleDegrees(data).toFixed(2)));

  constraintValuePopup.querySelector("span").textContent = "°";
  constraintValuePopup.hidden = false;

  const points = anglePlacementArcPoints(
    data,
    constraintMakerAnglePlacement
  );

  const mid = points[Math.floor(points.length / 2)] || data.pivot;
  const svgPoint = svg.createSVGPoint();
  svgPoint.x = mid.x;
  svgPoint.y = mid.y;

  const screen = svgPoint.matrixTransform(svg.getScreenCTM());
  const stageRect = stage.getBoundingClientRect();

  constraintValuePopup.style.left =
    `${screen.x - stageRect.left + 10}px`;

  constraintValuePopup.style.top =
    `${screen.y - stageRect.top - 18}px`;

  toolStatus.textContent =
    "Enter angle and press Return";

  updateConstraintMakerUI();
  drawSelection();

  requestAnimationFrame(() => {
    constraintValuePopupInput.focus();
    constraintValuePopupInput.select();
  });

  return true;
}

function commitAngleConstraintValueEntry() {
  const pending = constraintMakerPendingPlacement;
  if (pending?.mode !== "angle") return false;

  const value = Math.max(
    0.1,
    Math.min(
      179.9,
      Number(constraintValuePopupInput.value) || 90
    )
  );

  const path = pathForConstraintId(pending.angle.pathId);

  if (
    !path ||
    !path._anchors?.[pending.angle.a] ||
    !path._anchors?.[pending.angle.pivot] ||
    !path._anchors?.[pending.angle.c]
  ) {
    return false;
  }

  const a = path._anchors[pending.angle.a];
  const pivot = path._anchors[pending.angle.pivot];
  const c = path._anchors[pending.angle.c];

  const signed = signedConstraintAngle(a, pivot, c);

  const constraints = pathGeometryConstraints(path);

  const candidate = {
    id: "",
    type: "angle",
    a: pending.angle.a,
    pivot: pending.angle.pivot,
    c: pending.angle.c,
    value,
    sign: signed < 0 ? -1 : 1
  };

  const preflight =
    preflightPathAngleConstraint(
      path,
      candidate
    );

  if (
    rejectConstraintPreflight(
      preflight
    )
  ) {
    constraintValuePopupInput.focus();
    constraintValuePopupInput.select();
    return false;
  }

  geometryConstraintCounter += 1;

  candidate.id =
    `angle-${Date.now()}-${geometryConstraintCounter}`;

  constraints.push(
    candidate
  );

  savePathGeometryConstraints(path, constraints);

  enforcePathGeometryConstraints(
    path,
    new Set([
      pending.angle.a,
      pending.angle.pivot
    ])
  );

  updatePathD(path);

  syncGeometryConstraintsPanel();

  recordHistory({
    label: "Angle Constraint Added",
    detail: `${value}°`
  });

  scheduleAutosave();

  toolStatus.textContent =
    "Angle constraint placed";

  clearConstraintInteractionPreview();
  rearmPersistentConstraintTool();

  return true;
}

function constraintMakerHitVertex(clientX, clientY) {
  const p = pointerPosition({ clientX, clientY });
  const radius = 11 / Math.max(zoom, 0.3);
  let best = null;

  selectedItems
    .filter(
      path =>
        path?.tagName ===
          "path"
    )
    .forEach(path => {
    normalizePathForEditing(path);
    if (!Array.isArray(path._anchors)) return;

    ensurePathConstraintId(path);

    path._anchors.forEach((anchor, index) => {
      const q = canvasPointFromLocal(path, anchor.x, anchor.y);
      const d = Math.hypot(q.x - p.x, q.y - p.y);

      if (d <= radius && (!best || d < best.distance)) {
        best = { path, index, point: q, distance: d };
      }
    });
  });

  return best;
}

function constraintMakerEndpointValue() {
  const a = documentConstraintEndpoint(crossConstraintEndpointA);
  const b = documentConstraintEndpoint(crossConstraintEndpointB);
  if (!a || !b) return 0;

  if (constraintMakerType === "distance-x") {
    return b.point.x - a.point.x;
  }

  if (constraintMakerType === "distance-y") {
    return b.point.y - a.point.y;
  }

  return Math.hypot(
    b.point.x - a.point.x,
    b.point.y - a.point.y
  );
}

function updateConstraintMakerUI() {
  parallelEdgesConstraintButton?.classList.toggle(
    "active",
    constraintEdgeRelationMode ===
      "edge-parallel"
  );

  perpendicularEdgesConstraintButton?.classList.toggle(
    "active",
    constraintEdgeRelationMode ===
      "edge-perpendicular"
  );


  constraintMakerTypeButtons.forEach(
    button => {
      button.classList.toggle(
        "active",
        button.dataset
          .constraintMakerType ===
          "auto"
      );
    }
  );

  const nativeVertexCount =
    selectedConstraintVertexRefs()
      .length;

  constraintMakerStatus.textContent =
    constraintMakerPendingPlacement
      ? (
          constraintMakerPendingPlacement
            ?.mode ===
            "angle"
            ? "Enter angle"
            : "Enter value"
        )
      : constraintMakerAnglePlacement
        ? "Place angle"
        : constraintMakerAngleHoverEdge
          ? "Angle"
          : constraintMakerPlacement
            ? (
                constraintMakerPlacementMode ===
                  "distance-x"
                  ? "Place ΔX"
                  : constraintMakerPlacementMode ===
                      "distance-y"
                    ? "Place ΔY"
                    : "Place distance"
              )
            : constraintMakerAutoFirstEdge
              ? "Distance or adjacent edge"
              : nativeVertexCount === 2
                ? "2 vertices selected"
                : constraintMakerActive
                  ? "Pick geometry"
                  : "Ready";

  startConstraintMakerButton.classList
    .toggle(
      "active",
      constraintToolPersistentActive
    );

  startConstraintMakerButton.textContent =
    constraintToolPersistentActive
      ? "Constraint Active"
      : "Activate Constraint";
}


function hideConstraintValuePopup() {
  constraintValuePopup.hidden = true;
  constraintValuePopup.style.left = "";
  constraintValuePopup.style.top = "";
}

function cancelConstraintMaking() {
  constraintEdgeRelationMode = null;
  constraintEdgeRelationFirst = null;
  constraintToolPersistentActive = false;
  constraintMakerActive = false;
  constraintMakerHover = null;
  constraintMakerPendingPlacement = null;
  constraintMakerPlacement = null;
  constraintMakerPlacementMode = null;
  constraintMakerSelection = null;
  constraintMakerSelectedEdges = [];
  constraintMakerAnglePlacement = null;
  constraintMakerAngleHoverEdge = null;
  crossConstraintEndpointA = null;
  crossConstraintEndpointB = null;
  constraintMakerStage = "a";

  hideConstraintValuePopup();
  updateConstraintMakerUI();
  drawSelection();

  svg.style.cursor =
    activeTool === "select" ||
    activeTool === "vertex"
      ? "default"
      : "crosshair";

  toolStatus.textContent =
    "Constraint cancelled";
}

function constraintPlacementCurrentValue() {
  const selected =
    constraintMakerSelectedCanvasPoints();

  if (!selected) return 0;

  if (
    constraintMakerPlacementMode ===
      "distance-x"
  ) {
    return (
      selected.b.x -
      selected.a.x
    );
  }

  if (
    constraintMakerPlacementMode ===
      "distance-y"
  ) {
    return (
      selected.b.y -
      selected.a.y
    );
  }

  return Math.hypot(
    selected.b.x -
      selected.a.x,
    selected.b.y -
      selected.a.y
  );
}

function positionConstraintValuePopup() {
  if (
    !constraintMakerPlacement ||
    constraintValuePopup.hidden
  ) {
    return;
  }

  const guide =
    constraintMakerPlacement.guide;

  const point =
    svg.createSVGPoint();

  point.x =
    (
      guide.x1 +
      guide.x2
    ) / 2;

  point.y =
    (
      guide.y1 +
      guide.y2
    ) / 2;

  const screen =
    point.matrixTransform(
      svg.getScreenCTM()
    );

  const stageRect =
    stage.getBoundingClientRect();

  constraintValuePopup.style.left =
    `${screen.x - stageRect.left + 10}px`;

  constraintValuePopup.style.top =
    `${screen.y - stageRect.top - 18}px`;
}

function beginConstraintValueEntry() {
  if (
    !constraintMakerPlacement ||
    !constraintMakerPlacementMode ||
    !crossConstraintEndpointA ||
    !crossConstraintEndpointB
  ) {
    return false;
  }

  constraintMakerPendingPlacement = {
    mode:
      constraintMakerPlacementMode,
    placement:
      JSON.parse(
        JSON.stringify(
          constraintMakerPlacement
        )
      )
  };

  /*
   * Freeze the chosen direction and line position.
   */
  constraintMakerPlacement =
    constraintMakerPendingPlacement
      .placement;

  constraintMakerPlacementMode =
    constraintMakerPendingPlacement
      .mode;

  constraintValuePopupInput.value =
    String(
      Number(
        constraintPlacementCurrentValue()
          .toFixed(
            2
          )
      )
    );

  constraintValuePopup.hidden =
    false;

  positionConstraintValuePopup();

  toolStatus.textContent =
    "Enter constraint value and press Return";

  updateConstraintMakerUI();
  drawSelection();

  requestAnimationFrame(
    () => {
      constraintValuePopupInput.focus();
      constraintValuePopupInput.select();
    }
  );

  return true;
}

function commitConstraintValueEntry() {
  if (
    !constraintMakerPendingPlacement ||
    !crossConstraintEndpointA ||
    !crossConstraintEndpointB
  ) {
    return false;
  }

  const value =
    Number(
      constraintValuePopupInput.value
    );

  if (!Number.isFinite(value)) {
    constraintValuePopupInput.focus();
    constraintValuePopupInput.select();
    return false;
  }

  constraintMakerType =
    constraintMakerPendingPlacement
      .mode;

  crossConstraintDistanceInput.value =
    String(
      value
    );

  const added =
    addCrossPathDistanceConstraint();

  if (!added) {
    constraintValuePopupInput.focus();
    constraintValuePopupInput.select();
    return false;
  }

  hideConstraintValuePopup();

  toolStatus.textContent =
    "Dimension constraint placed";

  clearConstraintInteractionPreview();
  rearmPersistentConstraintTool();

  return true;
}

function constraintMakerSelectionFromCurrentVertexSelection() {
  const refs =
    selectedConstraintVertexRefs();

  if (
    refs.length !== 2
  ) {
    return false;
  }

  const first =
    documentConstraintEndpoint(
      refs[0]
    );

  const second =
    documentConstraintEndpoint(
      refs[1]
    );

  if (
    !first ||
    !second
  ) {
    return false;
  }

  crossConstraintEndpointA = {
    pathId:
      refs[0].pathId,
    anchor:
      refs[0].anchor
  };

  crossConstraintEndpointB = {
    pathId:
      refs[1].pathId,
    anchor:
      refs[1].anchor
  };

  constraintMakerSelection = {
    kind:
      refs[0].pathId ===
        refs[1].pathId
        ? "vertices"
        : "cross-path-vertices"
  };

  constraintMakerActive =
    false;

  constraintMakerStage =
    "a";

  constraintMakerPlacement =
    null;

  constraintMakerPlacementMode =
    null;

  toolStatus.textContent =
    "Move the cursor to place the dimension";

  updateConstraintMakerUI();
  syncGeometryConstraintsPanel();
  drawSelection();

  return true;
}



function edgeRelationRefKey(
  edge
) {
  if (!edge) return "";

  const a =
    Math.min(
      Number(edge.a),
      Number(edge.b)
    );

  const b =
    Math.max(
      Number(edge.a),
      Number(edge.b)
    );

  return `${edge.pathId}:${a}-${b}`;
}

function edgeRelationPairKey(
  first,
  second
) {
  const a =
    edgeRelationRefKey(first);

  const b =
    edgeRelationRefKey(second);

  return a <= b
    ? `${a}|${b}`
    : `${b}|${a}`;
}

function edgeRelationEndpoint(
  edge,
  side
) {
  if (!edge) return null;

  return documentConstraintEndpoint({
    pathId:
      edge.pathId,
    anchor:
      side === "a"
        ? edge.a
        : edge.b
  });
}

function edgeRelationCanvasData(
  edge
) {
  const a =
    edgeRelationEndpoint(
      edge,
      "a"
    );

  const b =
    edgeRelationEndpoint(
      edge,
      "b"
    );

  if (!a || !b) {
    return null;
  }

  return {
    a,
    b,
    length:
      Math.hypot(
        b.point.x -
          a.point.x,
        b.point.y -
          a.point.y
      ),
    angle:
      Math.atan2(
        b.point.y -
          a.point.y,
        b.point.x -
          a.point.x
      )
  };
}

function preflightEdgeRelationConstraint(
  type,
  first,
  second
) {
  if (
    !first ||
    !second
  ) {
    return constraintPreflightResult(
      "impossible",
      "Select two edges."
    );
  }

  if (
    edgeRelationRefKey(
      first
    ) ===
    edgeRelationRefKey(
      second
    )
  ) {
    return constraintPreflightResult(
      "impossible",
      "An edge cannot be constrained relative to itself."
    );
  }

  const pairKey =
    edgeRelationPairKey(
      first,
      second
    );

  const existing =
    documentGeometryConstraints
      .find(
        constraint =>
          [
            "edge-parallel",
            "edge-perpendicular"
          ].includes(
            constraint.type
          ) &&
          edgeRelationPairKey(
            constraint.first,
            constraint.second
          ) ===
          pairKey
      );

  if (!existing) {
    return constraintPreflightResult(
      "valid",
      ""
    );
  }

  if (
    existing.type === type
  ) {
    return constraintPreflightResult(
      "redundant",
      type ===
        "edge-parallel"
        ? "Constraint not added: these edges are already parallel-constrained."
        : "Constraint not added: these edges are already perpendicular-constrained."
    );
  }

  return constraintPreflightResult(
    "impossible",
    "Constraint not added: the same two edges cannot be both parallel and perpendicular."
  );
}

function edgeRelationEndpointIsPinned(
  edge,
  side
) {
  const path =
    pathForConstraintId(
      edge?.pathId
    );

  if (!path) return false;

  return pinnedVertexConstraintMap(
    path
  ).has(
    Number(
      side === "a"
        ? edge.a
        : edge.b
    )
  );
}


function normalizeEdgeRelationAngle(
  radians
) {
  let value =
    Number(radians) || 0;

  while (
    value <=
    -Math.PI
  ) {
    value +=
      Math.PI * 2;
  }

  while (
    value >
    Math.PI
  ) {
    value -=
      Math.PI * 2;
  }

  return value;
}

function unsignedLineAngleDifference(
  first,
  second
) {
  /*
   * Edges are undirected for parallel/perpendicular relations, so angles that
   * differ by 180° describe the same line orientation.
   */
  let difference =
    Math.abs(
      normalizeEdgeRelationAngle(
        first -
        second
      )
    );

  if (
    difference >
    Math.PI / 2
  ) {
    difference =
      Math.PI -
      difference;
  }

  return Math.abs(
    difference
  );
}

function edgeRelationAlreadySatisfied(
  constraint,
  toleranceDegrees = 0.05
) {
  const reference =
    edgeRelationCanvasData(
      constraint.first
    );

  const driven =
    edgeRelationCanvasData(
      constraint.second
    );

  if (
    !reference ||
    !driven ||
    reference.length <
      1e-9 ||
    driven.length <
      1e-9
  ) {
    return false;
  }

  const difference =
    unsignedLineAngleDifference(
      reference.angle,
      driven.angle
    );

  const target =
    constraint.type ===
      "edge-perpendicular"
      ? Math.PI / 2
      : 0;

  const error =
    Math.abs(
      difference -
      target
    );

  return (
    error <=
    toleranceDegrees *
      Math.PI /
      180
  );
}

function enforceEdgeRelationConstraint(
  constraint
) {
  /*
   * Do not reconstruct the driven edge when it already satisfies the
   * relation. This prevents tiny endpoint nudges caused by floating-point
   * trig round-trips at constraint creation time and during later solver
   * passes.
   */
  if (
    edgeRelationAlreadySatisfied(
      constraint
    )
  ) {
    return;
  }

  const reference =
    edgeRelationCanvasData(
      constraint.first
    );

  const driven =
    edgeRelationCanvasData(
      constraint.second
    );

  if (
    !reference ||
    !driven ||
    reference.length <
      1e-9 ||
    driven.length <
      1e-9
  ) {
    return;
  }

  const targetAngle =
    reference.angle +
    (
      constraint.type ===
        "edge-perpendicular"
        ? Math.PI / 2
        : 0
    );

  const ux =
    Math.cos(
      targetAngle
    );

  const uy =
    Math.sin(
      targetAngle
    );

  const aPinned =
    edgeRelationEndpointIsPinned(
      constraint.second,
      "a"
    );

  const bPinned =
    edgeRelationEndpointIsPinned(
      constraint.second,
      "b"
    );

  if (
    aPinned &&
    bPinned
  ) {
    /*
     * A fully pinned driven edge cannot rotate. Leave it untouched; the
     * existing constraint diagnostics/preflight system can surface the
     * contradiction rather than violating pin positions.
     */
    return;
  }

  if (
    bPinned &&
    !aPinned
  ) {
    moveDocumentConstraintEndpointToCanvas(
      {
        pathId:
          constraint.second.pathId,
        anchor:
          constraint.second.a
      },
      {
        x:
          driven.b.point.x -
          ux *
          driven.length,
        y:
          driven.b.point.y -
          uy *
          driven.length
      }
    );
  } else {
    moveDocumentConstraintEndpointToCanvas(
      {
        pathId:
          constraint.second.pathId,
        anchor:
          constraint.second.b
      },
      {
        x:
          driven.a.point.x +
          ux *
          driven.length,
        y:
          driven.a.point.y +
          uy *
          driven.length
      }
    );
  }

  const drivenPath =
    pathForConstraintId(
      constraint.second.pathId
    );

  if (drivenPath) {
    enforcePinnedVertices(
      drivenPath
    );

    updatePathD(
      drivenPath
    );
  }
}

function enforceDocumentEdgeRelations() {
  documentGeometryConstraints
    .filter(
      constraint =>
        [
          "edge-parallel",
          "edge-perpendicular"
        ].includes(
          constraint.type
        )
    )
    .forEach(
      enforceEdgeRelationConstraint
    );
}

function addEdgeRelationConstraint(
  type,
  first,
  second
) {
  const preflight =
    preflightEdgeRelationConstraint(
      type,
      first,
      second
    );

  if (
    rejectConstraintPreflight(
      preflight
    )
  ) {
    return false;
  }

  geometryConstraintCounter += 1;

  const constraint = {
    id:
      `${type}-${Date.now()}-${geometryConstraintCounter}`,
    type,
    first: {
      ...first
    },
    second: {
      ...second
    }
  };

  documentGeometryConstraints.push(
    constraint
  );

  if (
    !edgeRelationAlreadySatisfied(
      constraint
    )
  ) {
    enforceEdgeRelationConstraint(
      constraint
    );
  }

  recordHistory({
    label:
      type ===
        "edge-parallel"
        ? "Parallel Edge Constraint Added"
        : "Perpendicular Edge Constraint Added",
    detail:
      "Edge relation"
  });

  scheduleAutosave();
  syncGeometryConstraintsPanel();
  drawSelection();

  toolStatus.textContent =
    type ===
      "edge-parallel"
      ? "Edges constrained parallel"
      : "Edges constrained perpendicular";

  return true;
}

function beginEdgeRelationConstraint(
  type
) {
  constraintEdgeRelationMode =
    type;

  constraintEdgeRelationFirst =
    null;

  constraintMakerActive =
    false;

  clearConstraintInteractionPreview();

  /*
   * clearConstraintInteractionPreview resets general maker state, not this
   * dedicated relation mode.
   */
  constraintEdgeRelationMode =
    type;

  constraintToolPersistentActive =
    true;

  toolStatus.textContent =
    type ===
      "edge-parallel"
      ? "Parallel: click reference edge"
      : "Perpendicular: click reference edge";

  updateConstraintMakerUI();
  drawSelection();
}

function captureEdgeRelationEdge(
  hit
) {
  const ref =
    edgeConstraintRefFromHit(
      hit
    );

  if (!ref) {
    return false;
  }

  if (
    !constraintEdgeRelationFirst
  ) {
    constraintEdgeRelationFirst = {
      ...ref
    };

    toolStatus.textContent =
      constraintEdgeRelationMode ===
        "edge-parallel"
        ? "Parallel: click driven edge"
        : "Perpendicular: click driven edge";

    drawSelection();
    return true;
  }

  const type =
    constraintEdgeRelationMode;

  const first =
    constraintEdgeRelationFirst;

  const added =
    addEdgeRelationConstraint(
      type,
      first,
      ref
    );

  if (added) {
    constraintEdgeRelationFirst =
      null;

    constraintEdgeRelationMode =
      type;

    toolStatus.textContent =
      type ===
        "edge-parallel"
        ? "Parallel: click another reference edge"
        : "Perpendicular: click another reference edge";
  }

  drawSelection();
  return true;
}

function drawEdgeRelationPickingPreview() {
  if (
    !constraintEdgeRelationMode
  ) {
    return;
  }

  const drawEdge =
    (
      edge,
      labelText
    ) => {
      const data =
        edgeRelationCanvasData(
          edge
        );

      if (!data) return;

      selectionOverlay.appendChild(
        svgEl(
          "line",
          {
            x1:
              data.a.point.x,
            y1:
              data.a.point.y,
            x2:
              data.b.point.x,
            y2:
              data.b.point.y,
            class:
              "constraint-edge-relation-picked",
            "pointer-events":
              "none"
          }
        )
      );

      const text =
        svgEl(
          "text",
          {
            x:
              (
                data.a.point.x +
                data.b.point.x
              ) / 2,
            y:
              (
                data.a.point.y +
                data.b.point.y
              ) / 2 -
              10 /
              Math.max(
                zoom,
                0.3
              ),
            class:
              "geometry-constraint-label",
            "text-anchor":
              "middle",
            "pointer-events":
              "none"
          }
        );

      text.textContent =
        labelText;

      selectionOverlay.appendChild(
        text
      );
    };

  if (
    constraintEdgeRelationFirst
  ) {
    drawEdge(
      constraintEdgeRelationFirst,
      constraintEdgeRelationMode ===
        "edge-parallel"
        ? "A ∥"
        : "A ⟂"
    );
  }

  if (
    constraintMakerHover?.type ===
      "edge"
  ) {
    drawEdge(
      edgeConstraintRefFromHit(
        constraintMakerHover
      ),
      "B"
    );
  }
}

function resetConstraintMakerAutoEdgeState() {
  constraintMakerAutoFirstEdge =
    null;

  constraintMakerSelectedEdges =
    [];

  constraintMakerAngleHoverEdge =
    null;

  constraintMakerAnglePlacement =
    null;
}

function setConstraintMakerAutoFirstEdge(
  hit
) {
  const ref =
    edgeConstraintRefFromHit(
      hit
    );

  if (!ref) return false;

  constraintMakerAutoFirstEdge =
    ref;

  constraintMakerSelectedEdges = [
    ref
  ];

  /*
   * Also prepare the same edge endpoints for true/X/Y distance placement.
   * We do not enter placement immediately; pointer motion decides whether
   * the next gesture is distance or a second adjacent edge for angle.
   */
  const path =
    pathForConstraintId(
      ref.pathId
    );

  if (!path) return false;

  crossConstraintEndpointA = {
    pathId:
      ref.pathId,
    anchor:
      ref.a
  };

  crossConstraintEndpointB = {
    pathId:
      ref.pathId,
    anchor:
      ref.b
  };

  constraintMakerPlacement =
    null;

  constraintMakerPlacementMode =
    null;

  toolStatus.textContent =
    "Move away for distance, or choose an adjacent edge for angle";

  drawSelection();

  return true;
}

function autoConstraintAdjacentEdgeHit(
  clientX,
  clientY
) {
  if (!constraintMakerAutoFirstEdge) {
    return null;
  }

  const hit =
    constraintMakerHitEdge(
      clientX,
      clientY
    );

  if (!hit) return null;

  const candidate =
    edgeConstraintRefFromHit(
      hit
    );

  if (!candidate) return null;

  const first =
    constraintMakerAutoFirstEdge;

  if (
    candidate.pathId !==
      first.pathId ||
    edgeConstraintRefKey(
      candidate
    ) ===
      edgeConstraintRefKey(
        first
      )
  ) {
    return null;
  }

  const shared =
    [
      first.a,
      first.b
    ].some(
      index =>
        index ===
          candidate.a ||
        index ===
          candidate.b
    );

  return shared
    ? hit
    : null;
}

function drawConstraintMakerAutoFirstEdge() {
  if (!constraintMakerAutoFirstEdge) {
    return;
  }

  const data =
    constraintEdgeCanvasData(
      constraintMakerAutoFirstEdge
    );

  if (!data) return;

  selectionOverlay.appendChild(
    svgEl(
      "line",
      {
        x1:
          data.a.x,
        y1:
          data.a.y,
        x2:
          data.b.x,
        y2:
          data.b.y,
        class:
          "constraint-maker-auto-selected-edge",
        "pointer-events":
          "none"
      }
    )
  );
}


function clearConstraintInteractionPreview() {
  constraintMakerHover = null;
  constraintMakerPendingPlacement = null;
  constraintMakerPlacement = null;
  constraintMakerPlacementMode = null;
  constraintMakerSelection = null;
  constraintMakerSelectedEdges = [];
  constraintMakerAnglePlacement = null;
  constraintMakerAngleHoverEdge = null;
  constraintMakerAutoFirstEdge = null;
  crossConstraintEndpointA = null;
  crossConstraintEndpointB = null;
  constraintMakerStage = "a";

  hideConstraintValuePopup();

  const unit =
    constraintValuePopup?.querySelector(
      "span"
    );

  if (unit) {
    unit.textContent = "px";
  }
}

function rearmPersistentConstraintTool() {
  constraintEdgeRelationMode = null;
  constraintEdgeRelationFirst = null;
  clearConstraintInteractionPreview();

  if (
    !constraintToolPersistentActive ||
    !geometryConstraintsPanelRequested
  ) {
    constraintMakerActive = false;
    updateConstraintMakerUI();
    drawSelection();
    return;
  }

  constraintMakerType = "auto";

  /*
   * Re-use exactly two currently selected vertices immediately.
   * Otherwise return to geometry picking.
   */
  if (
    constraintMakerSelectionFromCurrentVertexSelection()
  ) {
    constraintMakerActive = false;
    updateConstraintMakerUI();
    drawSelection();
    return;
  }

  constraintMakerActive = true;
  constraintMakerStage = "a";

  toolStatus.textContent =
    "Constraint: select two vertices or click an edge";

  updateConstraintMakerUI();
  drawSelection();
}

function beginConstraintMaker() {
  constraintToolPersistentActive = true;
  constraintMakerType = "auto";
  rearmPersistentConstraintTool();
}

function stopConstraintMaker() {
  constraintMakerActive = false;
  constraintMakerHover = null;
  updateConstraintMakerUI();
  drawSelection();
}

function captureConstraintMakerVertex(hit) {
  if (!hit) return;

  const endpoint = {
    pathId: ensurePathConstraintId(hit.path),
    anchor: hit.index
  };

  if (constraintMakerStage === "a") {
    crossConstraintEndpointA = endpoint;
    crossConstraintEndpointB = null;
    constraintMakerStage = "b";
    toolStatus.textContent = "Constraint Maker: click vertex B";
  } else {
    if (
      crossConstraintEndpointA &&
      crossConstraintEndpointA.pathId === endpoint.pathId &&
      crossConstraintEndpointA.anchor === endpoint.anchor
    ) {
      return;
    }

    crossConstraintEndpointB = endpoint;
    constraintMakerActive = false;
    constraintMakerStage = "a";
    crossConstraintDistanceInput.value =
      String(Number(constraintMakerEndpointValue().toFixed(2)));
  }

  syncGeometryConstraintsPanel();
  drawSelection();
}

function enforceCrossPathAxisConstraint(constraint, locked, axis) {
  const a = documentConstraintEndpoint(constraint.a);
  const b = documentConstraintEndpoint(constraint.b);
  if (!a || !b) return;

  const target = Number(constraint.value) || 0;
  const aLocked = locked.has(a.key);
  const bLocked = locked.has(b.key);

  if (axis === "x") {
    if (bLocked && !aLocked) {
      moveDocumentConstraintEndpointToCanvas(
        constraint.a,
        { x: b.point.x - target, y: a.point.y }
      );
    } else {
      moveDocumentConstraintEndpointToCanvas(
        constraint.b,
        { x: a.point.x + target, y: b.point.y }
      );
    }
  } else {
    if (bLocked && !aLocked) {
      moveDocumentConstraintEndpointToCanvas(
        constraint.a,
        { x: a.point.x, y: b.point.y - target }
      );
    } else {
      moveDocumentConstraintEndpointToCanvas(
        constraint.b,
        { x: b.point.x, y: a.point.y + target }
      );
    }
  }
}

function drawConstraintMakerPreview() {
  if (!geometryConstraintsPanelRequested) return;

  [crossConstraintEndpointA, crossConstraintEndpointB].forEach((endpoint, i) => {
    const r = documentConstraintEndpoint(endpoint);
    if (!r) return;

    selectionOverlay.appendChild(svgEl("circle", {
      cx: r.point.x,
      cy: r.point.y,
      r: 6 / Math.max(zoom, 0.3),
      class: "constraint-maker-picked-point",
      "pointer-events": "none"
    }));

    const text = svgEl("text", {
      x: r.point.x + 8 / Math.max(zoom, 0.3),
      y: r.point.y - 8 / Math.max(zoom, 0.3),
      class: "constraint-maker-picked-label",
      "pointer-events": "none"
    });
    text.textContent = i === 0 ? "A" : "B";
    selectionOverlay.appendChild(text);
  });

  if (constraintMakerHover) {
    if (
      constraintMakerHover.type ===
        "edge"
    ) {
      selectionOverlay.appendChild(
        svgEl("line", {
          x1:
            constraintMakerHover.a.x,
          y1:
            constraintMakerHover.a.y,
          x2:
            constraintMakerHover.b.x,
          y2:
            constraintMakerHover.b.y,
          class:
            "constraint-maker-hover-edge",
          "pointer-events":
            "none"
        })
      );
    } else {
      selectionOverlay.appendChild(
        svgEl("circle", {
          cx:
            constraintMakerHover.point.x,
          cy:
            constraintMakerHover.point.y,
          r:
            8 /
            Math.max(
              zoom,
              0.3
            ),
          class:
            "constraint-maker-hover-point",
          "pointer-events":
            "none"
        })
      );
    }
  }
}


const CONSTRAINT_VALUE_EPSILON = 1e-4;

function constraintValuesNearlyEqual(
  first,
  second,
  epsilon =
    CONSTRAINT_VALUE_EPSILON
) {
  return (
    Math.abs(
      Number(first) -
      Number(second)
    ) <= epsilon
  );
}

function constraintEndpointKey(
  endpoint
) {
  return endpoint
    ? `${endpoint.pathId}:${endpoint.anchor}`
    : "";
}

function canonicalConstraintPair(
  a,
  b
) {
  const first =
    constraintEndpointKey(a);

  const second =
    constraintEndpointKey(b);

  if (first <= second) {
    return {
      key:
        `${first}|${second}`,
      reversed:
        false
    };
  }

  return {
    key:
      `${second}|${first}`,
    reversed:
      true
  };
}

function normalizedCrossConstraintValue(
  type,
  value,
  reversed
) {
  const number =
    Number(value) || 0;

  if (
    type ===
      "cross-distance-x" ||
    type ===
      "cross-distance-y"
  ) {
    return reversed
      ? -number
      : number;
  }

  return Math.abs(
    number
  );
}

function constraintPreflightResult(
  status,
  message
) {
  return {
    ok:
      status === "valid",
    status,
    message
  };
}

function preflightCrossConstraint(
  candidate
) {
  const pair =
    canonicalConstraintPair(
      candidate.a,
      candidate.b
    );

  const candidateValue =
    normalizedCrossConstraintValue(
      candidate.type,
      candidate.value,
      pair.reversed
    );

  const related =
    documentGeometryConstraints
      .filter(
        constraint => {
          if (
            ![
              "cross-distance",
              "cross-distance-x",
              "cross-distance-y"
            ].includes(
              constraint.type
            )
          ) {
            return false;
          }

          return (
            canonicalConstraintPair(
              constraint.a,
              constraint.b
            ).key ===
            pair.key
          );
        }
      )
      .map(
        constraint => {
          const existingPair =
            canonicalConstraintPair(
              constraint.a,
              constraint.b
            );

          return {
            constraint,
            value:
              normalizedCrossConstraintValue(
                constraint.type,
                constraint.value,
                existingPair.reversed
              )
          };
        }
      );

  const sameType =
    related.find(
      entry =>
        entry.constraint.type ===
        candidate.type
    );

  if (sameType) {
    if (
      constraintValuesNearlyEqual(
        sameType.value,
        candidateValue
      )
    ) {
      return constraintPreflightResult(
        "redundant",
        "Constraint not added: this relationship is already defined."
      );
    }

    return constraintPreflightResult(
      "impossible",
      "Constraint not added: the same geometry already has a different value."
    );
  }

  const values = {
    distance:
      candidate.type ===
        "cross-distance"
        ? Math.abs(
            candidateValue
          )
        : null,
    x:
      candidate.type ===
        "cross-distance-x"
        ? candidateValue
        : null,
    y:
      candidate.type ===
        "cross-distance-y"
        ? candidateValue
        : null
  };

  related.forEach(
    entry => {
      if (
        entry.constraint.type ===
        "cross-distance"
      ) {
        values.distance =
          Math.abs(
            entry.value
          );
      }

      if (
        entry.constraint.type ===
        "cross-distance-x"
      ) {
        values.x =
          entry.value;
      }

      if (
        entry.constraint.type ===
        "cross-distance-y"
      ) {
        values.y =
          entry.value;
      }
    }
  );

  if (
    values.distance !== null &&
    values.x !== null &&
    Math.abs(values.x) >
      values.distance +
        CONSTRAINT_VALUE_EPSILON
  ) {
    return constraintPreflightResult(
      "impossible",
      "Constraint not added: |ΔX| cannot be greater than the fixed distance."
    );
  }

  if (
    values.distance !== null &&
    values.y !== null &&
    Math.abs(values.y) >
      values.distance +
        CONSTRAINT_VALUE_EPSILON
  ) {
    return constraintPreflightResult(
      "impossible",
      "Constraint not added: |ΔY| cannot be greater than the fixed distance."
    );
  }

  if (
    values.distance !== null &&
    values.x !== null &&
    values.y !== null
  ) {
    const requiredDistance =
      Math.hypot(
        values.x,
        values.y
      );

    if (
      !constraintValuesNearlyEqual(
        requiredDistance,
        values.distance,
        0.01
      )
    ) {
      return constraintPreflightResult(
        "impossible",
        `Constraint not added: ΔX and ΔY require distance ${requiredDistance.toFixed(2)} px, not ${values.distance.toFixed(2)} px.`
      );
    }

    /*
     * The third relation adds no new degree of freedom once two compatible
     * values already determine the pair.
     */
    return constraintPreflightResult(
      "redundant",
      "Constraint not added: the existing two dimensions already fully define this vertex pair."
    );
  }

  return constraintPreflightResult(
    "valid",
    ""
  );
}

function canonicalPathVertexPair(
  first,
  second
) {
  return first <= second
    ? `${first}|${second}`
    : `${second}|${first}`;
}

function preflightPathDistanceConstraint(
  path,
  candidate
) {
  const key =
    canonicalPathVertexPair(
      candidate.a,
      candidate.b
    );

  const existing =
    pathGeometryConstraints(
      path
    ).find(
      constraint =>
        constraint.type ===
          "distance" &&
        canonicalPathVertexPair(
          constraint.a,
          constraint.b
        ) === key
    );

  if (!existing) {
    return constraintPreflightResult(
      "valid",
      ""
    );
  }

  if (
    constraintValuesNearlyEqual(
      existing.value,
      candidate.value
    )
  ) {
    return constraintPreflightResult(
      "redundant",
      "Constraint not added: this distance is already defined."
    );
  }

  return constraintPreflightResult(
    "impossible",
    "Constraint not added: these vertices already have a different fixed distance."
  );
}

function normalizedAngleConstraintTarget(
  constraint,
  reversed = false
) {
  const signed =
    Math.abs(
      Number(
        constraint.value
      ) || 0
    ) *
    (
      Number(
        constraint.sign
      ) < 0
        ? -1
        : 1
    );

  return reversed
    ? -signed
    : signed;
}


function pathConstraintAnchorCount(
  path
) {
  if (
    Array.isArray(
      path?._anchors
    )
  ) {
    return path._anchors.length;
  }

  return 0;
}

function pathIsSimpleClosedConstraintPolygon(
  path
) {
  return (
    path?.dataset
      ?.closed ===
      "true" &&
    pathConstraintAnchorCount(
      path
    ) >= 3
  );
}

function polygonInteriorAngleTotal(
  vertexCount
) {
  return (
    Math.max(
      0,
      Number(vertexCount) - 2
    ) *
    180
  );
}

function angleConstraintInteriorValue(
  constraint
) {
  /*
   * User-facing angle constraints at a polygon vertex are intended to be the
   * interior corner angle. Normalise to the [0, 360) range so a signed
   * orientation cannot accidentally turn a valid corner into a negative sum.
   */
  const raw =
    Math.abs(
      Number(
        constraint?.value
      ) || 0
    );

  return (
    (
      raw % 360
    ) +
    360
  ) %
  360;
}

function angleConstraintCornerKey(
  constraint
) {
  return Number(
    constraint?.pivot
  );
}

function effectiveClosedPolygonAngleConstraints(
  path,
  candidate = null
) {
  const byCorner =
    new Map();

  pathGeometryConstraints(
    path
  )
    .filter(
      constraint =>
        constraint.type ===
        "angle"
    )
    .forEach(
      constraint => {
        byCorner.set(
          angleConstraintCornerKey(
            constraint
          ),
          constraint
        );
      }
    );

  if (candidate) {
    byCorner.set(
      angleConstraintCornerKey(
        candidate
      ),
      candidate
    );
  }

  return byCorner;
}

function preflightClosedPolygonAngleSum(
  path,
  candidate
) {
  if (
    !pathIsSimpleClosedConstraintPolygon(
      path
    )
  ) {
    return constraintPreflightResult(
      "valid",
      ""
    );
  }

  const vertexCount =
    pathConstraintAnchorCount(
      path
    );

  const constraints =
    effectiveClosedPolygonAngleConstraints(
      path,
      candidate
    );

  const constrainedCorners =
    [...constraints.keys()]
      .filter(
        index =>
          Number.isInteger(index) &&
          index >= 0 &&
          index < vertexCount
      );

  if (!constrainedCorners.length) {
    return constraintPreflightResult(
      "valid",
      ""
    );
  }

  const requiredTotal =
    polygonInteriorAngleTotal(
      vertexCount
    );

  const constrainedTotal =
    constrainedCorners.reduce(
      (
        total,
        corner
      ) =>
        total +
        angleConstraintInteriorValue(
          constraints.get(
            corner
          )
        ),
      0
    );

  /*
   * Every unconstrained simple-polygon interior angle must be strictly
   * between 0° and 360°. This lets us reject a partial set before every
   * corner has been constrained when the remaining total is already
   * impossible.
   */
  const remainingCorners =
    vertexCount -
    constrainedCorners.length;

  const remainingTotal =
    requiredTotal -
    constrainedTotal;

  const epsilon = 0.01;

  if (
    constrainedTotal >
      requiredTotal +
        epsilon
  ) {
    return constraintPreflightResult(
      "impossible",
      `Constraint not added: ${vertexCount}-sided polygon interior angles must total ${requiredTotal.toFixed(0)}°, but the constrained angles would already total ${constrainedTotal.toFixed(2)}°.`
    );
  }

  if (
    remainingCorners === 0
  ) {
    if (
      Math.abs(
        remainingTotal
      ) >
        epsilon
    ) {
      return constraintPreflightResult(
        "impossible",
        `Constraint not added: ${vertexCount}-sided polygon interior angles must total ${requiredTotal.toFixed(0)}°, not ${constrainedTotal.toFixed(2)}°.`
      );
    }

    return constraintPreflightResult(
      "valid",
      ""
    );
  }

  /*
   * For a simple polygon, the remaining corners need a positive amount of
   * angle, and no single remaining corner can contribute 360° or more.
   */
  if (
    remainingTotal <=
      epsilon
  ) {
    return constraintPreflightResult(
      "impossible",
      `Constraint not added: the remaining ${remainingCorners} corner${remainingCorners === 1 ? "" : "s"} would have no valid interior angle left.`
    );
  }

  if (
    remainingTotal >=
      remainingCorners *
        360 -
      epsilon
  ) {
    return constraintPreflightResult(
      "impossible",
      `Constraint not added: the remaining ${remainingCorners} corner${remainingCorners === 1 ? "" : "s"} cannot supply the ${remainingTotal.toFixed(2)}° still required.`
    );
  }

  return constraintPreflightResult(
    "valid",
    ""
  );
}

function preflightPathAngleConstraint(
  path,
  candidate
) {
  const constraints =
    pathGeometryConstraints(
      path
    );

  for (
    const existing of constraints
  ) {
    if (
      existing.type !==
      "angle" ||
      existing.pivot !==
      candidate.pivot
    ) {
      continue;
    }

    const sameOrder =
      existing.a ===
        candidate.a &&
      existing.c ===
        candidate.c;

    const reversedOrder =
      existing.a ===
        candidate.c &&
      existing.c ===
        candidate.a;

    if (
      !sameOrder &&
      !reversedOrder
    ) {
      continue;
    }

    const existingTarget =
      normalizedAngleConstraintTarget(
        existing,
        reversedOrder
      );

    const candidateTarget =
      normalizedAngleConstraintTarget(
        candidate,
        false
      );

    if (
      constraintValuesNearlyEqual(
        existingTarget,
        candidateTarget,
        0.01
      )
    ) {
      return constraintPreflightResult(
        "redundant",
        "Constraint not added: this angle is already defined."
      );
    }

    return constraintPreflightResult(
      "impossible",
      "Constraint not added: this angle is already constrained to a different value."
    );
  }

  const polygonSumResult =
    preflightClosedPolygonAngleSum(
      path,
      candidate
    );

  if (!polygonSumResult.ok) {
    return polygonSumResult;
  }

  return constraintPreflightResult(
    "valid",
    ""
  );
}

function rejectConstraintPreflight(
  result
) {
  if (
    !result ||
    result.ok
  ) {
    return false;
  }

  toolStatus.textContent =
    result.status ===
      "redundant"
      ? `Over-defined • ${result.message}`
      : `Impossible constraint • ${result.message}`;

  constraintMakerStatus.textContent =
    result.status ===
      "redundant"
      ? "Over-defined"
      : "Conflict";

  return true;
}

function addCrossPathDistanceConstraint() {
  const a =
    crossConstraintEndpointA;

  const b =
    crossConstraintEndpointB;

  if (
    !a ||
    !b
  ) {
    toolStatus.textContent =
      "Pick vertex A and vertex B first";
    return;
  }

  const aPath =
    pathForConstraintId(
      a.pathId
    );

  const bPath =
    pathForConstraintId(
      b.pathId
    );

  if (
    !aPath?._anchors?.[
      a.anchor
    ] ||
    !bPath?._anchors?.[
      b.anchor
    ]
  ) {
    toolStatus.textContent =
      "One of the picked vertices no longer exists";
    return;
  }

  const rawValue = Number(crossConstraintDistanceInput.value);

  const value =
    constraintMakerType === "distance"
      ? Math.max(0.01, Number.isFinite(rawValue) ? rawValue : 0.01)
      : (Number.isFinite(rawValue) ? rawValue : 0);

  const constraint = {
    id:
      "",
    type:
      constraintMakerType === "distance-x"
        ? "cross-distance-x"
        : constraintMakerType === "distance-y"
          ? "cross-distance-y"
          : "cross-distance",
    a: {
      ...a
    },
    b: {
      ...b
    },
    value
  };

  const preflight =
    preflightCrossConstraint(
      constraint
    );

  if (
    rejectConstraintPreflight(
      preflight
    )
  ) {
    return false;
  }

  geometryConstraintCounter += 1;

  constraint.id =
    `cross-distance-${Date.now()}-${geometryConstraintCounter}`;

  documentGeometryConstraints.push(
    constraint
  );

  enforceDocumentGeometryConstraints(
    new Set([
      `${a.pathId}:${a.anchor}`
    ])
  );

  drawSelection();
  syncGeometryConstraintsPanel();

  recordHistory({
    label:
      "Cross-Path Distance Added",
    detail:
      `${value}px`
  });

  scheduleAutosave();

  return true;
}

function documentConstraintEndpoint(
  endpoint
) {
  const path =
    pathForConstraintId(
      endpoint?.pathId
    );

  const anchor =
    path?._anchors?.[
      endpoint?.anchor
    ];

  if (
    !path ||
    !anchor
  ) {
    return null;
  }

  return {
    path,
    anchor,
    point:
      canvasPointFromLocal(
        path,
        anchor.x,
        anchor.y
      ),
    key:
      `${endpoint.pathId}:${endpoint.anchor}`
  };
}

function moveDocumentConstraintEndpointToCanvas(
  endpoint,
  canvasPoint
) {
  const resolved =
    documentConstraintEndpoint(
      endpoint
    );

  if (!resolved) return;

  const local =
    localPointFromCanvas(
      resolved.path,
      canvasPoint
    );

  moveConstraintAnchor(
    resolved.path,
    endpoint.anchor,
    local.x,
    local.y
  );

  enforcePathGeometryConstraints(
    resolved.path,
    new Set([
      endpoint.anchor
    ])
  );

  updatePathD(
    resolved.path
  );
}

function enforceCrossPathDistanceConstraint(
  constraint,
  lockedEndpointKeys
) {
  const a =
    documentConstraintEndpoint(
      constraint.a
    );

  const b =
    documentConstraintEndpoint(
      constraint.b
    );

  if (
    !a ||
    !b
  ) {
    return;
  }

  let dx =
    b.point.x -
    a.point.x;

  let dy =
    b.point.y -
    a.point.y;

  let length =
    Math.hypot(
      dx,
      dy
    );

  if (length < 1e-9) {
    dx = 1;
    dy = 0;
    length = 1;
  }

  const ux =
    dx / length;

  const uy =
    dy / length;

  const target =
    Math.max(
      0.01,
      Number(
        constraint.value
      ) || 0.01
    );

  const aLocked =
    lockedEndpointKeys.has(
      a.key
    );

  const bLocked =
    lockedEndpointKeys.has(
      b.key
    );

  if (
    aLocked &&
    !bLocked
  ) {
    moveDocumentConstraintEndpointToCanvas(
      constraint.b,
      {
        x:
          a.point.x +
          ux * target,
        y:
          a.point.y +
          uy * target
      }
    );
  } else if (
    bLocked &&
    !aLocked
  ) {
    moveDocumentConstraintEndpointToCanvas(
      constraint.a,
      {
        x:
          b.point.x -
          ux * target,
        y:
          b.point.y -
          uy * target
      }
    );
  } else {
    moveDocumentConstraintEndpointToCanvas(
      constraint.b,
      {
        x:
          a.point.x +
          ux * target,
        y:
          a.point.y +
          uy * target
      }
    );
  }
}

function enforceDocumentGeometryConstraints(
  lockedEndpointKeys =
    new Set()
) {
  documentGeometryConstraints =
    normalizeDocumentGeometryConstraints(
      documentGeometryConstraints
    );

  for (
    let pass = 0;
    pass < 5;
    pass += 1
  ) {
    documentGeometryConstraints.forEach(
      constraint => {
        if (constraint.type === "cross-distance") {
          enforceCrossPathDistanceConstraint(constraint, lockedEndpointKeys);
        } else if (constraint.type === "cross-distance-x") {
          enforceCrossPathAxisConstraint(constraint, lockedEndpointKeys, "x");
        } else if (constraint.type === "cross-distance-y") {
          enforceCrossPathAxisConstraint(constraint, lockedEndpointKeys, "y");
        }
      }
    );
  }
  enforceDocumentEdgeRelations();

}

function lockedCrossConstraintKeysForPath(
  path,
  anchorIndices = null
) {
  const id =
    path?.dataset
      ?.constraintPathId;

  if (!id) {
    return new Set();
  }

  if (
    Array.isArray(
      anchorIndices
    )
  ) {
    return new Set(
      anchorIndices.map(
        index =>
          `${id}:${index}`
      )
    );
  }

  const keys =
    new Set();

  documentGeometryConstraints.forEach(
    constraint => {
      if (
        constraint.a?.pathId ===
          id
      ) {
        keys.add(
          `${id}:${constraint.a.anchor}`
        );
      }

      if (
        constraint.b?.pathId ===
          id
      ) {
        keys.add(
          `${id}:${constraint.b.anchor}`
        );
      }
    }
  );

  return keys;
}


window.getConstraintDiagnostics =
  function getConstraintDiagnostics() {
    const crossIssues = [];

    documentGeometryConstraints
      .filter(
        constraint =>
          [
            "cross-distance",
            "cross-distance-x",
            "cross-distance-y"
          ].includes(
            constraint.type
          )
      )
      .forEach(
        constraint => {
          const others =
            documentGeometryConstraints;

          documentGeometryConstraints =
            others.filter(
              item =>
                item !== constraint
            );

          const result =
            preflightCrossConstraint(
              constraint
            );

          documentGeometryConstraints =
            others;

          if (!result.ok) {
            crossIssues.push({
              id:
                constraint.id,
              status:
                result.status,
              message:
                result.message
            });
          }
        }
      );

    const polygonIssues = [];

    art
      .querySelectorAll(
        ":scope > path[data-object='true'][data-closed='true']"
      )
      .forEach(
        path => {
          const constraints =
            pathGeometryConstraints(
              path
            ).filter(
              constraint =>
                constraint.type ===
                "angle"
            );

          if (!constraints.length) {
            return;
          }

          const count =
            pathConstraintAnchorCount(
              path
            );

          const total =
            [...effectiveClosedPolygonAngleConstraints(
              path
            ).values()]
              .reduce(
                (
                  sum,
                  constraint
                ) =>
                  sum +
                  angleConstraintInteriorValue(
                    constraint
                  ),
                0
              );

          const required =
            polygonInteriorAngleTotal(
              count
            );

          if (
            constraints.length >=
              count &&
            Math.abs(
              total -
              required
            ) >
              0.01
          ) {
            polygonIssues.push({
              name:
                path.dataset.name ||
                "Path",
              vertices:
                count,
              constrainedTotal:
                total,
              requiredTotal:
                required
            });
          }
        }
      );

    const edgeRelationIssues =
      documentGeometryConstraints
        .filter(
          constraint =>
            [
              "edge-parallel",
              "edge-perpendicular"
            ].includes(
              constraint.type
            )
        )
        .filter(
          constraint =>
            !edgeRelationAlreadySatisfied(
              constraint,
              0.1
            )
        )
        .map(
          constraint => ({
            id:
              constraint.id,
            type:
              constraint.type
          })
        );

    return {
      documentConstraintCount:
        documentGeometryConstraints.length,
      crossIssues,
      polygonIssues,
      edgeRelationIssues
    };
  };

function removeDocumentGeometryConstraint(
  id
) {
  documentGeometryConstraints =
    documentGeometryConstraints.filter(
      constraint =>
        constraint.id !== id
    );

  drawSelection();
  syncGeometryConstraintsPanel();

  recordHistory({
    label:
      "Cross-Path Constraint Removed",
    detail:
      "Distance"
  });

  scheduleAutosave();
}

function clearCrossConstraintEndpoints() {
  crossConstraintEndpointA = null;
  crossConstraintEndpointB = null;
  constraintMakerStage = "a";
  constraintMakerActive = false;
  constraintMakerHover = null;
  constraintMakerSelection = null;
  constraintMakerPlacement = null;
  constraintMakerPlacementMode = null;
  updateConstraintMakerUI();
  syncGeometryConstraintsPanel();
}


function remapSelectedVertexRefsForAnchorInsert(
  path,
  insertionIndex
) {
  const pathId =
    path?.dataset
      ?.constraintPathId;

  if (!pathId) return;

  selectedVertexRefs =
    selectedVertexRefs.map(
      ref =>
        ref.pathId ===
            pathId &&
        ref.anchor >=
            insertionIndex
          ? {
              ...ref,
              anchor:
                ref.anchor + 1
            }
          : ref
    );
}

function remapSelectedVertexRefsForAnchorDelete(
  path,
  deletedIndex
) {
  const pathId =
    path?.dataset
      ?.constraintPathId;

  if (!pathId) return;

  selectedVertexRefs =
    selectedVertexRefs
      .filter(
        ref =>
          !(
            ref.pathId ===
              pathId &&
            ref.anchor ===
              deletedIndex
          )
      )
      .map(
        ref =>
          ref.pathId ===
              pathId &&
          ref.anchor >
              deletedIndex
            ? {
                ...ref,
                anchor:
                  ref.anchor - 1
              }
            : ref
      );
}

function remapDocumentGeometryConstraintsForAnchorInsert(
  path,
  insertionIndex
) {
  const id =
    path?.dataset
      ?.constraintPathId;

  if (!id) return;

  documentGeometryConstraints =
    documentGeometryConstraints.map(
      constraint => {
        const next =
          JSON.parse(
            JSON.stringify(
              constraint
            )
          );

        [
          "a",
          "b"
        ].forEach(
          side => {
            if (
              next[side]?.pathId ===
                id &&
              next[side].anchor >=
                insertionIndex
            ) {
              next[side].anchor +=
                1;
            }
          }
        );

        return next;
      }
    );
}

function remapDocumentGeometryConstraintsForAnchorDelete(
  path,
  deletedIndex
) {
  const id =
    path?.dataset
      ?.constraintPathId;

  if (!id) return;

  documentGeometryConstraints =
    documentGeometryConstraints
      .filter(
        constraint =>
          ![
            constraint.a,
            constraint.b
          ].some(
            endpoint =>
              endpoint?.pathId ===
                id &&
              endpoint.anchor ===
                deletedIndex
          )
      )
      .map(
        constraint => {
          const next =
            JSON.parse(
              JSON.stringify(
                constraint
              )
            );

          [
            "a",
            "b"
          ].forEach(
            side => {
              if (
                next[side]?.pathId ===
                  id &&
                next[side].anchor >
                  deletedIndex
              ) {
                next[side].anchor -=
                  1;
              }
            }
          );

          return next;
        }
      );
}

function pruneDocumentGeometryConstraints() {
  documentGeometryConstraints =
    documentGeometryConstraints.filter(
      constraint =>
        documentConstraintEndpoint(
          constraint.a
        ) &&
        documentConstraintEndpoint(
          constraint.b
        )
    );
}

function drawDocumentGeometryConstraints() {
  if (
    !geometryConstraintsPanelRequested
  ) {
    return;
  }

  documentGeometryConstraints.forEach(
    constraint => {
      if (
        !["cross-distance", "cross-distance-x", "cross-distance-y"].includes(
          constraint.type
        )
      ) {
        return;
      }

      const a =
        documentConstraintEndpoint(
          constraint.a
        );

      const b =
        documentConstraintEndpoint(
          constraint.b
        );

      if (
        !a ||
        !b
      ) {
        return;
      }

      let dimensionA = a.point;
      let dimensionB = b.point;

      if (constraint.type === "cross-distance-x") {
        const y = Math.min(a.point.y, b.point.y) - 20 / Math.max(zoom, 0.3);
        dimensionA = { x: a.point.x, y };
        dimensionB = { x: b.point.x, y };

        [a.point, b.point].forEach(point => {
          selectionOverlay.appendChild(svgEl("line", {
            x1: point.x,
            y1: point.y,
            x2: point.x,
            y2: y,
            class: "geometry-cross-extension-line",
            "pointer-events": "none"
          }));
        });
      } else if (constraint.type === "cross-distance-y") {
        const x = Math.max(a.point.x, b.point.x) + 20 / Math.max(zoom, 0.3);
        dimensionA = { x, y: a.point.y };
        dimensionB = { x, y: b.point.y };

        [a.point, b.point].forEach(point => {
          selectionOverlay.appendChild(svgEl("line", {
            x1: point.x,
            y1: point.y,
            x2: x,
            y2: point.y,
            class: "geometry-cross-extension-line",
            "pointer-events": "none"
          }));
        });
      }

      selectionOverlay.appendChild(
        svgEl(
          "line",
          {
            x1: dimensionA.x,
            y1: dimensionA.y,
            x2: dimensionB.x,
            y2: dimensionB.y,
            class:
              "geometry-cross-constraint-line",
            "pointer-events":
              "none"
          }
        )
      );

      const label =
        svgEl(
          "text",
          {
            x:
              (dimensionA.x + dimensionB.x) / 2,
            y:
              (dimensionA.y + dimensionB.y) / 2 -
              10 /
                Math.max(
                  zoom,
                  0.3
                ),
            class:
              "geometry-constraint-label geometry-cross-constraint-label",
            "text-anchor":
              "middle",
            "pointer-events":
              "none"
          }
        );

      const dimensionPrefix =
        constraint.type === "cross-distance-x"
          ? "ΔX "
          : constraint.type === "cross-distance-y"
            ? "ΔY "
            : "";

      label.textContent =
        `${dimensionPrefix}${Number(constraint.value).toFixed(1).replace(/\.0$/, "")} px`;

      selectionOverlay.appendChild(
        label
      );
    }
  );
}

function pathGeometryConstraints(path) {
  if (!path || path.tagName !== "path") return [];
  try {
    const value = JSON.parse(path.dataset.geometryConstraints || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function savePathGeometryConstraints(path, constraints) {
  if (!path || path.tagName !== "path") return;
  path.dataset.geometryConstraints = JSON.stringify(constraints);
}

function selectedConstraintPath() {
  const path = editableSelectedPath();
  return path && Array.isArray(path._anchors) ? path : null;
}

function selectedConstraintVertexIndices() {
  const path =
    selectedConstraintPath();

  if (!path) {
    return [];
  }

  const indices =
    new Set(
      [...selectedAnchorIndices]
        .map(Number)
        .filter(
          index =>
            Number.isInteger(index) &&
            Boolean(
              path._anchors[
                index
              ]
            )
        )
    );

  if (
    Number.isInteger(
      selectedAnchorIndex
    ) &&
    path._anchors[
      selectedAnchorIndex
    ]
  ) {
    indices.add(
      selectedAnchorIndex
    );
  }

  return [
    ...indices
  ];
}

function constraintPointDistance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function moveConstraintAnchor(path, index, x, y) {
  const anchor = path?._anchors?.[index];
  if (!anchor) return;
  const dx = x - anchor.x;
  const dy = y - anchor.y;
  anchor.x += dx;
  anchor.y += dy;
  anchor.inX += dx;
  anchor.inY += dy;
  anchor.outX += dx;
  anchor.outY += dy;
}

function signedConstraintAngle(a, b, c) {
  let delta =
    Math.atan2(c.y - b.y, c.x - b.x) -
    Math.atan2(a.y - b.y, a.x - b.x);

  while (delta <= -Math.PI) delta += Math.PI * 2;
  while (delta > Math.PI) delta -= Math.PI * 2;
  return delta;
}

function addDistanceGeometryConstraint() {
  const path = selectedConstraintPath();
  const indices = selectedConstraintVertexIndices();

  if (!path || indices.length !== 2) {
    toolStatus.textContent = "Select exactly 2 path vertices";
    return;
  }

  const value = Math.max(
    0.01,
    Number(geometryConstraintDistanceInput.value) || 0.01
  );

  const constraints = pathGeometryConstraints(path);

  const candidate = {
    id: "",
    type: "distance",
    a: indices[0],
    b: indices[1],
    value
  };

  const preflight =
    preflightPathDistanceConstraint(
      path,
      candidate
    );

  if (
    rejectConstraintPreflight(
      preflight
    )
  ) {
    return false;
  }

  geometryConstraintCounter += 1;

  candidate.id =
    `distance-${Date.now()}-${geometryConstraintCounter}`;

  constraints.push(
    candidate
  );

  savePathGeometryConstraints(path, constraints);
  enforcePathGeometryConstraints(path, new Set([indices[0]]));
  updatePathD(path);
  drawSelection();
  syncGeometryConstraintsPanel();

  recordHistory({
    label: "Distance Constraint Added",
    detail: `${value}px`
  });
  scheduleAutosave();
}

function addAngleGeometryConstraint() {
  const path = selectedConstraintPath();
  const indices = selectedConstraintVertexIndices();

  if (!path || indices.length !== 3) {
    toolStatus.textContent = "Select exactly 3 path vertices";
    return;
  }

  const value = Math.max(
    0.1,
    Math.min(
      179.9,
      Number(geometryConstraintAngleInput.value) || 90
    )
  );

  const a = path._anchors[indices[0]];
  const pivot = path._anchors[indices[1]];
  const c = path._anchors[indices[2]];
  const signed = signedConstraintAngle(a, pivot, c);

  const constraints = pathGeometryConstraints(path);

  const candidate = {
    id: "",
    type: "angle",
    a: indices[0],
    pivot: indices[1],
    c: indices[2],
    value,
    sign: signed < 0 ? -1 : 1
  };

  const preflight =
    preflightPathAngleConstraint(
      path,
      candidate
    );

  if (
    rejectConstraintPreflight(
      preflight
    )
  ) {
    return false;
  }

  geometryConstraintCounter += 1;

  candidate.id =
    `angle-${Date.now()}-${geometryConstraintCounter}`;

  constraints.push(
    candidate
  );

  savePathGeometryConstraints(path, constraints);
  enforcePathGeometryConstraints(path, new Set([indices[0], indices[1]]));
  updatePathD(path);
  drawSelection();
  syncGeometryConstraintsPanel();

  recordHistory({
    label: "Angle Constraint Added",
    detail: `${value}°`
  });
  scheduleAutosave();
}



function pinnedVertexConstraints(
  path
) {
  return pathGeometryConstraints(
    path
  ).filter(
    constraint =>
      constraint.type ===
      "pin-vertex"
  );
}

function pinnedVertexConstraintMap(
  path
) {
  return new Map(
    pinnedVertexConstraints(
      path
    ).map(
      constraint => [
        Number(
          constraint.anchor
        ),
        constraint
      ]
    )
  );
}

function enforcePinnedVertexConstraint(
  path,
  constraint
) {
  if (
    !path ||
    !constraint
  ) {
    return false;
  }

  const index =
    Number(
      constraint.anchor
    );

  const anchor =
    path._anchors?.[
      index
    ];

  if (!anchor) {
    return false;
  }

  const target = {
    x:
      Number(
        constraint.x
      ) || 0,
    y:
      Number(
        constraint.y
      ) || 0
  };

  /*
   * Pins are stored in artboard/canvas coordinates, not path-local
   * coordinates. Convert the target back through the current transform so
   * the vertex stays fixed even if the path object itself is translated.
   */
  const local =
    localPointFromCanvas(
      path,
      target
    );

  moveConstraintAnchor(
    path,
    index,
    local.x,
    local.y
  );

  return true;
}

function enforcePinnedVertices(
  path
) {
  const pins =
    pinnedVertexConstraints(
      path
    );

  pins.forEach(
    constraint =>
      enforcePinnedVertexConstraint(
        path,
        constraint
      )
  );

  return pins.length;
}

function preservePinnedVerticesDuringObjectMove(
  element
) {
  if (
    !element ||
    element.tagName !==
      "path"
  ) {
    return false;
  }

  const pins =
    pinnedVertexConstraints(
      element
    );

  if (!pins.length) {
    return false;
  }

  /*
   * Whole-object dragging changes dataset.tx / dataset.ty. To keep pinned
   * vertices fixed in world/artboard space, measure the first pinned vertex's
   * displacement after the attempted move and subtract that displacement from
   * the object translation. Because all points on the object share the same
   * translation, this restores every pinned vertex to its target position.
   */
  const first =
    pins[0];

  const anchor =
    element._anchors?.[
      Number(
        first.anchor
      )
    ];

  if (!anchor) {
    return false;
  }

  const current =
    canvasPointFromLocal(
      element,
      anchor.x,
      anchor.y
    );

  const dx =
    current.x -
    Number(first.x);

  const dy =
    current.y -
    Number(first.y);

  if (
    Math.abs(dx) <
      1e-9 &&
    Math.abs(dy) <
      1e-9
  ) {
    return true;
  }

  const translation =
    getTranslation(
      element
    );

  element.dataset.tx =
    String(
      translation.x -
      dx
    );

  element.dataset.ty =
    String(
      translation.y -
      dy
    );

  applyObjectTransform(
    element
  );

  /*
   * Re-assert local anchor positions from the world-space pin targets in case
   * rotation/scale or solver updates have also touched the path geometry.
   */
  enforcePinnedVertices(
    element
  );

  updatePathD(
    element
  );

  return true;
}

function pinnedResizeFreedom(
  path,
  edit
) {
  const pins =
    pinnedVertexConstraints(
      path
    );

  if (!pins.length) {
    return {
      pins,
      allowScaleX:
        true,
      allowScaleY:
        true,
      reference:
        null
    };
  }

  const localPins =
    pins
      .map(
        constraint => {
          const anchor =
            path._anchors?.[
              Number(
                constraint.anchor
              )
            ];

          if (!anchor) {
            return null;
          }

          return {
            constraint,
            x:
              Number(anchor.x),
            y:
              Number(anchor.y)
          };
        }
      )
      .filter(Boolean);

  if (!localPins.length) {
    return {
      pins: [],
      allowScaleX:
        true,
      allowScaleY:
        true,
      reference:
        null
    };
  }

  const epsilon =
    1e-6;

  const first =
    localPins[0];

  /*
   * Uniform object scaling can preserve multiple world-space pins on an axis
   * only when all pinned local coordinates on that axis are identical.
   *
   * Example: two top corners of a square have different X but the same Y.
   * Therefore horizontal scale is locked, while vertical scale may change
   * about their shared Y coordinate.
   */
  const sameX =
    localPins.every(
      pin =>
        Math.abs(
          pin.x -
          first.x
        ) <= epsilon
    );

  const sameY =
    localPins.every(
      pin =>
        Math.abs(
          pin.y -
          first.y
        ) <= epsilon
    );

  return {
    pins:
      localPins,
    allowScaleX:
      localPins.length === 1 ||
      sameX,
    allowScaleY:
      localPins.length === 1 ||
      sameY,
    reference:
      first
  };
}

function preservePinnedVerticesAfterResize(
  path,
  edit,
  freedom
) {
  if (
    !path ||
    !freedom?.pins?.length
  ) {
    return false;
  }

  const first =
    freedom.pins[0];

  const anchor =
    path._anchors?.[
      Number(
        first.constraint.anchor
      )
    ];

  if (!anchor) {
    return false;
  }

  const current =
    canvasPointFromLocal(
      path,
      anchor.x,
      anchor.y
    );

  const target = {
    x:
      Number(
        first.constraint.x
      ),
    y:
      Number(
        first.constraint.y
      )
  };

  const translation =
    getTranslation(
      path
    );

  path.dataset.tx =
    String(
      translation.x +
      target.x -
      current.x
    );

  path.dataset.ty =
    String(
      translation.y +
      target.y -
      current.y
    );

  applyObjectTransform(
    path
  );

  /*
   * Validate every pin after compensation. If the requested resize still
   * cannot preserve them (for example scaling along an axis with separated
   * pins), restore the forbidden scale axis to its original value.
   */
  const tolerance =
    0.01;

  const invalid =
    freedom.pins.some(
      pin => {
        const a =
          path._anchors?.[
            Number(
              pin.constraint.anchor
            )
          ];

        if (!a) {
          return false;
        }

        const p =
          canvasPointFromLocal(
            path,
            a.x,
            a.y
          );

        return (
          Math.hypot(
            p.x -
              Number(
                pin.constraint.x
              ),
            p.y -
              Number(
                pin.constraint.y
              )
          ) >
          tolerance
        );
      }
    );

  if (invalid) {
    if (
      !freedom.allowScaleX
    ) {
      path.dataset.scaleX =
        String(
          edit.scaleX
        );
    }

    if (
      !freedom.allowScaleY
    ) {
      path.dataset.scaleY =
        String(
          edit.scaleY
        );
    }

    path.dataset.tx =
      String(
        edit.tx
      );

    path.dataset.ty =
      String(
        edit.ty
      );

    applyObjectTransform(
      path
    );

    /*
     * Re-run compensation with only permitted scale axes active.
     */
    const anchorAfter =
      path._anchors?.[
        Number(
          first.constraint.anchor
        )
      ];

    if (anchorAfter) {
      const pointAfter =
        canvasPointFromLocal(
          path,
          anchorAfter.x,
          anchorAfter.y
        );

      const t =
        getTranslation(
          path
        );

      path.dataset.tx =
        String(
          t.x +
          target.x -
          pointAfter.x
        );

      path.dataset.ty =
        String(
          t.y +
          target.y -
          pointAfter.y
        );

      applyObjectTransform(
        path
      );
    }
  }

  enforcePinnedVertices(
    path
  );

  updatePathD(
    path
  );

  return true;
}


function pinSelectedVerticesToArtboard() {
  const refs =
    selectedConstraintVertexRefs();

  if (!refs.length) {
    toolStatus.textContent =
      "Pin Vertices: select one or more vertices first";
    return false;
  }

  const byPath =
    new Map();

  refs.forEach(
    ref => {
      const path =
        pathForConstraintId(
          ref.pathId
        );

      const anchor =
        path?._anchors?.[
          ref.anchor
        ];

      if (
        !path ||
        !anchor
      ) {
        return;
      }

      if (
        !byPath.has(path)
      ) {
        byPath.set(
          path,
          []
        );
      }

      byPath.get(path).push(
        ref.anchor
      );
    }
  );

  let pinnedCount = 0;

  byPath.forEach(
    (
      indices,
      path
    ) => {
      const constraints =
        pathGeometryConstraints(
          path
        );

      const existingPins =
        new Map(
          constraints
            .filter(
              constraint =>
                constraint.type ===
                "pin-vertex"
            )
            .map(
              constraint => [
                Number(
                  constraint.anchor
                ),
                constraint
              ]
            )
        );

      indices.forEach(
        index => {
          const anchor =
            path._anchors[
              index
            ];

          const canvasPoint =
            canvasPointFromLocal(
              path,
              anchor.x,
              anchor.y
            );

          const existing =
            existingPins.get(
              index
            );

          if (existing) {
            existing.x =
              canvasPoint.x;
            existing.y =
              canvasPoint.y;
          } else {
            geometryConstraintCounter += 1;

            constraints.push({
              id:
                `pin-vertex-${Date.now()}-${geometryConstraintCounter}`,
              type:
                "pin-vertex",
              anchor:
                index,
              x:
                canvasPoint.x,
              y:
                canvasPoint.y
            });
          }

          pinnedCount += 1;
        }
      );

      savePathGeometryConstraints(
        path,
        constraints
      );

      enforcePinnedVertices(
        path
      );

      updatePathD(
        path
      );
    }
  );

  if (!pinnedCount) {
    return false;
  }

  drawSelection();
  syncGeometryConstraintsPanel();
  renderLayers();

  recordHistory({
    label:
      pinnedCount === 1
        ? "Vertex Pinned"
        : `${pinnedCount} Vertices Pinned`,
    detail:
      "Pinned to current artboard position"
  });

  scheduleAutosave();

  toolStatus.textContent =
    pinnedCount === 1
      ? "Vertex pinned to artboard"
      : `${pinnedCount} vertices pinned to artboard`;

  return true;
}

function fixedGeometryConstraint(
  path
) {
  return pathGeometryConstraints(
    path
  ).find(
    constraint =>
      constraint.type ===
      "fixed-geometry"
  ) || null;
}

function pathHasFixedGeometryConstraint(
  path
) {
  return Boolean(
    fixedGeometryConstraint(
      path
    )
  );
}

function fixedGeometryAnchorSnapshot(
  path
) {
  return (
    path?._anchors || []
  ).map(
    anchor => ({
      x:
        Number(anchor.x) || 0,
      y:
        Number(anchor.y) || 0,
      inX:
        Number(anchor.inX ?? anchor.x) || 0,
      inY:
        Number(anchor.inY ?? anchor.y) || 0,
      outX:
        Number(anchor.outX ?? anchor.x) || 0,
      outY:
        Number(anchor.outY ?? anchor.y) || 0
    })
  );
}

function restoreFixedGeometryConstraint(
  path,
  constraint
) {
  if (
    !path ||
    !constraint ||
    !Array.isArray(
      constraint.anchors
    )
  ) {
    return false;
  }

  if (
    !Array.isArray(
      path._anchors
    ) ||
    path._anchors.length !==
      constraint.anchors.length
  ) {
    path._anchors =
      constraint.anchors.map(
        anchor => ({
          ...anchor
        })
      );
  } else {
    constraint.anchors.forEach(
      (
        snapshot,
        index
      ) => {
        const anchor =
          path._anchors[index];

        if (!anchor) {
          return;
        }

        anchor.x =
          snapshot.x;
        anchor.y =
          snapshot.y;
        anchor.inX =
          snapshot.inX;
        anchor.inY =
          snapshot.inY;
        anchor.outX =
          snapshot.outX;
        anchor.outY =
          snapshot.outY;
      }
    );
  }

  if (
    typeof constraint.closed ===
      "boolean"
  ) {
    path.dataset.closed =
      constraint.closed
        ? "true"
        : "false";
  }

  updatePathD(
    path
  );

  return true;
}

function lockCurrentGeometryForPath(
  path
) {
  if (
    !path ||
    path.tagName !==
      "path"
  ) {
    return false;
  }

  normalizePathForEditing(
    path
  );

  if (
    !Array.isArray(
      path._anchors
    ) ||
    path._anchors.length < 2
  ) {
    return false;
  }

  const constraints =
    pathGeometryConstraints(
      path
    );

  /*
   * This is deliberately one atomic rigid-geometry constraint. Local
   * distance/angle constraints become redundant once every anchor and
   * handle is frozen, so remove them rather than creating an over-defined
   * constraint graph.
   */
  const retained =
    constraints.filter(
      constraint =>
        constraint.type !==
          "distance" &&
        constraint.type !==
          "angle" &&
        constraint.type !==
          "fixed-geometry"
    );

  geometryConstraintCounter += 1;

  retained.push({
    id:
      `fixed-geometry-${Date.now()}-${geometryConstraintCounter}`,
    type:
      "fixed-geometry",
    anchors:
      fixedGeometryAnchorSnapshot(
        path
      ),
    closed:
      path.dataset.closed ===
      "true"
  });

  savePathGeometryConstraints(
    path,
    retained
  );

  return true;
}

function lockCurrentSelectedGeometry() {
  const paths =
    selectedItems
      .filter(
        path =>
          path?.tagName ===
            "path" &&
          isLayerInteractive(
            path
          )
      );

  if (!paths.length) {
    toolStatus.textContent =
      "Lock Current Geometry: select one or more editable paths";
    return false;
  }

  const locked =
    paths.filter(
      lockCurrentGeometryForPath
    );

  if (!locked.length) {
    return false;
  }

  drawSelection();
  syncGeometryConstraintsPanel();
  renderLayers();

  recordHistory({
    label:
      locked.length === 1
        ? "Geometry Locked"
        : `${locked.length} Paths Geometry Locked`,
    detail:
      "Current vertex positions, handles, edge lengths and angles captured"
  });

  scheduleAutosave();

  toolStatus.textContent =
    locked.length === 1
      ? "Current geometry locked"
      : `${locked.length} paths locked to current geometry`;

  return true;
}

function enforceDistanceConstraint(path, constraint, locked) {
  const a = path._anchors[constraint.a];
  const b = path._anchors[constraint.b];
  if (!a || !b) return;

  const target = Math.max(0.01, Number(constraint.value) || 0.01);
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  let length = Math.hypot(dx, dy);

  if (length < 1e-9) {
    dx = 1;
    dy = 0;
    length = 1;
  }

  const ux = dx / length;
  const uy = dy / length;
  const aLocked = locked.has(constraint.a);
  const bLocked = locked.has(constraint.b);

  if (aLocked && !bLocked) {
    moveConstraintAnchor(
      path,
      constraint.b,
      a.x + ux * target,
      a.y + uy * target
    );
  } else if (bLocked && !aLocked) {
    moveConstraintAnchor(
      path,
      constraint.a,
      b.x - ux * target,
      b.y - uy * target
    );
  } else {
    moveConstraintAnchor(
      path,
      constraint.b,
      a.x + ux * target,
      a.y + uy * target
    );
  }
}

function enforceAngleConstraint(path, constraint, locked) {
  const a = path._anchors[constraint.a];
  const pivot = path._anchors[constraint.pivot];
  const c = path._anchors[constraint.c];
  if (!a || !pivot || !c) return;

  const radians =
    Math.max(0.1, Math.min(179.9, Number(constraint.value) || 90)) *
    Math.PI / 180 *
    (Number(constraint.sign) < 0 ? -1 : 1);

  const aLocked = locked.has(constraint.a);
  const cLocked = locked.has(constraint.c);

  if (cLocked && !aLocked) {
    const angle =
      Math.atan2(c.y - pivot.y, c.x - pivot.x) - radians;
    const radius = Math.max(0.01, constraintPointDistance(pivot, a));

    moveConstraintAnchor(
      path,
      constraint.a,
      pivot.x + Math.cos(angle) * radius,
      pivot.y + Math.sin(angle) * radius
    );
  } else {
    const angle =
      Math.atan2(a.y - pivot.y, a.x - pivot.x) + radians;
    const radius = Math.max(0.01, constraintPointDistance(pivot, c));

    moveConstraintAnchor(
      path,
      constraint.c,
      pivot.x + Math.cos(angle) * radius,
      pivot.y + Math.sin(angle) * radius
    );
  }
}

function enforcePathGeometryConstraints(path, lockedIndices = new Set()) {
  if (
    !path ||
    path.tagName !== "path" ||
    !Array.isArray(path._anchors)
  ) {
    return;
  }

  const constraints = pathGeometryConstraints(path);

  const fixed =
    constraints.find(
      constraint =>
        constraint.type ===
        "fixed-geometry"
    );

  if (fixed) {
    restoreFixedGeometryConstraint(
      path,
      fixed
    );
    return;
  }

  const pinnedIndices =
    new Set(
      constraints
        .filter(
          constraint =>
            constraint.type ===
              "pin-vertex"
        )
        .map(
          constraint =>
            Number(
              constraint.anchor
            )
        )
    );

  const effectiveLocked =
    new Set([
      ...lockedIndices,
      ...pinnedIndices
    ]);

  enforcePinnedVertices(
    path
  );

  for (let pass = 0; pass < 5; pass += 1) {
    constraints.forEach(constraint => {
      if (constraint.type === "distance") {
        enforceDistanceConstraint(path, constraint, effectiveLocked);
      } else if (constraint.type === "angle") {
        enforceAngleConstraint(path, constraint, effectiveLocked);
      }
    });

    /*
     * Other constraints may try to move a pinned endpoint during a pass.
     * Snap every pin back to its artboard coordinate after each iteration.
     */
    enforcePinnedVertices(
      path
    );
  }
}

function removeGeometryConstraint(id) {
  const path = selectedConstraintPath();
  if (!path) return;

  savePathGeometryConstraints(
    path,
    pathGeometryConstraints(path).filter(constraint => constraint.id !== id)
  );

  drawSelection();
  syncGeometryConstraintsPanel();
  recordHistory({ label: "Constraint Removed", detail: "Path geometry" });
  scheduleAutosave();
}

function clearSelectedPathGeometryConstraints() {
  const path = selectedConstraintPath();
  if (!path) return;

  savePathGeometryConstraints(path, []);
  drawSelection();
  syncGeometryConstraintsPanel();
  recordHistory({ label: "Constraints Cleared", detail: "Path geometry" });
  scheduleAutosave();
}

function drawPathGeometryConstraints(path) {
  if (
    !path ||
    path.tagName !== "path" ||
    !Array.isArray(path._anchors)
  ) {
    return;
  }

  pathGeometryConstraints(path).forEach(constraint => {
    if (
      constraint.type ===
        "pin-vertex"
    ) {
      const anchor =
        path._anchors?.[
          Number(
            constraint.anchor
          )
        ];

      if (!anchor) {
        return;
      }

      const point =
        canvasPointFromLocal(
          path,
          anchor.x,
          anchor.y
        );

      selectionOverlay.appendChild(
        svgEl(
          "circle",
          {
            cx:
              point.x,
            cy:
              point.y,
            r:
              7 /
              Math.max(
                zoom,
                0.3
              ),
            class:
              "geometry-pin-marker",
            "pointer-events":
              "none"
          }
        )
      );

      const label =
        svgEl(
          "text",
          {
            x:
              point.x +
              10 /
              Math.max(
                zoom,
                0.3
              ),
            y:
              point.y -
              10 /
              Math.max(
                zoom,
                0.3
              ),
            class:
              "geometry-constraint-label geometry-pin-label",
            "pointer-events":
              "none"
          }
        );

      label.textContent =
        "📌";

      selectionOverlay.appendChild(
        label
      );

      return;
    }

    if (
      constraint.type ===
        "fixed-geometry"
    ) {
      const bounds =
        editableLocalBounds(
          path
        );

      const badgePoint =
        canvasPointFromLocal(
          path,
          bounds.x +
            bounds.width / 2,
          bounds.y -
            16 /
            Math.max(
              zoom,
              0.3
            )
        );

      const label =
        svgEl(
          "text",
          {
            x:
              badgePoint.x,
            y:
              badgePoint.y,
            class:
              "geometry-constraint-label geometry-fixed-label",
            "text-anchor":
              "middle",
            "pointer-events":
              "none"
          }
        );

      label.textContent =
        "🔒 geometry";

      selectionOverlay.appendChild(
        label
      );

      return;
    }

    if (constraint.type === "distance") {
      const a = path._anchors[constraint.a];
      const b = path._anchors[constraint.b];
      if (!a || !b) return;

      const ca = canvasPointFromLocal(path, a.x, a.y);
      const cb = canvasPointFromLocal(path, b.x, b.y);

      selectionOverlay.appendChild(
        svgEl("line", {
          x1: ca.x,
          y1: ca.y,
          x2: cb.x,
          y2: cb.y,
          class: "geometry-constraint-line",
          "pointer-events": "none"
        })
      );

      const label = svgEl("text", {
        x: (ca.x + cb.x) / 2,
        y: (ca.y + cb.y) / 2 - 9 / Math.max(zoom, 0.3),
        class: "geometry-constraint-label",
        "text-anchor": "middle",
        "pointer-events": "none"
      });

      label.textContent =
        `${Number(constraint.value).toFixed(1).replace(/\.0$/, "")} px`;

      selectionOverlay.appendChild(label);
    }

    if (constraint.type === "angle") {
      const a = path._anchors[constraint.a];
      const pivot = path._anchors[constraint.pivot];
      const c = path._anchors[constraint.c];
      if (!a || !pivot || !c) return;

      const ca = canvasPointFromLocal(path, a.x, a.y);
      const cp = canvasPointFromLocal(path, pivot.x, pivot.y);

      const radius = 24 / Math.max(zoom, 0.3);
      const startAngle = Math.atan2(ca.y - cp.y, ca.x - cp.x);
      const sweep =
        Number(constraint.value) *
        Math.PI / 180 *
        (Number(constraint.sign) < 0 ? -1 : 1);

      const points = [];
      for (let i = 0; i <= 18; i += 1) {
        const angle = startAngle + sweep * i / 18;
        points.push(
          `${cp.x + Math.cos(angle) * radius},${cp.y + Math.sin(angle) * radius}`
        );
      }

      selectionOverlay.appendChild(
        svgEl("polyline", {
          points: points.join(" "),
          class: "geometry-constraint-angle",
          fill: "none",
          "pointer-events": "none"
        })
      );

      const midAngle = startAngle + sweep / 2;
      const labelRadius = radius + 13 / Math.max(zoom, 0.3);

      const label = svgEl("text", {
        x: cp.x + Math.cos(midAngle) * labelRadius,
        y: cp.y + Math.sin(midAngle) * labelRadius,
        class: "geometry-constraint-label",
        "text-anchor": "middle",
        "dominant-baseline": "middle",
        "pointer-events": "none"
      });

      label.textContent =
        `${Number(constraint.value).toFixed(1).replace(/\.0$/, "")}°`;

      selectionOverlay.appendChild(label);
    }
  });
}


function drawDocumentEdgeRelations() {
  documentGeometryConstraints
    .filter(
      constraint =>
        [
          "edge-parallel",
          "edge-perpendicular"
        ].includes(
          constraint.type
        )
    )
    .forEach(
      constraint => {
        [
          constraint.first,
          constraint.second
        ].forEach(
          edge => {
            const data =
              edgeRelationCanvasData(
                edge
              );

            if (!data) return;

            const text =
              svgEl(
                "text",
                {
                  x:
                    (
                      data.a.point.x +
                      data.b.point.x
                    ) / 2,
                  y:
                    (
                      data.a.point.y +
                      data.b.point.y
                    ) / 2 -
                    9 /
                    Math.max(
                      zoom,
                      0.3
                    ),
                  class:
                    "geometry-constraint-label geometry-edge-relation-label",
                  "text-anchor":
                    "middle",
                  "pointer-events":
                    "none"
                }
              );

            text.textContent =
              constraint.type ===
                "edge-parallel"
                ? "∥"
                : "⟂";

            selectionOverlay
              .appendChild(
                text
              );
          }
        );
      }
    );
}

function renderGeometryConstraintList() {
  geometryConstraintList.replaceChildren();

  const path = selectedConstraintPath();

  if (!path) {
    const empty = document.createElement("div");
    empty.className = "geometry-constraint-empty";
    empty.textContent = "Select one editable path.";
    geometryConstraintList.appendChild(empty);
    return;
  }

  const constraints = pathGeometryConstraints(path);

  if (
    !constraints.length &&
    !documentGeometryConstraints.length
  ) {
    const empty = document.createElement("div");
    empty.className = "geometry-constraint-empty";
    empty.textContent = "No constraints on this path or between paths.";
    geometryConstraintList.appendChild(empty);
    return;
  }

  constraints.forEach(constraint => {
    const row = document.createElement("div");
    row.className = "geometry-constraint-row";

    const text = document.createElement("span");
    if (constraint.type === "distance") {
      text.textContent =
        `Distance V${constraint.a + 1}–V${constraint.b + 1}: ${Number(constraint.value).toFixed(1).replace(/\.0$/, "")} px`;
    } else if (
      constraint.type ===
        "fixed-geometry"
    ) {
      text.textContent =
        `🔒 Current Geometry • ${constraint.anchors?.length || 0} vertices`;
    } else if (
      constraint.type ===
        "pin-vertex"
    ) {
      text.textContent =
        `📌 Pin V${Number(constraint.anchor) + 1}: ${Number(constraint.x).toFixed(1)}, ${Number(constraint.y).toFixed(1)}`;
    } else {
      text.textContent =
        `Angle V${constraint.a + 1}–V${constraint.pivot + 1}–V${constraint.c + 1}: ${Number(constraint.value).toFixed(1).replace(/\.0$/, "")}°`;
    }

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "×";
    remove.title = "Remove constraint";
    remove.addEventListener("click", () => removeGeometryConstraint(constraint.id));

    row.append(text, remove);
    geometryConstraintList.appendChild(row);
  });

  documentGeometryConstraints
    .filter(
      constraint =>
        ["cross-distance", "cross-distance-x", "cross-distance-y"].includes(
          constraint.type
        )
    )
    .forEach(
      constraint => {
        const aPath =
          pathForConstraintId(
            constraint.a.pathId
          );

        const bPath =
          pathForConstraintId(
            constraint.b.pathId
          );

        if (
          !aPath ||
          !bPath
        ) {
          return;
        }

        const row =
          document.createElement(
            "div"
          );

        row.className =
          "geometry-constraint-row geometry-cross-constraint-row";

        const text =
          document.createElement(
            "span"
          );

        text.textContent =
          `Cross distance ${aPath.dataset.name || "Path"} V${constraint.a.anchor + 1} ↔ ${bPath.dataset.name || "Path"} V${constraint.b.anchor + 1}: ${Number(constraint.value).toFixed(1).replace(/\.0$/, "")} px`;

        const remove =
          document.createElement(
            "button"
          );

        remove.type =
          "button";

        remove.textContent =
          "×";

        remove.title =
          "Remove cross-path constraint";

        remove.addEventListener(
          "click",
          () =>
            removeDocumentGeometryConstraint(
              constraint.id
            )
        );

        row.append(
          text,
          remove
        );

        geometryConstraintList.appendChild(
          row
        );
      }
    );

  documentGeometryConstraints
    .filter(
      constraint =>
        [
          "edge-parallel",
          "edge-perpendicular"
        ].includes(
          constraint.type
        )
    )
    .forEach(
      constraint => {
        const row =
          document.createElement(
            "div"
          );

        row.className =
          "geometry-constraint-row geometry-edge-relation-row";

        const text =
          document.createElement(
            "span"
          );

        text.textContent =
          constraint.type ===
            "edge-parallel"
            ? "∥ Parallel edges"
            : "⟂ Perpendicular edges";

        const remove =
          document.createElement(
            "button"
          );

        remove.type =
          "button";
        remove.textContent =
          "×";
        remove.title =
          "Remove edge relation";

        remove.addEventListener(
          "click",
          () =>
            removeDocumentGeometryConstraint(
              constraint.id
            )
        );

        row.append(
          text,
          remove
        );

        geometryConstraintList
          .appendChild(
            row
          );
      }
    );

}

function syncGeometryConstraintsPanel() {
  if (
    pinSelectedVerticesConstraintButton
  ) {
    const selectedVertexCount =
      selectedConstraintVertexRefs()
        .length;

    pinSelectedVerticesConstraintButton.disabled =
      selectedVertexCount === 0;

    pinSelectedVerticesConstraintButton.textContent =
      selectedVertexCount > 0
        ? `Pin Selected Vertices (${selectedVertexCount})`
        : "Pin Selected Vertices";
  }


  if (
    lockCurrentGeometryConstraintButton
  ) {
    const selectedPaths =
      selectedItems.filter(
        path =>
          path?.tagName ===
            "path" &&
          isLayerInteractive(
            path
          )
      );

    const allLocked =
      selectedPaths.length > 0 &&
      selectedPaths.every(
        path =>
          pathHasFixedGeometryConstraint(
            path
          )
      );

    lockCurrentGeometryConstraintButton.disabled =
      selectedPaths.length === 0;

    lockCurrentGeometryConstraintButton.textContent =
      allLocked
        ? "Geometry Locked"
        : "Lock Current Geometry";

    lockCurrentGeometryConstraintButton.classList.toggle(
      "active",
      allLocked
    );
  }


  geometryConstraintsPanel.hidden = !geometryConstraintsPanelRequested;

  document
    .querySelectorAll(".geometry-constraints-tool")
    .forEach(button => {
      button.classList.toggle("active", geometryConstraintsPanelRequested);
    });

  crossConstraintAReadout.textContent =
    constraintEndpointLabel(
      crossConstraintEndpointA,
      "A"
    );

  crossConstraintBReadout.textContent =
    constraintEndpointLabel(
      crossConstraintEndpointB,
      "B"
    );

  updateConstraintMakerUI();
  renderGeometryConstraintList();
  requestAnimationFrame(positionGeometryConstraintsPanel);
}

function positionGeometryConstraintsPanel() {
  if (geometryConstraintsPanel.hidden) return;

  if (geometryConstraintsPanelManualPosition) {
    geometryConstraintsPanel.style.left =
      `${geometryConstraintsPanelManualPosition.left}px`;
    geometryConstraintsPanel.style.top =
      `${geometryConstraintsPanelManualPosition.top}px`;
    return;
  }

  const stageRect = stage.getBoundingClientRect();
  const panelRect = geometryConstraintsPanel.getBoundingClientRect();

  geometryConstraintsPanel.style.left =
    `${Math.max(8, stageRect.width - panelRect.width - 14)}px`;
  geometryConstraintsPanel.style.top = "12px";
}

setDistanceConstraintButton.addEventListener(
  "click",
  addDistanceGeometryConstraint
);

captureCrossConstraintAButton.addEventListener(
  "click",
  () =>
    captureCrossConstraintEndpoint(
      "a"
    )
);

captureCrossConstraintBButton.addEventListener(
  "click",
  () =>
    captureCrossConstraintEndpoint(
      "b"
    )
);

constraintMakerTypeButtons.forEach(button => {
  button.addEventListener("click", () => {
    if (
      button.dataset.constraintMakerType !==
        "auto"
    ) {
      return;
    }
    constraintMakerType =
      "auto";

    constraintMakerSelectedEdges = [];
    constraintMakerAnglePlacement = null;
    constraintMakerPlacement = null;
    constraintMakerPlacementMode = null;
    constraintMakerPendingPlacement = null;

    hideConstraintValuePopup();
    updateConstraintMakerUI();

    if (
      geometryConstraintsPanelRequested
    ) {
      beginConstraintMaker();
    }
  });
});

startConstraintMakerButton.addEventListener("click", () => {
  if (constraintMakerActive) stopConstraintMaker();
  else beginConstraintMaker();
});

lockCurrentGeometryConstraintButton?.addEventListener(
  "click",
  lockCurrentSelectedGeometry
);

pinSelectedVerticesConstraintButton?.addEventListener(
  "click",
  pinSelectedVerticesToArtboard
);

parallelEdgesConstraintButton?.addEventListener(
  "click",
  () =>
    beginEdgeRelationConstraint(
      "edge-parallel"
    )
);

perpendicularEdgesConstraintButton?.addEventListener(
  "click",
  () =>
    beginEdgeRelationConstraint(
      "edge-perpendicular"
    )
);

setCrossPathDistanceConstraintButton.addEventListener(
  "click",
  addCrossPathDistanceConstraint
);

clearCrossConstraintEndpointsButton.addEventListener(
  "click",
  clearCrossConstraintEndpoints
);

setAngleConstraintButton.addEventListener(
  "click",
  addAngleGeometryConstraint
);

clearGeometryConstraintsButton.addEventListener(
  "click",
  clearSelectedPathGeometryConstraints
);

closeGeometryConstraintsButton.addEventListener("click", () => {
    constraintToolPersistentActive = false;
    clearConstraintInteractionPreview();
    constraintMakerActive = false;

  geometryConstraintsPanelRequested = false;
  constraintToolPersistentActive = false;
  clearConstraintInteractionPreview();
  constraintMakerActive = false;
  stopConstraintMaker();
  syncGeometryConstraintsPanel();
});

geometryConstraintsPanel.addEventListener("pointerdown", event => {
  if (
    event.button !== 0 ||
    !event.target.closest("[data-geometry-constraints-drag='true']") ||
    event.target.closest("button, input, select")
  ) {
    return;
  }

  const rect = geometryConstraintsPanel.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();

  geometryConstraintsPanelDrag = {
    pointerId: event.pointerId,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
    stageLeft: stageRect.left,
    stageTop: stageRect.top
  };

  geometryConstraintsPanel.setPointerCapture(event.pointerId);
  event.preventDefault();
});

geometryConstraintsPanel.addEventListener("pointermove", event => {
  if (
    !geometryConstraintsPanelDrag ||
    geometryConstraintsPanelDrag.pointerId !== event.pointerId
  ) {
    return;
  }

  geometryConstraintsPanelManualPosition = {
    left: Math.max(
      8,
      event.clientX -
        geometryConstraintsPanelDrag.stageLeft -
        geometryConstraintsPanelDrag.offsetX
    ),
    top: Math.max(
      8,
      event.clientY -
        geometryConstraintsPanelDrag.stageTop -
        geometryConstraintsPanelDrag.offsetY
    )
  };

  positionGeometryConstraintsPanel();
});

geometryConstraintsPanel.addEventListener("pointerup", () => {
  geometryConstraintsPanelDrag = null;
});


function isArtBrushObject(
  element
) {
  return Boolean(
    element &&
    element.dataset.artBrush ===
      "true"
  );
}

function selectedArtBrushObject() {
  return (
    selectedItems.length === 1 &&
    isArtBrushObject(
      selectedItems[0]
    )
  )
    ? selectedItems[0]
    : null;
}

function artBrushSettings(
  element
) {
  if (
    !isArtBrushObject(
      element
    )
  ) {
    return null;
  }

  try {
    return JSON.parse(
      element.dataset.artBrushSettings ||
      "{}"
    );
  } catch {
    return null;
  }
}

function normalizeArtBrushSettings(
  settings = {}
) {
  return {
    presetId:
      settings.presetId ||
      "",
    spacing:
      Math.max(
        1,
        Math.min(
          1000,
          Number(settings.spacing) ||
          40
        )
      ),
    scale:
      Math.max(
        0.01,
        Math.min(
          10,
          Number(settings.scale) ||
          1
        )
      ),
    offset:
      Math.max(
        -1000,
        Math.min(
          1000,
          Number(settings.offset) ||
          0
        )
      ),
    rotation:
      Math.max(
        -180,
        Math.min(
          180,
          Number(settings.rotation) ||
          0
        )
      )
  };
}

function artBrushPresetById(
  id
) {
  return (
    artBrushPresets.find(
      preset =>
        preset.id === id
    ) ||
    null
  );
}

function renderArtBrushPresetOptions() {
  artBrushPresetSelect
    .replaceChildren();

  if (!artBrushPresets.length) {
    const option =
      document.createElement(
        "option"
      );

    option.value =
      "";

    option.textContent =
      "No brushes yet";

    artBrushPresetSelect
      .appendChild(
        option
      );

    return;
  }

  artBrushPresets
    .forEach(
      preset => {
        const option =
          document.createElement(
            "option"
          );

        option.value =
          preset.id;

        option.textContent =
          preset.name;

        artBrushPresetSelect
          .appendChild(
            option
          );
      }
    );
}

function createArtBrushPresetFromSelection() {
  const items =
    topLevelSelectedItems();

  if (!items.length) {
    toolStatus.textContent =
      "Select vector artwork first";
    return null;
  }

  if (
    items.some(
      item =>
        isRasterImageElement(
          item
        ) ||
        isArtBrushObject(
          item
        ) ||
        isThreeDExtrude(
          item
        )
    )
  ) {
    toolStatus.textContent =
      "Art Brushes require ordinary vector artwork";
    return null;
  }

  const wrapper =
    document.createElementNS(
      SVG_NS,
      "g"
    );

  items.forEach(
    item =>
      wrapper.appendChild(
        item.cloneNode(
          true
        )
      )
  );

  const serialized =
    serializeElementForProject(
      wrapper
    );

  artBrushPresetCounter +=
    1;

  const preset = {
    id:
      `art-brush-${Date.now()}-${artBrushPresetCounter}`,
    name:
      `Art Brush ${artBrushPresetCounter}`,
    source:
      serialized
  };

  artBrushPresets.push(
    preset
  );

  renderArtBrushPresetOptions();

  artBrushPresetSelect.value =
    preset.id;

  artBrushPanelRequested =
    true;

  syncArtBrushPanel();

  scheduleAutosave();

  toolStatus.textContent =
    `${preset.name} created`;

  return preset;
}

function artBrushGuideData(
  element
) {
  try {
    return JSON.parse(
      element.dataset.artBrushGuide ||
      "null"
    );
  } catch {
    return null;
  }
}

function artBrushGuideElement(
  element
) {
  const data =
    artBrushGuideData(
      element
    );

  return data
    ? createElementFromProject(
        data,
        false
      )
    : null;
}

function artBrushGeometryLength(
  guide
) {
  if (!guide) return 0;

  if (
    typeof guide.getTotalLength ===
      "function"
  ) {
    try {
      return guide.getTotalLength();
    } catch {}
  }

  if (guide.tagName === "line") {
    const x1 =
      Number(
        guide.getAttribute("x1")
      ) || 0;
    const y1 =
      Number(
        guide.getAttribute("y1")
      ) || 0;
    const x2 =
      Number(
        guide.getAttribute("x2")
      ) || 0;
    const y2 =
      Number(
        guide.getAttribute("y2")
      ) || 0;

    return Math.hypot(
      x2 - x1,
      y2 - y1
    );
  }

  return 0;
}

function artBrushPointAtLength(
  guide,
  distance
) {
  if (!guide) {
    return {
      x: 0,
      y: 0
    };
  }

  if (
    typeof guide.getPointAtLength ===
      "function"
  ) {
    try {
      const p =
        guide.getPointAtLength(
          distance
        );

      return {
        x: p.x,
        y: p.y
      };
    } catch {}
  }

  if (guide.tagName === "line") {
    const x1 =
      Number(
        guide.getAttribute("x1")
      ) || 0;
    const y1 =
      Number(
        guide.getAttribute("y1")
      ) || 0;
    const x2 =
      Number(
        guide.getAttribute("x2")
      ) || 0;
    const y2 =
      Number(
        guide.getAttribute("y2")
      ) || 0;

    const total =
      Math.hypot(
        x2 - x1,
        y2 - y1
      ) || 1;

    const t =
      Math.max(
        0,
        Math.min(
          1,
          distance / total
        )
      );

    return {
      x:
        x1 +
        (x2 - x1) * t,
      y:
        y1 +
        (y2 - y1) * t
    };
  }

  return {
    x: 0,
    y: 0
  };
}

function artBrushPathCandidate(
  element
) {
  if (!element) return false;

  return (
    element.tagName ===
      "path" ||
    element.tagName ===
      "line"
  );
}


function artBrushLeafElements(
  root
) {
  const leaves = [];

  const walk =
    node => {
      if (
        !node ||
        !(node instanceof SVGElement)
      ) {
        return;
      }

      if (node.tagName === "g") {
        [
          ...node.children
        ].forEach(
          walk
        );
        return;
      }

      leaves.push(
        node
      );
    };

  walk(root);

  return leaves;
}

function artBrushRawGeometryForElement(
  element
) {
  if (
    !element ||
    element.tagName === "text" ||
    isRasterImageElement(
      element
    )
  ) {
    return null;
  }

  if (
    element.tagName ===
      "path"
  ) {
    normalizePathForEditing(
      element
    );

    if (
      Array.isArray(
        element._anchors
      ) &&
      element._anchors.length >= 2
    ) {
      return {
        anchors:
          element._anchors.map(
            cloneAnchor
          ),
        closed:
          element.dataset.closed ===
            "true" ||
          element
            .getAttribute("d")
            ?.trim()
            .toLowerCase()
            .endsWith("z")
      };
    }

    return null;
  }

  if (
    element.tagName ===
      "rect"
  ) {
    return {
      anchors:
        rectanglePathAnchors(
          element
        ),
      closed: true
    };
  }

  if (
    element.tagName ===
      "ellipse"
  ) {
    return {
      anchors:
        ellipsePathAnchors(
          element
        ),
      closed: true
    };
  }

  if (
    element.tagName ===
      "polygon"
  ) {
    return {
      anchors:
        polygonPathAnchors(
          element
        ),
      closed: true
    };
  }

  if (
    element.tagName ===
      "line"
  ) {
    return {
      anchors:
        linePathAnchors(
          element
        ),
      closed: false
    };
  }

  return null;
}

function artBrushTransformPointByMatrix(
  point,
  matrix
) {
  if (!matrix) {
    return {
      x: point.x,
      y: point.y
    };
  }

  const transformed =
    new DOMPoint(
      point.x,
      point.y
    ).matrixTransform(
      matrix
    );

  return {
    x: transformed.x,
    y: transformed.y
  };
}

function artBrushTransformAnchorByMatrix(
  anchor,
  matrix
) {
  const point =
    artBrushTransformPointByMatrix(
      {
        x: anchor.x,
        y: anchor.y
      },
      matrix
    );

  const handleIn =
    artBrushTransformPointByMatrix(
      {
        x: anchor.inX,
        y: anchor.inY
      },
      matrix
    );

  const handleOut =
    artBrushTransformPointByMatrix(
      {
        x: anchor.outX,
        y: anchor.outY
      },
      matrix
    );

  return {
    x: point.x,
    y: point.y,
    inX:
      handleIn.x,
    inY:
      handleIn.y,
    outX:
      handleOut.x,
    outY:
      handleOut.y
  };
}

function artBrushWarpPoint(
  guide,
  total,
  sourceBounds,
  settings,
  point
) {
  const width =
    Math.max(
      1e-6,
      sourceBounds.width
    );

  const centerX =
    sourceBounds.x +
    width / 2;

  const centerY =
    sourceBounds.y +
    sourceBounds.height /
      2;

  const rotation =
    Number(
      settings.rotation
    ) *
    Math.PI /
    180;

  const cos =
    Math.cos(
      rotation
    );

  const sin =
    Math.sin(
      rotation
    );

  const dx =
    point.x - centerX;
  const dy =
    point.y - centerY;

  const rotatedX =
    dx * cos -
    dy * sin;

  const rotatedY =
    dx * sin +
    dy * cos;

  const inset =
    Math.max(
      0,
      Math.min(
        total / 2 - 0.0001,
        Number(
          settings.spacing
        ) || 0
      )
    );

  const usable =
    Math.max(
      1e-6,
      total -
        inset * 2
    );

  const normalizedX =
    (
      rotatedX *
        settings.scale +
      width / 2
    ) / width;

  const distance =
    Math.max(
      0,
      Math.min(
        total,
        inset +
          normalizedX *
            usable
      )
    );

  const tangentDelta =
    Math.max(
      0.5,
      Math.min(
        3,
        total / 200
      )
    );

  const before =
    artBrushPointAtLength(
      guide,
      Math.max(
        0,
        distance -
          tangentDelta
      )
    );

  const after =
    artBrushPointAtLength(
      guide,
      Math.min(
        total,
        distance +
          tangentDelta
      )
    );

  const angle =
    Math.atan2(
      after.y -
        before.y,
      after.x -
        before.x
    );

  const tangent =
    {
      x:
        Math.cos(
          angle
        ),
      y:
        Math.sin(
          angle
        )
    };

  const normal =
    {
      x:
        -tangent.y,
      y:
        tangent.x
    };

  const base =
    artBrushPointAtLength(
      guide,
      distance
    );

  const lateral =
    rotatedY *
      settings.scale +
    settings.offset;

  return {
    x:
      base.x +
      normal.x *
        lateral,
    y:
      base.y +
      normal.y *
        lateral
  };
}

function artBrushBuildWarpedPath(
  sourceElement,
  matrix,
  guide,
  total,
  sourceBounds,
  settings
) {
  const raw =
    artBrushRawGeometryForElement(
      sourceElement
    );

  if (
    !raw ||
    !Array.isArray(
      raw.anchors
    ) ||
    raw.anchors.length < 2
  ) {
    return null;
  }

  const anchors =
    raw.anchors.map(
      anchor =>
        artBrushTransformAnchorByMatrix(
          anchor,
          matrix
        )
    );

  const warped =
    anchors.map(
      anchor => {
        const point =
          artBrushWarpPoint(
            guide,
            total,
            sourceBounds,
            settings,
            {
              x: anchor.x,
              y: anchor.y
            }
          );

        const handleIn =
          artBrushWarpPoint(
            guide,
            total,
            sourceBounds,
            settings,
            {
              x: anchor.inX,
              y: anchor.inY
            }
          );

        const handleOut =
          artBrushWarpPoint(
            guide,
            total,
            sourceBounds,
            settings,
            {
              x: anchor.outX,
              y: anchor.outY
            }
          );

        return {
          x: point.x,
          y: point.y,
          inX:
            handleIn.x,
          inY:
            handleIn.y,
          outX:
            handleOut.x,
          outY:
            handleOut.y
        };
      }
    );

  const path =
    svgEl("path");

  copyElementAttributes(
    sourceElement,
    path
  );

  path.dataset.groupChild =
    "true";
  path.dataset.editorPath =
    "true";
  path.dataset.closed =
    raw.closed
      ? "true"
      : "false";

  if (
    raw.closed ||
    sourceElement.dataset.shape ===
      "true"
  ) {
    path.dataset.shape =
      "true";
  } else {
    delete path.dataset.shape;
    if (
      !path.getAttribute(
        "fill"
      )
    ) {
      path.setAttribute(
        "fill",
        "none"
      );
    }
  }

  path._anchors =
    warped;
  updatePathD(path);

  return path;
}

function renderArtBrushObject(
  brush
) {
  if (
    !isArtBrushObject(
      brush
    )
  ) {
    return;
  }

  const settings =
    normalizeArtBrushSettings(
      artBrushSettings(
        brush
      ) || {}
    );

  const preset =
    artBrushPresetById(
      settings.presetId
    );

  const guide =
    artBrushGuideElement(
      brush
    );

  if (
    !preset ||
    !guide
  ) {
    return;
  }

  brush.replaceChildren();

  const hiddenGuide =
    guide.cloneNode(
      true
    );

  hiddenGuide.dataset.groupChild =
    "true";
  hiddenGuide.setAttribute(
    "visibility",
    "hidden"
  );
  hiddenGuide.setAttribute(
    "pointer-events",
    "none"
  );

  brush.appendChild(
    hiddenGuide
  );

  const source =
    createElementFromProject(
      preset.source,
      false
    );

  source.dataset.groupChild =
    "true";
  source.setAttribute(
    "visibility",
    "hidden"
  );
  source.setAttribute(
    "pointer-events",
    "none"
  );

  brush.appendChild(
    source
  );

  const sourceBounds =
    editableLocalBounds(
      source
    );

  const total =
    artBrushGeometryLength(
      guide
    );

  if (
    total <= 0 ||
    sourceBounds.width <= 0
  ) {
    source.remove();
    return;
  }

  const rootCTM =
    source.getCTM();

  artBrushLeafElements(
    source
  ).forEach(
    child => {
      const childCTM =
        child.getCTM();

      if (
        !rootCTM ||
        !childCTM
      ) {
        return;
      }

      const matrix =
        rootCTM.inverse().multiply(
          childCTM
        );

      const warpedPath =
        artBrushBuildWarpedPath(
          child,
          matrix,
          guide,
          total,
          sourceBounds,
          settings
        );

      if (
        warpedPath
      ) {
        brush.appendChild(
          warpedPath
        );
      }
    }
  );

  source.remove();

  brush.dataset.artBrushSettings =
    JSON.stringify(
      settings
    );

  applyObjectTransform(
    brush
  );
}
function applyArtBrushToSelectedPath() {
  const items =
    topLevelSelectedItems();

  if (
    items.length !== 1 ||
    !artBrushPathCandidate(
      items[0]
    )
  ) {
    toolStatus.textContent =
      "Select one path or line";
    return null;
  }

  const preset =
    artBrushPresetById(
      artBrushPresetSelect.value
    );

  if (!preset) {
    toolStatus.textContent =
      "Create or choose an Art Brush first";
    return null;
  }

  const guide =
    items[0];

  const brush =
    document.createElementNS(
      SVG_NS,
      "g"
    );

  objectCounter += 1;

  brush.dataset.object =
    "true";
  brush.dataset.group =
    "true";
  brush.dataset.artBrush =
    "true";
  brush.dataset.name =
    `Art Brush ${objectCounter}`;
  brush.dataset.tx =
    "0";
  brush.dataset.ty =
    "0";
  brush.dataset.rotation =
    "0";
  brush.dataset.scaleX =
    "1";
  brush.dataset.scaleY =
    "1";
  brush.dataset.hidden =
    "false";
  brush.dataset.locked =
    "false";

  brush.dataset.artBrushGuide =
    JSON.stringify(
      serializeElementForProject(
        guide
      )
    );

  brush.dataset.artBrushSettings =
    JSON.stringify(
      normalizeArtBrushSettings({
        presetId:
          preset.id,
        spacing:
          artBrushSpacing.value,
        scale:
          Number(
            artBrushScale.value
          ) / 100,
        offset:
          artBrushOffset.value,
        rotation:
          artBrushRotation.value
      })
    );

  art.insertBefore(
    brush,
    guide.nextSibling
  );

  guide.remove();

  renderArtBrushObject(
    brush
  );

  setSelection(
    [brush],
    brush
  );

  artBrushPanelRequested =
    true;

  syncArtBrushPanel();
  renderLayers();
  drawSelection();

  recordHistory({
    label:
      "Art Brush Applied",
    detail:
      `${preset.name} bent along path`
  });

  scheduleAutosave();

  return brush;
}

function updateSelectedArtBrushLive(
  record = false
) {
  const brush =
    selectedArtBrushObject();

  if (!brush) return;

  const previous =
    normalizeArtBrushSettings(
      artBrushSettings(
        brush
      ) || {}
    );

  const settings =
    normalizeArtBrushSettings({
      presetId:
        artBrushPresetSelect.value ||
        previous.presetId,
      spacing:
        artBrushSpacing.value,
      scale:
        Number(
          artBrushScale.value
        ) / 100,
      offset:
        artBrushOffset.value,
      rotation:
        artBrushRotation.value
    });

  brush.dataset.artBrushSettings =
    JSON.stringify(
      settings
    );

  renderArtBrushObject(
    brush
  );

  drawSelection();
  renderLayers();

  if (record) {
    recordHistory({
      label:
        "Art Brush Updated",
      detail:
        `${Math.round(settings.spacing)}px inset`
    });
  } else {
    scheduleAutosave();
  }
}

function expandArtBrushToVectors(
  brush =
    selectedArtBrushObject()
) {
  if (!brush) return false;

  const parent =
    brush.parentNode;

  const created = [];

  [
    ...brush.children
  ]
    .filter(
      child =>
        child.getAttribute(
          "visibility"
        ) !== "hidden"
    )
    .forEach(
      child => {
        const clone =
          child.cloneNode(
            true
          );

        clone.dataset.object =
          "true";

        delete clone.dataset
          .groupChild;

        parent.insertBefore(
          clone,
          brush
        );

        created.push(
          clone
        );
      }
    );

  brush.remove();

  setSelection(
    created,
    created[
      created.length - 1
    ] || null
  );

  artBrushPanelRequested =
    false;

  artBrushPanel.hidden =
    true;

  renderLayers();
  drawSelection();

  recordHistory({
    label:
      "Art Brush Expanded",
    detail:
      `${created.length} vector instances`
  });

  scheduleAutosave();

  return true;
}

function syncArtBrushPanel() {
  const brush =
    selectedArtBrushObject();

  artBrushPanel.hidden =
    !artBrushPanelRequested;

  document
    .querySelectorAll(
      ".art-brush-tool"
    )
    .forEach(
      button =>
        button.classList.toggle(
          "active",
          artBrushPanelRequested
        )
    );

  renderArtBrushPresetOptions();

  if (brush) {
    const settings =
      normalizeArtBrushSettings(
        artBrushSettings(
          brush
        ) || {}
      );

    artBrushPresetSelect.value =
      settings.presetId;

    artBrushSpacing.value =
      settings.spacing;

    artBrushScale.value =
      Math.round(
        settings.scale * 100
      );

    artBrushOffset.value =
      settings.offset;

    artBrushRotation.value =
      settings.rotation;
  }

  requestAnimationFrame(
    positionArtBrushPanel
  );
}

function positionArtBrushPanel() {
  if (
    artBrushPanel.hidden
  ) {
    return;
  }

  if (
    artBrushPanelManualPosition
  ) {
    artBrushPanel.style.left =
      `${artBrushPanelManualPosition.left}px`;

    artBrushPanel.style.top =
      `${artBrushPanelManualPosition.top}px`;

    return;
  }

  const stageRect =
    stage.getBoundingClientRect();

  const panelRect =
    artBrushPanel.getBoundingClientRect();

  artBrushPanel.style.left =
    `${Math.max(
      8,
      (
        stageRect.width -
        panelRect.width
      ) / 2
    )}px`;

  artBrushPanel.style.top =
    "12px";
}

function beginArtBrushPanelDrag(
  event
) {
  if (event.button !== 0) return;

  const rect =
    artBrushPanel.getBoundingClientRect();

  const stageRect =
    stage.getBoundingClientRect();

  artBrushPanelDrag = {
    pointerId:
      event.pointerId,
    offsetX:
      event.clientX -
      rect.left,
    offsetY:
      event.clientY -
      rect.top,
    stageLeft:
      stageRect.left,
    stageTop:
      stageRect.top
  };

  artBrushPanel.setPointerCapture(
    event.pointerId
  );

  event.preventDefault();
}

function updateArtBrushPanelDrag(
  event
) {
  if (
    !artBrushPanelDrag ||
    artBrushPanelDrag.pointerId !==
      event.pointerId
  ) {
    return;
  }

  artBrushPanelManualPosition = {
    left:
      Math.max(
        8,
        event.clientX -
          artBrushPanelDrag.stageLeft -
          artBrushPanelDrag.offsetX
      ),
    top:
      Math.max(
        8,
        event.clientY -
          artBrushPanelDrag.stageTop -
          artBrushPanelDrag.offsetY
      )
  };

  positionArtBrushPanel();
}

function endArtBrushPanelDrag(
  event
) {
  if (
    !artBrushPanelDrag ||
    artBrushPanelDrag.pointerId !==
      event.pointerId
  ) {
    return;
  }

  if (
    artBrushPanel.hasPointerCapture(
      event.pointerId
    )
  ) {
    artBrushPanel.releasePointerCapture(
      event.pointerId
    );
  }

  artBrushPanelDrag =
    null;
}

createArtBrushPresetButton
  .addEventListener(
    "click",
    createArtBrushPresetFromSelection
  );

applyArtBrushButton
  .addEventListener(
    "click",
    applyArtBrushToSelectedPath
  );

expandArtBrushButton
  .addEventListener(
    "click",
    () =>
      expandArtBrushToVectors()
  );

closeArtBrushButton
  .addEventListener(
    "click",
    () => {
      artBrushPanelRequested =
        false;

      syncArtBrushPanel();
    }
  );

[
  artBrushPresetSelect,
  artBrushSpacing,
  artBrushScale,
  artBrushOffset,
  artBrushRotation
].forEach(
  control => {
    control.addEventListener(
      "input",
      () =>
        updateSelectedArtBrushLive(
          false
        )
    );

    control.addEventListener(
      "change",
      () =>
        updateSelectedArtBrushLive(
          true
        )
    );
  }
);

artBrushPanel.addEventListener(
  "pointerdown",
  event => {
    if (
      event.target.closest(
        "[data-art-brush-panel-drag='true']"
      ) &&
      !event.target.closest(
        "button, input, select"
      )
    ) {
      beginArtBrushPanelDrag(
        event
      );
    }
  }
);

artBrushPanel.addEventListener(
  "pointermove",
  updateArtBrushPanelDrag
);

artBrushPanel.addEventListener(
  "pointerup",
  endArtBrushPanelDrag
);

artBrushPanel.addEventListener(
  "pointercancel",
  endArtBrushPanelDrag
);


function isThreeDExtrude(element) {
  return Boolean(
    element &&
    element.dataset.threeDExtrude === "true"
  );
}

function isThreeDRevolve(element) {
  return Boolean(
    isThreeDExtrude(element) &&
    element.dataset.threeDMode === "revolve"
  );
}

function selectedThreeDExtrude() {
  /*
   * Keep 3D face editing resilient to temporary selection-array churn.
   * Some UI interactions (notably the floating color picker) can leave the
   * primary `selected` reference intact while `selectedItems` is briefly
   * rebuilt.  Per-face paint must still target the live 3D group.
   */
  if (
    selectedItems.length === 1 &&
    isThreeDExtrude(selectedItems[0])
  ) {
    return selectedItems[0];
  }

  if (isThreeDExtrude(selected)) {
    return selected;
  }

  return null;
}

function activeThreeDFaceSelection(repeat = selectedThreeDExtrude()) {
  if (!repeat || !threeDPanelRequested) return null;

  const stored =
    repeat.dataset.threeDSelectedFace;

  const faceKey =
    typeof threeDSelectedFace === "string" &&
    threeDSelectedFace
      ? threeDSelectedFace
      : typeof stored === "string" && stored
        ? stored
        : "front";

  threeDSelectedFace = faceKey;
  repeat.dataset.threeDSelectedFace = faceKey;

  return faceKey;}

function threeDSettings(element) {
  if (!isThreeDExtrude(element)) return null;
  try {
    return JSON.parse(
      element.dataset.threeDSettings || "{}"
    );
  } catch {
    return null;
  }
}

function threeDSourceData(element) {
  if (!isThreeDExtrude(element)) return null;
  try {
    return JSON.parse(
      element.dataset.threeDSource || "null"
    );
  } catch {
    return null;
  }
}

function normalizeThreeDSettings(settings = {}) {
  return {
    depth:
      Math.max(
        0,
        Math.min(
          2000,
          Number(settings.depth) || 0
        )
      ),
    rotateX:
      Number(settings.rotateX) || 0,
    rotateY:
      Number(settings.rotateY) || 0,
    rotateZ:
      Number(settings.rotateZ) || 0,
    moveX:
      Math.max(
        -5000,
        Math.min(
          5000,
          Number(settings.moveX) || 0
        )
      ),
    moveY:
      Math.max(
        -5000,
        Math.min(
          5000,
          Number(settings.moveY) || 0
        )
      ),
    moveZ:
      Math.max(
        -5000,
        Math.min(
          5000,
          Number(settings.moveZ) || 0
        )
      ),
    pivotX:
      Number.isFinite(
        Number(settings.pivotX)
      )
        ? Number(settings.pivotX)
        : null,
    pivotY:
      Number.isFinite(
        Number(settings.pivotY)
      )
        ? Number(settings.pivotY)
        : null,
    wholeFill:
      typeof settings.wholeFill === "string" && settings.wholeFill
        ? settings.wholeFill
        : null,
    wholeStroke:
      typeof settings.wholeStroke === "string" && settings.wholeStroke
        ? settings.wholeStroke
        : null,
    wholeStrokeWidth:
      Math.max(
        0,
        Number(settings.wholeStrokeWidth) || 0
      ),
    frontFill:
      settings.frontFill || null,
    frontStroke:
      settings.frontStroke || null,
    frontStrokeWidth:
      Math.max(
        0,
        Number(settings.frontStrokeWidth) || 0
      ),
    backFill:
      settings.backFill || null,
    backStroke:
      settings.backStroke || null,
    backStrokeWidth:
      Math.max(
        0,
        Number(settings.backStrokeWidth) || 0
      ),
    leftFill:
      settings.leftFill ||
      settings.sideFill ||
      null,
    leftStroke:
      settings.leftStroke ||
      settings.sideStroke ||
      null,
    leftStrokeWidth:
      Math.max(
        0,
        Number(
          settings.leftStrokeWidth ??
          settings.sideStrokeWidth
        ) || 0
      ),
    rightFill:
      settings.rightFill ||
      settings.sideFill ||
      null,
    rightStroke:
      settings.rightStroke ||
      settings.sideStroke ||
      null,
    rightStrokeWidth:
      Math.max(
        0,
        Number(
          settings.rightStrokeWidth ??
          settings.sideStrokeWidth
        ) || 0
      ),
    topFill:
      settings.topFill ||
      settings.sideFill ||
      null,
    topStroke:
      settings.topStroke ||
      settings.sideStroke ||
      null,
    topStrokeWidth:
      Math.max(
        0,
        Number(
          settings.topStrokeWidth ??
          settings.sideStrokeWidth
        ) || 0
      ),
    bottomFill:
      settings.bottomFill ||
      settings.sideFill ||
      null,
    bottomStroke:
      settings.bottomStroke ||
      settings.sideStroke ||
      null,
    bottomStrokeWidth:
      Math.max(
        0,
        Number(
          settings.bottomStrokeWidth ??
          settings.sideStrokeWidth
        ) || 0
      ),
    faceStyles:
      settings.faceStyles &&
      typeof settings.faceStyles === "object"
        ? { ...settings.faceStyles }
        : {},
    /*
     * Per-polygon face overrides. Keys are stable geometry IDs such as
     * `front`, `back`, or `side:0:3` (contour 0, edge 3). The older six
     * directional fields above remain as defaults for existing projects.
     */
    /*
     * Retained only for backwards-compatible loading of older projects.
     * Rendering is orthographic regardless of this legacy value.
     */
    perspective: 0,
    mode:
      settings.mode === "revolve" ? "revolve" : "extrude",
    revolveAngle:
      Math.max(1, Math.min(360, Number(settings.revolveAngle) || 360)),
    revolveSegments:
      Math.max(6, Math.min(128, Math.round(Number(settings.revolveSegments) || 32))),
    revolveAxis:
      settings.revolveAxis === "right" ? "right" : "left",
    shadeMode:
      settings.shadeMode === "smooth" ? "smooth" : "flat",
    committed:
      settings.committed === true
  };
}

function threeDSourceElement(repeat) {
  const data =
    threeDSourceData(repeat);

  return data
    ? createElementFromProject(
        data,
        false
      )
    : null;
}

function threeDRotatePoint(point, settings) {
  const rx =
    settings.rotateX *
    Math.PI / 180;
  const ry =
    settings.rotateY *
    Math.PI / 180;
  const rz =
    settings.rotateZ *
    Math.PI / 180;

  let x = point.x;
  let y = point.y;
  let z = point.z;

  const y1 =
    y * Math.cos(rx) -
    z * Math.sin(rx);
  const z1 =
    y * Math.sin(rx) +
    z * Math.cos(rx);
  y = y1;
  z = z1;

  const x2 =
    x * Math.cos(ry) +
    z * Math.sin(ry);
  const z2 =
    -x * Math.sin(ry) +
    z * Math.cos(ry);
  x = x2;
  z = z2;

  const x3 =
    x * Math.cos(rz) -
    y * Math.sin(rz);
  const y3 =
    x * Math.sin(rz) +
    y * Math.cos(rz);

  return {
    x:
      x3 + settings.moveX,
    y:
      y3 + settings.moveY,
    z:
      z + settings.moveZ
  };
}

function threeDProjectPoint(point) {
  /*
   * Orthographic projection: no near/far scaling.
   * This keeps the object visually stable while orbiting and feels
   * much closer to a vector-editor 3D preview than a camera lens.
   */
  return {
    x: point.x,
    y: point.y
  };
}

function threeDBezierSegmentSampleCount(
  a,
  b
) {
  const chord =
    Math.hypot(
      b.x - a.x,
      b.y - a.y
    );

  const controlLength =
    Math.hypot(
      a.outX - a.x,
      a.outY - a.y
    ) +
    Math.hypot(
      b.inX - a.outX,
      b.inY - a.outY
    ) +
    Math.hypot(
      b.x - b.inX,
      b.y - b.inY
    );

  const curvature =
    Math.max(
      0,
      controlLength -
      chord
    );

  /*
   * Straight/corner segments stay inexpensive, while longer or more
   * strongly curved cubic segments receive enough samples to keep the
   * extruded silhouette visually smooth.
   */
  return Math.max(
    4,
    Math.min(
      32,
      Math.ceil(
        chord / 18 +
        curvature / 10
      )
    )
  );
}

function threeDSampleBezierAnchors(
  anchors,
  closed
) {
  if (
    !Array.isArray(anchors) ||
    anchors.length < 2
  ) {
    return [];
  }

  const usable =
    anchors.map(
      anchor => ({
        x:
          Number(anchor.x),
        y:
          Number(anchor.y),
        inX:
          Number.isFinite(
            Number(anchor.inX)
          )
            ? Number(anchor.inX)
            : Number(anchor.x),
        inY:
          Number.isFinite(
            Number(anchor.inY)
          )
            ? Number(anchor.inY)
            : Number(anchor.y),
        outX:
          Number.isFinite(
            Number(anchor.outX)
          )
            ? Number(anchor.outX)
            : Number(anchor.x),
        outY:
          Number.isFinite(
            Number(anchor.outY)
          )
            ? Number(anchor.outY)
            : Number(anchor.y)
      })
    )
    .filter(
      anchor =>
        Number.isFinite(anchor.x) &&
        Number.isFinite(anchor.y)
    );

  if (usable.length < 2) {
    return [];
  }

  /*
   * Serialized editor paths parsed back from d may contain a duplicate
   * final anchor at the first anchor position. Keep it because its in
   * handle carries the true closing cubic control, but don't add a second
   * artificial closing segment afterward.
   */
  const first =
    usable[0];

  const last =
    usable[
      usable.length - 1
    ];

  const explicitClosedDuplicate =
    Math.hypot(
      last.x - first.x,
      last.y - first.y
    ) < 1e-6;

  const points = [
    {
      x: first.x,
      y: first.y
    }
  ];

  const appendSegment =
    (a, b) => {
      const count =
        threeDBezierSegmentSampleCount(
          a,
          b
        );

      for (
        let step = 1;
        step <= count;
        step += 1
      ) {
        const point =
          cubicPointAt(
            a,
            b,
            step / count
          );

        points.push(
          point
        );
      }
    };

  for (
    let i = 0;
    i <
      usable.length - 1;
    i += 1
  ) {
    appendSegment(
      usable[i],
      usable[i + 1]
    );
  }

  if (
    closed &&
    !explicitClosedDuplicate
  ) {
    appendSegment(
      usable[
        usable.length - 1
      ],
      usable[0]
    );
  }

  /*
   * threeDFacePath closes the polygon itself. Remove an explicit repeated
   * final point so the wall generator doesn't create a zero-length face.
   */
  if (
    points.length > 2 &&
    Math.hypot(
      points[
        points.length - 1
      ].x -
        points[0].x,
      points[
        points.length - 1
      ].y -
        points[0].y
    ) < 1e-6
  ) {
    points.pop();
  }

  return points;
}

function threeDNativeShapeLocalPoints(
  source
) {
  if (!source) return [];

  const tag =
    source.tagName?.toLowerCase();

  if (tag === "path") {
    normalizePathForEditing(
      source
    );

    if (
      Array.isArray(source._anchors) &&
      source._anchors.length >= 2
    ) {
      return threeDSampleBezierAnchors(
        source._anchors,
        source.dataset.closed ===
          "true" ||
        source
          .getAttribute("d")
          ?.trim()
          .toLowerCase()
          .endsWith("z")
      );
    }

    return [];
  }

  if (
    tag === "rect"
  ) {
    const x =
      Number(
        source.getAttribute("x")
      ) || 0;

    const y =
      Number(
        source.getAttribute("y")
      ) || 0;

    const width =
      Number(
        source.getAttribute("width")
      ) || 0;

    const height =
      Number(
        source.getAttribute("height")
      ) || 0;

    return [
      { x, y },
      {
        x: x + width,
        y
      },
      {
        x: x + width,
        y: y + height
      },
      {
        x,
        y: y + height
      }
    ];
  }

  if (
    tag === "circle" ||
    tag === "ellipse"
  ) {
    const cx =
      Number(
        source.getAttribute("cx")
      ) || 0;

    const cy =
      Number(
        source.getAttribute("cy")
      ) || 0;

    const rx =
      tag === "circle"
        ? (
            Number(
              source.getAttribute("r")
            ) || 0
          )
        : (
            Number(
              source.getAttribute("rx")
            ) || 0
          );

    const ry =
      tag === "circle"
        ? rx
        : (
            Number(
              source.getAttribute("ry")
            ) || 0
          );

    const segments =
      40;

    return Array.from(
      {
        length:
          segments
      },
      (_, index) => {
        const angle =
          index /
          segments *
          Math.PI *
          2;

        return {
          x:
            cx +
            Math.cos(angle) *
            rx,
          y:
            cy +
            Math.sin(angle) *
            ry
        };
      }
    );
  }

  if (
    tag === "polygon"
  ) {
    const raw =
      source.getAttribute(
        "points"
      ) || "";

    return raw
      .trim()
      .split(/\s+/)
      .map(
        pair =>
          pair
            .split(",")
            .map(Number)
      )
      .filter(
        pair =>
          pair.length >= 2 &&
          pair.every(
            Number.isFinite
          )
      )
      .map(
        ([x, y]) => ({
          x,
          y
        })
      );
  }

  /*
   * Fallback for other native closed primitives in this editor:
   * use their editable bounds without requiring conversion to path.
   */
  const box =
    editableLocalBounds(
      source
    );

  if (
    !Number.isFinite(box.x) ||
    !Number.isFinite(box.y) ||
    box.width <= 0 ||
    box.height <= 0
  ) {
    return [];
  }

  return [
    {
      x: box.x,
      y: box.y
    },
    {
      x:
        box.x +
        box.width,
      y:
        box.y
    },
    {
      x:
        box.x +
        box.width,
      y:
        box.y +
        box.height
    },
    {
      x:
        box.x,
      y:
        box.y +
        box.height
    }
  ];
}

function threeDSimplifyExtrudeContour(points) {
  if (!Array.isArray(points) || points.length < 4) {
    return Array.isArray(points) ? points.slice() : [];
  }

  /*
   * The 3D path sampler intentionally emits several points for every cubic
   * segment so curves stay smooth. Boolean / Shape Builder output frequently
   * contains perfectly straight cubic segments, though, and those samples are
   * exactly (or almost exactly) collinear. If every sample becomes a wall quad,
   * one logical flat side is displayed as a row of unnecessary 3D faces.
   *
   * Remove only points that lie extremely close to the straight line between
   * their neighbours and that continue in the same direction. Genuine corners
   * and curved samples therefore remain untouched.
   */
  let simplified = points
    .filter(
      point =>
        point &&
        Number.isFinite(Number(point.x)) &&
        Number.isFinite(Number(point.y))
    )
    .map(point => ({
      x: Number(point.x),
      y: Number(point.y)
    }));

  if (simplified.length < 4) return simplified;

  const COLLINEAR_TOLERANCE = 0.075;
  let changed = true;
  let passes = 0;

  while (
    changed &&
    simplified.length > 3 &&
    passes < 8
  ) {
    changed = false;
    passes += 1;

    const keep = new Array(simplified.length).fill(true);

    for (let i = 0; i < simplified.length; i += 1) {
      const prev = simplified[(i - 1 + simplified.length) % simplified.length];
      const curr = simplified[i];
      const next = simplified[(i + 1) % simplified.length];

      const ax = curr.x - prev.x;
      const ay = curr.y - prev.y;
      const bx = next.x - curr.x;
      const by = next.y - curr.y;

      const aLength = Math.hypot(ax, ay);
      const bLength = Math.hypot(bx, by);

      if (aLength < 1e-7 || bLength < 1e-7) {
        keep[i] = false;
        changed = true;
        continue;
      }

      /* Do not collapse a reversal / sharp corner even if numerically close. */
      const directionDot = (ax * bx + ay * by) / (aLength * bLength);
      if (directionDot <= 0) continue;

      const chordX = next.x - prev.x;
      const chordY = next.y - prev.y;
      const chordLength = Math.hypot(chordX, chordY);
      if (chordLength < 1e-7) continue;

      const distanceToChord = Math.abs(
        chordY * curr.x -
        chordX * curr.y +
        next.x * prev.y -
        next.y * prev.x
      ) / chordLength;

      if (distanceToChord <= COLLINEAR_TOLERANCE) {
        keep[i] = false;
        changed = true;
      }
    }

    if (changed) {
      const nextPoints = simplified.filter((_, index) => keep[index]);
      if (nextPoints.length >= 3) simplified = nextPoints;
      else break;
    }
  }

  return simplified;
}

function threeDPaperItemContours(item) {
  if (!item) return [];

  if (
    item.segments &&
    item.segments.length >= 2
  ) {
    const anchors =
      paperPathToAnchors(item);

    const points =
      threeDSampleBezierAnchors(
        anchors,
        item.closed !== false
      );

    return points.length >= 3
      ? [points]
      : [];
  }

  if (item.children?.length) {
    return item.children.flatMap(
      child =>
        threeDPaperItemContours(
          child
        )
    );
  }

  return [];
}

function threeDSourceCanvasContours(
  source
) {
  if (!source) return [];

  /*
   * Shape Builder / Pathfinder merged results may be compound SVG geometry
   * containing multiple closed subpaths (including holes). Import that exact
   * geometry through the same Paper.js bridge used by the boolean tools, then
   * sample every closed contour in page coordinates. This avoids degrading a
   * merged object to its rectangular bounds when it enters the 3D tool.
   */
  if (
    source.dataset.compoundShape ===
      "true"
  ) {
    if (!ensurePaperReady()) {
      return [];
    }

    let item = null;

    try {
      item =
        svgShapeToPaper(source);

      return threeDPaperItemContours(
        item
      )
        .map(threeDSimplifyExtrudeContour)
        .filter(
          contour =>
            contour.length >= 3
        );
    } catch (error) {
      console.error(
        "3D compound-shape import failed",
        error
      );
      return [];
    } finally {
      removePaperItem(item);
    }
  }

  const points =
    threeDNativeShapeLocalPoints(
      source
    ).map(
      point =>
        canvasPointFromLocal(
          source,
          point.x,
          point.y
        )
    );

  const cleanedPoints =
    threeDSimplifyExtrudeContour(
      points
    );

  return cleanedPoints.length >= 3
    ? [cleanedPoints]
    : [];
}

function threeDSourceCanvasPoints(
  source
) {
  return (
    threeDSourceCanvasContours(
      source
    )[0] || []
  );
}

function threeDCompoundFacePath(
  contours
) {
  return (contours || [])
    .filter(
      contour =>
        contour.length >= 3
    )
    .map(threeDFacePath)
    .join(" ");
}

function threeDFacePath(points) {
  if (!points.length) return "";

  return (
    `M ${points[0].x} ${points[0].y} ` +
    points
      .slice(1)
      .map(
        p => `L ${p.x} ${p.y}`
      )
      .join(" ") +
    " Z"
  );
}


function threeDRevolveSourceCanvasProfile(source) {
  if (!source) return [];

  const tag = source.tagName?.toLowerCase();
  let localPoints;

  if (tag === "line") {
    localPoints = [
      { x: Number(source.getAttribute("x1")) || 0, y: Number(source.getAttribute("y1")) || 0 },
      { x: Number(source.getAttribute("x2")) || 0, y: Number(source.getAttribute("y2")) || 0 }
    ];
  } else if (tag === "polyline") {
    localPoints = (source.getAttribute("points") || "")
      .trim()
      .split(/\s+/)
      .map(pair => pair.split(",").map(Number))
      .filter(pair => pair.length >= 2 && pair.every(Number.isFinite))
      .map(([x, y]) => ({ x, y }));
  } else {
    localPoints = threeDNativeShapeLocalPoints(source);
  }
  if (!localPoints.length) return [];

  return localPoints
    .map(point => canvasPointFromLocal(source, point.x, point.y))
    .filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));
}

function threeDVectorCross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}

function threeDVectorNormalize(v) {
  const length = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / length, y: v.y / length, z: v.z / length };
}

function threeDRevolveShadedStyle(repeat, faceKey, rotatedNormal) {
  const settings = normalizeThreeDSettings(threeDSettings(repeat) || {});
  const source = threeDSourceElement(repeat);
  const baseFill = settings.wholeFill || source?.getAttribute("fill") || fill?.value || "#7c3aed";
  const baseStroke = settings.wholeStroke ?? source?.getAttribute("stroke") ?? stroke?.value ?? "#000000";
  const baseStrokeWidth = settings.wholeStroke !== null
    ? settings.wholeStrokeWidth
    : Math.max(0, Number(source?.getAttribute("stroke-width")) || Number(strokeWidth?.value) || 1);
  const override = settings.faceStyles?.[faceKey] || {};

  const light = threeDVectorNormalize({ x: -0.45, y: -0.7, z: -0.8 });
  const normal = threeDVectorNormalize(rotatedNormal);
  const diffuse = Math.max(0, normal.x * light.x + normal.y * light.y + normal.z * light.z);
  const facingLift = Math.max(0, -normal.z) * 0.12;
  const factor = Math.max(0.34, Math.min(1.18, 0.48 + diffuse * 0.62 + facingLift));

  return {
    baseFill: override.fill || baseFill,
    fill: threeDShadeColor(override.fill || baseFill, factor),
    stroke: override.stroke ?? baseStroke,
    strokeWidth: override.strokeWidth ?? baseStrokeWidth
  };
}

function threeDRevolveLightFactor(theta, radiusSign, rotateModel) {
  const modelNormal = {
    x: Math.cos(theta) * radiusSign,
    y: 0,
    z: Math.sin(theta) * radiusSign
  };
  const rotatedNormal = threeDVectorNormalize(rotateModel(modelNormal));
  const light = threeDVectorNormalize({ x: -0.45, y: -0.7, z: -0.8 });
  const diffuse = Math.max(0, rotatedNormal.x * light.x + rotatedNormal.y * light.y + rotatedNormal.z * light.z);
  const facingLift = Math.max(0, -rotatedNormal.z) * 0.12;
  return Math.max(0.34, Math.min(1.18, 0.48 + diffuse * 0.62 + facingLift));
}

function threeDLerpPoint3(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t
  };
}

function threeDRevolveSmoothLight(normal) {
  const light = threeDVectorNormalize({ x: -0.45, y: -0.7, z: -0.8 });
  const n = threeDVectorNormalize(normal);
  const diffuse = Math.max(0, n.x * light.x + n.y * light.y + n.z * light.z);
  const facingLift = Math.max(0, -n.z) * 0.12;
  return Math.max(0.34, Math.min(1.18, 0.48 + diffuse * 0.62 + facingLift));
}

function threeDRevolveSmoothRaster(sideFaces, baseFill) {
  if (!sideFaces.length) return null;
  const rgb = threeDHexToRgb(baseFill);
  if (!rgb) return null;
  const allPoints = sideFaces.flatMap(face => face.points || []);
  if (!allPoints.length) return null;

  const padding = 2;
  let minX = Math.min(...allPoints.map(point => point.x)) - padding;
  let minY = Math.min(...allPoints.map(point => point.y)) - padding;
  let maxX = Math.max(...allPoints.map(point => point.x)) + padding;
  let maxY = Math.max(...allPoints.map(point => point.y)) + padding;
  const cssWidth = Math.max(1, maxX - minX);
  const cssHeight = Math.max(1, maxY - minY);
  const targetScale = Math.max(1.5, Math.min(3, (window.devicePixelRatio || 1) * Math.max(1, Number(zoom) || 1)));
  const maxDimension = 1800;
  const scale = Math.max(0.75, Math.min(targetScale, maxDimension / Math.max(cssWidth, cssHeight)));
  const width = Math.max(1, Math.ceil(cssWidth * scale));
  const height = Math.max(1, Math.ceil(cssHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return null;
  const imageData = ctx.createImageData(width, height);
  const pixels = imageData.data;
  const depth = new Float32Array(width * height);
  depth.fill(Infinity);
  const toRaster = point => ({ x: (point.x - minX) * scale, y: (point.y - minY) * scale });

  const rasterTriangle = (points, normals, depths) => {
    const p0 = toRaster(points[0]);
    const p1 = toRaster(points[1]);
    const p2 = toRaster(points[2]);
    const area = (p1.x - p0.x) * (p2.y - p0.y) - (p1.y - p0.y) * (p2.x - p0.x);
    if (Math.abs(area) < 1e-8) return;
    const invArea = 1 / area;
    const x0 = Math.max(0, Math.floor(Math.min(p0.x, p1.x, p2.x) - 1));
    const x1 = Math.min(width - 1, Math.ceil(Math.max(p0.x, p1.x, p2.x) + 1));
    const y0 = Math.max(0, Math.floor(Math.min(p0.y, p1.y, p2.y) - 1));
    const y1 = Math.min(height - 1, Math.ceil(Math.max(p0.y, p1.y, p2.y) + 1));

    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        const px = x + 0.5;
        const py = y + 0.5;
        const w0 = ((p1.x - px) * (p2.y - py) - (p1.y - py) * (p2.x - px)) * invArea;
        const w1 = ((p2.x - px) * (p0.y - py) - (p2.y - py) * (p0.x - px)) * invArea;
        const w2 = 1 - w0 - w1;
        if (w0 < -0.001 || w1 < -0.001 || w2 < -0.001) continue;
        const z = w0 * depths[0] + w1 * depths[1] + w2 * depths[2];
        const index = y * width + x;
        if (z >= depth[index]) continue;
        depth[index] = z;
        const normal = threeDVectorNormalize({
          x: normals[0].x * w0 + normals[1].x * w1 + normals[2].x * w2,
          y: normals[0].y * w0 + normals[1].y * w1 + normals[2].y * w2,
          z: normals[0].z * w0 + normals[1].z * w1 + normals[2].z * w2
        });
        const factor = threeDRevolveSmoothLight(normal);
        const offset = index * 4;
        pixels[offset] = Math.max(0, Math.min(255, Math.round(rgb.r * factor)));
        pixels[offset + 1] = Math.max(0, Math.min(255, Math.round(rgb.g * factor)));
        pixels[offset + 2] = Math.max(0, Math.min(255, Math.round(rgb.b * factor)));
        pixels[offset + 3] = 255;
      }
    }
  };

  sideFaces.forEach(face => {
    if (!face.points?.length || face.points.length !== 4 || !face.vertexNormals?.length) return;
    const faceDepths = face.modelPoints.map(point => threeDRotatePoint(point, face.rotationOnlySettings).z);
    rasterTriangle(
      [face.points[0], face.points[1], face.points[2]],
      [face.vertexNormals[0], face.vertexNormals[1], face.vertexNormals[2]],
      [faceDepths[0], faceDepths[1], faceDepths[2]]
    );
    rasterTriangle(
      [face.points[0], face.points[2], face.points[3]],
      [face.vertexNormals[0], face.vertexNormals[2], face.vertexNormals[3]],
      [faceDepths[0], faceDepths[2], faceDepths[3]]
    );
  });

  ctx.putImageData(imageData, 0, 0);
  return {
    href: canvas.toDataURL("image/png"),
    x: minX,
    y: minY,
    width: cssWidth,
    height: cssHeight
  };
}

function renderThreeDRevolve(repeat) {
  const settings = normalizeThreeDSettings(threeDSettings(repeat) || {});
  const source = threeDSourceElement(repeat);
  if (!source) return;

  const profile = threeDRevolveSourceCanvasProfile(source);
  if (profile.length < 2) return;

  const xs = profile.map(point => point.x);
  const ys = profile.map(point => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const axisX = settings.revolveAxis === "right" ? maxX : minX;
  const pivotY = (minY + maxY) / 2;
  const angle = settings.revolveAngle * Math.PI / 180;
  const closedSweep = Math.abs(settings.revolveAngle - 360) < 1e-6;
  const segmentCount = settings.revolveSegments;
  const ringCount = closedSweep ? segmentCount : segmentCount + 1;

  const pivot = {
    x: Number.isFinite(settings.pivotX) ? settings.pivotX : axisX,
    y: Number.isFinite(settings.pivotY) ? settings.pivotY : pivotY
  };

  /* Revolve around the source edge itself; pivot is kept stable for orbiting. */
  settings.pivotX = axisX;
  settings.pivotY = pivotY;

  const rotationOnly = { ...settings, moveX: 0, moveY: 0, moveZ: 0 };
  const rotateModel = point => threeDRotatePoint(point, rotationOnly);
  const projectModel = point => {
    const rotated = rotateModel(point);
    const projected = threeDProjectPoint(rotated);
    return {
      x: axisX + settings.moveX + projected.x,
      y: pivotY + settings.moveY + projected.y
    };
  };

  const rings = Array.from({ length: ringCount }, (_, ringIndex) => {
    const theta = closedSweep
      ? ringIndex / segmentCount * Math.PI * 2
      : ringIndex / segmentCount * angle;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    return profile.map(point => {
      const radius = point.x - axisX;
      return {
        x: radius * cos,
        y: point.y - pivotY,
        z: radius * sin,
        theta,
        radius
      };
    });
  });

  const faces = [];
  const sourceTag = source.tagName?.toLowerCase();
  const pathExplicitlyClosed = sourceTag === "path" && (
    source.dataset?.closed === "true" ||
    source.getAttribute("d")?.trim().toLowerCase().endsWith("z")
  );
  const profileClosed = ["rect", "circle", "ellipse", "polygon"].includes(sourceTag) || pathExplicitlyClosed;
  const profileSegmentCount = profileClosed ? profile.length : profile.length - 1;
  const profileSignedArea = profileClosed
    ? profile.reduce((sum, point, index) => {
        const next = profile[(index + 1) % profile.length];
        return sum + point.x * next.y - next.x * point.y;
      }, 0) / 2
    : 0;
  const radiusTolerance = 1e-4;
  const capSegments = new Set();

  /*
   * Closed 360° revolves should become solids when the source profile contains
   * a radial cap edge from the revolve axis to the silhouette (e.g. rectangle
   * -> cylinder, right triangle -> cone). Those edges generate circular caps,
   * not lateral wall quads.
   */
  if (closedSweep && profileClosed && profile.length >= 3) {
    for (let profileIndex = 0; profileIndex < profileSegmentCount; profileIndex += 1) {
      const nextProfileIndex = (profileIndex + 1) % profile.length;
      const p0 = profile[profileIndex];
      const p1 = profile[nextProfileIndex];
      const r0 = p0.x - axisX;
      const r1 = p1.x - axisX;
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const horizontal = Math.abs(dy) < radiusTolerance;
      const touchesAxis = Math.abs(r0) < radiusTolerance || Math.abs(r1) < radiusTolerance;
      const reachesOutward = Math.abs(r0) > radiusTolerance || Math.abs(r1) > radiusTolerance;
      if (!horizontal || !touchesAxis || !reachesOutward) continue;

      capSegments.add(profileIndex);
      const outerIndex = Math.abs(r0) >= Math.abs(r1) ? profileIndex : nextProfileIndex;
      const outerLoop = Array.from({ length: segmentCount }, (_, ringIndex) => rings[ringIndex][outerIndex]);
      const capY = (p0.y + p1.y) / 2;
      const profileCenterY = (minY + maxY) / 2;
      /*
       * Cap normals must point out of the solid. In model coordinates the
       * visually upper cap points toward -Y and the lower cap toward +Y.
       * Both were previously inverted, which made their facing/shading logic
       * backwards even though the cap geometry itself was correct.
       */
      const isTopCap = capY <= profileCenterY;
      const normalY = isTopCap ? -1 : 1;
      const modelNormal = { x: 0, y: normalY, z: 0 };
      const rotatedNormal = rotateModel(modelNormal);
      const rotatedLoop = outerLoop.map(point => rotateModel(point));
      const averageDepth = rotatedLoop.reduce((sum, point) => sum + point.z, 0) / Math.max(1, rotatedLoop.length);
      const nearestDepth = Math.min(...rotatedLoop.map(point => point.z));
      const cameraFacing = rotatedNormal.z < -1e-5;
      faces.push({
        key: `revolve:cap:${profileIndex}`,
        type: isTopCap ? "top" : "bottom",
        points: outerLoop.map(projectModel),
        modelPoints: outerLoop,
        /*
         * A tilted circular cap spans a wide depth range. Average-depth
         * painter sorting can put the whole disk behind side quads even when
         * the cap is camera-facing. Use its nearest depth for the visible cap
         * so it is painted as the foreground closure surface.
         */
        depthKey: cameraFacing ? nearestDepth - 1e-4 : averageDepth,
        normal: rotatedNormal,
        cameraFacing,
        capFace: true,
        faceIndex: faces.length
      });
    }
  }

  for (let ringIndex = 0; ringIndex < segmentCount; ringIndex += 1) {
    const nextRingIndex = closedSweep ? (ringIndex + 1) % ringCount : ringIndex + 1;
    if (nextRingIndex >= rings.length) break;

    for (let profileIndex = 0; profileIndex < profileSegmentCount; profileIndex += 1) {
      if (capSegments.has(profileIndex)) continue;
      const nextProfileIndex = (profileIndex + 1) % profile.length;
      const a = rings[ringIndex][profileIndex];
      const b = rings[ringIndex][nextProfileIndex];
      const c = rings[nextRingIndex][nextProfileIndex];
      const d = rings[nextRingIndex][profileIndex];

      const edge1 = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
      const edge2 = { x: d.x - a.x, y: d.y - a.y, z: d.z - a.z };
      let normal = threeDVectorNormalize(threeDVectorCross(edge1, edge2));

      const adjustedEndTheta = closedSweep && d.theta < a.theta ? d.theta + Math.PI * 2 : d.theta;
      const midTheta = (a.theta + adjustedEndTheta) / 2;
      const radiusSign = Math.sign((a.radius + b.radius + c.radius + d.radius) / 4) || 1;
      const radial = { x: Math.cos(midTheta) * radiusSign, y: 0, z: Math.sin(midTheta) * radiusSign };
      if (normal.x * radial.x + normal.y * radial.y + normal.z * radial.z < 0) {
        normal = { x: -normal.x, y: -normal.y, z: -normal.z };
      }

      const rotatedNormal = rotateModel(normal);
      const modelPoints = [a, b, c, d];
      const depthKey = modelPoints.reduce((sum, point) => sum + rotateModel(point).z, 0) / 4;
      const key = `revolve:${ringIndex}:${profileIndex}`;

      const profileDx = profile[nextProfileIndex].x - profile[profileIndex].x;
      const profileDy = profile[nextProfileIndex].y - profile[profileIndex].y;
      const segmentNormalAtTheta = theta => {
        let candidate = threeDVectorNormalize({
          x: profileDy * Math.cos(theta),
          y: -profileDx,
          z: profileDy * Math.sin(theta)
        });
        const radialAtTheta = {
          x: Math.cos(theta) * radiusSign,
          y: 0,
          z: Math.sin(theta) * radiusSign
        };
        if (candidate.x * radialAtTheta.x + candidate.z * radialAtTheta.z < 0) {
          candidate = { x: -candidate.x, y: -candidate.y, z: -candidate.z };
        }
        return threeDVectorNormalize(rotateModel(candidate));
      };
      const vertexNormals = [
        segmentNormalAtTheta(a.theta),
        segmentNormalAtTheta(b.theta),
        segmentNormalAtTheta(adjustedEndTheta),
        segmentNormalAtTheta(adjustedEndTheta)
      ];

      faces.push({
        key,
        type: "side",
        points: modelPoints.map(projectModel),
        modelPoints,
        startTheta: a.theta,
        endTheta: adjustedEndTheta,
        radiusSign,
        depthKey,
        normal: rotatedNormal,
        vertexNormals,
        rotationOnlySettings: rotationOnly,
        cameraFacing: rotatedNormal.z < -1e-5,
        faceIndex: faces.length
      });
    }
  }

  /* Partial revolves get end caps when the source profile itself is closed. */
  if (!closedSweep && profileClosed && profile.length >= 3) {
    [0, rings.length - 1].forEach((ringIndex, capIndex) => {
      const modelPoints = rings[ringIndex];
      const theta = modelPoints[0]?.theta || 0;
      let normal = { x: Math.sin(theta), y: 0, z: -Math.cos(theta) };
      if (capIndex === 1) normal = { x: -normal.x, y: 0, z: -normal.z };
      const rotatedNormal = rotateModel(normal);
      faces.push({
        key: capIndex === 0 ? "revolve:start" : "revolve:end",
        type: capIndex === 0 ? "front" : "back",
        points: modelPoints.map(projectModel),
        modelPoints,
        depthKey: modelPoints.reduce((sum, point) => sum + rotateModel(point).z, 0) / modelPoints.length,
        normal: rotatedNormal,
        cameraFacing: rotatedNormal.z < -1e-5,
        faceIndex: faces.length
      });
    });
  }

  repeat.replaceChildren();
  const visibleFaces = threeDPanelRequested
    ? faces.filter(face => face.cameraFacing)
    : faces.slice();
  visibleFaces.sort((a, b) => {
    if (a.capFace && a.cameraFacing && !(b.capFace && b.cameraFacing)) return 1;
    if (b.capFace && b.cameraFacing && !(a.capFace && a.cameraFacing)) return -1;
    return b.depthKey - a.depthKey;
  });
  const depths = visibleFaces.map(face => face.depthKey);
  const farDepth = depths.length ? Math.max(...depths) : 0;
  const nearDepth = depths.length ? Math.min(...depths) : 0;
  const depthSpan = Math.max(0.0001, farDepth - nearDepth);

  let smoothRasterActive = false;
  if (settings.shadeMode === "smooth") {
    const smoothSides = visibleFaces.filter(
      face => face.type === "side" && face.vertexNormals?.length === 4
    );
    const smoothBaseFill = settings.wholeFill || source?.getAttribute("fill") || fill?.value || "#7c3aed";
    const raster = threeDRevolveSmoothRaster(smoothSides, smoothBaseFill);
    if (raster?.href && raster.width > 0 && raster.height > 0) {
      const image = svgEl("image", {
        href: raster.href,
        x: raster.x,
        y: raster.y,
        width: raster.width,
        height: raster.height,
        preserveAspectRatio: "none",
        class: "three-d-smooth-raster",
        "pointer-events": "none"
      });
      image.dataset.groupChild = "true";
      repeat.appendChild(image);
      smoothRasterActive = true;
    }
  }

  visibleFaces.forEach(face => {
    const style = threeDRevolveShadedStyle(repeat, face.key, face.normal);
    const depthRatio = (face.depthKey - nearDepth) / depthSpan;
    const depthClass = !threeDPanelRequested ? "" : depthRatio >= 0.68 ? " three-d-face-rear" : depthRatio <= 0.32 ? " three-d-face-near" : " three-d-face-mid";
    const isSelectedFace = threeDPanelRequested && threeDSelectedFace === face.key;

    if (settings.shadeMode === "smooth" && smoothRasterActive && face.type === "side") {
      const hit = svgEl("path", {
        d: threeDFacePath(face.points),
        fill: "rgba(0,0,0,0.001)",
        stroke: "none",
        class: `three-d-face three-d-face-revolve three-d-face-smooth-hit${depthClass}`,
        "data-three-d-face": face.type,
        "data-three-d-face-key": face.key,
        "data-three-d-face-index": String(face.faceIndex),
        "data-three-d-depth": String(face.depthKey),
        "data-three-d-depth-ratio": String(depthRatio),
        "data-three-d-orbit-surface": "true",
        "pointer-events": threeDPanelRequested ? "all" : "none"
      });
      hit.dataset.groupChild = "true";
      if (isSelectedFace) hit.classList.add("three-d-face-selected");
      repeat.appendChild(hit);
      return;
    }

    const node = svgEl("path", {
      d: threeDFacePath(face.points),
      fill: style.fill,
      stroke: style.stroke,
      "stroke-width": style.strokeWidth,
      class: `three-d-face three-d-face-revolve${depthClass}`,
      "data-three-d-face": face.type,
      "data-three-d-face-key": face.key,
      "data-three-d-face-index": String(face.faceIndex),
      "data-three-d-depth": String(face.depthKey),
      "data-three-d-depth-ratio": String(depthRatio),
      "data-three-d-orbit-surface": "true",
      "pointer-events": threeDPanelRequested ? "all" : "visiblePainted"
    });
    node.dataset.groupChild = "true";
    if (isSelectedFace) node.classList.add("three-d-face-selected");
    repeat.appendChild(node);
  });

  repeat.dataset.threeDSettings = JSON.stringify(settings);
  applyObjectTransform(repeat);
}

function createThreeDRevolveFromSelected() {
  const items = topLevelSelectedItems();
  if (items.length !== 1) {
    toolStatus.textContent = "Select one vector profile to revolve";
    return null;
  }

  const source = items[0];
  if (isRasterImageElement(source) || isThreeDExtrude(source)) {
    toolStatus.textContent = "3D Revolve supports one vector profile";
    return null;
  }

  const profile = threeDRevolveSourceCanvasProfile(source);
  if (profile.length < 2) {
    toolStatus.textContent = "This object cannot be used as a revolve profile";
    return null;
  }

  const xs = profile.map(point => point.x);
  const ys = profile.map(point => point.y);
  const axis = threeDRevolveAxis?.value === "right" ? "right" : "left";
  const axisX = axis === "right" ? Math.max(...xs) : Math.min(...xs);
  const pivotY = (Math.min(...ys) + Math.max(...ys)) / 2;

  const repeat = document.createElementNS(SVG_NS, "g");
  objectCounter += 1;
  repeat.dataset.object = "true";
  repeat.dataset.group = "true";
  repeat.dataset.threeDExtrude = "true";
  repeat.dataset.threeDMode = "revolve";
  repeat.dataset.name = `3D Revolve ${objectCounter}`;
  repeat.dataset.tx = "0";
  repeat.dataset.ty = "0";
  repeat.dataset.rotation = "0";
  repeat.dataset.scaleX = "1";
  repeat.dataset.scaleY = "1";
  repeat.dataset.hidden = "false";
  repeat.dataset.locked = "false";
  repeat.dataset.threeDSource = JSON.stringify(serializeElementForProject(source));
  repeat.dataset.threeDSettings = JSON.stringify(normalizeThreeDSettings({
    mode: "revolve",
    revolveAngle: threeDRevolveAngle?.value || 360,
    revolveSegments: threeDRevolveSegments?.value || 32,
    revolveAxis: axis,
    rotateX: threeDRotateX.value,
    rotateY: threeDRotateY.value,
    rotateZ: threeDRotateZ.value,
    moveX: threeDMoveX.value,
    moveY: threeDMoveY.value,
    moveZ: threeDMoveZ.value,
    pivotX: axisX,
    pivotY,
    wholeFill: source.getAttribute("fill") || fill.value || "#7c3aed",
    wholeStroke: source.getAttribute("stroke") || stroke.value || "#000000",
    wholeStrokeWidth: source.getAttribute("stroke-width") || strokeWidth.value || 1,
    shadeMode: threeDShadeMode?.value || "flat",
    frontFill: source.getAttribute("fill") || fill.value || "#7c3aed",
    frontStroke: source.getAttribute("stroke") || stroke.value || "#000000",
    frontStrokeWidth: source.getAttribute("stroke-width") || strokeWidth.value || 1,
    faceStyles: {},
    committed: false
  }));

  art.insertBefore(repeat, source.nextSibling);
  source.remove();
  threeDPanelRequested = true;
  threeDSelectedFace = null;
  renderThreeDExtrude(repeat);
  setSelection([repeat], repeat);
  syncThreeDPanel();
  renderLayers();
  drawSelection();
  recordHistory({ label: "3D Revolve Created", detail: `${Math.round(Number(threeDRevolveAngle?.value) || 360)}° revolve` });
  toolStatus.textContent = "3D Revolve: live shaded preview active";
  return repeat;
}

function renderThreeDExtrude(repeat) {
  if (!isThreeDExtrude(repeat)) return;

  if (isThreeDRevolve(repeat)) {
    renderThreeDRevolve(repeat);
    return;
  }

  const settings =
    normalizeThreeDSettings(
      threeDSettings(repeat) || {}
    );

  const source =
    threeDSourceElement(repeat);

  if (!source) return;

  /*
   * Convert the source geometry into page/canvas coordinates first.
   * This includes the native shape's own translate/rotate/scale and means
   * rectangles, ellipses, polygons, stars and paths all enter the 3D model
   * in the same coordinate system.
   */
  const contours =
    threeDSourceCanvasContours(
      source
    );

  const points =
    contours.flat();

  if (
    !contours.length ||
    points.length < 3
  ) return;

  const sourceBox =
    editableLocalBounds(
      source
    );

  const sourceCenterCanvas =
    canvasPointFromLocal(
      source,
      sourceBox.x +
        sourceBox.width / 2,
      sourceBox.y +
        sourceBox.height / 2
    );

  /*
   * pivotX/pivotY are written once when the live 3D effect is created.
   * They are not recalculated from rotated/projected geometry, so the
   * pivot remains locked to one page position while the solid orbits it.
   */
  const pivot = {
    x:
      settings.pivotX ??
      sourceCenterCanvas.x,
    y:
      settings.pivotY ??
      sourceCenterCanvas.y
  };

  const volumeCenterZ =
    settings.depth / 2;

  const toModel =
    (p, z) => ({
      x:
        p.x -
        pivot.x,
      y:
        p.y -
        pivot.y,
      z:
        z -
        volumeCenterZ
    });

  const project =
    p => {
      /*
       * 3D move is applied after rotation. Orbiting changes orientation,
       * but cannot change the pivot itself.
       */
      const rotationOnlySettings = {
        ...settings,
        moveX: 0,
        moveY: 0,
        moveZ: 0
      };

      const rotated =
        threeDRotatePoint(
          p,
          rotationOnlySettings
        );

      const projected =
        threeDProjectPoint(
          rotated
        );

      return {
        x:
          pivot.x +
          settings.moveX +
          projected.x,
        y:
          pivot.y +
          settings.moveY +
          projected.y
      };
    };

  const frontContours =
    contours.map(
      contour =>
        contour.map(
          p =>
            project(
              toModel(
                p,
                0
              )
            )
        )
    );

  const backContours =
    contours.map(
      contour =>
        contour.map(
          p =>
            project(
              toModel(
                p,
                settings.depth
              )
            )
        )
    );

  repeat.replaceChildren();

  /*
   * Resolve face appearance through the six-face style system.
   * This is intentionally shared with the face picker/readback path,
   * so Front / Back / Left / Right / Top / Bottom all render from
   * exactly the same stored keys that the existing Fill/Stroke UI edits.
   */
  const faceStyle =
    face =>
      threeDFaceStyleForType(
        repeat,
        face.type,
        face.key
      );

  /*
   * Painter's algorithm:
   * calculate the average rotated Z value for every polygonal face,
   * then paint farthest faces first and nearest faces last.
   *
   * Because the preview is orthographic, this is enough to keep rear
   * faces from painting over geometry that is physically in front.
   */
  const rotateForDepth =
    point =>
      threeDRotatePoint(
        point,
        {
          ...settings,
          moveX: 0,
          moveY: 0,
          moveZ: 0
        }
      );

  const averageDepth =
    modelPoints =>
      modelPoints.reduce(
        (sum, point) =>
          sum +
          rotateForDepth(
            point
          ).z,
        0
      ) /
      Math.max(
        1,
        modelPoints.length
      );

  const frontModelContours =
    contours.map(
      contour =>
        contour.map(
          point =>
            toModel(
              point,
              0
            )
        )
    );

  const backModelContours =
    contours.map(
      contour =>
        contour.map(
          point =>
            toModel(
              point,
              settings.depth
            )
        )
    );

  const frontModel =
    frontModelContours.flat();

  const backModel =
    backModelContours.flat();

  const rotateNormal =
    normal =>
      threeDRotatePoint(
        normal,
        {
          rotateX: settings.rotateX,
          rotateY: settings.rotateY,
          rotateZ: settings.rotateZ,
          moveX: 0,
          moveY: 0,
          moveZ: 0
        }
      );

  const faces = [];
  let globalFaceIndex = 0;

  contours.forEach(
    (contour, contourIndex) => {
      const front =
        frontContours[
          contourIndex
        ];

      const back =
        backContours[
          contourIndex
        ];

      const frontModelContour =
        frontModelContours[
          contourIndex
        ];

      const backModelContour =
        backModelContours[
          contourIndex
        ];

      /*
       * Winding is evaluated per contour. Inner rings naturally use the
       * opposite winding, which makes their wall normals point into the hole
       * while exterior walls point out of the solid.
       */
      const sourceSignedArea =
        contour.reduce(
          (sum, point, index) => {
            const next =
              contour[
                (index + 1) %
                contour.length
              ];

            return (
              sum +
              point.x * next.y -
              next.x * point.y
            );
          },
          0
        ) / 2;

      for (
        let i = 0;
        i < contour.length;
        i += 1
      ) {
        const next =
          (i + 1) %
          contour.length;

        const quad = [
          front[i],
          front[next],
          back[next],
          back[i]
        ];

        const quadModel = [
          frontModelContour[i],
          frontModelContour[next],
          backModelContour[next],
          backModelContour[i]
        ];

        const edgeDx =
          contour[next].x -
          contour[i].x;

        const edgeDy =
          contour[next].y -
          contour[i].y;

        let sideType;

        if (
          Math.abs(edgeDx) >=
          Math.abs(edgeDy)
        ) {
          sideType =
            (
              contour[i].y +
              contour[next].y
            ) / 2 <=
            pivot.y
              ? "top"
              : "bottom";
        } else {
          sideType =
            (
              contour[i].x +
              contour[next].x
            ) / 2 <=
            pivot.x
              ? "left"
              : "right";
        }

        const edgeLength =
          Math.max(
            1e-9,
            Math.hypot(
              edgeDx,
              edgeDy
            )
          );

        const sideNormal =
          sourceSignedArea >= 0
            ? {
                x: edgeDy / edgeLength,
                y: -edgeDx / edgeLength,
                z: 0
              }
            : {
                x: -edgeDy / edgeLength,
                y: edgeDx / edgeLength,
                z: 0
              };

        faces.push({
          type: sideType,
          key: `side:${contourIndex}:${i}`,
          points: quad,
          modelPoints: quadModel,
          depthKey:
            averageDepth(
              quadModel
            ),
          cameraFacing:
            rotateNormal(
              sideNormal
            ).z < -1e-5,
          faceIndex:
            globalFaceIndex,
          contourIndex
        });

        globalFaceIndex += 1;
      }
    }
  );

  faces.push({
    type:
      "back",
    key:
      "back",
    contours:
      backContours,
    modelPoints:
      backModel,
    depthKey:
      averageDepth(
        backModel
      ),
    cameraFacing:
      rotateNormal({
        x: 0,
        y: 0,
        z: 1
      }).z < -1e-5,
    faceIndex:
      -2
  });

  faces.push({
    type:
      "front",
    key:
      "front",
    contours:
      frontContours,
    modelPoints:
      frontModel,
    depthKey:
      averageDepth(
        frontModel
      ),
    cameraFacing:
      rotateNormal({
        x: 0,
        y: 0,
        z: -1
      }).z < -1e-5,
    faceIndex:
      -1
  });

  /*
   * In this coordinate convention, larger rotated Z values are farther
   * away from the viewer. Paint them first so smaller/nearer Z faces sit
   * visually on top.
   */
  const visibleFaces =
    threeDPanelRequested
      ? faces.filter(
          face =>
            face.cameraFacing
        )
      : faces;

  const sortedFaces =
    visibleFaces.sort(
      (a, b) =>
        b.depthKey -
        a.depthKey
    );

  const faceDepthValues =
    sortedFaces.map(
      face => face.depthKey
    );

  const farDepth =
    faceDepthValues.length
      ? Math.max(
          ...faceDepthValues
        )
      : 0;

  const nearDepth =
    faceDepthValues.length
      ? Math.min(
          ...faceDepthValues
        )
      : 0;

  const depthSpan =
    Math.max(
      0.0001,
      farDepth - nearDepth
    );

  sortedFaces.forEach(
    face => {
      const style =
        faceStyle(
          face
        );

      /*
       * 3D edit-mode depth cue:
       * nearby faces keep strong, solid outlines while receding faces use
       * quieter/dashed outlines. This is based on projected depth rather
       * than semantic Front/Back names, so the hierarchy remains correct
       * as the object is orbited.
       */
      const depthRatio =
        (face.depthKey - nearDepth) /
        depthSpan;

      const depthClass =
        !threeDPanelRequested
          ? ""
          : depthRatio >= 0.68
            ? " three-d-face-rear"
            : depthRatio <= 0.32
              ? " three-d-face-near"
              : " three-d-face-mid";

      const node =
        svgEl(
          "path",
          {
            d:
              face.contours
                ? threeDCompoundFacePath(
                    face.contours
                  )
                : threeDFacePath(
                    face.points
                  ),
            "fill-rule":
              "evenodd",
            "clip-rule":
              "evenodd",
            fill:
              style.fill,
            stroke:
              style.stroke,
            "stroke-width":
              style.strokeWidth,
            class:
              `three-d-face three-d-face-${face.type}${depthClass}`,
            "data-three-d-face":
              face.type,
            "data-three-d-face-key":
              face.key,
            "data-three-d-face-index":
              String(
                face.faceIndex
              ),
            "data-three-d-depth":
              String(
                face.depthKey
              ),
            "data-three-d-depth-ratio":
              String(
                depthRatio
              ),
            "data-three-d-orbit-surface":
              "true",
            "pointer-events":
              threeDPanelRequested
                ? "all"
                : "visiblePainted"
          }
        );

      node.dataset.groupChild =
        "true";

      const isSelectedFace =
        threeDPanelRequested &&
        threeDSelectedFace ===
          face.key;

      if (isSelectedFace) {
        node.classList.add(
          "three-d-face-selected"
        );
      }

      repeat.appendChild(
        node
      );

      if (isSelectedFace) {
        const selectionTint =
          svgEl(
            "path",
            {
              d:
                face.contours
                  ? threeDCompoundFacePath(
                      face.contours
                    )
                  : threeDFacePath(
                      face.points
                    ),
              "fill-rule":
                "evenodd",
              "clip-rule":
                "evenodd",
              class:
                "three-d-face-selection-tint",
              fill:
                "currentColor",
              stroke:
                "none",
              "pointer-events":
                "none"
            }
          );

        selectionTint.dataset.groupChild =
          "true";

        repeat.appendChild(
          selectionTint
        );
      }
    }
  );

  repeat.dataset.threeDSettings =
    JSON.stringify(
      settings
    );

  applyObjectTransform(
    repeat
  );
}

function createThreeDExtrudeFromSelected() {
  const items =
    topLevelSelectedItems();

  if (items.length !== 1) {
    toolStatus.textContent =
      "Select one closed vector shape";
    return null;
  }

  const source =
    items[0];

  if (
    isRasterImageElement(source) ||
    isThreeDExtrude(source)
  ) {
    toolStatus.textContent =
      "3D Extrude supports one closed vector shape";
    return null;
  }

  const sourceTag =
    source.tagName?.toLowerCase();

  if (
    sourceTag === "line" ||
    sourceTag === "polyline"
  ) {
    toolStatus.textContent =
      "3D Extrude needs a closed shape";
    return null;
  }

  if (
    sourceTag === "path"
  ) {
    normalizePathForEditing(
      source
    );

    if (
      source.dataset.closed !==
        "true" &&
      !source
        .getAttribute("d")
        ?.trim()
        .toLowerCase()
        .endsWith("z")
    ) {
      toolStatus.textContent =
        "3D Extrude needs a closed path";
      return null;
    }
  }

  const sourceContours =
    threeDSourceCanvasContours(
      source
    );

  if (
    !sourceContours.length ||
    sourceContours.every(
      contour =>
        contour.length < 3
    )
  ) {
    toolStatus.textContent =
      "This object cannot be extruded as a closed shape";
    return null;
  }

  const repeat =
    document.createElementNS(
      SVG_NS,
      "g"
    );

  objectCounter += 1;

  repeat.dataset.object =
    "true";
  repeat.dataset.group =
    "true";
  repeat.dataset.threeDExtrude =
    "true";
  repeat.dataset.name =
    `3D Extrude ${objectCounter}`;
  repeat.dataset.tx =
    "0";
  repeat.dataset.ty =
    "0";
  repeat.dataset.rotation =
    "0";
  repeat.dataset.scaleX =
    "1";
  repeat.dataset.scaleY =
    "1";
  repeat.dataset.hidden =
    "false";
  repeat.dataset.locked =
    "false";

  repeat.dataset.threeDSource =
    JSON.stringify(
      serializeElementForProject(
        source
      )
    );

  const sourceBounds =
    editableLocalBounds(
      source
    );

  const fixedPivot =
    canvasPointFromLocal(
      source,
      sourceBounds.x +
        sourceBounds.width / 2,
      sourceBounds.y +
        sourceBounds.height / 2
    );

  repeat.dataset.threeDSettings =
    JSON.stringify(
      normalizeThreeDSettings({
        depth:
          threeDDepth.value,
        rotateX:
          threeDRotateX.value,
        rotateY:
          threeDRotateY.value,
        rotateZ:
          threeDRotateZ.value,
        moveX:
          threeDMoveX.value,
        moveY:
          threeDMoveY.value,
        moveZ:
          threeDMoveZ.value,
        pivotX:
          fixedPivot.x,
        pivotY:
          fixedPivot.y,
        wholeFill:
          source.getAttribute("fill") ||
          fill.value ||
          "#7c3aed",
        wholeStroke:
          source.getAttribute("stroke") ||
          stroke.value ||
          "#000000",
        wholeStrokeWidth:
          source.getAttribute("stroke-width") ||
          strokeWidth.value ||
          1,
        frontFill:
          source.getAttribute("fill") ||
          fill.value ||
          "#7c3aed",
        frontStroke:
          source.getAttribute("stroke") ||
          stroke.value ||
          "#000000",
        frontStrokeWidth:
          source.getAttribute("stroke-width") ||
          strokeWidth.value ||
          1,
        backFill:
          null,
        backStroke:
          source.getAttribute("stroke") ||
          stroke.value ||
          "#000000",
        backStrokeWidth:
          source.getAttribute("stroke-width") ||
          strokeWidth.value ||
          1,
        leftFill:
          null,
        leftStroke:
          source.getAttribute("stroke") ||
          stroke.value ||
          "#000000",
        leftStrokeWidth:
          source.getAttribute("stroke-width") ||
          strokeWidth.value ||
          1,
        rightFill:
          null,
        rightStroke:
          source.getAttribute("stroke") ||
          stroke.value ||
          "#000000",
        rightStrokeWidth:
          source.getAttribute("stroke-width") ||
          strokeWidth.value ||
          1,
        topFill:
          null,
        topStroke:
          source.getAttribute("stroke") ||
          stroke.value ||
          "#000000",
        topStrokeWidth:
          source.getAttribute("stroke-width") ||
          strokeWidth.value ||
          1,
        bottomFill:
          null,
        bottomStroke:
          source.getAttribute("stroke") ||
          stroke.value ||
          "#000000",
        bottomStrokeWidth:
          source.getAttribute("stroke-width") ||
          strokeWidth.value ||
          1,
        committed:
          false
      })
    );

  art.insertBefore(
    repeat,
    source.nextSibling
  );

  source.remove();

  threeDPanelRequested =
    true;

  threeDSelectedFace =
    "front";

  repeat.dataset.threeDSelectedFace =
    threeDSelectedFace;

  renderThreeDExtrude(
    repeat
  );

  syncAppearanceControlsToThreeDFace(
    repeat,
    threeDSelectedFace
  );

  setSelection(
    [repeat],
    repeat
  );

  syncThreeDPanel();
  renderLayers();
  drawSelection();

  recordHistory({
    label:
      "3D Extrude Created",
    detail:
      `${threeDDepth.value}px depth`
  });

  toolStatus.textContent =
    "3D Extrude: live preview active";

  return repeat;
}


function threeDHexToRgb(
  color
) {
  const match =
    /^#([0-9a-f]{6})$/i.exec(
      color || ""
    );

  if (!match) return null;

  const value =
    Number.parseInt(
      match[1],
      16
    );

  return {
    r:
      (value >> 16) & 255,
    g:
      (value >> 8) & 255,
    b:
      value & 255
  };
}

function threeDRgbToHex(
  rgb
) {
  const part =
    value =>
      Math.max(
        0,
        Math.min(
          255,
          Math.round(value)
        )
      )
        .toString(16)
        .padStart(
          2,
          "0"
        );

  return (
    "#" +
    part(rgb.r) +
    part(rgb.g) +
    part(rgb.b)
  );
}

function threeDShadeColor(
  color,
  factor
) {
  const rgb =
    threeDHexToRgb(
      color
    );

  if (!rgb) {
    return color;
  }

  return threeDRgbToHex({
    r:
      rgb.r * factor,
    g:
      rgb.g * factor,
    b:
      rgb.b * factor
  });
}

function threeDDefaultFaceShade(
  faceType,
  baseFill
) {
  const factors = {
    front: 1,
    back: 0.58,
    left: 0.72,
    right: 0.86,
    top: 1.12,
    bottom: 0.64
  };

  return threeDShadeColor(
    baseFill,
    factors[faceType] ?? 0.82
  );
}

function threeDFaceStyleForType(
  repeat,
  faceType,
  faceKey = faceType
) {
  const settings =
    normalizeThreeDSettings(
      threeDSettings(repeat) || {}
    );

  const source =
    threeDSourceElement(
      repeat
    );

  const sourceFill =
    source?.getAttribute("fill") ||
    fill?.value ||
    "#7c3aed";

  const sourceStroke =
    source?.getAttribute("stroke") ||
    stroke?.value ||
    "#000000";

  const wholeFill = settings.wholeFill;
  const wholeStroke = settings.wholeStroke;
  const wholeStrokeWidth = settings.wholeStrokeWidth;

  const prefix =
    [
      "front",
      "back",
      "left",
      "right",
      "top",
      "bottom"
    ].includes(faceType)
      ? faceType
      : "front";

  const override =
    settings.faceStyles?.[faceKey] ||
    {};

  return {
    fill:
      override.fill ??
      (wholeFill
        ? threeDDefaultFaceShade(prefix, wholeFill)
        : settings[`${prefix}Fill`] ||
          threeDDefaultFaceShade(prefix, sourceFill)),
    stroke:
      override.stroke ??
      (wholeStroke !== null
        ? wholeStroke
        : settings[`${prefix}Stroke`] || sourceStroke),
    strokeWidth:
      override.strokeWidth ??
      (wholeStroke !== null
        ? wholeStrokeWidth
        : settings[`${prefix}StrokeWidth`])
  };
}


function threeDNearestFaceAtClientPoint(
  clientX,
  clientY,
  repeat
) {
  if (!repeat) return null;

  const faces =
    [
      ...repeat.querySelectorAll(
        "[data-three-d-face]"
      )
    ];

  const hits =
    document.elementsFromPoint(
      clientX,
      clientY
    );

  const hitSet =
    new Set(
      hits
    );

  const candidates =
    faces.filter(
      face =>
        hitSet.has(face)
    );

  if (!candidates.length) {
    return null;
  }

  /*
   * Smaller rotated Z is nearer the camera in this renderer.
   * Pick nearest depth among all overlapping rendered faces.
   */
  candidates.sort(
    (a, b) =>
      Number(
        a.dataset.threeDDepth
      ) -
      Number(
        b.dataset.threeDDepth
      )
  );

  return candidates[0];
}

function syncAppearanceControlsToThreeDFace(
  repeat,
  faceType
) {
  if (
    !repeat ||
    !faceType
  ) {
    return;
  }

  const renderedFace =
    repeat.querySelector(
      `[data-three-d-face-key="${CSS.escape(faceType)}"]`
    );

  const semanticType =
    renderedFace?.dataset.threeDFace ||
    (faceType === "front" || faceType === "back"
      ? faceType
      : "front");

  const style =
    threeDFaceStyleForType(
      repeat,
      semanticType,
      faceType
    );

  if (
    style.fill &&
    /^#[0-9a-f]{6}$/i.test(
      style.fill
    )
  ) {
    fill.value =
      style.fill;

    topFill.value =
      style.fill;

    fillType.value =
      "solid";
  }

  if (
    style.stroke &&
    /^#[0-9a-f]{6}$/i.test(
      style.stroke
    )
  ) {
    stroke.value =
      style.stroke;

    topStroke.value =
      style.stroke;
  }

  const width =
    Math.max(
      0,
      Number(
        style.strokeWidth
      ) || 0
    );

  strokeWidth.value =
    String(width);

  topStrokeWidth.value =
    String(width);

  strokeWidthNumber.value =
    String(width);

  strokeValue.textContent =
    `${width} px`;

  updateAdvancedStrokeLabels();
}


function applyAppearanceControlToThreeDFace(
  repeat,
  faceKey,
  source
) {
  if (
    !repeat ||
    !faceKey
  ) {
    return false;
  }

  const settings =
    normalizeThreeDSettings(
      threeDSettings(repeat) || {}
    );

  settings.faceStyles =
    settings.faceStyles || {};

  const current =
    settings.faceStyles[faceKey] || {};

  const next = { ...current };
  let changed = false;

  if (
    source === fill ||
    source === topFill
  ) {
    next.fill = fill.value;
    changed = true;
  }

  if (
    source === stroke ||
    source === topStroke
  ) {
    next.stroke = stroke.value;
    changed = true;
  }

  if (
    source === strokeWidth ||
    source === topStrokeWidth
  ) {
    next.strokeWidth =
      Math.max(
        0,
        Number(strokeWidth.value) || 0
      );
    changed = true;
  }

  if (!changed) {
    return false;
  }

  settings.faceStyles[faceKey] =
    next;

  repeat.dataset.threeDSettings =
    JSON.stringify(settings);

  renderThreeDExtrude(repeat);

  syncAppearanceControlsToThreeDFace(
    repeat,
    faceKey
  );

  toolStatus.textContent =
    "3D face appearance updated";

  drawSelection();
  renderLayers();
  scheduleAutosave();

  return true;
}


function currentThreeDSettings() {
  const repeat =
    selectedThreeDExtrude();

  const previous =
    repeat
      ? normalizeThreeDSettings(
          threeDSettings(repeat) || {}
        )
      : normalizeThreeDSettings();

  return normalizeThreeDSettings({
    mode:
      previous.mode,
    depth:
      threeDDepth.value,
    revolveAngle:
      threeDRevolveAngle?.value ?? previous.revolveAngle,
    revolveSegments:
      threeDRevolveSegments?.value ?? previous.revolveSegments,
    revolveAxis:
      threeDRevolveAxis?.value ?? previous.revolveAxis,
    rotateX:
      threeDRotateX.value,
    rotateY:
      threeDRotateY.value,
    rotateZ:
      threeDRotateZ.value,
    moveX:
      threeDMoveX.value,
    moveY:
      threeDMoveY.value,
    moveZ:
      threeDMoveZ.value,
    pivotX:
      previous.pivotX,
    pivotY:
      previous.pivotY,
    wholeFill:
      threeDWholeFill?.value || previous.wholeFill,
    wholeStroke:
      threeDWholeStrokeMode?.value === "none"
        ? "none"
        : (threeDWholeStroke?.value || previous.wholeStroke),
    wholeStrokeWidth:
      threeDWholeStrokeWidth?.value ?? previous.wholeStrokeWidth,
    shadeMode:
      threeDShadeMode?.value || previous.shadeMode,
    frontFill:
      previous.frontFill,
    frontStroke:
      previous.frontStroke,
    frontStrokeWidth:
      previous.frontStrokeWidth,
    backFill:
      previous.backFill,
    backStroke:
      previous.backStroke,
    backStrokeWidth:
      previous.backStrokeWidth,
    leftFill:
      previous.leftFill,
    leftStroke:
      previous.leftStroke,
    leftStrokeWidth:
      previous.leftStrokeWidth,
    rightFill:
      previous.rightFill,
    rightStroke:
      previous.rightStroke,
    rightStrokeWidth:
      previous.rightStrokeWidth,
    topFill:
      previous.topFill,
    topStroke:
      previous.topStroke,
    topStrokeWidth:
      previous.topStrokeWidth,
    bottomFill:
      previous.bottomFill,
    bottomStroke:
      previous.bottomStroke,
    bottomStrokeWidth:
      previous.bottomStrokeWidth,
    faceStyles:
      previous.faceStyles,
    committed:
      previous.committed
  });
}

function updateSelectedThreeDLive(record = false) {
  const repeat =
    selectedThreeDExtrude();

  if (!repeat) return;

  const settings =
    currentThreeDSettings();

  repeat.dataset.threeDSettings =
    JSON.stringify(
      settings
    );

  renderThreeDExtrude(
    repeat
  );

  drawSelection();
  renderLayers();

  if (record) {
    recordHistory({
      label:
        settings.mode === "revolve" ? "3D Revolve Updated" : "3D Extrude Updated",
      detail:
        settings.mode === "revolve"
          ? `${Math.round(settings.revolveAngle)}° • ${settings.revolveSegments} segments`
          : `${Math.round(settings.depth)}px depth`
    });
  } else {
    scheduleAutosave();
  }
}

function commitSelectedThreeDExtrude() {
  threeDOrbitDrag =
    null;
  threeDSelectedFace =
    null;

  const repeat =
    selectedThreeDExtrude();

  if (!repeat) return false;

  const settings =
    normalizeThreeDSettings(
      threeDSettings(repeat) || {}
    );

  settings.committed =
    true;

  repeat.dataset.threeDSettings =
    JSON.stringify(
      settings
    );

  threeDPanelRequested =
    false;

  threeDPanel.hidden =
    true;

  document
    .querySelectorAll(
      ".three-d-tool"
    )
    .forEach(
      button =>
        button.classList.remove(
          "active"
        )
    );

  drawSelection();
  renderLayers();

  recordHistory({
    label:
      settings.mode === "revolve" ? "3D Revolve Committed" : "3D Extrude Committed",
    detail:
      settings.mode === "revolve"
        ? `${Math.round(settings.revolveAngle)}° revolve`
        : `${Math.round(settings.depth)}px depth`
  });

  scheduleAutosave();

  toolStatus.textContent =
    settings.mode === "revolve" ? "3D Revolve committed" : "3D Extrude committed";

  return true;
}

function threeDResolvedPathFromPaperItem(item, name = "3D Resolved Surface") {
  if (!item) return null;

  const exported = item.exportSVG({ asString: true, precision: 5 });
  const doc = new DOMParser().parseFromString(exported, "image/svg+xml");
  let source = doc.documentElement;
  if (source?.tagName?.toLowerCase() === "svg") source = source.firstElementChild;
  if (!source) return null;

  const element = document.importNode(source, true);
  element.removeAttribute("style");
  element.removeAttribute("transform");
  element.removeAttribute("id");
  element.querySelectorAll?.("*").forEach(child => {
    child.removeAttribute("style");
    child.removeAttribute("transform");
    child.removeAttribute("id");
  });

  objectCounter += 1;
  element.dataset.object = "true";
  element.dataset.name = name;
  element.dataset.tx = "0";
  element.dataset.ty = "0";
  element.dataset.rotation = "0";
  element.dataset.scaleX = "1";
  element.dataset.scaleY = "1";
  element.dataset.hidden = "false";
  element.dataset.locked = "false";
  element.dataset.shape = "true";

  if (element.tagName?.toLowerCase() === "path") {
    element.dataset.closed = "true";
    element.dataset.compoundShape = item instanceof paper.CompoundPath ? "true" : "false";
  }

  return element;
}

function threeDUnionRenderedFacePaths(faceNodes) {
  if (!faceNodes?.length || !ensurePaperReady()) return null;

  let result = null;
  try {
    for (const node of faceNodes) {
      const clone = node.cloneNode(true);
      clone.removeAttribute("class");
      clone.removeAttribute("style");
      clone.setAttribute("fill", "#000000");
      clone.setAttribute("stroke", "none");
      clone.removeAttribute("pointer-events");
      const imported = paper.project.importSVG(
        new XMLSerializer().serializeToString(clone),
        { insert: false, expandShapes: true }
      );
      if (!imported) continue;
      if (!result) {
        result = imported;
      } else {
        const merged = result.unite(imported, { insert: false, trace: true });
        result.remove?.();
        imported.remove?.();
        result = merged;
      }
    }
    return result;
  } catch (error) {
    console.error("3D resolved-face union failed", error);
    result?.remove?.();
    return null;
  }
}

function threeDHexColorOrFallback(color, fallback = "#7c3aed") {
  if (/^#[0-9a-f]{6}$/i.test(color || "")) return color;
  const rgb = color?.match?.(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
  if (!rgb) return fallback;
  return threeDRgbToHex({ r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) });
}

function threeDResolvedGradientFromFaceSamples(faceNodes, targetElement, baseFill, gradientAxis = null) {
  if (!faceNodes?.length || !targetElement || !paintDefs) return null;

  const samples = faceNodes.map(node => {
    let box;
    try {
      box = node.getBBox();
    } catch {
      box = null;
    }
    if (!box) return null;
    return {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
      color: threeDHexColorOrFallback(node.getAttribute("fill"), baseFill)
    };
  }).filter(Boolean);

  if (samples.length < 2) return null;

  const meanX = samples.reduce((sum, sample) => sum + sample.x, 0) / samples.length;
  const meanY = samples.reduce((sum, sample) => sum + sample.y, 0) / samples.length;
  let axisX = Number(gradientAxis?.x);
  let axisY = Number(gradientAxis?.y);
  const suppliedLength = Math.hypot(axisX, axisY);
  if (Number.isFinite(suppliedLength) && suppliedLength > 1e-6) {
    axisX /= suppliedLength;
    axisY /= suppliedLength;
  } else {
    let xx = 0;
    let yy = 0;
    let xy = 0;
    samples.forEach(sample => {
      const dx = sample.x - meanX;
      const dy = sample.y - meanY;
      xx += dx * dx;
      yy += dy * dy;
      xy += dx * dy;
    });
    const angle = 0.5 * Math.atan2(2 * xy, xx - yy);
    axisX = Math.cos(angle);
    axisY = Math.sin(angle);
  }
  if (!Number.isFinite(axisX) || !Number.isFinite(axisY)) {
    axisX = 1;
    axisY = 0;
  }

  const projections = samples.map(sample => ({
    ...sample,
    projection: (sample.x - meanX) * axisX + (sample.y - meanY) * axisY
  }));
  const minProjection = Math.min(...projections.map(sample => sample.projection));
  const maxProjection = Math.max(...projections.map(sample => sample.projection));
  const span = Math.max(1e-6, maxProjection - minProjection);

  projections.forEach(sample => {
    sample.offset = Math.max(0, Math.min(1, (sample.projection - minProjection) / span));
  });
  projections.sort((a, b) => a.offset - b.offset);

  const bucketed = [];
  projections.forEach(sample => {
    const last = bucketed[bucketed.length - 1];
    if (last && Math.abs(last.offset - sample.offset) < 0.035) {
      const a = threeDHexToRgb(last.color);
      const b = threeDHexToRgb(sample.color);
      if (a && b) {
        last.color = threeDRgbToHex({
          r: (a.r + b.r) / 2,
          g: (a.g + b.g) / 2,
          b: (a.b + b.b) / 2
        });
      }
      last.offset = (last.offset + sample.offset) / 2;
    } else {
      bucketed.push({ offset: sample.offset, color: sample.color });
    }
  });

  if (!bucketed.length) return null;
  if (bucketed[0].offset > 0.001) bucketed.unshift({ offset: 0, color: bucketed[0].color });
  if (bucketed[bucketed.length - 1].offset < 0.999) {
    const last = bucketed[bucketed.length - 1];
    bucketed.push({ offset: 1, color: last.color });
  }

  gradientCounter += 1;
  const id = `vs-gradient-3d-resolved-${gradientCounter}`;
  const gradient = document.createElementNS(SVG_NS, "linearGradient");
  gradient.id = id;
  gradient.setAttribute("gradientUnits", "userSpaceOnUse");
  gradient.setAttribute("x1", String(meanX + axisX * minProjection));
  gradient.setAttribute("y1", String(meanY + axisY * minProjection));
  gradient.setAttribute("x2", String(meanX + axisX * maxProjection));
  gradient.setAttribute("y2", String(meanY + axisY * maxProjection));

  bucketed.forEach(sample => {
    const stop = document.createElementNS(SVG_NS, "stop");
    stop.setAttribute("offset", `${(sample.offset * 100).toFixed(2)}%`);
    stop.setAttribute("stop-color", sample.color);
    gradient.appendChild(stop);
  });

  paintDefs.appendChild(gradient);
  targetElement.dataset.gradientId = id;
  targetElement.dataset.threeDResolvedGradient = "true";
  targetElement.setAttribute("fill", `url(#${id})`);
  targetElement.querySelectorAll?.("path").forEach(path => path.setAttribute("fill", `url(#${id})`));
  return id;
}


function threeDResolvedProjectedRevolveGradientAxis(settings) {
  const rotationOnly = { ...settings, moveX: 0, moveY: 0, moveZ: 0 };
  const projectedAxis = threeDRotatePoint({ x: 0, y: 1, z: 0 }, rotationOnly);
  const length = Math.hypot(projectedAxis.x, projectedAxis.y);
  if (length < 1e-6) return { x: 1, y: 0 };
  /* Shading varies around the circumference: perpendicular to the revolve axis. */
  return {
    x: -projectedAxis.y / length,
    y: projectedAxis.x / length
  };
}

function threeDResolvedPolygonPoints(node) {
  const numbers = (node?.getAttribute("d") || "").match(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi)?.map(Number) || [];
  const points = [];
  for (let i = 0; i + 1 < numbers.length; i += 2) {
    if (Number.isFinite(numbers[i]) && Number.isFinite(numbers[i + 1])) {
      points.push({ x: numbers[i], y: numbers[i + 1] });
    }
  }
  return points;
}

function threeDResolvedEllipseFromCap(capNode, name) {
  const points = threeDResolvedPolygonPoints(capNode);
  if (points.length < 6) return null;

  const cx = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const cy = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  let xx = 0;
  let yy = 0;
  let xy = 0;
  points.forEach(point => {
    const dx = point.x - cx;
    const dy = point.y - cy;
    xx += dx * dx;
    yy += dy * dy;
    xy += dx * dy;
  });
  const angle = 0.5 * Math.atan2(2 * xy, xx - yy);
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const vx = -uy;
  const vy = ux;
  let rx = 0;
  let ry = 0;
  points.forEach(point => {
    const dx = point.x - cx;
    const dy = point.y - cy;
    rx = Math.max(rx, Math.abs(dx * ux + dy * uy));
    ry = Math.max(ry, Math.abs(dx * vx + dy * vy));
  });
  if (rx < 1e-4 || ry < 1e-4) return null;

  const ellipse = document.createElementNS(SVG_NS, "ellipse");
  objectCounter += 1;
  ellipse.dataset.object = "true";
  ellipse.dataset.name = name;
  ellipse.dataset.tx = "0";
  ellipse.dataset.ty = "0";
  ellipse.dataset.rotation = "0";
  ellipse.dataset.scaleX = "1";
  ellipse.dataset.scaleY = "1";
  ellipse.dataset.hidden = "false";
  ellipse.dataset.locked = "false";
  ellipse.dataset.shape = "true";
  ellipse.setAttribute("cx", String(cx));
  ellipse.setAttribute("cy", String(cy));
  ellipse.setAttribute("rx", String(rx));
  ellipse.setAttribute("ry", String(ry));
  ellipse.setAttribute("fill", capNode.getAttribute("fill") || "none");
  ellipse.setAttribute("stroke", capNode.getAttribute("stroke") || "none");
  ellipse.setAttribute("stroke-width", capNode.getAttribute("stroke-width") || "0");
  const degrees = angle * 180 / Math.PI;
  if (Math.abs(degrees) > 1e-5) {
    ellipse.setAttribute("transform", `rotate(${degrees} ${cx} ${cy})`);
  }
  return ellipse;
}

function expandThreeDRevolveResolved(repeat) {
  const settings = normalizeThreeDSettings(threeDSettings(repeat) || {});
  const source = threeDSourceElement(repeat);
  const baseFill = threeDHexColorOrFallback(settings.wholeFill || source?.getAttribute("fill"), "#7c3aed");

  /* Resolve the exact current view using the ordinary quad renderer. */
  const expansionSettings = { ...settings, shadeMode: "flat" };
  repeat.dataset.threeDSettings = JSON.stringify(expansionSettings);
  renderThreeDRevolve(repeat);

  const renderedFaces = [...repeat.querySelectorAll("path[data-three-d-face]")]
    .filter(node => !node.classList.contains("three-d-face-selection-tint"));
  const sideFaces = renderedFaces.filter(node => node.dataset.threeDFace === "side");
  const capFaces = renderedFaces.filter(node => node.dataset.threeDFace !== "side");

  if (!sideFaces.length && !capFaces.length) return false;

  const parent = repeat.parentNode;
  const repeatTranslation = getTranslation(repeat);
  const created = [];

  if (sideFaces.length) {
    const sideUnion = threeDUnionRenderedFacePaths(sideFaces);
    if (sideUnion) {
      const resolvedSide = threeDResolvedPathFromPaperItem(sideUnion, "3D Revolve Surface");
      sideUnion.remove?.();
      if (resolvedSide) {
        resolvedSide.dataset.tx = String(repeatTranslation.x);
        resolvedSide.dataset.ty = String(repeatTranslation.y);
        resolvedSide.setAttribute("stroke", settings.wholeStroke ?? "none");
        resolvedSide.setAttribute("stroke-width", String(settings.wholeStrokeWidth ?? 0));
        resolvedSide.setAttribute("fill-rule", "evenodd");
        applyObjectTransform(resolvedSide);
        parent.insertBefore(resolvedSide, repeat);
        const gradientAxis = threeDResolvedProjectedRevolveGradientAxis(settings);
        threeDResolvedGradientFromFaceSamples(sideFaces, resolvedSide, baseFill, gradientAxis);
        created.push(resolvedSide);
      }
    }
  }

  capFaces.forEach((cap, index) => {
    const name = `3D Revolve Cap ${index + 1}`;
    let resolvedCap = threeDResolvedEllipseFromCap(cap, name);

    if (!resolvedCap) {
      resolvedCap = cap.cloneNode(true);
      resolvedCap.removeAttribute("class");
      resolvedCap.removeAttribute("data-three-d-face");
      resolvedCap.removeAttribute("data-three-d-face-key");
      resolvedCap.removeAttribute("data-three-d-face-index");
      resolvedCap.removeAttribute("data-three-d-depth");
      resolvedCap.removeAttribute("data-three-d-depth-ratio");
      resolvedCap.removeAttribute("data-three-d-orbit-surface");
      resolvedCap.removeAttribute("pointer-events");
      objectCounter += 1;
      resolvedCap.dataset.object = "true";
      resolvedCap.dataset.name = name;
      resolvedCap.dataset.tx = "0";
      resolvedCap.dataset.ty = "0";
      resolvedCap.dataset.rotation = "0";
      resolvedCap.dataset.scaleX = "1";
      resolvedCap.dataset.scaleY = "1";
      resolvedCap.dataset.hidden = "false";
      resolvedCap.dataset.locked = "false";
      resolvedCap.dataset.closed = "true";
      resolvedCap.dataset.shape = "true";
      resolvedCap.dataset.editorPath = "false";
    }

    resolvedCap.dataset.tx = String(repeatTranslation.x);
    resolvedCap.dataset.ty = String(repeatTranslation.y);
    applyObjectTransform(resolvedCap);
    parent.insertBefore(resolvedCap, repeat);
    created.push(resolvedCap);
  });

  if (!created.length) return false;

  repeat.remove();
  threeDPanelRequested = false;
  threeDSelectedFace = null;
  threeDPanel.hidden = true;
  setSelection(created, created[created.length - 1] || null);
  renderLayers();
  drawSelection();
  recordHistory({
    label: "3D Revolve Expanded",
    detail: `${created.length} resolved 2D shape${created.length === 1 ? "" : "s"}`
  });
  scheduleAutosave();
  return true;
}

function expandThreeDExtrudeToPaths(
  repeat = selectedThreeDExtrude()
) {
  if (!repeat) return false;

  if (isThreeDRevolve(repeat)) {
    return expandThreeDRevolveResolved(repeat);
  }

  const children =
    [...repeat.children].filter(child => child.tagName?.toLowerCase() === "path");

  if (!children.length) return false;

  const parent = repeat.parentNode;
  const repeatTranslation = getTranslation(repeat);
  const created = [];

  children.forEach(child => {
    const clone = child.cloneNode(true);
    clone.dataset.object = "true";
    delete clone.dataset.groupChild;
    const translation = getTranslation(clone);
    clone.dataset.tx = String(translation.x + repeatTranslation.x);
    clone.dataset.ty = String(translation.y + repeatTranslation.y);
    applyObjectTransform(clone);
    parent.insertBefore(clone, repeat);
    created.push(clone);
  });

  repeat.remove();
  threeDPanelRequested = false;
  threeDSelectedFace = null;
  threeDPanel.hidden = true;
  setSelection(created, created[created.length - 1] || null);
  renderLayers();
  drawSelection();
  recordHistory({
    label: "3D Extrude Expanded",
    detail: `${created.length} vector faces`
  });
  return true;
}

function positionThreeDPanel() {
  if (
    threeDPanel.hidden
  ) {
    return;
  }

  if (
    threeDPanelManualPosition
  ) {
    threeDPanel.style.left =
      `${threeDPanelManualPosition.left}px`;

    threeDPanel.style.top =
      `${threeDPanelManualPosition.top}px`;

    return;
  }

  const stageRect =
    stage.getBoundingClientRect();

  const panelRect =
    threeDPanel.getBoundingClientRect();

  threeDPanel.style.left =
    `${Math.max(
      8,
      (
        stageRect.width -
        panelRect.width
      ) / 2
    )}px`;

  threeDPanel.style.top =
    "12px";
}

function syncThreeDPanel() {
  const repeat =
    selectedThreeDExtrude();

  const editing =
    Boolean(
      repeat &&
      threeDPanelRequested
    );

  document
    .querySelectorAll(
      ".three-d-tool"
    )
    .forEach(
      button =>
        button.classList.toggle(
          "active",
          editing
        )
    );

  threeDPanel.hidden =
    !editing;

  if (!repeat) return;

  if (editing) {
    activeThreeDFaceSelection(repeat);
  }

  const settings =
    normalizeThreeDSettings(
      threeDSettings(repeat) || {}
    );

  const revolveMode = isThreeDRevolve(repeat);

  if (threeDPanelTitle) threeDPanelTitle.textContent = revolveMode ? "3D Revolve" : "3D Extrude";
  if (threeDPanelSubtitle) threeDPanelSubtitle.textContent = "Live";
  if (threeDDepthControl) threeDDepthControl.hidden = revolveMode;
  if (threeDRevolveAngleControl) threeDRevolveAngleControl.hidden = !revolveMode;
  if (threeDRevolveSegmentsControl) threeDRevolveSegmentsControl.hidden = !revolveMode;
  if (threeDRevolveAxisControl) threeDRevolveAxisControl.hidden = !revolveMode;
  if (threeDPanelHint) {
    threeDPanelHint.textContent = revolveMode
      ? "Drag to orbit. The selected vector profile revolves around its left or right edge with live 3D shading."
      : "Drag to orbit. Native shapes and closed Bézier paths extrude directly.";
  }

  threeDDepth.value =
    settings.depth;
  if (threeDRevolveAngle) threeDRevolveAngle.value = settings.revolveAngle;
  if (threeDRevolveSegments) threeDRevolveSegments.value = settings.revolveSegments;
  if (threeDRevolveAxis) threeDRevolveAxis.value = settings.revolveAxis;
  if (threeDWholeFill) {
    const fallbackFill = threeDSourceElement(repeat)?.getAttribute("fill") || "#7c3aed";
    threeDWholeFill.value = /^#[0-9a-f]{6}$/i.test(settings.wholeFill || "") ? settings.wholeFill : (/^#[0-9a-f]{6}$/i.test(fallbackFill) ? fallbackFill : "#7c3aed");
  }
  if (threeDWholeStrokeMode) threeDWholeStrokeMode.value = settings.wholeStroke === "none" ? "none" : "color";
  if (threeDWholeStroke) {
    const fallbackStroke = threeDSourceElement(repeat)?.getAttribute("stroke") || "#111827";
    const strokePaint = settings.wholeStroke && settings.wholeStroke !== "none" ? settings.wholeStroke : fallbackStroke;
    threeDWholeStroke.value = /^#[0-9a-f]{6}$/i.test(strokePaint || "") ? strokePaint : "#111827";
  }
  if (threeDWholeStrokeWidth) threeDWholeStrokeWidth.value = String(settings.wholeStrokeWidth);
  if (threeDShadeMode) threeDShadeMode.value = settings.shadeMode === "smooth" ? "smooth" : "flat";
  const strokeDisabled = settings.wholeStroke === "none";
  if (threeDWholeStrokeColorControl) threeDWholeStrokeColorControl.hidden = strokeDisabled;
  if (threeDWholeStrokeWidthControl) threeDWholeStrokeWidthControl.hidden = strokeDisabled;
  threeDRotateX.value =
    settings.rotateX;
  threeDRotateY.value =
    settings.rotateY;
  threeDRotateZ.value =
    settings.rotateZ;
  threeDMoveX.value =
    settings.moveX;
  threeDMoveY.value =
    settings.moveY;
  threeDMoveZ.value =
    settings.moveZ;

  requestAnimationFrame(
    positionThreeDPanel
  );
}

function beginThreeDPanelDrag(event) {
  if (event.button !== 0) return;

  const rect =
    threeDPanel.getBoundingClientRect();

  const stageRect =
    stage.getBoundingClientRect();

  threeDPanelDrag = {
    pointerId:
      event.pointerId,
    offsetX:
      event.clientX -
      rect.left,
    offsetY:
      event.clientY -
      rect.top,
    stageLeft:
      stageRect.left,
    stageTop:
      stageRect.top
  };

  threeDPanel.setPointerCapture(
    event.pointerId
  );

  event.preventDefault();
}

function updateThreeDPanelDrag(event) {
  if (
    !threeDPanelDrag ||
    threeDPanelDrag.pointerId !==
      event.pointerId
  ) {
    return;
  }

  threeDPanelManualPosition = {
    left:
      Math.max(
        8,
        event.clientX -
          threeDPanelDrag.stageLeft -
          threeDPanelDrag.offsetX
      ),
    top:
      Math.max(
        8,
        event.clientY -
          threeDPanelDrag.stageTop -
          threeDPanelDrag.offsetY
      )
  };

  positionThreeDPanel();
}

function endThreeDPanelDrag(event) {
  if (
    !threeDPanelDrag ||
    threeDPanelDrag.pointerId !==
      event.pointerId
  ) {
    return;
  }

  if (
    threeDPanel.hasPointerCapture(
      event.pointerId
    )
  ) {
    threeDPanel.releasePointerCapture(
      event.pointerId
    );
  }

  threeDPanelDrag =
    null;
}

[
  threeDDepth,
  threeDRevolveAngle,
  threeDRevolveSegments,
  threeDRevolveAxis,
  threeDWholeFill,
  threeDWholeStroke,
  threeDWholeStrokeWidth,
  threeDShadeMode,
  threeDRotateX,
  threeDRotateY,
  threeDRotateZ,
  threeDMoveX,
  threeDMoveY,
  threeDMoveZ
].filter(Boolean).forEach(
  control => {
    control.addEventListener(
      "input",
      () =>
        updateSelectedThreeDLive(
          false
        )
    );

    control.addEventListener(
      "change",
      () =>
        updateSelectedThreeDLive(
          true
        )
    );
  }
);

if (threeDWholeStrokeMode) {
  threeDWholeStrokeMode.addEventListener("change", () => {
    const disabled = threeDWholeStrokeMode.value === "none";
    if (threeDWholeStrokeColorControl) threeDWholeStrokeColorControl.hidden = disabled;
    if (threeDWholeStrokeWidthControl) threeDWholeStrokeWidthControl.hidden = disabled;
    updateSelectedThreeDLive(true);
  });
}

doneThreeDPanelButton
  .addEventListener(
    "click",
    () => {
      commitSelectedThreeDExtrude();
    }
  );

expandThreeDPanelButton
  .addEventListener(
    "click",
    () => {
      expandThreeDExtrudeToPaths();
    }
  );

closeThreeDPanelButton
  .addEventListener(
    "click",
    () => {
      threeDOrbitDrag =
        null;
      threeDSelectedFace =
        null;

      threeDPanelRequested =
        false;

      threeDPanel.hidden =
        true;

      syncThreeDPanel();
      drawSelection();
    }
  );

threeDPanel.addEventListener(
  "pointerdown",
  event => {
    if (
      event.target.closest(
        "[data-three-d-panel-drag='true']"
      ) &&
      !event.target.closest(
        "button, input, select"
      )
    ) {
      beginThreeDPanelDrag(
        event
      );
    }
  }
);

threeDPanel.addEventListener(
  "pointermove",
  updateThreeDPanelDrag
);

threeDPanel.addEventListener(
  "pointerup",
  endThreeDPanelDrag
);

threeDPanel.addEventListener(
  "pointercancel",
  endThreeDPanelDrag
);


function isPathRepeat(element) {
  return Boolean(
    element &&
    element.dataset.pathRepeat === "true"
  );
}

function pathRepeatSettings(element) {
  if (!isPathRepeat(element)) return null;
  try {
    return JSON.parse(
      element.dataset.pathRepeatSettings || "{}"
    );
  } catch {
    return null;
  }
}

function pathRepeatSourceData(element) {
  if (!isPathRepeat(element)) return null;
  try {
    return JSON.parse(
      element.dataset.pathRepeatSource || "null"
    );
  } catch {
    return null;
  }
}

function pathRepeatGuideData(element) {
  if (!isPathRepeat(element)) return null;
  try {
    return JSON.parse(
      element.dataset.pathRepeatGuide || "null"
    );
  } catch {
    return null;
  }
}

function normalizePathRepeatSettings(settings = {}) {
  const start = Math.max(
    0,
    Math.min(
      100,
      Number(settings.start) || 0
    )
  );

  const end = Math.max(
    start,
    Math.min(
      100,
      Number(settings.end) || 100
    )
  );

  return {
    count: Math.max(
      2,
      Math.min(
        300,
        Math.round(
          Number(settings.count) || 8
        )
      )
    ),
    start,
    end,
    orientation:
      settings.orientation === "page-up"
        ? "page-up"
        : "tangent",
    rotation: Math.max(
      -360,
      Math.min(
        360,
        Number(settings.rotation) || 0
      )
    ),
    randomRotation: Math.max(
      0,
      Math.min(
        180,
        Number(settings.randomRotation) || 0
      )
    ),
    scaleStep: Math.max(
      -90,
      Math.min(
        300,
        Number(settings.scaleStep) || 0
      )
    ),
    committed:
      settings.committed === true
  };
}

function selectedPathRepeat() {
  return (
    selectedItems.length === 1 &&
    isPathRepeat(selectedItems[0])
  )
    ? selectedItems[0]
    : null;
}

function pathRepeatSourceElement(repeat) {
  const data = pathRepeatSourceData(repeat);
  return data
    ? createElementFromProject(data, false)
    : null;
}

function pathRepeatGuideElement(repeat) {
  const data = pathRepeatGuideData(repeat);
  return data
    ? createElementFromProject(data, false)
    : null;
}

function pathRepeatGuideCandidate(element) {
  return Boolean(
    element &&
    (
      element.tagName === "path" ||
      element.tagName === "line"
    )
  );
}

function preparePathRepeatChild(child, index) {
  child.removeAttribute("data-object");
  child.dataset.groupChild = "true";
  child.dataset.pathRepeatChild = "true";
  child.dataset.pathRepeatIndex = String(index);

  child
    .querySelectorAll("[data-object]")
    .forEach(node => {
      node.removeAttribute("data-object");
      node.dataset.groupChild = "true";
    });
}

function svgGeometryLength(element) {
  if (element?.tagName === "line") {
    return Math.hypot(
      Number(element.getAttribute("x2")) -
        Number(element.getAttribute("x1")),
      Number(element.getAttribute("y2")) -
        Number(element.getAttribute("y1"))
    );
  }

  if (
    typeof element?.getTotalLength !==
      "function"
  ) {
    return 0;
  }

  try {
    const length =
      element.getTotalLength();

    return Number.isFinite(
      length
    )
      ? length
      : 0;
  } catch {
    return 0;
  }
}

function svgGeometryPointAtLength(
  element,
  distance
) {
  if (element?.tagName === "line") {
    const x1 = Number(element.getAttribute("x1"));
    const y1 = Number(element.getAttribute("y1"));
    const x2 = Number(element.getAttribute("x2"));
    const y2 = Number(element.getAttribute("y2"));
    const total = Math.max(
      1e-9,
      Math.hypot(
        x2 - x1,
        y2 - y1
      )
    );
    const t = Math.max(
      0,
      Math.min(
        1,
        distance / total
      )
    );

    return {
      x: x1 + (x2 - x1) * t,
      y: y1 + (y2 - y1) * t
    };
  }

  const point =
    element.getPointAtLength(distance);

  return {
    x: point.x,
    y: point.y
  };
}


function pathRepeatStableRandom(
  index,
  salt = 0
) {
  const raw =
    Math.sin(
      (index + 1) * 12.9898 +
      (salt + 1) * 78.233
    ) *
    43758.5453;

  return raw - Math.floor(raw);
}

function pathRepeatRandomRotationOffset(
  index,
  variance
) {
  const amount =
    Math.max(
      0,
      Number(variance) || 0
    );

  if (!amount) {
    return 0;
  }

  return (
    pathRepeatStableRandom(
      index,
      17
    ) * 2 - 1
  ) * amount;
}


function pathRepeatGuideIsClosed(
  guide
) {
  if (!guide) {
    return false;
  }

  if (
    guide.tagName === "path"
  ) {
    if (
      guide.dataset.closed ===
        "true"
    ) {
      return true;
    }

    const d =
      String(
        guide.getAttribute(
          "d"
        ) || ""
      ).trim();

    return /z\s*$/i.test(d);
  }

  return false;
}

function renderPathRepeat(repeat) {
  if (!isPathRepeat(repeat)) return;

  const settings =
    normalizePathRepeatSettings(
      pathRepeatSettings(repeat) || {}
    );

  const source =
    pathRepeatSourceElement(repeat);

  const guide =
    pathRepeatGuideElement(repeat);

  if (!source || !guide) return;

  repeat.replaceChildren();

  guide.removeAttribute("data-object");
  guide.dataset.groupChild = "true";
  guide.dataset.pathRepeatGuideChild = "true";
  guide.setAttribute("opacity", "0");
  guide.setAttribute(
    "pointer-events",
    "none"
  );

  repeat.appendChild(guide);

  const length =
    svgGeometryLength(guide);

  if (
    !Number.isFinite(length) ||
    length <= 1e-9
  ) {
    toolStatus.textContent =
      "Repeat Along Path: guide path has no measurable length";

    return;
  }

  /*
   * SVG getBBox() is not reliable on detached elements. The repeat source is
   * reconstructed from serialized data, so temporarily attach it to the live
   * repeat group before measuring its local bounds/center.
   */
  source.removeAttribute(
    "data-object"
  );

  source.dataset.groupChild =
    "true";

  source.setAttribute(
    "visibility",
    "hidden"
  );

  source.setAttribute(
    "pointer-events",
    "none"
  );

  repeat.appendChild(
    source
  );

  applyObjectTransform(
    source
  );

  let sourceBox =
    null;

  try {
    sourceBox =
      editableLocalBounds(
        source
      );
  } catch (error) {
    console.warn(
      "Repeat Along Path could not measure source bounds.",
      error
    );
  }

  const validSourceBox =
    sourceBox &&
    Number.isFinite(
      sourceBox.x
    ) &&
    Number.isFinite(
      sourceBox.y
    ) &&
    Number.isFinite(
      sourceBox.width
    ) &&
    Number.isFinite(
      sourceBox.height
    );

  if (!validSourceBox) {
    source.remove();

    toolStatus.textContent =
      "Repeat Along Path: could not measure source shape";

    return;
  }

  const baseRotation =
    getRotation(source);

  const baseScale =
    getObjectScale(source);

  source.remove();

  const startDistance =
    length * settings.start / 100;

  const endDistance =
    length * settings.end / 100;

  const span =
    Math.max(
      0,
      endDistance - startDistance
    );

  for (
    let index = 0;
    index < settings.count;
    index += 1
  ) {
    const clone =
      pathRepeatSourceElement(repeat);

    if (!clone) continue;

    preparePathRepeatChild(
      clone,
      index
    );

    /*
     * On a closed guide, 0% and 100% are the same physical point. When the
     * repeat covers the full loop, divide by count rather than count - 1 so
     * the final copy stops just before the start instead of overlapping it.
     * Open guides and partial spans still include both requested endpoints.
     */
    const fullClosedLoop =
      pathRepeatGuideIsClosed(
        guide
      ) &&
      settings.start <=
        1e-9 &&
      settings.end >=
        100 - 1e-9;

    const progress =
      fullClosedLoop
        ? index /
          Math.max(
            1,
            settings.count
          )
        : index /
          Math.max(
            1,
            settings.count - 1
          );

    const distance =
      startDistance +
      span * progress;

    const localPoint =
      svgGeometryPointAtLength(
        guide,
        distance
      );

    const target =
      canvasPointFromLocal(
        guide,
        localPoint.x,
        localPoint.y
      );

    const randomRotationOffset =
      pathRepeatRandomRotationOffset(
        index,
        settings.randomRotation
      );

    let rotation =
      baseRotation +
      settings.rotation +
      randomRotationOffset;

    if (
      settings.orientation === "tangent"
    ) {
      const epsilon =
        Math.max(
          0.5,
          Math.min(
            4,
            length / 500
          )
        );

      const before =
        svgGeometryPointAtLength(
          guide,
          Math.max(
            0,
            distance - epsilon
          )
        );

      const after =
        svgGeometryPointAtLength(
          guide,
          Math.min(
            length,
            distance + epsilon
          )
        );

      const beforeCanvas =
        canvasPointFromLocal(
          guide,
          before.x,
          before.y
        );

      const afterCanvas =
        canvasPointFromLocal(
          guide,
          after.x,
          after.y
        );

      rotation =
        Math.atan2(
          afterCanvas.y -
            beforeCanvas.y,
          afterCanvas.x -
            beforeCanvas.x
        ) *
        180 /
        Math.PI +
        90 +
        settings.rotation +
        randomRotationOffset;
    }

    const progressionScale =
      Math.max(
        0.05,
        1 +
        (
          settings.scaleStep *
          index
        ) /
        100
      );

    clone.dataset.rotation =
      String(rotation);

    clone.dataset.scaleX =
      String(
        baseScale.x *
        progressionScale
      );

    clone.dataset.scaleY =
      String(
        baseScale.y *
        progressionScale
      );

    repeat.appendChild(clone);

    applyObjectTransform(clone);

    const actualCenter =
      radialRepeatElementCanvasCenter(
        clone
      );

    const currentTranslation =
      getTranslation(clone);

    clone.dataset.tx =
      String(
        currentTranslation.x +
        target.x -
        actualCenter.x
      );

    clone.dataset.ty =
      String(
        currentTranslation.y +
        target.y -
        actualCenter.y
      );

    applyObjectTransform(clone);
  }

  repeat.dataset.pathRepeatSettings =
    JSON.stringify(settings);

  applyObjectTransform(repeat);
}

function createPathRepeatFromSelected() {
  const items =
    topLevelSelectedItems();

  if (items.length !== 2) {
    toolStatus.textContent =
      "Select one shape and one path";
    return null;
  }

  const guideCandidates =
    items.filter(
      pathRepeatGuideCandidate
    );

  if (!guideCandidates.length) {
    toolStatus.textContent =
      "One selected object must be a path or line";
    return null;
  }

  const guide =
    guideCandidates[
      guideCandidates.length - 1
    ];

  const source =
    items.find(
      item =>
        item !== guide
    );

  if (
    !source ||
    isRasterImageElement(source)
  ) {
    toolStatus.textContent =
      "Repeat Along Path currently supports vector/text source objects";
    return null;
  }

  const repeat =
    document.createElementNS(
      SVG_NS,
      "g"
    );

  objectCounter += 1;

  repeat.dataset.object = "true";
  repeat.dataset.group = "true";
  repeat.dataset.pathRepeat = "true";
  repeat.dataset.name =
    `Path Repeat ${objectCounter}`;
  repeat.dataset.tx = "0";
  repeat.dataset.ty = "0";
  repeat.dataset.rotation = "0";
  repeat.dataset.scaleX = "1";
  repeat.dataset.scaleY = "1";
  repeat.dataset.hidden = "false";
  repeat.dataset.locked = "false";

  repeat.dataset.pathRepeatSource =
    JSON.stringify(
      serializeElementForProject(source)
    );

  repeat.dataset.pathRepeatGuide =
    JSON.stringify(
      serializeElementForProject(guide)
    );

  repeat.dataset.pathRepeatSettings =
    JSON.stringify(
      normalizePathRepeatSettings({
        count: pathRepeatCount.value,
        start: pathRepeatStart.value,
        end: pathRepeatEnd.value,
        orientation:
          pathRepeatOrientation.value,
        rotation:
          pathRepeatRotation.value,
        randomRotation:
          pathRepeatRandomRotation.value,
        scaleStep:
          pathRepeatScale.value,
        committed: false
      })
    );

  const order = [...art.children];
  const sourceIndex =
    order.indexOf(source);
  const guideIndex =
    order.indexOf(guide);

  const later =
    sourceIndex > guideIndex
      ? source
      : guide;

  art.insertBefore(
    repeat,
    later.nextSibling
  );

  source.remove();
  guide.remove();

  pathRepeatPanelRequested = true;

  renderPathRepeat(repeat);

  setSelection(
    [repeat],
    repeat
  );

  syncPathRepeatPanel();
  renderLayers();
  drawSelection();

  recordHistory({
    label:
      "Repeat Along Path Created",
    detail:
      `${pathRepeatCount.value} live copies`
  });

  toolStatus.textContent =
    "Repeat Along Path: live preview active";

  return repeat;
}

function currentPathRepeatSettings() {
  const repeat =
    selectedPathRepeat();

  const previous =
    repeat
      ? normalizePathRepeatSettings(
          pathRepeatSettings(repeat) || {}
        )
      : normalizePathRepeatSettings();

  return normalizePathRepeatSettings({
    count: pathRepeatCount.value,
    start: pathRepeatStart.value,
    end: pathRepeatEnd.value,
    orientation:
      pathRepeatOrientation.value,
    rotation:
      pathRepeatRotation.value,
    randomRotation:
      pathRepeatRandomRotation.value,
    scaleStep:
      pathRepeatScale.value,
    committed:
      previous.committed
  });
}

function updateSelectedPathRepeatLive(
  record = false
) {
  const repeat =
    selectedPathRepeat();

  if (!repeat) return;

  const settings =
    currentPathRepeatSettings();

  repeat.dataset.pathRepeatSettings =
    JSON.stringify(settings);

  renderPathRepeat(repeat);
  drawSelection();
  renderLayers();

  if (record) {
    recordHistory({
      label:
        "Repeat Along Path Updated",
      detail:
        `${settings.count} copies`
    });
  } else {
    scheduleAutosave();
  }
}

function commitSelectedPathRepeat() {
  if (pathRepeatShapeEdit) {
    endPathRepeatShapeEdit({
      selectRepeat: true,
      keepPanel: true
    });
  }

  const repeat =
    selectedPathRepeat();

  if (!repeat) return false;

  const settings =
    normalizePathRepeatSettings(
      pathRepeatSettings(repeat) || {}
    );

  settings.committed = true;

  repeat.dataset.pathRepeatSettings =
    JSON.stringify(settings);

  pathRepeatGuideEdit = false;
  pathRepeatGuideDrag = null;

  pathRepeatPanelRequested = false;
  pathRepeatPanel.hidden = true;

  document
    .querySelectorAll(".path-repeat-tool")
    .forEach(
      button =>
        button.classList.remove("active")
    );

  drawSelection();
  renderLayers();

  recordHistory({
    label:
      "Repeat Along Path Committed",
    detail:
      `${settings.count} copies`
  });

  scheduleAutosave();

  toolStatus.textContent =
    "Repeat Along Path committed";

  return true;
}

function expandPathRepeatToPaths(
  repeat = selectedPathRepeat()
) {
  if (pathRepeatShapeEdit) {
    endPathRepeatShapeEdit({
      selectRepeat: true,
      keepPanel: true
    });

    repeat =
      selectedPathRepeat();
  }

  if (!repeat) return false;

  const children =
    [...repeat.children].filter(
      child =>
        child.dataset.pathRepeatChild === "true"
    );

  if (!children.length) return false;

  const parent =
    repeat.parentNode;

  const repeatTranslation =
    getTranslation(repeat);

  const created = [];

  children.forEach(child => {
    const clone =
      child.cloneNode(true);

    clone.dataset.object = "true";
    delete clone.dataset.groupChild;
    delete clone.dataset.pathRepeatChild;
    delete clone.dataset.pathRepeatIndex;

    const translation =
      getTranslation(clone);

    clone.dataset.tx =
      String(
        translation.x +
        repeatTranslation.x
      );

    clone.dataset.ty =
      String(
        translation.y +
        repeatTranslation.y
      );

    applyObjectTransform(clone);

    parent.insertBefore(
      clone,
      repeat
    );

    created.push(clone);
  });

  repeat.remove();

  pathRepeatGuideEdit = false;
  pathRepeatGuideDrag = null;
  pathRepeatPanelRequested = false;
  pathRepeatPanel.hidden = true;

  setSelection(
    created,
    created[
      created.length - 1
    ] || null
  );

  renderLayers();
  drawSelection();

  recordHistory({
    label:
      "Repeat Along Path Expanded",
    detail:
      `${created.length} objects`
  });

  return true;
}

function positionPathRepeatPanel() {
  if (pathRepeatPanel.hidden) return;

  if (pathRepeatPanelManualPosition) {
    pathRepeatPanel.style.left =
      `${pathRepeatPanelManualPosition.left}px`;
    pathRepeatPanel.style.top =
      `${pathRepeatPanelManualPosition.top}px`;
    return;
  }

  const stageRect =
    stage.getBoundingClientRect();

  const panelRect =
    pathRepeatPanel.getBoundingClientRect();

  pathRepeatPanel.style.left =
    `${Math.max(
      8,
      (
        stageRect.width -
        panelRect.width
      ) / 2
    )}px`;

  pathRepeatPanel.style.top =
    "12px";
}


function syncRepeatToolActiveStates() {
  const pathActive =
    Boolean(
      pathRepeatPanelRequested ||
      selectedPathRepeat()
    );

  document
    .querySelectorAll(
      '[data-command="repeat-along-path"]'
    )
    .forEach(
      button =>
        button.classList.toggle(
          "active",
          pathActive
        )
    );

  const repeatFamily =
    document.querySelector(
      '[data-tool-family="repeat"]'
    );

  const primary =
    repeatFamily?.querySelector(
      ":scope > .tool-family-primary"
    );

  if (
    primary &&
    pathActive
  ) {
    primary.classList.add(
      "active"
    );
  } else if (
    primary &&
    !selectedRadialRepeat?.()
  ) {
    primary.classList.remove(
      "active"
    );
  }
}

function syncPathRepeatPanel() {
  syncRepeatToolActiveStates();

  const repeat =
    activePathRepeatForPanel();

  const settings =
    repeat
      ? normalizePathRepeatSettings(
          pathRepeatSettings(repeat) || {}
        )
      : null;

  const editing =
    Boolean(
      repeat &&
      pathRepeatPanelRequested
    );

  document
    .querySelectorAll(".path-repeat-tool")
    .forEach(
      button =>
        button.classList.toggle(
          "active",
          editing
        )
    );

  pathRepeatPanel.hidden =
    !editing;

  if (!repeat) return;

  pathRepeatCount.value =
    settings.count;
  pathRepeatStart.value =
    settings.start;
  pathRepeatEnd.value =
    settings.end;
  pathRepeatOrientation.value =
    settings.orientation;
  pathRepeatRotation.value =
    settings.rotation;
  pathRepeatRandomRotation.value =
    settings.randomRotation;
  pathRepeatScale.value =
    settings.scaleStep;

  editPathRepeatGuideButton.classList.toggle(
    "active",
    pathRepeatGuideEdit
  );

  editPathRepeatGuideButton.textContent =
    pathRepeatGuideEdit
      ? "Editing Path"
      : "Edit Path";

  editPathRepeatShapeButton.classList.toggle(
    "active",
    Boolean(
      pathRepeatShapeEdit
    )
  );

  editPathRepeatShapeButton.textContent =
    pathRepeatShapeEdit
      ? "Editing Shape"
      : "Edit Shape";

  requestAnimationFrame(
    positionPathRepeatPanel
  );
}

function beginPathRepeatPanelDrag(event) {
  if (event.button !== 0) return;

  const rect =
    pathRepeatPanel.getBoundingClientRect();

  const stageRect =
    stage.getBoundingClientRect();

  pathRepeatPanelDrag = {
    pointerId: event.pointerId,
    offsetX:
      event.clientX - rect.left,
    offsetY:
      event.clientY - rect.top,
    stageLeft: stageRect.left,
    stageTop: stageRect.top
  };

  pathRepeatPanel.setPointerCapture(
    event.pointerId
  );

  event.preventDefault();
}

function updatePathRepeatPanelDrag(event) {
  if (
    !pathRepeatPanelDrag ||
    pathRepeatPanelDrag.pointerId !==
      event.pointerId
  ) {
    return;
  }

  pathRepeatPanelManualPosition = {
    left: Math.max(
      8,
      event.clientX -
        pathRepeatPanelDrag.stageLeft -
        pathRepeatPanelDrag.offsetX
    ),
    top: Math.max(
      8,
      event.clientY -
        pathRepeatPanelDrag.stageTop -
        pathRepeatPanelDrag.offsetY
    )
  };

  positionPathRepeatPanel();
}

function endPathRepeatPanelDrag(event) {
  if (
    !pathRepeatPanelDrag ||
    pathRepeatPanelDrag.pointerId !==
      event.pointerId
  ) {
    return;
  }

  if (
    pathRepeatPanel.hasPointerCapture(
      event.pointerId
    )
  ) {
    pathRepeatPanel.releasePointerCapture(
      event.pointerId
    );
  }

  pathRepeatPanelDrag = null;
}

[
  pathRepeatCount,
  pathRepeatStart,
  pathRepeatEnd,
  pathRepeatOrientation,
  pathRepeatRotation,
  pathRepeatRandomRotation,
  pathRepeatScale
].forEach(control => {
  control.addEventListener(
    "input",
    () =>
      updateSelectedPathRepeatLive(false)
  );

  control.addEventListener(
    "change",
    () =>
      updateSelectedPathRepeatLive(true)
  );
});



editPathRepeatShapeButton.addEventListener(
  "click",
  () => {
    if (pathRepeatShapeEdit) {
      endPathRepeatShapeEdit({
        selectRepeat: true,
        keepPanel: true
      });

      toolStatus.textContent =
        "Repeat Along Path: shape editing off";

      return;
    }

    beginPathRepeatShapeEdit();
  }
);

editPathRepeatGuideButton.addEventListener(
  "click",
  () => {
    if (pathRepeatShapeEdit) {
      endPathRepeatShapeEdit({
        selectRepeat: true,
        keepPanel: true
      });
    }

    if (!selectedPathRepeat()) {
      return;
    }

    pathRepeatGuideEdit =
      !pathRepeatGuideEdit;

    pathRepeatGuideDrag =
      null;

    editPathRepeatGuideButton.classList.toggle(
      "active",
      pathRepeatGuideEdit
    );

    editPathRepeatGuideButton.textContent =
      pathRepeatGuideEdit
        ? "Editing Path"
        : "Edit Path";

    drawSelection();

    toolStatus.textContent =
      pathRepeatGuideEdit
        ? "Repeat Along Path: drag path anchors and handles"
        : "Repeat Along Path: path editing off";
  }
);

donePathRepeatPanelButton.addEventListener(
  "click",
  () => {
    commitSelectedPathRepeat();
  }
);

expandPathRepeatPanelButton.addEventListener(
  "click",
  () => {
    expandPathRepeatToPaths();
  }
);

closePathRepeatPanelButton.addEventListener(
  "click",
  () => {
    if (pathRepeatShapeEdit) {
      endPathRepeatShapeEdit({
        selectRepeat: true,
        keepPanel: false
      });
    }

    pathRepeatGuideEdit = false;
    pathRepeatGuideDrag = null;
    pathRepeatPanelRequested = false;
    pathRepeatPanel.hidden = true;
    syncPathRepeatPanel();
    drawSelection();
  }
);

pathRepeatPanel.addEventListener(
  "pointerdown",
  event => {
    if (
      event.target.closest(
        "[data-path-repeat-panel-drag='true']"
      ) &&
      !event.target.closest(
        "button, input, select"
      )
    ) {
      beginPathRepeatPanelDrag(event);
    }
  }
);

pathRepeatPanel.addEventListener(
  "pointermove",
  updatePathRepeatPanelDrag
);

pathRepeatPanel.addEventListener(
  "pointerup",
  endPathRepeatPanelDrag
);

pathRepeatPanel.addEventListener(
  "pointercancel",
  endPathRepeatPanelDrag
);


function isRepeatGrid(
  element
) {
  return Boolean(
    element &&
    element.dataset.repeatGrid ===
      "true"
  );
}

function repeatGridSettings(
  element
) {
  if (
    !isRepeatGrid(
      element
    )
  ) {
    return null;
  }

  try {
    return JSON.parse(
      element.dataset.repeatGridSettings ||
      "{}"
    );
  } catch {
    return null;
  }
}

function repeatGridSourceData(
  element
) {
  if (
    !isRepeatGrid(
      element
    )
  ) {
    return null;
  }

  try {
    return JSON.parse(
      element.dataset.repeatGridSource ||
      "null"
    );
  } catch {
    return null;
  }
}

function normalizeRepeatGridSettings(
  settings = {}
) {
  return {
    columns:
      Math.max(
        1,
        Math.min(
          30,
          Math.round(
            Number(
              settings.columns
            ) || 1
          )
        )
      ),
    rows:
      Math.max(
        1,
        Math.min(
          30,
          Math.round(
            Number(
              settings.rows
            ) || 1
          )
        )
      ),
    spacingX:
      Math.max(
        -1000,
        Math.min(
          5000,
          Number(
            settings.spacingX
          ) || 0
        )
      ),
    spacingY:
      Math.max(
        -1000,
        Math.min(
          5000,
          Number(
            settings.spacingY
          ) || 0
        )
      ),
    rotationStep:
      Math.max(
        -360,
        Math.min(
          360,
          Number(
            settings.rotationStep
          ) || 0
        )
      ),
    scaleStep:
      Math.max(
        -90,
        Math.min(
          300,
          Number(
            settings.scaleStep
          ) || 0
        )
      )
  };
}

function repeatGridSourceElement(
  repeat
) {
  const data =
    repeatGridSourceData(
      repeat
    );

  if (!data) return null;

  return createElementFromProject(
    data,
    false
  );
}

function prepareRepeatGridChild(
  child,
  index
) {
  child.removeAttribute(
    "data-object"
  );

  child.dataset.groupChild =
    "true";

  child.dataset.repeatGridChild =
    "true";

  child.dataset.repeatGridIndex =
    String(index);

  delete child.dataset.strokeProfileId;

  child
    .querySelectorAll(
      "[data-object]"
    )
    .forEach(
      node => {
        node.removeAttribute(
          "data-object"
        );

        node.dataset.groupChild =
          "true";
      }
    );
}

function renderRepeatGrid(
  repeat
) {
  if (
    !isRepeatGrid(
      repeat
    )
  ) {
    return;
  }

  const settings =
    normalizeRepeatGridSettings(
      repeatGridSettings(
        repeat
      ) || {}
    );

  const source =
    repeatGridSourceElement(
      repeat
    );

  if (!source) return;

  const sourceBox =
    source.getBBox();

  const sourceWidth =
    Math.max(
      1,
      sourceBox.width
    );

  const sourceHeight =
    Math.max(
      1,
      sourceBox.height
    );

  repeat.replaceChildren();

  let index = 0;

  for (
    let row = 0;
    row < settings.rows;
    row += 1
  ) {
    for (
      let column = 0;
      column < settings.columns;
      column += 1
    ) {
      const clone =
        repeatGridSourceElement(
          repeat
        );

      if (!clone) continue;

      prepareRepeatGridChild(
        clone,
        index
      );

      const sourceTranslation =
        getTranslation(
          clone
        );

      const baseRotation =
        getRotation(
          clone
        );

      const sourceScale =
        getObjectScale(
          clone
        );

      const progressionScale =
        Math.max(
          0.05,
          1 +
          (
            settings.scaleStep *
            index
          ) /
          100
        );

      clone.dataset.tx =
        String(
          sourceTranslation.x +
          column *
            (
              sourceWidth +
              settings.spacingX
            )
        );

      clone.dataset.ty =
        String(
          sourceTranslation.y +
          row *
            (
              sourceHeight +
              settings.spacingY
            )
        );

      clone.dataset.rotation =
        String(
          baseRotation +
          settings.rotationStep *
            index
        );

      clone.dataset.scaleX =
        String(
          sourceScale.x *
          progressionScale
        );

      clone.dataset.scaleY =
        String(
          sourceScale.y *
          progressionScale
        );

      applyObjectTransform(
        clone
      );

      repeat.appendChild(
        clone
      );

      index += 1;
    }
  }

  repeat.dataset.repeatGridSettings =
    JSON.stringify(
      settings
    );

  applyObjectTransform(
    repeat
  );
}

function createRepeatGridFromSelected() {
  const items =
    topLevelSelectedItems();

  if (
    items.length !== 1 ||
    isRepeatGrid(
      items[0]
    )
  ) {
    toolStatus.textContent =
      "Select one object to create a Repeat Grid";
    return null;
  }

  const source =
    items[0];

  if (
    isRasterImageElement(
      source
    )
  ) {
    toolStatus.textContent =
      "Repeat Grid currently supports vector/text objects";
    return null;
  }

  const repeat =
    document.createElementNS(
      SVG_NS,
      "g"
    );

  objectCounter += 1;

  repeat.dataset.object =
    "true";

  repeat.dataset.group =
    "true";

  repeat.dataset.repeatGrid =
    "true";

  repeat.dataset.name =
    `Repeat Grid ${objectCounter}`;

  repeat.dataset.tx =
    "0";

  repeat.dataset.ty =
    "0";

  repeat.dataset.rotation =
    "0";

  repeat.dataset.scaleX =
    "1";

  repeat.dataset.scaleY =
    "1";

  repeat.dataset.hidden =
    "false";

  repeat.dataset.locked =
    "false";

  repeat.dataset.repeatGridSource =
    JSON.stringify(
      serializeElementForProject(
        source
      )
    );

  repeat.dataset.repeatGridSettings =
    JSON.stringify(
      normalizeRepeatGridSettings({
        columns:
          repeatGridColumns.value,
        rows:
          repeatGridRows.value,
        spacingX:
          repeatGridSpacingX.value,
        spacingY:
          repeatGridSpacingY.value,
        rotationStep:
          repeatGridRotation.value,
        scaleStep:
          repeatGridScale.value
      })
    );

  art.insertBefore(
    repeat,
    source
  );

  source.remove();

  renderRepeatGrid(
    repeat
  );

  setSelection(
    [repeat],
    repeat
  );

  renderLayers();

  recordHistory({
    label:
      "Repeat Grid Created",
    detail:
      `${repeatGridColumns.value} × ${repeatGridRows.value} live repeat`
  });

  return repeat;
}


function selectedRepeatGrid() {
  return (
    selectedItems.length === 1 &&
    isRepeatGrid(
      selectedItems[0]
    )
  )
    ? selectedItems[0]
    : null;
}

function clampRepeatGridPanelPosition(
  left,
  top
) {
  const stageRect =
    stage.getBoundingClientRect();

  const panelRect =
    repeatGridPanel.getBoundingClientRect();

  const padding = 8;

  return {
    left:
      Math.max(
        padding,
        Math.min(
          left,
          Math.max(
            padding,
            stageRect.width -
              panelRect.width -
              padding
          )
        )
      ),
    top:
      Math.max(
        padding,
        Math.min(
          top,
          Math.max(
            padding,
            stageRect.height -
              panelRect.height -
              padding
          )
        )
      )
  };
}

function positionRepeatGridPanel() {
  if (
    repeatGridPanel.hidden
  ) {
    return;
  }

  if (
    repeatGridPanelManualPosition
  ) {
    const clamped =
      clampRepeatGridPanelPosition(
        repeatGridPanelManualPosition.left,
        repeatGridPanelManualPosition.top
      );

    repeatGridPanelManualPosition =
      clamped;

    repeatGridPanel.style.left =
      `${clamped.left}px`;

    repeatGridPanel.style.top =
      `${clamped.top}px`;

    return;
  }

  const stageRect =
    stage.getBoundingClientRect();

  const panelRect =
    repeatGridPanel.getBoundingClientRect();

  repeatGridPanel.style.left =
    `${Math.max(
      8,
      stageRect.width -
        panelRect.width -
        16
    )}px`;

  repeatGridPanel.style.top =
    "56px";
}

function syncRepeatGridPanel() {
  const repeat =
    selectedRepeatGrid();

  document
    .querySelectorAll(
      ".repeat-grid-tool"
    )
    .forEach(
      button =>
        button.classList.toggle(
          "active",
          Boolean(repeat)
        )
    );

  if (repeat) {
    document
      .querySelectorAll(
        ".radial-repeat-tool"
      )
      .forEach(
        button =>
          button.classList.remove(
            "active"
          )
      );
  }

  repeatGridPanel.hidden =
    !repeat;

  if (!repeat) return;

  const settings =
    normalizeRepeatGridSettings(
      repeatGridSettings(
        repeat
      ) || {}
    );

  repeatGridColumns.value =
    settings.columns;

  repeatGridRows.value =
    settings.rows;

  repeatGridSpacingX.value =
    settings.spacingX;

  repeatGridSpacingY.value =
    settings.spacingY;

  repeatGridRotation.value =
    settings.rotationStep;

  repeatGridScale.value =
    settings.scaleStep;

  requestAnimationFrame(
    positionRepeatGridPanel
  );
}

function beginRepeatGridPanelDrag(
  event
) {
  if (
    event.button !== 0
  ) {
    return;
  }

  const rect =
    repeatGridPanel.getBoundingClientRect();

  const stageRect =
    stage.getBoundingClientRect();

  repeatGridPanelDrag = {
    pointerId:
      event.pointerId,
    offsetX:
      event.clientX -
      rect.left,
    offsetY:
      event.clientY -
      rect.top,
    stageLeft:
      stageRect.left,
    stageTop:
      stageRect.top
  };

  repeatGridPanel.setPointerCapture(
    event.pointerId
  );

  event.preventDefault();
}

function updateRepeatGridPanelDrag(
  event
) {
  if (
    !repeatGridPanelDrag ||
    repeatGridPanelDrag.pointerId !==
      event.pointerId
  ) {
    return;
  }

  const next =
    clampRepeatGridPanelPosition(
      event.clientX -
        repeatGridPanelDrag.stageLeft -
        repeatGridPanelDrag.offsetX,
      event.clientY -
        repeatGridPanelDrag.stageTop -
        repeatGridPanelDrag.offsetY
    );

  repeatGridPanelManualPosition =
    next;

  repeatGridPanel.style.left =
    `${next.left}px`;

  repeatGridPanel.style.top =
    `${next.top}px`;
}

function endRepeatGridPanelDrag(
  event
) {
  if (
    !repeatGridPanelDrag ||
    repeatGridPanelDrag.pointerId !==
      event.pointerId
  ) {
    return;
  }

  if (
    repeatGridPanel.hasPointerCapture(
      event.pointerId
    )
  ) {
    repeatGridPanel.releasePointerCapture(
      event.pointerId
    );
  }

  repeatGridPanelDrag =
    null;
}

function currentRepeatGridInlineSettings() {
  return normalizeRepeatGridSettings({
    columns:
      repeatGridColumns.value,
    rows:
      repeatGridRows.value,
    spacingX:
      repeatGridSpacingX.value,
    spacingY:
      repeatGridSpacingY.value,
    rotationStep:
      repeatGridRotation.value,
    scaleStep:
      repeatGridScale.value
  });
}

function updateSelectedRepeatGridLive(
  record = false
) {
  const repeat =
    selectedRepeatGrid();

  if (!repeat) return;

  const settings =
    currentRepeatGridInlineSettings();

  repeat.dataset.repeatGridSettings =
    JSON.stringify(
      settings
    );

  renderRepeatGrid(
    repeat
  );

  drawSelection();
  updateTransformPanel();
  renderLayers();
  renderSelectionQuickMenu();

  if (record) {
    recordHistory({
      label:
        "Repeat Grid Updated",
      detail:
        `${settings.columns} × ${settings.rows} live repeat`
    });
  } else {
    scheduleAutosave();
  }
}

[
  repeatGridColumns,
  repeatGridRows,
  repeatGridSpacingX,
  repeatGridSpacingY,
  repeatGridRotation,
  repeatGridScale
].forEach(
  control => {
    control.addEventListener(
      "input",
      () => {
        updateSelectedRepeatGridLive(
          false
        );
      }
    );

    control.addEventListener(
      "change",
      () => {
        updateSelectedRepeatGridLive(
          true
        );
      }
    );
  }
);

expandRepeatGridPanelButton.addEventListener(
  "click",
  () => {
    const repeat =
      selectedRepeatGrid();

    if (repeat) {
      expandRepeatGridToPaths(
        repeat
      );
    }
  }
);

closeRepeatGridPanelButton.addEventListener(
  "click",
  () => {
    repeatGridPanel.hidden =
      true;
  }
);

repeatGridPanel.addEventListener(
  "pointerdown",
  event => {
    if (
      event.target.closest(
        "[data-repeat-grid-panel-drag='true']"
      ) &&
      !event.target.closest(
        "button"
      )
    ) {
      beginRepeatGridPanelDrag(
        event
      );
    }
  }
);

repeatGridPanel.addEventListener(
  "pointermove",
  updateRepeatGridPanelDrag
);

repeatGridPanel.addEventListener(
  "pointerup",
  endRepeatGridPanelDrag
);

repeatGridPanel.addEventListener(
  "pointercancel",
  endRepeatGridPanelDrag
);

function expandRepeatGridToPaths(
  repeat
) {
  if (
    !isRepeatGrid(
      repeat
    ) ||
    repeat.parentNode !== art
  ) {
    return [];
  }

  const revealed = [];

  const repeatTranslation =
    getTranslation(
      repeat
    );

  const repeatRotation =
    getRotation(
      repeat
    );

  const repeatScale =
    getObjectScale(
      repeat
    );

  /*
   * Repeat-grid groups are normally edited as one live object. Expansion
   * folds the parent transform into each child before promoting it.
   */
  [...repeat.children].forEach(
    child => {
      const childClone =
        child.cloneNode(
          true
        );

      if (
        child._anchors
      ) {
        childClone._anchors =
          child._anchors.map(
            anchor => ({
              ...anchor
            })
          );
      }

      childClone.dataset.object =
        "true";

      delete childClone.dataset.groupChild;
      delete childClone.dataset.repeatGridChild;
      delete childClone.dataset.repeatGridIndex;

      objectCounter += 1;

      childClone.dataset.name =
        `Repeat ${objectCounter}`;

      const childT =
        getTranslation(
          childClone
        );

      const childScale =
        getObjectScale(
          childClone
        );

      childClone.dataset.tx =
        String(
          childT.x +
          repeatTranslation.x
        );

      childClone.dataset.ty =
        String(
          childT.y +
          repeatTranslation.y
        );

      childClone.dataset.rotation =
        String(
          getRotation(
            childClone
          ) +
          repeatRotation
        );

      childClone.dataset.scaleX =
        String(
          childScale.x *
          repeatScale.x
        );

      childClone.dataset.scaleY =
        String(
          childScale.y *
          repeatScale.y
        );

      applyObjectTransform(
        childClone
      );

      let expanded =
        childClone;

      if (
        !isGroup(
          childClone
        )
      ) {
        expanded =
          convertElementToPath(
            childClone
          );
      }

      art.insertBefore(
        expanded,
        repeat
      );

      applyLayerState(
        expanded
      );

      normalizePathForEditing(
        expanded
      );

      revealed.push(
        expanded
      );
    }
  );

  repeat.remove();

  setSelection(
    revealed,
    revealed[
      revealed.length - 1
    ] || null
  );

  renderLayers();
  drawSelection();

  recordHistory({
    label:
      "Repeat Grid Expanded",
    detail:
      `${revealed.length} independently editable object${revealed.length === 1 ? "" : "s"}`
  });

  toolStatus.textContent =
    `Expanded Repeat Grid to ${revealed.length} objects`;

  return revealed;
}

function isGroup(element) {
  return element?.dataset.group === "true";
}

function topLevelSelectedItems() {
  return selectedItems.filter(
    element =>
      isLayerInteractive(element) &&
      element.parentNode === art
  );
}

function groupSelected() {
  const items = topLevelSelectedItems();

  if (items.length < 2) {
    toolStatus.textContent = "Select at least two objects to group";
    return;
  }

  const artOrder = [...art.children];
  const ordered = artOrder.filter(element => items.includes(element));
  const highest = ordered[ordered.length - 1];
  const insertionPoint = highest.nextSibling;

  objectCounter++;

  const group = document.createElementNS(SVG_NS, "g");
  group.dataset.object = "true";
  group.dataset.group = "true";
  group.dataset.name = `Group ${objectCounter}`;
  group.dataset.tx = "0";
  group.dataset.ty = "0";
  group.dataset.rotation = "0";
  group.dataset.scaleX = "1";
  group.dataset.scaleY = "1";
  group.dataset.hidden = "false";
  group.dataset.locked = "false";

  ordered.forEach(element => {
    element.removeAttribute("data-object");
    element.dataset.groupChild = "true";
    group.appendChild(element);
  });

  art.insertBefore(group, insertionPoint);
  applyObjectTransform(group);
  setSelection([group], group);
  recordHistory({ label: "Objects Grouped", detail: `${ordered.length} objects grouped` });
  toolStatus.textContent = `Grouped ${ordered.length} objects`;
}

function traceUngroupLocalMatrix(element) {
  const consolidated = element?.transform?.baseVal?.consolidate?.();
  if (consolidated?.matrix) return consolidated.matrix;
  return new DOMMatrix();
}

function traceUngroupTransformPoint(matrix, x, y) {
  const point = new DOMPoint(Number(x) || 0, Number(y) || 0).matrixTransform(matrix);
  return { x: point.x, y: point.y };
}

function traceUngroupTransformAnchor(anchor, matrix) {
  const p = traceUngroupTransformPoint(matrix, anchor.x, anchor.y);
  const incoming = traceUngroupTransformPoint(matrix, anchor.inX, anchor.inY);
  const outgoing = traceUngroupTransformPoint(matrix, anchor.outX, anchor.outY);
  return {
    ...anchor,
    x: p.x,
    y: p.y,
    inX: incoming.x,
    inY: incoming.y,
    outX: outgoing.x,
    outY: outgoing.y
  };
}

function traceUngroupTransformGradient(path, matrix) {
  const gradientId = path?.dataset?.gradientId;
  if (!gradientId) return;
  const gradient = document.getElementById(gradientId);
  if (!gradient || gradient.getAttribute("gradientUnits") !== "userSpaceOnUse") return;
  const tag = gradient.tagName?.toLowerCase();
  if (tag === "radialgradient") {
    // Preserve a radial gradient exactly under rotation/non-uniform scale by
    // moving its entire gradient coordinate system with the baked path matrix.
    const existing = gradient.getAttribute("gradientTransform");
    const baked = `matrix(${matrix.a} ${matrix.b} ${matrix.c} ${matrix.d} ${matrix.e} ${matrix.f})`;
    gradient.setAttribute("gradientTransform", existing ? `${baked} ${existing}` : baked);
    return;
  }
  if (tag !== "lineargradient") return;

  const x1 = Number(gradient.getAttribute("x1"));
  const y1 = Number(gradient.getAttribute("y1"));
  const x2 = Number(gradient.getAttribute("x2"));
  const y2 = Number(gradient.getAttribute("y2"));
  if (![x1, y1, x2, y2].every(Number.isFinite)) return;

  const a = traceUngroupTransformPoint(matrix, x1, y1);
  const b = traceUngroupTransformPoint(matrix, x2, y2);
  gradient.setAttribute("x1", String(a.x));
  gradient.setAttribute("y1", String(a.y));
  gradient.setAttribute("x2", String(b.x));
  gradient.setAttribute("y2", String(b.y));
}

function bakeTraceChildForUngroup(group, child) {
  if (
    child?.tagName?.toLowerCase() !== "path" ||
    child.dataset?.potraceEditablePath !== "true"
  ) {
    return false;
  }

  normalizePathForEditing(child);
  if (!Array.isArray(child._anchors) || !child._anchors.length) return false;

  // SVG points travel through the child's transform first and then through
  // the group's transform. Baking that combined matrix into the editable
  // anchors lets Ungroup remove both transforms without moving or resizing
  // a Potrace result.
  const groupMatrix = traceUngroupLocalMatrix(group);
  const childMatrix = traceUngroupLocalMatrix(child);
  const combined = groupMatrix.multiply(childMatrix);

  child._anchors = child._anchors.map(anchor => traceUngroupTransformAnchor(anchor, combined));
  if (Array.isArray(child._holeAnchors)) {
    child._holeAnchors = child._holeAnchors.map(hole =>
      Array.isArray(hole)
        ? hole.map(anchor => traceUngroupTransformAnchor(anchor, combined))
        : hole
    );
  }
  if (Array.isArray(child._traceExtraContours)) {
    child._traceExtraContours = child._traceExtraContours.map(extra => ({
      ...extra,
      anchors: Array.isArray(extra?.anchors)
        ? extra.anchors.map(anchor => traceUngroupTransformAnchor(anchor, combined))
        : [],
      holes: Array.isArray(extra?.holes)
        ? extra.holes.map(hole => Array.isArray(hole)
          ? hole.map(anchor => traceUngroupTransformAnchor(anchor, combined))
          : hole)
        : []
    }));
  }

  traceUngroupTransformGradient(child, combined);
  updatePathD(child);
  child.removeAttribute("transform");
  child.dataset.tx = "0";
  child.dataset.ty = "0";
  child.dataset.rotation = "0";
  child.dataset.scaleX = "1";
  child.dataset.scaleY = "1";
  return true;
}

function ungroupSelected() {
  const groups = selectedItems.filter(
    element =>
      isLayerInteractive(element) &&
      isGroup(element) &&
      !isRepeatGrid(element) &&
      !isPathRepeat(element) &&
      !isThreeDExtrude(element) &&
      !isArtBrushObject(element) &&
      element.parentNode === art
  );

  if (!groups.length) {
    toolStatus.textContent = "Select a group to ungroup";
    return;
  }

  const revealed = [];

  groups.forEach(group => {
    const groupTranslation = getTranslation(group);
    const children = [...group.children];

    children.forEach(child => {
      const bakedTrace = bakeTraceChildForUngroup(group, child);
      const childTranslation = getTranslation(child);

      child.dataset.object = "true";
      delete child.dataset.groupChild;

      if (!bakedTrace) {
        child.dataset.tx = String(
          childTranslation.x + groupTranslation.x
        );
        child.dataset.ty = String(
          childTranslation.y + groupTranslation.y
        );

        if (child.dataset.rotation === undefined) {
          child.dataset.rotation = "0";
        }

        /*
         * Ordinary groups intentionally use translation-only editing. Folding
         * that translation into each child keeps those objects stationary.
         * Potrace paths are handled above because they also carry an import
         * scale/position transform and can inherit source rotation/scale.
         */
        applyObjectTransform(child);
      }

      art.insertBefore(child, group);
      applyLayerState(child);
      normalizePathForEditing(child);
      revealed.push(child);
    });

    group.remove();
  });

  setSelection(
    revealed,
    revealed[revealed.length - 1] || null
  );
  recordHistory({
    label: "Objects Ungrouped",
    detail: groups.length === 1 ? "Group released" : `${groups.length} groups released`
  });
  toolStatus.textContent =
    `Ungrouped ${groups.length === 1 ? "group" : `${groups.length} groups`}`;
}


