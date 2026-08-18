/* Vector Studio modular baseline — source lines 26248-27123 from consolidated app.js.
   Classic-script module: shares the browser global lexical scope with ordered sibling modules. */

/* ---------------- 2-POINT PERSPECTIVE ---------------- */

function normalizePerspective2State(
  data = perspective2State
) {
  const horizonY =
    Number.isFinite(
      Number(data?.horizonY)
    )
      ? Number(data.horizonY)
      : canvasHeight * 0.34;

  const leftX =
    Number.isFinite(
      Number(data?.leftVP?.x)
    )
      ? Number(data.leftVP.x)
      : -canvasWidth * 0.28;

  const rightX =
    Number.isFinite(
      Number(data?.rightVP?.x)
    )
      ? Number(data.rightVP.x)
      : canvasWidth * 1.28;

  return {
    horizonY,
    leftVP: {
      x: leftX,
      y: horizonY
    },
    rightVP: {
      x: rightX,
      y: horizonY
    },
    visible:
      data?.visible === true,
    activeSide:
      ["left", "right", "horizontal"].includes(
        data?.activeSide
      )
        ? data.activeSide
        : "right"
  };
}


function togglePerspective2Mode(
  force = null
) {
  const next =
    force === null
      ? !perspective2State.visible
      : Boolean(force);

  perspective2State.visible =
    next;

  if (next) {
    perspective2State =
      normalizePerspective2State(
        perspective2State
      );

    toolStatus.textContent =
      "Perspective grid on — choose Left, Right, or Top / Bottom plane";

    refreshPerspective2LinkedShapes();
  }

  drawPerspective2Grid();
  scheduleAutosave();
}

perspective2Toggle?.addEventListener(
  "click",
  event => {
    event.preventDefault();
    event.stopPropagation();
    togglePerspective2Mode();
  }
);

perspectivePlaneSelector?.addEventListener(
  "click",
  event => {
    const button =
      event.target.closest(
        "[data-perspective-plane]"
      );

    if (!button) return;

    perspective2State.activeSide =
      button.dataset.perspectivePlane;

    drawPerspective2Grid();

    toolStatus.textContent =
      perspective2State.activeSide ===
        "horizontal"
        ? "Perspective plane: Top / Bottom"
        : `Perspective plane: ${capitalize(
            perspective2State.activeSide
          )}`;

    scheduleAutosave();
  }
);

function resetPerspective2Grid() {
  perspective2State =
    normalizePerspective2State({
      horizonY:
        canvasHeight * 0.34,
      leftVP: {
        x:
          -canvasWidth * 0.28
      },
      rightVP: {
        x:
          canvasWidth * 1.28
      },
      visible: true
    });

  drawPerspective2Grid();
  scheduleAutosave();
}

function lineYAtX(
  a,
  b,
  x
) {
  const dx =
    b.x - a.x;

  if (
    Math.abs(dx) <
      1e-9
  ) {
    return a.y;
  }

  const t =
    (x - a.x) /
    dx;

  return (
    a.y +
    (b.y - a.y) *
      t
  );
}

function perspective2PlanePoints(
  start,
  end
) {
  const dx =
    end.x - start.x;

  const vp =
    dx >= 0
      ? perspective2State.rightVP
      : perspective2State.leftVP;

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

  const topFarY =
    lineYAtX(
      {
        x: nearX,
        y: topNearY
      },
      vp,
      farX
    );

  const bottomFarY =
    lineYAtX(
      {
        x: nearX,
        y: bottomNearY
      },
      vp,
      farX
    );

  return [
    {
      x: nearX,
      y: topNearY
    },
    {
      x: farX,
      y: topFarY
    },
    {
      x: farX,
      y: bottomFarY
    },
    {
      x: nearX,
      y: bottomNearY
    }
  ];
}

function perspective2PathD(
  points
) {
  if (
    !Array.isArray(points) ||
    points.length !== 4
  ) {
    return "";
  }

  return [
    `M ${points[0].x} ${points[0].y}`,
    `L ${points[1].x} ${points[1].y}`,
    `L ${points[2].x} ${points[2].y}`,
    `L ${points[3].x} ${points[3].y}`,
    "Z"
  ].join(" ");
}

