/* Vector Studio modular baseline — source lines 3709-9165 from consolidated app.js.
   Classic-script module: shares the browser global lexical scope with ordered sibling modules. */

/* Shape Builder state */
let shapeBuilderDrawing = false;
let shapeBuilderPoints = [];
let shapeBuilderHits = [];
let shapeBuilderRegions = [];
let shapeBuilderSources = [];
let shapeBuilderSubtracting = false;
let shapeBuilderHoverRegion = null;
let shapeBuilderAltHeld = false;
let paperReady = false;
let shapeBuilderTopologyEngine = "jsts";
let shapeBuilderTopologyReady = false;
let shapeBuilderTopologyFaceCount = 0;
let shapeBuilderTopologyPolygonizedFaceCount = 0;
let shapeBuilderTopologyBoundaryCount = 0;
let shapeBuilderTopologyTouchSnapCount = 0;
let shapeBuilderTopologyError = null;
let shapeBuilderTopologyCacheKey = "";
let shapeBuilderTopologyCacheRegions = null;
let shapeBuilderTopologyCacheSources = [];
let shapeBuilderTopologyBuildMs = 0;
let shapeBuilderTopologyTouchChecks = 0;


window.getShapeBuilderTopologyDiagnostics =
  function getShapeBuilderTopologyDiagnostics() {
    return {
      engine:
        shapeBuilderTopologyEngine,
      ready:
        shapeBuilderTopologyReady,
      boundaries:
        shapeBuilderTopologyBoundaryCount,
      faces:
        shapeBuilderTopologyFaceCount,
      liveRegions:
        Array.isArray(
          shapeBuilderRegions
        )
          ? shapeBuilderRegions.length
          : 0,
      polygonizedFaces:
        shapeBuilderTopologyPolygonizedFaceCount,
      snappedTouches:
        shapeBuilderTopologyTouchSnapCount,
      error:
        shapeBuilderTopologyError
          ? String(
              shapeBuilderTopologyError
            )
          : null,
      libraryLoaded:
        typeof window.jsts !==
          "undefined",
      hoverRegion:
        shapeBuilderHoverRegion?.id ||
        null,
      activeHitCount:
        shapeBuilderHits.length,
      buildMs:
        shapeBuilderTopologyBuildMs,
      touchProjectionChecks:
        shapeBuilderTopologyTouchChecks,
      cacheKey:
        shapeBuilderTopologyCacheKey
          ? "active"
          : "empty"
    };
  };

function updateShapeBuilderTopologyStatus() {
  if (activeTool !== "shapeBuilder") {
    return;
  }

  if (
    typeof window.jsts === "undefined"
  ) {
    toolStatus.textContent =
      "Shape Builder Tool • JSTS unavailable";
    return;
  }

  /*
   * The user-facing region count must describe the regions that can actually
   * be hovered / hit / merged, not an intermediate polygonizer diagnostic.
   */
  const liveRegionCount =
    Array.isArray(
      shapeBuilderRegions
    )
      ? shapeBuilderRegions.length
      : 0;

  const suffix =
    liveRegionCount > 0
      ? ` • ${liveRegionCount} regions`
      : "";

  toolStatus.textContent =
    `Shape Builder Tool • JSTS topology${suffix}`;
}

let shiftDown = false;
let altDown = false;
let textCreateDrag = null;
let activeTextEdit = null;
const loadedOutlineFonts = new Map();
const customGoogleFonts = new Map();
const googleFontStylesheets = new Map();
const googleFontOutlineSources = new Map();
const googleFontOutlineSupport = new Map();

/* Undo / redo history */
const HISTORY_LIMIT = 100;
let undoHistory = [];
let redoHistory = [];
let undoHistoryMeta = [];
let redoHistoryMeta = [];
let historyRestoring = false;

/*
 * Illustrator-style Repeat Action remembers the most recent repeatable
 * transform delta. Copy mode duplicates the current selection in-place
 * before applying the delta.
 */
let lastRepeatAction = null;
let repeatActionApplying = false;

let transformAspectLocked = true;
let transformPanelUpdating = false;

/* Snapping */
const SNAP_THRESHOLD_PX = 8;
let GRID_SIZE = 10;
let gridVisible = false;
const GRID_PREFS_KEY = "vectorStudioGridPrefsV1";
const gridOverlay = document.querySelector("#gridOverlay");
const gridDefs = document.querySelector("#gridDefs");
const gridSpacingInput = document.querySelector("#gridSpacingInput");

try {
  const savedGridPrefs = JSON.parse(localStorage.getItem(GRID_PREFS_KEY) || "null");
  if (savedGridPrefs && Number.isFinite(Number(savedGridPrefs.spacing))) {
    GRID_SIZE = Math.max(1, Math.min(1000, Number(savedGridPrefs.spacing)));
  }
  if (savedGridPrefs && typeof savedGridPrefs.visible === "boolean") {
    gridVisible = savedGridPrefs.visible;
  }
} catch {}

const snapSettings = {
  smartGuides: true,
  grid: true,
  guides: true,
  objectEdges: true,
  objectCenters: true,
  canvasEdges: true,
  canvasCenter: true,
  rotation: true
};

function saveGridPreferences() {
  try {
    localStorage.setItem(
      GRID_PREFS_KEY,
      JSON.stringify({ spacing: GRID_SIZE, visible: gridVisible })
    );
  } catch {}
}

function renderGridOverlay() {
  if (!gridOverlay || !gridDefs) return;

  gridOverlay.replaceChildren();
  gridDefs.replaceChildren();

  if (!gridVisible) return;

  const spacing = Math.max(1, Number(GRID_SIZE) || 10);
  const pattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
  pattern.setAttribute("id", "editorGridPattern");
  pattern.setAttribute("patternUnits", "userSpaceOnUse");
  pattern.setAttribute("width", spacing);
  pattern.setAttribute("height", spacing);

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", `M ${spacing} 0 H 0 V ${spacing}`);
  path.setAttribute("class", "editor-grid-line");
  path.setAttribute("fill", "none");
  pattern.appendChild(path);
  gridDefs.appendChild(pattern);

  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("x", "0");
  rect.setAttribute("y", "0");
  rect.setAttribute("width", canvasWidth);
  rect.setAttribute("height", canvasHeight);
  rect.setAttribute("fill", "url(#editorGridPattern)");
  rect.setAttribute("class", "editor-grid-surface");
  gridOverlay.appendChild(rect);
}

function setGridVisible(visible) {
  gridVisible = !!visible;
  saveGridPreferences();
  updateSnapMenuChecks();
  renderGridOverlay();
}

function setGridSpacing(value) {
  const next = Math.max(1, Math.min(1000, Number(value) || 10));
  GRID_SIZE = next;
  if (gridSpacingInput) gridSpacingInput.value = String(next);
  saveGridPreferences();
  renderGridOverlay();
  clearSnapGuides();
}

let currentSnapGuides = { x: null, y: null };
let currentSmartGuideData = {
  lines: [],
  labels: [],
  intersections: []
};
let documentGuides = [];
let guidesVisible = true;
let guidesLocked = false;
let guideDrag = null;
let roundedCornerSelection = new Set();
const expandedLayerGroups = new Set();





function resetSmartGuideData() {
  currentSmartGuideData = {
    lines: [],
    labels: [],
    intersections: []
  };

  if (
    typeof selectionOverlay !==
      "undefined" &&
    selectionOverlay
  ) {
    clearRenderedSmartGuides();
  }
}

function pushSmartGuideLine(
  x1,
  y1,
  x2,
  y2,
  kind = "alignment"
) {
  if (!snapSettings.smartGuides) {
    return;
  }

  currentSmartGuideData.lines.push({
    x1,
    y1,
    x2,
    y2,
    kind
  });
}

function pushSmartGuideLabel(
  x,
  y,
  text,
  kind = "distance"
) {
  if (!snapSettings.smartGuides) {
    return;
  }

  currentSmartGuideData.labels.push({
    x,
    y,
    text,
    kind
  });
}

function pushSmartGuideIntersection(
  x,
  y
) {
  if (!snapSettings.smartGuides) {
    return;
  }

  currentSmartGuideData.intersections.push({
    x,
    y
  });
}

function formatSmartDistance(
  value
) {
  const rounded =
    Math.round(
      Math.abs(value) * 10
    ) / 10;

  return `${rounded} px`;
}

function stationaryObjectBounds(
  excludeElements = []
) {
  const excluded =
    new Set(excludeElements);

  return [
    ...art.querySelectorAll(
      ":scope > [data-object='true']"
    )
  ]
    .filter(isLayerInteractive)
    .filter(
      element =>
        !excluded.has(element)
    )
    .map(element => ({
      element,
      ...elementCanvasBounds(
        element
      )
    }));
}

function rangesOverlap(
  a1,
  a2,
  b1,
  b2,
  padding = 0
) {
  return !(
    a2 <
      b1 - padding ||
    a1 >
      b2 + padding
  );
}

function smartAngleSnapPoint(
  point,
  origin,
  increments = 45,
  toleranceDegrees = 4
) {
  if (
    !snapSettings.smartGuides ||
    !origin
  ) {
    return {
      point,
      snapped: false,
      angle: null
    };
  }

  const dx =
    point.x - origin.x;

  const dy =
    point.y - origin.y;

  const length =
    Math.hypot(dx, dy);

  if (length < 1e-6) {
    return {
      point,
      snapped: false,
      angle: null
    };
  }

  const rawAngle =
    Math.atan2(dy, dx) *
    180 /
    Math.PI;

  const snappedAngle =
    Math.round(
      rawAngle /
      increments
    ) *
    increments;

  let difference =
    Math.abs(
      rawAngle -
      snappedAngle
    );

  difference =
    Math.min(
      difference,
      360 - difference
    );

  if (
    difference >
    toleranceDegrees
  ) {
    return {
      point,
      snapped: false,
      angle: null
    };
  }

  const radians =
    snappedAngle *
    Math.PI /
    180;

  const snappedPoint = {
    x:
      origin.x +
      Math.cos(radians) *
      length,
    y:
      origin.y +
      Math.sin(radians) *
      length
  };

  pushSmartGuideLine(
    origin.x,
    origin.y,
    snappedPoint.x,
    snappedPoint.y,
    "angle"
  );

  pushSmartGuideLabel(
    (
      origin.x +
      snappedPoint.x
    ) / 2,
    (
      origin.y +
      snappedPoint.y
    ) / 2 -
      10 /
      Math.max(
        zoom,
        0.05
      ),
    `${((snappedAngle % 360) + 360) % 360}°`,
    "angle"
  );

  return {
    point: snappedPoint,
    snapped: true,
    angle: snappedAngle
  };
}


function smartEqualSpacingSnap(
  bounds,
  excluded
) {
  if (
    !snapSettings.smartGuides
  ) {
    return null;
  }

  const threshold =
    snapThreshold();

  const stationary =
    stationaryObjectBounds(
      excluded
    );

  const horizontalCandidates =
    stationary.filter(item =>
      rangesOverlap(
        bounds.top,
        bounds.bottom,
        item.top,
        item.bottom,
        threshold * 3
      )
    );

  const verticalCandidates =
    stationary.filter(item =>
      rangesOverlap(
        bounds.left,
        bounds.right,
        item.left,
        item.right,
        threshold * 3
      )
    );

  const left =
    horizontalCandidates
      .filter(
        item =>
          item.right <=
          bounds.left
      )
      .sort(
        (a, b) =>
          b.right - a.right
      )[0] || null;

  const right =
    horizontalCandidates
      .filter(
        item =>
          item.left >=
          bounds.right
      )
      .sort(
        (a, b) =>
          a.left - b.left
      )[0] || null;

  const top =
    verticalCandidates
      .filter(
        item =>
          item.bottom <=
          bounds.top
      )
      .sort(
        (a, b) =>
          b.bottom - a.bottom
      )[0] || null;

  const bottom =
    verticalCandidates
      .filter(
        item =>
          item.top >=
          bounds.bottom
      )
      .sort(
        (a, b) =>
          a.top - b.top
      )[0] || null;

  const leftGap =
    left
      ? bounds.left -
        left.right
      : null;

  const rightGap =
    right
      ? right.left -
        bounds.right
      : null;

  const topGap =
    top
      ? bounds.top -
        top.bottom
      : null;

  const bottomGap =
    bottom
      ? bottom.top -
        bounds.bottom
      : null;

  let horizontal = null;

  if (
    left &&
    right &&
    leftGap >= 0 &&
    rightGap >= 0
  ) {
    const difference =
      rightGap -
      leftGap;

    horizontal = {
      left,
      right,
      leftGap,
      rightGap,
      equal:
        Math.abs(
          difference
        ) <= threshold * 1.5,
      adjustment:
        Math.abs(
          difference
        ) <= threshold * 2.25
          ? difference / 2
          : 0,
      gap:
        (
          leftGap +
          rightGap
        ) / 2
    };
  } else if (
    left ||
    right
  ) {
    horizontal = {
      left,
      right,
      leftGap,
      rightGap,
      equal: false,
      adjustment: 0,
      gap:
        leftGap ??
        rightGap
    };
  }

  let vertical = null;

  if (
    top &&
    bottom &&
    topGap >= 0 &&
    bottomGap >= 0
  ) {
    const difference =
      bottomGap -
      topGap;

    vertical = {
      top,
      bottom,
      topGap,
      bottomGap,
      equal:
        Math.abs(
          difference
        ) <= threshold * 1.5,
      adjustment:
        Math.abs(
          difference
        ) <= threshold * 2.25
          ? difference / 2
          : 0,
      gap:
        (
          topGap +
          bottomGap
        ) / 2
    };
  } else if (
    top ||
    bottom
  ) {
    vertical = {
      top,
      bottom,
      topGap,
      bottomGap,
      equal: false,
      adjustment: 0,
      gap:
        topGap ??
        bottomGap
    };
  }

  return {
    horizontal,
    vertical
  };
}



