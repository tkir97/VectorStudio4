/* Vector Studio modular baseline — source lines 30413-33541 from consolidated app.js.
   Classic-script module: shares the browser global lexical scope with ordered sibling modules. */

/* ---------------- PATTERN FILLS ---------------- */

function patternSwatchById(
  id
) {
  return patternSwatches.find(
    swatch =>
      swatch.id === id
  ) || null;
}

function patternDataForElement(
  element
) {
  if (
    !element?.dataset.patternFill
  ) {
    return null;
  }

  try {
    const data =
      JSON.parse(
        element.dataset.patternFill
      );

    return data &&
      data.swatchId
      ? data
      : null;
  } catch {
    return null;
  }
}

function patternDefinitionId(
  element
) {
  if (
    !element.dataset.patternDefinitionId
  ) {
    patternCounter += 1;

    element.dataset.patternDefinitionId =
      `vs-pattern-${patternCounter}`;
  }

  return (
    element.dataset.patternDefinitionId
  );
}

function removePatternDefinition(
  element
) {
  const id =
    element?.dataset.patternDefinitionId;

  if (id) {
    paintDefs
      .querySelector(
        `#${CSS.escape(id)}`
      )
      ?.remove();
  }
}

function stripPatternCloneIdentity(
  root
) {
  if (!root) return;

  root.removeAttribute(
    "data-object"
  );

  root.removeAttribute(
    "id"
  );

  root
    .querySelectorAll(
      "[data-object], [id]"
    )
    .forEach(
      node => {
        node.removeAttribute(
          "data-object"
        );

        node.removeAttribute(
          "id"
        );
      }
    );
}

function patternMarkupFromSelection() {
  const items =
    selectedItems
      .filter(
        item =>
          item &&
          item.isConnected &&
          item.parentNode === art &&
          !isRasterImageElement(
            item
          )
      );

  if (!items.length) {
    return null;
  }

  const bounds =
    selectionUnionCanvasBounds();

  if (
    !bounds ||
    bounds.right -
      bounds.left <= 0 ||
    bounds.bottom -
      bounds.top <= 0
  ) {
    return null;
  }

  const wrapper =
    document.createElementNS(
      SVG_NS,
      "g"
    );

  wrapper.setAttribute(
    "transform",
    `translate(${-bounds.left} ${-bounds.top})`
  );

  items.forEach(
    item => {
      const clone =
        item.cloneNode(
          true
        );

      stripPatternCloneIdentity(
        clone
      );

      wrapper.appendChild(
        clone
      );
    }
  );

  return {
    markup:
      wrapper.innerHTML,
    width:
      Math.max(
        1,
        bounds.right -
          bounds.left
      ),
    height:
      Math.max(
        1,
        bounds.bottom -
          bounds.top
      )
  };
}

function createPatternSwatchFromSelection() {
  const captured =
    patternMarkupFromSelection();

  if (!captured) {
    alert(
      "Select one or more vector objects to create a pattern."
    );

    return null;
  }

  patternCounter += 1;

  const swatch = {
    id:
      `pattern-swatch-${Date.now().toString(36)}-${patternCounter}`,
    name:
      `Pattern ${patternSwatches.length + 1}`,
    markup:
      captured.markup,
    width:
      captured.width,
    height:
      captured.height
  };

  patternSwatches.push(
    swatch
  );

  renderPatternSwatches();

  patternSwatch.value =
    swatch.id;

  updatePatternEditorVisuals();

  scheduleAutosave();

  toolStatus.textContent =
    `${swatch.name} created`;

  return swatch;
}

function currentPatternEditorData() {
  return {
    swatchId:
      patternSwatch.value ||
      "",
    scale:
      Number(
        patternScale.value
      ) || 100,
    rotation:
      Number(
        patternRotation.value
      ) || 0,
    spacingX:
      Number(
        patternSpacingX.value
      ) || 0,
    spacingY:
      Number(
        patternSpacingY.value
      ) || 0
  };
}

function ensurePatternDefinition(
  element,
  data =
    patternDataForElement(
      element
    )
) {
  if (
    !element ||
    !data
  ) {
    return null;
  }

  const swatch =
    patternSwatchById(
      data.swatchId
    );

  if (!swatch) {
    return null;
  }

  const id =
    patternDefinitionId(
      element
    );

  removePatternDefinition(
    element
  );

  const scale =
    Math.max(
      0.01,
      Number(
        data.scale
      ) / 100
    );

  const spacingX =
    Number(
      data.spacingX
    ) || 0;

  const spacingY =
    Number(
      data.spacingY
    ) || 0;

  const motifWidth =
    Math.max(
      0.1,
      swatch.width *
        scale
    );

  const motifHeight =
    Math.max(
      0.1,
      swatch.height *
        scale
    );

  /*
   * Spacing controls the repeat step, not the drawable motif bounds.
   * This allows negative spacing/overlap without clipping the motif.
   */
  const tileWidth =
    Math.max(
      motifWidth * 0.05,
      motifWidth *
        (
          1 +
          spacingX / 100
        )
    );

  const tileHeight =
    Math.max(
      motifHeight * 0.05,
      motifHeight *
        (
          1 +
          spacingY / 100
        )
    );

  const pattern =
    document.createElementNS(
      SVG_NS,
      "pattern"
    );

  pattern.id = id;

  pattern.setAttribute(
    "patternUnits",
    "userSpaceOnUse"
  );

  pattern.setAttribute(
    "patternContentUnits",
    "userSpaceOnUse"
  );

  pattern.setAttribute(
    "width",
    tileWidth
  );

  pattern.setAttribute(
    "height",
    tileHeight
  );

  const angle =
    Number(
      data.rotation
    ) || 0;

  if (angle) {
    pattern.setAttribute(
      "patternTransform",
      `rotate(${angle})`
    );
  }

  /*
   * SVG patterns clip drawing to the pattern tile. When the repeat step is
   * smaller than the motif (negative spacing), duplicate neighboring motifs
   * inside the same tile so the visible overlap is continuous at tile edges.
   */
  const horizontalCopies =
    tileWidth < motifWidth
      ? Math.ceil(
          motifWidth /
          tileWidth
        ) + 1
      : 1;

  const verticalCopies =
    tileHeight < motifHeight
      ? Math.ceil(
          motifHeight /
          tileHeight
        ) + 1
      : 1;

  for (
    let row =
      -verticalCopies;
    row <=
      verticalCopies;
    row += 1
  ) {
    for (
      let column =
        -horizontalCopies;
      column <=
        horizontalCopies;
      column += 1
    ) {
      const content =
        document.createElementNS(
          SVG_NS,
          "g"
        );

      content.setAttribute(
        "transform",
        [
          `translate(${column * tileWidth} ${row * tileHeight})`,
          `scale(${scale})`
        ].join(" ")
      );

      content.innerHTML =
        swatch.markup;

      content
        .querySelectorAll(
          "[data-object]"
        )
        .forEach(
          node =>
            node.removeAttribute(
              "data-object"
            )
        );

      pattern.appendChild(
        content
      );
    }
  }

  paintDefs.appendChild(
    pattern
  );

  return id;
}

function removePatternFillFromElement(
  element
) {
  if (!element) return;

  removePatternDefinition(
    element
  );

  delete element.dataset.patternFill;
  delete element.dataset.patternDefinitionId;
}

function applyPatternToElement(
  element,
  data
) {
  if (
    !element ||
    element.tagName ===
      "line" ||
    isRasterImageElement(
      element
    )
  ) {
    return;
  }

  removeGradientDefinition(
    element
  );

  delete element.dataset.gradient;
  delete element.dataset.gradientId;

  element.dataset.patternFill =
    JSON.stringify(
      data
    );

  const id =
    ensurePatternDefinition(
      element,
      data
    );

  if (!id) return;

  element.setAttribute(
    "fill",
    `url(#${id})`
  );

  if (
    element.dataset.compoundShape ===
      "true"
  ) {
    element
      .querySelectorAll(
        "path"
      )
      .forEach(
        child =>
          child.setAttribute(
            "fill",
            `url(#${id})`
          )
      );
  }
}

function restorePatternDefinitions() {
  art
    .querySelectorAll(
      "[data-pattern-fill]"
    )
    .forEach(
      element => {
        const data =
          patternDataForElement(
            element
          );

        if (data) {
          ensurePatternDefinition(
            element,
            data
          );
        }
      }
    );
}

function renderPatternSwatches() {
  const current =
    patternSwatch.value;

  patternSwatch.replaceChildren();

  if (
    !patternSwatches.length
  ) {
    const option =
      document.createElement(
        "option"
      );

    option.value = "";
    option.textContent =
      "No patterns yet";

    patternSwatch.appendChild(
      option
    );

    return;
  }

  patternSwatches.forEach(
    swatch => {
      const option =
        document.createElement(
          "option"
        );

      option.value =
        swatch.id;

      option.textContent =
        swatch.name;

      patternSwatch.appendChild(
        option
      );
    }
  );

  if (
    patternSwatchById(
      current
    )
  ) {
    patternSwatch.value =
      current;
  }
}

