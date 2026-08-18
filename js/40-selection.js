/* Vector Studio modular baseline — source lines 12273-19678 from consolidated app.js.
   Classic-script module: shares the browser global lexical scope with ordered sibling modules. */

/* ---------------- SELECTION ---------------- */

function isLayerLocked(element) {
  return element?.dataset.locked === "true";
}

function isLayerHidden(element) {
  return element?.dataset.hidden === "true";
}

function isLayerInteractive(element) {
  return Boolean(element) &&
    element.isConnected &&
    !isLayerLocked(element) &&
    !isLayerHidden(element);
}

/*
 * Canvas selection is intentionally group-oriented. A child selected explicitly
 * from the Layers panel may be edited independently, but a hit on that same
 * child in the artwork should resolve to the outermost editable object directly
 * under #art. This preserves normal group interaction on the canvas.
 */
function canvasSelectionTarget(element) {
  if (!element || !art?.contains(element)) return element || null;

  let current = element;
  while (
    current?.parentNode &&
    current.parentNode !== art &&
    current.parentNode !== svg
  ) {
    if (current.parentNode.dataset?.object === "true") {
      current = current.parentNode;
    } else {
      break;
    }
  }

  return current;
}

function applyLayerState(element) {
  if (!element) return;

  if (isLayerHidden(element)) {
    element.style.display = "none";
  } else {
    element.style.removeProperty("display");
  }

  element.style.pointerEvents = isLayerLocked(element) ? "none" : "";
}

function normalizePathForEditing(element) {
  if (!element || element.tagName !== "path" || element._anchors) return;

  /*
   * Paths created by the Pen tool use the editor's canonical cubic format,
   * so they can safely use the lightweight parser.
   *
   * Shape Builder paths receive their anchor data directly from Paper.js.
   * Do NOT reparse arbitrary SVG path syntax here: Paper.js may emit line,
   * shorthand, arc, or other commands which the old parser cannot map to
   * cubic anchors correctly.
   */
  if (
    element.dataset.editorPath === "true" &&
    element.dataset.roundedPolygon !== "true" &&
    element.dataset.roundedRect !== "true"
  ) {
    element._anchors = parseSimpleCubicPath(element.getAttribute("d"));
  }
}


function elementHasNoVisiblePaint(
  element
) {
  if (
    !element ||
    !element.getAttribute
  ) {
    return false;
  }

  const fillValue =
    String(
      element.getAttribute(
        "fill"
      ) || ""
    )
      .trim()
      .toLowerCase();

  const strokeValue =
    String(
      element.getAttribute(
        "stroke"
      ) || ""
    )
      .trim()
      .toLowerCase();

  const fillOpacity =
    Number(
      element.getAttribute(
        "fill-opacity"
      ) ?? 1
    );

  const strokeOpacity =
    Number(
      element.getAttribute(
        "stroke-opacity"
      ) ?? 1
    );

  const strokeWidth =
    Number(
      element.getAttribute(
        "stroke-width"
      ) || 0
    );

  const fillHidden =
    fillValue === "none" ||
    fillValue ===
      "transparent" ||
    fillOpacity <= 0;

  const strokeHidden =
    strokeValue === "none" ||
    strokeValue ===
      "transparent" ||
    strokeOpacity <= 0 ||
    strokeWidth <= 0;

  return (
    fillHidden &&
    strokeHidden
  );
}

function clientPointInElementGeometry(
  element,
  clientX,
  clientY
) {
  const matrix =
    element.getScreenCTM?.();

  if (!matrix) {
    return false;
  }

  let local;

  try {
    local =
      new DOMPoint(
        clientX,
        clientY
      )
        .matrixTransform(
          matrix.inverse()
        );
  } catch {
    return false;
  }

  /*
   * SVGGeometryElement.isPointInFill() tests the actual vector geometry,
   * independent of whether the element currently has visible paint.
   */
  if (
    typeof element.isPointInFill ===
      "function"
  ) {
    try {
      if (
        element.isPointInFill(
          local
        )
      ) {
        return true;
      }
    } catch {}
  }

  /*
   * Open/zero-area artwork such as lines needs a proximity fallback.
   */
  let box;

  try {
    box =
      element.getBBox();
  } catch {
    return false;
  }

  const padding =
    6 /
    Math.max(
      zoom,
      0.3
    );

  return (
    local.x >=
      box.x - padding &&
    local.x <=
      box.x +
      box.width +
      padding &&
    local.y >=
      box.y - padding &&
    local.y <=
      box.y +
      box.height +
      padding
  );
}

function transparentSelectableAtPoint(
  clientX,
  clientY
) {
  /*
   * Walk top-to-bottom so overlapping invisible objects behave like normal
   * artwork: the frontmost matching object wins.
   */
  const candidates =
    [...art.children]
      .filter(
        element =>
          element.dataset?.object ===
            "true" &&
          isLayerInteractive(
            element
          ) &&
          elementHasNoVisiblePaint(
            element
          )
      )
      .reverse();

  return (
    candidates.find(
      element =>
        clientPointInElementGeometry(
          element,
          clientX,
          clientY
        )
    ) ||
    null
  );
}

function setSelection(elements, primary = null) {
  const previousSelected = selected;

  if (
    imageCropTarget &&
    !elements.includes(
      imageCropTarget
    )
  ) {
    cancelImageCrop();
  }

  selectionQuickMenuManualPosition = null;
  selectionQuickMenuDrag = null;
  selectionQuickMenu.classList.remove(
    "quick-menu-manual-position"
  );
  selectedItems = [...new Set(elements)].filter(isLayerInteractive);
  selected = primary && selectedItems.includes(primary)
    ? primary
    : (selectedItems[selectedItems.length - 1] || null);

  if (selected !== previousSelected) {
    roundedCornerSelection.clear();
    selectedAnchorIndex = null;
    selectedAnchorIndices.clear();

    if (
      activeTool !==
        "vertex"
    ) {
      clearSelectedVertexRefs();
    }

    vertexMarquee = null;
  }

  selectedItems.forEach(normalizePathForEditing);

  updatePropertyControls();

  drawSelection();
  renderLayers();
  updateAlignDistributeControls();
  syncRadialRepeatPanel();
  syncRepeatGridPanel();
  syncPathRepeatPanel();
  syncThreeDPanel();
  syncArtBrushPanel();
  syncGeometryConstraintsPanel();
}

function selectElement(element, additive = false) {
  if (!element) return;

  if (additive) {
    const exists = selectedItems.includes(element);
    const next = exists
      ? selectedItems.filter(el => el !== element)
      : [...selectedItems, element];

    setSelection(next, exists ? next[next.length - 1] : element);
    return;
  }

  setSelection([element], element);
}

function deselect() {
  if (
    pathRepeatShapeEdit &&
    selected ===
      pathRepeatShapeEdit.proxy
  ) {
    endPathRepeatShapeEdit({
      selectRepeat: false,
      keepPanel: false
    });
  }

  if (
    imageCropTarget
  ) {
    ensureImageCropClip(
      imageCropTarget,
      imageCropOriginal ||
        defaultImageCrop()
    );

    imageCropTarget = null;
    imageCropDraft = null;
    imageCropOriginal = null;
    imageCropDrag = null;
  }

  selectionQuickMenuManualPosition = null;
  selectionQuickMenuDrag = null;
  selectionQuickMenu.classList.remove(
    "quick-menu-manual-position"
  );

  selected = null;
  selectedItems = [];
  selectedAnchorIndex = null;
  selectedAnchorIndices.clear();
  clearSelectedVertexRefs();
  vertexMarquee = null;
  roundedCornerSelection.clear();
  selectionOverlay.innerHTML = "";
  updateTransformPanel();
  renderLayers();
  updateAlignDistributeControls();
  syncRadialRepeatPanel();
  syncRepeatGridPanel();
  syncPathRepeatPanel();
}

function getTranslation(el) {
  return {
    x: Number(el.dataset.tx || 0),
    y: Number(el.dataset.ty || 0)
  };
}

function getRotation(el) {
  return Number(el?.dataset.rotation || 0);
}

function getObjectScale(el) {
  return {
    x: Number(el?.dataset.scaleX || 1),
    y: Number(el?.dataset.scaleY || 1)
  };
}

function normalizeAngle(angle) {
  let value = angle % 360;
  if (value > 180) value -= 360;
  if (value <= -180) value += 360;
  return value;
}

function editableLocalBounds(
  element
) {
  if (
    isRasterImageElement(
      element
    ) &&
    element.dataset.imageCrop
  ) {
    const crop =
      imageCropForElement(
        element
      );

    const bounds =
      imageCropLocalBounds(
        element,
        crop
      );

    return {
      x: bounds.left,
      y: bounds.top,
      width: bounds.width,
      height: bounds.height
    };
  }

  const box =
    element.getBBox();

  return {
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height
  };
}

function getLocalCenter(element) {
  const box =
    editableLocalBounds(
      element
    );

  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2
  };
}

function applyObjectTransform(element) {
  const t = getTranslation(element);
  const angle = getRotation(element);
  const scale = getObjectScale(element);
  const center = getLocalCenter(element);

  element.setAttribute(
    "transform",
    [
      `translate(${t.x} ${t.y})`,
      `rotate(${angle} ${center.x} ${center.y})`,
      `translate(${center.x} ${center.y})`,
      `scale(${scale.x} ${scale.y})`,
      `translate(${-center.x} ${-center.y})`
    ].join(" ")
  );

  if (
    element.dataset.strokeProfile &&
    element.dataset.strokeProfile !==
      "uniform"
  ) {
    refreshStrokeProfile(
      element
    );
  }
}

function rotatePoint(point, center, angleDegrees) {
  const radians = angleDegrees * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = point.x - center.x;
  const dy = point.y - center.y;

  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos
  };
}

function pointThroughObjectTransform(element, point) {
  const t = getTranslation(element);
  const center = getLocalCenter(element);
  const scale = getObjectScale(element);

  const scaled = {
    x: center.x + (point.x - center.x) * scale.x,
    y: center.y + (point.y - center.y) * scale.y
  };

  const rotated = rotatePoint(
    scaled,
    center,
    getRotation(element)
  );

  return {
    x: rotated.x + t.x,
    y: rotated.y + t.y
  };
}

function inversePointThroughObjectTransform(element, point) {
  const t = getTranslation(element);
  const center = getLocalCenter(element);
  const scale = getObjectScale(element);

  const translated = {
    x: point.x - t.x,
    y: point.y - t.y
  };

  const unrotated = rotatePoint(
    translated,
    center,
    -getRotation(element)
  );

  return {
    x: center.x + (unrotated.x - center.x) /
      (Math.abs(scale.x) > 1e-9 ? scale.x : 1),
    y: center.y + (unrotated.y - center.y) /
      (Math.abs(scale.y) > 1e-9 ? scale.y : 1)
  };
}

function objectTransformChain(element) {
  const chain = [];
  let current = element;

  while (current && current !== art && current !== svg) {
    if (current instanceof SVGGraphicsElement && current.hasAttribute("transform")) {
      chain.push(current);
    } else if (current === element) {
      // Drawable objects can have identity transforms represented only in data.
      chain.push(current);
    }
    current = current.parentElement;
  }

  return chain;
}

function canvasPointFromLocal(element, x, y) {
  let point = { x, y };
  objectTransformChain(element).forEach(node => {
    point = pointThroughObjectTransform(node, point);
  });
  return point;
}

function localPointFromCanvasWithTransform(
  element,
  point,
  transform
) {
  const center = transform.center || getLocalCenter(element);
  const translated = {
    x: point.x - transform.tx,
    y: point.y - transform.ty
  };

  const unrotated = rotatePoint(
    translated,
    center,
    -transform.rotation
  );

  return {
    x: center.x +
      (unrotated.x - center.x) /
      (Math.abs(transform.scaleX) > 1e-9 ? transform.scaleX : 1),
    y: center.y +
      (unrotated.y - center.y) /
      (Math.abs(transform.scaleY) > 1e-9 ? transform.scaleY : 1)
  };
}

function localPointFromCanvas(element, point) {
  let local = { x: point.x, y: point.y };
  const chain = objectTransformChain(element);

  // Canvas -> local must undo outer ancestors first, then the object itself.
  [...chain].reverse().forEach(node => {
    local = inversePointThroughObjectTransform(node, local);
  });

  return local;
}

// Convert a canvas point into the coordinate space of the selected object's
// parent. This intentionally removes ancestor-group transforms but leaves the
// selected object's own transform untouched. Rotation gestures for a child
// selected from Layers must be measured here because dataset.rotation is a
// local rotation relative to that parent, not a world/canvas-space angle.
function parentPointFromCanvas(element, point) {
  let local = { x: point.x, y: point.y };
  const chain = objectTransformChain(element).filter(node => node !== element);

  [...chain].reverse().forEach(node => {
    local = inversePointThroughObjectTransform(node, local);
  });

  return local;
}

function angleBetween(center, point) {
  return Math.atan2(
    point.y - center.y,
    point.x - center.x
  ) * 180 / Math.PI;
}

function snapRotationAngle(angle) {
  if (!snapSettings.rotation) {
    currentSnapGuides = { x: null, y: null };
    return normalizeAngle(angle);
  }

  const increment = 15;
  const snapped = Math.round(angle / increment) * increment;
  const threshold = 4;

  if (Math.abs(normalizeAngle(angle - snapped)) <= threshold) {
    return normalizeAngle(snapped);
  }

  return normalizeAngle(angle);
}


function isCornerEditableRectangle(element) {
  return Boolean(element) && (
    element.tagName === "rect" ||
    element.dataset.roundedRect === "true"
  );
}

function rectangleFrame(element) {
  if (element.dataset.roundedRect === "true") {
    return {
      x: Number(element.dataset.rectX || 0),
      y: Number(element.dataset.rectY || 0),
      width: Number(element.dataset.rectWidth || 0),
      height: Number(element.dataset.rectHeight || 0)
    };
  }

  return {
    x: Number(element.getAttribute("x") || 0),
    y: Number(element.getAttribute("y") || 0),
    width: Number(element.getAttribute("width") || 0),
    height: Number(element.getAttribute("height") || 0)
  };
}

function rectangleCornerRadii(element) {
  return {
    tl: Number(element.dataset.cornerTl || 0),
    tr: Number(element.dataset.cornerTr || 0),
    br: Number(element.dataset.cornerBr || 0),
    bl: Number(element.dataset.cornerBl || 0)
  };
}

function rectangleCornerProfile(element) {
  const value = String(element?.dataset?.cornerProfile || "rounded").toLowerCase();
  return ["rounded", "bevel", "stepped", "continuous"].includes(value) ? value : "rounded";
}

function rectangleCornerSteps(element) {
  const value = Math.round(Number(element?.dataset?.cornerSteps || 2));
  return Math.max(2, Math.min(16, Number.isFinite(value) ? value : 2));
}

function rectangleContinuousExponent(element) {
  const value = Number(element?.dataset?.continuousExponent ?? 4.4);
  return Math.max(2, Math.min(10, Number.isFinite(value) ? value : 4.4));
}

function rectangleCornerMaxRadius(frame, profile = "rounded") {
  const width = Math.abs(Number(frame?.width || 0));
  const height = Math.abs(Number(frame?.height || 0));
  const shortest = Math.max(0, Math.min(width, height));
  const longest = Math.max(width, height);
  // Continuous corners use the value as an extent/strength control rather than
  // a literal circular radius. Let the value travel through the longest edge:
  // the curve can keep extending along a long side after the short-axis depth
  // has reached its geometric limit, and extra range continues to strengthen
  // the superellipse on square-ish shapes.
  return profile === "continuous" ? longest : shortest / 2;
}

function roundedRectanglePathD(frame, radii, profile = "rounded", steppedCount = 2, continuousExponent = 4.4) {
  const { x, y, width: w, height: h } = frame;
  const kind = ["rounded", "bevel", "stepped", "continuous"].includes(profile) ? profile : "rounded";
  const maxRadius = rectangleCornerMaxRadius(frame, kind);
  const rawR = {
    tl: Math.max(0, Math.min(maxRadius, Number(radii.tl || 0))),
    tr: Math.max(0, Math.min(maxRadius, Number(radii.tr || 0))),
    br: Math.max(0, Math.min(maxRadius, Number(radii.br || 0))),
    bl: Math.max(0, Math.min(maxRadius, Number(radii.bl || 0)))
  };
  const halfWidth = Math.max(0, Math.abs(w) / 2);
  const halfHeight = Math.max(0, Math.abs(h) / 2);
  const halfShortest = Math.max(1e-9, Math.min(halfWidth, halfHeight));
  const r = rawR;

  function cornerExtents(radius) {
    if (kind !== "continuous") return { x: radius, y: radius };
    return {
      x: Math.min(halfWidth, Math.max(0, radius)),
      y: Math.min(halfHeight, Math.max(0, radius))
    };
  }

  const ext = {
    tl: cornerExtents(rawR.tl),
    tr: cornerExtents(rawR.tr),
    br: cornerExtents(rawR.br),
    bl: cornerExtents(rawR.bl)
  };

  function corner(name, radius, rawRadius = radius) {
    if (!radius) {
      return {
        tr: `L ${x + w} ${y}`,
        br: `L ${x + w} ${y + h}`,
        bl: `L ${x} ${y + h}`,
        tl: `L ${x} ${y}`
      }[name];
    }

    if (kind === "bevel") {
      return {
        tr: `L ${x + w} ${y + radius}`,
        br: `L ${x + w - radius} ${y + h}`,
        bl: `L ${x} ${y + h - radius}`,
        tl: `L ${x + radius} ${y}`
      }[name];
    }

    if (kind === "stepped") {
      const count = Math.max(2, Math.min(16, Math.round(Number(steppedCount || 2))));
      const commands = [];
      for (let i = 1; i <= count; i++) {
        const t = i / count;
        if (name === "tr") {
          commands.push(`L ${x + w - radius + radius * t} ${y + radius * (i - 1) / count}`);
          commands.push(`L ${x + w - radius + radius * t} ${y + radius * t}`);
        } else if (name === "br") {
          commands.push(`L ${x + w - radius * (i - 1) / count} ${y + h - radius + radius * t}`);
          commands.push(`L ${x + w - radius * t} ${y + h - radius + radius * t}`);
        } else if (name === "bl") {
          commands.push(`L ${x + radius - radius * t} ${y + h - radius * (i - 1) / count}`);
          commands.push(`L ${x + radius - radius * t} ${y + h - radius * t}`);
        } else {
          commands.push(`L ${x + radius * (i - 1) / count} ${y + radius - radius * t}`);
          commands.push(`L ${x + radius * t} ${y + radius - radius * t}`);
        }
      }
      return commands.join(" ");
    }

    if (kind === "continuous") {
      // Continuous app-icon corner based on a superellipse rather than a
      // single cubic. Keep the exponent moderate so the corner begins turning
      // earlier and stays full/curvy instead of developing a sharp late turn.
      // Larger radius values can still flatten the profile slightly.
      // The sampled superellipse is converted to cubic segments so the result
      // remains smooth at normal and very high zoom levels.
      const beyondHalf = Math.max(0, (rawRadius - halfShortest) / halfShortest);
      // The base exponent is editable per rectangle. Preserve a small amount of
      // radius-driven flattening beyond the short-edge saturation point so the
      // expanded Continuous radius range still has a visible geometric effect.
      const baseExponent = Math.max(2, Math.min(10, Number(continuousExponent) || 4.4));
      const exponent = Math.min(10, baseExponent + beyondHalf * 0.35);
      const power = 2 / exponent;
      const segments = 18;
      const local = [];
      const extent = cornerExtents(rawRadius);

      for (let i = 0; i <= segments; i++) {
        const angle = (Math.PI / 2) * (i / segments);
        const sx = Math.pow(Math.sin(angle), power);
        const cy = Math.pow(Math.cos(angle), power);
        local.push({
          u: extent.x * sx,
          v: extent.y * (1 - cy)
        });
      }

      function mapPoint(point) {
        // The source quarter-superellipse runs from a horizontal tangent to a
        // vertical tangent. TR and BL follow that orientation directly. BR
        // and TL are entered from a vertical edge, so swap the normalized
        // superellipse axes before mapping them into the corner. Without that
        // swap those two diagonal corners bow in the opposite direction.
        const nu = extent.x > 1e-9 ? point.u / extent.x : 0;
        const nv = extent.y > 1e-9 ? point.v / extent.y : 0;
        if (name === "tr") return { x: x + w - extent.x + point.u, y: y + point.v };
        if (name === "br") return {
          x: x + w - extent.x * nv,
          y: y + h - extent.y + extent.y * nu
        };
        if (name === "bl") return { x: x + extent.x - point.u, y: y + h - point.v };
        return {
          x: x + extent.x * nv,
          y: y + extent.y - extent.y * nu
        };
      }

      const points = local.map(mapPoint);
      const commands = [];
      const fmt = value => Number(value.toFixed(4));

      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[Math.max(0, i - 1)];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[Math.min(points.length - 1, i + 2)];

        let c1 = {
          x: p1.x + (p2.x - p0.x) / 6,
          y: p1.y + (p2.y - p0.y) / 6
        };
        let c2 = {
          x: p2.x - (p3.x - p1.x) / 6,
          y: p2.y - (p3.y - p1.y) / 6
        };

        // Force exact tangency where the continuous corner meets the straight
        // edges. This avoids even a tiny shoulder at the joins.
        if (i === 0) {
          if (name === "tr" || name === "bl") c1.y = p1.y;
          else c1.x = p1.x;
        }
        if (i === points.length - 2) {
          if (name === "tr" || name === "bl") c2.x = p2.x;
          else c2.y = p2.y;
        }

        commands.push(`C ${fmt(c1.x)} ${fmt(c1.y)} ${fmt(c2.x)} ${fmt(c2.y)} ${fmt(p2.x)} ${fmt(p2.y)}`);
      }

      return commands.join(" ");
    }

    // Use true circular SVG arcs for the standard Rounded profile.
    // This guarantees exact quarter-circles at every radius; at the maximum
    // radius (half the shortest edge), the two quarters on each short end
    // combine into a mathematically exact semicircular pill cap.
    return {
      tr: `A ${radius} ${radius} 0 0 1 ${x + w} ${y + radius}`,
      br: `A ${radius} ${radius} 0 0 1 ${x + w - radius} ${y + h}`,
      bl: `A ${radius} ${radius} 0 0 1 ${x} ${y + h - radius}`,
      tl: `A ${radius} ${radius} 0 0 1 ${x + radius} ${y}`
    }[name];
  }

  return [
    `M ${x + ext.tl.x} ${y}`,
    `L ${x + w - ext.tr.x} ${y}`,
    corner("tr", r.tr, rawR.tr),
    `L ${x + w} ${y + h - ext.br.y}`,
    corner("br", r.br, rawR.br),
    `L ${x + ext.bl.x} ${y + h}`,
    corner("bl", r.bl, rawR.bl),
    `L ${x} ${y + ext.tl.y}`,
    corner("tl", r.tl, rawR.tl),
    "Z"
  ].join(" ");
}