function addSmartGapMarker(
  x1,
  y1,
  x2,
  y2,
  label,
  equal = false
) {
  pushSmartGuideLine(
    x1,
    y1,
    x2,
    y2,
    equal
      ? "spacing-equal"
      : "spacing"
  );

  const tick =
    4 /
    Math.max(
      zoom,
      0.05
    );

  if (
    Math.abs(
      y2 - y1
    ) <
    Math.abs(
      x2 - x1
    )
  ) {
    pushSmartGuideLine(
      x1,
      y1 - tick,
      x1,
      y1 + tick,
      equal
        ? "spacing-equal"
        : "spacing"
    );

    pushSmartGuideLine(
      x2,
      y2 - tick,
      x2,
      y2 + tick,
      equal
        ? "spacing-equal"
        : "spacing"
    );
  } else {
    pushSmartGuideLine(
      x1 - tick,
      y1,
      x1 + tick,
      y1,
      equal
        ? "spacing-equal"
        : "spacing"
    );

    pushSmartGuideLine(
      x2 - tick,
      y2,
      x2 + tick,
      y2,
      equal
        ? "spacing-equal"
        : "spacing"
    );
  }

  pushSmartGuideLabel(
    (
      x1 +
      x2
    ) / 2,
    (
      y1 +
      y2
    ) / 2 -
      7 /
      Math.max(
        zoom,
        0.05
      ),
    label,
    equal
      ? "spacing-equal"
      : "spacing"
  );
}

function addEqualSpacingVisuals(
  bounds,
  spacing
) {
  if (
    !snapSettings.smartGuides ||
    !spacing
  ) {
    return;
  }

  if (spacing.horizontal) {
    const h =
      spacing.horizontal;

    const y =
      Math.min(
        bounds.top,
        h.left?.top ??
          bounds.top,
        h.right?.top ??
          bounds.top
      ) -
      18 /
      Math.max(
        zoom,
        0.05
      );

    if (
      h.left &&
      h.leftGap !== null &&
      h.leftGap >= 0
    ) {
      addSmartGapMarker(
        h.left.right,
        y,
        bounds.left,
        y,
        formatSmartDistance(
          h.leftGap
        ),
        h.equal
      );
    }

    if (
      h.right &&
      h.rightGap !== null &&
      h.rightGap >= 0
    ) {
      addSmartGapMarker(
        bounds.right,
        y,
        h.right.left,
        y,
        formatSmartDistance(
          h.rightGap
        ),
        h.equal
      );
    }

    if (
      h.equal &&
      h.left &&
      h.right
    ) {
      pushSmartGuideLabel(
        (
          bounds.left +
          bounds.right
        ) / 2,
        y -
          18 /
          Math.max(
            zoom,
            0.05
          ),
        `Equal spacing • ${formatSmartDistance(h.gap)}`,
        "spacing-equal"
      );
    }
  }

  if (spacing.vertical) {
    const v =
      spacing.vertical;

    const x =
      Math.max(
        bounds.right,
        v.top?.right ??
          bounds.right,
        v.bottom?.right ??
          bounds.right
      ) +
      18 /
      Math.max(
        zoom,
        0.05
      );

    if (
      v.top &&
      v.topGap !== null &&
      v.topGap >= 0
    ) {
      addSmartGapMarker(
        x,
        v.top.bottom,
        x,
        bounds.top,
        formatSmartDistance(
          v.topGap
        ),
        v.equal
      );
    }

    if (
      v.bottom &&
      v.bottomGap !== null &&
      v.bottomGap >= 0
    ) {
      addSmartGapMarker(
        x,
        bounds.bottom,
        x,
        v.bottom.top,
        formatSmartDistance(
          v.bottomGap
        ),
        v.equal
      );
    }

    if (
      v.equal &&
      v.top &&
      v.bottom
    ) {
      pushSmartGuideLabel(
        x +
          18 /
          Math.max(
            zoom,
            0.05
          ),
        (
          bounds.top +
          bounds.bottom
        ) / 2,
        `Equal spacing • ${formatSmartDistance(v.gap)}`,
        "spacing-equal"
      );
    }
  }
}


function addMoveDistanceReadout(
  bounds,
  dx,
  dy
) {
  if (
    !snapSettings.smartGuides
  ) {
    return;
  }

  const x =
    bounds.right +
    12 /
    Math.max(
      zoom,
      0.05
    );

  const y =
    bounds.bottom +
    16 /
    Math.max(
      zoom,
      0.05
    );

  pushSmartGuideLabel(
    x,
    y,
    `Δx ${formatSmartDistance(dx)}  Δy ${formatSmartDistance(dy)}`,
    "distance"
  );
}


function snapThreshold() {
  return SNAP_THRESHOLD_PX / Math.max(zoom, 0.05);
}

function snapCandidateValues(excludeElements = []) {
  const excluded = new Set(excludeElements);
  const xs = [];
  const ys = [];

  if (snapSettings.canvasEdges) {
    xs.push(0, canvasWidth);
    ys.push(0, canvasHeight);
  }

  if (snapSettings.canvasCenter) {
    xs.push(canvasWidth / 2);
    ys.push(canvasHeight / 2);
  }

  if (snapSettings.guides) {
    documentGuides.forEach(guide => {
      if (guide.orientation === "vertical") {
        xs.push(Number(guide.position));
      } else if (guide.orientation === "horizontal") {
        ys.push(Number(guide.position));
      }
    });
  }

  [...art.querySelectorAll(":scope > [data-object='true']")]
    .filter(isLayerInteractive)
    .filter(element => !excluded.has(element))
    .forEach(element => {
      const b = elementCanvasBounds(element);

      if (snapSettings.objectEdges) {
        xs.push(b.left, b.right);
        ys.push(b.top, b.bottom);
      }

      if (snapSettings.objectCenters) {
        xs.push((b.left + b.right) / 2);
        ys.push((b.top + b.bottom) / 2);
      }
    });

  return { xs, ys };
}