function drawPerspective2Grid() {
  perspectiveOverlay.replaceChildren();

  const show =
    perspective2State.visible === true;

  perspectiveOverlay.style.display =
    show
      ? ""
      : "none";

  perspective2Toggle?.classList.toggle(
    "active",
    show
  );

  perspective2Toggle?.setAttribute(
    "aria-pressed",
    show
      ? "true"
      : "false"
  );

  if (perspectivePlaneSelector) {
    perspectivePlaneSelector.hidden =
      !show;

    perspectivePlaneSelector
      .querySelectorAll(
        "[data-perspective-plane]"
      )
      .forEach(
        button => {
          button.classList.toggle(
            "active",
            button.dataset.perspectivePlane ===
              perspective2State.activeSide
          );
        }
      );
  }

  if (!show) return;

  const state =
    normalizePerspective2State(
      perspective2State
    );

  perspective2State = state;

  const horizon =
    svgEl(
      "line",
      {
        x1:
          -canvasWidth * 2,
        y1:
          state.horizonY,
        x2:
          canvasWidth * 3,
        y2:
          state.horizonY,
        class:
          "perspective-horizon",
        "pointer-events":
          "none"
      }
    );

  perspectiveOverlay.appendChild(
    horizon
  );

  const bottom =
    canvasHeight * 1.25;

  const guideXs = [];
  const steps = 9;

  for (
    let index = 0;
    index <= steps;
    index += 1
  ) {
    guideXs.push(
      canvasWidth *
        (index / steps)
    );
  }

  [
    state.leftVP,
    state.rightVP
  ].forEach(
    (vp, vpIndex) => {
      guideXs.forEach(
        x => {
          perspectiveOverlay.appendChild(
            svgEl(
              "line",
              {
                x1: vp.x,
                y1: vp.y,
                x2: x,
                y2: bottom,
                class:
                  vpIndex === 0
                    ? "perspective-guide perspective-guide-left"
                    : "perspective-guide perspective-guide-right",
                "pointer-events":
                  "none"
              }
            )
          );
        }
      );
    }
  );

  [
    {
      key: "left",
      point:
        state.leftVP
    },
    {
      key: "right",
      point:
        state.rightVP
    }
  ].forEach(
    item => {
      perspectiveOverlay.appendChild(
        svgEl(
          "circle",
          {
            cx:
              item.point.x,
            cy:
              item.point.y,
            r:
              7 / Math.max(
                zoom,
                0.3
              ),
            class:
              [
                "perspective-vp",
                `perspective-vp-${item.key}`,
                perspective2State.activeSide ===
                  item.key
                  ? "perspective-vp-active"
                  : ""
              ]
                .filter(Boolean)
                .join(" "),
            "data-perspective-handle":
              `${item.key}-vp`
          }
        )
      );

      perspectiveOverlay.appendChild(
        svgEl(
          "circle",
          {
            cx:
              item.point.x,
            cy:
              item.point.y,
            r:
              2 / Math.max(
                zoom,
                0.3
              ),
            class:
              "perspective-vp-dot",
            "pointer-events":
              "none"
          }
        )
      );
    }
  );

  perspectiveOverlay.appendChild(
    svgEl(
      "rect",
      {
        x:
          canvasWidth / 2 -
          18 / Math.max(
            zoom,
            0.3
          ),
        y:
          state.horizonY -
          4 / Math.max(
            zoom,
            0.3
          ),
        width:
          36 / Math.max(
            zoom,
            0.3
          ),
        height:
          8 / Math.max(
            zoom,
            0.3
          ),
        rx:
          3 / Math.max(
            zoom,
            0.3
          ),
        class:
          "perspective-horizon-handle",
        "data-perspective-handle":
          "horizon"
      }
    )
  );

  if (
    perspective2Draw?.preview
  ) {
    perspectiveOverlay.appendChild(
      perspective2Draw.preview
    );
  }
}