function updateRoundedRectanglePath(element) {
  if (!element || element.dataset.roundedRect !== "true") return;

  const frame = rectangleFrame(element);
  const maxRadius = rectangleCornerMaxRadius(frame, rectangleCornerProfile(element));
  const radii = rectangleCornerRadii(element);

  for (const key of ["tl", "tr", "br", "bl"]) {
    radii[key] = Math.max(0, Math.min(maxRadius, radii[key]));
  }

  element.dataset.cornerTl = radii.tl;
  element.dataset.cornerTr = radii.tr;
  element.dataset.cornerBr = radii.br;
  element.dataset.cornerBl = radii.bl;
  element.setAttribute("d", roundedRectanglePathD(frame, radii, rectangleCornerProfile(element), rectangleCornerSteps(element), rectangleContinuousExponent(element)));
  applyObjectTransform(element);
}

function convertRectToCornerEditablePath(rect) {
  if (!rect || rect.tagName !== "rect") return rect;

  const path = document.createElementNS(SVG_NS, "path");

  [...rect.attributes].forEach(attr => {
    if (!["x", "y", "width", "height", "rx", "ry"].includes(attr.name)) {
      path.setAttribute(attr.name, attr.value);
    }
  });

  Object.entries(rect.dataset).forEach(([key, value]) => {
    path.dataset[key] = value;
  });

  const frame = rectangleFrame(rect);
  path.dataset.roundedRect = "true";
  path.dataset.closed = "true";
  path.dataset.shape = "true";
  path.dataset.rectX = frame.x;
  path.dataset.rectY = frame.y;
  path.dataset.rectWidth = frame.width;
  path.dataset.rectHeight = frame.height;
  path.dataset.cornerTl = 0;
  path.dataset.cornerTr = 0;
  path.dataset.cornerBr = 0;
  path.dataset.cornerBl = 0;
  path.dataset.cornerProfile = "rounded";
  path.dataset.cornerSteps = "2";
  path.dataset.continuousExponent = "4.4";
  path.setAttribute(
    "d",
    roundedRectanglePathD(frame, { tl: 0, tr: 0, br: 0, bl: 0 }, "rounded")
  );

  rect.replaceWith(path);

  selectedItems = selectedItems.map(item => item === rect ? path : item);
  if (selected === rect) selected = path;

  applyLayerState(path);
  applyObjectTransform(path);
  renderLayers();
  return path;
}

function rectangleCornerLocalPoint(element, corner) {
  const { x, y, width: w, height: h } = rectangleFrame(element);
  return {
    tl: { x, y },
    tr: { x: x + w, y },
    br: { x: x + w, y: y + h },
    bl: { x, y: y + h }
  }[corner];
}

function cornerInwardDirection(corner) {
  return {
    tl: { x: 1, y: 1 },
    tr: { x: -1, y: 1 },
    br: { x: -1, y: -1 },
    bl: { x: 1, y: -1 }
  }[corner];
}

function toggleRoundedCorner(corner) {
  if (!selected || selectedItems.length !== 1) return;

  if (selected.tagName === "rect") {
    selected = convertRectToCornerEditablePath(selected);
    selectedItems = [selected];
  }

  if (selected.dataset.roundedRect !== "true") return;

  if (roundedCornerSelection.has(corner)) {
    roundedCornerSelection.delete(corner);
  } else {
    roundedCornerSelection.add(corner);
  }

  drawSelection();
}


function primitiveVertexPoints(element) {
  if (!element) return [];

  if (
    element.tagName === "rect" ||
    element.dataset.roundedRect === "true"
  ) {
    const frame =
      rectangleFrame(element);

    return [
      { x: frame.x, y: frame.y },
      { x: frame.x + frame.width, y: frame.y },
      { x: frame.x + frame.width, y: frame.y + frame.height },
      { x: frame.x, y: frame.y + frame.height }
    ];
  }

  if (
    element.tagName === "polygon" ||
    element.dataset.roundedPolygon === "true"
  ) {
    return polygonVertices(element);
  }

  if (element.tagName === "ellipse") {
    const cx =
      Number(
        element.getAttribute("cx") || 0
      );

    const cy =
      Number(
        element.getAttribute("cy") || 0
      );

    const rx =
      Number(
        element.getAttribute("rx") || 0
      );

    const ry =
      Number(
        element.getAttribute("ry") || 0
      );

    return [
      { x: cx + rx, y: cy },
      { x: cx, y: cy + ry },
      { x: cx - rx, y: cy },
      { x: cx, y: cy - ry }
    ];
  }

  return [];
}

function drawPrimitiveVertexHandles(
  element
) {
  primitiveVertexPoints(
    element
  ).forEach(
    (point, index) => {
      const canvasPoint =
        canvasPointFromLocal(
          element,
          point.x,
          point.y
        );

      selectionOverlay.appendChild(
        svgEl(
          "rect",
          {
            x: canvasPoint.x - selectionScreenSpaceUnits(4.5),
            y: canvasPoint.y - selectionScreenSpaceUnits(4.5),
            width: selectionScreenSpaceUnits(9),
            height: selectionScreenSpaceUnits(9),
            rx: selectionScreenSpaceUnits(1),
            class:
              selectedAnchorIndices.has(index)
                ? "anchor-handle anchor-selected primitive-vertex-handle"
                : "anchor-handle primitive-vertex-handle",
            "data-primitive-vertex-index":
              index
          }
        )
      );
    }
  );
}

function convertPrimitiveForVertexDrag(
  element
) {
  if (!element) return null;

  /*
   * Rounded rectangle/polygon paths use a separate parametric corner model.
   * Convert their visible geometry into ordinary editable anchors before
   * allowing free vertex movement.
   */
  if (
    element.dataset.roundedRect === "true"
  ) {
    const frame =
      rectangleFrame(element);

    const proxy =
      document.createElementNS(
        SVG_NS,
        "rect"
      );

    copyElementAttributes(
      element,
      proxy
    );

    proxy.setAttribute(
      "x",
      frame.x
    );

    proxy.setAttribute(
      "y",
      frame.y
    );

    proxy.setAttribute(
      "width",
      frame.width
    );

    proxy.setAttribute(
      "height",
      frame.height
    );

    Object.entries(
      element.dataset
    ).forEach(
      ([key, value]) => {
        proxy.dataset[key] =
          value;
      }
    );

    element.replaceWith(
      proxy
    );

    selected = proxy;
    selectedItems = [proxy];

    return convertElementToPath(
      proxy
    );
  }

  if (
    element.dataset.roundedPolygon ===
      "true"
  ) {
    const proxy =
      document.createElementNS(
        SVG_NS,
        "polygon"
      );

    copyElementAttributes(
      element,
      proxy
    );

    proxy.setAttribute(
      "points",
      polygonVertices(element)
        .map(
          point =>
            `${point.x},${point.y}`
        )
        .join(" ")
    );

    Object.entries(
      element.dataset
    ).forEach(
      ([key, value]) => {
        proxy.dataset[key] =
          value;
      }
    );

    element.replaceWith(
      proxy
    );

    selected = proxy;
    selectedItems = [proxy];

    return convertElementToPath(
      proxy
    );
  }

  return convertElementToPath(
    element
  );
}

function beginPrimitiveVertexDrag(
  handle,
  point
) {
  if (
    !selected ||
    handle.dataset
      .primitiveVertexIndex ===
      undefined
  ) {
    return false;
  }

  const index =
    Number(
      handle.dataset
        .primitiveVertexIndex
    );

  const source =
    selected;

  const converted =
    convertPrimitiveForVertexDrag(
      source
    );

  if (
    !converted ||
    converted === source ||
    !Array.isArray(
      converted._anchors
    ) ||
    !converted._anchors[index]
  ) {
    return false;
  }

  selected = converted;
  selectedItems = [converted];

  if (
    !selectedAnchorIndices.has(
      index
    )
  ) {
    setVertexAnchorSelection(
      index,
      false
    );
  } else {
    selectedAnchorIndex =
      index;
  }

  const t =
    getTranslation(
      converted
    );

  editDrag = {
    type: "anchor",
    index,
    indices:
      [...selectedAnchorIndices],
    start: point,
    tx: t.x,
    ty: t.y
  };

  updatePropertyControls();
  renderLayers();

  return true;
}


function drawRectangleCornerControls() {
  if (!selected || !isCornerEditableRectangle(selected)) return;

  const radii = rectangleCornerRadii(selected);
  const baseInset = 14 / Math.max(zoom, 0.05);

  ["tl", "tr", "br", "bl"].forEach(corner => {
    const localCorner = rectangleCornerLocalPoint(selected, corner);
    const canvasCorner = canvasPointFromLocal(
      selected,
      localCorner.x,
      localCorner.y
    );

    const direction = cornerInwardDirection(corner);
    const selectorInset =
      10 /
      Math.max(
        zoom,
        0.05
      );

    const localSelector = {
      x:
        localCorner.x +
        direction.x *
          selectorInset,
      y:
        localCorner.y +
        direction.y *
          selectorInset
    };

    const canvasSelector =
      canvasPointFromLocal(
        selected,
        localSelector.x,
        localSelector.y
      );

    selectionOverlay.appendChild(svgEl("circle", {
      cx: canvasSelector.x,
      cy: canvasSelector.y,
      r: selectionScreenSpaceUnits(4),
      class: `corner-round-vertex corner-round-widget${roundedCornerSelection.has(corner) ? " active" : ""}`,
      "data-corner-select": corner
    }));

    if (!roundedCornerSelection.has(corner)) return;

    const distance = Math.max(
      baseInset + 8 / Math.max(zoom, 0.05),
      Number(radii[corner] || 0)
    );
    const localHandle = {
      x: localCorner.x + direction.x * distance,
      y: localCorner.y + direction.y * distance
    };
    const canvasHandle = canvasPointFromLocal(
      selected,
      localHandle.x,
      localHandle.y
    );

    selectionOverlay.appendChild(svgEl("line", {
      x1: canvasCorner.x,
      y1: canvasCorner.y,
      x2: canvasHandle.x,
      y2: canvasHandle.y,
      class: "corner-radius-line"
    }));

    selectionOverlay.appendChild(svgEl("circle", {
      cx: canvasHandle.x,
      cy: canvasHandle.y,
      r: selectionScreenSpaceUnits(5),
      class: "corner-radius-handle",
      "data-handle": "corner-radius",
      "data-radius-corner": corner
    }));
  });
}


const MIN_ROUNDABLE_CORNER_ANGLE = 25;

function isCornerEditablePolygon(element) {
  return Boolean(element) && (
    element.tagName === "polygon" ||
    element.dataset.roundedPolygon === "true"
  );
}

function polygonVertices(element) {
  if (element.dataset.roundedPolygon === "true") {
    try {
      const vertices = JSON.parse(element.dataset.polygonVertices || "[]");
      if (Array.isArray(vertices)) return vertices;
    } catch (error) {
      console.warn("Could not parse rounded polygon vertices.", error);
    }
  }

  if (element.tagName === "polygon") {
    return (element.getAttribute("points") || "")
      .trim()
      .split(/\s+/)
      .map(pair => pair.split(",").map(Number))
      .filter(pair => pair.length === 2 && pair.every(Number.isFinite))
      .map(([x, y]) => ({ x, y }));
  }

  return [];
}

function polygonCornerRadii(element, count = polygonVertices(element).length) {
  try {
    const values = JSON.parse(element.dataset.cornerRadii || "[]");
    if (Array.isArray(values) && values.length === count) {
      return values.map(value => Math.max(0, Number(value || 0)));
    }
  } catch (error) {
    console.warn("Could not parse polygon corner radii.", error);
  }

  return Array(count).fill(0);
}

function vectorLength(x, y) {
  return Math.hypot(x, y);
}

function polygonCornerAngle(points, index) {
  const count = points.length;
  if (count < 3) return 0;

  const prev = points[(index - 1 + count) % count];
  const curr = points[index];
  const next = points[(index + 1) % count];

  const ax = prev.x - curr.x;
  const ay = prev.y - curr.y;
  const bx = next.x - curr.x;
  const by = next.y - curr.y;

  const aLen = Math.max(1e-9, vectorLength(ax, ay));
  const bLen = Math.max(1e-9, vectorLength(bx, by));
  const dot = (ax * bx + ay * by) / (aLen * bLen);
  const clamped = Math.max(-1, Math.min(1, dot));

  return Math.acos(clamped) * 180 / Math.PI;
}

function isRoundablePolygonCorner(points, index) {
  return polygonCornerAngle(points, index) >= MIN_ROUNDABLE_CORNER_ANGLE;
}

function polygonCornerMaxRadius(points, index) {
  const count = points.length;
  if (count < 3 || !isRoundablePolygonCorner(points, index)) return 0;

  const prev = points[(index - 1 + count) % count];
  const curr = points[index];
  const next = points[(index + 1) % count];

  const prevLen = vectorLength(prev.x - curr.x, prev.y - curr.y);
  const nextLen = vectorLength(next.x - curr.x, next.y - curr.y);
  const angle = polygonCornerAngle(points, index) * Math.PI / 180;
  const tanHalf = Math.max(1e-6, Math.tan(angle / 2));

  /*
   * Radius r maps to tangent distance d = r / tan(theta/2).
   * Keep d below 45% of either adjacent edge so neighboring rounds do not
   * collide under ordinary editing.
   */
  const maxTangentDistance = Math.min(prevLen, nextLen) * 0.45;
  return Math.max(0, maxTangentDistance * tanHalf);
}

function roundedPolygonGeometry(points, radii) {
  const count = points.length;
  if (count < 3) return { d: "", tangents: [] };

  const tangents = points.map((curr, index) => {
    const prev = points[(index - 1 + count) % count];
    const next = points[(index + 1) % count];
    const angle = polygonCornerAngle(points, index) * Math.PI / 180;
    const radius = isRoundablePolygonCorner(points, index)
      ? Math.min(
          Math.max(0, Number(radii[index] || 0)),
          polygonCornerMaxRadius(points, index)
        )
      : 0;

    const prevDx = prev.x - curr.x;
    const prevDy = prev.y - curr.y;
    const nextDx = next.x - curr.x;
    const nextDy = next.y - curr.y;
    const prevLen = Math.max(1e-9, vectorLength(prevDx, prevDy));
    const nextLen = Math.max(1e-9, vectorLength(nextDx, nextDy));

    const tangentDistance = radius > 0
      ? Math.min(
          radius / Math.max(1e-6, Math.tan(angle / 2)),
          prevLen * 0.45,
          nextLen * 0.45
        )
      : 0;

    return {
      radius,
      incoming: {
        x: curr.x + (prevDx / prevLen) * tangentDistance,
        y: curr.y + (prevDy / prevLen) * tangentDistance
      },
      outgoing: {
        x: curr.x + (nextDx / nextLen) * tangentDistance,
        y: curr.y + (nextDy / nextLen) * tangentDistance
      }
    };
  });

  let d = `M ${tangents[0].outgoing.x} ${tangents[0].outgoing.y}`;

  for (let step = 1; step <= count; step++) {
    const index = step % count;
    const curr = points[index];
    const tangent = tangents[index];

    d += ` L ${tangent.incoming.x} ${tangent.incoming.y}`;

    if (tangent.radius > 0) {
      d += ` Q ${curr.x} ${curr.y} ${tangent.outgoing.x} ${tangent.outgoing.y}`;
    } else {
      d += ` L ${curr.x} ${curr.y}`;
    }
  }

  d += " Z";
  return { d, tangents };
}

function updateRoundedPolygonPath(element) {
  if (!element || element.dataset.roundedPolygon !== "true") return;

  const points = polygonVertices(element);
  const radii = polygonCornerRadii(element, points.length).map((radius, index) =>
    Math.min(radius, polygonCornerMaxRadius(points, index))
  );

  element.dataset.cornerRadii = JSON.stringify(radii);
  element.setAttribute("d", roundedPolygonGeometry(points, radii).d);
  applyObjectTransform(element);
}

function convertPolygonToCornerEditablePath(polygon) {
  if (!polygon || polygon.tagName !== "polygon") return polygon;

  const points = polygonVertices(polygon);
  const path = document.createElementNS(SVG_NS, "path");

  [...polygon.attributes].forEach(attr => {
    if (attr.name !== "points") {
      path.setAttribute(attr.name, attr.value);
    }
  });

  Object.entries(polygon.dataset).forEach(([key, value]) => {
    path.dataset[key] = value;
  });

  path.dataset.roundedPolygon = "true";
  path.dataset.closed = "true";
  path.dataset.shape = "true";
  path.dataset.polygonVertices = JSON.stringify(points);
  path.dataset.cornerRadii = JSON.stringify(Array(points.length).fill(0));
  path.setAttribute(
    "d",
    roundedPolygonGeometry(points, Array(points.length).fill(0)).d
  );

  polygon.replaceWith(path);

  selectedItems = selectedItems.map(item => item === polygon ? path : item);
  if (selected === polygon) selected = path;

  applyLayerState(path);
  applyObjectTransform(path);
  renderLayers();

  return path;
}

function polygonCornerBisectorPoint(points, index, distance) {
  const count = points.length;
  const prev = points[(index - 1 + count) % count];
  const curr = points[index];
  const next = points[(index + 1) % count];

  const ax = prev.x - curr.x;
  const ay = prev.y - curr.y;
  const bx = next.x - curr.x;
  const by = next.y - curr.y;
  const aLen = Math.max(1e-9, vectorLength(ax, ay));
  const bLen = Math.max(1e-9, vectorLength(bx, by));

  let dx = ax / aLen + bx / bLen;
  let dy = ay / aLen + by / bLen;
  const len = Math.max(1e-9, vectorLength(dx, dy));

  dx /= len;
  dy /= len;

  /*
   * The summed unit vectors point into the smaller wedge. For the regular
   * polygon/star primitives in this editor that is the intended interior
   * direction for the rounding handle.
   */
  return {
    x: curr.x + dx * distance,
    y: curr.y + dy * distance
  };
}

function togglePolygonCorner(index) {
  if (!selected || selectedItems.length !== 1) return;

  if (selected.tagName === "polygon") {
    selected = convertPolygonToCornerEditablePath(selected);
    selectedItems = [selected];
  }

  if (selected.dataset.roundedPolygon !== "true") return;

  const points = polygonVertices(selected);
  if (!isRoundablePolygonCorner(points, index)) return;

  const key = `p${index}`;
  if (roundedCornerSelection.has(key)) {
    roundedCornerSelection.delete(key);
  } else {
    roundedCornerSelection.add(key);
  }

  drawSelection();
}