function patternPreviewSvgDataUrl(
  swatch,
  data
) {
  if (!swatch) return "";

  const scale =
    Math.max(
      0.1,
      Number(
        data.scale
      ) / 100
    );

  const spacingX =
    Number(
      data.spacingX
    ) || 0;

  const spacingY =
    Number(
      data.spacingY
    ) || 0;

  const tileW =
    Math.max(
      1,
      swatch.width *
        scale *
        (
          1 +
          spacingX / 100
        )
    );

  const tileH =
    Math.max(
      1,
      swatch.height *
        scale *
        (
          1 +
          spacingY / 100
        )
    );

  const motifW =
    Math.max(
      1,
      swatch.width *
        scale
    );

  const motifH =
    Math.max(
      1,
      swatch.height *
        scale
    );

  const copyX =
    tileW < motifW
      ? Math.ceil(
          motifW /
          tileW
        ) + 1
      : 1;

  const copyY =
    tileH < motifH
      ? Math.ceil(
          motifH /
          tileH
        ) + 1
      : 1;

  let previewMarkup =
    "";

  for (
    let row = -copyY;
    row <= copyY;
    row += 1
  ) {
    for (
      let column = -copyX;
      column <= copyX;
      column += 1
    ) {
      previewMarkup +=
        `<g transform="translate(${column * tileW} ${row * tileH}) scale(${scale})">${swatch.markup}</g>`;
    }
  }

  const svgText =
    `<svg xmlns="${SVG_NS}" width="180" height="90" viewBox="0 0 180 90"><defs><pattern id="p" patternUnits="userSpaceOnUse" width="${tileW}" height="${tileH}" patternTransform="rotate(${Number(data.rotation) || 0})">${previewMarkup}</pattern></defs><rect width="180" height="90" fill="url(#p)"/></svg>`;

  return (
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(
      svgText
    )
  );
}

function updatePatternEditorVisuals() {
  const patternMode =
    fillType.value ===
      "pattern";

  patternEditor.classList.toggle(
    "hidden",
    !patternMode
  );

  const data =
    currentPatternEditorData();

  patternScaleValue.textContent =
    `${Math.round(data.scale)}%`;

  patternRotationValue.textContent =
    `${Math.round(data.rotation)}°`;

  patternSpacingXValue.textContent =
    `${Math.round(data.spacingX)}%`;

  patternSpacingYValue.textContent =
    `${Math.round(data.spacingY)}%`;

  const swatch =
    patternSwatchById(
      data.swatchId
    );

  if (swatch) {
    patternPreview.style.backgroundImage =
      `url("${patternPreviewSvgDataUrl(
        swatch,
        data
      )}")`;

    patternPreview.classList.remove(
      "pattern-preview-empty"
    );
  } else {
    patternPreview.style.backgroundImage =
      "none";

    patternPreview.classList.add(
      "pattern-preview-empty"
    );
  }
}

function syncPatternControlsFromElement(
  element
) {
  const data =
    patternDataForElement(
      element
    );

  if (!data) return false;

  fillType.value =
    "pattern";

  renderPatternSwatches();

  if (
    patternSwatchById(
      data.swatchId
    )
  ) {
    patternSwatch.value =
      data.swatchId;
  }

  patternScale.value =
    data.scale ?? 100;

  patternRotation.value =
    data.rotation ?? 0;

  patternSpacingX.value =
    data.spacingX ?? 0;

  patternSpacingY.value =
    data.spacingY ?? 0;

  updatePatternEditorVisuals();

  return true;
}

function applyPatternEditorToSelection(
  record = false
) {
  if (
    !selectedItems.length
  ) {
    return;
  }

  const data =
    currentPatternEditorData();

  if (
    !patternSwatchById(
      data.swatchId
    )
  ) {
    return;
  }

  selectedItems.forEach(
    item =>
      applyPatternToElement(
        item,
        data
      )
  );

  drawSelection();

  if (record) {
    recordHistory({
      label:
        "Pattern Fill Changed",
      detail:
        "Pattern swatch or repeat settings updated"
    });
  }
}

/* ---------------- GRADIENT FILLS ---------------- */

let gradientCounter = 0;
let patternCounter = 0;
let patternSwatches = [];

function gradientDataForElement(element) {
  if (!element?.dataset.gradient) return null;
  try {
    return JSON.parse(element.dataset.gradient);
  } catch {
    return null;
  }
}

function gradientIdForElement(element) {
  if (!element.dataset.gradientId) {
    gradientCounter += 1;
    element.dataset.gradientId = `vs-gradient-${gradientCounter}`;
  }
  return element.dataset.gradientId;
}

function removeGradientDefinition(element) {
  const id = element?.dataset.gradientId;
  if (!id) return;
  paintDefs.querySelector(`#${CSS.escape(id)}`)?.remove();
}

function gradientVectorFromAngle(angleDegrees) {
  const angle = Number(angleDegrees || 0) * Math.PI / 180;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  return {
    x1: 50 - dx * 50,
    y1: 50 - dy * 50,
    x2: 50 + dx * 50,
    y2: 50 + dy * 50
  };
}

function ensureGradientDefinition(element, data) {
  const id = gradientIdForElement(element);
  removeGradientDefinition(element);

  const gradient = document.createElementNS(
    SVG_NS,
    data.type === "radial" ? "radialGradient" : "linearGradient"
  );

  gradient.id = id;

  if (data.type === "linear") {
    const v = gradientVectorFromAngle(data.angle);
    gradient.setAttribute("x1", `${v.x1}%`);
    gradient.setAttribute("y1", `${v.y1}%`);
    gradient.setAttribute("x2", `${v.x2}%`);
    gradient.setAttribute("y2", `${v.y2}%`);
  } else {
    gradient.setAttribute("cx", `${data.centerX}%`);
    gradient.setAttribute("cy", `${data.centerY}%`);
    gradient.setAttribute("r", `${data.radius}%`);
    gradient.setAttribute("fx", `${data.centerX}%`);
    gradient.setAttribute("fy", `${data.centerY}%`);
  }

  const start = document.createElementNS(SVG_NS, "stop");
  start.setAttribute("offset", `${data.startOffset}%`);
  start.setAttribute("stop-color", data.startColor);

  const end = document.createElementNS(SVG_NS, "stop");
  end.setAttribute("offset", `${data.endOffset}%`);
  end.setAttribute("stop-color", data.endColor);

  gradient.append(start, end);
  paintDefs.appendChild(gradient);
  return id;
}

function applyGradientToElement(element, data) {
  if (!element || element.tagName === "line") return;

  removePatternFillFromElement(element);
  element.dataset.gradient = JSON.stringify(data);
  const id = ensureGradientDefinition(element, data);
  element.setAttribute("fill", `url(#${id})`);

  if (element.dataset.compoundShape === "true") {
    element.querySelectorAll("path").forEach(child => {
      child.setAttribute("fill", `url(#${id})`);
    });
  }
}

function applySolidFillToElement(element, color) {
  if (!element || element.tagName === "line") return;

  removeGradientDefinition(element);
  delete element.dataset.gradient;
  delete element.dataset.gradientId;
  removePatternFillFromElement(element);
  element.setAttribute("fill", color);

  if (element.dataset.compoundShape === "true") {
    element.querySelectorAll("path").forEach(child => {
      child.setAttribute("fill", color);
    });
  }
}

function currentGradientEditorData() {
  return {
    type: fillType.value,
    startColor: gradientStart.value,
    endColor: gradientEnd.value,
    startOffset: Number(gradientStartOffset.value),
    endOffset: Number(gradientEndOffset.value),
    angle: Number(gradientAngle.value),
    centerX: Number(gradientCenterX.value),
    centerY: Number(gradientCenterY.value),
    radius: Number(gradientRadius.value)
  };
}

function updateGradientEditorVisuals() {
  const data = currentGradientEditorData();

  const gradientMode =
    fillType.value === "linear" ||
    fillType.value === "radial";

  gradientEditor.classList.toggle(
    "hidden",
    !gradientMode
  );

  linearGradientControls.classList.toggle(
    "hidden",
    fillType.value !== "linear"
  );

  radialGradientControls.classList.toggle(
    "hidden",
    fillType.value !== "radial"
  );

  updatePatternEditorVisuals();

  gradientStartOffsetValue.textContent = `${data.startOffset}%`;
  gradientEndOffsetValue.textContent = `${data.endOffset}%`;
  gradientAngleValue.textContent = `${data.angle}°`;
  gradientCenterXValue.textContent = `${data.centerX}%`;
  gradientCenterYValue.textContent = `${data.centerY}%`;
  gradientRadiusValue.textContent = `${data.radius}%`;

  gradientPreview.style.background =
    data.type === "radial"
      ? `radial-gradient(circle at ${data.centerX}% ${data.centerY}%, ${data.startColor} ${data.startOffset}%, ${data.endColor} ${data.endOffset}%)`
      : `linear-gradient(${data.angle}deg, ${data.startColor} ${data.startOffset}%, ${data.endColor} ${data.endOffset}%)`;

  syncColorTrigger("gradientStart", gradientStart.value);
  syncColorTrigger("gradientEnd", gradientEnd.value);
}