function beginPerspective2HandleDrag(
  handle,
  point,
  pointerId
) {
  if (handle === "left-vp") {
    perspective2State.activeSide =
      "left";
  } else if (
    handle === "right-vp"
  ) {
    perspective2State.activeSide =
      "right";
  }

  perspective2Drag = {
    handle,
    pointerId,
    start: {
      ...point
    },
    original:
      normalizePerspective2State(
        perspective2State
      )
  };

  return true;
}

function updatePerspective2HandleDrag(
  point
) {
  if (!perspective2Drag) {
    return false;
  }

  const handle =
    perspective2Drag.handle;

  if (
    handle === "horizon"
  ) {
    const y =
      point.y;

    perspective2State.horizonY =
      y;

    perspective2State.leftVP.y =
      y;

    perspective2State.rightVP.y =
      y;
  } else if (
    handle === "left-vp"
  ) {
    perspective2State.leftVP.x =
      point.x;
  } else if (
    handle === "right-vp"
  ) {
    perspective2State.rightVP.x =
      point.x;
  }

  refreshPerspective2LinkedShapes();
  drawPerspective2Grid();
  drawSelection();

  return true;
}

function endPerspective2HandleDrag() {
  if (!perspective2Drag) {
    return false;
  }

  perspective2Drag =
    null;

  scheduleAutosave();

  return true;
}

function beginPerspective2Draw(
  point,
  pointerId
) {
  deselect();

  const preview =
    svgEl(
      "path",
      {
        d: "",
        class:
          "perspective-draw-preview",
        "pointer-events":
          "none"
      }
    );

  perspective2Draw = {
    pointerId,
    start: {
      ...point
    },
    current: {
      ...point
    },
    preview
  };

  drawPerspective2Grid();

  return true;
}

function updatePerspective2Draw(
  point
) {
  if (!perspective2Draw) {
    return false;
  }

  perspective2Draw.current = {
    ...point
  };

  const points =
    perspective2PlanePoints(
      perspective2Draw.start,
      point
    );

  perspective2Draw.preview.setAttribute(
    "d",
    perspective2PathD(
      points
    )
  );

  drawPerspective2Grid();

  return true;
}

function finishPerspective2Draw() {
  if (!perspective2Draw) {
    return false;
  }

  const start =
    perspective2Draw.start;

  const end =
    perspective2Draw.current;

  const width =
    Math.abs(
      end.x - start.x
    );

  const height =
    Math.abs(
      end.y - start.y
    );

  perspective2Draw =
    null;

  drawPerspective2Grid();

  if (
    width < 4 ||
    height < 4
  ) {
    return false;
  }

  const points =
    perspective2PlanePoints(
      start,
      end
    );

  const path =
    createBaseElement(
      "path"
    );

  path.dataset.name =
    `Perspective Plane ${objectCounter}`;

  path.dataset.closed =
    "true";

  path.dataset.shape =
    "true";

  path.dataset.perspective2 =
    "true";

  path.dataset.perspectiveSide =
    end.x >= start.x
      ? "right"
      : "left";

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

  path.setAttribute(
    "fill",
    fill.value
  );

  updatePathD(
    path
  );

  art.appendChild(
    path
  );

  setSelection(
    [path],
    path
  );

  renderLayers();

  recordHistory({
    label:
      "Perspective Plane Created",
    detail:
      `${path.dataset.perspectiveSide} vanishing point`
  });

  toolStatus.textContent =
    "2-Point Perspective: plane created";

  return true;
}


function drawLassoSelection(points = lassoPoints) {
  selectionOverlay.querySelector("#lassoSelection")?.remove();
  if (!points || points.length < 2) return;

  const d = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const path = svgEl("path", {
    id: "lassoSelection",
    d,
    fill: "rgba(124, 58, 237, 0.08)",
    stroke: "#8b5cf6",
    "stroke-width": 1.5,
    "stroke-dasharray": "5 3",
    "vector-effect": "non-scaling-stroke",
    "pointer-events": "none"
  });
  selectionOverlay.appendChild(path);
}