function drawPolygonCornerControls() {
  if (!selected || !isCornerEditablePolygon(selected)) return;

  const points = polygonVertices(selected);
  const radii = polygonCornerRadii(selected, points.length);
  const baseInset = 14 / Math.max(zoom, 0.05);

  points.forEach((point, index) => {
    const roundable = isRoundablePolygonCorner(points, index);
    const key = `p${index}`;
    const active = roundedCornerSelection.has(key);
    const canvasCorner = canvasPointFromLocal(selected, point.x, point.y);

    const selectorInset =
      10 /
      Math.max(
        zoom,
        0.05
      );

    const localSelector =
      polygonCornerBisectorPoint(
        points,
        index,
        selectorInset
      );

    const canvasSelector =
      canvasPointFromLocal(
        selected,
        localSelector.x,
        localSelector.y
      );

    selectionOverlay.appendChild(svgEl("circle", {
      cx: canvasSelector.x,
      cy: canvasSelector.y,
      r: 4,
      class:
        `corner-round-vertex corner-round-widget${active ? " active" : ""}` +
        `${roundable ? "" : " disabled"}`,
      "data-polygon-corner-select": index
    }));

    if (!roundable || !active) return;

    const radius = Number(radii[index] || 0);
    const handleDistance = Math.max(
      baseInset + 8 / Math.max(zoom, 0.05),
      radius
    );
    const localHandle = polygonCornerBisectorPoint(
      points,
      index,
      handleDistance
    );
    const canvasHandle = canvasPointFromLocal(
      selected,
      localHandle.x,
      localHandle.y
    );

    selectionOverlay.appendChild(svgEl("line", {
      x1: canvasCorner.x,
      y1: canvasCorner.y,
      x2: canvasHandle.x,
      y2: canvasHandle.y,
      class: "corner-radius-line"
    }));

    selectionOverlay.appendChild(svgEl("circle", {
      cx: canvasHandle.x,
      cy: canvasHandle.y,
      r: selectionScreenSpaceUnits(5),
      class: "corner-radius-handle",
      "data-handle": "polygon-corner-radius",
      "data-radius-index": index
    }));
  });
}

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

function addHandle(x, y, kind, cursorClass = "") {
  const half = selectionScreenSpaceUnits(4);
  const size = selectionScreenSpaceUnits(8);
  const h = svgEl("rect", {
    x: x - half,
    y: y - half,
    width: size,
    height: size,
    rx: selectionScreenSpaceUnits(1),
    class: `vector-handle ${cursorClass}`,
    "data-handle": kind
  });
  selectionOverlay.appendChild(h);
}



function selectedVertexRefKey(
  ref
) {
  return ref
    ? `${ref.pathId}:${ref.anchor}`
    : "";
}

function selectedVertexRefsPruned() {
  selectedVertexRefs =
    selectedVertexRefs.filter(
      ref => {
        const path =
          pathForConstraintId(
            ref.pathId
          );

        return Boolean(
          path &&
          Array.isArray(
            path._anchors
          ) &&
          path._anchors[
            ref.anchor
          ]
        );
      }
    );

  return [
    ...selectedVertexRefs
  ];
}

function clearSelectedVertexRefs() {
  selectedVertexRefs =
    [];
}

function selectedVertexRefForPathAnchor(
  path,
  index
) {
  if (
    !path ||
    path.tagName !==
      "path"
  ) {
    return null;
  }

  return {
    pathId:
      ensurePathConstraintId(
        path
      ),
    anchor:
      Number(index)
  };
}

function toggleSelectedVertexRef(
  path,
  index,
  additive
) {
  const ref =
    selectedVertexRefForPathAnchor(
      path,
      index
    );

  if (
    !ref ||
    !Number.isInteger(
      ref.anchor
    ) ||
    !path._anchors?.[
      ref.anchor
    ]
  ) {
    return;
  }

  const key =
    selectedVertexRefKey(
      ref
    );

  if (!additive) {
    selectedVertexRefs = [
      ref
    ];
  } else {
    const existing =
      selectedVertexRefs.findIndex(
        item =>
          selectedVertexRefKey(
            item
          ) ===
          key
      );

    if (
      existing >= 0
    ) {
      selectedVertexRefs.splice(
        existing,
        1
      );
    } else {
      selectedVertexRefs.push(
        ref
      );
    }
  }
}

function selectedConstraintVertexRefs() {
  return selectedVertexRefsPruned();
}

function selectedVertexRefIsSelected(
  path,
  index
) {
  const ref =
    selectedVertexRefForPathAnchor(
      path,
      index
    );

  if (!ref) return false;

  const key =
    selectedVertexRefKey(
      ref
    );

  return selectedVertexRefsPruned()
    .some(
      item =>
        selectedVertexRefKey(
          item
        ) ===
        key
    );
}

function drawSelectedPathsVertexHandles() {
  if (
    activeTool !==
      "vertex"
  ) {
    return;
  }

  selectedItems
    .filter(
      path =>
        path &&
        path.tagName ===
          "path"
    )
    .forEach(
      path => {
        normalizePathForEditing(
          path
        );

        if (
          !Array.isArray(
            path._anchors
          )
        ) {
          return;
        }

        ensurePathConstraintId(
          path
        );

        path._anchors.forEach(
          (
            anchor,
            index
          ) => {
            const point =
              canvasPointFromLocal(
                path,
                anchor.x,
                anchor.y
              );

            const selectedRef =
              selectedVertexRefIsSelected(
                path,
                index
              );

            const handle =
              svgEl(
                "rect",
                {
                  x:
                    point.x -
                    selectionScreenSpaceUnits(4.5),
                  y:
                    point.y -
                    selectionScreenSpaceUnits(4.5),
                  width:
                    selectionScreenSpaceUnits(9),
                  height:
                    selectionScreenSpaceUnits(9),
                  class:
                    selectedRef
                      ? "anchor-handle anchor-selected"
                      : "anchor-handle",
                  "data-anchor-index":
                    index,
                  "data-multipath-vertex":
                    "true"
                }
              );

            handle.__vertexOwnerPath =
              path;

            selectionOverlay.appendChild(
              handle
            );
          }
        );
      }
    );
}


function setVertexAnchorSelection(
  index,
  additive = false
) {
  const nextIndex =
    Number(index);

  if (!Number.isInteger(nextIndex)) {
    return;
  }

  if (additive) {
    if (
      selectedAnchorIndices.has(
        nextIndex
      )
    ) {
      selectedAnchorIndices.delete(
        nextIndex
      );

      if (
        selectedAnchorIndex ===
        nextIndex
      ) {
        selectedAnchorIndex =
          [...selectedAnchorIndices]
            .at(-1) ?? null;
      }
    } else {
      selectedAnchorIndices.add(
        nextIndex
      );

      selectedAnchorIndex =
        nextIndex;
    }
  } else {
    selectedAnchorIndices =
      new Set([nextIndex]);

    selectedAnchorIndex =
      nextIndex;
  }

  if (
    selected &&
    selected.tagName ===
      "path"
  ) {
    toggleSelectedVertexRef(
      selected,
      nextIndex,
      additive
    );
  }

  /*
   * Vertex Selection is the source of truth for CAD constraints.
   * Any normal anchor selection immediately becomes visible to the
   * constraint maker rather than requiring a second private picker state.
   */
  if (
    geometryConstraintsPanelRequested &&
    selectedConstraintVertexRefs().length === 2
  ) {
    constraintMakerSelectionFromCurrentVertexSelection();
  }
}

function vertexPointsForElement(
  element
) {
  if (!element) return [];

  if (
    element.tagName === "path" &&
    Array.isArray(element._anchors)
  ) {
    return element._anchors.map(
      (anchor, index) => ({
        index,
        x: anchor.x,
        y: anchor.y
      })
    );
  }

  return primitiveVertexPoints(
    element
  ).map(
    (point, index) => ({
      index,
      x: point.x,
      y: point.y
    })
  );
}

function vertexIndicesInsideBounds(
  element,
  bounds
) {
  return vertexPointsForElement(
    element
  )
    .filter(vertex => {
      const point =
        canvasPointFromLocal(
          element,
          vertex.x,
          vertex.y
        );

      return pointInRect(
        point,
        bounds
      );
    })
    .map(vertex =>
      vertex.index
    );
}

function currentVertexMarqueeBounds(
  point
) {
  if (!vertexMarquee) {
    return null;
  }

  return {
    left: Math.min(
      vertexMarquee.start.x,
      point.x
    ),
    top: Math.min(
      vertexMarquee.start.y,
      point.y
    ),
    right: Math.max(
      vertexMarquee.start.x,
      point.x
    ),
    bottom: Math.max(
      vertexMarquee.start.y,
      point.y
    )
  };
}

function beginVertexMarquee(
  point,
  additive
) {
  const paths =
    selectedItems.filter(
      item =>
        item?.tagName ===
          "path"
    );

  if (!paths.length) {
    return false;
  }

  vertexMarquee = {
    start:
      point,
    current:
      point,
    additive,
    baseRefs:
      additive
        ? selectedVertexRefsPruned()
        : []
  };

  if (!additive) {
    clearSelectedVertexRefs();
    selectedAnchorIndices.clear();
    selectedAnchorIndex =
      null;
  }

  return true;
}


function updateVertexMarquee(
  point
) {
  if (!vertexMarquee) {
    return;
  }

  vertexMarquee.current =
    point;

  const bounds =
    currentVertexMarqueeBounds(
      point
    );

  const hitRefs =
    [];

  selectedItems
    .filter(
      item =>
        item?.tagName ===
          "path"
    )
    .forEach(
      path => {
        normalizePathForEditing(
          path
        );

        const pathId =
          ensurePathConstraintId(
            path
          );

        vertexIndicesInsideBounds(
          path,
          bounds
        ).forEach(
          index => {
            hitRefs.push({
              pathId,
              anchor:
                index
            });
          }
        );
      }
    );

  const map =
    new Map();

  [
    ...vertexMarquee.baseRefs,
    ...hitRefs
  ].forEach(
    ref => {
      map.set(
        selectedVertexRefKey(
          ref
        ),
        ref
      );
    }
  );

  selectedVertexRefs =
    [
      ...map.values()
    ];

  if (
    selected &&
    selected.tagName ===
      "path"
  ) {
    const selectedPathId =
      ensurePathConstraintId(
        selected
      );

    const indices =
      selectedVertexRefs
        .filter(
          ref =>
            ref.pathId ===
              selectedPathId
        )
        .map(
          ref =>
            ref.anchor
        );

    selectedAnchorIndices =
      new Set(
        indices
      );

    selectedAnchorIndex =
      indices.at(-1) ??
      null;
  }

  drawSelection();
  drawMarquee(
    bounds
  );
}


function selectionScreenSpaceUnits(pixels) {
  return Number(pixels) / Math.max(Number(zoom) || 1, 0.05);
}

function addAnchorHandle(x, y, index) {
  const isSelected =
    selectedAnchorIndices.has(index) ||
    index === selectedAnchorIndex;

  const half = selectionScreenSpaceUnits(4.5);
  const size = selectionScreenSpaceUnits(9);
  const h = svgEl("rect", {
    x: x - half,
    y: y - half,
    width: size,
    height: size,
    class:
      isSelected
        ? "anchor-handle anchor-selected"
        : "anchor-handle",
    "data-anchor-index": index
  });
  selectionOverlay.appendChild(h);
}

function addControlHandle(ax, ay, x, y, index, side) {
  if (Math.hypot(x - ax, y - ay) < 0.5) return;

  selectionOverlay.appendChild(svgEl("line", {
    x1: ax, y1: ay, x2: x, y2: y, class: "control-line"
  }));

  selectionOverlay.appendChild(svgEl("circle", {
    cx: x, cy: y, r: selectionScreenSpaceUnits(4),
    class: "control-handle",
    "data-control-index": index,
    "data-control-side": side
  }));
}

function drawPathHandles() {
  const anchors = selected._anchors || [];

  anchors.forEach((a, i) => {
    const anchor = canvasPointFromLocal(selected, a.x, a.y);
    const inPoint = canvasPointFromLocal(selected, a.inX, a.inY);
    const outPoint = canvasPointFromLocal(selected, a.outX, a.outY);

    addControlHandle(
      anchor.x, anchor.y,
      inPoint.x, inPoint.y,
      i, "in"
    );

    addControlHandle(
      anchor.x, anchor.y,
      outPoint.x, outPoint.y,
      i, "out"
    );
  });

  anchors.forEach((a, i) => {
    const p = canvasPointFromLocal(selected, a.x, a.y);
    addAnchorHandle(p.x, p.y, i);
  });


  if (activeTool === "vertex") {
    drawPathLiveCornerControls();
  }

  if (
    activeTool === "pen" &&
    activePath === selected &&
    anchors.length >= 2
  ) {
    const first = canvasPointFromLocal(
      selected,
      anchors[0].x,
      anchors[0].y
    );

    const closeTarget = svgEl("circle", {
      cx: first.x,
      cy: first.y,
      r: selectionScreenSpaceUnits(8),
      class: "pen-close-target",
      "data-pen-close": "true"
    });

    selectionOverlay.appendChild(closeTarget);
  }

  if (activeTool === "select" && activePath !== selected) {
    drawRotationHandleForSelected();
  }
}

function elementCanvasBounds(element) {
  const box =
    editableLocalBounds(
      element
    );

  const corners = [
    canvasPointFromLocal(element, box.x, box.y),
    canvasPointFromLocal(element, box.x + box.width, box.y),
    canvasPointFromLocal(element, box.x + box.width, box.y + box.height),
    canvasPointFromLocal(element, box.x, box.y + box.height)
  ];

  return {
    left: Math.min(...corners.map(p => p.x)),
    top: Math.min(...corners.map(p => p.y)),
    right: Math.max(...corners.map(p => p.x)),
    bottom: Math.max(...corners.map(p => p.y))
  };
}

function rectsIntersect(a, b) {
  return !(
    a.right < b.left ||
    a.left > b.right ||
    a.bottom < b.top ||
    a.top > b.bottom
  );
}

function pointInRect(point, rect) {
  return (
    point.x >= rect.left &&
    point.x <= rect.right &&
    point.y >= rect.top &&
    point.y <= rect.bottom
  );
}

function expandRect(rect, amount) {
  return {
    left: rect.left - amount,
    top: rect.top - amount,
    right: rect.right + amount,
    bottom: rect.bottom + amount
  };
}

function orientation(a, b, c) {
  const value =
    (b.y - a.y) * (c.x - b.x) -
    (b.x - a.x) * (c.y - b.y);

  if (Math.abs(value) < 1e-9) return 0;
  return value > 0 ? 1 : 2;
}

function onSegment(a, b, c) {
  return (
    b.x <= Math.max(a.x, c.x) + 1e-9 &&
    b.x >= Math.min(a.x, c.x) - 1e-9 &&
    b.y <= Math.max(a.y, c.y) + 1e-9 &&
    b.y >= Math.min(a.y, c.y) - 1e-9
  );
}

function segmentsIntersect(p1, q1, p2, q2) {
  const o1 = orientation(p1, q1, p2);
  const o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1);
  const o4 = orientation(p2, q2, q1);

  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;

  return false;
}

function segmentIntersectsRect(a, b, rect) {
  if (pointInRect(a, rect) || pointInRect(b, rect)) return true;

  const tl = { x: rect.left, y: rect.top };
  const tr = { x: rect.right, y: rect.top };
  const br = { x: rect.right, y: rect.bottom };
  const bl = { x: rect.left, y: rect.bottom };

  return (
    segmentsIntersect(a, b, tl, tr) ||
    segmentsIntersect(a, b, tr, br) ||
    segmentsIntersect(a, b, br, bl) ||
    segmentsIntersect(a, b, bl, tl)
  );
}

function localPoint(element, point) {
  const t = getTranslation(element);
  return {
    x: point.x - t.x,
    y: point.y - t.y
  };
}

function marqueeCorners(rect) {
  return [
    { x: rect.left, y: rect.top },
    { x: rect.right, y: rect.top },
    { x: rect.right, y: rect.bottom },
    { x: rect.left, y: rect.bottom }
  ];
}

function ellipseIntersectsRect(element, rect) {
  const t = getTranslation(element);
  const cx = Number(element.getAttribute("cx")) + t.x;
  const cy = Number(element.getAttribute("cy")) + t.y;
  const rx = Math.abs(Number(element.getAttribute("rx")));
  const ry = Math.abs(Number(element.getAttribute("ry")));

  if (rx <= 0 || ry <= 0) return false;

  const fillValue = element.getAttribute("fill");
  const hasFill = fillValue && fillValue !== "none";
  const strokeWidthValue = Number(element.getAttribute("stroke-width") || 0);
  const hasStroke =
    element.getAttribute("stroke") &&
    element.getAttribute("stroke") !== "none" &&
    strokeWidthValue > 0;

  const nearestX = Math.max(rect.left, Math.min(cx, rect.right));
  const nearestY = Math.max(rect.top, Math.min(cy, rect.bottom));

  const normalized =
    ((nearestX - cx) ** 2) / (rx ** 2) +
    ((nearestY - cy) ** 2) / (ry ** 2);

  if (hasFill && normalized <= 1) return true;

  if (hasStroke) {
    const outerRx = rx + strokeWidthValue / 2;
    const outerRy = ry + strokeWidthValue / 2;
    const innerRx = Math.max(0.0001, rx - strokeWidthValue / 2);
    const innerRy = Math.max(0.0001, ry - strokeWidthValue / 2);

    const outer =
      ((nearestX - cx) ** 2) / (outerRx ** 2) +
      ((nearestY - cy) ** 2) / (outerRy ** 2);

    if (outer <= 1) {
      const corners = marqueeCorners(rect);
      const allDeepInside = corners.every(p => {
        const value =
          ((p.x - cx) ** 2) / (innerRx ** 2) +
          ((p.y - cy) ** 2) / (innerRy ** 2);
        return value < 1;
      });

      if (!allDeepInside) return true;
    }
  }

  return false;
}

function lineIntersectsRect(element, rect) {
  const t = getTranslation(element);
  const halfStroke = Number(element.getAttribute("stroke-width") || 0) / 2;
  const hitRect = expandRect(rect, halfStroke);

  return segmentIntersectsRect(
    {
      x: Number(element.getAttribute("x1")) + t.x,
      y: Number(element.getAttribute("y1")) + t.y
    },
    {
      x: Number(element.getAttribute("x2")) + t.x,
      y: Number(element.getAttribute("y2")) + t.y
    },
    hitRect
  );
}

function pathIntersectsRect(element, rect) {
  const t = getTranslation(element);
  const strokeWidthValue = Number(element.getAttribute("stroke-width") || 0);
  const hasStroke =
    element.getAttribute("stroke") &&
    element.getAttribute("stroke") !== "none" &&
    strokeWidthValue > 0;

  const fillValue = element.getAttribute("fill");
  const hasFill = fillValue && fillValue !== "none";
  const strokeRect = expandRect(rect, hasStroke ? strokeWidthValue / 2 : 0);

  let length = 0;
  try {
    length = element.getTotalLength();
  } catch {
    return false;
  }

  if (!Number.isFinite(length) || length <= 0) return false;

  const steps = Math.max(24, Math.min(300, Math.ceil(length / 6)));
  let previous = null;

  for (let i = 0; i <= steps; i++) {
    const p = element.getPointAtLength((length * i) / steps);
    const current = { x: p.x + t.x, y: p.y + t.y };

    if (pointInRect(current, hasStroke ? strokeRect : rect)) {
      return true;
    }

    if (previous && segmentIntersectsRect(previous, current, hasStroke ? strokeRect : rect)) {
      return true;
    }

    previous = current;
  }

  if (hasFill && typeof element.isPointInFill === "function") {
    for (const corner of marqueeCorners(rect)) {
      const lp = localPoint(element, corner);
      const p = new DOMPoint(lp.x, lp.y);
      try {
        if (element.isPointInFill(p)) return true;
      } catch {
        break;
      }
    }
  }

  return false;
}

function rectShapeIntersectsRect(element, rect) {
  const t = getTranslation(element);
  const x = Number(element.getAttribute("x")) + t.x;
  const y = Number(element.getAttribute("y")) + t.y;
  const width = Math.abs(Number(element.getAttribute("width")));
  const height = Math.abs(Number(element.getAttribute("height")));

  const shapeRect = {
    left: x,
    top: y,
    right: x + width,
    bottom: y + height
  };

  const fillValue = element.getAttribute("fill");
  const hasFill = fillValue && fillValue !== "none";
  const strokeWidthValue = Number(element.getAttribute("stroke-width") || 0);
  const hasStroke =
    element.getAttribute("stroke") &&
    element.getAttribute("stroke") !== "none" &&
    strokeWidthValue > 0;

  if (hasFill && rectsIntersect(shapeRect, rect)) return true;

  if (hasStroke) {
    const outer = expandRect(shapeRect, strokeWidthValue / 2);
    if (!rectsIntersect(outer, rect)) return false;

    const inner = {
      left: shapeRect.left + strokeWidthValue / 2,
      top: shapeRect.top + strokeWidthValue / 2,
      right: shapeRect.right - strokeWidthValue / 2,
      bottom: shapeRect.bottom - strokeWidthValue / 2
    };

    if (
      inner.left >= inner.right ||
      inner.top >= inner.bottom
    ) {
      return true;
    }

    const marqueeFullyInsideInner =
      rect.left > inner.left &&
      rect.right < inner.right &&
      rect.top > inner.top &&
      rect.bottom < inner.bottom;

    return !marqueeFullyInsideInner;
  }

  return false;
}