function syncGradientControlsFromElement(element) {
  const data = gradientDataForElement(element);

  if (!data) {
    fillType.value = "solid";
    updateGradientEditorVisuals();
    return;
  }

  fillType.value = data.type || "linear";
  gradientStart.value = data.startColor || "#7c3aed";
  gradientEnd.value = data.endColor || "#22d3ee";
  gradientStartOffset.value = data.startOffset ?? 0;
  gradientEndOffset.value = data.endOffset ?? 100;
  gradientAngle.value = data.angle ?? 0;
  gradientCenterX.value = data.centerX ?? 50;
  gradientCenterY.value = data.centerY ?? 50;
  gradientRadius.value = data.radius ?? 50;
  updateGradientEditorVisuals();
}

function applyGradientEditorToSelection(record = false) {
  if (!selectedItems.length) return;

  if (fillType.value === "solid") {
    selectedItems.forEach(item => applySolidFillToElement(item, fill.value));
  } else if (fillType.value === "pattern") {
    applyPatternEditorToSelection(record);
    return;
  } else {
    const data = currentGradientEditorData();
    selectedItems.forEach(item => applyGradientToElement(item, data));
  }

  drawSelection();
  if (record) recordHistory();
}

function restoreGradientDefinitions() {
  paintDefs.innerHTML = "";
  gradientCounter = 0;

  art.querySelectorAll("[data-gradient]").forEach(element => {
    const data = gradientDataForElement(element);
    if (data) ensureGradientDefinition(element, data);
  });

  restorePatternDefinitions();
  restoreImageCropClips();
}

/* ---------------- APPEARANCE ---------------- */

function normalizeDashPattern(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const parts = text.split(/[,\s]+/).map(Number).filter(Number.isFinite).map(v => Math.max(0, v));
  if (!parts.length || parts.every(v => v === 0)) return "";
  return parts.join(" ");
}


const STROKE_PROFILE_NAMES = [
  "uniform",
  "taper-both",
  "taper-start",
  "taper-end",
  "bulge",
  "hourglass",
  "brush"
];

function normalizeStrokeProfile(value) {
  return STROKE_PROFILE_NAMES.includes(value)
    ? value
    : "uniform";
}

function strokeProfileMultiplier(
  profile,
  t
) {
  const p =
    normalizeStrokeProfile(
      profile
    );

  const x =
    Math.max(
      0,
      Math.min(1, t)
    );

  if (p === "taper-both") {
    return Math.max(
      0.04,
      Math.sin(
        Math.PI * x
      )
    );
  }

  if (p === "taper-start") {
    return 0.04 +
      0.96 *
      Math.pow(x, 0.72);
  }

  if (p === "taper-end") {
    return 0.04 +
      0.96 *
      Math.pow(
        1 - x,
        0.72
      );
  }

  if (p === "bulge") {
    return 0.55 +
      0.85 *
      Math.sin(
        Math.PI * x
      );
  }

  if (p === "hourglass") {
    return 0.55 +
      0.7 *
      Math.abs(
        2 * x - 1
      );
  }

  if (p === "brush") {
    const first =
      Math.exp(
        -Math.pow(
          (x - 0.43) / 0.23,
          2
        )
      );

    const second =
      Math.exp(
        -Math.pow(
          (x - 0.78) / 0.30,
          2
        )
      );

    return 0.28 +
      0.85 * first +
      0.34 * second;
  }

  return 1;
}

function strokeProfileEligible(
  element
) {
  return Boolean(
    element &&
    element.parentNode === art &&
    [
      "path",
      "line",
      "polyline",
      "polygon",
      "rect",
      "ellipse",
      "circle"
    ].includes(
      element.tagName
    ) &&
    typeof element.getTotalLength ===
      "function" &&
    typeof element.getPointAtLength ===
      "function"
  );
}

function strokeProfileIdFor(
  element
) {
  if (!element.dataset.strokeProfileId) {
    element.dataset.strokeProfileId =
      `profile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  return element.dataset.strokeProfileId;
}

function removeStrokeProfileOverlay(
  element
) {
  if (!element) return;

  const id =
    element.dataset.strokeProfileId;

  if (id) {
    art
      .querySelectorAll(
        `[data-stroke-profile-owner="${CSS.escape(id)}"]`
      )
      .forEach(overlay =>
        overlay.remove()
      );
  }

  element.style.strokeOpacity =
    "";
}

function strokeProfileOutlineD(
  element,
  profile,
  baseWidth
) {
  let totalLength = 0;

  try {
    totalLength =
      element.getTotalLength();
  } catch {
    return "";
  }

  if (
    !Number.isFinite(totalLength) ||
    totalLength <= 0.001
  ) {
    return "";
  }

  const sampleCount =
    Math.max(
      32,
      Math.min(
        180,
        Math.ceil(
          totalLength / 4
        )
      )
    );

  const left = [];
  const right = [];
  const epsilon =
    Math.max(
      totalLength / 1200,
      0.01
    );

  for (
    let index = 0;
    index <= sampleCount;
    index += 1
  ) {
    const t =
      index / sampleCount;

    const distance =
      totalLength * t;

    const point =
      element.getPointAtLength(
        distance
      );

    const before =
      element.getPointAtLength(
        Math.max(
          0,
          distance - epsilon
        )
      );

    const after =
      element.getPointAtLength(
        Math.min(
          totalLength,
          distance + epsilon
        )
      );

    let dx =
      after.x - before.x;

    let dy =
      after.y - before.y;

    const magnitude =
      Math.hypot(dx, dy) || 1;

    dx /= magnitude;
    dy /= magnitude;

    const nx = -dy;
    const ny = dx;

    const width =
      Math.max(
        0,
        baseWidth *
          strokeProfileMultiplier(
            profile,
            t
          )
      );

    const half =
      width / 2;

    left.push({
      x: point.x + nx * half,
      y: point.y + ny * half
    });

    right.push({
      x: point.x - nx * half,
      y: point.y - ny * half
    });
  }

  if (
    left.length < 2 ||
    right.length < 2
  ) {
    return "";
  }

  return [
    `M ${left[0].x} ${left[0].y}`,
    ...left.slice(1).map(
      point =>
        `L ${point.x} ${point.y}`
    ),
    ...right
      .slice()
      .reverse()
      .map(
        point =>
          `L ${point.x} ${point.y}`
      ),
    "Z"
  ].join(" ");
}

function createStrokeProfileOverlay(
  element
) {
  if (!strokeProfileEligible(element)) {
    return null;
  }

  const profile =
    normalizeStrokeProfile(
      element.dataset.strokeProfile
    );

  if (profile === "uniform") {
    return null;
  }

  const strokeColor =
    element.getAttribute("stroke");

  const width =
    Number(
      element.getAttribute(
        "stroke-width"
      )
    ) || 0;

  if (
    !strokeColor ||
    strokeColor === "none" ||
    width <= 0
  ) {
    return null;
  }

  const d =
    strokeProfileOutlineD(
      element,
      profile,
      width
    );

  if (!d) return null;

  const overlay =
    document.createElementNS(
      SVG_NS,
      "path"
    );

  const id =
    strokeProfileIdFor(
      element
    );

  overlay.dataset.strokeProfileOverlay =
    "true";

  overlay.dataset.strokeProfileOwner =
    id;

  overlay.setAttribute(
    "d",
    d
  );

  overlay.setAttribute(
    "fill",
    strokeColor
  );

  overlay.setAttribute(
    "fill-opacity",
    element.getAttribute(
      "stroke-opacity"
    ) || "1"
  );

  overlay.setAttribute(
    "stroke",
    "none"
  );

  overlay.setAttribute(
    "pointer-events",
    "none"
  );

  const transform =
    element.getAttribute(
      "transform"
    );

  if (transform) {
    overlay.setAttribute(
      "transform",
      transform
    );
  }

  return overlay;
}

function refreshStrokeProfile(
  element
) {
  if (!element) return;

  removeStrokeProfileOverlay(
    element
  );

  const profile =
    normalizeStrokeProfile(
      element.dataset.strokeProfile
    );

  element.dataset.strokeProfile =
    profile;

  if (
    profile === "uniform" ||
    !strokeProfileEligible(element)
  ) {
    return;
  }

  const overlay =
    createStrokeProfileOverlay(
      element
    );

  if (!overlay) return;

  element.style.strokeOpacity =
    "0";

  element.insertAdjacentElement(
    "afterend",
    overlay
  );
}

function refreshAllStrokeProfiles() {
  art
    .querySelectorAll(
      ':scope > [data-stroke-profile-overlay="true"]'
    )
    .forEach(overlay =>
      overlay.remove()
    );

  art
    .querySelectorAll(
      ':scope > [data-object="true"]'
    )
    .forEach(element => {
      element.style.strokeOpacity =
        "";

      if (
        normalizeStrokeProfile(
          element.dataset.strokeProfile
        ) !== "uniform"
      ) {
        refreshStrokeProfile(
          element
        );
      }
    });
}

function setStrokeProfileOnSelection(
  profile,
  {
    record = true
  } = {}
) {
  const normalized =
    normalizeStrokeProfile(
      profile
    );

  strokeProfile.value =
    normalized;

  document
    .querySelectorAll(
      "[data-stroke-profile]"
    )
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.strokeProfile ===
          normalized
      );
    });

  if (!selectedItems.length) {
    return;
  }

  let applied = 0;

  selectedItems.forEach(item => {
    if (
      !strokeProfileEligible(
        item
      )
    ) {
      return;
    }

    item.dataset.strokeProfile =
      normalized;

    refreshStrokeProfile(
      item
    );

    applied += 1;
  });

  drawSelection();

  if (
    record &&
    applied
  ) {
    recordHistory({
      label: "Stroke Profile Changed",
      detail:
        normalized
          .replace(/-/g, " ")
          .replace(
            /\b\w/g,
            char =>
              char.toUpperCase()
          )
    });
  }

  if (
    selectedItems.length &&
    !applied
  ) {
    toolStatus.textContent =
      "Stroke profiles are available for vector geometry, not groups or text.";
  }
}

strokeProfile.addEventListener(
  "change",
  () => {
    setStrokeProfileOnSelection(
      strokeProfile.value
    );
  }
);

document
  .querySelectorAll(
    "[data-stroke-profile]"
  )
  .forEach(button => {
    button.addEventListener(
      "click",
      () => {
        setStrokeProfileOnSelection(
          button.dataset.strokeProfile
        );
      }
    );
  });



function normalizeStrokeAlignment(value) {
  return ["center", "inside", "outside"].includes(value)
    ? value
    : "center";
}

function strokeAlignmentBaseWidth(element) {
  if (!element) return 0;
  const stored = Number(element.dataset?.strokeBaseWidth);
  if (Number.isFinite(stored)) return Math.max(0, stored);
  const current = Number(element.getAttribute?.("stroke-width") || 0);
  return Number.isFinite(current) ? Math.max(0, current) : 0;
}

function isClosedStrokeGeometry(element) {
  if (!element) return false;
  const tag = element.tagName?.toLowerCase();
  if (["rect", "circle", "ellipse", "polygon"].includes(tag)) return true;
  if (tag === "path") {
    if (element.dataset.closed === "true") return true;
    return /z\s*$/i.test(String(element.getAttribute("d") || "").trim());
  }
  return false;
}

function strokeAlignmentClipId(element) {
  if (!element) return "";
  if (!element.dataset.strokeAlignmentClipId) {
    element.dataset.strokeAlignmentClipId =
      `stroke-align-clip-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  }
  return element.dataset.strokeAlignmentClipId;
}