function nearestSnap(value, candidates, threshold) {
  let best = null;
  let bestDistance = threshold + 1;

  candidates.forEach(candidate => {
    const distance = Math.abs(value - candidate);
    if (distance <= threshold && distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  });

  return best;
}

function snapPoint(point, excludeElements = []) {
  resetSmartGuideData();

  const threshold = snapThreshold();
  const { xs, ys } = snapCandidateValues(excludeElements);

  if (snapSettings.grid) {
    xs.push(Math.round(point.x / GRID_SIZE) * GRID_SIZE);
    ys.push(Math.round(point.y / GRID_SIZE) * GRID_SIZE);
  }

  const snappedX = nearestSnap(point.x, xs, threshold);
  const snappedY = nearestSnap(point.y, ys, threshold);

  currentSnapGuides = {
    x: snappedX,
    y: snappedY
  };

  if (
    snapSettings.smartGuides &&
    snappedX !== null
  ) {
    pushSmartGuideLine(
      snappedX,
      0,
      snappedX,
      canvasHeight,
      "alignment"
    );
  }

  if (
    snapSettings.smartGuides &&
    snappedY !== null
  ) {
    pushSmartGuideLine(
      0,
      snappedY,
      canvasWidth,
      snappedY,
      "alignment"
    );
  }

  if (
    snappedX !== null &&
    snappedY !== null
  ) {
    pushSmartGuideIntersection(
      snappedX,
      snappedY
    );
  }

  return {
    x: snappedX ?? point.x,
    y: snappedY ?? point.y
  };
}

function snapShapeCreationPoint(
  point,
  constrain = false,
  fromCenter = false
) {
  resetSmartGuideData();

  if (!pendingShape || !startPoint) {
    return snapPoint(
      point,
      pendingShape ? [pendingShape] : []
    );
  }

  /*
   * Lines snap by their live endpoint either way. In center mode the opposite
   * endpoint is simply mirrored around the start point during drawing.
   */
  if (pendingShape.tagName === "line") {
    resetSmartGuideData();

    const angleResult =
      smartAngleSnapPoint(
        point,
        startPoint,
        45,
        4
      );

    const snapped =
      snapPoint(
        angleResult.point,
        [pendingShape]
      );

    if (
      angleResult.snapped
    ) {
      const savedLines =
        currentSmartGuideData.lines;
      const savedLabels =
        currentSmartGuideData.labels;

      pushSmartGuideLine(
        startPoint.x,
        startPoint.y,
        snapped.x,
        snapped.y,
        "angle"
      );

      if (
        !savedLabels.some(
          label =>
            label.kind ===
            "angle"
        )
      ) {
        pushSmartGuideLabel(
          (
            startPoint.x +
            snapped.x
          ) / 2,
          (
            startPoint.y +
            snapped.y
          ) / 2 -
            10 /
            Math.max(
              zoom,
              0.05
            ),
          `${((angleResult.angle % 360) + 360) % 360}°`,
          "angle"
        );
      }
    }

    return snapped;
  }

  const threshold = snapThreshold();
  const { xs, ys } = snapCandidateValues([pendingShape]);

  let rawDx = point.x - startPoint.x;
  let rawDy = point.y - startPoint.y;

  const signX = Math.sign(rawDx || 1);
  const signY = Math.sign(rawDy || 1);

  function bestCornerAxisSnap(start, end, candidates, axis) {
    const center = (start + end) / 2;
    const pool = [...candidates];

    if (snapSettings.grid) {
      pool.push(
        Math.round(end / GRID_SIZE) * GRID_SIZE,
        Math.round(center / GRID_SIZE) * GRID_SIZE
      );
    }

    let best = null;

    pool.forEach(candidate => {
      const edgeDistance = Math.abs(candidate - end);

      if (
        edgeDistance <= threshold &&
        (!best || edgeDistance < best.distance)
      ) {
        best = {
          end: candidate,
          guide: candidate,
          distance: edgeDistance,
          axis
        };
      }

      const centerDistance = Math.abs(candidate - center);

      if (
        centerDistance <= threshold &&
        (!best || centerDistance < best.distance)
      ) {
        best = {
          end: start + 2 * (candidate - start),
          guide: candidate,
          distance: centerDistance,
          axis
        };
      }
    });

    return best;
  }

  function bestCenterAxisSnap(
    start,
    sign,
    rawDelta,
    candidates,
    axis
  ) {
    const end = start + sign * Math.abs(rawDelta);
    const pool = [...candidates];

    if (snapSettings.grid) {
      pool.push(
        Math.round(end / GRID_SIZE) * GRID_SIZE
      );
    }

    let best = null;

    pool.forEach(candidate => {
      const size = (candidate - start) / sign;
      const distance = Math.abs(candidate - end);

      if (
        size >= 0 &&
        distance <= threshold &&
        (!best || distance < best.distance)
      ) {
        best = {
          end: start + sign * size,
          guide: candidate,
          distance,
          axis
        };
      }
    });

    return best;
  }

  if (constrain) {
    const rawSize = Math.max(
      Math.abs(rawDx),
      Math.abs(rawDy)
    );

    let size = rawSize;
    const proposals = [];

    if (fromCenter) {
      const endX = startPoint.x + signX * rawSize;
      const endY = startPoint.y + signY * rawSize;

      const xPool = [...xs];
      const yPool = [...ys];

      if (snapSettings.grid) {
        xPool.push(
          Math.round(endX / GRID_SIZE) * GRID_SIZE
        );
        yPool.push(
          Math.round(endY / GRID_SIZE) * GRID_SIZE
        );
      }

      xPool.forEach(candidate => {
        const candidateSize = (candidate - startPoint.x) / signX;
        const distance = Math.abs(candidate - endX);

        if (candidateSize >= 0 && distance <= threshold) {
          proposals.push({
            size: candidateSize,
            distance,
            guideX: candidate,
            guideY: null
          });
        }
      });

      yPool.forEach(candidate => {
        const candidateSize = (candidate - startPoint.y) / signY;
        const distance = Math.abs(candidate - endY);

        if (candidateSize >= 0 && distance <= threshold) {
          proposals.push({
            size: candidateSize,
            distance,
            guideX: null,
            guideY: candidate
          });
        }
      });
    } else {
      /*
       * Preserve a perfect square/circle/regular polygon while snapping.
       * Candidate snaps therefore change one shared size rather than changing
       * X and Y independently.
       */
      const endX = startPoint.x + signX * rawSize;
      const endY = startPoint.y + signY * rawSize;
      const centerX = (startPoint.x + endX) / 2;
      const centerY = (startPoint.y + endY) / 2;

      const xPool = [...xs];
      const yPool = [...ys];

      if (snapSettings.grid) {
        xPool.push(
          Math.round(endX / GRID_SIZE) * GRID_SIZE,
          Math.round(centerX / GRID_SIZE) * GRID_SIZE
        );
        yPool.push(
          Math.round(endY / GRID_SIZE) * GRID_SIZE,
          Math.round(centerY / GRID_SIZE) * GRID_SIZE
        );
      }

      xPool.forEach(candidate => {
        const edgeDistance = Math.abs(candidate - endX);
        const edgeSize = (candidate - startPoint.x) / signX;

        if (edgeSize >= 0 && edgeDistance <= threshold) {
          proposals.push({
            size: edgeSize,
            distance: edgeDistance,
            guideX: candidate,
            guideY: null
          });
        }

        const centerDistance = Math.abs(candidate - centerX);
        const centerSize =
          2 * (candidate - startPoint.x) / signX;

        if (centerSize >= 0 && centerDistance <= threshold) {
          proposals.push({
            size: centerSize,
            distance: centerDistance,
            guideX: candidate,
            guideY: null
          });
        }
      });

      yPool.forEach(candidate => {
        const edgeDistance = Math.abs(candidate - endY);
        const edgeSize = (candidate - startPoint.y) / signY;

        if (edgeSize >= 0 && edgeDistance <= threshold) {
          proposals.push({
            size: edgeSize,
            distance: edgeDistance,
            guideX: null,
            guideY: candidate
          });
        }

        const centerDistance = Math.abs(candidate - centerY);
        const centerSize =
          2 * (candidate - startPoint.y) / signY;

        if (centerSize >= 0 && centerDistance <= threshold) {
          proposals.push({
            size: centerSize,
            distance: centerDistance,
            guideX: null,
            guideY: candidate
          });
        }
      });
    }

    proposals.sort(
      (a, b) => a.distance - b.distance
    );

    if (proposals.length) {
      size = proposals[0].size;
      currentSnapGuides = {
        x: proposals[0].guideX,
        y: proposals[0].guideY
      };
    } else {
      currentSnapGuides = {
        x: null,
        y: null
      };
    }

    return {
      x: startPoint.x + signX * size,
      y: startPoint.y + signY * size
    };
  }

  if (fromCenter) {
    const xSnap = bestCenterAxisSnap(
      startPoint.x,
      signX,
      rawDx,
      xs,
      "x"
    );

    const ySnap = bestCenterAxisSnap(
      startPoint.y,
      signY,
      rawDy,
      ys,
      "y"
    );

    currentSnapGuides = {
      x: xSnap?.guide ?? null,
      y: ySnap?.guide ?? null
    };

    return {
      x: xSnap?.end ?? point.x,
      y: ySnap?.end ?? point.y
    };
  }

  const xSnap = bestCornerAxisSnap(
    startPoint.x,
    point.x,
    xs,
    "x"
  );

  const ySnap = bestCornerAxisSnap(
    startPoint.y,
    point.y,
    ys,
    "y"
  );

  currentSnapGuides = {
    x: xSnap?.guide ?? null,
    y: ySnap?.guide ?? null
  };

  return {
    x: xSnap?.end ?? point.x,
    y: ySnap?.end ?? point.y
  };
}

function selectedBoundsAtDelta(dx, dy) {
  if (!dragOffset?.originals?.length) return null;

  const bounds = dragOffset.originals.map(item => {
    const box = item.element.getBBox();
    return {
      left: box.x + item.tx + dx,
      top: box.y + item.ty + dy,
      right: box.x + item.tx + dx + box.width,
      bottom: box.y + item.ty + dy + box.height
    };
  });

  return {
    left: Math.min(...bounds.map(b => b.left)),
    top: Math.min(...bounds.map(b => b.top)),
    right: Math.max(...bounds.map(b => b.right)),
    bottom: Math.max(...bounds.map(b => b.bottom))
  };
}

function snapMoveDelta(dx, dy) {
  resetSmartGuideData();

  const bounds = selectedBoundsAtDelta(dx, dy);
  if (!bounds) return { dx, dy };

  const threshold = snapThreshold();
  const excluded = dragOffset.originals.map(item => item.element);
  const { xs, ys } = snapCandidateValues(excluded);

  let bestDx = null;
  let bestDxDistance = threshold + 1;
  let guideX = null;

  let bestDy = null;
  let bestDyDistance = threshold + 1;
  let guideY = null;

  const movingXs = [bounds.left, bounds.right, (bounds.left + bounds.right) / 2];
  const movingYs = [bounds.top, bounds.bottom, (bounds.top + bounds.bottom) / 2];

  if (snapSettings.grid) {
    movingXs.forEach(value => {
      const candidate = Math.round(value / GRID_SIZE) * GRID_SIZE;
      const delta = candidate - value;
      if (Math.abs(delta) < bestDxDistance) {
        bestDx = delta;
        bestDxDistance = Math.abs(delta);
        guideX = candidate;
      }
    });

    movingYs.forEach(value => {
      const candidate = Math.round(value / GRID_SIZE) * GRID_SIZE;
      const delta = candidate - value;
      if (Math.abs(delta) < bestDyDistance) {
        bestDy = delta;
        bestDyDistance = Math.abs(delta);
        guideY = candidate;
      }
    });
  }

  xs.forEach(candidate => {
    movingXs.forEach(value => {
      const delta = candidate - value;
      const distance = Math.abs(delta);
      if (distance <= threshold && distance < bestDxDistance) {
        bestDx = delta;
        bestDxDistance = distance;
        guideX = candidate;
      }
    });
  });

  ys.forEach(candidate => {
    movingYs.forEach(value => {
      const delta = candidate - value;
      const distance = Math.abs(delta);
      if (distance <= threshold && distance < bestDyDistance) {
        bestDy = delta;
        bestDyDistance = distance;
        guideY = candidate;
      }
    });
  });

  let snappedDx =
    dx +
    (
      bestDx !== null &&
      bestDxDistance <= threshold
        ? bestDx
        : 0
    );

  let snappedDy =
    dy +
    (
      bestDy !== null &&
      bestDyDistance <= threshold
        ? bestDy
        : 0
    );

  let snappedBounds =
    selectedBoundsAtDelta(
      snappedDx,
      snappedDy
    );

  const spacing =
    smartEqualSpacingSnap(
      snappedBounds,
      excluded
    );

  if (
    spacing?.horizontal?.adjustment &&
    Math.abs(
      spacing.horizontal.adjustment
    ) <= threshold * 2.25 &&
    (
      bestDx === null ||
      bestDxDistance >
        Math.abs(
          spacing.horizontal.adjustment
        )
    )
  ) {
    snappedDx +=
      spacing.horizontal.adjustment;
  }

  if (
    spacing?.vertical?.adjustment &&
    Math.abs(
      spacing.vertical.adjustment
    ) <= threshold * 2.25 &&
    (
      bestDy === null ||
      bestDyDistance >
        Math.abs(
          spacing.vertical.adjustment
        )
    )
  ) {
    snappedDy +=
      spacing.vertical.adjustment;
  }

  snappedBounds =
    selectedBoundsAtDelta(
      snappedDx,
      snappedDy
    );

  currentSnapGuides = {
    x:
      bestDx !== null &&
      bestDxDistance <= threshold
        ? guideX
        : null,
    y:
      bestDy !== null &&
      bestDyDistance <= threshold
        ? guideY
        : null
  };

  if (
    snapSettings.smartGuides &&
    currentSnapGuides.x !== null
  ) {
    pushSmartGuideLine(
      currentSnapGuides.x,
      0,
      currentSnapGuides.x,
      canvasHeight,
      "alignment"
    );
  }

  if (
    snapSettings.smartGuides &&
    currentSnapGuides.y !== null
  ) {
    pushSmartGuideLine(
      0,
      currentSnapGuides.y,
      canvasWidth,
      currentSnapGuides.y,
      "alignment"
    );
  }

  if (
    currentSnapGuides.x !== null &&
    currentSnapGuides.y !== null
  ) {
    pushSmartGuideIntersection(
      currentSnapGuides.x,
      currentSnapGuides.y
    );
  }

  const displayedSpacing =
    smartEqualSpacingSnap(
      snappedBounds,
      excluded
    );

  addEqualSpacingVisuals(
    snappedBounds,
    displayedSpacing
  );

  addMoveDistanceReadout(
    snappedBounds,
    snappedDx,
    snappedDy
  );

  return {
    dx: snappedDx,
    dy: snappedDy
  };
}


function clearRenderedSmartGuides() {
  selectionOverlay
    .querySelectorAll(
      ".snap-guide, .smart-guide, .smart-guide-label, .smart-guide-intersection"
    )
    .forEach(
      node =>
        node.remove()
    );
}


function drawSnapGuides() {
  clearRenderedSmartGuides();

  if (
    !snapSettings.smartGuides
  ) {
    if (currentSnapGuides.x !== null) {
      selectionOverlay.appendChild(svgEl("line", {
        x1: currentSnapGuides.x,
        y1: 0,
        x2: currentSnapGuides.x,
        y2: canvasHeight,
        class: "snap-guide"
      }));
    }

    if (currentSnapGuides.y !== null) {
      selectionOverlay.appendChild(svgEl("line", {
        x1: 0,
        y1: currentSnapGuides.y,
        x2: canvasWidth,
        y2: currentSnapGuides.y,
        class: "snap-guide"
      }));
    }

    return;
  }

  const renderedLines =
    [...currentSmartGuideData.lines];

  const hasVerticalAlignment =
    currentSnapGuides.x !== null &&
    renderedLines.some(
      line =>
        Math.abs(line.x1 - currentSnapGuides.x) < 0.001 &&
        Math.abs(line.x2 - currentSnapGuides.x) < 0.001
    );

  const hasHorizontalAlignment =
    currentSnapGuides.y !== null &&
    renderedLines.some(
      line =>
        Math.abs(line.y1 - currentSnapGuides.y) < 0.001 &&
        Math.abs(line.y2 - currentSnapGuides.y) < 0.001
    );

  /*
   * Some shape-construction branches calculate the correct snap and set
   * currentSnapGuides directly without adding Smart Guide metadata.
   * Synthesize the visible guide here so every snapping path gets the same
   * visual feedback.
   */
  if (
    currentSnapGuides.x !== null &&
    !hasVerticalAlignment
  ) {
    renderedLines.push({
      x1: currentSnapGuides.x,
      y1: 0,
      x2: currentSnapGuides.x,
      y2: canvasHeight,
      kind: "alignment"
    });
  }

  if (
    currentSnapGuides.y !== null &&
    !hasHorizontalAlignment
  ) {
    renderedLines.push({
      x1: 0,
      y1: currentSnapGuides.y,
      x2: canvasWidth,
      y2: currentSnapGuides.y,
      kind: "alignment"
    });
  }

  renderedLines.forEach(
    line => {
      selectionOverlay.appendChild(
        svgEl(
          "line",
          {
            x1: line.x1,
            y1: line.y1,
            x2: line.x2,
            y2: line.y2,
            class:
              `smart-guide smart-guide-${line.kind}`
          }
        )
      );
    }
  );

  const renderedIntersections =
    [...currentSmartGuideData.intersections];

  if (
    currentSnapGuides.x !== null &&
    currentSnapGuides.y !== null &&
    !renderedIntersections.some(
      point =>
        Math.abs(point.x - currentSnapGuides.x) < 0.001 &&
        Math.abs(point.y - currentSnapGuides.y) < 0.001
    )
  ) {
    renderedIntersections.push({
      x: currentSnapGuides.x,
      y: currentSnapGuides.y
    });
  }

  renderedIntersections.forEach(
    point => {
      selectionOverlay.appendChild(
        svgEl(
          "circle",
          {
            cx: point.x,
            cy: point.y,
            r:
              4 /
              Math.max(
                zoom,
                0.05
              ),
            class:
              "smart-guide-intersection"
          }
        )
      );
    }
  );

  currentSmartGuideData.labels.forEach(
    label => {
      const group =
        svgEl(
          "g",
          {
            class:
              `smart-guide-label smart-guide-label-${label.kind}`,
            "pointer-events":
              "none"
          }
        );

      const text =
        svgEl(
          "text",
          {
            x: label.x,
            y: label.y,
            "text-anchor":
              "middle",
            "dominant-baseline":
              "central"
          }
        );

      text.textContent =
        label.text;

      group.appendChild(
        text
      );

      selectionOverlay.appendChild(
        group
      );

      try {
        const box =
          text.getBBox();

        const background =
          svgEl(
            "rect",
            {
              x:
                box.x -
                5 /
                Math.max(
                  zoom,
                  0.05
                ),
              y:
                box.y -
                3 /
                Math.max(
                  zoom,
                  0.05
                ),
              width:
                box.width +
                10 /
                Math.max(
                  zoom,
                  0.05
                ),
              height:
                box.height +
                6 /
                Math.max(
                  zoom,
                  0.05
                ),
              rx:
                3 /
                Math.max(
                  zoom,
                  0.05
                ),
              class:
                "smart-guide-label-bg"
            }
          );

        group.insertBefore(
          background,
          text
        );
      } catch {}
    }
  );
}

function clearSnapGuides() {
  currentSnapGuides = {
    x: null,
    y: null
  };

  resetSmartGuideData();

  clearRenderedSmartGuides();
}

function updateSnapMenuChecks() {
  const map = {
    "smart-guides": snapSettings.smartGuides,
    "snap-grid": snapSettings.grid,
    "snap-guides": snapSettings.guides,
    "snap-object-edges": snapSettings.objectEdges,
    "snap-object-centers": snapSettings.objectCenters,
    "snap-canvas-edges": snapSettings.canvasEdges,
    "snap-canvas-center": snapSettings.canvasCenter,
    "snap-rotation": snapSettings.rotation,
    "toggle-grid": gridVisible
  };

  Object.entries(map).forEach(([command, enabled]) => {
    document.querySelectorAll(`[data-command="${command}"]`).forEach(button => {
      button.classList.toggle("snap-off", !enabled);
      button.setAttribute("aria-pressed", enabled ? "true" : "false");
    });
  });
}

function toggleSnapSetting(key) {
  snapSettings[key] = !snapSettings[key];

  if (
    key === "smartGuides" &&
    !snapSettings.smartGuides
  ) {
    clearSnapGuides();
  }

  updateSnapMenuChecks();
  scheduleAutosave();
}


const APPLICATION_THEME_KEY =
  "vectorStudio.applicationTheme";

function normalizeApplicationTheme(value) {
  return [
    "dark",
    "light",
    "high-contrast"
  ].includes(value)
    ? value
    : "dark";
}

function updateThemeMenuChecks() {
  document
    .querySelectorAll(
      "[data-command^='theme-']"
    )
    .forEach(button => {
      const commandTheme =
        button.dataset.command
          .replace(
            /^theme-/,
            ""
          );

      const check =
        button.querySelector(
          ".theme-check"
        );

      if (check) {
        check.textContent =
          commandTheme ===
          applicationTheme
            ? "✓"
            : "";
      }

      button.setAttribute(
        "aria-pressed",
        commandTheme ===
          applicationTheme
          ? "true"
          : "false"
      );
    });
}

function applicationThemeRulerPalette() {
  if (
    applicationTheme ===
    "light"
  ) {
    return {
      background: "#e9ebef",
      border: "#bfc5ce",
      major: "#525b68",
      minor: "#949ba5",
      text: "#414a57",
      origin: "#6d28d9"
    };
  }

  if (
    applicationTheme ===
    "high-contrast"
  ) {
    return {
      background: "#000000",
      border: "#ffffff",
      major: "#ffffff",
      minor: "#ffffff",
      text: "#ffffff",
      origin: "#ffeb00"
    };
  }

  return null;
}

function setApplicationTheme(
  theme,
  options = {}
) {
  applicationTheme =
    normalizeApplicationTheme(
      theme
    );

  document.body.dataset.theme =
    applicationTheme;

  if (options.persist !== false) {
    try {
      localStorage.setItem(
        APPLICATION_THEME_KEY,
        applicationTheme
      );
    } catch {}
  }

  updateThemeMenuChecks();

  requestAnimationFrame(() => {
    renderRulers();
    renderGuides();
    positionSelectionQuickMenu();
  });
}

function initializeApplicationTheme() {
  let storedTheme = "dark";

  try {
    storedTheme =
      localStorage.getItem(
        APPLICATION_THEME_KEY
      ) || "dark";
  } catch {}

  setApplicationTheme(
    storedTheme,
    { persist: false }
  );
}

function pointerPosition(event) {
  const p = svg.createSVGPoint();
  p.x = event.clientX;
  p.y = event.clientY;
  return p.matrixTransform(svg.getScreenCTM().inverse());
}


let openToolFamily = null;
let toolFamilyPressTimer = null;

function closeToolFlyouts() {
  document
    .querySelectorAll(
      ".tool-family.open"
    )
    .forEach(
      family => {
        family.classList.remove(
          "open"
        );

        family
          .querySelector(
            ".tool-family-primary"
          )
          ?.setAttribute(
            "aria-expanded",
            "false"
          );
      }
    );

  openToolFamily =
    null;
}

function openToolFlyout(
  family
) {
  if (
    !family ||
    !family.querySelector(
      ".tool-flyout"
    )
  ) {
    return;
  }

  closeToolFlyouts();

  family.classList.add(
    "open"
  );

  family
    .querySelector(
      ".tool-family-primary"
    )
    ?.setAttribute(
      "aria-expanded",
      "true"
    );

  openToolFamily =
    family;
}

function promoteToolFamilyItem(
  item
) {
  const family =
    item.closest(
      ".tool-family"
    );

  const primary =
    family?.querySelector(
      ".tool-family-primary"
    );

  if (
    !family ||
    !primary ||
    item === primary
  ) {
    return;
  }

  if (item.dataset.tool) {
    primary.dataset.tool =
      item.dataset.tool;

    delete primary.dataset.command;
  } else if (
    item.dataset.command
  ) {
    primary.dataset.command =
      item.dataset.command;

    delete primary.dataset.tool;
  }

  primary.title =
    item.title;

  const sourceSvg =
    item.querySelector(
      "svg"
    );

  const currentSvg =
    primary.querySelector(
      "svg"
    );

  if (
    sourceSvg &&
    currentSvg
  ) {
    currentSvg.replaceWith(
      sourceSvg.cloneNode(
        true
      )
    );
  }

  [
    "radial-repeat-tool",
    "repeat-grid-tool",
    "path-repeat-tool",
    "art-brush-tool",
    "three-d-tool",
    "perspective-tool",
    "advanced-transform-tool"
  ].forEach(
    className =>
      primary.classList.toggle(
        className,
        item.classList.contains(
          className
        )
      )
  );
}

document.addEventListener(
  "pointerdown",
  event => {
    const primary =
      event.target.closest(
        ".tool-family-primary"
      );

    if (primary) {
      const family =
        primary.closest(
          ".tool-family"
        );

      if (
        family?.querySelector(
          ".tool-flyout"
        )
      ) {
        clearTimeout(
          toolFamilyPressTimer
        );

        toolFamilyPressTimer =
          setTimeout(
            () =>
              openToolFlyout(
                family
              ),
            350
          );
      }

      return;
    }

    if (
      !event.target.closest(
        ".tool-flyout"
      )
    ) {
      closeToolFlyouts();
    }
  },
  true
);

document.addEventListener(
  "pointerup",
  () =>
    clearTimeout(
      toolFamilyPressTimer
    ),
  true
);

document.addEventListener(
  "pointercancel",
  () =>
    clearTimeout(
      toolFamilyPressTimer
    ),
  true
);

document.addEventListener(
  "contextmenu",
  event => {
    const primary =
      event.target.closest(
        ".tool-family-primary"
      );

    const family =
      primary?.closest(
        ".tool-family"
      );

    if (
      family?.querySelector(
        ".tool-flyout"
      )
    ) {
      event.preventDefault();

      openToolFlyout(
        family
      );
    }
  }
);

document.addEventListener(
  "click",
  event => {
    const item =
      event.target.closest(
        ".tool-flyout .tool"
      );

    if (!item) {
      return;
    }

    promoteToolFamilyItem(
      item
    );

    closeToolFlyouts();
  },
  true
);


document.addEventListener(
  "click",
  event => {
    const commandItem =
      event.target.closest?.(
        '[data-command="toggle-fullscreen"]'
      );

    if (!commandItem) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    toggleAppFullscreen();

    /*
     * Close any open top menu after executing the view command.
     */
    document
      .querySelectorAll(
        ".menu.open, .menu-dropdown.open, .top-menu.open"
      )
      .forEach(
        menu =>
          menu.classList.remove(
            "open"
          )
      );
  },
  true
);

function setTool(tool) {
  closeCanvasContextMenu();
  closeCanvasTabContextMenu();

  if (
    polygonSidesModal &&
    !polygonSidesModal.hidden &&
    tool !== "polygon"
  ) {
    cancelPolygonSidesSetup();
  }

  if (tool !== "pen") {
    clearPenContinuationPreview();
  }

  if (
    tool !== "freeDraw" &&
    freeDrawPointerId !== null
  ) {
    cancelFreeDrawStroke();
  }

  if (activeTextEdit && tool !== "text") {
    finishTextEditing(true);
  }

  selectionPanDrag = null;

  if (activeTool === "pen" && tool !== "pen" && activePath) {
    finishPath();
  }

  const previousTool = activeTool;

  activeTool = tool;

  if (
    tool !==
      "curvature"
  ) {
    curvatureHover =
      null;

    curvatureDrag =
      null;

    curvaturePreviewPoint =
      null;

    curvaturePreviewCorner =
      false;

    if (
      curvaturePath
    ) {
      curvatureFinishPath(
        false
      );
    }
  }


  if (
    tool === "vertex" &&
    previousTool !== "vertex"
  ) {
    /*
     * Preserve an existing vertex registry when another feature (such as
     * Constraints) re-activates Vertex mode. A fresh Selection -> Vertex
     * transition still starts with no anchor selection.
     */
    if (
      previousTool === "select"
    ) {
      selectedVertexRefs = [];
      selectedAnchorIndices =
        new Set();
      selectedAnchorIndex =
        null;
    }
  }

  if (tool !== "shapeBuilder") {
    shapeBuilderHoverRegion = null;
    shapeBuilderAltHeld = false;
    clearShapeBuilderHover();
    document.querySelector("#shapeBuilderSubtractCursor")?.remove();
    resetShapeBuilderRegions();
  }
  tools.forEach(button => {
    button.classList.toggle("active", button.dataset.tool === tool);
  });

  const names = {
    select: "Selection Tool",
    vertex: "Vertex Selection Tool",
    lasso: "Lasso Selection Tool",
    pen: "Pen Tool",
    curvature: "Curvature Tool",
    freeDraw: "Free Draw Tool",
    text: "Text Tool",
    shapeBuilder: "Shape Builder Tool",
    rect: "Rectangle Tool",
    ellipse: "Ellipse Tool",
    polygon: "Polygon (N-gon) Tool",
    triangle: "Triangle Tool",
    pentagon: "Pentagon Tool",
    hexagon: "Hexagon Tool",
    star: "Star Tool",
    line: "Line Tool"
  };

  toolStatus.textContent =
    perspective2State.visible
      ? `${names[tool] || tool} • Perspective grid on`
      : names[tool] || tool;

  if (
    tool === "shapeBuilder"
  ) {
    updateShapeBuilderTopologyStatus();
  }

  svg.style.cursor =
    tool === "select"
      ? "default"
      : tool === "vertex"
        ? "default"
        : tool === "lasso"
          ? "crosshair"
          : "crosshair";

  drawSelection();
  drawPerspective2Grid();

  if (
    !["select", "vertex", "lasso"].includes(
      tool
    )
  ) {
    selectionQuickMenu.hidden =
      true;
  }

  if (
    !splitEmbeddedMode
  ) {
    syncSplitCanvasEditorSettings();
  }
}

tools.forEach(button => {
  button.addEventListener("click", () => setTool(button.dataset.tool));
});

freeDrawSmoothing?.addEventListener(
  "input",
  () => {
    updateFreeDrawSmoothingLabel();

    try {
      localStorage.setItem(
        FREE_DRAW_SMOOTHING_KEY,
        String(
          freeDrawSmoothingAmount()
        )
      );
    } catch {}
  }
);

freeDrawShapeDetection?.addEventListener(
  "change",
  () => {
    try {
      localStorage.setItem(
        FREE_DRAW_SHAPE_DETECTION_KEY,
        freeDrawShapeDetection.checked
          ? "true"
          : "false"
      );
    } catch {}
  }
);


let lastVisibleFillColor =
  normalizeHexColor(
    fill?.value
  ) ||
  "#ffffff";

let lastVisibleStrokeColor =
  normalizeHexColor(
    stroke?.value
  ) ||
  "#000000";

function rememberVisiblePaint(
  kind,
  value
) {
  const color =
    normalizeHexColor(
      value
    );

  if (!color) {
    return;
  }

  if (kind === "fill") {
    lastVisibleFillColor =
      color;
  } else if (
    kind === "stroke"
  ) {
    lastVisibleStrokeColor =
      color;
  }
}

function ensureNewObjectHasVisiblePaint(
  element
) {
  if (
    !element ||
    !element.setAttribute
  ) {
    return element;
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

  const fillInvisible =
    !fillValue ||
    fillValue === "none" ||
    fillValue ===
      "transparent";

  const strokeInvisible =
    !strokeValue ||
    strokeValue === "none" ||
    strokeValue ===
      "transparent" ||
    Number(
      element.getAttribute(
        "stroke-width"
      ) || 0
    ) <= 0;

  if (
    fillInvisible &&
    strokeInvisible
  ) {
    const fallbackFill =
      lastVisibleFillColor ||
      normalizeHexColor(
        fill?.value
      ) ||
      "#ffffff";

    element.setAttribute(
      "fill",
      fallbackFill
    );

    element.setAttribute(
      "fill-opacity",
      "1"
    );
  }

  return element;
}

function createBaseElement(tag) {
  const element = document.createElementNS(SVG_NS, tag);
  objectCounter++;
  element.dataset.object = "true";
  element.dataset.name = `${capitalize(tag)} ${objectCounter}`;
  element.dataset.tx = 0;
  element.dataset.ty = 0;
  element.dataset.rotation = 0;
  element.dataset.hidden = "false";
  element.dataset.locked = "false";
  element.setAttribute("stroke", stroke.value);
  rememberVisiblePaint("stroke", stroke.value);
  element.dataset.strokeBaseWidth = String(strokeWidth.value);
  element.dataset.strokeAlignment = "center";
  element.setAttribute("stroke-width", strokeWidth.value);
  element.dataset.strokeProfile =
    normalizeStrokeProfile(
      strokeProfile?.value ||
      "uniform"
    );
  element.setAttribute("fill-opacity", Number(fillOpacity.value) / 100);
  element.setAttribute("stroke-opacity", Number(strokeOpacity.value) / 100);
  applyAdvancedStroke(element);
  element.setAttribute("vector-effect", "non-scaling-stroke");
  ensureNewObjectHasVisiblePaint(element);
  return element;
}



function regularPolygonPoints(
  centerX,
  centerY,
  radiusX,
  radiusY,
  sides,
  startAngle = -90
) {
  const count =
    Math.max(
      3,
      Math.min(
        64,
        Math.round(
          Number(sides) || 3
        )
      )
    );

  const points = [];

  for (
    let index = 0;
    index < count;
    index += 1
  ) {
    const angle =
      (
        startAngle +
        index * (360 / count)
      ) *
      Math.PI /
      180;

    points.push(
      `${centerX + Math.cos(angle) * radiusX},${centerY + Math.sin(angle) * radiusY}`
    );
  }

  return points.join(" ");
}

function standardShapePoints(type, x, y, width, height, sidesOverride = null) {
  const cx = x + width / 2;
  const cy = y + height / 2;
  const rx = width / 2;
  const ry = height / 2;

  const configs = {
    triangle: { sides: 3, inner: null, start: -90 },
    pentagon: { sides: 5, inner: null, start: -90 },
    hexagon: { sides: 6, inner: null, start: -90 },
    star: { sides: 5, inner: 0.45, start: -90 },
    ngon: {
      sides: Math.max(
        3,
        Math.min(
          64,
          Number(sidesOverride) || 5
        )
      ),
      inner: null,
      start: -90
    }
  };

  const config = configs[type];
  if (!config) return "";

  if (!config.inner) {
    return regularPolygonPoints(
      cx,
      cy,
      rx,
      ry,
      config.sides,
      config.start
    );
  }

  const count =
    config.sides * 2;

  const points = [];

  for (
    let i = 0;
    i < count;
    i++
  ) {
    const isInner =
      i % 2 === 1;

    const radiusX =
      isInner
        ? rx * config.inner
        : rx;

    const radiusY =
      isInner
        ? ry * config.inner
        : ry;

    const angle =
      (
        config.start +
        i * (360 / count)
      ) *
      Math.PI /
      180;

    points.push(
      `${cx + Math.cos(angle) * radiusX},${cy + Math.sin(angle) * radiusY}`
    );
  }

  return points.join(" ");
}

function updateStandardPolygon(element, x, y, width, height) {
  const type = element.dataset.shapeType;
  const sides =
    type === "ngon"
      ? Number(element.dataset.sides) || 5
      : null;

  element.setAttribute(
    "points",
    standardShapePoints(
      type,
      x,
      y,
      width,
      height,
      sides
    )
  );
}

function normalizeGoogleFontFamily(value) {
  return String(value || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, " ");
}

function googleFontFamilyFromInput(value) {
  const raw = String(value || "").trim();

  if (!raw) return "";

  try {
    if (/^https?:\/\//i.test(raw)) {
      const url = new URL(raw);

      if (
        url.hostname.includes("fonts.googleapis.com") ||
        url.hostname.includes("fonts.google.com")
      ) {
        const familyParam =
          url.searchParams.get("family");

        if (familyParam) {
          return normalizeGoogleFontFamily(
            familyParam
              .split(":")[0]
              .replace(/\+/g, " ")
          );
        }

        const familyMatch =
          url.pathname.match(/\/specimen\/([^/?#]+)/i);

        if (familyMatch) {
          return normalizeGoogleFontFamily(
            decodeURIComponent(familyMatch[1])
              .replace(/\+/g, " ")
          );
        }
      }
    }
  } catch (error) {
    // Treat malformed URLs as family names.
  }

  return normalizeGoogleFontFamily(raw);
}

function googleFontCssUrl(family) {
  return (
    "https://fonts.googleapis.com/css2?family=" +
    encodeURIComponent(family).replace(/%20/g, "+") +
    ":wght@400;500;600;700&display=swap"
  );
}

function fontsourceSlugForFamily(family) {
  return normalizeGoogleFontFamily(family)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function resolveFontsourceOutlineUrl(
  family,
  weight = "400"
) {
  const slug =
    fontsourceSlugForFamily(family);

  if (!slug) {
    throw new Error(
      "Could not determine a font package name."
    );
  }

  /*
   * Fontsource mirrors the Google Fonts catalogue and exposes static WOFF
   * files that opentype.js can parse directly. This avoids Google Fonts'
   * normal WOFF2 response, which is the main source of outline failures.
   */
  const candidates = [
    `https://cdn.jsdelivr.net/fontsource/fonts/${slug}@5.3.1/latin-${weight}-normal.woff`,
    `https://cdn.jsdelivr.net/fontsource/fonts/${slug}@5.3.0/latin-${weight}-normal.woff`,
    `https://cdn.jsdelivr.net/fontsource/fonts/${slug}@5.2.6/latin-${weight}-normal.woff`
  ];

  for (const url of candidates) {
    try {
      const response =
        await fetch(url, {
          method: "HEAD",
          mode: "cors",
          credentials: "omit"
        });

      if (response.ok) {
        return url;
      }
    } catch (error) {
      // Try the next candidate.
    }
  }

  /*
   * Some CDNs do not support HEAD consistently. Try a lightweight GET as
   * a final package check.
   */
  for (const url of candidates) {
    try {
      const response =
        await fetch(url, {
          mode: "cors",
          credentials: "omit"
        });

      if (response.ok) {
        return url;
      }
    } catch (error) {
      // Continue to the next candidate.
    }
  }

  throw new Error(
    `No outline-readable static WOFF face was found for "${family}".`
  );
}

async function resolveGoogleFontOutlineUrl(
  family,
  weight = "400"
) {
  const normalized =
    normalizeGoogleFontFamily(family);

  const normalizedWeight =
    String(weight || "400");

  const cacheKey =
    `${normalized}:${normalizedWeight}`;

  if (googleFontOutlineSources.has(cacheKey)) {
    return googleFontOutlineSources.get(cacheKey);
  }

  /*
   * Prefer Fontsource's static WOFF mirrors because opentype.js can parse
   * them directly. Google Fonts itself commonly returns WOFF2, which is not
   * consistently parseable in this browser-side outline pipeline.
   */
  try {
    const staticUrl =
      await resolveFontsourceOutlineUrl(
        normalized,
        normalizedWeight
      );

    googleFontOutlineSources.set(
      cacheKey,
      staticUrl
    );

    return staticUrl;
  } catch (fontsourceError) {
    console.warn(
      "Static WOFF lookup failed; trying Google Fonts CSS.",
      normalized,
      fontsourceError
    );
  }

  const cssUrl =
    "https://fonts.googleapis.com/css2?family=" +
    encodeURIComponent(normalized)
      .replace(/%20/g, "+") +
    `:wght@${encodeURIComponent(normalizedWeight)}` +
    "&display=swap";

  const response =
    await fetch(cssUrl, {
      mode: "cors",
      credentials: "omit"
    });

  if (!response.ok) {
    throw new Error(
      `Google Fonts CSS request failed (${response.status}).`
    );
  }

  const css =
    await response.text();

  const sourceMatches =
    [...css.matchAll(
      /src:\s*url\(([^)]+)\)\s*format\(['"]?([^'")]+)['"]?\)/gi
    )];

  /*
   * Only accept formats we can actually parse. Do not claim WOFF2 support.
   */
  const acceptable =
    sourceMatches.find(match => {
      const format =
        String(match[2] || "")
          .toLowerCase();

      return (
        format === "woff" ||
        format === "truetype" ||
        format === "opentype"
      );
    });

  if (!acceptable) {
    throw new Error(
      `Google Fonts only exposed WOFF2 for "${normalized}", and that format cannot be outlined reliably here.`
    );
  }

  const sourceUrl =
    acceptable[1]
      .trim()
      .replace(/^["']|["']$/g, "");

  googleFontOutlineSources.set(
    cacheKey,
    sourceUrl
  );

  return sourceUrl;
}
async function loadGoogleFontOutlineFont(
  family,
  weight = "400"
) {
  const normalized =
    normalizeGoogleFontFamily(family);

  const normalizedWeight =
    String(weight || "400");

  const cacheKey =
    `google:${normalized}:${normalizedWeight}`;

  if (loadedOutlineFonts.has(cacheKey)) {
    return loadedOutlineFonts.get(cacheKey);
  }

  if (typeof opentype === "undefined") {
    throw new Error(
      "Outline engine is unavailable."
    );
  }

  const promise = (async () => {
    const fontUrl =
      await resolveGoogleFontOutlineUrl(
        normalized,
        normalizedWeight
      );

    /*
     * Fetch the actual webfont ourselves. opentype.js can parse ArrayBuffers
     * directly, which avoids relying on its URL-loader behavior and lets us
     * surface clearer CORS/network failures.
     */
    const response =
      await fetch(fontUrl, {
        mode: "cors",
        credentials: "omit"
      });

    if (!response.ok) {
      throw new Error(
        `Font file request failed (${response.status}).`
      );
    }

    const buffer =
      await response.arrayBuffer();

    let font;

    try {
      font =
        opentype.parse(buffer);
    } catch (error) {
      throw new Error(
        `The resolved font file could not be parsed for outlines: ${error.message}`
      );
    }

    if (
      !font ||
      !font.glyphs ||
      font.glyphs.length === 0
    ) {
      throw new Error(
        "The resolved font contained no usable glyph outlines."
      );
    }

    return font;
  })();

  loadedOutlineFonts.set(
    cacheKey,
    promise
  );

  try {
    const font = await promise;

    googleFontOutlineSupport.set(
      normalized,
      true
    );

    return font;
  } catch (error) {
    loadedOutlineFonts.delete(cacheKey);

    googleFontOutlineSupport.set(
      normalized,
      false
    );

    throw error;
  }
}

async function probeGoogleFontOutlineSupport(
  family
) {
  const normalized =
    normalizeGoogleFontFamily(family);

  if (!normalized) return false;

  if (
    googleFontOutlineSupport.has(normalized)
  ) {
    return googleFontOutlineSupport.get(
      normalized
    );
  }

  try {
    const probeWeight =
      selected &&
      isTextElement(selected) &&
      selected.dataset.fontFamily === normalized
        ? selected.dataset.fontWeight || "400"
        : "400";

    await loadGoogleFontOutlineFont(
      normalized,
      probeWeight
    );

    googleFontOutlineSupport.set(
      normalized,
      true
    );

    return true;
  } catch (error) {
    console.warn(
      "Google Font outline probing failed",
      normalized,
      error
    );

    googleFontOutlineSupport.set(
      normalized,
      false
    );

    return false;
  }
}

function ensureFontOption(family, custom = false) {
  const normalized =
    normalizeGoogleFontFamily(family);

  if (!normalized) return null;

  const existing =
    [...textFontFamily.options].find(
      option => option.value === normalized
    );

  if (existing) {
    if (custom) {
      existing.dataset.googleFont = "true";
    }
    return existing;
  }

  const option =
    document.createElement("option");

  option.value = normalized;
  option.textContent =
    custom
      ? `${normalized} · Google`
      : normalized;

  if (custom) {
    option.dataset.googleFont = "true";
  }

  textFontFamily.appendChild(option);
  return option;
}

async function loadGoogleFontFamily(
  family,
  {
    select = false,
    silent = false
  } = {}
) {
  const normalized =
    normalizeGoogleFontFamily(family);

  if (!normalized) {
    throw new Error(
      "Enter a Google Font family name."
    );
  }

  if (!googleFontStylesheets.has(normalized)) {
    const link =
      document.createElement("link");

    link.rel = "stylesheet";
    link.href = googleFontCssUrl(normalized);
    link.dataset.googleFontFamily = normalized;

    const loaded =
      new Promise((resolve, reject) => {
        link.addEventListener(
          "load",
          resolve,
          { once: true }
        );

        link.addEventListener(
          "error",
          () => reject(
            new Error(
              `Could not load Google Font "${normalized}".`
            )
          ),
          { once: true }
        );
      });

    document.head.appendChild(link);

    googleFontStylesheets.set(
      normalized,
      { link, loaded }
    );
  }

  await googleFontStylesheets
    .get(normalized)
    .loaded;

  if (document.fonts?.load) {
    await Promise.all([
      document.fonts.load(
        `400 16px "${normalized}"`
      ),
      document.fonts.load(
        `700 16px "${normalized}"`
      )
    ]);
  }

  customGoogleFonts.set(
    normalized,
    {
      family: normalized,
      cssUrl: googleFontCssUrl(normalized)
    }
  );

  ensureFontOption(normalized, true);

  probeGoogleFontOutlineSupport(
    normalized
  ).then(() => {
    if (
      selectedItems.length === 1 &&
      isTextElement(selected) &&
      selected.dataset.fontFamily ===
        normalized
    ) {
      updateTextPropertiesPanel();
    }
  });

  if (select) {
    textFontFamily.value = normalized;

    if (
      selectedItems.length === 1 &&
      isTextElement(selected)
    ) {
      applyTextPropertyChange(true);
    }
  }

  if (!silent) {
    googleFontMessage.classList.remove(
      "error"
    );

    googleFontMessage.classList.add(
      "success"
    );

    googleFontMessage.textContent =
      `Added ${normalized}.`;
  }

  return normalized;
}

async function addGoogleFontFromInput() {
  const family =
    googleFontFamilyFromInput(
      googleFontInput.value
    );

  googleFontMessage.classList.remove(
    "error",
    "success"
  );

  if (!family) {
    googleFontMessage.classList.add(
      "error"
    );

    googleFontMessage.textContent =
      "Enter a Google Font family name or URL.";
    return;
  }

  googleFontMessage.textContent =
    `Loading ${family}…`;

  addGoogleFontButton.disabled = true;

  try {
    const loadedFamily =
      await loadGoogleFontFamily(
        family,
        { select: true }
      );

    googleFontInput.value =
      loadedFamily;
  } catch (error) {
    console.error(error);

    googleFontMessage.classList.add(
      "error"
    );

    googleFontMessage.textContent =
      error.message ||
      "Could not load that Google Font.";
  } finally {
    addGoogleFontButton.disabled = false;
  }
}

function customGoogleFontsForProject() {
  return [
    ...customGoogleFonts.values()
  ].map(font => ({
    family: font.family,
    cssUrl: font.cssUrl,
    outlineSupported:
      googleFontOutlineSupport.get(
        font.family
      ) === true
  }));
}

function restoreCustomGoogleFonts(fonts) {
  if (!Array.isArray(fonts)) return;

  fonts
    .map(font =>
      normalizeGoogleFontFamily(
        font?.family
      )
    )
    .filter(Boolean)
    .forEach(family => {
      loadGoogleFontFamily(
        family,
        { silent: true }
      ).then(() => {
        /*
         * Re-render after the browser has the actual face so area wrapping
         * and bounding boxes use the imported font metrics.
         */
        [...art.querySelectorAll(
          "text[data-object='true']"
        )]
          .filter(
            element =>
              element.dataset.fontFamily ===
              family
          )
          .forEach(element => {
            renderTextElement(element);
            applyObjectTransform(element);
          });

        drawSelection();
      }).catch(error => {
        console.warn(
          "Could not restore Google Font",
          family,
          error
        );
      });
    });
}

function isTextElement(element) {
  return Boolean(element) && element.tagName === "text";
}

function textValueForElement(element) {
  return element?.dataset.textValue ?? element?.textContent ?? "";
}

function textAlignmentAnchor(align) {
  if (align === "center") return "middle";
  if (align === "right") return "end";
  return "start";
}

function textBaseX(element) {
  const x = Number(element.dataset.textX ?? element.getAttribute("x") ?? 0);
  const width = Number(element.dataset.textBoxWidth || 0);
  const align = element.dataset.textAlign || "left";

  if (element.dataset.textType !== "area") return x;
  if (align === "center") return x + width / 2;
  if (align === "right") return x + width;
  return x;
}

function splitTextIntoWrappedLines(element) {
  const value = textValueForElement(element).replace(/\r/g, "");
  const paragraphs = value.split("\n");

  if (element.dataset.textType !== "area") {
    return paragraphs.length ? paragraphs : [""];
  }

  const width = Math.max(10, Number(element.dataset.textBoxWidth || 160));
  const fontSize = Math.max(1, Number(element.dataset.fontSize || 32));
  const letterSpacing = Number(element.dataset.letterSpacing || 0);
  const family = element.dataset.fontFamily || "Inter";
  const weight = element.dataset.fontWeight || "400";

  const measureCanvas =
    splitTextIntoWrappedLines._canvas ||
    (splitTextIntoWrappedLines._canvas = document.createElement("canvas"));

  const context = measureCanvas.getContext("2d");
  context.font = `${weight} ${fontSize}px "${family}"`;

  const measure = text =>
    context.measureText(text).width +
    Math.max(0, text.length - 1) * letterSpacing;

  const lines = [];

  paragraphs.forEach(paragraph => {
    if (!paragraph) {
      lines.push("");
      return;
    }

    const words = paragraph.split(/\s+/);
    let line = "";

    words.forEach(word => {
      const candidate = line ? `${line} ${word}` : word;

      if (!line || measure(candidate) <= width) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
    });

    lines.push(line);
  });

  return lines.length ? lines : [""];
}

function renderTextElement(element) {
  if (!isTextElement(element)) return;

  const fontSize = Math.max(1, Number(element.dataset.fontSize || 32));
  const lineHeight = Math.max(0.5, Number(element.dataset.lineHeight || 1.2));
  const letterSpacing = Number(element.dataset.letterSpacing || 0);
  const family = element.dataset.fontFamily || "Inter";
  const weight = element.dataset.fontWeight || "400";
  const align = element.dataset.textAlign || "left";
  const x = textBaseX(element);
  const y = Number(element.dataset.textY ?? element.getAttribute("y") ?? 0);

  element.setAttribute("x", x);
  element.setAttribute("y", y);
  element.setAttribute("font-family", family);
  element.setAttribute("font-size", fontSize);
  element.setAttribute("font-weight", weight);
  element.setAttribute("letter-spacing", letterSpacing);
  element.setAttribute("text-anchor", textAlignmentAnchor(align));
  element.setAttribute("dominant-baseline", "alphabetic");
  element.replaceChildren();

  splitTextIntoWrappedLines(element).forEach((line, index) => {
    const tspan = document.createElementNS(SVG_NS, "tspan");
    tspan.setAttribute("x", x);
    tspan.setAttribute("y", y + index * fontSize * lineHeight);
    tspan.textContent = line || " ";
    element.appendChild(tspan);
  });
}

function createTextElement(position, type = "point", boxWidth = 180) {
  const element = createBaseElement("text");
  element.dataset.name = `Text ${objectCounter}`;
  element.dataset.textType = type;
  element.dataset.textValue = "Text";
  element.dataset.textX = String(position.x);
  element.dataset.textY = String(position.y);
  element.dataset.textBoxWidth = String(Math.max(20, boxWidth));
  element.dataset.fontFamily = textFontFamily.value || "Inter";
  element.dataset.fontWeight = textFontWeight.value || "400";
  element.dataset.fontSize = String(Number(textFontSize.value || 32));
  element.dataset.lineHeight = String(Number(textLineHeight.value || 1.2));
  element.dataset.letterSpacing = String(Number(textLetterSpacing.value || 0));
  element.dataset.textAlign = textAlign.value || "left";
  element.dataset.scaleX = "1";
  element.dataset.scaleY = "1";
  element.setAttribute("fill", fill.value);
  element.setAttribute("stroke", "none");
  element.setAttribute("stroke-width", 0);
  renderTextElement(element);
  art.appendChild(element);
  return element;
}

function canvasPointToClient(point) {
  const p = svg.createSVGPoint();
  p.x = point.x;
  p.y = point.y;
  const matrix = svg.getScreenCTM();
  if (!matrix) return { x: point.x, y: point.y };
  const t = p.matrixTransform(matrix);
  return { x: t.x, y: t.y };
}

function resolvedTextEditorColor(element) {
  const fillValue = element.getAttribute("fill") || "#000000";

  if (fillValue.startsWith("url(")) {
    return "#111111";
  }

  return fillValue === "none" ? "#111111" : fillValue;
}

function textEditorBaselineOffset(element) {
  const fontSize = Math.max(
    1,
    Number(element.dataset.fontSize || 32)
  );

  const lineHeight = Math.max(
    0.5,
    Number(element.dataset.lineHeight || 1.2)
  );

  const family =
    element.dataset.fontFamily || "Inter";

  const weight =
    element.dataset.fontWeight || "400";

  const measureCanvas =
    textEditorBaselineOffset._canvas ||
    (
      textEditorBaselineOffset._canvas =
        document.createElement("canvas")
    );

  const context =
    measureCanvas.getContext("2d");

  context.font =
    `${weight} ${fontSize}px "${family}"`;

  const metrics =
    context.measureText("Hg");

  const ascent =
    metrics.actualBoundingBoxAscent ||
    fontSize * 0.8;

  const lineBoxHeight =
    fontSize * lineHeight;

  return (
    (lineBoxHeight - fontSize) / 2 +
    ascent
  );
}

function positionTextEditorOverlay(element) {
  if (!element || textEditorOverlay.hidden) return;

  const fontSize = Math.max(
    1,
    Number(element.dataset.fontSize || 32)
  );

  const lineHeight = Math.max(
    0.5,
    Number(element.dataset.lineHeight || 1.2)
  );

  const letterSpacing =
    Number(element.dataset.letterSpacing || 0);

  const align =
    element.dataset.textAlign || "left";

  const textType =
    element.dataset.textType || "point";

  const boxWidth = Math.max(
    20,
    Number(element.dataset.textBoxWidth || 180)
  );

  const baselineY =
    Number(
      element.dataset.textY ??
      element.getAttribute("y") ??
      0
    );

  const box = element.getBBox();

  /*
   * Work entirely in the text element's own SVG coordinate system.
   * element.getScreenCTM() then maps that exact local coordinate system
   * through object translation, rotation, scale, canvas zoom and pan.
   */
  const storedTextX =
    Number(
      element.dataset.editAnchorX ??
      element.dataset.textX ??
      element.getAttribute("x") ??
      0
    );

  const isVisuallyEmpty =
    textValueForElement(element).length === 0;

  const localLeft =
    textType === "area"
      ? storedTextX
      : isVisuallyEmpty
        ? storedTextX
        : box.x;

  const localTop =
    baselineY -
    textEditorBaselineOffset(element);

  const localWidth =
    textType === "area"
      ? boxWidth
      : isVisuallyEmpty
        ? Math.max(fontSize * 0.6, 2)
        : Math.max(
            box.width + fontSize * 0.45,
            fontSize * 0.5,
            2
          );

  const renderedLineCount =
    Math.max(
      1,
      splitTextIntoWrappedLines(element).length
    );

  const localHeight =
    Math.max(
      fontSize * lineHeight,
      renderedLineCount *
        fontSize *
        lineHeight
    );

  const matrix =
    element.getScreenCTM();

  if (!matrix) return;

  /*
   * The textarea is fixed to the viewport. Giving it the SVG element's
   * complete screen matrix means its origin, scale and rotation are identical
   * to the hidden SVG text while editing.
   */
  textEditorOverlay.style.left = "0px";
  textEditorOverlay.style.top = "0px";
  textEditorOverlay.style.width =
    `${localWidth}px`;
  textEditorOverlay.style.height =
    `${localHeight}px`;

  textEditorOverlay.style.transform =
    `matrix(${matrix.a}, ${matrix.b}, ${matrix.c}, ${matrix.d}, ${matrix.e}, ${matrix.f}) ` +
    `translate(${localLeft}px, ${localTop}px)`;

  textEditorOverlay.style.transformOrigin =
    "0 0";

  textEditorOverlay.style.fontFamily =
    element.dataset.fontFamily || "Inter";

  textEditorOverlay.style.fontWeight =
    element.dataset.fontWeight || "400";

  textEditorOverlay.style.fontSize =
    `${fontSize}px`;

  textEditorOverlay.style.lineHeight =
    String(lineHeight);

  textEditorOverlay.style.letterSpacing =
    `${letterSpacing}px`;

  textEditorOverlay.style.textAlign =
    align;

  textEditorOverlay.style.color =
    resolvedTextEditorColor(element);

  textEditorOverlay.style.opacity =
    element.getAttribute("fill-opacity") || "1";
}
function beginTextEditing(element) {
  if (!isTextElement(element)) return;

  if (activeTextEdit && activeTextEdit !== element) {
    finishTextEditing(true);
  }

  activeTextEdit = element;

  if (!element.dataset.editAnchorX) {
    element.dataset.editAnchorX =
      String(
        Number(
          element.dataset.textX ??
          element.getAttribute("x") ??
          0
        )
      );
  }

  selectElement(element);
  selectionQuickMenu.hidden = true;
  textEditorOverlay.value = textValueForElement(element);
  textEditorOverlay.hidden = false;
  element.style.visibility = "hidden";
  positionTextEditorOverlay(element);

  requestAnimationFrame(() => {
    textEditorOverlay.focus();

    const end = textEditorOverlay.value.length;
    textEditorOverlay.setSelectionRange(end, end);
  });
}

function finishTextEditing(commit = true) {
  if (!activeTextEdit) return;

  const element = activeTextEdit;

  if (commit && element.isConnected) {
    element.dataset.textValue = textEditorOverlay.value || "";
    renderTextElement(element);
  }

  element.style.removeProperty("visibility");
  delete element.dataset.editAnchorX;
  textEditorOverlay.hidden = true;
  activeTextEdit = null;
  drawSelection();
  renderLayers();
  updatePropertyControls();

  if (commit) recordHistory({ label: "Text Edited", detail: "Text content changed" });
}

function updateTextPropertiesPanel() {
  const element =
    selectedItems.length === 1 && isTextElement(selected)
      ? selected
      : null;

  if (!element) {
    textPropertiesControls.hidden = true;
    textPropertiesEmpty.hidden = false;
    return;
  }

  textPropertiesControls.hidden = false;
  textPropertiesEmpty.hidden = true;
  const elementFontFamily =
    element.dataset.fontFamily || "Inter";

  ensureFontOption(
    elementFontFamily,
    customGoogleFonts.has(
      elementFontFamily
    )
  );

  textFontFamily.value =
    elementFontFamily;

  textFontWeight.value =
    element.dataset.fontWeight || "400";
  textFontSize.value = Number(element.dataset.fontSize || 32);
  textLineHeight.value = Number(element.dataset.lineHeight || 1.2);
  textLetterSpacing.value = Number(element.dataset.letterSpacing || 0);
  textAlign.value = element.dataset.textAlign || "left";

  const selectedFamily =
    element.dataset.fontFamily || "Inter";

  const builtInSupported =
    ["Inter", "Roboto"].includes(
      selectedFamily
    );

  const imported =
    customGoogleFonts.has(
      selectedFamily
    );

  const importedSupport =
    googleFontOutlineSupport.get(
      selectedFamily
    );

  const supported =
    builtInSupported ||
    (
      imported &&
      importedSupport === true
    );

  convertTextToOutlinesButton.disabled =
    !supported;

  if (builtInSupported) {
    textOutlineHint.textContent =
      "Outline conversion supports this font.";
  } else if (importedSupport === true) {
    textOutlineHint.textContent =
      "Imported Google Font can be converted to outlines.";
  } else if (
    imported &&
    importedSupport === false
  ) {
    textOutlineHint.textContent =
      "This Google Font loaded for display, but no outline-readable WOFF/TTF/OTF face could be resolved.";
  } else if (imported) {
    textOutlineHint.textContent =
      "Checking outline support for this Google Font…";

    probeGoogleFontOutlineSupport(
      selectedFamily
    ).then(() => {
      if (
        selected &&
        selected.dataset.fontFamily ===
          selectedFamily
      ) {
        updateTextPropertiesPanel();
      }
    });
  } else {
    textOutlineHint.textContent =
      "Choose Inter, Roboto, or import a Google Font.";
  }
}

function applyTextPropertyChange(record = false) {
  if (selectedItems.length !== 1 || !isTextElement(selected)) return;

  selected.dataset.fontFamily = textFontFamily.value;
  selected.dataset.fontWeight = textFontWeight.value;
  selected.dataset.fontSize = String(Math.max(1, Number(textFontSize.value || 32)));
  selected.dataset.lineHeight = String(Math.max(0.5, Number(textLineHeight.value || 1.2)));
  selected.dataset.letterSpacing = String(Number(textLetterSpacing.value || 0));
  selected.dataset.textAlign = textAlign.value;

  renderTextElement(selected);
  applyObjectTransform(selected);
  drawSelection();
  updateTransformPanel();
  updateTextPropertiesPanel();

  if (activeTextEdit === selected) positionTextEditorOverlay(selected);
  if (record) recordHistory();
}

[textFontFamily, textFontWeight, textFontSize, textLineHeight, textLetterSpacing, textAlign]
  .forEach(control => {
    control.addEventListener("input", () => applyTextPropertyChange(false));
    control.addEventListener("change", () => applyTextPropertyChange(true));
  });

addGoogleFontButton.addEventListener(
  "click",
  addGoogleFontFromInput
);

googleFontInput.addEventListener(
  "keydown",
  event => {
    if (event.key === "Enter") {
      event.preventDefault();
      addGoogleFontFromInput();
    }
  }
);

editTextContentButton.addEventListener("click", () => {
  if (isTextElement(selected)) beginTextEditing(selected);
});

textEditorOverlay.addEventListener("input", () => {
  if (!activeTextEdit) return;
  activeTextEdit.dataset.textValue = textEditorOverlay.value;
  renderTextElement(activeTextEdit);
  positionTextEditorOverlay(activeTextEdit);
});

textEditorOverlay.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    event.preventDefault();
    finishTextEditing(false);
    return;
  }

  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    finishTextEditing(true);
    return;
  }

  if (
    event.key === "Enter" &&
    activeTextEdit?.dataset.textType === "point" &&
    !event.shiftKey
  ) {
    event.preventDefault();
    finishTextEditing(true);
  }
});

textEditorOverlay.addEventListener("blur", () => {
  if (activeTextEdit) finishTextEditing(true);
});

const outlineFontUrls = {
  Inter: {
    "400": "https://cdn.jsdelivr.net/fontsource/fonts/inter@5.3.0/latin-400-normal.woff",
    "500": "https://cdn.jsdelivr.net/fontsource/fonts/inter@5.3.0/latin-500-normal.woff",
    "600": "https://cdn.jsdelivr.net/fontsource/fonts/inter@5.3.0/latin-600-normal.woff",
    "700": "https://cdn.jsdelivr.net/fontsource/fonts/inter@5.3.0/latin-700-normal.woff"
  },
  Roboto: {
    "400": "https://cdn.jsdelivr.net/fontsource/fonts/roboto@5.3.0/latin-400-normal.woff",
    "500": "https://cdn.jsdelivr.net/fontsource/fonts/roboto@5.3.0/latin-500-normal.woff",
    "600": "https://cdn.jsdelivr.net/fontsource/fonts/roboto@5.3.0/latin-600-normal.woff",
    "700": "https://cdn.jsdelivr.net/fontsource/fonts/roboto@5.3.0/latin-700-normal.woff"
  }
};

async function loadOutlineFont(family, weight) {
  const url = outlineFontUrls[family]?.[weight] || outlineFontUrls[family]?.["400"];
  if (!url || typeof opentype === "undefined") return null;

  const key = `${family}:${weight}`;
  if (loadedOutlineFonts.has(key)) return loadedOutlineFonts.get(key);

  const promise = new Promise((resolve, reject) => {
    opentype.load(url, (error, font) => error ? reject(error) : resolve(font));
  });

  loadedOutlineFonts.set(key, promise);

  try {
    return await promise;
  } catch (error) {
    loadedOutlineFonts.delete(key);
    throw error;
  }
}

function outlinedLinePathData(font, text, x, y, fontSize, letterSpacing) {
  const glyphs = font.stringToGlyphs(text || " ");
  const scale = fontSize / font.unitsPerEm;
  let cursorX = x;
  let d = "";

  glyphs.forEach((glyph, index) => {
    d += glyph.getPath(cursorX, y, fontSize).toPathData(3);
    cursorX += (glyph.advanceWidth || font.unitsPerEm) * scale;

    if (index < glyphs.length - 1) {
      const next = glyphs[index + 1];
      cursorX += font.getKerningValue(glyph, next) * scale;
      cursorX += letterSpacing;
    }
  });

  return { d, width: cursorX - x };
}

async function convertSelectedTextToOutlines() {
  if (selectedItems.length !== 1 || !isTextElement(selected)) return;

  const source = selected;
  const family = source.dataset.fontFamily || "Inter";
  const weight = source.dataset.fontWeight || "400";

  const isBuiltInOutlineFont =
    Boolean(outlineFontUrls[family]);

  const isImportedGoogleFont =
    customGoogleFonts.has(family);

  if (
    !isBuiltInOutlineFont &&
    !isImportedGoogleFont
  ) {
    toolStatus.textContent =
      "Choose Inter, Roboto, or import a Google Font before outlining.";
    return;
  }

  toolStatus.textContent =
    "Converting text to outlines…";

  try {
    const font =
      isBuiltInOutlineFont
        ? await loadOutlineFont(
            family,
            weight
          )
        : await loadGoogleFontOutlineFont(
            family,
            weight
          );

    if (!font) {
      throw new Error(
        "Font could not be loaded."
      );
    }

    const fontSize = Number(source.dataset.fontSize || 32);
    const letterSpacing = Number(source.dataset.letterSpacing || 0);
    const align = source.dataset.textAlign || "left";
    const lines = [...source.querySelectorAll(":scope > tspan")];

    const group = createBaseElement("g");
    group.dataset.group = "true";
    group.dataset.name = `${source.dataset.name || "Text"} Outlines`;
    group.dataset.scaleX = source.dataset.scaleX || "1";
    group.dataset.scaleY = source.dataset.scaleY || "1";
    group.dataset.tx = source.dataset.tx || "0";
    group.dataset.ty = source.dataset.ty || "0";
    group.dataset.rotation = source.dataset.rotation || "0";
    group.removeAttribute("fill");
    group.removeAttribute("stroke");

    lines.forEach(tspan => {
      const lineText = tspan.textContent === " " ? "" : tspan.textContent;
      const baseX = Number(tspan.getAttribute("x") || 0);
      const y = Number(tspan.getAttribute("y") || 0);

      const measured = outlinedLinePathData(font, lineText, 0, y, fontSize, letterSpacing);
      let x = baseX;
      if (align === "center") x -= measured.width / 2;
      if (align === "right") x -= measured.width;

      const outlined = outlinedLinePathData(font, lineText, x, y, fontSize, letterSpacing);
      if (!outlined.d) return;

      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", outlined.d);
      path.setAttribute("fill", source.getAttribute("fill") || "#000");
      path.setAttribute("fill-opacity", source.getAttribute("fill-opacity") || "1");

      const sourceStroke = source.getAttribute("stroke");
      if (sourceStroke && sourceStroke !== "none") {
        path.setAttribute("stroke", sourceStroke);
        path.setAttribute("stroke-width", source.getAttribute("stroke-width") || "1");
        path.setAttribute("stroke-opacity", source.getAttribute("stroke-opacity") || "1");
      } else {
        path.setAttribute("stroke", "none");
      }

      group.appendChild(path);
    });

    source.replaceWith(group);
    applyObjectTransform(group);
    setSelection([group], group);
    renderLayers();
    recordHistory();
    toolStatus.textContent = "Text converted to outlines";
  } catch (error) {
    console.error(error);

    if (customGoogleFonts.has(family)) {
      googleFontOutlineSupport.set(
        family,
        false
      );
      updateTextPropertiesPanel();
    }

    toolStatus.textContent =
      customGoogleFonts.has(family)
        ? "Could not resolve this Google Font's vector glyph data."
        : "Could not load the selected font for outline conversion.";
  }
}

convertTextToOutlinesButton.addEventListener("click", convertSelectedTextToOutlines);


function clampPolygonSides(value) {
  return Math.max(
    3,
    Math.min(
      64,
      Math.round(
        Number(value) || 5
      )
    )
  );
}

function polygonPreviewPoints(sides) {
  return regularPolygonPoints(
    50,
    50,
    37,
    37,
    clampPolygonSides(sides),
    -90
  );
}

function updatePolygonSidesPreview() {
  const sides =
    clampPolygonSides(
      polygonSidesInput.value
    );

  polygonSidesInput.value =
    String(sides);

  polygonSidesPreviewShape.setAttribute(
    "points",
    polygonPreviewPoints(sides)
  );
}

function openPolygonSidesModal(
  center
) {
  pendingNgonCenter = {
    x: center.x,
    y: center.y
  };

  polygonSidesInput.value =
    String(currentNgonSides);

  updatePolygonSidesPreview();

  polygonSidesModal.hidden =
    false;

  selectionQuickMenu.hidden =
    true;

  requestAnimationFrame(() => {
    polygonSidesInput.focus();
    polygonSidesInput.select();
  });
}

function cancelPolygonSidesSetup() {
  polygonSidesModal.hidden =
    true;

  pendingNgonCenter = null;
  startPoint = null;
  clearSnapGuides();

  toolStatus.textContent =
    "Polygon (N-gon) Tool";
}

function confirmPolygonSidesSetup() {
  if (!pendingNgonCenter) {
    cancelPolygonSidesSetup();
    return;
  }

  currentNgonSides =
    clampPolygonSides(
      polygonSidesInput.value
    );

  polygonSidesModal.hidden =
    true;

  deselect();

  startPoint = {
    ...pendingNgonCenter
  };

  pendingNgonCenter = null;

  pendingShape =
    createShape(startPoint);

  selected = pendingShape;
  selectedItems = [pendingShape];

  updatePropertyControls();

  updatePendingShape(
    startPoint,
    true,
    true
  );

  renderLayers();

  toolStatus.textContent =
    `Polygon Tool — ${currentNgonSides} vertices; click to set radius`;
}

polygonSidesInput.addEventListener(
  "input",
  updatePolygonSidesPreview
);

polygonSidesDecrease.addEventListener(
  "click",
  () => {
    polygonSidesInput.value =
      String(
        clampPolygonSides(
          Number(
            polygonSidesInput.value
          ) - 1
        )
      );

    updatePolygonSidesPreview();
  }
);

polygonSidesIncrease.addEventListener(
  "click",
  () => {
    polygonSidesInput.value =
      String(
        clampPolygonSides(
          Number(
            polygonSidesInput.value
          ) + 1
        )
      );

    updatePolygonSidesPreview();
  }
);

[
  closePolygonSidesModalButton,
  cancelPolygonSidesButton
].forEach(button => {
  button.addEventListener(
    "click",
    cancelPolygonSidesSetup
  );
});

confirmPolygonSidesButton.addEventListener(
  "click",
  confirmPolygonSidesSetup
);

polygonSidesModal.addEventListener(
  "keydown",
  event => {
    event.stopPropagation();

    if (event.key === "Escape") {
      event.preventDefault();
      cancelPolygonSidesSetup();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      confirmPolygonSidesSetup();
    }
  }
);

function createShape(position) {
  let element;

  if (activeTool === "rect") {
    element = createBaseElement("rect");
    element.setAttribute("x", position.x);
    element.setAttribute("y", position.y);
    element.setAttribute("width", 0);
    element.setAttribute("height", 0);
    element.setAttribute("fill", fill.value);
  }


  if (["triangle", "pentagon", "hexagon", "star", "polygon"].includes(activeTool)) {
    element = createBaseElement("polygon");

    if (activeTool === "polygon") {
      element.dataset.shapeType = "ngon";
      element.dataset.sides = String(currentNgonSides);
      element.dataset.name = `${currentNgonSides}-gon ${objectCounter}`;
    } else {
      element.dataset.shapeType = activeTool;
      element.dataset.name = `${capitalize(activeTool)} ${objectCounter}`;
    }

    element.dataset.closed = "true";
    element.dataset.shape = "true";
    element.setAttribute("points", "");
    element.setAttribute("fill", fill.value);
  }

  if (activeTool === "ellipse") {
    element = createBaseElement("ellipse");
    element.setAttribute("cx", position.x);
    element.setAttribute("cy", position.y);
    element.setAttribute("rx", 0);
    element.setAttribute("ry", 0);
    element.setAttribute("fill", fill.value);
  }

  if (activeTool === "line") {
    element = createBaseElement("line");
    element.setAttribute("x1", position.x);
    element.setAttribute("y1", position.y);
    element.setAttribute("x2", position.x);
    element.setAttribute("y2", position.y);
    element.setAttribute("fill", "none");
  }

  if (!element) return null;
  art.appendChild(element);
  renderLayers();
  return element;
}



function lineIntersection2(
  a1,
  a2,
  b1,
  b2
) {
  const dax =
    a2.x - a1.x;
  const day =
    a2.y - a1.y;
  const dbx =
    b2.x - b1.x;
  const dby =
    b2.y - b1.y;

  const denominator =
    dax * dby -
    day * dbx;

  if (
    Math.abs(
      denominator
    ) < 1e-9
  ) {
    return null;
  }

  const dx =
    b1.x - a1.x;

  const dy =
    b1.y - a1.y;

  const t =
    (
      dx * dby -
      dy * dbx
    ) /
    denominator;

  return {
    x:
      a1.x +
      dax * t,
    y:
      a1.y +
      day * t
  };
}

function pointToward(
  point,
  target,
  amount
) {
  return {
    x:
      point.x +
      (
        target.x -
        point.x
      ) * amount,
    y:
      point.y +
      (
        target.y -
        point.y
      ) * amount
  };
}

function perspective2HorizontalQuad(
  start,
  end
) {
  const leftVP =
    perspective2State.leftVP;

  const rightVP =
    perspective2State.rightVP;

  /*
   * The drag has two independent dimensions:
   * horizontal movement controls one VP direction,
   * vertical movement controls the other. Both edge families therefore
   * converge correctly to the two vanishing points.
   */
  const leftAmount =
    Math.max(
      0.03,
      Math.min(
        0.82,
        Math.abs(
          end.x -
          start.x
        ) /
        Math.max(
          canvasWidth * 0.58,
          1
        )
      )
    );

  const rightAmount =
    Math.max(
      0.03,
      Math.min(
        0.82,
        Math.abs(
          end.y -
          start.y
        ) /
        Math.max(
          canvasHeight * 0.52,
          1
        )
      )
    );

  const corner =
    start;

  const leftCorner =
    pointToward(
      corner,
      leftVP,
      leftAmount
    );

  const rightCorner =
    pointToward(
      corner,
      rightVP,
      rightAmount
    );

  const farCorner =
    lineIntersection2(
      leftCorner,
      rightVP,
      rightCorner,
      leftVP
    ) || {
      x:
        (
          leftCorner.x +
          rightCorner.x
        ) / 2,
      y:
        (
          leftCorner.y +
          rightCorner.y
        ) / 2
    };

  return [
    corner,
    rightCorner,
    farCorner,
    leftCorner
  ];
}

function perspective2ProjectedQuad(
  start,
  end,
  side =
    perspective2State.activeSide
) {
  if (
    side === "horizontal"
  ) {
    return perspective2HorizontalQuad(
      start,
      end
    );
  }

  const vp =
    side === "left"
      ? perspective2State.leftVP
      : perspective2State.rightVP;

  const nearX =
    start.x;

  const farX =
    end.x;

  const topNearY =
    Math.min(
      start.y,
      end.y
    );

  const bottomNearY =
    Math.max(
      start.y,
      end.y
    );

  return [
    {
      x: nearX,
      y: topNearY
    },
    {
      x: farX,
      y:
        lineYAtX(
          {
            x: nearX,
            y: topNearY
          },
          vp,
          farX
        )
    },
    {
      x: farX,
      y:
        lineYAtX(
          {
            x: nearX,
            y: bottomNearY
          },
          vp,
          farX
        )
    },
    {
      x: nearX,
      y: bottomNearY
    }
  ];
}


function perspective2ShapeSourceData(
  element
) {
  if (
    !element?.dataset?.perspective2Source
  ) {
    return null;
  }

  try {
    return JSON.parse(
      element.dataset.perspective2Source
    );
  } catch {
    return null;
  }
}

function setPerspective2ShapeSourceData(
  element,
  data
) {
  if (!element) return;

  element.dataset.perspective2Source =
    JSON.stringify(
      data
    );
}

function perspective2ProjectedPathFromSource(
  element,
  source =
    perspective2ShapeSourceData(
      element
    )
) {
  if (
    !element ||
    !source
  ) {
    return false;
  }

  const start = {
    x:
      Number(
        source.startX
      ),
    y:
      Number(
        source.startY
      )
  };

  const end = {
    x:
      Number(
        source.endX
      ),
    y:
      Number(
        source.endY
      )
  };

  if (
    !Number.isFinite(start.x) ||
    !Number.isFinite(start.y) ||
    !Number.isFinite(end.x) ||
    !Number.isFinite(end.y)
  ) {
    return false;
  }

  const side =
    ["left", "right", "horizontal"].includes(
      source.side
    )
      ? source.side
      : "right";

  const points =
    perspective2ProjectedQuad(
      start,
      end,
      side
    );

  element._anchors =
    points.map(
      point => ({
        x: point.x,
        y: point.y,
        inX: point.x,
        inY: point.y,
        outX: point.x,
        outY: point.y,
        handleMode: "corner"
      })
    );

  element.dataset.closed =
    "true";

  element.dataset.perspective2 =
    "true";

  element.dataset.perspectiveSide =
    side;

  element.dataset.pathCornerRadii =
    JSON.stringify(
      Array(
        points.length
      ).fill(0)
    );

  updatePathD(
    element
  );

  return true;
}

function updatePendingPerspectivePreview(
  position
) {
  if (
    !perspective2State.visible ||
    !pendingShape ||
    !startPoint
  ) {
    return false;
  }

  if (
    pendingShape.tagName === "path" &&
    pendingShape.dataset.perspective2 ===
      "true"
  ) {
    const source = {
      startX:
        startPoint.x,
      startY:
        startPoint.y,
      endX:
        position.x,
      endY:
        position.y,
      side:
        perspective2State.activeSide
    };

    setPerspective2ShapeSourceData(
      pendingShape,
      source
    );

    perspective2ProjectedPathFromSource(
      pendingShape,
      source
    );

    return true;
  }

  if (
    !["rect", "polygon"].includes(
      pendingShape.tagName
    )
  ) {
    return false;
  }

  const replacement =
    createBaseElement(
      "path"
    );

  objectCounter -= 1;

  replacement.dataset.name =
    pendingShape.dataset.name;

  replacement.setAttribute(
    "fill",
    pendingShape.getAttribute(
      "fill"
    ) || fill.value
  );

  replacement.setAttribute(
    "stroke",
    pendingShape.getAttribute(
      "stroke"
    ) || stroke.value
  );

  replacement.setAttribute(
    "stroke-width",
    pendingShape.getAttribute(
      "stroke-width"
    ) ||
      strokeWidth.value
  );

  replacement.setAttribute(
    "fill-opacity",
    pendingShape.getAttribute(
      "fill-opacity"
    ) ?? 1
  );

  replacement.setAttribute(
    "stroke-opacity",
    pendingShape.getAttribute(
      "stroke-opacity"
    ) ?? 1
  );

  pendingShape.replaceWith(
    replacement
  );

  pendingShape =
    replacement;

  selected =
    replacement;

  selectedItems = [
    replacement
  ];

  const source = {
    startX:
      startPoint.x,
    startY:
      startPoint.y,
    endX:
      position.x,
    endY:
      position.y,
    side:
      perspective2State.activeSide
  };

  setPerspective2ShapeSourceData(
    replacement,
    source
  );

  perspective2ProjectedPathFromSource(
    replacement,
    source
  );

  return true;
}

function shiftPerspective2Source(
  element,
  dx,
  dy
) {
  const source =
    perspective2ShapeSourceData(
      element
    );

  if (!source) {
    return false;
  }

  source.startX =
    Number(source.startX) + dx;

  source.startY =
    Number(source.startY) + dy;

  source.endX =
    Number(source.endX) + dx;

  source.endY =
    Number(source.endY) + dy;

  setPerspective2ShapeSourceData(
    element,
    source
  );

  element.dataset.tx = "0";
  element.dataset.ty = "0";

  perspective2ProjectedPathFromSource(
    element,
    source
  );

  return true;
}

function refreshPerspective2LinkedShapes() {
  if (
    !perspective2State.visible
  ) {
    return;
  }

  art
    .querySelectorAll(
      '[data-perspective2="true"][data-perspective2-source]'
    )
    .forEach(
      element => {
        perspective2ProjectedPathFromSource(
          element
        );
      }
    );
}

function convertPendingShapeToPerspectivePath(
  element,
  start,
  end
) {
  if (
    !element ||
    !perspective2State.visible ||
    !["rect", "polygon"].includes(
      element.tagName
    )
  ) {
    return element;
  }

  const points =
    perspective2ProjectedQuad(
      start,
      end
    );

  const path =
    createBaseElement(
      "path"
    );

  objectCounter -= 1;

  path.dataset.name =
    element.dataset.name;

  path.dataset.closed =
    "true";

  path.dataset.shape =
    "true";

  path.dataset.perspective2 =
    "true";

  path.dataset.perspectiveSide =
    perspective2State.activeSide;

  setPerspective2ShapeSourceData(
    path,
    {
      startX: start.x,
      startY: start.y,
      endX: end.x,
      endY: end.y,
      side:
        perspective2State.activeSide
    }
  );

  path.setAttribute(
    "fill",
    element.getAttribute(
      "fill"
    ) || fill.value
  );

  path.setAttribute(
    "stroke",
    element.getAttribute(
      "stroke"
    ) || stroke.value
  );

  path.setAttribute(
    "stroke-width",
    element.getAttribute(
      "stroke-width"
    ) ||
      strokeWidth.value
  );

  path._anchors =
    points.map(
      point => ({
        x: point.x,
        y: point.y,
        inX: point.x,
        inY: point.y,
        outX: point.x,
        outY: point.y,
        handleMode:
          "corner"
      })
    );

  path.dataset.pathCornerRadii =
    JSON.stringify(
      Array(
        points.length
      ).fill(0)
    );

  updatePathD(
    path
  );

  element.replaceWith(
    path
  );

  return path;
}

function updatePendingShape(
  position,
  constrain = shiftDown,
  fromCenter = false
) {
  if (!pendingShape || !startPoint) return;

  if (
    perspective2State.visible &&
    updatePendingPerspectivePreview(
      position
    )
  ) {
    drawSelection();
    return;
  }

  if (pendingShape.tagName === "rect") {
    let dx = position.x - startPoint.x;
    let dy = position.y - startPoint.y;

    if (constrain) {
      const size = Math.max(Math.abs(dx), Math.abs(dy));
      dx = Math.sign(dx || 1) * size;
      dy = Math.sign(dy || 1) * size;
    }

    if (fromCenter) {
      pendingShape.setAttribute("x", startPoint.x - Math.abs(dx));
      pendingShape.setAttribute("y", startPoint.y - Math.abs(dy));
      pendingShape.setAttribute("width", Math.abs(dx) * 2);
      pendingShape.setAttribute("height", Math.abs(dy) * 2);
    } else {
      const endX = startPoint.x + dx;
      const endY = startPoint.y + dy;

      pendingShape.setAttribute("x", Math.min(startPoint.x, endX));
      pendingShape.setAttribute("y", Math.min(startPoint.y, endY));
      pendingShape.setAttribute("width", Math.abs(dx));
      pendingShape.setAttribute("height", Math.abs(dy));
    }
  }

  if (pendingShape.tagName === "ellipse") {
    let dx = position.x - startPoint.x;
    let dy = position.y - startPoint.y;

    if (constrain) {
      const size = Math.max(Math.abs(dx), Math.abs(dy));
      dx = Math.sign(dx || 1) * size;
      dy = Math.sign(dy || 1) * size;
    }

    if (fromCenter) {
      pendingShape.setAttribute("cx", startPoint.x);
      pendingShape.setAttribute("cy", startPoint.y);
      pendingShape.setAttribute("rx", Math.abs(dx));
      pendingShape.setAttribute("ry", Math.abs(dy));
    } else {
      const endX = startPoint.x + dx;
      const endY = startPoint.y + dy;

      pendingShape.setAttribute("cx", (startPoint.x + endX) / 2);
      pendingShape.setAttribute("cy", (startPoint.y + endY) / 2);
      pendingShape.setAttribute("rx", Math.abs(dx) / 2);
      pendingShape.setAttribute("ry", Math.abs(dy) / 2);
    }
  }

  if (pendingShape.tagName === "polygon") {
    const isNgon =
      pendingShape.dataset.shapeType ===
      "ngon";

    if (isNgon) {
      const dx =
        position.x -
        startPoint.x;

      const dy =
        position.y -
        startPoint.y;

      const radius =
        Math.hypot(
          dx,
          dy
        );

      const sides =
        clampPolygonSides(
          pendingShape.dataset.sides
        );

      pendingShape.setAttribute(
        "points",
        regularPolygonPoints(
          startPoint.x,
          startPoint.y,
          radius,
          radius,
          sides,
          -90
        )
      );

      pendingShape.dataset.centerX =
        String(startPoint.x);

      pendingShape.dataset.centerY =
        String(startPoint.y);

      pendingShape.dataset.radius =
        String(radius);
    } else {
      let dx =
        position.x -
        startPoint.x;

      let dy =
        position.y -
        startPoint.y;

      if (constrain) {
        const size =
          Math.max(
            Math.abs(dx),
            Math.abs(dy)
          );

        dx =
          Math.sign(dx || 1) *
          size;

        dy =
          Math.sign(dy || 1) *
          size;
      }

      let x;
      let y;
      let width;
      let height;

      if (fromCenter) {
        x =
          startPoint.x -
          Math.abs(dx);

        y =
          startPoint.y -
          Math.abs(dy);

        width =
          Math.abs(dx) * 2;

        height =
          Math.abs(dy) * 2;
      } else {
        const endX =
          startPoint.x + dx;

        const endY =
          startPoint.y + dy;

        x =
          Math.min(
            startPoint.x,
            endX
          );

        y =
          Math.min(
            startPoint.y,
            endY
          );

        width =
          Math.abs(dx);

        height =
          Math.abs(dy);
      }

      updateStandardPolygon(
        pendingShape,
        x,
        y,
        width,
        height
      );
    }
  }

  if (pendingShape.tagName === "line") {
    if (
      perspective2State.visible
    ) {
      const lineSide =
        perspective2State.activeSide ===
          "horizontal"
          ? (
              Math.abs(
                position.x -
                startPoint.x
              ) >=
              Math.abs(
                position.y -
                startPoint.y
              )
                ? "right"
                : "left"
            )
          : perspective2State.activeSide;

      const vp =
        lineSide === "left"
          ? perspective2State.leftVP
          : perspective2State.rightVP;

      pendingShape.setAttribute(
        "x1",
        startPoint.x
      );

      pendingShape.setAttribute(
        "y1",
        startPoint.y
      );

      pendingShape.setAttribute(
        "x2",
        position.x
      );

      pendingShape.setAttribute(
        "y2",
        lineYAtX(
          startPoint,
          vp,
          position.x
        )
      );

      pendingShape.dataset.perspective2 =
        "true";

      pendingShape.dataset.perspectiveSide =
        lineSide;
    } else if (fromCenter) {
      const dx = position.x - startPoint.x;
      const dy = position.y - startPoint.y;

      pendingShape.setAttribute("x1", startPoint.x - dx);
      pendingShape.setAttribute("y1", startPoint.y - dy);
      pendingShape.setAttribute("x2", startPoint.x + dx);
      pendingShape.setAttribute("y2", startPoint.y + dy);
    } else {
      pendingShape.setAttribute("x2", position.x);
      pendingShape.setAttribute("y2", position.y);
    }
  }

  drawSelection();
}