function shapeIntersectsMarquee(element, rect) {
  if (!element || !element.isConnected) return false;

  if (isGroup(element)) {
    return rectsIntersect(elementCanvasBounds(element), rect);
  }

  if (Math.abs(getRotation(element)) > 0.0001) {
    const steps = 10;

    for (let i = 0; i <= steps; i++) {
      const x = rect.left + (rect.right - rect.left) * (i / steps);
      if (
        pointInsideShape(element, { x, y: rect.top }) ||
        pointInsideShape(element, { x, y: rect.bottom })
      ) {
        return true;
      }
    }

    for (let i = 0; i <= steps; i++) {
      const y = rect.top + (rect.bottom - rect.top) * (i / steps);
      if (
        pointInsideShape(element, { x: rect.left, y }) ||
        pointInsideShape(element, { x: rect.right, y })
      ) {
        return true;
      }
    }

    const b = elementCanvasBounds(element);
    if (
      pointInRect({ x: b.left, y: b.top }, rect) ||
      pointInRect({ x: b.right, y: b.bottom }, rect)
    ) {
      return true;
    }
  }

  if (element.tagName === "polygon") {
    const t = getTranslation(element);
    const points = (element.getAttribute("points") || "")
      .trim()
      .split(/\s+/)
      .map(pair => pair.split(",").map(Number))
      .filter(pair => pair.length === 2 && pair.every(Number.isFinite))
      .map(([x, y]) => canvasPointFromLocal(element, x, y));

    if (points.some(point => pointInRect(point, rect))) return true;

    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      if (segmentIntersectsRect(a, b, rect)) return true;
    }

    const corners = marqueeCorners(rect);
    return corners.some(point => pointInsideShape(element, point));
  }

  if (element.tagName === "rect") {
    return rectShapeIntersectsRect(element, rect);
  }

  if (element.tagName === "ellipse") {
    return ellipseIntersectsRect(element, rect);
  }

  if (element.tagName === "line") {
    return lineIntersectsRect(element, rect);
  }

  if (element.tagName === "path") {
    return pathIntersectsRect(element, rect);
  }

  if (element.dataset.compoundShape === "true") {
    const t = getTranslation(element);

    return [...element.querySelectorAll("path")].some(child => {
      const originalTx = child.dataset.tx;
      const originalTy = child.dataset.ty;

      child.dataset.tx = t.x;
      child.dataset.ty = t.y;

      const hit = pathIntersectsRect(child, rect);

      if (originalTx === undefined) delete child.dataset.tx;
      else child.dataset.tx = originalTx;

      if (originalTy === undefined) delete child.dataset.ty;
      else child.dataset.ty = originalTy;

      return hit;
    });
  }

  return false;
}

function currentMarqueeBounds(point) {
  return {
    left: Math.min(marqueeStart.x, point.x),
    top: Math.min(marqueeStart.y, point.y),
    right: Math.max(marqueeStart.x, point.x),
    bottom: Math.max(marqueeStart.y, point.y)
  };
}

function drawMarquee(bounds) {
  const old = selectionOverlay.querySelector("#marqueeSelection");
  if (old) old.remove();

  const rect = svgEl("rect", {
    id: "marqueeSelection",
    x: bounds.left,
    y: bounds.top,
    width: bounds.right - bounds.left,
    height: bounds.bottom - bounds.top,
    fill: "#7c3aed",
    "fill-opacity": "0.10",
    stroke: "#7c3aed",
    "stroke-width": 1,
    "stroke-dasharray": "5 3",
    "vector-effect": "non-scaling-stroke",
    "pointer-events": "none"
  });

  selectionOverlay.appendChild(rect);
}


function styleSelectionSilhouetteNode(node, primary = false) {
  if (!node || node.nodeType !== 1) return;

  const drawableTags = new Set([
    "rect", "ellipse", "circle", "line",
    "polygon", "polyline", "path"
  ]);

  if (drawableTags.has(node.tagName)) {
    node.removeAttribute("id");
    node.removeAttribute("data-object");
    node.removeAttribute("data-name");
    node.removeAttribute("data-handle");
    node.setAttribute("fill", "none");
    node.setAttribute(
      "stroke",
      primary ? "#22d3ee" : "#a78bfa"
    );
    node.setAttribute(
      "stroke-width",
      primary ? "3" : "2.25"
    );
    node.setAttribute("stroke-opacity", "1");
    node.setAttribute("vector-effect", "non-scaling-stroke");
    node.setAttribute("pointer-events", "none");
    node.classList.add("selection-silhouette");
    if (primary) node.classList.add("primary-selection-silhouette");
  }

  [...node.children].forEach(child =>
    styleSelectionSilhouetteNode(child, primary)
  );
}

function drawSelectionSilhouette(element, primary = false) {
  if (!element || !element.isConnected) return;

  const clone = element.cloneNode(true);
  clone.removeAttribute("data-object");
  clone.removeAttribute("data-name");
  clone.setAttribute("pointer-events", "none");
  clone.classList.add("selection-silhouette-root");

  styleSelectionSilhouetteNode(clone, primary);

  // A child selected explicitly from Layers remains inside its SVG group.
  // Recreate the ancestor transform wrappers so its selection silhouette is
  // drawn at the child's current world position rather than its stale/local
  // pre-group coordinates.
  const ancestors = [];
  let parent = element.parentElement;
  while (parent && parent !== art && parent !== svg) {
    if (parent instanceof SVGGraphicsElement && parent.hasAttribute("transform")) {
      ancestors.unshift(parent);
    }
    parent = parent.parentElement;
  }

  let root = clone;
  [...ancestors].reverse().forEach(ancestor => {
    const wrapper = svgEl("g", {
      transform: ancestor.getAttribute("transform") || "",
      "pointer-events": "none"
    });
    wrapper.appendChild(root);
    root = wrapper;
  });

  selectionOverlay.appendChild(root);
}

function multiSelectionFrameMatchesSelection(frame = multiSelectionFrame) {
  if (!frame || !Array.isArray(frame.items)) return false;
  const items = selectedItems.filter(element => element?.isConnected);
  return (
    items.length === frame.items.length &&
    items.every((element, index) => element === frame.items[index])
  );
}

function ensureMultiSelectionFrame() {
  if (selectedItems.length < 2) {
    multiSelectionFrame = null;
    return null;
  }

  if (multiSelectionFrameMatchesSelection()) {
    return multiSelectionFrame;
  }

  const bounds = selectionUnionCanvasBounds();
  if (!bounds) {
    multiSelectionFrame = null;
    return null;
  }

  const pad = 5 / Math.max(zoom, 0.05);
  multiSelectionFrame = {
    items: selectedItems.filter(element => element?.isConnected),
    center: {
      x: (bounds.left + bounds.right) / 2,
      y: (bounds.top + bounds.bottom) / 2
    },
    width: Math.max(0.001, bounds.right - bounds.left + pad * 2),
    height: Math.max(0.001, bounds.bottom - bounds.top + pad * 2),
    angle: 0
  };

  return multiSelectionFrame;
}

function multiSelectionFramePoints(frame) {
  if (!frame) return null;
  const hw = frame.width / 2;
  const hh = frame.height / 2;
  const center = frame.center;
  const point = (x, y) =>
    rotatePoint(
      { x: center.x + x, y: center.y + y },
      center,
      frame.angle || 0
    );

  const nw = point(-hw, -hh);
  const ne = point(hw, -hh);
  const se = point(hw, hh);
  const sw = point(-hw, hh);
  return {
    nw, ne, se, sw,
    n: { x: (nw.x + ne.x) / 2, y: (nw.y + ne.y) / 2 },
    e: { x: (ne.x + se.x) / 2, y: (ne.y + se.y) / 2 },
    s: { x: (sw.x + se.x) / 2, y: (sw.y + se.y) / 2 },
    w: { x: (nw.x + sw.x) / 2, y: (nw.y + sw.y) / 2 },
    center
  };
}

function drawMultiSelectionOutlines() {
  selectedItems.forEach(element => {
    if (!element.isConnected) return;
    drawSelectionSilhouette(
      element,
      element === selected
    );
  });

  const frame = ensureMultiSelectionFrame();
  const points = multiSelectionFramePoints(frame);
  if (!frame || !points) return;

  selectionOverlay.appendChild(
    svgEl("polygon", {
      points: `${points.nw.x},${points.nw.y} ${points.ne.x},${points.ne.y} ${points.se.x},${points.se.y} ${points.sw.x},${points.sw.y}`,
      class: "multi-selection-outline",
      "pointer-events": "none"
    })
  );

  [
    [points.nw.x, points.nw.y, "nw", "handle-nw"],
    [points.n.x, points.n.y, "n", "handle-n"],
    [points.ne.x, points.ne.y, "ne", "handle-ne"],
    [points.e.x, points.e.y, "e", "handle-e"],
    [points.se.x, points.se.y, "se", "handle-se"],
    [points.s.x, points.s.y, "s", "handle-s"],
    [points.sw.x, points.sw.y, "sw", "handle-sw"],
    [points.w.x, points.w.y, "w", "handle-w"]
  ].forEach(args => addHandle(...args));

  addRotationHandle(points.center, points.n);
}

function addRotationHandle(center, topMid) {
  const vx = topMid.x - center.x;
  const vy = topMid.y - center.y;
  const length = Math.max(0.001, Math.hypot(vx, vy));
  const offset = 30 / Math.max(zoom, 0.05);

  const handlePoint = {
    x: topMid.x + (vx / length) * offset,
    y: topMid.y + (vy / length) * offset
  };

  selectionOverlay.appendChild(svgEl("line", {
    x1: topMid.x,
    y1: topMid.y,
    x2: handlePoint.x,
    y2: handlePoint.y,
    class: "rotation-stem"
  }));

  selectionOverlay.appendChild(svgEl("circle", {
    cx: handlePoint.x,
    cy: handlePoint.y,
    r: selectionScreenSpaceUnits(6),
    class: "rotation-handle",
    "data-handle": "rotate"
  }));
}

function drawRotationHandleForSelected() {
  if (!selected || selectedItems.length !== 1) return;

  const box =
    editableLocalBounds(
      selected
    );
  const center = canvasPointFromLocal(
    selected,
    box.x + box.width / 2,
    box.y + box.height / 2
  );

  let topMid;

  if (selected.tagName === "line") {
    const p1 = canvasPointFromLocal(
      selected,
      Number(selected.getAttribute("x1")),
      Number(selected.getAttribute("y1"))
    );
    const p2 = canvasPointFromLocal(
      selected,
      Number(selected.getAttribute("x2")),
      Number(selected.getAttribute("y2"))
    );

    const mid = {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2
    };

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.max(0.001, Math.hypot(dx, dy));

    topMid = {
      x: mid.x + (dy / len) * 12,
      y: mid.y - (dx / len) * 12
    };
  } else {
    topMid = canvasPointFromLocal(
      selected,
      box.x + box.width / 2,
      box.y
    );
  }

  addRotationHandle(center, topMid);
}

function selectionUnionCanvasBounds() {
  if (!selectedItems.length) return null;

  const bounds = selectedItems
    .filter(element => element?.isConnected)
    .map(elementCanvasBounds);

  if (!bounds.length) return null;

  return {
    left: Math.min(...bounds.map(box => box.left)),
    top: Math.min(...bounds.map(box => box.top)),
    right: Math.max(...bounds.map(box => box.right)),
    bottom: Math.max(...bounds.map(box => box.bottom))
  };
}

function quickMenuButton(
  label,
  action,
  {
    title = label,
    icon = false,
    danger = false
  } = {}
) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.title = title;
  button.dataset.quickAction = action;

  if (icon) {
    button.classList.add("quick-menu-icon");
  }

  if (danger) {
    button.classList.add("quick-menu-danger");
  }

  return button;
}

function quickMenuDivider() {
  const divider = document.createElement("span");
  divider.className = "quick-menu-divider";
  divider.setAttribute("aria-hidden", "true");
  return divider;
}


function quickMenuDragGrip() {
  const grip =
    document.createElement(
      "button"
    );

  grip.type = "button";
  grip.className =
    "quick-menu-drag-grip";
  grip.dataset.quickMenuDrag =
    "true";
  grip.title =
    "Drag quick menu";
  grip.setAttribute(
    "aria-label",
    "Drag quick menu"
  );

  grip.innerHTML =
    "<span aria-hidden=\"true\">⠿</span>";

  return grip;
}

function clampSelectionQuickMenuPosition(
  left,
  top
) {
  const stageRect =
    stage.getBoundingClientRect();

  const menuRect =
    selectionQuickMenu
      .getBoundingClientRect();

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
              menuRect.width -
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
              menuRect.height -
              padding
          )
        )
      )
  };
}

function applySelectionQuickMenuManualPosition() {
  if (
    !selectionQuickMenuManualPosition ||
    selectionQuickMenu.hidden
  ) {
    return false;
  }

  const clamped =
    clampSelectionQuickMenuPosition(
      selectionQuickMenuManualPosition.left,
      selectionQuickMenuManualPosition.top
    );

  selectionQuickMenuManualPosition =
    clamped;

  selectionQuickMenu.classList.add(
    "quick-menu-manual-position"
  );

  selectionQuickMenu.style.left =
    `${clamped.left}px`;

  selectionQuickMenu.style.top =
    `${clamped.top}px`;

  return true;
}

function beginSelectionQuickMenuDrag(
  event
) {
  const stageRect =
    stage.getBoundingClientRect();

  const menuRect =
    selectionQuickMenu
      .getBoundingClientRect();

  selectionQuickMenuManualPosition = {
    left:
      menuRect.left -
      stageRect.left,
    top:
      menuRect.top -
      stageRect.top
  };

  selectionQuickMenu.classList.add(
    "quick-menu-manual-position"
  );

  selectionQuickMenu.style.left =
    `${selectionQuickMenuManualPosition.left}px`;

  selectionQuickMenu.style.top =
    `${selectionQuickMenuManualPosition.top}px`;

  selectionQuickMenuDrag = {
    pointerId:
      event.pointerId,
    offsetX:
      event.clientX -
      menuRect.left,
    offsetY:
      event.clientY -
      menuRect.top
  };

  try {
    selectionQuickMenu
      .setPointerCapture(
        event.pointerId
      );
  } catch {}

  event.preventDefault();
  event.stopPropagation();
}

function updateSelectionQuickMenuDrag(
  event
) {
  if (
    !selectionQuickMenuDrag ||
    event.pointerId !==
      selectionQuickMenuDrag.pointerId
  ) {
    return false;
  }

  const stageRect =
    stage.getBoundingClientRect();

  selectionQuickMenuManualPosition =
    clampSelectionQuickMenuPosition(
      event.clientX -
        stageRect.left -
        selectionQuickMenuDrag.offsetX,
      event.clientY -
        stageRect.top -
        selectionQuickMenuDrag.offsetY
    );

  applySelectionQuickMenuManualPosition();

  event.preventDefault();
  event.stopPropagation();

  return true;
}

function endSelectionQuickMenuDrag(
  event
) {
  if (
    !selectionQuickMenuDrag ||
    event.pointerId !==
      selectionQuickMenuDrag.pointerId
  ) {
    return false;
  }

  try {
    if (
      selectionQuickMenu
        .hasPointerCapture(
          event.pointerId
        )
    ) {
      selectionQuickMenu
        .releasePointerCapture(
          event.pointerId
        );
    }
  } catch {}

  selectionQuickMenuDrag = null;

  event.preventDefault();
  event.stopPropagation();

  return true;
}


function positionSelectionQuickMenu() {
  if (
    selectionQuickMenu.hidden ||
    !selectedItems.length ||
    !["select", "vertex"].includes(activeTool)
  ) {
    return;
  }

  if (
    applySelectionQuickMenuManualPosition()
  ) {
    return;
  }

  selectionQuickMenu.classList.remove(
    "quick-menu-manual-position"
  );

  let bounds =
    selectionUnionCanvasBounds();

  let vertexAnchorPoint = null;

  if (
    activeTool === "vertex" &&
    selectedItems.length === 1 &&
    selected?.tagName === "path" &&
    Array.isArray(selected._anchors) &&
    selectedAnchorIndex !== null &&
    selected._anchors[selectedAnchorIndex]
  ) {
    const anchor =
      selected._anchors[
        selectedAnchorIndex
      ];

    vertexAnchorPoint =
      canvasPointFromLocal(
        selected,
        anchor.x,
        anchor.y
      );

    bounds = {
      x: vertexAnchorPoint.x,
      y: vertexAnchorPoint.y,
      width: 0,
      height: 0
    };
  }

  if (!bounds) {
    selectionQuickMenu.hidden = true;
    return;
  }

  const svgRect =
    svg.getBoundingClientRect();

  const viewBox =
    svg.viewBox.baseVal;

  const scaleX =
    svgRect.width / viewBox.width;

  const scaleY =
    svgRect.height / viewBox.height;

  const centerX =
    svgRect.left +
    (bounds.x + bounds.width / 2 - viewBox.x) *
      scaleX;

  const selectionTop =
    svgRect.top +
    (bounds.y - viewBox.y) *
      scaleY;

  const selectionBottom =
    svgRect.top +
    (bounds.y + bounds.height - viewBox.y) *
      scaleY;

  const menuRect =
    selectionQuickMenu.getBoundingClientRect();

  /*
   * Selection mode places the rotation handle above the object. Reserve
   * enough vertical room for both the stem and circular handle so the
   * contextual menu never sits on top of it.
   */
  const rotationClearance =
    activeTool === "vertex"
      ? 0
      : 34;

  const selectionGap =
    activeTool === "vertex"
      ? 14
      : 10;

  let left =
    centerX - menuRect.width / 2;

  let top =
    selectionTop -
    rotationClearance -
    selectionGap -
    menuRect.height;

  const stageRect =
    stage.getBoundingClientRect();

  const edgePadding = 8;

  left = Math.max(
    stageRect.left + edgePadding,
    Math.min(
      left,
      stageRect.right -
        menuRect.width -
        edgePadding
    )
  );

  const minimumTop =
    stageRect.top + edgePadding;

  if (top < minimumTop) {
    /*
     * If there isn't enough room above, move the menu below the selection
     * instead of overlapping the rotation control.
     */
    top =
      selectionBottom +
      selectionGap;
  }

  top = Math.min(
    top,
    stageRect.bottom -
      menuRect.height -
      edgePadding
  );

  selectionQuickMenu.style.left =
    `${left - stageRect.left}px`;

  selectionQuickMenu.style.top =
    `${top - stageRect.top}px`;
}

function selectionQuickMenuBlockedByOverlay() {
  const exportDialogOpen =
    typeof exportModal !== "undefined" &&
    exportModal &&
    !exportModal.classList.contains("hidden");

  const aboutDialogOpen =
    typeof aboutModal !== "undefined" &&
    aboutModal &&
    !aboutModal.classList.contains("hidden");

  const newDocumentDialogOpen =
    newDocumentModal &&
    !newDocumentModal.hidden;

  const polygonSidesDialogOpen =
    polygonSidesModal &&
    !polygonSidesModal.hidden;

  const helpGuideDialogOpen =
    helpGuideModal &&
    !helpGuideModal.hidden;

  const saveDialogOpen =
    saveProjectModal &&
    !saveProjectModal.hidden;

  const offsetDialogOpen =
    offsetPathModal &&
    !offsetPathModal.hidden;

  const colorDialogOpen =
    customColorPicker &&
    !customColorPicker.classList.contains("hidden");

  return (
    exportDialogOpen ||
    aboutDialogOpen ||
    newDocumentDialogOpen ||
    polygonSidesDialogOpen ||
    helpGuideDialogOpen ||
    saveDialogOpen ||
    offsetDialogOpen ||
    colorDialogOpen
  );
}

function pruneDisconnectedSelection() {
  selectedItems = selectedItems.filter(
    element =>
      element &&
      element.isConnected &&
      element.closest("#art") === art
  );

  if (
    selected &&
    (
      !selected.isConnected ||
      selected.closest("#art") !== art
    )
  ) {
    selected = null;
  }

  if (
    selected &&
    !selectedItems.includes(selected)
  ) {
    selectedItems.unshift(selected);
  }

  if (!selected && selectedItems.length) {
    selected = selectedItems[0];
  }

  if (!selectedItems.length) {
    selected = null;
  }
}