function removeStrokeAlignmentClip(element) {
  const clipId = element?.dataset?.strokeAlignmentClipId;
  if (clipId && paintDefs) {
    const clip = paintDefs.querySelector(`[id="${clipId.replace(/"/g, '\"')}"]`);
    clip?.remove();
  }

  const maskId = element?.dataset?.strokeAlignmentMaskId;
  if (maskId && paintDefs) {
    const mask = paintDefs.querySelector(`[id="${maskId.replace(/"/g, '\"')}"]`);
    mask?.remove();
  }

  element?.removeAttribute?.("clip-path");
  element?.removeAttribute?.("mask");
}

function rebuildInsideStrokeClip(element) {
  if (!paintDefs || !element || !isClosedStrokeGeometry(element)) return false;
  const id = strokeAlignmentClipId(element);
  const existing = paintDefs.querySelector(`[id="${id.replace(/"/g, '\\"')}"]`);
  existing?.remove();

  const clip = document.createElementNS(SVG_NS, "clipPath");
  clip.id = id;
  clip.setAttribute("clipPathUnits", "userSpaceOnUse");

  const geometry = element.cloneNode(true);
  geometry.removeAttribute("id");
  geometry.removeAttribute("class");
  geometry.removeAttribute("style");
  geometry.removeAttribute("clip-path");
  geometry.removeAttribute("mask");
  geometry.removeAttribute("filter");
  geometry.removeAttribute("transform");
  geometry.removeAttribute("stroke");
  geometry.removeAttribute("stroke-width");
  geometry.removeAttribute("stroke-opacity");
  geometry.setAttribute("fill", "#000");
  geometry.setAttribute("fill-opacity", "1");
  geometry.setAttribute("pointer-events", "none");
  [...geometry.querySelectorAll("*")].forEach(child => {
    child.removeAttribute("id");
    child.removeAttribute("class");
    child.removeAttribute("style");
    child.removeAttribute("clip-path");
    child.removeAttribute("mask");
    child.removeAttribute("filter");
    child.removeAttribute("stroke");
    child.removeAttribute("stroke-width");
    child.removeAttribute("stroke-opacity");
    child.setAttribute("fill", "#000");
    child.setAttribute("fill-opacity", "1");
    child.setAttribute("pointer-events", "none");
  });

  clip.appendChild(geometry);
  paintDefs.appendChild(clip);
  element.setAttribute("clip-path", `url(#${id})`);
  return true;
}

function strokeAlignmentMaskId(element) {
  if (!element) return "";
  if (!element.dataset.strokeAlignmentMaskId) {
    element.dataset.strokeAlignmentMaskId =
      `stroke-align-mask-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  }
  return element.dataset.strokeAlignmentMaskId;
}

function prepareStrokeMaskGeometry(element) {
  const geometry = element.cloneNode(true);
  geometry.removeAttribute("id");
  geometry.removeAttribute("class");
  geometry.removeAttribute("style");
  geometry.removeAttribute("clip-path");
  geometry.removeAttribute("mask");
  geometry.removeAttribute("filter");
  geometry.removeAttribute("stroke");
  geometry.removeAttribute("stroke-width");
  geometry.removeAttribute("stroke-opacity");
  geometry.setAttribute("fill", "#000");
  geometry.setAttribute("fill-opacity", "1");
  geometry.setAttribute("pointer-events", "none");

  [...geometry.querySelectorAll("*")].forEach(child => {
    child.removeAttribute("id");
    child.removeAttribute("class");
    child.removeAttribute("style");
    child.removeAttribute("clip-path");
    child.removeAttribute("mask");
    child.removeAttribute("filter");
    child.removeAttribute("stroke");
    child.removeAttribute("stroke-width");
    child.removeAttribute("stroke-opacity");
    child.setAttribute("fill", "#000");
    child.setAttribute("fill-opacity", "1");
    child.setAttribute("pointer-events", "none");
  });

  return geometry;
}

function rebuildOutsideStrokeMask(element) {
  if (!paintDefs || !element || !isClosedStrokeGeometry(element)) return false;

  const id = strokeAlignmentMaskId(element);
  paintDefs.querySelector(`[id="${id.replace(/"/g, '\"')}"]`)?.remove();

  const mask = document.createElementNS(SVG_NS, "mask");
  mask.id = id;
  mask.setAttribute("maskUnits", "userSpaceOnUse");
  mask.setAttribute("maskContentUnits", "userSpaceOnUse");
  mask.setAttribute("mask-type", "luminance");

  const viewBox = svg?.viewBox?.baseVal;
  const pad = Math.max(
    4096,
    Number(viewBox?.width || 0),
    Number(viewBox?.height || 0)
  );
  const x = Number(viewBox?.x || 0) - pad;
  const y = Number(viewBox?.y || 0) - pad;
  const width = Number(viewBox?.width || 10000) + pad * 2;
  const height = Number(viewBox?.height || 10000) + pad * 2;

  mask.setAttribute("x", String(x));
  mask.setAttribute("y", String(y));
  mask.setAttribute("width", String(width));
  mask.setAttribute("height", String(height));

  const field = document.createElementNS(SVG_NS, "rect");
  field.setAttribute("x", String(x));
  field.setAttribute("y", String(y));
  field.setAttribute("width", String(width));
  field.setAttribute("height", String(height));
  field.setAttribute("fill", "#fff");
  field.setAttribute("pointer-events", "none");
  mask.appendChild(field);

  mask.appendChild(prepareStrokeMaskGeometry(element));
  paintDefs.appendChild(mask);
  element.setAttribute("mask", `url(#${id})`);
  return true;
}

function applyStrokeAlignment(element, requestedAlignment = null) {
  if (!element?.setAttribute) return;

  let alignment = normalizeStrokeAlignment(
    requestedAlignment ?? element.dataset.strokeAlignment ?? "center"
  );
  const baseWidth = strokeAlignmentBaseWidth(element);
  element.dataset.strokeBaseWidth = String(baseWidth);

  if (!isClosedStrokeGeometry(element) && alignment !== "center") {
    alignment = "center";
  }

  element.dataset.strokeAlignment = alignment;
  element.style.removeProperty("paint-order");
  removeStrokeAlignmentClip(element);

  if (alignment === "inside") {
    element.setAttribute("stroke-width", String(baseWidth * 2));
    rebuildInsideStrokeClip(element);
    return;
  }

  if (alignment === "outside") {
    element.setAttribute("stroke-width", String(baseWidth * 2));
    rebuildOutsideStrokeMask(element);
    return;
  }

  element.setAttribute("stroke-width", String(baseWidth));
}

function refreshStrokeAlignmentForObject(root) {
  if (!root) return;
  const nodes = isGroup(root) ? appearanceEditableNodes(root) : [root];
  nodes.forEach(node => {
    if (node?.dataset?.strokeAlignment) applyStrokeAlignment(node);
  });
}