function pointInPolygon(point, polygon) {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const intersects =
      ((a.y > point.y) !== (b.y > point.y)) &&
      (point.x < (b.x - a.x) * (point.y - a.y) / ((b.y - a.y) || 1e-9) + a.x);
    if (intersects) inside = !inside;
  }
  return inside;
}

function segmentIntersectsPolygon(a, b, polygon) {
  for (let i = 0; i < polygon.length; i++) {
    const c = polygon[i];
    const d = polygon[(i + 1) % polygon.length];
    if (segmentsIntersect(a, b, c, d)) return true;
  }
  return false;
}

function shapeIntersectsLasso(element, polygon) {
  if (!element || !element.isConnected || polygon.length < 3) return false;
  const bounds = elementCanvasBounds(element);
  const samples = [
    { x: bounds.left, y: bounds.top },
    { x: bounds.right, y: bounds.top },
    { x: bounds.right, y: bounds.bottom },
    { x: bounds.left, y: bounds.bottom },
    { x: (bounds.left + bounds.right) / 2, y: (bounds.top + bounds.bottom) / 2 }
  ];

  if (samples.some(point => pointInPolygon(point, polygon))) return true;
  if (polygon.some(point => pointInRect(point, bounds))) return true;

  const corners = samples.slice(0, 4);
  for (let i = 0; i < corners.length; i++) {
    if (segmentIntersectsPolygon(corners[i], corners[(i + 1) % corners.length], polygon)) {
      return true;
    }
  }
  return false;
}

function normalizedPaintValue(element, attr) {
  let value = String(element?.getAttribute?.(attr) || "").trim().toLowerCase();
  if (!value) value = attr === "fill" ? "none" : "none";
  return value.replace(/\s+/g, "");
}

function selectionReferenceColor(element) {
  if (!element) return null;
  const fill = normalizedPaintValue(element, "fill");
  if (fill && fill !== "none" && fill !== "transparent") {
    return { attr: "fill", value: fill };
  }
  const stroke = normalizedPaintValue(element, "stroke");
  if (stroke && stroke !== "none" && stroke !== "transparent") {
    return { attr: "stroke", value: stroke };
  }
  return null;
}

function selectByReferenceColor() {
  const reference = selectionReferenceColor(selected);
  if (!reference) {
    toolStatus.textContent = "Select by Color: choose an object with a visible fill or stroke first";
    return;
  }
  const matches = [...art.querySelectorAll("[data-object='true']")]
    .filter(isLayerInteractive)
    .filter(element => normalizedPaintValue(element, reference.attr) === reference.value);
  setSelection(matches, matches.includes(selected) ? selected : matches[matches.length - 1]);
  toolStatus.textContent = `Selected ${matches.length} object${matches.length === 1 ? "" : "s"} by ${reference.attr} color`;
}

function similarShapeKey(element) {
  if (!element) return "";
  if (isTextElement(element)) return "text";
  if (isGroup(element)) {
    if (element.dataset.threeDExtrude === "true") return element.dataset.threeDMode === "revolve" ? "group:3d-revolve" : "group:3d-extrude";
    if (element.dataset.compoundShape === "true") return "group:compound";
    return "group";
  }
  const tag = String(element.tagName || "").toLowerCase();
  const type = element.dataset.shapeType || element.dataset.originalShape || "";
  if (type) return `${tag}:${type}`;
  if (tag === "path") {
    if (element.dataset.curvaturePath === "true") return "path:curvature";
    if (element.dataset.freeDraw === "true") return "path:freeDraw";
    return "path:pen";
  }
  return tag;
}

function selectSimilarShapes() {
  if (!selected) {
    toolStatus.textContent = "Select Similar Shapes: choose a reference object first";
    return;
  }
  const key = similarShapeKey(selected);
  const matches = [...art.querySelectorAll("[data-object='true']")]
    .filter(isLayerInteractive)
    .filter(element => similarShapeKey(element) === key);
  setSelection(matches, matches.includes(selected) ? selected : matches[matches.length - 1]);
  toolStatus.textContent = `Selected ${matches.length} similar shape${matches.length === 1 ? "" : "s"}`;
}