function vertexQuickMenuIcon(action) {
  const icons = {
    "vertex-constraint": `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 17L17 5"></path>
        <path d="M9 17a8 8 0 0 1 8-8"></path>
      </svg>
    `,
    "vertex-add": `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 12h14M12 5v14"></path>
        <circle cx="12" cy="12" r="3.5"></circle>
      </svg>
    `,
    "vertex-delete": `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="5"></circle>
        <path d="M8.5 12h7"></path>
      </svg>
    `,
    "vertex-smooth": `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 16c4-8 12-8 16 0"></path>
        <circle cx="12" cy="10" r="2.2"></circle>
        <path d="M7 10h3M14 10h3"></path>
      </svg>
    `,
    "vertex-corner": `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 18 12 6l7 12"></path>
        <rect x="10" y="4" width="4" height="4"></rect>
      </svg>
    `,
    "vertex-break": `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="2.3"></circle>
        <path d="M4 8h5M15 16h5"></path>
        <circle cx="4" cy="8" r="1.4"></circle>
        <circle cx="20" cy="16" r="1.4"></circle>
      </svg>
    `,
    "vertex-join": `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="2.3"></circle>
        <path d="M4 12h6M14 12h6"></path>
        <circle cx="4" cy="12" r="1.4"></circle>
        <circle cx="20" cy="12" r="1.4"></circle>
      </svg>
    `,
    "vertex-scissors": `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="7" cy="8" r="2.5"></circle>
        <circle cx="7" cy="16" r="2.5"></circle>
        <path d="m9 9.5 10 6.5M9 14.5 19 8"></path>
      </svg>
    `
  };

  return icons[action] || "";
}

function vertexQuickMenuButton(action, title, options = {}) {
  const button =
    document.createElement("button");

  button.type = "button";
  button.className =
    "quick-menu-icon vertex-quick-menu-button";

  if (options.danger) {
    button.classList.add(
      "quick-menu-danger"
    );
  }

  button.title = title;
  button.setAttribute(
    "aria-label",
    title
  );

  button.dataset.quickAction =
    action;

  button.innerHTML =
    vertexQuickMenuIcon(
      action
    );

  return button;
}

function renderVertexQuickMenu() {
  const path =
    editableSelectedPath();

  const hasAnchor =
    Boolean(
      path &&
      selectedAnchorIndex !== null &&
      path._anchors[
        selectedAnchorIndex
      ]
    );

  if (!path || !hasAnchor) {
    selectionQuickMenu.hidden = true;
    return false;
  }

  selectionQuickMenu.append(
    quickMenuDragGrip(),
    quickMenuDivider(),
    vertexQuickMenuButton(
      "vertex-add",
      "Add anchor after selected point"
    ),
    vertexQuickMenuButton(
      "vertex-delete",
      "Delete selected anchor",
      { danger: true }
    ),
    quickMenuDivider(),
    vertexQuickMenuButton(
      "vertex-smooth",
      "Convert anchor to smooth"
    ),
    vertexQuickMenuButton(
      "vertex-corner",
      "Convert anchor to corner"
    ),
    vertexQuickMenuButton(
      "vertex-break",
      "Break handles"
    ),
    vertexQuickMenuButton(
      "vertex-join",
      "Join handles"
    ),
    quickMenuDivider(),
    vertexQuickMenuButton(
      "vertex-scissors",
      "Cut path at selected anchor"
    )
  );

  selectionQuickMenu.classList.add(
    "vertex-context-menu"
  );

  selectionQuickMenu.hidden = false;

  requestAnimationFrame(
    positionSelectionQuickMenu
  );

  return true;
}

function renderSelectionQuickMenu() {
  /*
   * Vertex Selection quick action: launch the unified CAD Constraint mode.
   * This is intentionally generated here so it follows the same positioning,
   * drag and visibility lifecycle as the rest of the context menu.
   */
  const addVertexConstraintQuickAction =
    () => {
      if (
        activeTool !== "vertex" ||
        !selectedItems.some(
          item =>
            item?.tagName ===
              "path"
        )
      ) {
        return;
      }

      selectionQuickMenu.append(
        quickMenuButton(
          "Constraint",
          "vertex-constraint",
          {
            title:
              "Create distance or angle constraint"
          }
        )
      );
    };


  pruneDisconnectedSelection();
  selectionQuickMenu.replaceChildren();

  addVertexConstraintQuickAction();


  selectionQuickMenu.classList.remove(
    "vertex-context-menu"
  );

  if (
    activeTextEdit ||
    !selectedItems.length ||
    !["select", "vertex"].includes(activeTool) ||
    shapeBuilderDrawing ||
    pendingShape ||
    selectionQuickMenuBlockedByOverlay()
  ) {
    selectionQuickMenu.hidden = true;
    return;
  }

  if (activeTool === "vertex") {
    renderVertexQuickMenu();
    return;
  }

  const multiple = selectedItems.length > 1;
  const single = multiple ? null : selectedItems[0];

  if (multiple) {
    selectionQuickMenu.append(
      quickMenuButton("Group", "group", {
        title: "Group selected objects (Ctrl/Cmd+G)"
      }),
      quickMenuDivider(),
      quickMenuButton("H", "align-h", {
        title: "Align horizontal centers",
        icon: true
      }),
      quickMenuButton("V", "align-v", {
        title: "Align vertical centers",
        icon: true
      })
    );
  } else if (
    single &&
    isRepeatGrid(
      single
    )
  ) {
    selectionQuickMenu.append(
      quickMenuButton(
        "Repeat",
        "repeat-grid-edit",
        {
          title:
            "Show live Repeat Grid controls"
        }
      ),
      quickMenuButton(
        "Expand",
        "convert-path",
        {
          title:
            "Expand Repeat Grid to independently editable paths"
        }
      )
    );
  } else if (
    single &&
    isArtBrushObject(
      single
    )
  ) {
    selectionQuickMenu.append(
      quickMenuButton(
        "Brush",
        "art-brush-edit",
        {
          title:
            "Edit Vector Art Brush"
        }
      )
    );
  } else if (
    single &&
    isThreeDExtrude(
      single
    )
  ) {
    selectionQuickMenu.append(
      quickMenuButton(
        "3D",
        "three-d-edit",
        {
          title:
            "Show 3D Extrude controls"
        }
      )
    );
  } else if (
    single &&
    isPathRepeat(
      single
    )
  ) {
    selectionQuickMenu.append(
      quickMenuButton(
        "Path Repeat",
        "path-repeat-edit",
        {
          title:
            "Show Repeat Along Path controls"
        }
      )
    );
  } else if (
    single &&
    isRadialRepeat(
      single
    )
  ) {
    selectionQuickMenu.append(
      quickMenuButton(
        "Radial",
        "radial-repeat-edit",
        {
          title:
            "Show live Radial Repeat controls"
        }
      )
    );
  } else if (single && isGroup(single)) {
    selectionQuickMenu.append(
      quickMenuButton("Ungroup", "ungroup", {
        title: "Ungroup selected object"
      })
    );
  } else if (single) {
    if (
      !isRasterImageElement(
        single
      )
    ) {
      selectionQuickMenu.append(
        quickMenuButton(
          "Repeat",
          "repeat-grid",
          {
            title:
              "Create Repeat Grid"
          }
        ),
        quickMenuButton(
          "Radial",
          "radial-repeat",
          {
            title:
              "Create Radial Repeat"
          }
        )
      );
    }
    if (
      isRasterImageElement(
        single
      )
    ) {
      if (
        imageCropTarget ===
          single
      ) {
        selectionQuickMenu.append(
          quickMenuButton(
            "Done",
            "crop-image-done",
            {
              title:
                "Apply crop bounds"
            }
          ),
          quickMenuButton(
            "Reset",
            "crop-image-reset",
            {
              title:
                "Restore full image"
            }
          ),
          quickMenuButton(
            "Cancel",
            "crop-image-cancel",
            {
              title:
                "Cancel crop changes"
            }
          )
        );
      } else {
        selectionQuickMenu.append(
          quickMenuButton(
            "Crop",
            "crop-image",
            {
              title:
                "Crop imported image"
            }
          )
        );
      }
    }

    if (isTextElement(single)) {
      selectionQuickMenu.append(
        quickMenuButton("Edit", "edit-text", { title: "Edit text" }),
        quickMenuButton("Outline", "outline-text", { title: "Convert text to outlines" })
      );
    } else if (
      single.tagName !== "path" &&
      !isRasterImageElement(
        single
      )
    ) {
      selectionQuickMenu.append(
        quickMenuButton("Path", "convert-path", {
          title: "Convert shape to editable path"
        })
      );
    }

    selectionQuickMenu.append(
      quickMenuButton(
        "Flip H",
        "mirror-horizontal",
        {
          title:
            "Mirror horizontally"
        }
      ),
      quickMenuButton(
        "Flip V",
        "mirror-vertical",
        {
          title:
            "Mirror vertically"
        }
      )
    );

    if (
      !isTextElement(single) &&
      !isRasterImageElement(single) &&
      isOffsetPathEligible(single)
    ) {
      selectionQuickMenu.append(
        quickMenuButton("Offset", "offset-path", {
          title: "Create Offset Path"
        })
      );
    }
  }

  const selectedPaths =
    selectedItems.filter(
      item =>
        item?.tagName ===
          "path" &&
        isLayerInteractive(
          item
        )
    );

  if (
    activeTool === "select" &&
    selectedPaths.length
  ) {
    if (
      selectionQuickMenu.childNodes.length
    ) {
      selectionQuickMenu.appendChild(
        quickMenuDivider()
      );
    }

    selectionQuickMenu.append(
      quickMenuButton(
        "Constraint",
        "selection-constraint",
        {
          title:
            selectedPaths.length === 1
              ? "Open CAD Constraints for selected path"
              : `Open CAD Constraints for ${selectedPaths.length} selected paths`
        }
      )
    );
  }

  if (selectionQuickMenu.childNodes.length) {
    selectionQuickMenu.appendChild(
      quickMenuDivider()
    );
  }

  selectionQuickMenu.append(
    quickMenuButton("⧉", "duplicate", {
      title: "Duplicate",
      icon: true
    }),
    quickMenuButton("⌫", "delete", {
      title: "Delete",
      icon: true,
      danger: true
    })
  );

  selectionQuickMenu.prepend(
    quickMenuDivider()
  );

  selectionQuickMenu.prepend(
    quickMenuDragGrip()
  );

  selectionQuickMenu.hidden = false;

  requestAnimationFrame(
    positionSelectionQuickMenu
  );
}

function runSelectionQuickAction(action) {
  if (
    selected &&
    pathHasFixedGeometryConstraint(
      selected
    ) &&
    [
      "vertex-add",
      "vertex-delete",
      "vertex-smooth",
      "vertex-corner",
      "vertex-break",
      "vertex-join",
      "vertex-scissors"
    ].includes(
      action
    )
  ) {
    toolStatus.textContent =
      "Geometry is locked • remove Current Geometry constraint to edit vertices";
    return;
  }

  if (action === "duplicate") {
    duplicateSelected();
  } else if (action === "delete") {
    deleteSelected();
  } else if (action === "group") {
    groupSelected();
  } else if (action === "ungroup") {
    ungroupSelected();
  } else if (action === "convert-path") {
    convertSelectedToPath();
  } else if (action === "repeat-grid") {
    createRepeatGridFromSelected();
    syncRepeatGridPanel();
  } else if (action === "repeat-grid-edit") {
    syncRepeatGridPanel();
  } else if (action === "radial-repeat") {
    createRadialRepeatFromSelected();
    syncRadialRepeatPanel();
  } else if (action === "radial-repeat-edit") {
    radialRepeatPanelRequested = true;
    syncRadialRepeatPanel();
    drawSelection();
  } else if (action === "path-repeat-edit") {
    pathRepeatPanelRequested = true;
    syncPathRepeatPanel();
    drawSelection();
  } else if (action === "art-brush-edit") {
    artBrushPanelRequested =
      true;
    syncArtBrushPanel();
    drawSelection();
  } else if (action === "three-d-edit") {
    threeDPanelRequested = true;
    threeDSelectedFace =
      threeDSelectedFace ||
      selectedThreeDExtrude()?.dataset.threeDSelectedFace ||
      "front";

    if (selectedThreeDExtrude()) {
      selectedThreeDExtrude().dataset.threeDSelectedFace =
        threeDSelectedFace;
    }

    syncThreeDPanel();

    syncAppearanceControlsToThreeDFace(
      selectedThreeDExtrude(),
      threeDSelectedFace
    );

    drawSelection();
  } else if (action === "edit-text") {
    if (isTextElement(selected)) beginTextEditing(selected);
  } else if (action === "outline-text") {
    convertSelectedTextToOutlines();
  } else if (action === "offset-path") {
    openOffsetPathModal();
  } else if (action === "crop-image") {
    beginImageCrop();
  } else if (
    action ===
      "crop-image-done"
  ) {
    commitImageCrop();
  } else if (
    action ===
      "crop-image-reset"
  ) {
    resetImageCrop();
  } else if (
    action ===
      "crop-image-cancel"
  ) {
    cancelImageCrop();
  } else if (action === "align-h") {
    alignSelectedObjects("hcenter");
  } else if (action === "align-v") {
    alignSelectedObjects("vcenter");
  } else if (
    action === "mirror-horizontal" ||
    action === "mirror-vertical"
  ) {
    runAdvancedTransformAction(
      action
    );
  } else if (
    action === "vertex-constraint" ||
    action === "selection-constraint"
  ) {
    geometryConstraintsPanelRequested =
      true;

    constraintToolPersistentActive =
      true;

    constraintMakerType =
      "auto";

    /*
     * Selection mode normally has no selected anchor refs yet, so the
     * persistent constraint tool enters geometry-picking mode. If the user
     * came from Vertex Selection with exactly two selected vertices, the
     * existing helper can still reuse them immediately.
     */
    syncGeometryConstraintsPanel();
    positionGeometryConstraintsPanel();

    if (
      !constraintMakerSelectionFromCurrentVertexSelection()
    ) {
      beginConstraintMaker();
    } else {
      constraintMakerActive =
        false;
      updateConstraintMakerUI();
      drawSelection();
    }

    selectionQuickMenu.hidden =
      true;

    toolStatus.textContent =
      activeTool === "select"
        ? "Constraint: select two vertices or click an edge"
        : toolStatus.textContent;

    return;
  }

  if (action === "vertex-add") {
    addAnchorPointToSelectedPath();
  } else if (action === "vertex-delete") {
    deleteSelectedAnchorPoint();
  } else if (action === "vertex-smooth") {
    smoothSelectedAnchor();
  } else if (action === "vertex-corner") {
    cornerSelectedAnchor();
  } else if (action === "vertex-break") {
    breakSelectedAnchorHandles();
  } else if (action === "vertex-join") {
    joinSelectedAnchorHandles();
  } else if (action === "vertex-scissors") {
    cutSelectedPathAtAnchor();
  }

  renderSelectionQuickMenu();
}

selectionQuickMenu.addEventListener(
  "pointerdown",
  event => {
    const grip =
      event.target.closest(
        "[data-quick-menu-drag='true']"
      );

    if (grip) {
      beginSelectionQuickMenuDrag(
        event
      );
      return;
    }

    event.stopPropagation();
  }
);

selectionQuickMenu.addEventListener(
  "pointermove",
  event => {
    updateSelectionQuickMenuDrag(
      event
    );
  }
);

selectionQuickMenu.addEventListener(
  "pointerup",
  event => {
    endSelectionQuickMenuDrag(
      event
    );
  }
);

selectionQuickMenu.addEventListener(
  "pointercancel",
  event => {
    endSelectionQuickMenuDrag(
      event
    );
  }
);

selectionQuickMenu.addEventListener(
  "click",
  event => {
    const button =
      event.target.closest("[data-quick-action]");

    if (!button) return;

    event.preventDefault();
    event.stopPropagation();

    runSelectionQuickAction(
      button.dataset.quickAction
    );
  }
);


function drawSelectedCenterMoveHandle(
  element
) {
  if (
    !element ||
    !["select", "vertex"].includes(activeTool) ||
    selectedItems.length !== 1 ||
    selected !== element
  ) {
    return;
  }

  const box =
    editableLocalBounds(
      element
    );

  const center =
    canvasPointFromLocal(
      element,
      box.x +
        box.width / 2,
      box.y +
        box.height / 2
    );

  selectionOverlay.appendChild(
    svgEl(
      "circle",
      {
        cx: center.x,
        cy: center.y,
        r: selectionScreenSpaceUnits(7),
        class:
          "selected-center-move-handle",
        "data-handle":
          "center-move",
        "aria-label":
          "Move selected object"
      }
    )
  );

  selectionOverlay.appendChild(
    svgEl(
      "circle",
      {
        cx: center.x,
        cy: center.y,
        r: selectionScreenSpaceUnits(2),
        class:
          "selected-center-move-dot",
        "pointer-events":
          "none"
      }
    )
  );
}

function duplicateSelectionInPlaceForDrag() {
  const sourceItems =
    selectedItems.filter(isLayerInteractive);

  if (!sourceItems.length) return false;

  const sourcePrimaryIndex =
    sourceItems.indexOf(selected);
  const clones = [];

  sourceItems.forEach(item => {
    const clone = item.cloneNode(true);

    objectCounter++;
    clone.dataset.name =
      `${capitalize(clone.tagName)} ${objectCounter}`;

    /*
     * Stroke-profile instances keep references to generated definitions.
     * A duplicate should rebuild any transient profile rendering rather than
     * inheriting the source object's runtime-only identifier.
     */
    delete clone.dataset.strokeProfileId;

    const t = getTranslation(item);
    clone.dataset.tx = t.x;
    clone.dataset.ty = t.y;

    if (clone.dataset.rotation === undefined) {
      clone.dataset.rotation = getRotation(item);
    }

    applyObjectTransform(clone);

    if (item._anchors) {
      clone._anchors =
        item._anchors.map(anchor => ({ ...anchor }));
    }

    art.appendChild(clone);
    clones.push(clone);
  });

  if (!clones.length) return false;

  const clonePrimary =
    clones[
      sourcePrimaryIndex >= 0
        ? sourcePrimaryIndex
        : clones.length - 1
    ];

  setSelection(clones, clonePrimary);
  return true;
}

function beginCenterMoveDrag(
  point,
  duplicate = false
) {
  if (
    !selected ||
    !selectedItems.length
  ) {
    return false;
  }

  const optionDragDuplicated =
    duplicate
      ? duplicateSelectionInPlaceForDrag()
      : false;

  dragging = true;

  const moveFrame =
    selectedItems.length > 1
      ? ensureMultiSelectionFrame()
      : null;

  dragOffset = {
    x: point.x,
    y: point.y,
    optionDragDuplicated,
    multiFrameStartCenter:
      moveFrame?.center
        ? { ...moveFrame.center }
        : null,
    originals:
      selectedItems.map(
        element => {
          const t =
            getTranslation(
              element
            );

          return {
            element,
            tx: t.x,
            ty: t.y
          };
        }
      )
  };

  return true;
}





function activePathRepeatForPanel() {
  return (
    selectedPathRepeat() ||
    pathRepeatShapeEdit?.repeat ||
    null
  );
}

function syncPathRepeatSourceFromProxy() {
  const state =
    pathRepeatShapeEdit;

  if (
    !state ||
    !state.repeat?.isConnected ||
    !state.proxy?.isConnected ||
    pathRepeatShapeEditSyncing
  ) {
    return;
  }

  pathRepeatShapeEditSyncing =
    true;

  try {
    const serialized =
      serializeElementForProject(
        state.proxy
      );

    /*
     * The proxy is only an editor surface. Strip its temporary identity
     * before storing it as the live repeat source.
     */
    if (
      serialized?.dataset
    ) {
      delete serialized.dataset
        .pathRepeatSourceProxy;
    }

    state.repeat.dataset.pathRepeatSource =
      JSON.stringify(
        serialized
      );

    renderPathRepeat(
      state.repeat
    );

    renderLayers();
  } finally {
    pathRepeatShapeEditSyncing =
      false;
  }
}

function beginPathRepeatShapeEdit() {
  const repeat =
    activePathRepeatForPanel();

  if (!repeat) return false;

  if (pathRepeatShapeEdit) {
    return true;
  }

  const proxy =
    pathRepeatSourceElement(
      repeat
    );

  if (!proxy) return false;

  pathRepeatGuideEdit =
    false;

  pathRepeatGuideDrag =
    null;

  proxy.dataset.object =
    "true";

  proxy.dataset.pathRepeatSourceProxy =
    "true";

  proxy.dataset.name =
    `${repeat.dataset.name || "Path Repeat"} Source`;

  /*
   * Keep the proxy where the stored source geometry lives, then let all
   * existing selection/vertex/transform/appearance tools edit it normally.
   */
  art.appendChild(
    proxy
  );

  const observer =
    new MutationObserver(
      () => {
        syncPathRepeatSourceFromProxy();
      }
    );

  observer.observe(
    proxy,
    {
      attributes: true,
      childList: true,
      subtree: true
    }
  );

  pathRepeatShapeEdit = {
    repeat,
    proxy,
    observer
  };

  setSelection(
    [proxy],
    proxy
  );

  pathRepeatPanelRequested =
    true;

  syncPathRepeatPanel();
  drawSelection();

  toolStatus.textContent =
    "Repeat Along Path: edit the source shape; copies update live";

  return true;
}