function applyAdvancedStroke(element) {
  if (!element) return;
  element.setAttribute("stroke-linecap", strokeCap.value);
  element.setAttribute("stroke-linejoin", strokeJoin.value);
  element.setAttribute("stroke-miterlimit", Math.max(1, Number(strokeMiterLimit.value) || 4));
  const dash = normalizeDashPattern(strokeDash.value);
  if (dash) element.setAttribute("stroke-dasharray", dash);
  else element.removeAttribute("stroke-dasharray");
  element.setAttribute("stroke-dashoffset", Number(strokeDashOffset.value) || 0);

  if (element.dataset.compoundShape === "true") {
    element.querySelectorAll("path").forEach(child => {
      child.setAttribute("stroke-linecap", strokeCap.value);
      child.setAttribute("stroke-linejoin", strokeJoin.value);
      child.setAttribute("stroke-miterlimit", Math.max(1, Number(strokeMiterLimit.value) || 4));
      if (dash) child.setAttribute("stroke-dasharray", dash);
      else child.removeAttribute("stroke-dasharray");
      child.setAttribute("stroke-dashoffset", Number(strokeDashOffset.value) || 0);
    });
  }
}

function updateAdvancedStrokeLabels() {
  strokeDashOffsetValue.textContent = `${strokeDashOffset.value} px`;
  updateAppRangeProgress(strokeDashOffset);
}


function clampAppearanceNumber(
  control,
  value
) {
  const fallback =
    Number(control.value) || 0;

  const number =
    Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  const min =
    Number(control.min);

  const max =
    Number(control.max);

  return Math.min(
    Number.isFinite(max)
      ? max
      : number,
    Math.max(
      Number.isFinite(min)
        ? min
        : number,
      number
    )
  );
}

function updateAppRangeProgress(
  range
) {
  if (!range) return;

  const min =
    Number(range.min) || 0;

  const max =
    Number(range.max) || 100;

  const value =
    Number(range.value) || 0;

  const percent =
    max === min
      ? 0
      : (
          (value - min) /
          (max - min)
        ) * 100;

  range.style.setProperty(
    "--range-progress",
    `${Math.max(0, Math.min(100, percent))}%`
  );
}

function syncAppearanceNumericFields() {
  fillOpacityNumber.value =
    fillOpacity.value;

  strokeOpacityNumber.value =
    strokeOpacity.value;

  strokeWidthNumber.value =
    strokeWidth.value;

  [
    fillOpacity,
    strokeWidth,
    strokeOpacity,
    strokeDashOffset
  ].forEach(
    updateAppRangeProgress
  );
}

function bindAppearanceNumber(
  numberInput,
  rangeInput
) {
  const applyNumber = (
    commit = false
  ) => {
    const value =
      clampAppearanceNumber(
        rangeInput,
        numberInput.value
      );

    rangeInput.value =
      String(value);

    numberInput.value =
      rangeInput.value;

    updateAppRangeProgress(
      rangeInput
    );

    syncAppearance(
      rangeInput
    );

    if (commit) {
      recordHistory();
    }
  };

  numberInput.addEventListener(
    "input",
    () => applyNumber(false)
  );

  numberInput.addEventListener(
    "change",
    () => applyNumber(true)
  );

  numberInput.addEventListener(
    "keydown",
    event => {
      if (event.key === "Enter") {
        event.preventDefault();
        numberInput.blur();
      }
    }
  );
}

bindAppearanceNumber(
  fillOpacityNumber,
  fillOpacity
);

bindAppearanceNumber(
  strokeWidthNumber,
  strokeWidth
);

bindAppearanceNumber(
  strokeOpacityNumber,
  strokeOpacity
);



function appearanceEditableNodes(
  root
) {
  if (!root) return [];

  const nodes = [];

  const visit =
    node => {
      if (!node) return;

      const tag =
        node.tagName?.toLowerCase();

      if (
        tag &&
        ![
          "g",
          "defs",
          "clippath",
          "mask",
          "pattern",
          "lineargradient",
          "radialgradient",
          "stop"
        ].includes(tag)
      ) {
        nodes.push(node);
      }

      [
        ...node.children
      ].forEach(
        visit
      );
    };

  visit(root);

  return nodes;
}

function firstAppearanceEditableNode(
  root
) {
  if (!root) return null;

  if (
    !isGroup(root)
  ) {
    return root;
  }

  return (
    appearanceEditableNodes(root)[0] ||
    root
  );
}

function applyAppearanceControlToNode(
  node,
  source
) {
  if (!node) return;

  const tag =
    node.tagName?.toLowerCase();

  const fillablePath =
    tag === "path" &&
    node.dataset.closed === "true";

  if (
    source === fill ||
    source === topFill
  ) {
    if (
      tag !== "line" &&
      (
        tag !== "path" ||
        fillablePath
      )
    ) {
      fillType.value =
        "solid";

      applySolidFillToElement(
        node,
        fill.value
      );

      ensureShapeBuilderPaintVisible(
        node,
        "fill"
      );
    }
  }

  if (
    source === fillOpacity
  ) {
    node.setAttribute(
      "fill-opacity",
      Number(
        fillOpacity.value
      ) / 100
    );
  }

  if (
    source === stroke ||
    source === topStroke
  ) {
    node.setAttribute(
      "stroke",
      stroke.value
    );

    ensureShapeBuilderPaintVisible(
      node,
      "stroke"
    );
  }

  if (
    source === strokeOpacity
  ) {
    node.setAttribute(
      "stroke-opacity",
      Number(
        strokeOpacity.value
      ) / 100
    );
  }

  if (
    source === strokeWidth ||
    source === topStrokeWidth
  ) {
    node.dataset.strokeBaseWidth = String(strokeWidth.value);
    applyStrokeAlignment(node);
  }

  if (source === strokeAlignment) {
    node.dataset.strokeBaseWidth = String(
      node.dataset.strokeBaseWidth || node.getAttribute("stroke-width") || strokeWidth.value
    );
    applyStrokeAlignment(node, strokeAlignment.value);
  }

  if (
    source === strokeCap ||
    source === strokeJoin ||
    source === strokeMiterLimit ||
    source === strokeDash ||
    source === strokeDashOffset
  ) {
    applyAdvancedStroke(
      node
    );
  }

  if (
    node.dataset.strokeProfile &&
    node.dataset.strokeProfile !==
      "uniform"
  ) {
    refreshStrokeProfile(
      node
    );
  }
}



function updateThreeDSavedAppearance(
  repeat,
  source
) {
  if (!isThreeDExtrude(repeat)) {
    return false;
  }

  const sourceData =
    threeDSourceData(
      repeat
    );

  if (!sourceData) {
    return false;
  }

  const sourceElement =
    createElementFromProject(
      sourceData,
      false
    );

  const nodes =
    isGroup(sourceElement)
      ? appearanceEditableNodes(
          sourceElement
        )
      : [sourceElement];

  nodes.forEach(
    node =>
      applyAppearanceControlToNode(
        node,
        source
      )
  );

  repeat.dataset.threeDSource =
    JSON.stringify(
      serializeElementForProject(
        sourceElement
      )
    );

  renderThreeDExtrude(
    repeat
  );

  return true;
}

function updatePathRepeatSavedAppearance(
  repeat,
  source
) {
  if (!isPathRepeat(repeat)) {
    return false;
  }

  const sourceData =
    pathRepeatSourceData(repeat);

  if (!sourceData) {
    return false;
  }

  const sourceElement =
    createElementFromProject(
      sourceData,
      false
    );

  const sourceNodes =
    isGroup(sourceElement)
      ? appearanceEditableNodes(
          sourceElement
        )
      : [sourceElement];

  sourceNodes.forEach(
    node =>
      applyAppearanceControlToNode(
        node,
        source
      )
  );

  repeat.dataset.pathRepeatSource =
    JSON.stringify(
      serializeElementForProject(
        sourceElement
      )
    );

  renderPathRepeat(repeat);

  return true;
}

function updateRadialRepeatSavedAppearance(
  repeat,
  source
) {
  if (
    !isRadialRepeat(repeat)
  ) {
    return false;
  }

  const sourceData =
    radialRepeatSourceData(
      repeat
    );

  if (!sourceData) {
    return false;
  }

  const sourceElement =
    createElementFromProject(
      sourceData,
      false
    );

  const sourceNodes =
    isGroup(sourceElement)
      ? appearanceEditableNodes(
          sourceElement
        )
      : [sourceElement];

  sourceNodes.forEach(
    node =>
      applyAppearanceControlToNode(
        node,
        source
      )
  );

  repeat.dataset.radialRepeatSource =
    JSON.stringify(
      serializeElementForProject(
        sourceElement
      )
    );

  renderRadialRepeat(
    repeat
  );

  return true;
}