function endPathRepeatShapeEdit(
  options = {}
) {
  const state =
    pathRepeatShapeEdit;

  if (!state) {
    return false;
  }

  syncPathRepeatSourceFromProxy();

  state.observer?.disconnect();

  const repeat =
    state.repeat;

  state.proxy?.remove();

  pathRepeatShapeEdit =
    null;

  if (
    options.selectRepeat !== false &&
    repeat?.isConnected
  ) {
    setSelection(
      [repeat],
      repeat
    );
  }

  if (
    options.keepPanel !== false
  ) {
    pathRepeatPanelRequested =
      true;
  }

  syncPathRepeatPanel();
  drawSelection();

  return true;
}

function pathRepeatGuideForEditing(
  repeat
) {
  const guide =
    pathRepeatGuideElement(
      repeat
    );

  if (!guide) return null;

  if (guide.tagName === "path") {
    normalizePathForEditing(
      guide
    );
  }

  return guide;
}

function pathRepeatGuideLocalToCanvas(
  repeat,
  guide,
  point
) {
  const guidePoint =
    canvasPointFromLocal(
      guide,
      point.x,
      point.y
    );

  return canvasPointFromLocal(
    repeat,
    guidePoint.x,
    guidePoint.y
  );
}

function pathRepeatCanvasToGuideLocal(
  repeat,
  guide,
  point
) {
  const repeatLocal =
    localPointFromCanvas(
      repeat,
      point
    );

  return localPointFromCanvas(
    guide,
    repeatLocal
  );
}

function persistPathRepeatGuide(
  repeat,
  guide
) {
  repeat.dataset.pathRepeatGuide =
    JSON.stringify(
      serializeElementForProject(
        guide
      )
    );

  renderPathRepeat(
    repeat
  );
}

function drawPathRepeatGuideEditHandles(
  repeat
) {
  if (
    !pathRepeatGuideEdit ||
    !pathRepeatPanelRequested
  ) {
    return;
  }

  const guide =
    pathRepeatGuideForEditing(
      repeat
    );

  if (!guide) return;

  if (guide.tagName === "line") {
    const points = [
      {
        x:
          Number(
            guide.getAttribute("x1")
          ),
        y:
          Number(
            guide.getAttribute("y1")
          ),
        key: "start"
      },
      {
        x:
          Number(
            guide.getAttribute("x2")
          ),
        y:
          Number(
            guide.getAttribute("y2")
          ),
        key: "end"
      }
    ];

    points.forEach(
      point => {
        const canvas =
          pathRepeatGuideLocalToCanvas(
            repeat,
            guide,
            point
          );

        selectionOverlay.appendChild(
          svgEl(
            "rect",
            {
              x:
                canvas.x -
                4.5 /
                  Math.max(
                    zoom,
                    0.05
                  ),
              y:
                canvas.y -
                4.5 /
                  Math.max(
                    zoom,
                    0.05
                  ),
              width:
                9 /
                Math.max(
                  zoom,
                  0.05
                ),
              height:
                9 /
                Math.max(
                  zoom,
                  0.05
                ),
              class:
                "anchor-handle path-repeat-guide-anchor",
              "data-path-repeat-line-point":
                point.key
            }
          )
        );
      }
    );

    return;
  }

  const anchors =
    guide._anchors || [];

  anchors.forEach(
    (a, index) => {
      const anchorCanvas =
        pathRepeatGuideLocalToCanvas(
          repeat,
          guide,
          a
        );

      [
        ["in", a.inX, a.inY],
        ["out", a.outX, a.outY]
      ].forEach(
        ([side, x, y]) => {
          if (
            Math.hypot(
              x - a.x,
              y - a.y
            ) < 0.5
          ) {
            return;
          }

          const controlCanvas =
            pathRepeatGuideLocalToCanvas(
              repeat,
              guide,
              { x, y }
            );

          selectionOverlay.appendChild(
            svgEl(
              "line",
              {
                x1:
                  anchorCanvas.x,
                y1:
                  anchorCanvas.y,
                x2:
                  controlCanvas.x,
                y2:
                  controlCanvas.y,
                class:
                  "control-line path-repeat-guide-control-line",
                "pointer-events":
                  "none"
              }
            )
          );

          selectionOverlay.appendChild(
            svgEl(
              "circle",
              {
                cx:
                  controlCanvas.x,
                cy:
                  controlCanvas.y,
                r:
                  4 /
                  Math.max(
                    zoom,
                    0.05
                  ),
                class:
                  "control-handle path-repeat-guide-control",
                "data-path-repeat-control-index":
                  String(index),
                "data-path-repeat-control-side":
                  side
              }
            )
          );
        }
      );
    }
  );

  anchors.forEach(
    (a, index) => {
      const canvas =
        pathRepeatGuideLocalToCanvas(
          repeat,
          guide,
          a
        );

      selectionOverlay.appendChild(
        svgEl(
          "rect",
          {
            x:
              canvas.x -
              4.5 /
                Math.max(
                  zoom,
                  0.05
                ),
            y:
              canvas.y -
              4.5 /
                Math.max(
                  zoom,
                  0.05
                ),
            width:
              9 /
              Math.max(
                zoom,
                0.05
              ),
            height:
              9 /
              Math.max(
                zoom,
                0.05
              ),
            class:
              "anchor-handle path-repeat-guide-anchor",
            "data-path-repeat-anchor-index":
              String(index)
          }
        )
      );
    }
  );
}

function drawPathRepeatGuideOverlay(
  repeat
) {
  if (
    !repeat ||
    !isPathRepeat(repeat) ||
    !pathRepeatPanelRequested
  ) {
    return;
  }

  const guide =
    pathRepeatGuideElement(
      repeat
    );

  if (!guide) return;

  /*
   * Use a fresh guide element with the repeat group's transform folded
   * into it, then draw it in the selection overlay so it remains visible
   * while the live path-repeat source inside the group stays hidden.
   */
  const overlayGuide =
    guide.cloneNode(
      true
    );

  overlayGuide.removeAttribute(
    "data-object"
  );

  overlayGuide.removeAttribute(
    "fill"
  );

  overlayGuide.setAttribute(
    "fill",
    "none"
  );

  overlayGuide.setAttribute(
    "stroke",
    "currentColor"
  );

  overlayGuide.setAttribute(
    "stroke-width",
    String(
      1.25 /
      Math.max(
        zoom,
        0.05
      )
    )
  );

  overlayGuide.setAttribute(
    "stroke-dasharray",
    `${6 / Math.max(zoom, 0.05)} ${5 / Math.max(zoom, 0.05)}`
  );

  overlayGuide.setAttribute(
    "vector-effect",
    "non-scaling-stroke"
  );

  overlayGuide.setAttribute(
    "pointer-events",
    "none"
  );

  overlayGuide.classList.add(
    "path-repeat-guide-overlay"
  );

  /*
   * Apply the guide's own transform first, then the live repeat group's
   * transform around it by nesting them.
   */
  const wrapper =
    document.createElementNS(
      SVG_NS,
      "g"
    );

  const repeatTransform =
    repeat.getAttribute(
      "transform"
    );

  if (repeatTransform) {
    wrapper.setAttribute(
      "transform",
      repeatTransform
    );
  }

  wrapper.classList.add(
    "path-repeat-guide-overlay-wrapper"
  );

  wrapper.setAttribute(
    "pointer-events",
    "none"
  );

  wrapper.appendChild(
    overlayGuide
  );

  selectionOverlay.appendChild(
    wrapper
  );
}


function drawThreeDVolumeCenterOverlay(
  repeat
) {
  if (
    !repeat ||
    !isThreeDExtrude(repeat) ||
    !threeDPanelRequested
  ) {
    return;
  }

  const settings =
    normalizeThreeDSettings(
      threeDSettings(repeat) || {}
    );

  if (
    !Number.isFinite(
      settings.pivotX
    ) ||
    !Number.isFinite(
      settings.pivotY
    )
  ) {
    return;
  }

  /*
   * The marker is tied directly to the stored page-space pivot.
   * Rotate X/Y/Z never changes these coordinates.
   */
  const canvas =
    canvasPointFromLocal(
      repeat,
      settings.pivotX +
        settings.moveX,
      settings.pivotY +
        settings.moveY
    );

  const size =
    8 /
    Math.max(
      zoom,
      0.05
    );

  selectionOverlay.appendChild(
    svgEl(
      "circle",
      {
        cx:
          canvas.x,
        cy:
          canvas.y,
        r:
          5 /
          Math.max(
            zoom,
            0.05
          ),
        class:
          "three-d-volume-center",
        "pointer-events":
          "none"
      }
    )
  );

  selectionOverlay.appendChild(
    svgEl(
      "line",
      {
        x1:
          canvas.x -
          size,
        y1:
          canvas.y,
        x2:
          canvas.x +
          size,
        y2:
          canvas.y,
        class:
          "three-d-volume-center-cross",
        "pointer-events":
          "none"
      }
    )
  );

  selectionOverlay.appendChild(
    svgEl(
      "line",
      {
        x1:
          canvas.x,
        y1:
          canvas.y -
          size,
        x2:
          canvas.x,
        y2:
          canvas.y +
          size,
        class:
          "three-d-volume-center-cross",
        "pointer-events":
          "none"
      }
    )
  );
}



function drawThreeDFaceLabels(
  repeat
) {
  if (
    !repeat ||
    !isThreeDExtrude(repeat) ||
    !threeDPanelRequested
  ) {
    return;
  }

  const faces =
    [
      ...repeat.querySelectorAll(
        "[data-three-d-face]"
      )
    ];

  const groups =
    new Map();

  faces.forEach(
    face => {
      const type =
        face.dataset.threeDFace;

      if (!type) return;

      const box =
        face.getBBox();

      const localCenter = {
        x:
          box.x +
          box.width / 2,
        y:
          box.y +
          box.height / 2
      };

      const canvasCenter =
        canvasPointFromLocal(
          repeat,
          localCenter.x,
          localCenter.y
        );

      const depth =
        Number(
          face.dataset.threeDDepth
        );

      if (
        !groups.has(type) ||
        depth <
          groups.get(type).depth
      ) {
        groups.set(
          type,
          {
            depth,
            point:
              canvasCenter
          }
        );
      }
    }
  );

  const labelText = {
    front: "Front",
    back: "Back",
    left: "Left",
    right: "Right",
    top: "Top",
    bottom: "Bottom"
  };

  groups.forEach(
    (entry, type) => {
      const group =
        svgEl(
          "g",
          {
            class:
              `three-d-face-label${
                faces.some(
                  face =>
                    face.dataset.threeDFace === type &&
                    (face.dataset.threeDFaceKey || face.dataset.threeDFace) ===
                      threeDSelectedFace
                )
                  ? " selected"
                  : ""
              }`,
            "pointer-events":
              "none"
          }
        );

      const text =
        svgEl(
          "text",
          {
            x:
              entry.point.x,
            y:
              entry.point.y,
            "text-anchor":
              "middle",
            "dominant-baseline":
              "middle",
            class:
              "three-d-face-label-text"
          }
        );

      text.textContent =
        labelText[type] ||
        type;

      group.appendChild(
        text
      );

      selectionOverlay.appendChild(
        group
      );
    }
  );
}


function seamSolidFill(element) {
  const fill =
    element?.getAttribute(
      "fill"
    );

  if (
    !fill ||
    fill === "none" ||
    fill === "transparent" ||
    /^url\(/i.test(fill)
  ) {
    return null;
  }

  const opacity =
    Number(
      element.getAttribute(
        "fill-opacity"
      ) ??
      1
    );

  if (
    !Number.isFinite(opacity) ||
    opacity <= 0
  ) {
    return null;
  }

  return {
    fill,
    opacity
  };
}

function seamPathStraightSegments(path) {
  if (
    path?.tagName !== "path"
  ) {
    return [];
  }

  normalizePathForEditing(path);

  if (
    !Array.isArray(path._anchors) ||
    path._anchors.length < 2
  ) {
    return [];
  }

  const segments = [];
  const count = path._anchors.length;
  const edgeCount =
    path.dataset.closed === "true"
      ? count
      : count - 1;

  for (
    let i = 0;
    i < edgeCount;
    i += 1
  ) {
    const j =
      (i + 1) %
      count;

    const a =
      path._anchors[i];

    const b =
      path._anchors[j];

    const straight =
      Math.hypot(
        a.outX - a.x,
        a.outY - a.y
      ) < 1e-7 &&
      Math.hypot(
        b.inX - b.x,
        b.inY - b.y
      ) < 1e-7;

    if (!straight) {
      continue;
    }

    segments.push({
      a:
        canvasPointFromLocal(
          path,
          a.x,
          a.y
        ),
      b:
        canvasPointFromLocal(
          path,
          b.x,
          b.y
        )
    });
  }

  return segments;
}

function seamPointsEqual(
  a,
  b,
  epsilon =
    1e-5
) {
  return Boolean(
    a &&
    b &&
    Math.abs(a.x - b.x) <= epsilon &&
    Math.abs(a.y - b.y) <= epsilon
  );
}

function seamSegmentsEqual(
  first,
  second
) {
  return (
    (
      seamPointsEqual(
        first.a,
        second.a
      ) &&
      seamPointsEqual(
        first.b,
        second.b
      )
    ) ||
    (
      seamPointsEqual(
        first.a,
        second.b
      ) &&
      seamPointsEqual(
        first.b,
        second.a
      )
    )
  );
}

function renderFillSeamUnderlayPassive() {
  if (
    !fillSeamUnderlay
  ) {
    return;
  }

  fillSeamUnderlay.replaceChildren();

  const entries =
    [
      ...art.querySelectorAll(
        ":scope > path[data-object='true']"
      )
    ]
      .map(
        path => ({
          path,
          fill:
            seamSolidFill(
              path
            ),
          segments:
            seamPathStraightSegments(
              path
            )
        })
      )
      .filter(
        entry =>
          entry.fill &&
          entry.segments.length
      );

  for (
    let i = 0;
    i < entries.length;
    i += 1
  ) {
    for (
      let j = i + 1;
      j < entries.length;
      j += 1
    ) {
      const first =
        entries[i];

      const second =
        entries[j];

      if (
        first.fill.fill !==
          second.fill.fill ||
        Math.abs(
          first.fill.opacity -
          second.fill.opacity
        ) >
          1e-6
      ) {
        continue;
      }

      first.segments.forEach(
        segment => {
          const shared =
            second.segments.some(
              other =>
                seamSegmentsEqual(
                  segment,
                  other
                )
            );

          if (!shared) {
            return;
          }

          fillSeamUnderlay.appendChild(
            svgEl(
              "line",
              {
                x1:
                  segment.a.x,
                y1:
                  segment.a.y,
                x2:
                  segment.b.x,
                y2:
                  segment.b.y,
                stroke:
                  first.fill.fill,
                "stroke-opacity":
                  first.fill.opacity,
                "stroke-width":
                  1,
                "stroke-linecap":
                  "square",
                "vector-effect":
                  "non-scaling-stroke",
                "pointer-events":
                  "none",
                class:
                  "fill-seam-underlay-line"
              }
            )
          );
        }
      );
    }
  }
}

function drawSelection() {
  selectedItems.forEach(refreshStrokeAlignmentForObject);
  refreshAllStrokeProfiles();
  updatePathfinderControls();
  updatePathEditingControls();
  updateTransformPanel();
  selectionOverlay.innerHTML = "";

  /*
   * A provisional two-click shape should never get transform handles.
   * Those handles live in the selection overlay and can sit above the
   * artwork, intercepting the second click that is meant to commit it.
   * Keep normal Selection behavior completely unchanged once creation ends.
   */
  if (pendingShape) {
    selectionQuickMenu.replaceChildren();
    selectionQuickMenu.hidden = true;
    return;
  }

  drawDocumentEdgeRelations();
  drawEdgeRelationPickingPreview();

  drawCurvatureOverlay();
  renderSelectionQuickMenu();

  if (
    selected &&
    selected.tagName === "path" &&
    Array.isArray(selected._anchors)
  ) {
    drawPathGeometryConstraints(selected);
  }

  drawDocumentGeometryConstraints();
  drawSelectedPathsVertexHandles();
  drawConstraintMakerAutoFirstEdge();
  drawConstraintMakerPreview();
  drawConstraintMakerPlacementPreview();
  drawConstraintMakerAnglePreview();

  if (
    !constraintValuePopup.hidden
  ) {
    requestAnimationFrame(
      positionConstraintValuePopup
    );
  }

  if (
    selectedThreeDExtrude() &&
    threeDPanelRequested
  ) {
    drawThreeDVolumeCenterOverlay(
      selectedThreeDExtrude()
    );

  }

  if (
    selectedPathRepeat() &&
    pathRepeatPanelRequested
  ) {
    drawPathRepeatGuideOverlay(
      selectedPathRepeat()
    );

    drawPathRepeatGuideEditHandles(
      selectedPathRepeat()
    );
  }

  if (
    selectedRadialRepeat() &&
    isRadialRepeatEditingActive(
      selectedRadialRepeat()
    )
  ) {
    const repeat =
      selectedRadialRepeat();

    const settings =
      normalizeRadialRepeatSettings(
        radialRepeatSettings(repeat) || {}
      );

    const radialCenterCanvas =
      canvasPointFromLocal(
        repeat,
        settings.centerX,
        settings.centerY
      );

    selectionOverlay.appendChild(
      svgEl(
        "line",
        {
          x1: radialCenterCanvas.x - 10 / Math.max(zoom, 0.3),
          y1: radialCenterCanvas.y,
          x2: radialCenterCanvas.x + 10 / Math.max(zoom, 0.3),
          y2: radialCenterCanvas.y,
          class: "radial-repeat-center-cross",
          "pointer-events": "none"
        }
      )
    );

    selectionOverlay.appendChild(
      svgEl(
        "line",
        {
          x1: radialCenterCanvas.x,
          y1: radialCenterCanvas.y - 10 / Math.max(zoom, 0.3),
          x2: radialCenterCanvas.x,
          y2: radialCenterCanvas.y + 10 / Math.max(zoom, 0.3),
          class: "radial-repeat-center-cross",
          "pointer-events": "none"
        }
      )
    );

    selectionOverlay.appendChild(
      svgEl(
        "circle",
        {
          cx: radialCenterCanvas.x,
          cy: radialCenterCanvas.y,
          r: 11 / Math.max(zoom, 0.3),
          class: "radial-repeat-center-ring",
          "pointer-events": "none"
        }
      )
    );

    selectionOverlay.appendChild(
      svgEl(
        "circle",
        {
          cx: radialCenterCanvas.x,
          cy: radialCenterCanvas.y,
          r: 5.5 / Math.max(zoom, 0.3),
          class: "radial-repeat-center-handle",
          "data-radial-repeat-center": "true",
          "pointer-events": "all"
        }
      )
    );
  }

  if (activeTextEdit) return;
  if (!selectedItems.length) return;

  /*
   * Curvature editing uses its own lightweight anchor/preview overlay.
   * Do not layer Selection's transform silhouette, resize handles, rotation
   * handle, or centre handle on top; they obscure the curve being shaped.
   */
  if (activeTool === "curvature") {
    selectionQuickMenu.replaceChildren();
    selectionQuickMenu.hidden = true;
    return;
  }

  if (selectedItems.length > 1) {
    drawMultiSelectionOutlines();
    return;
  }

  if (!selected || !selected.isConnected) return;

  if (
    imageCropTarget ===
      selected &&
    imageCropDraft &&
    activeTool ===
      "select"
  ) {
    drawImageCropControls(
      selected
    );
    return;
  }

  drawSelectionSilhouette(selected, true);

  if (isGroup(selected) && activeTool === "vertex") {
    if (selected.dataset.traceMode) {
      const editableTracePaths = Array.from(
        selected.querySelectorAll(
          ':scope > path[data-potrace-editable-path="true"], :scope > path[data-trace-contour-proxy="true"]'
        )
      ).filter(path => Array.isArray(path._anchors) && path._anchors.length >= 2);

      if (editableTracePaths.length) {
        selectedItems = editableTracePaths;
        selected = editableTracePaths[0];
        selectedAnchorIndices = new Set();
        selectedAnchorIndex = null;
        selectedVertexRefs = [];
        drawSelectedPathsVertexHandles();
        toolStatus.textContent = editableTracePaths.length === 1
          ? `Vertex Select: editable Potrace path • ${editableTracePaths[0]._anchors.length} anchors`
          : `Vertex Select: ${editableTracePaths.length} editable Potrace contours`;
      }
    }
    return;
  }

  /*
   * While constructing a Bézier path, expose the same anchor/tangent
   * geometry used by Direct Selection. This keeps direction handles visible
   * live while the current anchor is click-dragged.
   */
  if (
    activeTool === "pen" &&
    selected === activePath &&
    selected.tagName === "path" &&
    selected._anchors
  ) {
    drawPathHandles();
    return;
  }

  if (activeTool === "vertex") {
    /*
     * Direct/Vertex Selection exposes only editable geometry. It deliberately
     * hides object transform handles so vertex edits cannot be confused with
     * scaling or rotation.
     */
    if (selected.tagName === "path" && selected._anchors) {
      drawPathHandles();
      return;
    }

    if (selected.tagName === "line") {
      const p1 = canvasPointFromLocal(
        selected,
        Number(selected.getAttribute("x1")),
        Number(selected.getAttribute("y1"))
      );

      const p2 = canvasPointFromLocal(
        selected,
        Number(selected.getAttribute("x2")),
        Number(selected.getAttribute("y2"))
      );

      addHandle(p1.x, p1.y, "line-start", "handle-nw");
      addHandle(p2.x, p2.y, "line-end", "handle-se");
      return;
    }

    if (isCornerEditableRectangle(selected)) {
      drawRectangleCornerControls();
      drawPrimitiveVertexHandles(selected);
      return;
    }

    if (isCornerEditablePolygon(selected)) {
      drawPolygonCornerControls();
      drawPrimitiveVertexHandles(selected);
      return;
    }

    if (selected.tagName === "ellipse") {
      drawPrimitiveVertexHandles(selected);
      return;
    }

    /*
     * Other primitives without a meaningful direct vertex model expose no
     * anchors until converted to a path.
     */
    return;
  }

  if (selected.tagName === "line") {
    const p1 = canvasPointFromLocal(
      selected,
      Number(selected.getAttribute("x1")),
      Number(selected.getAttribute("y1"))
    );

    const p2 = canvasPointFromLocal(
      selected,
      Number(selected.getAttribute("x2")),
      Number(selected.getAttribute("y2"))
    );

    addHandle(p1.x, p1.y, "line-start", "handle-nw");
    addHandle(p2.x, p2.y, "line-end", "handle-se");
    drawRotationHandleForSelected();
    drawSelectedCenterMoveHandle(
      selected
    );
    return;
  }

  const box =
    editableLocalBounds(
      selected
    );

  const nw = canvasPointFromLocal(selected, box.x, box.y);
  const ne = canvasPointFromLocal(selected, box.x + box.width, box.y);
  const se = canvasPointFromLocal(
    selected,
    box.x + box.width,
    box.y + box.height
  );
  const sw = canvasPointFromLocal(selected, box.x, box.y + box.height);

  const n = {
    x: (nw.x + ne.x) / 2,
    y: (nw.y + ne.y) / 2
  };
  const e = {
    x: (ne.x + se.x) / 2,
    y: (ne.y + se.y) / 2
  };
  const s = {
    x: (sw.x + se.x) / 2,
    y: (sw.y + se.y) / 2
  };
  const w = {
    x: (nw.x + sw.x) / 2,
    y: (nw.y + sw.y) / 2
  };
  const center = {
    x: (nw.x + se.x) / 2,
    y: (nw.y + se.y) / 2
  };

  if (
    selected.tagName === "rect" ||
    selected.dataset.roundedRect === "true"
  ) {
    selectionOverlay.appendChild(svgEl("polygon", {
      points: `${nw.x},${nw.y} ${ne.x},${ne.y} ${se.x},${se.y} ${sw.x},${sw.y}`,
      class: "selection-outline rectangle-selection-outline"
    }));
  }

  [
    [nw.x, nw.y, "nw", "handle-nw"],
    [n.x, n.y, "n", "handle-n"],
    [ne.x, ne.y, "ne", "handle-ne"],
    [e.x, e.y, "e", "handle-e"],
    [se.x, se.y, "se", "handle-se"],
    [s.x, s.y, "s", "handle-s"],
    [sw.x, sw.y, "sw", "handle-sw"],
    [w.x, w.y, "w", "handle-w"]
  ].forEach(args => addHandle(...args));

  addRotationHandle(center, n);
  drawSelectedCenterMoveHandle(
    selected
  );


  requestAnimationFrame(
    renderFillSeamUnderlayPassive
  );
}



function syncOwnerPathAnchorMirror(
  ownerPath,
  preferredIndex =
    null
) {
  if (
    !ownerPath ||
    ownerPath.tagName !==
      "path"
  ) {
    return;
  }

  selected =
    ownerPath;

  const ownerPathId =
    ensurePathConstraintId(
      ownerPath
    );

  const ownerIndices =
    selectedVertexRefsPruned()
      .filter(
        ref =>
          ref.pathId ===
            ownerPathId
      )
      .map(
        ref =>
          ref.anchor
      );

  selectedAnchorIndices =
    new Set(
      ownerIndices
    );

  selectedAnchorIndex =
    Number.isInteger(
      preferredIndex
    )
      ? preferredIndex
      : (
          ownerIndices.at(-1) ??
          null
        );
}

function notifyConstraintMakerFromVertexRefs() {
  if (
    geometryConstraintsPanelRequested &&
    selectedConstraintVertexRefs()
      .length === 2
  ) {
    constraintMakerSelectionFromCurrentVertexSelection();
  }
}

function beginMultiPathVertexDrag(
  ownerPath,
  anchorIndex,
  point
) {
  if (
    !ownerPath ||
    ownerPath.tagName !==
      "path" ||
    !ownerPath._anchors?.[
      anchorIndex
    ]
  ) {
    return false;
  }

  const ownerRef =
    selectedVertexRefForPathAnchor(
      ownerPath,
      anchorIndex
    );

  if (!ownerRef) {
    return false;
  }

  /*
   * Drag start must not alter cross-path vertex selection. The pointerdown
   * selection branch has already decided which vertices are selected.
   */
  if (
    !selectedVertexRefIsSelected(
      ownerPath,
      anchorIndex
    )
  ) {
    return false;
  }

  const refs =
    selectedVertexRefsPruned();

  const originals =
    refs
      .map(
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
            return null;
          }

          return {
            path,
            pathId:
              ref.pathId,
            index:
              ref.anchor,
            anchor: {
              x:
                anchor.x,
              y:
                anchor.y,
              inX:
                anchor.inX,
              inY:
                anchor.inY,
              outX:
                anchor.outX,
              outY:
                anchor.outY
            },
            canvasAnchor:
              canvasPointFromLocal(
                path,
                anchor.x,
                anchor.y
              )
          };
        }
      )
      .filter(
        Boolean
      );

  if (!originals.length) {
    return false;
  }

  selected =
    ownerPath;

  const ownerPathId =
    ensurePathConstraintId(
      ownerPath
    );

  const ownerIndices =
    refs
      .filter(
        ref =>
          ref.pathId ===
            ownerPathId
      )
      .map(
        ref =>
          ref.anchor
      );

  selectedAnchorIndices =
    new Set(
      ownerIndices
    );

  selectedAnchorIndex =
    anchorIndex;

  editDrag = {
    type:
      "anchor",
    multiPath:
      true,
    startCanvas: {
      x:
        point.x,
      y:
        point.y
    },
    originals
  };

  return true;
}

function updateMultiPathVertexDrag(
  point
) {
  if (
    !editDrag?.multiPath ||
    editDrag.type !==
      "anchor"
  ) {
    return false;
  }

  const dx =
    point.x -
    editDrag.startCanvas.x;

  const dy =
    point.y -
    editDrag.startCanvas.y;

  const touchedPaths =
    new Map();

  editDrag.originals.forEach(
    original => {
      const path =
        original.path;

      const anchor =
        path?._anchors?.[
          original.index
        ];

      if (
        !path ||
        !anchor
      ) {
        return;
      }

      const nextLocal =
        localPointFromCanvas(
          path,
          {
            x:
              original.canvasAnchor.x +
              dx,
            y:
              original.canvasAnchor.y +
              dy
          }
        );

      const localDx =
        nextLocal.x -
        original.anchor.x;

      const localDy =
        nextLocal.y -
        original.anchor.y;

      anchor.x =
        original.anchor.x +
        localDx;

      anchor.y =
        original.anchor.y +
        localDy;

      anchor.inX =
        original.anchor.inX +
        localDx;

      anchor.inY =
        original.anchor.inY +
        localDy;

      anchor.outX =
        original.anchor.outX +
        localDx;

      anchor.outY =
        original.anchor.outY +
        localDy;

      if (
        !touchedPaths.has(
          original.pathId
        )
      ) {
        touchedPaths.set(
          original.pathId,
          {
            path,
            indices:
              []
          }
        );
      }

      touchedPaths
        .get(
          original.pathId
        )
        .indices.push(
          original.index
        );
    }
  );

  /*
   * First satisfy constraints internal to each touched path, then satisfy
   * document-level constraints while all user-dragged vertices are locked.
   */
  touchedPaths.forEach(
    entry => {
      enforcePathGeometryConstraints(
        entry.path,
        new Set(
          entry.indices
        )
      );

      updatePathD(
        entry.path
      );
    }
  );

  const lockedKeys =
    new Set(
      editDrag.originals.map(
        original =>
          `${original.pathId}:${original.index}`
      )
    );

  enforceDocumentGeometryConstraints(
    lockedKeys
  );

  touchedPaths.forEach(
    entry => {
      updatePathD(
        entry.path
      );
    }
  );

  drawSelection();

  return true;
}

function beginMultiSelectionTransformDrag(handle, point) {
  if (!handle || selectedItems.length < 2) return false;

  const handleName = handle.dataset.handle;
  const isResizeHandle = [
    "nw", "n", "ne", "e",
    "se", "s", "sw", "w"
  ].includes(handleName);

  if (handleName !== "rotate" && !isResizeHandle) return false;

  const frame = ensureMultiSelectionFrame();
  if (!frame) return false;

  const center = { ...frame.center };

  const originals = selectedItems
    .filter(element => element?.isConnected)
    .map(element => {
      const localCenter = getLocalCenter(element);
      return {
        element,
        tx: getTranslation(element).x,
        ty: getTranslation(element).y,
        rotation: getRotation(element),
        scale: getObjectScale(element),
        centerCanvas: canvasPointFromLocal(
          element,
          localCenter.x,
          localCenter.y
        )
      };
    });

  if (!originals.length) return false;

  if (handleName === "rotate") {
    editDrag = {
      type: "multi-rotate",
      center,
      startAngle: angleBetween(center, point),
      startFrameAngle: frame.angle || 0,
      originals
    };
    return true;
  }

  editDrag = {
    type: "multi-resize",
    handle: handleName,
    center,
    frameAngle: frame.angle || 0,
    frameWidth: Math.max(0.001, frame.width),
    frameHeight: Math.max(0.001, frame.height),
    bounds: {
      left: -frame.width / 2,
      top: -frame.height / 2,
      right: frame.width / 2,
      bottom: frame.height / 2
    },
    aspectRatio:
      frame.width / Math.max(1e-9, frame.height),
    originals
  };

  return true;
}

function beginGeometryHandleDrag(handle, point) {
  if (!selected) return;

  if (selectedItems.length > 1) {
    beginMultiSelectionTransformDrag(handle, point);
    return;
  }

  const t = getTranslation(selected);

  if (
    handle.dataset.handle ===
      "path-corner-radius"
  ) {
    const index =
      Number(
        handle.dataset.radiusIndex
      );

    if (
      !isPathLiveCornerEligible(
        selected,
        index
      )
    ) {
      return;
    }

    const localStart =
      localPointFromCanvas(
        selected,
        point
      );

    const anchor =
      selected._anchors[index];

    const startDistance =
      Math.hypot(
        localStart.x -
          anchor.x,
        localStart.y -
          anchor.y
      );

    const selectedIndices =
      (
        selectedAnchorIndices
          .has(index)
          ? [...selectedAnchorIndices]
          : [index]
      )
        .filter(candidate =>
          isPathLiveCornerEligible(
            selected,
            candidate
          )
        );

    editDrag = {
      type:
        "path-corner-radius",
      index,
      indices:
        selectedIndices,
      originalRadii:
        pathCornerRadii(
          selected,
          selected._anchors.length
        ),
      startDistance
    };

    return;
  }

  if (handle.dataset.handle === "polygon-corner-radius") {
    if (selected.tagName === "polygon") {
      selected = convertPolygonToCornerEditablePath(selected);
      selectedItems = [selected];
    }

    const index = Number(handle.dataset.radiusIndex);
    const points = polygonVertices(selected);
    const corner = points[index];
    const localStart = localPointFromCanvas(selected, point);
    const startDistance = vectorLength(
      localStart.x - corner.x,
      localStart.y - corner.y
    );

    editDrag = {
      type: "polygon-corner-radius",
      index,
      originalRadii: polygonCornerRadii(selected, points.length),
      corners: roundedCornerSelection.size
        ? [...roundedCornerSelection]
            .filter(key => /^p\d+$/.test(key))
            .map(key => Number(key.slice(1)))
            .filter(i => isRoundablePolygonCorner(points, i))
        : [index],
      startDistance
    };
    return;
  }

  if (handle.dataset.handle === "corner-radius") {
    if (selected.tagName === "rect") {
      selected = convertRectToCornerEditablePath(selected);
      selectedItems = [selected];
    }

    const corner = handle.dataset.radiusCorner;
    editDrag = {
      type: "corner-radius",
      corner,
      localStart: localPointFromCanvas(selected, point),
      direction: cornerInwardDirection(corner),
      originalRadii: { ...rectangleCornerRadii(selected) },
      corners: roundedCornerSelection.size
        ? [...roundedCornerSelection]
        : [corner],
      tx: t.x,
      ty: t.y
    };
    return;
  }

  if (handle.dataset.handle === "rotate") {
    const box =
      editableLocalBounds(
        selected
      );
    const localCenter = {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2
    };

    // dataset.rotation is local to the selected object's parent. Measure the
    // pointer angle in that same coordinate space so grouped-child rotation
    // remains smooth after parent translation/rotation/scaling.
    const centerParent = {
      x: localCenter.x + t.x,
      y: localCenter.y + t.y
    };
    const pointerParent = parentPointFromCanvas(selected, point);

    editDrag = {
      type: "rotate",
      center: canvasPointFromLocal(selected, localCenter.x, localCenter.y),
      centerParent,
      startAngle: angleBetween(centerParent, pointerParent),
      originalRotation: getRotation(selected),
      tx: t.x,
      ty: t.y
    };
    return;
  }

  if (handle.dataset.anchorIndex !== undefined) {
    const index =
      Number(
        handle.dataset.anchorIndex
      );

    if (
      !selectedAnchorIndices.has(
        index
      )
    ) {
      setVertexAnchorSelection(
        index,
        false
      );
    } else {
      selectedAnchorIndex =
        index;
    }

    editDrag = {
      type: "anchor",
      index: selectedAnchorIndex,
      indices:
        [...selectedAnchorIndices],
      start: point,
      tx: t.x,
      ty: t.y
    };
    return;
  }

  if (handle.dataset.controlIndex !== undefined) {
    selectedAnchorIndex =
      Number(handle.dataset.controlIndex);

    editDrag = {
      type: "control",
      index: selectedAnchorIndex,
      side: handle.dataset.controlSide,
      start: point,
      tx: t.x,
      ty: t.y
    };
    return;
  }

  if (selected.tagName === "line") {
    editDrag = {
      type: handle.dataset.handle,
      tx: t.x,
      ty: t.y
    };
    return;
  }

  const box =
    editableLocalBounds(
      selected
    );
  const scale = getObjectScale(selected);

  editDrag = {
    type: "resize",
    handle: handle.dataset.handle,
    box: {
      left: box.x,
      top: box.y,
      right: box.x + box.width,
      bottom: box.y + box.height
    },
    aspectRatio: box.height ? box.width / box.height : 1,
    tx: t.x,
    ty: t.y,
    rotation: getRotation(selected),
    scaleX: scale.x,
    scaleY: scale.y,
    center: {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2
    },
    perspectiveSource:
      perspective2State.visible &&
      selected.dataset.perspective2 === "true" &&
      selected.dataset.perspective2Source
        ? perspective2ShapeSourceData(selected)
        : null
  };
}


function updatePerspective2SourceFromResize(
  element,
  edit,
  left,
  top,
  right,
  bottom
) {
  if (
    !element ||
    !edit?.perspectiveSource ||
    !perspective2State.visible
  ) {
    return false;
  }

  const source = {
    ...edit.perspectiveSource
  };

  const handle =
    edit.handle || "";

  const originalStartX =
    Number(source.startX);

  const originalStartY =
    Number(source.startY);

  const originalEndX =
    Number(source.endX);

  const originalEndY =
    Number(source.endY);

  if (
    ![
      originalStartX,
      originalStartY,
      originalEndX,
      originalEndY
    ].every(Number.isFinite)
  ) {
    return false;
  }

  const oldLeft =
    edit.box.left;

  const oldTop =
    edit.box.top;

  const oldRight =
    edit.box.right;

  const oldBottom =
    edit.box.bottom;

  const oldW =
    Math.max(
      1e-9,
      oldRight - oldLeft
    );

  const oldH =
    Math.max(
      1e-9,
      oldBottom - oldTop
    );

  const newLeft =
    Math.min(
      left,
      right
    );

  const newTop =
    Math.min(
      top,
      bottom
    );

  const newW =
    Math.max(
      1,
      Math.abs(
        right - left
      )
    );

  const newH =
    Math.max(
      1,
      Math.abs(
        bottom - top
      )
    );

  const mapX =
    value =>
      newLeft +
      (
        (
          value -
          oldLeft
        ) /
        oldW
      ) *
      newW;

  const mapY =
    value =>
      newTop +
      (
        (
          value -
          oldTop
        ) /
        oldH
      ) *
      newH;

  /*
   * Resize the stored construction rectangle instead of applying a flat SVG
   * scale. Reprojection then keeps all affected edges converging to the
   * correct vanishing point(s).
   */
  source.startX =
    mapX(
      originalStartX
    );

  source.endX =
    mapX(
      originalEndX
    );

  source.startY =
    mapY(
      originalStartY
    );

  source.endY =
    mapY(
      originalEndY
    );

  setPerspective2ShapeSourceData(
    element,
    source
  );

  element.dataset.tx =
    "0";

  element.dataset.ty =
    "0";

  element.dataset.scaleX =
    "1";

  element.dataset.scaleY =
    "1";

  element.dataset.rotation =
    "0";

  applyObjectTransform(
    element
  );

  perspective2ProjectedPathFromSource(
    element,
    source
  );

  return true;
}