function syncAppearance(source) {
  /*
   * A selected 3D face is the exclusive appearance target for
   * Fill / Stroke / Stroke Width while the 3D editor is active.
   */
  const selected3D =
    selectedThreeDExtrude();

  const isThreeDFaceAppearanceControl =
    source === fill ||
    source === topFill ||
    source === stroke ||
    source === topStroke ||
    source === strokeWidth ||
    source === topStrokeWidth;

  const activeThreeDFace =
    activeThreeDFaceSelection(
      selected3D
    );

  if (
    selected3D &&
    activeThreeDFace &&
    isThreeDFaceAppearanceControl
  ) {
    if (source === fill) {
      topFill.value =
        fill.value;
    }

    if (source === topFill) {
      fill.value =
        topFill.value;
    }

    if (source === stroke) {
      topStroke.value =
        stroke.value;
    }

    if (source === topStroke) {
      stroke.value =
        topStroke.value;
    }

    if (source === strokeWidth) {
      topStrokeWidth.value =
        strokeWidth.value;
    }

    if (source === topStrokeWidth) {
      strokeWidth.value =
        topStrokeWidth.value;
    }

    strokeWidthNumber.value =
      strokeWidth.value;

    strokeValue.textContent =
      `${strokeWidth.value} px`;

    applyAppearanceControlToThreeDFace(
      selected3D,
      activeThreeDFace,
      source
    );

    return;
  }

  if (source === fillOpacity) {
    fillOpacityNumber.value =
      fillOpacity.value;
    updateAppRangeProgress(
      fillOpacity
    );
  }

  if (
    source === strokeWidth ||
    source === topStrokeWidth
  ) {
    strokeWidthNumber.value =
      strokeWidth.value;
    updateAppRangeProgress(
      strokeWidth
    );
  }

  if (source === strokeOpacity) {
    strokeOpacityNumber.value =
      strokeOpacity.value;
    updateAppRangeProgress(
      strokeOpacity
    );
  }

  if (source === fill) topFill.value = fill.value;
  if (source === topFill) fill.value = topFill.value;
  if (source === stroke) topStroke.value = stroke.value;
  if (source === topStroke) stroke.value = topStroke.value;
  if (source === strokeWidth) topStrokeWidth.value = strokeWidth.value;
  if (source === topStrokeWidth) strokeWidth.value = topStrokeWidth.value;

  strokeValue.textContent = `${strokeWidth.value} px`;
  fillOpacityValue.textContent = `${fillOpacity.value}%`;
  strokeOpacityValue.textContent = `${strokeOpacity.value}%`;

  if (!selectedItems.length) return;

  selectedItems.forEach(
    item => {
      /*
       * A live radial repeat needs its serialized source updated as well
       * as the currently rendered children, otherwise the next repeat
       * rerender would restore the old appearance.
       */
      if (
        updateRadialRepeatSavedAppearance(
          item,
          source
        ) ||
        updatePathRepeatSavedAppearance(
          item,
          source
        ) ||
        updateThreeDSavedAppearance(
          item,
          source
        )
      ) {
        return;
      }

      const targets =
        isGroup(item)
          ? appearanceEditableNodes(
              item
            )
          : [item];

      targets.forEach(
        node =>
          applyAppearanceControlToNode(
            node,
            source
          )
      );
    }
  );

  if (
    pathRepeatShapeEdit &&
    selectedItems.includes(
      pathRepeatShapeEdit.proxy
    )
  ) {
    syncPathRepeatSourceFromProxy();
  }

  updateGradientEditorVisuals();
  drawSelection();
  renderLayers();
}

[fill, stroke, strokeWidth, fillOpacity, strokeOpacity, topFill, topStroke, topStrokeWidth, strokeAlignment, strokeCap, strokeJoin, strokeMiterLimit, strokeDash, strokeDashOffset].forEach(control => {
  control.addEventListener("input", () => {
    updateAdvancedStrokeLabels();
    syncAppearance(control);
  });
  control.addEventListener("change", () => {
    updateAdvancedStrokeLabels();
    recordHistory();
  });
});

document.querySelectorAll("[data-dash-preset]").forEach(button => {
  button.addEventListener("click", () => {
    strokeDash.value = button.dataset.dashPreset || "";
    syncAppearance(strokeDash);
    recordHistory();
  });
});

fillType.addEventListener("change", () => {
  updateGradientEditorVisuals();

  if (
    fillType.value !== "pattern" ||
    patternSwatch.value
  ) {
    applyGradientEditorToSelection(true);
  }
});

createPatternFromSelectionButton.addEventListener(
  "click",
  () => {
    createPatternSwatchFromSelection();
  }
);

patternSwatch.addEventListener(
  "change",
  () => {
    updatePatternEditorVisuals();
    applyPatternEditorToSelection(true);
  }
);

[
  patternScale,
  patternRotation,
  patternSpacingX,
  patternSpacingY
].forEach(control => {
  control.addEventListener(
    "input",
    () => {
      updatePatternEditorVisuals();
      applyPatternEditorToSelection(false);
    }
  );

  control.addEventListener(
    "change",
    () => {
      updatePatternEditorVisuals();
      applyPatternEditorToSelection(true);
    }
  );
});

[
  gradientStart,
  gradientEnd,
  gradientStartOffset,
  gradientEndOffset,
  gradientAngle,
  gradientCenterX,
  gradientCenterY,
  gradientRadius
].forEach(control => {
  control.addEventListener("input", () => {
    updateGradientEditorVisuals();
    applyGradientEditorToSelection(false);
  });

  control.addEventListener("change", () => {
    updateGradientEditorVisuals();
    applyGradientEditorToSelection(true);
  });
});