function updateMultiSelectionTransformDrag(point) {
  if (!editDrag || !Array.isArray(editDrag.originals)) return false;

  if (editDrag.type === "multi-rotate") {
    let delta = angleBetween(editDrag.center, point) - editDrag.startAngle;
    delta = snapRotationAngle(delta);

    if (multiSelectionFrameMatchesSelection()) {
      multiSelectionFrame.center = { ...editDrag.center };
      multiSelectionFrame.angle = editDrag.startFrameAngle + delta;
    }

    editDrag.originals.forEach(original => {
      const element = original.element;
      if (!element?.isConnected) return;

      const targetCenter = rotatePoint(
        original.centerCanvas,
        editDrag.center,
        delta
      );

      element.dataset.rotation = String(original.rotation + delta);
      element.dataset.tx = String(
        original.tx + targetCenter.x - original.centerCanvas.x
      );
      element.dataset.ty = String(
        original.ty + targetCenter.y - original.centerCanvas.y
      );
      applyObjectTransform(element);
    });

    drawSelection();
    return true;
  }

  if (editDrag.type === "multi-resize") {
    const b = editDrag.bounds;
    const handle = editDrag.handle;
    const angle = editDrag.frameAngle || 0;

    // Work in the oriented selection frame's local coordinate system.
    const localPointerCanvas = rotatePoint(point, editDrag.center, -angle);
    const localPoint = {
      x: localPointerCanvas.x - editDrag.center.x,
      y: localPointerCanvas.y - editDrag.center.y
    };

    let left = b.left;
    let top = b.top;
    let right = b.right;
    let bottom = b.bottom;

    if (handle.includes("w")) left = localPoint.x;
    if (handle.includes("e")) right = localPoint.x;
    if (handle.includes("n")) top = localPoint.y;
    if (handle.includes("s")) bottom = localPoint.y;

    if (handle === "n" || handle === "s") {
      left = b.left;
      right = b.right;
    }
    if (handle === "e" || handle === "w") {
      top = b.top;
      bottom = b.bottom;
    }

    if (altDown) {
      if (handle.includes("w")) right = -left;
      if (handle.includes("e")) left = -right;
      if (handle.includes("n")) bottom = -top;
      if (handle.includes("s")) top = -bottom;
    }

    const corner = ["nw", "ne", "se", "sw"].includes(handle);
    if (shiftDown && corner) {
      const oldW = Math.max(1e-9, b.right - b.left);
      const oldH = Math.max(1e-9, b.bottom - b.top);

      if (altDown) {
        const dx = localPoint.x;
        const dy = localPoint.y;
        const halfW = Math.max(Math.abs(dx), Math.abs(dy) * editDrag.aspectRatio);
        const halfH = halfW / Math.max(1e-9, editDrag.aspectRatio);
        left = -halfW;
        right = halfW;
        top = -halfH;
        bottom = halfH;
      } else {
        const fixedX = handle.includes("w") ? b.right : b.left;
        const fixedY = handle.includes("n") ? b.bottom : b.top;
        const dx = localPoint.x - fixedX;
        const dy = localPoint.y - fixedY;
        const factor = Math.max(Math.abs(dx) / oldW, Math.abs(dy) / oldH);
        const sxSign = Math.sign(dx || (handle.includes("w") ? -1 : 1));
        const sySign = Math.sign(dy || (handle.includes("n") ? -1 : 1));
        const movingX = fixedX + sxSign * oldW * factor;
        const movingY = fixedY + sySign * oldH * factor;

        if (handle.includes("w")) left = movingX;
        else right = movingX;
        if (handle.includes("n")) top = movingY;
        else bottom = movingY;
      }
    }

    const oldW = Math.max(1e-9, b.right - b.left);
    const oldH = Math.max(1e-9, b.bottom - b.top);

    let sx = (right - left) / oldW;
    let sy = (bottom - top) / oldH;

    if (handle === "n" || handle === "s") sx = 1;
    if (handle === "e" || handle === "w") sy = 1;

    // Avoid singular transforms while still allowing a drag to cross and flip.
    if (Math.abs(sx) < 0.001) sx = Math.sign(sx || 1) * 0.001;
    if (Math.abs(sy) < 0.001) sy = Math.sign(sy || 1) * 0.001;

    const fixedLocal = altDown
      ? { x: 0, y: 0 }
      : {
          x: handle.includes("w")
            ? b.right
            : handle.includes("e")
              ? b.left
              : 0,
          y: handle.includes("n")
            ? b.bottom
            : handle.includes("s")
              ? b.top
              : 0
        };

    editDrag.originals.forEach(original => {
      const element = original.element;
      if (!element?.isConnected) return;

      const unrotatedCenter = rotatePoint(
        original.centerCanvas,
        editDrag.center,
        -angle
      );
      const originalLocal = {
        x: unrotatedCenter.x - editDrag.center.x,
        y: unrotatedCenter.y - editDrag.center.y
      };
      const targetLocal = {
        x: fixedLocal.x + (originalLocal.x - fixedLocal.x) * sx,
        y: fixedLocal.y + (originalLocal.y - fixedLocal.y) * sy
      };
      const targetCenter = rotatePoint(
        {
          x: editDrag.center.x + targetLocal.x,
          y: editDrag.center.y + targetLocal.y
        },
        editDrag.center,
        angle
      );

      element.dataset.scaleX = String(original.scale.x * sx);
      element.dataset.scaleY = String(original.scale.y * sy);
      element.dataset.tx = String(
        original.tx + targetCenter.x - original.centerCanvas.x
      );
      element.dataset.ty = String(
        original.ty + targetCenter.y - original.centerCanvas.y
      );
      applyObjectTransform(element);
    });

    // Keep the oriented transform frame fitted to the live scale instead of
    // retaining its pre-drag dimensions.
    if (multiSelectionFrameMatchesSelection()) {
      const localCenterOffset = {
        x: (left + right) / 2,
        y: (top + bottom) / 2
      };
      const frameCenter = rotatePoint(
        {
          x: editDrag.center.x + localCenterOffset.x,
          y: editDrag.center.y + localCenterOffset.y
        },
        editDrag.center,
        angle
      );
      multiSelectionFrame.center = frameCenter;
      multiSelectionFrame.width = Math.max(0.001, Math.abs(right - left));
      multiSelectionFrame.height = Math.max(0.001, Math.abs(bottom - top));
      multiSelectionFrame.angle = angle;
    }

    drawSelection();
    return true;
  }

  return false;
}

function updateGeometryHandleDrag(point) {
  if (!editDrag || !selected) return;

  if (
    editDrag.type === "multi-rotate" ||
    editDrag.type === "multi-resize"
  ) {
    updateMultiSelectionTransformDrag(point);
    return;
  }

  if (
    pathHasFixedGeometryConstraint(
      selected
    ) &&
    [
      "anchor",
      "control",
      "resize",
      "corner-radius",
      "path-corner-radius",
      "line-start",
      "line-end"
    ].includes(
      editDrag.type
    )
  ) {
    restoreFixedGeometryConstraint(
      selected,
      fixedGeometryConstraint(
        selected
      )
    );

    toolStatus.textContent =
      "Geometry is locked • remove Current Geometry constraint to reshape";

    drawSelection();
    return;
  }

  if (
    editDrag.type ===
      "anchor" &&
    selected &&
    editDrag.indices?.some(
      index =>
        pinnedVertexConstraintMap(
          selected
        ).has(
          Number(index)
        )
    )
  ) {
    enforcePinnedVertices(
      selected
    );

    updatePathD(
      selected
    );

    toolStatus.textContent =
      "Pinned vertex cannot move • remove its Pin Vertex constraint first";

    drawSelection();
    return;
  }

  if (
    editDrag.type === "anchor" &&
    editDrag.multiPath
  ) {
    updateMultiPathVertexDrag(
      point
    );

    return;
  }

  if (editDrag.type === "rotate") {
    const centerForAngle = editDrag.centerParent || editDrag.center;
    const pointerForAngle = editDrag.centerParent
      ? parentPointFromCanvas(selected, point)
      : point;
    const pointerAngle = angleBetween(centerForAngle, pointerForAngle);
    const delta = pointerAngle - editDrag.startAngle;
    const angle = snapRotationAngle(
      editDrag.originalRotation + delta
    );

    selected.dataset.rotation = angle;
    applyObjectTransform(selected);
    drawSelection();
    return;
  }

  const usesTransformScaling =
    editDrag?.type === "resize" &&
    (
      isGroup(selected) ||
      (
        selected.tagName === "path" &&
        selected.dataset.roundedRect !== "true" &&
        selected.dataset.roundedPolygon !== "true"
      ) ||
      selected.dataset.compoundShape === "true" ||
      isRasterImageElement(selected)
    );

  const local = usesTransformScaling
    ? localPointFromCanvasWithTransform(
        selected,
        point,
        {
          tx: editDrag.tx,
          ty: editDrag.ty,
          rotation: editDrag.rotation,
          scaleX: editDrag.scaleX,
          scaleY: editDrag.scaleY,
          center: editDrag.center
        }
      )
    : localPointFromCanvas(selected, point);

  if (
    editDrag.type ===
      "path-corner-radius"
  ) {
    const anchor =
      selected._anchors[
        editDrag.index
      ];

    if (!anchor) return;

    const currentDistance =
      Math.hypot(
        local.x - anchor.x,
        local.y - anchor.y
      );

    const baseRadius =
      Number(
        editDrag.originalRadii[
          editDrag.index
        ] || 0
      );

    let nextRadius =
      Math.max(
        0,
        baseRadius +
          (
            currentDistance -
            editDrag.startDistance
          )
      );

    if (snapSettings.grid) {
      const gridRadius =
        Math.round(
          nextRadius /
          GRID_SIZE
        ) *
        GRID_SIZE;

      if (
        Math.abs(
          gridRadius -
          nextRadius
        ) <=
        snapThreshold()
      ) {
        nextRadius =
          gridRadius;
      }
    }

    const radii =
      [
        ...editDrag.originalRadii
      ];

    editDrag.indices.forEach(
      index => {
        radii[index] =
          Math.min(
            nextRadius,
            pathLiveCornerMaxRadius(
              selected,
              index
            )
          );
      }
    );

    selected.dataset
      .pathCornerRadii =
        JSON.stringify(
          radii
        );

    updatePathD(
      selected
    );

    drawSelection();
    return;
  }

  if (editDrag.type === "polygon-corner-radius") {
    const points = polygonVertices(selected);
    const corner = points[editDrag.index];
    const currentDistance = vectorLength(
      local.x - corner.x,
      local.y - corner.y
    );

    let nextRadius = Math.max(
      0,
      Number(editDrag.originalRadii[editDrag.index] || 0) +
      (currentDistance - editDrag.startDistance)
    );

    if (snapSettings.grid) {
      const gridRadius = Math.round(nextRadius / GRID_SIZE) * GRID_SIZE;
      if (Math.abs(gridRadius - nextRadius) <= snapThreshold()) {
        nextRadius = gridRadius;
      }
    }

    const radii = [...editDrag.originalRadii];

    editDrag.corners.forEach(index => {
      radii[index] = Math.min(
        nextRadius,
        polygonCornerMaxRadius(points, index)
      );
    });

    selected.dataset.cornerRadii = JSON.stringify(radii);
    updateRoundedPolygonPath(selected);
    drawSelection();
    return;
  }

  if (editDrag.type === "corner-radius") {
    const dx = local.x - editDrag.localStart.x;
    const dy = local.y - editDrag.localStart.y;
    const delta = (
      dx * editDrag.direction.x +
      dy * editDrag.direction.y
    ) / 2;

    const baseRadius = Number(
      editDrag.originalRadii[editDrag.corner] || 0
    );

    let nextRadius = Math.max(0, baseRadius + delta);

    if (snapSettings.grid) {
      const gridRadius = Math.round(nextRadius / GRID_SIZE) * GRID_SIZE;
      if (Math.abs(gridRadius - nextRadius) <= snapThreshold()) {
        nextRadius = gridRadius;
      }
    }

    const frame = rectangleFrame(selected);
    nextRadius = Math.min(
      nextRadius,
      rectangleCornerMaxRadius(frame, rectangleCornerProfile(selected))
    );

    editDrag.corners.forEach(corner => {
      const suffix = corner.charAt(0).toUpperCase() + corner.slice(1);
      selected.dataset[`corner${suffix}`] = nextRadius;
    });

    updateRoundedRectanglePath(selected);
    drawSelection();
    return;
  }

  if (editDrag.type === "anchor") {
    const primary =
      selected._anchors[
        editDrag.index
      ];

    if (!primary) return;

    const dx =
      local.x - primary.x;

    const dy =
      local.y - primary.y;

    const indices =
      Array.isArray(
        editDrag.indices
      ) &&
      editDrag.indices.length
        ? editDrag.indices
        : [editDrag.index];

    indices.forEach(index => {
      const anchor =
        selected._anchors[index];

      if (!anchor) return;

      anchor.x += dx;
      anchor.y += dy;
      anchor.inX += dx;
      anchor.inY += dy;
      anchor.outX += dx;
      anchor.outY += dy;
    });

    enforcePathGeometryConstraints(
      selected,
      new Set(indices)
    );

    enforceDocumentGeometryConstraints(
      lockedCrossConstraintKeysForPath(
        selected,
        indices
      )
    );

    updatePathD(selected);
    drawSelection();
    return;
  }

  if (editDrag.type === "control") {
    const a = selected._anchors[editDrag.index];

    if (editDrag.side === "in") {
      a.inX = local.x;
      a.inY = local.y;
    } else {
      a.outX = local.x;
      a.outY = local.y;
    }

    if (a.handleMode === "smooth") {
      const movedX =
        editDrag.side === "in"
          ? a.inX
          : a.outX;

      const movedY =
        editDrag.side === "in"
          ? a.inY
          : a.outY;

      const oppositeX =
        editDrag.side === "in"
          ? a.outX
          : a.inX;

      const oppositeY =
        editDrag.side === "in"
          ? a.outY
          : a.inY;

      const vx = movedX - a.x;
      const vy = movedY - a.y;
      const movedLength =
        Math.hypot(vx, vy);

      const oppositeLength =
        Math.hypot(
          oppositeX - a.x,
          oppositeY - a.y
        );

      if (movedLength > 1e-9) {
        const ux = vx / movedLength;
        const uy = vy / movedLength;

        if (editDrag.side === "in") {
          a.outX =
            a.x - ux * oppositeLength;
          a.outY =
            a.y - uy * oppositeLength;
        } else {
          a.inX =
            a.x - ux * oppositeLength;
          a.inY =
            a.y - uy * oppositeLength;
        }
      }
    }

    updatePathD(selected);
    drawSelection();
    return;
  }

  if (editDrag.type === "line-start") {
    selected.setAttribute("x1", local.x);
    selected.setAttribute("y1", local.y);
    drawSelection();
    return;
  }

  if (editDrag.type === "line-end") {
    selected.setAttribute("x2", local.x);
    selected.setAttribute("y2", local.y);
    drawSelection();
    return;
  }

  if (editDrag.type === "resize") {
    const resizePins =
      selected?.tagName ===
        "path"
        ? pinnedVertexConstraints(
            selected
          )
        : [];

    const pinResizeFreedom =
      resizePins.length
        ? pinnedResizeFreedom(
            selected,
            editDrag
          )
        : null;

    let { left, top, right, bottom } = editDrag.box;
    const handleName = editDrag.handle;

    if (handleName.includes("w")) left = local.x;
    if (handleName.includes("e")) right = local.x;
    if (handleName.includes("n")) top = local.y;
    if (handleName.includes("s")) bottom = local.y;

    if (handleName === "n" || handleName === "s") {
      left = editDrag.box.left;
      right = editDrag.box.right;
    }

    if (handleName === "e" || handleName === "w") {
      top = editDrag.box.top;
      bottom = editDrag.box.bottom;
    }

    if (altDown) {
      const cx = (editDrag.box.left + editDrag.box.right) / 2;
      const cy = (editDrag.box.top + editDrag.box.bottom) / 2;

      if (handleName.includes("w")) right = cx + (cx - left);
      if (handleName.includes("e")) left = cx - (right - cx);
      if (handleName.includes("n")) bottom = cy + (cy - top);
      if (handleName.includes("s")) top = cy - (bottom - cy);
    }

    const isCorner =
      handleName.length === 2 &&
      ["nw", "ne", "se", "sw"].includes(handleName);

    if (shiftDown && isCorner) {
      const ratio = editDrag.aspectRatio || 1;

      if (altDown) {
        const cx = (editDrag.box.left + editDrag.box.right) / 2;
        const cy = (editDrag.box.top + editDrag.box.bottom) / 2;
        const dx = local.x - cx;
        const dy = local.y - cy;
        const halfWidth = Math.max(Math.abs(dx), Math.abs(dy) * ratio);
        const halfHeight = halfWidth / Math.max(1e-9, ratio);
        left = cx - halfWidth;
        right = cx + halfWidth;
        top = cy - halfHeight;
        bottom = cy + halfHeight;
      } else {
        const fixedX = handleName.includes("w")
          ? editDrag.box.right
          : editDrag.box.left;

        const fixedY = handleName.includes("n")
          ? editDrag.box.bottom
          : editDrag.box.top;

        let dx = local.x - fixedX;
        let dy = local.y - fixedY;

        const widthFromX = Math.abs(dx);
        const widthFromY = Math.abs(dy) * ratio;

        let width;
        let height;

        if (widthFromX >= widthFromY) {
          width = Math.max(1, widthFromX);
          height = width / ratio;
        } else {
          height = Math.max(1, Math.abs(dy));
          width = height * ratio;
        }

        const sx = Math.sign(dx || (handleName.includes("w") ? -1 : 1));
        const sy = Math.sign(dy || (handleName.includes("n") ? -1 : 1));

        const movingX = fixedX + sx * width;
        const movingY = fixedY + sy * height;

        if (handleName.includes("w")) {
          left = movingX;
          right = fixedX;
        } else {
          left = fixedX;
          right = movingX;
        }

        if (handleName.includes("n")) {
          top = movingY;
          bottom = fixedY;
        } else {
          top = fixedY;
          bottom = movingY;
        }
      }
    }

    const x = Math.min(left, right);
    const y = Math.min(top, bottom);
    const w = Math.max(1, Math.abs(right - left));
    const hgt = Math.max(1, Math.abs(bottom - top));

    if (
      editDrag.perspectiveSource &&
      perspective2State.visible &&
      selected.dataset.perspective2 === "true"
    ) {
      updatePerspective2SourceFromResize(
        selected,
        editDrag,
        left,
        top,
        right,
        bottom
      );

      drawSelection();
      return;
    }

    if (usesTransformScaling) {
      const oldW = Math.max(
        1e-9,
        editDrag.box.right - editDrag.box.left
      );
      const oldH = Math.max(
        1e-9,
        editDrag.box.bottom - editDrag.box.top
      );

      let nextScaleX =
        editDrag.scaleX * (w / oldW);
      let nextScaleY =
        editDrag.scaleY * (hgt / oldH);

      const handleName = editDrag.handle;

      const fixedLocal = altDown
        ? { ...editDrag.center }
        : {
            x:
              handleName.includes("w")
                ? editDrag.box.right
                : handleName.includes("e")
                  ? editDrag.box.left
                  : (editDrag.box.left + editDrag.box.right) / 2,
            y:
              handleName.includes("n")
                ? editDrag.box.bottom
                : handleName.includes("s")
                  ? editDrag.box.top
                  : (editDrag.box.top + editDrag.box.bottom) / 2
          };

      /*
       * Side handles fix the opposite side's midpoint; corner handles fix the
       * opposite corner. The original fixed canvas point is kept stationary
       * by compensating object translation after scaling.
       */
      const originalFixedCanvas = (() => {
        const center = editDrag.center;
        const scaled = {
          x: center.x +
            (fixedLocal.x - center.x) * editDrag.scaleX,
          y: center.y +
            (fixedLocal.y - center.y) * editDrag.scaleY
        };
        const rotated = rotatePoint(
          scaled,
          center,
          editDrag.rotation
        );

        return {
          x: rotated.x + editDrag.tx,
          y: rotated.y + editDrag.ty
        };
      })();

      if (
        pinResizeFreedom
      ) {
        if (
          !pinResizeFreedom
            .allowScaleX
        ) {
          nextScaleX =
            editDrag.scaleX;
        }

        if (
          !pinResizeFreedom
            .allowScaleY
        ) {
          nextScaleY =
            editDrag.scaleY;
        }
      }

      selected.dataset.scaleX = String(nextScaleX);
      selected.dataset.scaleY = String(nextScaleY);
      selected.dataset.tx = String(editDrag.tx);
      selected.dataset.ty = String(editDrag.ty);
      applyObjectTransform(selected);

      const movedFixedCanvas = canvasPointFromLocal(
        selected,
        fixedLocal.x,
        fixedLocal.y
      );

      selected.dataset.tx = String(
        editDrag.tx +
        originalFixedCanvas.x -
        movedFixedCanvas.x
      );
      selected.dataset.ty = String(
        editDrag.ty +
        originalFixedCanvas.y -
        movedFixedCanvas.y
      );

      applyObjectTransform(selected);

      if (
        selected.tagName ===
          "path" &&
        resizePins.length
      ) {
        preservePinnedVerticesAfterResize(
          selected,
          editDrag,
          pinResizeFreedom
        );

        if (
          resizePins.length > 1 &&
          (
            !pinResizeFreedom
              .allowScaleX ||
            !pinResizeFreedom
              .allowScaleY
          )
        ) {
          const lockedAxes = [
            !pinResizeFreedom
              .allowScaleX
              ? "width"
              : null,
            !pinResizeFreedom
              .allowScaleY
              ? "height"
              : null
          ]
            .filter(Boolean)
            .join(" and ");

          toolStatus.textContent =
            `Pinned vertices preserve ${lockedAxes}; resize remains free on the other axis`;
        }
      }

      if (
        isRasterImageElement(
          selected
        )
      ) {
        ensureImageCropClip(
          selected,
          imageCropTarget === selected &&
            imageCropDraft
            ? imageCropDraft
            : imageCropForElement(
                selected
              )
        );
      }
    } else if (selected.tagName === "rect") {
      selected.setAttribute("x", x);
      selected.setAttribute("y", y);
      selected.setAttribute("width", w);
      selected.setAttribute("height", hgt);
    } else if (selected.dataset.roundedRect === "true") {
      selected.dataset.rectX = x;
      selected.dataset.rectY = y;
      selected.dataset.rectWidth = w;
      selected.dataset.rectHeight = hgt;
      updateRoundedRectanglePath(selected);
    } else if (selected.tagName === "ellipse") {
      selected.setAttribute("cx", x + w / 2);
      selected.setAttribute("cy", y + hgt / 2);
      selected.setAttribute("rx", w / 2);
      selected.setAttribute("ry", hgt / 2);
    } else if (selected.dataset.roundedPolygon === "true") {
      const oldPoints = polygonVertices(selected);
      const oldBox = editDrag.box;
      const oldW = Math.max(1e-9, oldBox.right - oldBox.left);
      const oldH = Math.max(1e-9, oldBox.bottom - oldBox.top);

      const nextPoints = oldPoints.map(point => ({
        x: x + ((point.x - oldBox.left) / oldW) * w,
        y: y + ((point.y - oldBox.top) / oldH) * hgt
      }));

      /*
       * Corner radii are absolute design values, not scale values. Resizing a
       * rounded polygon changes its base vertices but keeps each corner radius
       * unchanged (subject only to the new geometry's collision cap). This
       * prevents X/Y stretching from turning circular corners into enlarged or
       * distorted corners.
       */
      const nextRadii = polygonCornerRadii(selected, oldPoints.length)
        .map(radius => Math.max(0, radius));

      selected.dataset.polygonVertices = JSON.stringify(nextPoints);
      selected.dataset.cornerRadii = JSON.stringify(nextRadii);
      updateRoundedPolygonPath(selected);
    } else if (selected.tagName === "polygon" && selected.dataset.shapeType) {
      updateStandardPolygon(selected, x, y, w, hgt);
    }

    drawSelection();
  }
}