function cleanTransformNumber(value) {
  if (!Number.isFinite(value)) return "";
  const rounded = Math.round(value * 1000) / 1000;
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

function selectedTransformMetrics() {
  if (!selected || selectedItems.length !== 1) return null;

  const box =
    editableLocalBounds(
      selected
    );
  const scale = getObjectScale(selected);
  const bounds = elementCanvasBounds(selected);

  return {
    x: bounds.left,
    y: bounds.top,
    width: Math.abs(box.width * scale.x),
    height: Math.abs(box.height * scale.y),
    rotation: getRotation(selected),
    scaleX: scale.x * 100,
    scaleY: scale.y * 100,
    baseWidth: Math.max(Math.abs(box.width), 1e-9),
    baseHeight: Math.max(Math.abs(box.height), 1e-9)
  };
}

function updateTransformPanel() {
  const metrics = selectedTransformMetrics();
  transformPanelUpdating = true;

  if (!metrics) {
    transformControls.hidden = true;
    transformEmptyState.hidden = false;
    transformEmptyState.textContent =
      selectedItems.length > 1
        ? "Transform fields are available for one object at a time."
        : "Select one object to edit its transform.";
    transformPanelUpdating = false;
    return;
  }

  transformControls.hidden = false;
  transformEmptyState.hidden = true;

  transformX.value = cleanTransformNumber(metrics.x);
  transformY.value = cleanTransformNumber(metrics.y);
  transformWidth.value = cleanTransformNumber(metrics.width);
  transformHeight.value = cleanTransformNumber(metrics.height);
  transformRotation.value = cleanTransformNumber(metrics.rotation);
  transformScaleX.value = cleanTransformNumber(metrics.scaleX);
  transformScaleY.value = cleanTransformNumber(metrics.scaleY);

  transformLockAspect.classList.toggle("active", transformAspectLocked);
  transformLockAspect.setAttribute(
    "aria-pressed",
    transformAspectLocked ? "true" : "false"
  );

  transformPanelUpdating = false;
}

function moveSelectedBoundsTo(nextX = null, nextY = null) {
  if (!selected || selectedItems.length !== 1) return;

  const bounds = elementCanvasBounds(selected);
  const t = getTranslation(selected);

  selected.dataset.tx = String(
    t.x + (nextX === null ? 0 : nextX - bounds.left)
  );
  selected.dataset.ty = String(
    t.y + (nextY === null ? 0 : nextY - bounds.top)
  );

  applyObjectTransform(selected);

  enforceDocumentGeometryConstraints(
    lockedCrossConstraintKeysForPath(
      selected
    )
  );
}

function setSelectedScale(nextScaleX, nextScaleY) {
  if (!selected || selectedItems.length !== 1) return;

  if (Number.isFinite(nextScaleX)) {
    selected.dataset.scaleX = String(nextScaleX);
  }

  if (Number.isFinite(nextScaleY)) {
    selected.dataset.scaleY = String(nextScaleY);
  }

  applyObjectTransform(selected);
}

function applyTransformField(field, rawValue) {
  if (
    transformPanelUpdating ||
    !selected ||
    selectedItems.length !== 1
  ) {
    return;
  }

  const value = Number(rawValue);
  if (!Number.isFinite(value)) return;

  const metrics = selectedTransformMetrics();
  if (!metrics) return;

  if (field === "x") {
    moveSelectedBoundsTo(value, null);
  } else if (field === "y") {
    moveSelectedBoundsTo(null, value);
  } else if (field === "rotation") {
    selected.dataset.rotation = String(value);
    applyObjectTransform(selected);
  } else if (field === "width" && value > 0) {
    const scale = getObjectScale(selected);
    const signX = Math.sign(scale.x || 1);
    const nextScaleX = signX * value / metrics.baseWidth;
    let nextScaleY = scale.y;

    if (transformAspectLocked && metrics.width > 1e-9) {
      nextScaleY = scale.y * (value / metrics.width);
    }

    setSelectedScale(nextScaleX, nextScaleY);
  } else if (field === "height" && value > 0) {
    const scale = getObjectScale(selected);
    const signY = Math.sign(scale.y || 1);
    const nextScaleY = signY * value / metrics.baseHeight;
    let nextScaleX = scale.x;

    if (transformAspectLocked && metrics.height > 1e-9) {
      nextScaleX = scale.x * (value / metrics.height);
    }

    setSelectedScale(nextScaleX, nextScaleY);
  } else if (field === "scaleX") {
    const scale = getObjectScale(selected);
    const nextScaleX = value / 100;
    let nextScaleY = scale.y;

    if (transformAspectLocked && Math.abs(scale.x) > 1e-9) {
      nextScaleY = scale.y * (nextScaleX / scale.x);
    }

    setSelectedScale(nextScaleX, nextScaleY);
  } else if (field === "scaleY") {
    const scale = getObjectScale(selected);
    const nextScaleY = value / 100;
    let nextScaleX = scale.x;

    if (transformAspectLocked && Math.abs(scale.y) > 1e-9) {
      nextScaleX = scale.x * (nextScaleY / scale.y);
    }

    setSelectedScale(nextScaleX, nextScaleY);
  }

  drawSelection();
  updateTransformPanel();
}

function bindTransformInput(input, field) {
  input.addEventListener("input", () => {
    applyTransformField(field, input.value);
  });

  input.addEventListener("change", () => {
    applyTransformField(field, input.value);
    updatePropertyControls();
    renderLayers();

    const type =
      field === "x" || field === "y"
        ? "move"
        : field === "rotation"
          ? "rotate"
          : "resize";

    recordHistory(historyTransformLabel(type, selected));
  });
}

bindTransformInput(transformX, "x");
bindTransformInput(transformY, "y");
bindTransformInput(transformWidth, "width");
bindTransformInput(transformHeight, "height");
bindTransformInput(transformRotation, "rotation");
bindTransformInput(transformScaleX, "scaleX");
bindTransformInput(transformScaleY, "scaleY");


document
  .querySelectorAll(
    "[data-transform-stepper]"
  )
  .forEach(button => {
    button.addEventListener(
      "pointerdown",
      event => {
        event.preventDefault();
      }
    );

    button.addEventListener(
      "click",
      () => {
        const input =
          document.getElementById(
            button.dataset.transformInput
          );

        if (!input || input.disabled) {
          return;
        }

        if (
          button.dataset.transformStepper ===
          "up"
        ) {
          input.stepUp();
        } else {
          input.stepDown();
        }

        input.dispatchEvent(
          new Event(
            "input",
            { bubbles: true }
          )
        );

        input.dispatchEvent(
          new Event(
            "change",
            { bubbles: true }
          )
        );

        input.focus();
      }
    );
  });



document
  .querySelectorAll(
    "[data-number-stepper]"
  )
  .forEach(button => {
    button.addEventListener(
      "pointerdown",
      event => {
        event.preventDefault();
      }
    );

    button.addEventListener(
      "click",
      () => {
        const input =
          document.getElementById(
            button.dataset.numberInput
          );

        if (!input || input.disabled) {
          return;
        }

        if (
          button.dataset.numberStepper ===
          "up"
        ) {
          input.stepUp();
        } else {
          input.stepDown();
        }

        input.dispatchEvent(
          new Event(
            "input",
            { bubbles: true }
          )
        );

        input.dispatchEvent(
          new Event(
            "change",
            { bubbles: true }
          )
        );

        input.focus();
      }
    );
  });


transformLockAspect.addEventListener("click", () => {
  transformAspectLocked = !transformAspectLocked;
  updateTransformPanel();
});

const rectanglePropertiesSection = document.querySelector("#rectanglePropertiesSection");
const rectangleCornerRadius = document.querySelector("#rectangleCornerRadius");
const rectangleCornerProfileSelect = document.querySelector("#rectangleCornerProfile");
const rectangleStepsField = document.querySelector("#rectangleStepsField");
const rectangleCornerStepsInput = document.querySelector("#rectangleCornerSteps");
const rectangleContinuousExponentField = document.querySelector("#rectangleContinuousExponentField");
const rectangleContinuousExponentInput = document.querySelector("#rectangleContinuousExponent");
const rectangleCornerHint = document.querySelector("#rectangleCornerHint");
let rectangleRadiusPanelUpdating = false;

function selectedRectangleForProperties() {
  if (!selected || selectedItems.length !== 1) return null;
  return isCornerEditableRectangle(selected) ? selected : null;
}

function rectangleRadiusValuesForProperties(element) {
  if (!element) return [0, 0, 0, 0];
  if (element.tagName === "rect") {
    const rx = Math.max(0, Number(element.getAttribute("rx") || 0));
    return [rx, rx, rx, rx];
  }
  const radii = rectangleCornerRadii(element);
  return [radii.tl, radii.tr, radii.br, radii.bl].map(value => Math.max(0, Number(value || 0)));
}

function updateRectanglePropertiesPanel() {
  if (!rectanglePropertiesSection || !rectangleCornerRadius) return;
  const element = selectedRectangleForProperties();
  rectangleRadiusPanelUpdating = true;
  rectanglePropertiesSection.hidden = !element;
  if (!element) {
    rectangleCornerRadius.value = "0";
    rectangleCornerRadius.max = "0";
    if (rectangleCornerProfileSelect) rectangleCornerProfileSelect.value = "rounded";
    if (rectangleStepsField) rectangleStepsField.hidden = true;
    if (rectangleCornerStepsInput) rectangleCornerStepsInput.value = "2";
    if (rectangleContinuousExponentField) rectangleContinuousExponentField.hidden = true;
    if (rectangleContinuousExponentInput) rectangleContinuousExponentInput.value = "4.4";
    rectangleRadiusPanelUpdating = false;
    return;
  }

  const frame = rectangleFrame(element);
  const activeCornerProfileForLimit = element.tagName === "rect" ? "rounded" : rectangleCornerProfile(element);
  const maxRadius = rectangleCornerMaxRadius(frame, activeCornerProfileForLimit);
  rectangleCornerRadius.max = cleanTransformNumber(maxRadius);

  if (rectangleCornerProfileSelect) {
    rectangleCornerProfileSelect.value = element.tagName === "rect" ? "rounded" : rectangleCornerProfile(element);
  }
  const activeCornerProfile = element.tagName === "rect" ? "rounded" : rectangleCornerProfile(element);
  if (rectangleStepsField) rectangleStepsField.hidden = activeCornerProfile !== "stepped";
  if (rectangleCornerStepsInput) rectangleCornerStepsInput.value = String(element.tagName === "rect" ? 2 : rectangleCornerSteps(element));
  if (rectangleContinuousExponentField) rectangleContinuousExponentField.hidden = activeCornerProfile !== "continuous";
  if (rectangleContinuousExponentInput) {
    rectangleContinuousExponentInput.value = String(element.tagName === "rect" ? 4.4 : rectangleContinuousExponent(element));
  }
  if (rectangleCornerHint) {
    const profile = element.tagName === "rect" ? "rounded" : rectangleCornerProfile(element);
    rectangleCornerHint.textContent = {
      rounded: "Conventional rounded corners.",
      bevel: "Cuts each corner with a straight diagonal edge.",
      stepped: "Builds each corner as a configurable staircase.",
      continuous: "Smooth superellipse corner. Lower exponent = rounder; higher exponent = flatter."
    }[profile] || "Controls the size of all four corners equally.";
  }

  const values = rectangleRadiusValuesForProperties(element);
  const first = values[0];
  const uniform = values.every(value => Math.abs(value - first) < 1e-6);
  rectangleCornerRadius.value = uniform ? cleanTransformNumber(Math.min(first, maxRadius)) : "";
  rectangleCornerRadius.title = uniform
    ? `Corner radius (maximum ${cleanTransformNumber(maxRadius)} px)`
    : "Corners have different radii. Enter a value to make them equal.";
  rectangleRadiusPanelUpdating = false;
}

function applyRectangleCornerRadius(rawValue, commit = false) {
  if (rectangleRadiusPanelUpdating) return;
  let element = selectedRectangleForProperties();
  if (!element) return;
  const requested = Number(rawValue);
  if (!Number.isFinite(requested)) return;

  const frame = rectangleFrame(element);
  const currentProfile = element.tagName === "rect" ? "rounded" : rectangleCornerProfile(element);
  const maxRadius = rectangleCornerMaxRadius(frame, currentProfile);
  const radius = Math.max(0, Math.min(maxRadius, requested));

  if (element.tagName === "rect") {
    element = convertRectToCornerEditablePath(element);
  }

  element.dataset.cornerTl = String(radius);
  element.dataset.cornerTr = String(radius);
  element.dataset.cornerBr = String(radius);
  element.dataset.cornerBl = String(radius);
  updateRoundedRectanglePath(element);
  drawSelection();
  updateRectanglePropertiesPanel();

  if (commit) {
    renderLayers();
    recordHistory("Change Rectangle Corner Radius");
  }
}

function applyRectangleCornerSteps(rawValue, commit = false) {
  if (rectangleRadiusPanelUpdating) return;
  let element = selectedRectangleForProperties();
  if (!element) return;
  const requested = Math.round(Number(rawValue));
  if (!Number.isFinite(requested)) return;
  const steps = Math.max(2, Math.min(16, requested));

  if (element.tagName === "rect") {
    element = convertRectToCornerEditablePath(element);
  }

  element.dataset.cornerSteps = String(steps);
  if (rectangleCornerStepsInput) rectangleCornerStepsInput.value = String(steps);
  updateRoundedRectanglePath(element);
  drawSelection();
  updateRectanglePropertiesPanel();
  if (commit) {
    renderLayers();
    recordHistory("Change Rectangle Corner Steps");
  }
}


function applyRectangleContinuousExponent(rawValue, commit = false) {
  if (rectangleRadiusPanelUpdating) return;
  let element = selectedRectangleForProperties();
  if (!element) return;
  const requested = Number(rawValue);
  if (!Number.isFinite(requested)) return;
  const exponent = Math.max(2, Math.min(10, requested));

  if (element.tagName === "rect") {
    element = convertRectToCornerEditablePath(element);
  }

  element.dataset.continuousExponent = String(exponent);
  if (rectangleContinuousExponentInput) rectangleContinuousExponentInput.value = cleanTransformNumber(exponent);
  updateRoundedRectanglePath(element);
  drawSelection();
  updateRectanglePropertiesPanel();
  if (commit) {
    renderLayers();
    recordHistory("Change Continuous Corner Exponent");
  }
}

function applyRectangleCornerProfile(profile, commit = true) {
  if (rectangleRadiusPanelUpdating) return;
  let element = selectedRectangleForProperties();
  if (!element) return;
  const nextProfile = ["rounded", "bevel", "stepped", "continuous"].includes(profile) ? profile : "rounded";

  if (element.tagName === "rect") {
    const existingRadius = Math.max(0, Number(element.getAttribute("rx") || 0));
    element = convertRectToCornerEditablePath(element);
    if (existingRadius > 0) {
      element.dataset.cornerTl = String(existingRadius);
      element.dataset.cornerTr = String(existingRadius);
      element.dataset.cornerBr = String(existingRadius);
      element.dataset.cornerBl = String(existingRadius);
    }
  }

  element.dataset.cornerProfile = nextProfile;
  if (!element.dataset.cornerSteps) element.dataset.cornerSteps = "2";
  if (!element.dataset.continuousExponent) element.dataset.continuousExponent = "4.4";
  updateRoundedRectanglePath(element);
  drawSelection();
  updateRectanglePropertiesPanel();
  renderLayers();
  if (commit) recordHistory("Change Rectangle Corner Profile");
}

if (rectangleCornerProfileSelect) {
  rectangleCornerProfileSelect.addEventListener("change", () => {
    applyRectangleCornerProfile(rectangleCornerProfileSelect.value, true);
  });
}

if (rectangleCornerStepsInput) {
  rectangleCornerStepsInput.addEventListener("input", () => {
    applyRectangleCornerSteps(rectangleCornerStepsInput.value, false);
  });
  rectangleCornerStepsInput.addEventListener("change", () => {
    applyRectangleCornerSteps(rectangleCornerStepsInput.value, true);
  });
}

if (rectangleContinuousExponentInput) {
  rectangleContinuousExponentInput.addEventListener("input", () => {
    applyRectangleContinuousExponent(rectangleContinuousExponentInput.value, false);
  });
  rectangleContinuousExponentInput.addEventListener("change", () => {
    applyRectangleContinuousExponent(rectangleContinuousExponentInput.value, true);
  });
}

if (rectangleCornerRadius) {
  rectangleCornerRadius.addEventListener("input", () => {
    applyRectangleCornerRadius(rectangleCornerRadius.value, false);
  });
  rectangleCornerRadius.addEventListener("change", () => {
    applyRectangleCornerRadius(rectangleCornerRadius.value, true);
  });
}

function updatePropertyControls() {
  updateTransformPanel();
  updateRectanglePropertiesPanel();
  updateTextPropertiesPanel();
  syncRadialRepeatPanel();
  syncRepeatGridPanel();

  if (!selected) {
    if (strokeAlignment) {
      strokeAlignment.disabled = false;
      strokeAlignment.value = "center";
      strokeAlignment.title = "Stroke position";
    }
    return;
  }

  const appearanceSource =
    firstAppearanceEditableNode(
      selected
    );

  const selectedFill =
    appearanceSource?.getAttribute(
      "fill"
    );

  const selectedStroke =
    appearanceSource?.getAttribute(
      "stroke"
    );

  const selectedWidth =
    appearanceSource?.dataset?.strokeBaseWidth ||
    appearanceSource?.getAttribute(
      "stroke-width"
    );

  const selectedFillOpacity =
    appearanceSource?.getAttribute(
      "fill-opacity"
    );

  const selectedStrokeOpacity =
    appearanceSource?.getAttribute(
      "stroke-opacity"
    );

  const selectedStrokeCap =
    appearanceSource?.getAttribute(
      "stroke-linecap"
    );

  const selectedStrokeJoin =
    appearanceSource?.getAttribute(
      "stroke-linejoin"
    );

  const selectedMiterLimit =
    appearanceSource?.getAttribute(
      "stroke-miterlimit"
    );

  const selectedDash =
    appearanceSource?.getAttribute(
      "stroke-dasharray"
    );

  const selectedDashOffset =
    appearanceSource?.getAttribute(
      "stroke-dashoffset"
    );

  const selectedGradient =
    gradientDataForElement(
      appearanceSource
    );

  const selectedPattern =
    patternDataForElement(
      appearanceSource
    );

  if (selectedPattern) {
    syncPatternControlsFromElement(
      appearanceSource
    );
  } else if (selectedGradient) {
    syncGradientControlsFromElement(
      appearanceSource
    );
    fill.value = selectedGradient.startColor || fill.value;
    topFill.value = fill.value;
    syncColorTrigger("fill", fill.value);
    syncColorTrigger("topFill", topFill.value);
  } else {
    fillType.value = "solid";
    if (
      selectedFill &&
      selectedFill !== "none" &&
      !selectedFill.startsWith("url(")
    ) {
      fill.value = selectedFill;
      topFill.value = selectedFill;
      syncColorTrigger("fill", fill.value);
      syncColorTrigger("topFill", topFill.value);
    }
    updateGradientEditorVisuals();
  }

  if (selectedStroke) {
    stroke.value = selectedStroke;
    topStroke.value = selectedStroke;
    syncColorTrigger("stroke", stroke.value);
    syncColorTrigger("topStroke", topStroke.value);
  }

  if (selectedWidth) {
    strokeWidth.value = selectedWidth;
    topStrokeWidth.value = selectedWidth;
    strokeValue.textContent = `${selectedWidth} px`;
  }

  const fillOpacityPercent = Math.round(Number(selectedFillOpacity ?? 1) * 100);
  const strokeOpacityPercent = Math.round(Number(selectedStrokeOpacity ?? 1) * 100);

  fillOpacity.value = fillOpacityPercent;
  strokeOpacity.value = strokeOpacityPercent;
  fillOpacityNumber.value =
    String(fillOpacityPercent);
  strokeOpacityNumber.value =
    String(strokeOpacityPercent);
  strokeWidthNumber.value =
    strokeWidth.value;
  fillOpacityValue.textContent = `${fillOpacityPercent}%`;
  strokeOpacityValue.textContent = `${strokeOpacityPercent}%`;
  syncAppearanceNumericFields();

  strokeProfile.value =
    normalizeStrokeProfile(
      appearanceSource?.dataset
        .strokeProfile
    );

  document
    .querySelectorAll(
      "[data-stroke-profile]"
    )
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.strokeProfile ===
          strokeProfile.value
      );
    });

  strokeAlignment.value = normalizeStrokeAlignment(
    appearanceSource?.dataset?.strokeAlignment || "center"
  );
  strokeAlignment.disabled = Boolean(
    appearanceSource && !isClosedStrokeGeometry(appearanceSource)
  );
  strokeAlignment.title = strokeAlignment.disabled
    ? "Inside/Outside are available for closed shapes and closed paths."
    : "Stroke position";
  strokeCap.value = selectedStrokeCap || "butt";
  strokeJoin.value = selectedStrokeJoin || "miter";
  strokeMiterLimit.value = selectedMiterLimit || 4;
  strokeDash.value = selectedDash && selectedDash !== "none" ? selectedDash : "";
  strokeDashOffset.value = selectedDashOffset || 0;
  updateAdvancedStrokeLabels();
}


function updateCanvasBackground() {
  canvasBackgroundColor = canvasBackground.value;
  syncColorTrigger("canvasBackground", canvasBackgroundColor);
  canvasIsTransparent = canvasTransparent.checked;

  svg.style.background = "transparent";

  if (canvasIsTransparent) {
    artboardWrap.classList.add("transparent-canvas");

    if (artboardSurface) {
      artboardSurface.setAttribute(
        "fill",
        "transparent"
      );
    }

    canvasBackground.disabled = true;
  } else {
    artboardWrap.classList.remove("transparent-canvas");

    if (artboardSurface) {
      artboardSurface.setAttribute(
        "fill",
        canvasBackgroundColor
      );
    }

    canvasBackground.disabled = false;
  }
}

canvasBackground.addEventListener("input", updateCanvasBackground);
canvasBackground.addEventListener("change", () => {
  recordHistory({ label: "Canvas Background Changed", detail: canvasBackground.value });
});
canvasTransparent.addEventListener("change", () => {
  updateCanvasBackground();
  recordHistory();
});

