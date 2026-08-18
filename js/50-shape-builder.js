/* Vector Studio modular baseline — source lines 19679-26247 from consolidated app.js.
   Classic-script module: shares the browser global lexical scope with ordered sibling modules. */

/* ---------------- SHAPE BUILDER ---------------- */

function isShapeBuilderCutter(element) {
  if (!element || !isLayerInteractive(element)) return false;

  const tag = element.tagName?.toLowerCase();

  if (tag === "line" || tag === "polyline") {
    return true;
  }

  return (
    tag === "path" &&
    element.dataset.closed !== "true" &&
    element.dataset.compoundShape !== "true" &&
    element.dataset.shapeBuilderGeoJSON !== "true"
  );
}

function isShapeBuilderFillSource(element) {
  if (!element || !isLayerInteractive(element)) return false;

  if (
    element.dataset
      ?.shapeBuilderGeoJSON ===
      "true"
  ) {
    return true;
  }

  const tag = element.tagName?.toLowerCase();

  if (
    tag === "rect" ||
    tag === "ellipse" ||
    tag === "circle" ||
    tag === "polygon"
  ) {
    return true;
  }

  return (
    (tag === "path" && element.dataset.closed === "true") ||
    element.dataset.compoundShape === "true"
  );
}

function isShapeBuilderEligible(element) {
  return (
    isShapeBuilderFillSource(element) ||
    isShapeBuilderCutter(element)
  );
}

function pointInsideShape(element, point) {
  const localPoint = localPointFromCanvas(element, point);
  const x = localPoint.x;
  const y = localPoint.y;

  if (element.tagName === "rect") {
    const rx = Number(element.getAttribute("x"));
    const ry = Number(element.getAttribute("y"));
    const rw = Number(element.getAttribute("width"));
    const rh = Number(element.getAttribute("height"));

    return (
      x >= rx &&
      x <= rx + rw &&
      y >= ry &&
      y <= ry + rh
    );
  }

  if (element.tagName === "polygon") {
    const pointList = (element.getAttribute("points") || "")
      .trim()
      .split(/\s+/)
      .map(pair => pair.split(",").map(Number))
      .filter(pair => pair.length === 2 && pair.every(Number.isFinite));

    let inside = false;

    for (let i = 0, j = pointList.length - 1; i < pointList.length; j = i++) {
      const [xi, yi] = pointList[i];
      const [xj, yj] = pointList[j];

      const intersects =
        ((yi > y) !== (yj > y)) &&
        (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi);

      if (intersects) inside = !inside;
    }

    return inside;
  }

  if (element.tagName === "ellipse") {
    const cx = Number(element.getAttribute("cx"));
    const cy = Number(element.getAttribute("cy"));
    const erx = Math.max(0.0001, Number(element.getAttribute("rx")));
    const ery = Math.max(0.0001, Number(element.getAttribute("ry")));

    return (
      ((x - cx) ** 2) / (erx ** 2) +
      ((y - cy) ** 2) / (ery ** 2)
    ) <= 1;
  }

  if (
    element.tagName === "path" &&
    typeof element.isPointInFill === "function"
  ) {
    try {
      return element.isPointInFill(new DOMPoint(x, y));
    } catch {
      return false;
    }
  }

  return false;
}

function densifyBuilderStroke(points, spacing = 4) {
  if (points.length < 2) return [...points];

  const dense = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const distance = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.ceil(distance / spacing));

    for (let step = 1; step <= steps; step++) {
      const ratio = step / steps;
      dense.push({
        x: a.x + (b.x - a.x) * ratio,
        y: a.y + (b.y - a.y) * ratio
      });
    }
  }

  return dense;
}

function paperRegionIsUsable(item) {
  if (!item) return false;

  const bounds = item.bounds;
  if (!bounds || bounds.width < 0.01 || bounds.height < 0.01) {
    return false;
  }

  const area = Math.abs(Number(item.area || 0));
  return area > 0.01;
}

function removePaperItem(item) {
  if (item && typeof item.remove === "function") {
    try {
      item.remove();
    } catch {
      // Paper items created with insert:false can already be detached.
    }
  }
}

function normalizePaperBooleanGeometry(item) {
  if (!item) return item;

  /*
   * Shape Builder operates on fill regions only.
   * Never allow source stroke/dash appearance to participate in or survive
   * Paper.js boolean operations.
   */
  try {
    item.strokeColor = null;
    item.strokeWidth = 0;
    item.dashArray = [];
    item.dashOffset = 0;
    item.opacity = 1;

    /*
     * Give boolean paths a simple opaque fill so Paper treats them only as
     * closed region geometry. The editor's real appearance is reapplied after
     * the boolean result is imported.
     */
    if ("fillColor" in item) {
      item.fillColor = new paper.Color("#000000");
    }
  } catch {
    // Some imported container items expose style through their children only.
  }

  if (item.children?.length) {
    item.children.forEach(child =>
      normalizePaperBooleanGeometry(child)
    );
  }

  return item;
}

function buildShapeBuilderRegionsPaperLegacy(elements) {
  if (!ensurePaperReady()) return false;

  paper.project.clear();

  const sourceItems = elements
    .map(svgShapeToPaper)
    .map(normalizePaperBooleanGeometry);

  if (sourceItems.some(item => !item)) {
    sourceItems.forEach(removePaperItem);
    paper.project.clear();
    return false;
  }

  let regions = [];

  sourceItems.forEach((sourceItem, sourceIndex) => {
    if (!regions.length) {
      const initial = sourceItem.clone({ insert: false });

      if (paperRegionIsUsable(initial)) {
        regions.push({
          item: initial,
          sources: new Set([sourceIndex])
        });
      } else {
        removePaperItem(initial);
      }

      return;
    }

    const previousRegions = regions;
    const nextRegions = [];
    let remaining = sourceItem.clone({ insert: false });

    previousRegions.forEach(region => {
      const intersection = normalizePaperBooleanGeometry(
        region.item.intersect(
          sourceItem,
          { insert: false }
        )
      );

      const outside = normalizePaperBooleanGeometry(
        region.item.subtract(
          sourceItem,
          { insert: false }
        )
      );

      if (paperRegionIsUsable(outside)) {
        nextRegions.push({
          item: outside,
          sources: new Set(region.sources)
        });
      } else {
        removePaperItem(outside);
      }

      if (paperRegionIsUsable(intersection)) {
        nextRegions.push({
          item: intersection,
          sources: new Set([
            ...region.sources,
            sourceIndex
          ])
        });
      } else {
        removePaperItem(intersection);
      }

      if (remaining && paperRegionIsUsable(remaining)) {
        const reduced = normalizePaperBooleanGeometry(
          remaining.subtract(
            region.item,
            { insert: false }
          )
        );

        removePaperItem(remaining);
        remaining = reduced;
      }

      removePaperItem(region.item);
    });

    if (paperRegionIsUsable(remaining)) {
      nextRegions.push({
        item: remaining,
        sources: new Set([sourceIndex])
      });
    } else {
      removePaperItem(remaining);
    }

    regions = nextRegions;
  });

  sourceItems.forEach(removePaperItem);

  shapeBuilderSources = [...elements];
  shapeBuilderRegions = regions.map((region, index) => ({
    ...region,
    id: `builder-region-${index}`
  }));

  return shapeBuilderRegions.length > 0;
}



function shapeBuilderTopologyElementSignature(
  element
) {
  if (!element) return "";

  const attributes = [
    "x",
    "y",
    "width",
    "height",
    "cx",
    "cy",
    "rx",
    "ry",
    "r",
    "points",
    "x1",
    "y1",
    "x2",
    "y2",
    "d",
    "transform"
  ];

  const attributeSignature =
    attributes
      .map(
        name =>
          `${name}:${element.getAttribute(name) || ""}`
      )
      .join("|");

  const dataSignature = [
    element.dataset.tx || "",
    element.dataset.ty || "",
    element.dataset.rotation || "",
    element.dataset.scaleX || "",
    element.dataset.scaleY || "",
    element.dataset.closed || "",
    element.dataset.compoundShape || "",
    element.dataset.shapeBuilderGeometry || ""
  ].join("|");

  return `${element.tagName}:${attributeSignature}:${dataSignature}`;
}

function shapeBuilderTopologySelectionKey(
  elements
) {
  return elements
    .map(
      shapeBuilderTopologyElementSignature
    )
    .join("||");
}

function clearShapeBuilderTopologyCache() {
  shapeBuilderTopologyCacheKey = "";
  shapeBuilderTopologyCacheRegions = null;
  shapeBuilderTopologyCacheSources = [];
}

function cloneShapeBuilderTopologyRegion(
  region
) {
  return {
    ...region,
    sources:
      new Set(
        region.sources
      ),
    /*
     * Keep GeoJSON immutable/shared; defer Paper geometry creation until a
     * merge/output path actually needs it.
     */
    item:
      null
  };
}

function restoreShapeBuilderTopologyCache(
  elements
) {
  const key =
    shapeBuilderTopologySelectionKey(
      elements
    );

  if (
    !shapeBuilderTopologyCacheRegions ||
    shapeBuilderTopologyCacheKey !==
      key ||
    shapeBuilderTopologyCacheSources.length !==
      elements.length ||
    shapeBuilderTopologyCacheSources.some(
      (source, index) =>
        source !== elements[index]
    )
  ) {
    return false;
  }

  shapeBuilderSources =
    [...elements];

  shapeBuilderRegions =
    shapeBuilderTopologyCacheRegions.map(
      cloneShapeBuilderTopologyRegion
    );

  shapeBuilderTopologyFaceCount =
    shapeBuilderRegions.length;

  updateShapeBuilderTopologyStatus();

  return true;
}

function cacheShapeBuilderTopologyRegions(
  elements,
  regions
) {
  shapeBuilderTopologyCacheKey =
    shapeBuilderTopologySelectionKey(
      elements
    );

  shapeBuilderTopologyCacheSources =
    [...elements];

  shapeBuilderTopologyCacheRegions =
    regions.map(
      cloneShapeBuilderTopologyRegion
    );
}

function shapeBuilderTopologyRound(value) {
  const number =
    Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.round(
    number * 1e6
  ) / 1e6;
}

function shapeBuilderTopologyCanvasPoint(
  element,
  x,
  y
) {
  /*
   * Top-level editor objects use the editor's own geometry transform model.
   * This is the same coordinate system used by selection, Shape Builder
   * pointer positions and pointInsideShape().
   */
  if (
    element?.dataset
      ?.object === "true"
  ) {
    try {
      const transformed =
        canvasPointFromLocal(
          element,
          Number(x) || 0,
          Number(y) || 0
        );

      return [
        shapeBuilderTopologyRound(
          transformed.x
        ),
        shapeBuilderTopologyRound(
          transformed.y
        )
      ];
    } catch {}
  }

  /*
   * Nested imported compound geometry does not carry editor object metadata,
   * so fall back to SVG CTM for those child nodes.
   */
  const point =
    new DOMPoint(
      Number(x) || 0,
      Number(y) || 0
    );

  try {
    const matrix =
      element?.getCTM?.();

    if (matrix) {
      const transformed =
        point.matrixTransform(
          matrix
        );

      return [
        shapeBuilderTopologyRound(
          transformed.x
        ),
        shapeBuilderTopologyRound(
          transformed.y
        )
      ];
    }
  } catch {}

  return [
    shapeBuilderTopologyRound(
      point.x
    ),
    shapeBuilderTopologyRound(
      point.y
    )
  ];
}

function shapeBuilderTopologyCloseRing(
  coordinates
) {
  const clean = [];

  coordinates.forEach(
    coordinate => {
      if (
        !Array.isArray(coordinate) ||
        coordinate.length < 2
      ) {
        return;
      }

      const point = [
        shapeBuilderTopologyRound(
          coordinate[0]
        ),
        shapeBuilderTopologyRound(
          coordinate[1]
        )
      ];

      const previous =
        clean[clean.length - 1];

      if (
        !previous ||
        Math.hypot(
          point[0] - previous[0],
          point[1] - previous[1]
        ) > 1e-7
      ) {
        clean.push(point);
      }
    }
  );

  if (clean.length < 3) {
    return [];
  }

  const first = clean[0];
  const last =
    clean[clean.length - 1];

  if (
    Math.hypot(
      first[0] - last[0],
      first[1] - last[1]
    ) > 1e-7
  ) {
    clean.push([
      first[0],
      first[1]
    ]);
  }

  return clean;
}

function shapeBuilderTopologyEllipseRing(
  element
) {
  const tag =
    element.tagName.toLowerCase();

  const cx =
    Number(
      element.getAttribute("cx")
    ) || 0;

  const cy =
    Number(
      element.getAttribute("cy")
    ) || 0;

  const rx =
    tag === "circle"
      ? Number(
          element.getAttribute("r")
        ) || 0
      : Number(
          element.getAttribute("rx")
        ) || 0;

  const ry =
    tag === "circle"
      ? rx
      : Number(
          element.getAttribute("ry")
        ) || 0;

  if (
    rx <= 0 ||
    ry <= 0
  ) {
    return [];
  }

  /*
   * Divisible by 4 so exact circle cardinal points are always present.
   * This makes exact square/circle tangencies graph vertices.
   */
  const steps = 128;
  const coordinates = [];

  for (
    let index = 0;
    index < steps;
    index += 1
  ) {
    const angle =
      index / steps *
      Math.PI * 2;

    coordinates.push(
      shapeBuilderTopologyCanvasPoint(
        element,
        cx +
          Math.cos(angle) * rx,
        cy +
          Math.sin(angle) * ry
      )
    );
  }

  return shapeBuilderTopologyCloseRing(
    coordinates
  );
}

function shapeBuilderTopologySampleRing(
  element
) {
  if (
    typeof element.getTotalLength !==
      "function" ||
    typeof element.getPointAtLength !==
      "function"
  ) {
    return [];
  }

  let length = 0;

  try {
    length =
      Number(
        element.getTotalLength()
      ) || 0;
  } catch {
    return [];
  }

  if (length <= 1e-6) {
    return [];
  }

  /*
   * Topology does not need render-level sampling density. Keep enough points
   * for stable curve intersections, but cap aggressively for interaction.
   */
  let steps =
    Math.ceil(
      length /
      Math.max(
        1.25,
        1.75 /
          Math.max(
            zoom,
            0.1
          )
      )
    );

  steps =
    Math.max(
      96,
      Math.min(
        1024,
        steps
      )
    );

  steps +=
    (4 - steps % 4) % 4;

  const coordinates = [];

  for (
    let index = 0;
    index < steps;
    index += 1
  ) {
    const point =
      element.getPointAtLength(
        length *
        index /
        steps
      );

    coordinates.push(
      shapeBuilderTopologyCanvasPoint(
        element,
        point.x,
        point.y
      )
    );
  }

  return shapeBuilderTopologyCloseRing(
    coordinates
  );
}

function shapeBuilderTopologyRectRing(
  element
) {
  const x =
    Number(
      element.getAttribute("x")
    ) || 0;

  const y =
    Number(
      element.getAttribute("y")
    ) || 0;

  const width =
    Number(
      element.getAttribute("width")
    ) || 0;

  const height =
    Number(
      element.getAttribute("height")
    ) || 0;

  if (
    width <= 0 ||
    height <= 0
  ) {
    return [];
  }

  if (
    Number(
      element.getAttribute("rx")
    ) > 0 ||
    Number(
      element.getAttribute("ry")
    ) > 0
  ) {
    return shapeBuilderTopologySampleRing(
      element
    );
  }

  return shapeBuilderTopologyCloseRing([
    shapeBuilderTopologyCanvasPoint(
      element,
      x,
      y
    ),
    shapeBuilderTopologyCanvasPoint(
      element,
      x + width,
      y
    ),
    shapeBuilderTopologyCanvasPoint(
      element,
      x + width,
      y + height
    ),
    shapeBuilderTopologyCanvasPoint(
      element,
      x,
      y + height
    )
  ]);
}

function shapeBuilderTopologyPolygonRing(
  element
) {
  const values =
    (
      element.getAttribute("points") ||
      ""
    )
      .trim()
      .replace(/,/g, " ")
      .split(/\s+/)
      .map(Number)
      .filter(Number.isFinite);

  const coordinates = [];

  for (
    let index = 0;
    index + 1 < values.length;
    index += 2
  ) {
    coordinates.push(
      shapeBuilderTopologyCanvasPoint(
        element,
        values[index],
        values[index + 1]
      )
    );
  }

  return shapeBuilderTopologyCloseRing(
    coordinates
  );
}

function shapeBuilderTopologySampleOpenLine(
  element
) {
  if (
    typeof element.getTotalLength !== "function" ||
    typeof element.getPointAtLength !== "function"
  ) {
    return [];
  }

  let length = 0;

  try {
    length = Number(element.getTotalLength()) || 0;
  } catch {
    return [];
  }

  if (length <= 1e-6) return [];

  let steps = Math.ceil(
    length /
      Math.max(
        1.25,
        1.75 / Math.max(zoom, 0.1)
      )
  );

  steps = Math.max(2, Math.min(1024, steps));

  const coordinates = [];

  for (let index = 0; index <= steps; index += 1) {
    const point = element.getPointAtLength(
      length * index / steps
    );

    const canvasPoint = shapeBuilderTopologyCanvasPoint(
      element,
      point.x,
      point.y
    );

    const previous = coordinates[coordinates.length - 1];

    if (
      !previous ||
      Math.hypot(
        canvasPoint[0] - previous[0],
        canvasPoint[1] - previous[1]
      ) > 1e-7
    ) {
      coordinates.push(canvasPoint);
    }
  }

  return coordinates;
}

function shapeBuilderTopologyLineCoordinates(
  element
) {
  const tag = element?.tagName?.toLowerCase();

  if (tag === "line") {
    return [
      shapeBuilderTopologyCanvasPoint(
        element,
        Number(element.getAttribute("x1")) || 0,
        Number(element.getAttribute("y1")) || 0
      ),
      shapeBuilderTopologyCanvasPoint(
        element,
        Number(element.getAttribute("x2")) || 0,
        Number(element.getAttribute("y2")) || 0
      )
    ];
  }

  if (tag === "polyline") {
    const values = (element.getAttribute("points") || "")
      .trim()
      .replace(/,/g, " ")
      .split(/\s+/)
      .map(Number)
      .filter(Number.isFinite);

    const coordinates = [];

    for (let index = 0; index + 1 < values.length; index += 2) {
      coordinates.push(
        shapeBuilderTopologyCanvasPoint(
          element,
          values[index],
          values[index + 1]
        )
      );
    }

    return coordinates;
  }

  if (tag === "path") {
    return shapeBuilderTopologySampleOpenLine(element);
  }

  return [];
}

function shapeBuilderTopologyRingForNode(
  element
) {
  const tag =
    element?.tagName
      ?.toLowerCase();

  if (
    tag === "circle" ||
    tag === "ellipse"
  ) {
    return shapeBuilderTopologyEllipseRing(
      element
    );
  }

  if (tag === "rect") {
    return shapeBuilderTopologyRectRing(
      element
    );
  }

  if (tag === "polygon") {
    return shapeBuilderTopologyPolygonRing(
      element
    );
  }

  if (tag === "path") {
    return shapeBuilderTopologySampleRing(
      element
    );
  }

  return [];
}



function shapeBuilderTopologyTransformStoredPoint(
  element,
  coordinate
) {
  const x =
    Number(
      coordinate?.[0]
    ) || 0;

  const y =
    Number(
      coordinate?.[1]
    ) || 0;

  /*
   * Persisted Shape Builder GeoJSON is emitted in canvas coordinates with a
   * neutral object transform. If the user later rotates/moves/scales that
   * result, those stored coordinates must be passed through the object's
   * editor transform before being reused by Shape Builder.
   */
  try {
    const transformed =
      canvasPointFromLocal(
        element,
        x,
        y
      );

    return [
      shapeBuilderTopologyRound(
        transformed.x
      ),
      shapeBuilderTopologyRound(
        transformed.y
      )
    ];
  } catch {
    return [
      shapeBuilderTopologyRound(
        x
      ),
      shapeBuilderTopologyRound(
        y
      )
    ];
  }
}

function shapeBuilderTopologyTransformStoredRing(
  element,
  ring
) {
  if (
    !Array.isArray(
      ring
    )
  ) {
    return [];
  }

  return shapeBuilderTopologyCloseRing(
    ring.map(
      coordinate =>
        shapeBuilderTopologyTransformStoredPoint(
          element,
          coordinate
        )
    )
  );
}

function shapeBuilderTopologyTransformedPersistedGeometry(
  element,
  geometry
) {
  if (!geometry) {
    return null;
  }

  if (
    geometry.type ===
      "Polygon"
  ) {
    return {
      type:
        "Polygon",
      coordinates:
        (
          geometry.coordinates ||
          []
        )
          .map(
            ring =>
              shapeBuilderTopologyTransformStoredRing(
                element,
                ring
              )
          )
          .filter(
            ring =>
              ring.length >= 4
          )
    };
  }

  if (
    geometry.type ===
      "MultiPolygon"
  ) {
    return {
      type:
        "MultiPolygon",
      coordinates:
        (
          geometry.coordinates ||
          []
        )
          .map(
            polygon =>
              polygon
                .map(
                  ring =>
                    shapeBuilderTopologyTransformStoredRing(
                      element,
                      ring
                    )
                )
                .filter(
                  ring =>
                    ring.length >= 4
                )
          )
          .filter(
            polygon =>
              polygon.length > 0
          )
    };
  }

  return geometry;
}

function shapeBuilderTopologyPersistedGeometry(
  element
) {
  if (
    !element ||
    element.dataset
      ?.shapeBuilderGeoJSON !==
      "true" ||
    !element.dataset
      ?.shapeBuilderGeometry
  ) {
    return null;
  }

  try {
    const geometry =
      JSON.parse(
        element.dataset
          .shapeBuilderGeometry
      );

    return shapeBuilderCleanGeoJSON(
      geometry
    );
  } catch {
    return null;
  }
}

function shapeBuilderTopologyRingsFromGeoJSON(
  geometry
) {
  if (!geometry) {
    return [];
  }

  if (
    geometry.type ===
    "Polygon"
  ) {
    return (
      geometry.coordinates ||
      []
    );
  }

  if (
    geometry.type ===
    "MultiPolygon"
  ) {
    return (
      geometry.coordinates ||
      []
    ).flatMap(
      polygon =>
        polygon
    );
  }

  return [];
}

function shapeBuilderTopologyBoundaryRings(
  element
) {
  const persisted =
    shapeBuilderTopologyPersistedGeometry(
      element
    );

  if (persisted) {
    /*
     * Persisted Shape Builder output must respect transforms applied after
     * the previous merge. Rebuild the topology rings in the object's CURRENT
     * canvas position/orientation before polygonization.
     */
    const transformedPersisted =
      shapeBuilderTopologyTransformedPersistedGeometry(
        element,
        persisted
      );

    return shapeBuilderTopologyRingsFromGeoJSON(
      transformedPersisted
    );
  }

  const direct =
    shapeBuilderTopologyRingForNode(
      element
    );

  if (direct.length >= 4) {
    return [direct];
  }

  return [
    ...(
      element.querySelectorAll?.(
        "path,rect,ellipse,circle,polygon"
      ) || []
    )
  ]
    .map(
      shapeBuilderTopologyRingForNode
    )
    .filter(
      ring =>
        ring.length >= 4
    );
}


function shapeBuilderTopologyProjectPointToSegment(
  point,
  start,
  end
) {
  const px =
    Number(point?.[0]) || 0;

  const py =
    Number(point?.[1]) || 0;

  const ax =
    Number(start?.[0]) || 0;

  const ay =
    Number(start?.[1]) || 0;

  const bx =
    Number(end?.[0]) || 0;

  const by =
    Number(end?.[1]) || 0;

  const dx =
    bx - ax;

  const dy =
    by - ay;

  const lengthSquared =
    dx * dx +
    dy * dy;

  if (
    lengthSquared <=
    1e-12
  ) {
    return {
      point: [ax, ay],
      t: 0,
      distance:
        Math.hypot(
          px - ax,
          py - ay
        )
    };
  }

  const rawT =
    (
      (px - ax) * dx +
      (py - ay) * dy
    ) /
    lengthSquared;

  const t =
    Math.max(
      0,
      Math.min(
        1,
        rawT
      )
    );

  const x =
    ax + dx * t;

  const y =
    ay + dy * t;

  return {
    point: [
      shapeBuilderTopologyRound(x),
      shapeBuilderTopologyRound(y)
    ],
    t,
    distance:
      Math.hypot(
        px - x,
        py - y
      )
  };
}

function shapeBuilderTopologySnapTouchingRings(
  rings,
  tolerance = 0.08
) {
  const openRings =
    rings.map(
      ring =>
        ring
          .slice(0, -1)
          .map(
            point => [
              Number(point[0]) || 0,
              Number(point[1]) || 0
            ]
          )
    );

  const snappedVertices =
    openRings.map(
      ring =>
        ring.map(
          () => null
        )
    );

  const segmentSplits =
    openRings.map(
      ring =>
        ring.map(
          () => []
        )
    );

  /*
   * Precompute segment bounding boxes so most vertex/segment pairs can be
   * rejected with four comparisons instead of a projection calculation.
   */
  const segmentBoxes =
    openRings.map(
      ring =>
        ring.map(
          (
            start,
            segmentIndex
          ) => {
            const end =
              ring[
                (
                  segmentIndex + 1
                ) %
                ring.length
              ];

            return {
              start,
              end,
              minX:
                Math.min(
                  start[0],
                  end[0]
                ) -
                tolerance,
              maxX:
                Math.max(
                  start[0],
                  end[0]
                ) +
                tolerance,
              minY:
                Math.min(
                  start[1],
                  end[1]
                ) -
                tolerance,
              maxY:
                Math.max(
                  start[1],
                  end[1]
                ) +
                tolerance
            };
          }
        )
    );

  let touchCount = 0;
  let projectionChecks = 0;

  for (
    let ringIndex = 0;
    ringIndex < openRings.length;
    ringIndex += 1
  ) {
    const ring =
      openRings[ringIndex];

    for (
      let vertexIndex = 0;
      vertexIndex < ring.length;
      vertexIndex += 1
    ) {
      const vertex =
        ring[vertexIndex];

      let best = null;

      for (
        let targetRingIndex = 0;
        targetRingIndex < openRings.length;
        targetRingIndex += 1
      ) {
        if (
          targetRingIndex ===
          ringIndex
        ) {
          continue;
        }

        const boxes =
          segmentBoxes[
            targetRingIndex
          ];

        for (
          let segmentIndex = 0;
          segmentIndex < boxes.length;
          segmentIndex += 1
        ) {
          const box =
            boxes[
              segmentIndex
            ];

          if (
            vertex[0] <
              box.minX ||
            vertex[0] >
              box.maxX ||
            vertex[1] <
              box.minY ||
            vertex[1] >
              box.maxY
          ) {
            continue;
          }

          projectionChecks += 1;

          const projection =
            shapeBuilderTopologyProjectPointToSegment(
              vertex,
              box.start,
              box.end
            );

          if (
            projection.distance >
            tolerance
          ) {
            continue;
          }

          if (
            !best ||
            projection.distance <
              best.distance
          ) {
            best = {
              ...projection,
              targetRingIndex,
              segmentIndex
            };
          }
        }
      }

      if (!best) {
        continue;
      }

      snappedVertices[
        ringIndex
      ][vertexIndex] =
        best.point;

      segmentSplits[
        best.targetRingIndex
      ][best.segmentIndex]
        .push({
          point:
            best.point,
          t:
            best.t
        });

      touchCount += 1;
    }
  }

  shapeBuilderTopologyTouchChecks =
    projectionChecks;

  openRings.forEach(
    (
      ring,
      ringIndex
    ) => {
      ring.forEach(
        (
          point,
          vertexIndex
        ) => {
          const snapped =
            snappedVertices[
              ringIndex
            ][vertexIndex];

          if (snapped) {
            point[0] =
              snapped[0];

            point[1] =
              snapped[1];
          }
        }
      );
    }
  );

  const rebuilt =
    openRings.map(
      (
        ring,
        ringIndex
      ) => {
        const result = [];

        for (
          let segmentIndex = 0;
          segmentIndex < ring.length;
          segmentIndex += 1
        ) {
          const start =
            ring[
              segmentIndex
            ];

          result.push([
            shapeBuilderTopologyRound(
              start[0]
            ),
            shapeBuilderTopologyRound(
              start[1]
            )
          ]);

          const splits =
            segmentSplits[
              ringIndex
            ][segmentIndex]
              .filter(
                split =>
                  split.t >
                    1e-7 &&
                  split.t <
                    1 - 1e-7
              )
              .sort(
                (a, b) =>
                  a.t - b.t
              );

          splits.forEach(
            split => {
              const previous =
                result[
                  result.length - 1
                ];

              if (
                !previous ||
                Math.hypot(
                  split.point[0] -
                    previous[0],
                  split.point[1] -
                    previous[1]
                ) >
                  1e-7
              ) {
                result.push([
                  split.point[0],
                  split.point[1]
                ]);
              }
            }
          );
        }

        return shapeBuilderTopologyCloseRing(
          result
        );
      }
    );

  return {
    rings:
      rebuilt,
    touchCount
  };
}

function shapeBuilderTopologyLineGeoJSON(
  elements
) {
  const fillRings = [];
  const cutterLines = [];

  elements.forEach(element => {
    if (isShapeBuilderCutter(element)) {
      const coordinates =
        shapeBuilderTopologyLineCoordinates(element);

      if (coordinates.length >= 2) {
        cutterLines.push(coordinates);
      }

      return;
    }

    fillRings.push(
      ...shapeBuilderTopologyBoundaryRings(element)
    );
  });

  shapeBuilderTopologyBoundaryCount =
    fillRings.length + cutterLines.length;

  /*
   * Keep the existing tangent/touch cleanup for closed fill boundaries.
   * Open cutter paths stay open; JSTS unary-union nodes their intersections
   * with the closed boundaries before polygonization.
   */
  const snapped =
    shapeBuilderTopologySnapTouchingRings(
      fillRings,
      0.08
    );

  shapeBuilderTopologyTouchSnapCount =
    snapped.touchCount;

  const coordinates = [
    ...snapped.rings,
    ...cutterLines
  ];

  console.info(
    "JSTS Shape Builder touch noding",
    {
      boundaries: fillRings.length,
      cutters: cutterLines.length,
      snappedTouches: snapped.touchCount
    }
  );

  return {
    type: "MultiLineString",
    coordinates
  };
}

function shapeBuilderTopologyGeoJSONPolygons(
  geometry
) {
  if (!geometry) {
    return [];
  }

  if (
    geometry.type === "Polygon"
  ) {
    return [geometry];
  }

  if (
    geometry.type === "MultiPolygon"
  ) {
    return geometry.coordinates.map(
      coordinates => ({
        type:
          "Polygon",
        coordinates
      })
    );
  }

  if (
    geometry.type ===
      "GeometryCollection"
  ) {
    return geometry.geometries.flatMap(
      shapeBuilderTopologyGeoJSONPolygons
    );
  }

  return [];
}

function shapeBuilderTopologyPaperItem(
  polygon
) {
  if (
    !polygon ||
    polygon.type !== "Polygon" ||
    !polygon.coordinates?.length
  ) {
    return null;
  }

  const makePath =
    ring => {
      const path =
        new paper.Path({
          insert: false
        });

      ring
        .slice(0, -1)
        .forEach(
          coordinate => {
            path.add(
              new paper.Point(
                coordinate[0],
                coordinate[1]
              )
            );
          }
        );

      path.closed = true;
      return path;
    };

  if (
    polygon.coordinates.length === 1
  ) {
    return normalizePaperBooleanGeometry(
      makePath(
        polygon.coordinates[0]
      )
    );
  }

  const compound =
    new paper.CompoundPath({
      insert: false
    });

  polygon.coordinates.forEach(
    (ring, index) => {
      const path =
        makePath(ring);

      if (
        index > 0 &&
        compound.firstChild &&
        Math.sign(
          Number(path.area) || 0
        ) ===
          Math.sign(
            Number(
              compound.firstChild.area
            ) || 0
          )
      ) {
        path.reverse();
      }

      compound.addChild(path);
    }
  );

  return normalizePaperBooleanGeometry(
    compound
  );
}


function shapeBuilderTopologyPolygonGeoJSONFromRing(
  ring
) {
  if (
    !Array.isArray(ring) ||
    ring.length < 4
  ) {
    return null;
  }

  return {
    type:
      "Polygon",
    coordinates: [
      ring
    ]
  };
}

function shapeBuilderTopologySourceGeometry(
  element
) {
  if (
    typeof window.jsts ===
      "undefined"
  ) {
    return null;
  }

  /* Open lines participate in the planar graph only; they never represent
   * a filled source region for face classification. */
  if (isShapeBuilderCutter(element)) {
    return null;
  }

  const rings =
    shapeBuilderTopologyBoundaryRings(
      element
    );

  if (!rings.length) {
    return null;
  }

  const reader =
    new window.jsts.io
      .GeoJSONReader();

  /*
   * Simple editor shapes are one filled ring. This covers rects, ellipses,
   * polygons and ordinary closed paths directly.
   */
  if (rings.length === 1) {
    try {
      return reader.read(
        shapeBuilderTopologyPolygonGeoJSONFromRing(
          rings[0]
        )
      );
    } catch {
      return null;
    }
  }

  /*
   * For compound/multi-contour source objects, polygonize that source's own
   * linework first, then union its filled faces. This keeps classification in
   * exactly the same JSTS coordinate system as the global arrangement.
   */
  try {
    const polygonizer =
      new window.jsts.operation
        .polygonize
        .Polygonizer();

    const linework =
      reader.read({
        type:
          "MultiLineString",
        coordinates:
          rings
      });

    const noded =
      window.jsts.operation
        .union
        .UnaryUnionOp
        .union(
          linework
        );

    polygonizer.add(
      noded
    );

    const polygons =
      polygonizer.getPolygons();

    const geometries = [];

    for (
      let index = 0;
      index < polygons.size();
      index += 1
    ) {
      geometries.push(
        polygons.get(index)
      );
    }

    if (!geometries.length) {
      return null;
    }

    if (geometries.length === 1) {
      return geometries[0];
    }

    const factory =
      new window.jsts.geom
        .GeometryFactory();

    return window.jsts.operation
      .union
      .UnaryUnionOp
      .union(
        factory.createGeometryCollection(
          geometries
        )
      );
  } catch {
    return null;
  }
}

function shapeBuilderTopologySourceGeometries(
  elements
) {
  return elements.map(
    shapeBuilderTopologySourceGeometry
  );
}

function shapeBuilderTopologySourcesForPolygon(
  polygon,
  sourceGeometries
) {
  if (
    typeof window.jsts ===
      "undefined"
  ) {
    return new Set();
  }

  const reader =
    new window.jsts.io
      .GeoJSONReader();

  let faceGeometry =
    null;

  let interiorPoint =
    null;

  try {
    faceGeometry =
      reader.read(
        polygon
      );

    interiorPoint =
      faceGeometry
        .getInteriorPoint();
  } catch {
    return new Set();
  }

  if (!interiorPoint) {
    return new Set();
  }

  const sources =
    new Set();

  sourceGeometries.forEach(
    (
      sourceGeometry,
      index
    ) => {
      if (!sourceGeometry) {
        return;
      }

      try {
        /*
         * covers() includes boundary points; contains() is strict interior.
         * The polygonizer's interior point should normally be interior, but
         * covers gives us numerical tolerance at exact tangent arrangements.
         */
        const inside =
          typeof sourceGeometry
            .covers ===
            "function"
            ? sourceGeometry
                .covers(
                  interiorPoint
                )
            : sourceGeometry
                .contains(
                  interiorPoint
                );

        if (inside) {
          sources.add(index);
        }
      } catch {}
    }
  );

  return sources;
}

function buildShapeBuilderRegionsJsts(
  elements
) {
  if (
    typeof window.jsts ===
      "undefined"
  ) {
    shapeBuilderTopologyReady =
      false;

    shapeBuilderTopologyError =
      new Error(
        "JSTS browser bundle did not load"
      );

    updateShapeBuilderTopologyStatus();
    return false;
  }

  if (!ensurePaperReady()) {
    return false;
  }

  if (
    restoreShapeBuilderTopologyCache(
      elements
    )
  ) {
    shapeBuilderTopologyBuildMs =
      0;

    return true;
  }

  const buildStartedAt =
    performance.now();

  const reader =
    new window.jsts.io
      .GeoJSONReader();

  const writer =
    new window.jsts.io
      .GeoJSONWriter();

  const polygonizer =
    new window.jsts.operation
      .polygonize
      .Polygonizer();

  const lineGeoJSON =
    shapeBuilderTopologyLineGeoJSON(
      elements
    );

  if (
    !lineGeoJSON.coordinates
      .length
  ) {
    return false;
  }

  try {
    const linework =
      reader.read(
        lineGeoJSON
      );

    /*
     * Unary union on linework performs the planar noding / duplicate-edge
     * dissolve step before polygonization. This is the same arrangement
     * pattern used in JTS-family topology workflows.
     */
    const noded =
      window.jsts.operation
        .union
        .UnaryUnionOp
        .union(
          linework
        );

    polygonizer.add(
      noded
    );

    const polygonList =
      polygonizer.getPolygons();

    const polygons = [];

    for (
      let index = 0;
      index <
        polygonList.size();
      index += 1
    ) {
      const geometry =
        polygonList.get(
          index
        );

      const geojson =
        writer.write(
          geometry
        );

      polygons.push(
        geojson
      );
    }

    shapeBuilderTopologyPolygonizedFaceCount =
      polygons.length;

    shapeBuilderTopologyFaceCount =
      polygons.length;

    console.info(
      "JSTS Shape Builder polygonized",
      {
        boundaries:
          shapeBuilderTopologyBoundaryCount,
        faces:
          shapeBuilderTopologyFaceCount
      }
    );

    const sourceGeometries =
      shapeBuilderTopologySourceGeometries(
        elements
      );

    const validSourceCount =
      sourceGeometries.filter(Boolean).length;

    const expectedFillSourceCount =
      elements.filter(isShapeBuilderFillSource).length;

    const cutterCount =
      elements.filter(isShapeBuilderCutter).length;

    console.info(
      "JSTS Shape Builder source geometries",
      {
        requested: elements.length,
        filledSources: expectedFillSourceCount,
        cutters: cutterCount,
        valid: validSourceCount
      }
    );

    if (
      validSourceCount !==
      expectedFillSourceCount
    ) {
      throw new Error(
        `JSTS could only build ${validSourceCount} of ${expectedFillSourceCount} filled source geometries`
      );
    }

    paper.project.clear();

    const regions = [];

    polygons.forEach(
      polygon => {
        const sources =
          shapeBuilderTopologySourcesForPolygon(
            polygon,
            sourceGeometries
          );

        if (!sources.size) {
          return;
        }

        /*
         * Keep the interactive face as GeoJSON only. Paper conversion is one
         * of the more expensive parts of a build and is unnecessary for
         * hover/hit testing now that those paths use GeoJSON directly.
         */
        regions.push({
          item:
            null,
          geojson:
            polygon,
          sources,
          engine:
            "jsts"
        });
      }
    );

    console.info(
      "JSTS Shape Builder classified faces",
      {
        polygonized:
          polygons.length,
        classified:
          regions.length,
        sourceMemberships:
          regions.map(
            region =>
              [
                ...region.sources
              ]
          )
      }
    );

    if (!regions.length) {
      throw new Error(
        `JSTS polygonized ${polygons.length} faces but classified none against ${sourceGeometries.length} source geometries`
      );
    }

    shapeBuilderSources =
      [...elements];

    shapeBuilderRegions =
      regions.map(
        (region, index) => ({
          ...region,
          id:
            `builder-region-${index}`
        })
      );

    shapeBuilderTopologyFaceCount =
      shapeBuilderRegions.length;

    shapeBuilderTopologyReady =
      true;

    shapeBuilderTopologyError =
      null;

    cacheShapeBuilderTopologyRegions(
      elements,
      shapeBuilderRegions
    );

    shapeBuilderTopologyBuildMs =
      Math.round(
        (
          performance.now() -
          buildStartedAt
        ) *
        10
      ) /
      10;

    console.info(
      "JSTS Shape Builder performance",
      {
        buildMs:
          shapeBuilderTopologyBuildMs,
        projectionChecks:
          shapeBuilderTopologyTouchChecks,
        regions:
          shapeBuilderRegions.length
      }
    );

    updateShapeBuilderTopologyStatus();

    return true;
  } catch (error) {
    console.error(
      "JSTS Shape Builder failed",
      error
    );

    shapeBuilderTopologyReady =
      false;

    shapeBuilderTopologyError =
      error;

    toolStatus.textContent =
      `Shape Builder Tool • JSTS error: ${error.message || error}`;

    return false;
  }
}

function buildShapeBuilderRegions(
  elements
) {
  return buildShapeBuilderRegionsJsts(
    elements
  );
}


function shapeBuilderGeoJSONPolygonArea(
  coordinates
) {
  if (
    !Array.isArray(coordinates) ||
    coordinates.length < 4
  ) {
    return 0;
  }

  let area = 0;

  for (
    let index = 0;
    index < coordinates.length - 1;
    index += 1
  ) {
    const first =
      coordinates[index];

    const second =
      coordinates[index + 1];

    area +=
      (
        Number(first[0]) || 0
      ) *
      (
        Number(second[1]) || 0
      ) -
      (
        Number(second[0]) || 0
      ) *
      (
        Number(first[1]) || 0
      );
  }

  return area / 2;
}


function shapeBuilderNormalizeRingCoordinates(
  ring,
  epsilon = 0.02
) {
  if (
    !Array.isArray(ring) ||
    ring.length < 4
  ) {
    return ring || [];
  }

  const clean = [];

  ring.forEach(
    coordinate => {
      const point = [
        shapeBuilderTopologyRound(
          coordinate[0]
        ),
        shapeBuilderTopologyRound(
          coordinate[1]
        )
      ];

      const previous =
        clean[
          clean.length - 1
        ];

      if (
        !previous ||
        Math.hypot(
          point[0] -
            previous[0],
          point[1] -
            previous[1]
        ) >
          epsilon
      ) {
        clean.push(point);
      } else {
        /*
         * Collapse nearly-identical vertices onto one exact coordinate.
         */
        previous[0] =
          shapeBuilderTopologyRound(
            (
              previous[0] +
              point[0]
            ) /
            2
          );

        previous[1] =
          shapeBuilderTopologyRound(
            (
              previous[1] +
              point[1]
            ) /
            2
          );
      }
    }
  );

  if (clean.length < 3) {
    return [];
  }

  /*
   * Remove near-collinear middle vertices. These are a common source of
   * tiny stroke spikes after overlay/noding at intersections.
   */
  let changed = true;

  while (
    changed &&
    clean.length > 3
  ) {
    changed = false;

    for (
      let index = 0;
      index < clean.length;
      index += 1
    ) {
      const previous =
        clean[
          (
            index -
            1 +
            clean.length
          ) %
          clean.length
        ];

      const current =
        clean[index];

      const next =
        clean[
          (
            index + 1
          ) %
          clean.length
        ];

      const ax =
        current[0] -
        previous[0];

      const ay =
        current[1] -
        previous[1];

      const bx =
        next[0] -
        current[0];

      const by =
        next[1] -
        current[1];

      const cross =
        Math.abs(
          ax * by -
          ay * bx
        );

      const scale =
        Math.max(
          1,
          Math.hypot(
            ax,
            ay
          ) +
          Math.hypot(
            bx,
            by
          )
        );

      if (
        cross /
        scale <=
        1e-4
      ) {
        clean.splice(
          index,
          1
        );

        changed = true;
        break;
      }
    }
  }

  if (clean.length < 3) {
    return [];
  }

  const first =
    clean[0];

  const last =
    clean[
      clean.length - 1
    ];

  if (
    Math.hypot(
      first[0] -
        last[0],
      first[1] -
        last[1]
    ) >
      epsilon
  ) {
    clean.push([
      first[0],
      first[1]
    ]);
  } else {
    clean[
      clean.length - 1
    ] = [
      first[0],
      first[1]
    ];
  }

  return clean;
}

function shapeBuilderNormalizeGeoJSON(
  geometry
) {
  if (!geometry) {
    return null;
  }

  if (
    geometry.type ===
    "Polygon"
  ) {
    const coordinates =
      (
        geometry.coordinates ||
        []
      )
        .map(
          shapeBuilderNormalizeRingCoordinates
        )
        .filter(
          ring =>
            ring.length >= 4
        );

    if (!coordinates.length) {
      return null;
    }

    return {
      type:
        "Polygon",
      coordinates
    };
  }

  if (
    geometry.type ===
    "MultiPolygon"
  ) {
    const polygons =
      (
        geometry.coordinates ||
        []
      )
        .map(
          coordinates =>
            shapeBuilderNormalizeGeoJSON({
              type:
                "Polygon",
              coordinates
            })
        )
        .filter(Boolean);

    if (!polygons.length) {
      return null;
    }

    if (
      polygons.length === 1
    ) {
      return polygons[0];
    }

    return {
      type:
        "MultiPolygon",
      coordinates:
        polygons.map(
          polygon =>
            polygon.coordinates
        )
    };
  }

  return geometry;
}

function shapeBuilderCleanGeoJSON(
  geometry,
  minimumArea = 0.01
) {
  geometry =
    shapeBuilderNormalizeGeoJSON(
      geometry
    );

  if (!geometry) {
    return null;
  }

  if (
    geometry.type ===
    "Polygon"
  ) {
    const rings =
      geometry.coordinates ||
      [];

    if (!rings.length) {
      return null;
    }

    const exteriorArea =
      Math.abs(
        shapeBuilderGeoJSONPolygonArea(
          rings[0]
        )
      );

    if (
      exteriorArea <
      minimumArea
    ) {
      return null;
    }

    return {
      type:
        "Polygon",
      coordinates: [
        rings[0],
        ...rings
          .slice(1)
          .filter(
            ring =>
              Math.abs(
                shapeBuilderGeoJSONPolygonArea(
                  ring
                )
              ) >=
              minimumArea
          )
      ]
    };
  }

  if (
    geometry.type ===
    "MultiPolygon"
  ) {
    const polygons =
      (geometry.coordinates || [])
        .map(
          coordinates =>
            shapeBuilderCleanGeoJSON(
              {
                type:
                  "Polygon",
                coordinates
              },
              minimumArea
            )
        )
        .filter(Boolean);

    if (!polygons.length) {
      return null;
    }

    if (
      polygons.length === 1
    ) {
      return polygons[0];
    }

    return {
      type:
        "MultiPolygon",
      coordinates:
        polygons.map(
          polygon =>
            polygon.coordinates
        )
    };
  }

  return geometry;
}

function shapeBuilderSvgElementFromGeoJSON(
  geometry,
  sourceElement,
  namePrefix =
    "Compound Shape"
) {
  const cleaned =
    shapeBuilderCleanGeoJSON(
      geometry
    );

  if (!cleaned) {
    return null;
  }

  const d =
    shapeBuilderTopologyPathData(
      cleaned
    );

  if (!d) {
    return null;
  }

  /*
   * Important: emit one SVG path containing all exterior/hole subpaths.
   * The stroke is therefore applied exactly once to the final topology,
   * instead of inheriting through a Paper-exported compound hierarchy.
   */
  const element =
    document.createElementNS(
      SVG_NS,
      "path"
    );

  objectCounter += 1;

  element.dataset.object =
    "true";

  element.dataset.name =
    `${namePrefix} ${objectCounter}`;

  element.dataset.tx = 0;
  element.dataset.ty = 0;
  element.dataset.rotation = 0;
  element.dataset.scaleX = 1;
  element.dataset.scaleY = 1;
  element.dataset.hidden =
    "false";
  element.dataset.locked =
    "false";
  element.dataset.closed =
    "true";
  element.dataset.shape =
    "true";
  element.dataset.compoundShape =
    "true";
  element.dataset.shapeBuilderGeoJSON =
    "true";

  element.dataset.shapeBuilderGeometry =
    JSON.stringify(
      cleaned
    );

  element.setAttribute(
    "d",
    d
  );

  element.setAttribute(
    "fill-rule",
    "evenodd"
  );

  element.setAttribute(
    "clip-rule",
    "evenodd"
  );

  /*
   * Remove any inherited presentation from the generated geometry, then
   * apply one appearance to this single path.
   */
  applyShapeBuilderResultAppearance(
    element,
    sourceElement
  );

  return element;
}

function mergeJstsShapeBuilderGeoJSON(
  regions
) {
  if (
    !regions.length ||
    typeof window.jsts ===
      "undefined" ||
    regions.some(
      region =>
        region.engine !==
          "jsts" ||
        !region.geojson
    )
  ) {
    return null;
  }

  const reader =
    new window.jsts.io
      .GeoJSONReader();

  const writer =
    new window.jsts.io
      .GeoJSONWriter();

  try {
    const collection =
      reader.read({
        type:
          "GeometryCollection",
        geometries:
          regions.map(
            region =>
              region.geojson
          )
      });

    const united =
      window.jsts.operation
        .union
        .UnaryUnionOp
        .union(
          collection
        );

    if (!united) {
      return null;
    }

    return shapeBuilderCleanGeoJSON(
      writer.write(
        united
      )
    );
  } catch (error) {
    console.error(
      "JSTS Shape Builder GeoJSON merge failed",
      error
    );

    return null;
  }
}

function mergeJstsShapeBuilderRegions(
  regions
) {
  if (
    !regions.length ||
    typeof window.jsts ===
      "undefined" ||
    regions.some(
      region =>
        region.engine !==
          "jsts" ||
        !region.geojson
    )
  ) {
    return null;
  }

  const reader =
    new window.jsts.io
      .GeoJSONReader();

  const writer =
    new window.jsts.io
      .GeoJSONWriter();

  try {
    const collection =
      reader.read({
        type:
          "GeometryCollection",
        geometries:
          regions.map(
            region =>
              region.geojson
          )
      });

    const united =
      window.jsts.operation
        .union
        .UnaryUnionOp
        .union(
          collection
        );

    if (!united) {
      throw new Error(
        "JSTS merge union returned no geometry"
      );
    }

    const geojson =
      writer.write(
        united
      );

    const polygons =
      shapeBuilderTopologyGeoJSONPolygons(
        geojson
      );

    console.info(
      "JSTS Shape Builder merge",
      {
        selected:
          regions.length,
        outputPolygons:
          polygons.length
      }
    );

    if (!polygons.length) {
      return null;
    }

    if (
      polygons.length === 1
    ) {
      return shapeBuilderTopologyPaperItem(
        polygons[0]
      );
    }

    const compound =
      new paper.CompoundPath({
        insert: false
      });

    polygons.forEach(
      polygon => {
        const part =
          shapeBuilderTopologyPaperItem(
            polygon
          );

        if (!part) {
          return;
        }

        if (
          part instanceof paper.Path
        ) {
          compound.addChild(
            part
          );

          return;
        }

        if (
          part.children?.length
        ) {
          [
            ...part.children
          ].forEach(
            child =>
              compound.addChild(
                child.clone({
                  insert: false
                })
              )
          );
        }

        removePaperItem(
          part
        );
      }
    );

    return normalizePaperBooleanGeometry(
      compound
    );
  } catch (error) {
    console.error(
      "JSTS Shape Builder merge failed",
      error
    );

    shapeBuilderTopologyError =
      error;

    if (
      activeTool ===
      "shapeBuilder"
    ) {
      toolStatus.textContent =
        `Shape Builder Tool • JSTS merge error: ${error.message || error}`;
    }

    return null;
  }
}

function shapeBuilderTopologyPointOnSegment(
  point,
  first,
  second,
  epsilon = 1e-4
) {
  const projection =
    shapeBuilderTopologyProjectPointToSegment(
      [point.x, point.y],
      first,
      second
    );

  return (
    projection.distance <=
    epsilon
  );
}

function shapeBuilderTopologyPointInRing(
  point,
  ring
) {
  if (
    !Array.isArray(ring) ||
    ring.length < 4
  ) {
    return false;
  }

  let inside = false;

  for (
    let index = 0,
      previousIndex =
        ring.length - 1;
    index < ring.length;
    previousIndex = index++
  ) {
    const current =
      ring[index];

    const previous =
      ring[previousIndex];

    if (
      shapeBuilderTopologyPointOnSegment(
        point,
        previous,
        current
      )
    ) {
      return true;
    }

    const xi =
      Number(current[0]) || 0;

    const yi =
      Number(current[1]) || 0;

    const xj =
      Number(previous[0]) || 0;

    const yj =
      Number(previous[1]) || 0;

    const intersects =
      (
        (yi > point.y) !==
        (yj > point.y)
      ) &&
      (
        point.x <
        (
          (xj - xi) *
          (point.y - yi)
        ) /
        (
          (yj - yi) ||
          1e-12
        ) +
        xi
      );

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function shapeBuilderTopologyPointInPolygon(
  point,
  geometry
) {
  if (!geometry) {
    return false;
  }

  if (
    geometry.type ===
    "Polygon"
  ) {
    const rings =
      geometry.coordinates ||
      [];

    if (
      !rings.length ||
      !shapeBuilderTopologyPointInRing(
        point,
        rings[0]
      )
    ) {
      return false;
    }

    for (
      let index = 1;
      index < rings.length;
      index += 1
    ) {
      if (
        shapeBuilderTopologyPointInRing(
          point,
          rings[index]
        )
      ) {
        return false;
      }
    }

    return true;
  }

  if (
    geometry.type ===
    "MultiPolygon"
  ) {
    return (
      geometry.coordinates ||
      []
    ).some(
      coordinates =>
        shapeBuilderTopologyPointInPolygon(
          point,
          {
            type:
              "Polygon",
            coordinates
          }
        )
    );
  }

  return false;
}

function shapeBuilderTopologyPathData(
  geometry
) {
  if (!geometry) {
    return "";
  }

  const polygonData =
    coordinates =>
      coordinates
        .map(
          ring => {
            if (
              !ring?.length
            ) {
              return "";
            }

            return (
              ring
                .map(
                  (
                    coordinate,
                    index
                  ) =>
                    `${index === 0
                      ? "M"
                      : "L"} ${shapeBuilderTopologyRound(
                        coordinate[0]
                      )} ${shapeBuilderTopologyRound(
                        coordinate[1]
                      )}`
                )
                .join(" ") +
              " Z"
            );
          }
        )
        .filter(Boolean)
        .join(" ");

  if (
    geometry.type ===
    "Polygon"
  ) {
    return polygonData(
      geometry.coordinates ||
      []
    );
  }

  if (
    geometry.type ===
    "MultiPolygon"
  ) {
    return (
      geometry.coordinates ||
      []
    )
      .map(
        polygonData
      )
      .filter(Boolean)
      .join(" ");
  }

  return "";
}

function shapeBuilderTopologyHighlightElement(
  region
) {
  const d =
    shapeBuilderTopologyPathData(
      region?.geojson
    );

  if (!d) {
    return null;
  }

  const path =
    document.createElementNS(
      SVG_NS,
      "path"
    );

  path.setAttribute(
    "d",
    d
  );

  path.setAttribute(
    "fill-rule",
    "evenodd"
  );

  path.setAttribute(
    "clip-rule",
    "evenodd"
  );

  path.dataset
    .shapeBuilderHighlight =
    "true";

  path.setAttribute(
    "pointer-events",
    "none"
  );

  return path;
}

function builderStrokeHitsRegion(
  region,
  points
) {
  const samples =
    densifyBuilderStroke(
      points,
      3
    );

  if (
    region?.engine ===
      "jsts" &&
    region.geojson
  ) {
    return samples.some(
      point =>
        shapeBuilderTopologyPointInPolygon(
          point,
          region.geojson
        )
    );
  }

  return samples.some(
    point => {
      try {
        return region.item.contains(
          new paper.Point(
            point.x,
            point.y
          )
        );
      } catch {
        return false;
      }
    }
  );
}

function clearShapeBuilderHighlights() {
  selectionOverlay
    .querySelectorAll("[data-shape-builder-highlight='true']")
    .forEach(node => node.remove());
}

function styleShapeBuilderHighlight(node, subtract = false) {
  if (!node || node.nodeType !== 1) return;

  const drawableTags = new Set([
    "path", "rect", "ellipse", "circle",
    "polygon", "polyline"
  ]);

  if (drawableTags.has(node.tagName.toLowerCase())) {
    node.setAttribute(
      "fill",
      subtract ? "#ef4444" : "#facc15"
    );
    node.setAttribute("fill-opacity", subtract ? "0.38" : "0.34");
    node.setAttribute(
      "stroke",
      subtract ? "#f87171" : "#fde047"
    );
    node.setAttribute("stroke-width", "4");
    node.setAttribute("stroke-opacity", "1");
    node.setAttribute("vector-effect", "non-scaling-stroke");
    node.setAttribute("pointer-events", "none");
  }

  [...node.children].forEach(child =>
    styleShapeBuilderHighlight(child, subtract)
  );
}

function paperRegionHighlightElement(
  region
) {
  if (
    region?.engine ===
      "jsts" &&
    region.geojson
  ) {
    const imported =
      shapeBuilderTopologyHighlightElement(
        region
      );

    if (!imported) {
      return null;
    }

    styleShapeBuilderHighlight(
      imported,
      shapeBuilderDrawing
        ? shapeBuilderSubtracting
        : shapeBuilderAltHeld
    );

    return imported;
  }

  const exported =
    region.item.exportSVG({
      asString: true,
      precision: 5
    });

  const doc =
    new DOMParser()
      .parseFromString(
        exported,
        "image/svg+xml"
      );

  let node =
    doc.documentElement;

  if (
    node.tagName
      .toLowerCase() ===
      "svg"
  ) {
    node =
      node.firstElementChild;
  }

  if (!node) {
    return null;
  }

  const imported =
    document.importNode(
      node,
      true
    );

  imported.removeAttribute(
    "id"
  );

  imported.removeAttribute(
    "style"
  );

  imported.dataset
    .shapeBuilderHighlight =
    "true";

  imported.setAttribute(
    "pointer-events",
    "none"
  );

  styleShapeBuilderHighlight(
    imported,
    shapeBuilderDrawing
      ? shapeBuilderSubtracting
      : shapeBuilderAltHeld
  );

  return imported;
}

function updateShapeBuilderHits() {
  shapeBuilderHits = shapeBuilderRegions.filter(region =>
    builderStrokeHitsRegion(region, shapeBuilderPoints)
  );
}

function findShapeBuilderRegionAtPoint(
  point
) {
  if (!shapeBuilderRegions.length) {
    return null;
  }

  for (
    let index =
      shapeBuilderRegions.length - 1;
    index >= 0;
    index -= 1
  ) {
    const region =
      shapeBuilderRegions[index];

    if (
      region?.engine ===
        "jsts" &&
      region.geojson
    ) {
      if (
        shapeBuilderTopologyPointInPolygon(
          point,
          region.geojson
        )
      ) {
        return region;
      }

      continue;
    }

    try {
      if (
        region.item.contains(
          new paper.Point(
            point.x,
            point.y
          )
        )
      ) {
        return region;
      }
    } catch {}
  }

  return null;
}

function clearShapeBuilderHover() {
  selectionOverlay
    .querySelectorAll("[data-shape-builder-hover='true']")
    .forEach(node => node.remove());
}

function drawShapeBuilderHover() {
  clearShapeBuilderHover();

  if (!shapeBuilderHoverRegion || shapeBuilderDrawing) return;

  const highlight = paperRegionHighlightElement(
    shapeBuilderHoverRegion
  );

  if (!highlight) return;

  highlight.dataset.shapeBuilderHover = "true";
  highlight.dataset.shapeBuilderHighlight = "false";

  styleShapeBuilderHighlight(
    highlight,
    shapeBuilderAltHeld
  );

  highlight.setAttribute(
    "fill-opacity",
    shapeBuilderAltHeld ? "0.24" : "0.20"
  );
  highlight.setAttribute("stroke-width", "2.5");

  selectionOverlay.appendChild(highlight);
}

function updateShapeBuilderHover(position) {
  if (activeTool !== "shapeBuilder" || shapeBuilderDrawing) {
    shapeBuilderHoverRegion = null;
    clearShapeBuilderHover();
    return;
  }

  const eligible = selectedItems.filter(isShapeBuilderEligible);

  if (
    eligible.length < 2 ||
    !eligible.some(isShapeBuilderFillSource)
  ) {
    shapeBuilderHoverRegion = null;
    clearShapeBuilderHover();
    return;
  }

  const regionsNeedRefresh =
    !shapeBuilderRegions.length ||
    shapeBuilderSources.length !== eligible.length ||
    shapeBuilderSources.some(
      (item, index) => item !== eligible[index]
    );

  if (regionsNeedRefresh) {
    resetShapeBuilderRegions();

    if (!buildShapeBuilderRegions(eligible)) {
      shapeBuilderHoverRegion = null;
      return;
    }
  }

  shapeBuilderHoverRegion =
    findShapeBuilderRegionAtPoint(position);

  drawShapeBuilderHover();
}

function drawShapeBuilderHighlights() {
  clearShapeBuilderHighlights();

  shapeBuilderHits.forEach(region => {
    const highlight = paperRegionHighlightElement(region);
    if (highlight) {
      selectionOverlay.appendChild(highlight);
    }
  });
}

function drawShapeBuilderStroke() {
  const oldStroke = selectionOverlay.querySelector("#shapeBuilderStroke");
  const oldHalo = selectionOverlay.querySelector("#shapeBuilderStrokeHalo");

  if (oldStroke) oldStroke.remove();
  if (oldHalo) oldHalo.remove();

  drawShapeBuilderHighlights();

  if (shapeBuilderPoints.length < 2) return;

  const d = shapeBuilderPoints
    .map((point, index) =>
      `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
    )
    .join(" ");

  const halo = svgEl("path", {
    id: "shapeBuilderStrokeHalo",
    d,
    fill: "none",
    stroke: "#111827",
    "stroke-width": 10,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "stroke-opacity": "0.8",
    "vector-effect": "non-scaling-stroke",
    "pointer-events": "none"
  });

  const preview = svgEl("path", {
    id: "shapeBuilderStroke",
    d,
    fill: "none",
    stroke: shapeBuilderSubtracting ? "#f87171" : "#ffffff",
    "stroke-width": 5,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "vector-effect": "non-scaling-stroke",
    "pointer-events": "none"
  });

  selectionOverlay.appendChild(halo);
  selectionOverlay.appendChild(preview);
}

function ensurePaperReady() {
  if (paperReady) return true;

  if (typeof paper === "undefined") {
    alert("Shape Builder requires Paper.js, but the library could not be loaded.");
    return false;
  }

  paper.setup(new paper.Size(canvasWidth, canvasHeight));
  paperReady = true;
  return true;
}

function svgShapeToPaper(element) {
  const t = getTranslation(element);
  let item = null;

  if (
    (element.tagName === "rect" || element.tagName === "ellipse") &&
    Math.abs(getRotation(element)) > 0.0001
  ) {
    const clone = element.cloneNode(true);
    clone.removeAttribute("data-object");
    clone.removeAttribute("data-name");
    clone.setAttribute("transform", element.getAttribute("transform") || "");
    item = paper.project.importSVG(
      new XMLSerializer().serializeToString(clone),
      { insert: false, expandShapes: true }
    );
  } else if (element.tagName === "rect") {
    item = new paper.Path.Rectangle(
      new paper.Rectangle(
        Number(element.getAttribute("x")) + t.x,
        Number(element.getAttribute("y")) + t.y,
        Number(element.getAttribute("width")),
        Number(element.getAttribute("height"))
      )
    );
  } else if (element.tagName === "ellipse") {
    const cx = Number(element.getAttribute("cx")) + t.x;
    const cy = Number(element.getAttribute("cy")) + t.y;
    const rx = Number(element.getAttribute("rx"));
    const ry = Number(element.getAttribute("ry"));

    item = new paper.Path.Ellipse({
      rectangle: new paper.Rectangle(
        cx - rx,
        cy - ry,
        rx * 2,
        ry * 2
      )
    });
  }

  if (element.tagName === "polygon") {
    const clone = element.cloneNode(true);
    clone.removeAttribute("data-object");
    clone.removeAttribute("data-name");
    clone.setAttribute("transform", element.getAttribute("transform") || "");

    item = paper.project.importSVG(
      new XMLSerializer().serializeToString(clone),
      { insert: false, expandShapes: true }
    );
  }

  if (element.tagName === "path" && element.dataset.closed === "true") {
    const anchors = element._anchors;

    if (Math.abs(getRotation(element)) > 0.0001) {
      const clone = element.cloneNode(true);
      clone.removeAttribute("data-object");
      clone.removeAttribute("data-name");
      clone.setAttribute("transform", element.getAttribute("transform") || "");

      item = paper.project.importSVG(
        new XMLSerializer().serializeToString(clone),
        { insert: false, expandShapes: true }
      );
    } else if (anchors && anchors.length) {
      item = new paper.Path();

      anchors.forEach(anchor => {
        item.add(
          new paper.Segment(
            new paper.Point(anchor.x + t.x, anchor.y + t.y),
            new paper.Point(
              anchor.inX - anchor.x,
              anchor.inY - anchor.y
            ),
            new paper.Point(
              anchor.outX - anchor.x,
              anchor.outY - anchor.y
            )
          )
        );
      });

      item.closed = true;
    } else {
      const clone = element.cloneNode(true);
      clone.removeAttribute("data-object");
      clone.removeAttribute("data-name");
      clone.removeAttribute("data-tx");
      clone.removeAttribute("data-ty");
      clone.setAttribute("transform", `translate(${t.x} ${t.y})`);

      item = paper.project.importSVG(
        new XMLSerializer().serializeToString(clone),
        { insert: false, expandShapes: true }
      );
    }
  }

  if (element.dataset.compoundShape === "true") {
    const clone = element.cloneNode(true);
    clone.removeAttribute("data-object");
    clone.removeAttribute("data-name");
    clone.removeAttribute("data-tx");
    clone.removeAttribute("data-ty");
    clone.setAttribute("transform", `translate(${t.x} ${t.y})`);

    item = paper.project.importSVG(
      new XMLSerializer().serializeToString(clone),
      { insert: false, expandShapes: true }
    );
  }

  return item;
}

function paperPathToAnchors(item) {
  if (!item || !item.segments) return [];

  return item.segments.map(segment => {
    const point = segment.point;
    const handleIn = segment.handleIn;
    const handleOut = segment.handleOut;

    return {
      x: point.x,
      y: point.y,
      inX: point.x + handleIn.x,
      inY: point.y + handleIn.y,
      outX: point.x + handleOut.x,
      outY: point.y + handleOut.y
    };
  });
}

function applyShapeBuilderResultAppearance(element, sourceElement) {
  if (!element || !sourceElement) return;

  const attributes = [
    "fill",
    "stroke",
    "stroke-width",
    "fill-opacity",
    "stroke-opacity",
    "stroke-linecap",
    "stroke-linejoin",
    "stroke-miterlimit",
    "stroke-dasharray",
    "stroke-dashoffset"
  ];

  attributes.forEach(name => {
    const value = sourceElement.getAttribute(name);

    if (value !== null && value !== "") {
      element.setAttribute(name, value);
    } else if (
      name === "stroke-dasharray" ||
      name === "stroke-dashoffset"
    ) {
      element.removeAttribute(name);
    }
  });

  if (!element.hasAttribute("fill")) {
    element.setAttribute("fill", fill.value);
  }

  if (!element.hasAttribute("stroke")) {
    element.setAttribute("stroke", stroke.value);
  }

  if (!element.hasAttribute("stroke-width")) {
    element.setAttribute("stroke-width", strokeWidth.value);
  }

  if (!element.hasAttribute("fill-opacity")) {
    element.setAttribute(
      "fill-opacity",
      Number(fillOpacity.value) / 100
    );
  }

  if (!element.hasAttribute("stroke-opacity")) {
    element.setAttribute(
      "stroke-opacity",
      Number(strokeOpacity.value) / 100
    );
  }

  const resultFill =
    element.getAttribute(
      "fill"
    );

  const resultStroke =
    element.getAttribute(
      "stroke"
    );

  const resultFillOpacity =
    Number(
      element.getAttribute(
        "fill-opacity"
      )
    );

  const resultStrokeOpacity =
    Number(
      element.getAttribute(
        "stroke-opacity"
      )
    );

  if (
    resultFill &&
    resultFill !== "none" &&
    (
      !Number.isFinite(
        resultFillOpacity
      ) ||
      resultFillOpacity <= 0
    )
  ) {
    element.setAttribute(
      "fill-opacity",
      "1"
    );
  }

  if (
    resultStroke &&
    resultStroke !== "none" &&
    (
      !Number.isFinite(
        resultStrokeOpacity
      ) ||
      resultStrokeOpacity <= 0
    )
  ) {
    element.setAttribute(
      "stroke-opacity",
      "1"
    );
  }

  element.setAttribute("vector-effect", "non-scaling-stroke");
}

function stripImportedShapeBuilderStyles(element) {
  if (!element) return;

  const styleAttributes = [
    "fill",
    "stroke",
    "stroke-width",
    "stroke-opacity",
    "stroke-linecap",
    "stroke-linejoin",
    "stroke-miterlimit",
    "stroke-dasharray",
    "stroke-dashoffset",
    "opacity",
    "style",
    "vector-effect"
  ];

  /*
   * Strip style from descendants so Paper-exported child paths cannot leave
   * fragments of the original source stroke inside a merged result.
   * Geometry attributes such as d / fill-rule / clip-rule are retained.
   */
  element.querySelectorAll("*").forEach(child => {
    styleAttributes.forEach(name =>
      child.removeAttribute(name)
    );
  });
}

function paperPathToEditorElement(item, sourceElement) {
  const anchors = paperPathToAnchors(item);
  if (anchors.length < 2) return null;

  const newElement = document.createElementNS(SVG_NS, "path");

  objectCounter++;
  newElement.dataset.object = "true";
  newElement.dataset.name = `Shape ${objectCounter}`;
  newElement.dataset.tx = 0;
  newElement.dataset.ty = 0;
  newElement.dataset.rotation = 0;
  newElement.dataset.hidden = "false";
  newElement.dataset.locked = "false";
  newElement.dataset.closed = item.closed ? "true" : "false";
  newElement.dataset.shape = "true";
  newElement.dataset.editorPath = "true";

  newElement._anchors = anchors;

  applyShapeBuilderResultAppearance(
    newElement,
    sourceElement
  );

  updatePathD(newElement);
  return newElement;
}

function importPaperResultAsSvg(result, sourceElement) {
  /*
   * A connected boolean union is normally a Paper.Path.
   * Store its exact Paper segment geometry directly in _anchors so selection
   * handles and the rendered SVG always use the same coordinates.
   */
  if (result instanceof paper.Path) {
    return paperPathToEditorElement(result, sourceElement);
  }

  /*
   * A CompoundPath means the boolean result contains multiple disconnected
   * contours or holes. The current editor has a single-contour anchor model,
   * so importing it as if it were one path would corrupt vertex editing.
   *
   * Preserve the exact rendered compound geometry, but mark it non-editable
   * at the vertex level until multi-contour editing is implemented. It can
   * still be moved, filled, stroked, selected, duplicated, and exported.
   */
  if (result instanceof paper.CompoundPath) {
    const exported = result.exportSVG({
      asString: true,
      precision: 6
    });

    const doc = new DOMParser().parseFromString(
      exported,
      "image/svg+xml"
    );

    let exportedElement = doc.documentElement;

    if (exportedElement.tagName.toLowerCase() === "svg") {
      exportedElement = exportedElement.firstElementChild;
    }

    if (!exportedElement) return null;

    const newElement = document.importNode(exportedElement, true);

    objectCounter++;
    newElement.dataset.object = "true";
    newElement.dataset.name = `Compound Shape ${objectCounter}`;
    newElement.dataset.tx = 0;
    newElement.dataset.ty = 0;
    newElement.dataset.rotation = 0;
    newElement.dataset.scaleX = 1;
    newElement.dataset.scaleY = 1;
    newElement.dataset.hidden = "false";
    newElement.dataset.locked = "false";
    newElement.dataset.closed = "true";
    newElement.dataset.shape = "true";
    newElement.dataset.compoundShape = "true";

    stripImportedShapeBuilderStyles(newElement);

    applyShapeBuilderResultAppearance(
      newElement,
      sourceElement
    );

    return newElement;
  }

  return null;
}

function shapeBuilderRegionSource(region) {
  const artOrder = [...art.children];

  const candidates = [...region.sources]
    .map(index => shapeBuilderSources[index])
    .filter(Boolean);

  if (!candidates.length) {
    return shapeBuilderSources[0];
  }

  return candidates.sort(
    (a, b) => artOrder.indexOf(a) - artOrder.indexOf(b)
  )[candidates.length - 1];
}

function canonicalizePaperBooleanResult(item) {
  if (!item) return item;

  let current = normalizePaperBooleanGeometry(item);

  try {
    /*
     * A self-union is intentional: Paper re-traces the filled area instead
     * of retaining the individual touching contours that produced it.
     * This removes internal seams between merged atomic regions.
     */
    const duplicate = current.clone({ insert: false });
    normalizePaperBooleanGeometry(duplicate);

    const retraced = current.unite(
      duplicate,
      {
        insert: false,
        trace: true
      }
    );

    removePaperItem(duplicate);

    if (retraced && paperRegionIsUsable(retraced)) {
      removePaperItem(current);
      current = normalizePaperBooleanGeometry(retraced);
    } else {
      removePaperItem(retraced);
    }
  } catch {
    // Keep the valid boolean result if Paper cannot retrace a rare path.
  }

  try {
    if (typeof current.resolveCrossings === "function") {
      const resolved = current.resolveCrossings();

      if (
        resolved &&
        resolved !== current &&
        paperRegionIsUsable(resolved)
      ) {
        removePaperItem(current);
        current = normalizePaperBooleanGeometry(resolved);
      }
    }
  } catch {
    // The traced result is still usable without this cleanup pass.
  }

  try {
    if (typeof current.reduce === "function") {
      const reduced = current.reduce();

      if (
        reduced &&
        reduced !== current &&
        paperRegionIsUsable(reduced)
      ) {
        removePaperItem(current);
        current = normalizePaperBooleanGeometry(reduced);
      }
    }
  } catch {
    // Reduction is optional cleanup.
  }

  return normalizePaperBooleanGeometry(current);
}

function mergePaperRegions(regions) {
  if (!regions.length) return null;

  let result = canonicalizePaperBooleanResult(
    regions[0].item.clone({ insert: false })
  );

  for (let i = 1; i < regions.length; i++) {
    const next = result.unite(
      regions[i].item,
      {
        insert: false,
        trace: true
      }
    );

    removePaperItem(result);

    result = canonicalizePaperBooleanResult(
      next
    );
  }

  /*
   * Run one final retrace after all regions are combined. This is the
   * important step for overlapping circles: the lens/crescent boundaries
   * become one clean exterior contour, so the final stroke cannot draw an
   * old internal arc.
   */
  return canonicalizePaperBooleanResult(result);
}

function applyShapeBuilderRegions(hitRegions) {
  if (hitRegions.length < 2) return false;
  if (!shapeBuilderRegions.length || !shapeBuilderSources.length) return false;

  const hitSet = new Set(hitRegions.map(region => region.id));
  const untouched = shapeBuilderRegions.filter(
    region => !hitSet.has(region.id)
  );

  const jstsRegions =
    hitRegions.every(
      region =>
        region.engine === "jsts"
    );

  const mergedGeoJSON =
    jstsRegions
      ? mergeJstsShapeBuilderGeoJSON(
          hitRegions
        )
      : null;

  let mergedPaper =
    jstsRegions
      ? null
      : mergePaperRegions(
          hitRegions
        );

  if (!jstsRegions) {
    mergedPaper =
      canonicalizePaperBooleanResult(
        mergedPaper
      );

    if (
      !paperRegionIsUsable(
        mergedPaper
      )
    ) {
      removePaperItem(
        mergedPaper
      );
      return false;
    }
  }

  if (
    jstsRegions &&
    !mergedGeoJSON
  ) {
    return false;
  }

  const originalSources = [...shapeBuilderSources];
  const artOrder = [...art.children];
  const highestSource = originalSources
    .slice()
    .sort(
      (a, b) => artOrder.indexOf(a) - artOrder.indexOf(b)
    )
    .at(-1);

  const insertionPoint = highestSource?.nextSibling || null;
  const outputElements = [];

  untouched.forEach(
    region => {
      const source =
        shapeBuilderRegionSource(
          region
        );

      const element =
        region.engine ===
          "jsts" &&
        region.geojson
          ? shapeBuilderSvgElementFromGeoJSON(
              region.geojson,
              source
            )
          : (
              region.item
                ? importPaperResultAsSvg(
                    region.item,
                    source
                  )
                : null
            );

      if (element) {
        outputElements.push(
          element
        );
      }
    }
  );

  const mergedSource = shapeBuilderRegionSource({
    sources: new Set(
      hitRegions.flatMap(region => [...region.sources])
    )
  });

  const mergedElement =
    jstsRegions
      ? shapeBuilderSvgElementFromGeoJSON(
          mergedGeoJSON,
          mergedSource,
          "Shape Builder"
        )
      : importPaperResultAsSvg(
          mergedPaper,
          mergedSource
        );

  if (!mergedElement) {
    removePaperItem(
      mergedPaper
    );
    return false;
  }

  outputElements.push(mergedElement);

  originalSources.forEach(source => {
    /* Cutter lines divide the topology but are not consumed as filled
     * Shape Builder source regions. Keep them available for further edits. */
    if (isShapeBuilderCutter(source)) return;

    removeGradientDefinition?.(source);
    source.remove();
  });

  outputElements.forEach(element => {
    if (insertionPoint && insertionPoint.parentNode === art) {
      art.insertBefore(element, insertionPoint);
    } else {
      art.appendChild(element);
    }
  });

  if (mergedPaper) {
    removePaperItem(
      mergedPaper
    );
  }

  /*
   * Keep the whole rebuilt partition selected after a merge. The merged
   * result stays the primary selection, while untouched regions remain
   * selected too, so the user can immediately run Shape Builder again.
   */
  setSelection(
    outputElements,
    mergedElement
  );

  renderLayers();
  recordHistory({ label: "Shape Builder Merge", detail: "Selected regions merged" });

  return true;
}


function subtractShapeBuilderRegions(hitRegions) {
  if (!hitRegions.length) return false;
  if (!shapeBuilderRegions.length || !shapeBuilderSources.length) return false;

  const hitSet = new Set(hitRegions.map(region => region.id));
  const remainingRegions = shapeBuilderRegions.filter(
    region => !hitSet.has(region.id)
  );

  const originalSources = [...shapeBuilderSources];
  const artOrder = [...art.children];
  const highestSource = originalSources
    .slice()
    .sort(
      (a, b) => artOrder.indexOf(a) - artOrder.indexOf(b)
    )
    .at(-1);

  const insertionPoint = highestSource?.nextSibling || null;
  const outputElements = [];

  remainingRegions.forEach(
    region => {
      const source =
        shapeBuilderRegionSource(
          region
        );

      const element =
        region.engine ===
          "jsts" &&
        region.geojson
          ? shapeBuilderSvgElementFromGeoJSON(
              region.geojson,
              source
            )
          : (
              region.item
                ? importPaperResultAsSvg(
                    region.item,
                    source
                  )
                : null
            );

      if (element) {
        outputElements.push(
          element
        );
      }
    }
  );

  originalSources.forEach(source => {
    /* Cutter lines divide the topology but are not consumed as filled
     * Shape Builder source regions. Keep them available for further edits. */
    if (isShapeBuilderCutter(source)) return;

    removeGradientDefinition?.(source);
    source.remove();
  });

  outputElements.forEach(element => {
    if (insertionPoint && insertionPoint.parentNode === art) {
      art.insertBefore(element, insertionPoint);
    } else {
      art.appendChild(element);
    }
  });

  if (outputElements.length) {
    setSelection(
      outputElements,
      outputElements[outputElements.length - 1]
    );
  } else {
    deselect();
  }

  renderLayers();
  recordHistory({ label: "Shape Builder Subtract", detail: "Selected regions removed" });

  return true;
}


function pathfinderEligibleSelection() {
  return selectedItems.filter(
    element =>
      isLayerInteractive(element) &&
      isShapeBuilderEligible(element)
  );
}

function pathfinderSourceOrder(elements) {
  const order = [...art.children];

  return elements
    .slice()
    .sort(
      (a, b) =>
        order.indexOf(a) -
        order.indexOf(b)
    );
}

function pathfinderPaperItemForElement(element) {
  if (!element) return null;

  try {
    /*
     * Reuse the exact same SVG → Paper.js converter as Shape Builder.
     * It already handles native rectangles, ellipses, polygons, closed
     * editor paths, rotated shapes, and compound shapes.
     */
    return normalizePaperBooleanGeometry(
      svgShapeToPaper(element)
    );
  } catch (error) {
    console.error("Pathfinder import failed", error);
    return null;
  }
}

function pathfinderCleanupPaperItems(items) {
  items.forEach(item => {
    try {
      item?.remove?.();
    } catch {
      // Ignore cleanup failures.
    }
  });
}

function pathfinderBooleanResult(items, operation) {
  if (!items.length) return null;

  let result =
    items[0].clone({
      insert: false
    });

  for (
    let index = 1;
    index < items.length;
    index += 1
  ) {
    const item = items[index];
    let next = null;

    if (operation === "union") {
      next = result.unite(
        item,
        { insert: false }
      );
    } else if (
      operation === "intersect"
    ) {
      next = result.intersect(
        item,
        { insert: false }
      );
    } else if (
      operation ===
      "subtract-front"
    ) {
      next = result.subtract(
        item,
        { insert: false }
      );
    } else if (
      operation === "exclude"
    ) {
      next = result.exclude(
        item,
        { insert: false }
      );
    }

    removePaperItem(result);

    if (!next) {
      return null;
    }

    result = next;
  }

  return canonicalizePaperBooleanResult(
    result
  );
}

function pathfinderFlattenPaperResult(result) {
  if (!result) return [];

  if (
    result instanceof paper.CompoundPath &&
    result.children?.length
  ) {
    const children =
      result.children
        .slice()
        .map(child =>
          child.clone({
            insert: false
          })
        );

    removePaperItem(result);
    return children;
  }

  return [result];
}

function pathfinderDividePair(backItem, frontItem) {
  const pieces = [];

  const operations = [
    () =>
      backItem.subtract(
        frontItem,
        { insert: false }
      ),
    () =>
      backItem.intersect(
        frontItem,
        { insert: false }
      ),
    () =>
      frontItem.subtract(
        backItem,
        { insert: false }
      ),
  ];

  operations.forEach(makeResult => {
    let result = null;

    try {
      result =
        canonicalizePaperBooleanResult(
          makeResult()
        );
    } catch {
      result = null;
    }

    if (
      result &&
      paperRegionIsUsable(result)
    ) {
      pieces.push(
        ...pathfinderFlattenPaperResult(
          result
        )
      );
    } else {
      removePaperItem(result);
    }
  });

  return pieces;
}

function pathfinderDivideResults(items) {
  if (items.length < 2) {
    return [];
  }

  let pieces =
    pathfinderDividePair(
      items[0],
      items[1]
    );

  for (
    let index = 2;
    index < items.length;
    index += 1
  ) {
    const cutter =
      items[index];

    const nextPieces = [];

    pieces.forEach(piece => {
      nextPieces.push(
        ...pathfinderDividePair(
          piece,
          cutter
        )
      );

      removePaperItem(piece);
    });

    pieces = nextPieces;
  }

  return pieces;
}

function pathfinderImportPaperResult(
  result,
  sourceElement
) {
  if (!result) return null;

  const normalized =
    canonicalizePaperBooleanResult(
      result
    );

  if (
    !normalized ||
    !paperRegionIsUsable(normalized)
  ) {
    removePaperItem(normalized);
    return null;
  }

  const element =
    importPaperResultAsSvg(
      normalized,
      sourceElement
    );

  removePaperItem(normalized);

  return element;
}

function runPathfinder(operation) {
  const sources =
    pathfinderSourceOrder(
      pathfinderEligibleSelection()
    );

  if (sources.length < 2) {
    toolStatus.textContent =
      "Select two or more compatible vector shapes";
    updatePathfinderControls();
    return;
  }

  if (!ensurePaperReady()) {
    toolStatus.textContent =
      "Pathfinder engine could not be initialized";
    return;
  }

  /*
   * Pathfinder uses detached Paper items, but clearing first avoids stale
   * Shape Builder geometry affecting later boolean operations.
   */
  paper.project.clear();

  const paperItems =
    sources
      .map(
        pathfinderPaperItemForElement
      )
      .filter(Boolean);

  if (
    paperItems.length !==
    sources.length
  ) {
    pathfinderCleanupPaperItems(
      paperItems
    );

    toolStatus.textContent =
      "Pathfinder could not convert the selected vector geometry";
    return;
  }

  const order = [...art.children];
  const topSource =
    sources
      .slice()
      .sort(
        (a, b) =>
          order.indexOf(a) -
          order.indexOf(b)
      )
      .at(-1);

  const insertionPoint =
    topSource?.nextSibling ||
    null;

  const appearanceSource =
    operation === "subtract-front"
      ? sources[0]
      : topSource || sources[0];

  const outputElements = [];

  try {
    if (operation === "divide") {
      const pieces =
        pathfinderDivideResults(
          paperItems
        );

      pieces.forEach(piece => {
        const element =
          pathfinderImportPaperResult(
            piece,
            appearanceSource
          );

        if (element) {
          outputElements.push(
            element
          );
        }
      });
    } else {
      const result =
        pathfinderBooleanResult(
          paperItems,
          operation
        );

      const element =
        pathfinderImportPaperResult(
          result,
          appearanceSource
        );

      if (element) {
        outputElements.push(
          element
        );
      }
    }
  } catch (error) {
    console.error(
      "Pathfinder operation failed",
      error
    );
  } finally {
    pathfinderCleanupPaperItems(
      paperItems
    );
  }

  if (!outputElements.length) {
    toolStatus.textContent =
      "Pathfinder produced no visible result";
    return;
  }

  sources.forEach(source => {
    removeGradientDefinition?.(
      source
    );

    source.remove();
  });

  outputElements.forEach(element => {
    if (
      insertionPoint &&
      insertionPoint.parentNode === art
    ) {
      art.insertBefore(
        element,
        insertionPoint
      );
    } else {
      art.appendChild(element);
    }
  });

  setSelection(
    outputElements,
    outputElements[
      outputElements.length - 1
    ]
  );

  renderLayers();
  drawSelection();
  updatePropertyControls();

  const labels = {
    union: "Pathfinder Union",
    "subtract-front":
      "Pathfinder Subtract Front",
    intersect:
      "Pathfinder Intersect",
    exclude:
      "Pathfinder Exclude",
    divide:
      "Pathfinder Divide"
  };

  const details = {
    union:
      "Selected shapes combined",
    "subtract-front":
      "Front shapes removed from back shape",
    intersect:
      "Only overlapping regions kept",
    exclude:
      "Overlapping regions excluded",
    divide:
      `${outputElements.length} divided region${outputElements.length === 1 ? "" : "s"} created`
  };

  recordHistory({
    label:
      labels[operation] ||
      "Pathfinder",
    detail:
      details[operation] ||
      "Boolean operation applied"
  });

  toolStatus.textContent =
    labels[operation] ||
    "Pathfinder complete";

  updatePathfinderControls();
}

function updatePathfinderControls() {
  const eligible =
    pathfinderEligibleSelection();

  const enabled =
    eligible.length >= 2 &&
    eligible.length ===
      selectedItems.length;

  document
    .querySelectorAll(
      "[data-pathfinder]"
    )
    .forEach(button => {
      button.disabled = !enabled;
    });

  if (!pathfinderHint) return;

  if (selectedItems.length < 2) {
    pathfinderHint.textContent =
      "Select two or more compatible vector shapes.";
  } else if (
    eligible.length !==
    selectedItems.length
  ) {
    pathfinderHint.textContent =
      "Some selected objects are not compatible with Pathfinder.";
  } else {
    pathfinderHint.textContent =
      `${eligible.length} shapes selected — choose an operation.`;
  }
}

document
  .querySelectorAll("[data-pathfinder]")
  .forEach(button => {
    button.addEventListener(
      "click",
      () => {
        runPathfinder(
          button.dataset.pathfinder
        );
      }
    );
  });

function resetShapeBuilderRegions() {
  shapeBuilderRegions.forEach(
    region => {
      if (region.item) {
        removePaperItem(
          region.item
        );
      }
    }
  );

  shapeBuilderRegions = [];
  shapeBuilderSources = [];
  shapeBuilderSubtracting = false;
  shapeBuilderHoverRegion = null;

  if (paperReady) {
    paper.project.clear();
  }
}

function finishShapeBuilderStroke() {
  if (!shapeBuilderDrawing) return;

  shapeBuilderDrawing = false;
  updateShapeBuilderHits();

  const hitRegions = [...shapeBuilderHits];

  shapeBuilderPoints = [];
  shapeBuilderHits = [];

  if (shapeBuilderSubtracting) {
    if (hitRegions.length >= 1) {
      subtractShapeBuilderRegions(hitRegions);
    } else {
      drawSelection();
    }
  } else if (hitRegions.length >= 2) {
    applyShapeBuilderRegions(hitRegions);
  } else {
    drawSelection();
  }

  resetShapeBuilderRegions();
}


function updateShapeBuilderSubtractCursor(event = null) {
  const existing = document.querySelector(
    "#shapeBuilderSubtractCursor"
  );

  if (
    activeTool !== "shapeBuilder" ||
    !shapeBuilderAltHeld ||
    !event
  ) {
    existing?.remove();
    return;
  }

  let badge = existing;

  if (!badge) {
    badge = document.createElement("div");
    badge.id = "shapeBuilderSubtractCursor";
    badge.className = "shape-builder-subtract-cursor";
    badge.textContent = "−";
    document.body.appendChild(badge);
  }

  badge.style.left = `${event.clientX + 15}px`;
  badge.style.top = `${event.clientY + 15}px`;
}


function freeDrawSmoothingAmount() {
  return Math.max(
    0,
    Math.min(
      100,
      Number(
        freeDrawSmoothing?.value ??
        55
      )
    )
  );
}

function updateFreeDrawSmoothingLabel() {
  if (!freeDrawSmoothingValue) {
    return;
  }

  freeDrawSmoothingValue.textContent =
    `${Math.round(
      freeDrawSmoothingAmount()
    )}%`;
}

function initializeFreeDrawSmoothing() {
  let stored = 55;

  try {
    const candidate =
      Number(
        localStorage.getItem(
          FREE_DRAW_SMOOTHING_KEY
        )
      );

    if (
      Number.isFinite(candidate)
    ) {
      stored =
        Math.max(
          0,
          Math.min(
            100,
            candidate
          )
        );
    }
  } catch {}

  if (freeDrawSmoothing) {
    freeDrawSmoothing.value =
      String(stored);
  }

  updateFreeDrawSmoothingLabel();
}

function squaredDistanceToSegment(
  point,
  start,
  end
) {
  const vx =
    end.x - start.x;

  const vy =
    end.y - start.y;

  const lengthSquared =
    vx * vx +
    vy * vy;

  if (lengthSquared <= 1e-12) {
    const dx =
      point.x - start.x;

    const dy =
      point.y - start.y;

    return dx * dx + dy * dy;
  }

  let t =
    (
      (
        point.x - start.x
      ) * vx +
      (
        point.y - start.y
      ) * vy
    ) /
    lengthSquared;

  t =
    Math.max(
      0,
      Math.min(1, t)
    );

  const px =
    start.x + vx * t;

  const py =
    start.y + vy * t;

  const dx =
    point.x - px;

  const dy =
    point.y - py;

  return dx * dx + dy * dy;
}

function simplifyFreeDrawPoints(
  points,
  tolerance
) {
  if (
    !Array.isArray(points) ||
    points.length <= 2 ||
    tolerance <= 0
  ) {
    return [...points];
  }

  const toleranceSquared =
    tolerance * tolerance;

  function simplifyRange(
    startIndex,
    endIndex,
    output
  ) {
    let maxDistance = 0;
    let splitIndex = -1;

    const start =
      points[startIndex];

    const end =
      points[endIndex];

    for (
      let index =
        startIndex + 1;
      index < endIndex;
      index += 1
    ) {
      const distance =
        squaredDistanceToSegment(
          points[index],
          start,
          end
        );

      if (
        distance >
        maxDistance
      ) {
        maxDistance =
          distance;
        splitIndex =
          index;
      }
    }

    if (
      splitIndex !== -1 &&
      maxDistance >
        toleranceSquared
    ) {
      simplifyRange(
        startIndex,
        splitIndex,
        output
      );

      output.pop();

      simplifyRange(
        splitIndex,
        endIndex,
        output
      );
    } else {
      output.push(
        start,
        end
      );
    }
  }

  const output = [];

  simplifyRange(
    0,
    points.length - 1,
    output
  );

  return output.filter(
    (
      point,
      index,
      values
    ) =>
      index === 0 ||
      point.x !==
        values[index - 1].x ||
      point.y !==
        values[index - 1].y
  );
}

function freeDrawPreviewD(
  points
) {
  if (!points.length) {
    return "";
  }

  let d =
    `M ${points[0].x} ${points[0].y}`;

  for (
    let index = 1;
    index < points.length;
    index += 1
  ) {
    d +=
      ` L ${points[index].x} ${points[index].y}`;
  }

  return d;
}

function freeDrawAnchorsFromPoints(
  points,
  smoothing
) {
  if (!points.length) {
    return [];
  }

  if (points.length === 1) {
    const point =
      points[0];

    return [{
      x: point.x,
      y: point.y,
      inX: point.x,
      inY: point.y,
      outX: point.x,
      outY: point.y,
      handleMode:
        "corner"
    }];
  }

  const smoothStrength =
    Math.max(
      0,
      Math.min(
        1,
        smoothing / 100
      )
    );

  return points.map(
    (
      point,
      index
    ) => {
      if (
        smoothStrength <=
          0.001 ||
        index === 0 ||
        index ===
          points.length - 1
      ) {
        return {
          x: point.x,
          y: point.y,
          inX: point.x,
          inY: point.y,
          outX: point.x,
          outY: point.y,
          handleMode:
            "corner"
        };
      }

      const previous =
        points[index - 1];

      const next =
        points[index + 1];

      const tension =
        (
          0.12 +
          smoothStrength *
            0.12
        );

      const tangentX =
        (
          next.x -
          previous.x
        ) *
        tension;

      const tangentY =
        (
          next.y -
          previous.y
        ) *
        tension;

      return {
        x: point.x,
        y: point.y,
        inX:
          point.x -
          tangentX,
        inY:
          point.y -
          tangentY,
        outX:
          point.x +
          tangentX,
        outY:
          point.y +
          tangentY,
        handleMode:
          "smooth"
      };
    }
  );
}


function freeDrawShapeDetectionEnabled() {
  return Boolean(
    freeDrawShapeDetection?.checked
  );
}

function initializeFreeDrawShapeDetection() {
  let enabled = true;

  try {
    const stored =
      localStorage.getItem(
        FREE_DRAW_SHAPE_DETECTION_KEY
      );

    if (stored !== null) {
      enabled =
        stored !== "false";
    }
  } catch {}

  if (freeDrawShapeDetection) {
    freeDrawShapeDetection.checked =
      enabled;
  }
}

function freeDrawBounds(
  points
) {
  const xs =
    points.map(
      point => point.x
    );

  const ys =
    points.map(
      point => point.y
    );

  const left =
    Math.min(...xs);

  const right =
    Math.max(...xs);

  const top =
    Math.min(...ys);

  const bottom =
    Math.max(...ys);

  return {
    left,
    right,
    top,
    bottom,
    width:
      right - left,
    height:
      bottom - top,
    centerX:
      (left + right) / 2,
    centerY:
      (top + bottom) / 2
  };
}

function freeDrawPolylineLength(
  points
) {
  let total = 0;

  for (
    let index = 1;
    index < points.length;
    index += 1
  ) {
    total +=
      Math.hypot(
        points[index].x -
          points[index - 1].x,
        points[index].y -
          points[index - 1].y
      );
  }

  return total;
}

function freeDrawClosedEnough(
  points,
  bounds
) {
  if (
    points.length < 4
  ) {
    return false;
  }

  const diagonal =
    Math.hypot(
      bounds.width,
      bounds.height
    );

  if (diagonal < 4) {
    return false;
  }

  return (
    Math.hypot(
      points[0].x -
        points[
          points.length - 1
        ].x,
      points[0].y -
        points[
          points.length - 1
        ].y
    ) <=
    Math.max(
      8 /
        Math.max(
          zoom,
          0.05
        ),
      diagonal * 0.18
    )
  );
}

function freeDrawPointLineDistance(
  point,
  start,
  end
) {
  return Math.sqrt(
    squaredDistanceToSegment(
      point,
      start,
      end
    )
  );
}

function detectFreeDrawLine(
  points,
  bounds
) {
  const start =
    points[0];

  const end =
    points[
      points.length - 1
    ];

  const chord =
    Math.hypot(
      end.x - start.x,
      end.y - start.y
    );

  if (chord < 8) {
    return null;
  }

  const pathLength =
    freeDrawPolylineLength(
      points
    );

  if (
    pathLength <= 0 ||
    chord / pathLength <
      0.9
  ) {
    return null;
  }

  let maximumDistance = 0;

  points.forEach(
    point => {
      maximumDistance =
        Math.max(
          maximumDistance,
          freeDrawPointLineDistance(
            point,
            start,
            end
          )
        );
    }
  );

  const tolerance =
    Math.max(
      4 /
        Math.max(
          zoom,
          0.05
        ),
      chord * 0.06
    );

  if (
    maximumDistance >
    tolerance
  ) {
    return null;
  }

  return {
    type: "line",
    confidence:
      1 -
      Math.min(
        1,
        maximumDistance /
          Math.max(
            tolerance,
            0.001
          )
      ) *
      0.35,
    start,
    end
  };
}

function freeDrawPolygonVertices(
  points,
  tolerance
) {
  let working =
    [...points];

  if (
    working.length > 2 &&
    Math.hypot(
      working[0].x -
        working[
          working.length - 1
        ].x,
      working[0].y -
        working[
          working.length - 1
        ].y
    ) <
    tolerance * 2
  ) {
    working =
      working.slice(
        0,
        -1
      );
  }

  if (
    working.length < 3
  ) {
    return [];
  }

  const closed =
    [
      ...working,
      working[0]
    ];

  const simplified =
    simplifyFreeDrawPoints(
      closed,
      tolerance
    );

  const vertices =
    simplified.slice(
      0,
      -1
    );

  return vertices.filter(
    (
      point,
      index
    ) =>
      index === 0 ||
      Math.hypot(
        point.x -
          vertices[
            index - 1
          ].x,
        point.y -
          vertices[
            index - 1
          ].y
      ) >
      tolerance * 0.75
  );
}

function freeDrawPolygonRegularity(
  vertices
) {
  if (
    vertices.length < 3
  ) {
    return {
      sideVariation: 1,
      angleVariation: 1
    };
  }

  const sideLengths = [];
  const angles = [];

  for (
    let index = 0;
    index < vertices.length;
    index += 1
  ) {
    const previous =
      vertices[
        (
          index -
          1 +
          vertices.length
        ) %
        vertices.length
      ];

    const current =
      vertices[index];

    const next =
      vertices[
        (
          index + 1
        ) %
        vertices.length
      ];

    sideLengths.push(
      Math.hypot(
        next.x -
          current.x,
        next.y -
          current.y
      )
    );

    const ax =
      previous.x -
      current.x;

    const ay =
      previous.y -
      current.y;

    const bx =
      next.x -
      current.x;

    const by =
      next.y -
      current.y;

    const denominator =
      Math.max(
        1e-9,
        Math.hypot(ax, ay) *
          Math.hypot(bx, by)
      );

    const cosine =
      Math.max(
        -1,
        Math.min(
          1,
          (
            ax * bx +
            ay * by
          ) /
          denominator
        )
      );

    angles.push(
      Math.acos(cosine)
    );
  }

  const meanSide =
    sideLengths.reduce(
      (sum, value) =>
        sum + value,
      0
    ) /
    sideLengths.length;

  const meanAngle =
    angles.reduce(
      (sum, value) =>
        sum + value,
      0
    ) /
    angles.length;

  const sideVariation =
    Math.sqrt(
      sideLengths.reduce(
        (
          sum,
          value
        ) =>
          sum +
          (
            value -
            meanSide
          ) ** 2,
        0
      ) /
      sideLengths.length
    ) /
    Math.max(
      meanSide,
      1e-9
    );

  const angleVariation =
    Math.sqrt(
      angles.reduce(
        (
          sum,
          value
        ) =>
          sum +
          (
            value -
            meanAngle
          ) ** 2,
        0
      ) /
      angles.length
    ) /
    Math.max(
      meanAngle,
      1e-9
    );

  return {
    sideVariation,
    angleVariation
  };
}

function freeDrawEllipseError(
  points,
  bounds
) {
  const rx =
    bounds.width / 2;

  const ry =
    bounds.height / 2;

  if (
    rx < 3 ||
    ry < 3
  ) {
    return Infinity;
  }

  let total = 0;

  points.forEach(
    point => {
      const nx =
        (
          point.x -
          bounds.centerX
        ) /
        rx;

      const ny =
        (
          point.y -
          bounds.centerY
        ) /
        ry;

      total +=
        Math.abs(
          Math.hypot(
            nx,
            ny
          ) -
          1
        );
    }
  );

  return (
    total /
    points.length
  );
}

function detectFreeDrawClosedShape(
  points,
  bounds
) {
  if (
    !freeDrawClosedEnough(
      points,
      bounds
    )
  ) {
    return null;
  }

  const diagonal =
    Math.hypot(
      bounds.width,
      bounds.height
    );

  const polygonTolerance =
    Math.max(
      5 /
        Math.max(
          zoom,
          0.05
        ),
      diagonal * 0.035
    );

  const vertices =
    freeDrawPolygonVertices(
      points,
      polygonTolerance
    );

  const ellipseError =
    freeDrawEllipseError(
      points,
      bounds
    );

  const aspect =
    bounds.width /
    Math.max(
      bounds.height,
      1e-9
    );

  const nearCircle =
    aspect >= 0.8 &&
    aspect <= 1.25;

  /*
   * Prefer geometric polygons when the simplification leaves a small,
   * meaningful vertex count. Otherwise a low radial error means ellipse.
   */
  if (
    vertices.length >= 3 &&
    vertices.length <= 8
  ) {
    const regularity =
      freeDrawPolygonRegularity(
        vertices
      );

    if (
      vertices.length === 3 &&
      regularity.angleVariation <
        0.34
    ) {
      return {
        type:
          "triangle",
        confidence:
          0.88,
        vertices
      };
    }

    if (
      vertices.length === 4
    ) {
      const xs =
        vertices.map(
          vertex => vertex.x
        );

      const ys =
        vertices.map(
          vertex => vertex.y
        );

      const vertexBounds = {
        left:
          Math.min(...xs),
        right:
          Math.max(...xs),
        top:
          Math.min(...ys),
        bottom:
          Math.max(...ys)
      };

      const width =
        vertexBounds.right -
        vertexBounds.left;

      const height =
        vertexBounds.bottom -
        vertexBounds.top;

      const squareish =
        width /
          Math.max(
            height,
            1e-9
          ) >=
          0.8 &&
        width /
          Math.max(
            height,
            1e-9
          ) <=
          1.25;

      if (
        regularity.angleVariation <
          0.24
      ) {
        return {
          type:
            squareish
              ? "square"
              : "rectangle",
          confidence:
            0.9,
          vertices
        };
      }
    }

    if (
      vertices.length >= 5 &&
      regularity.sideVariation <
        0.24 &&
      regularity.angleVariation <
        0.22
    ) {
      return {
        type:
          "polygon",
        sides:
          vertices.length,
        confidence:
          0.86,
        vertices
      };
    }
  }

  if (
    ellipseError <
    0.16
  ) {
    return {
      type:
        nearCircle
          ? "circle"
          : "ellipse",
      confidence:
        Math.max(
          0.78,
          1 -
            ellipseError
        ),
      bounds
    };
  }

  return null;
}

function detectFreeDrawShape(
  points
) {
  if (
    !freeDrawShapeDetectionEnabled() ||
    !Array.isArray(points) ||
    points.length < 3
  ) {
    return null;
  }

  const bounds =
    freeDrawBounds(
      points
    );

  const line =
    detectFreeDrawLine(
      points,
      bounds
    );

  if (line) {
    return line;
  }

  return (
    detectFreeDrawClosedShape(
      points,
      bounds
    )
  );
}

function freeDrawDetectedShapeElement(
  detection,
  sourcePoints
) {
  if (!detection) {
    return null;
  }

  const sourceBounds =
    freeDrawBounds(
      sourcePoints
    );

  if (
    detection.type ===
    "line"
  ) {
    const line =
      createBaseElement(
        "line"
      );

    line.setAttribute(
      "x1",
      detection.start.x
    );

    line.setAttribute(
      "y1",
      detection.start.y
    );

    line.setAttribute(
      "x2",
      detection.end.x
    );

    line.setAttribute(
      "y2",
      detection.end.y
    );

    line.setAttribute(
      "fill",
      "none"
    );

    line.dataset.shapeType =
      "line";

    return line;
  }

  if (
    detection.type ===
      "circle" ||
    detection.type ===
      "ellipse"
  ) {
    const ellipse =
      createBaseElement(
        "ellipse"
      );

    ellipse.setAttribute(
      "cx",
      sourceBounds.centerX
    );

    ellipse.setAttribute(
      "cy",
      sourceBounds.centerY
    );

    ellipse.setAttribute(
      "rx",
      sourceBounds.width / 2
    );

    ellipse.setAttribute(
      "ry",
      sourceBounds.height / 2
    );

    ellipse.setAttribute(
      "fill",
      "none"
    );

    ellipse.dataset.shapeType =
      detection.type;

    return ellipse;
  }

  if (
    detection.type ===
      "rectangle" ||
    detection.type ===
      "square"
  ) {
    const rect =
      createBaseElement(
        "rect"
      );

    rect.setAttribute(
      "x",
      sourceBounds.left
    );

    rect.setAttribute(
      "y",
      sourceBounds.top
    );

    rect.setAttribute(
      "width",
      sourceBounds.width
    );

    rect.setAttribute(
      "height",
      sourceBounds.height
    );

    rect.setAttribute(
      "fill",
      "none"
    );

    rect.dataset.shapeType =
      detection.type;

    return rect;
  }

  if (
    detection.type ===
      "triangle" ||
    detection.type ===
      "polygon"
  ) {
    const polygon =
      createBaseElement(
        "polygon"
      );

    const sides =
      detection.type ===
        "triangle"
        ? 3
        : detection.sides;

    polygon.dataset.shapeType =
      detection.type ===
        "triangle"
        ? "triangle"
        : "ngon";

    if (
      detection.type ===
      "polygon"
    ) {
      polygon.dataset.polygonSides =
        String(sides);
    }

    polygon.setAttribute(
      "points",
      regularPolygonPoints(
        sourceBounds.centerX,
        sourceBounds.centerY,
        sourceBounds.width / 2,
        sourceBounds.height / 2,
        sides,
        -90
      )
    );

    polygon.setAttribute(
      "fill",
      "none"
    );

    return polygon;
  }

  return null;
}


function beginFreeDrawStroke(
  point,
  pointerId
) {
  deselect();

  freeDrawPointerId =
    pointerId;

  freeDrawPoints = [{
    x: point.x,
    y: point.y
  }];

  freeDrawPreview =
    svgEl(
      "path",
      {
        id:
          "freeDrawPreview",
        d:
          `M ${point.x} ${point.y}`,
        fill:
          "none",
        stroke:
          stroke.value ||
          DEFAULT_SHAPE_STROKE,
        "stroke-width":
          Math.max(
            0.1,
            Number(
              strokeWidth.value ||
              1
            )
          ),
        "stroke-linecap":
          strokeCap?.value ||
          "round",
        "stroke-linejoin":
          strokeJoin?.value ||
          "round",
        opacity:
          "0.82",
        class:
          "free-draw-preview",
        "pointer-events":
          "none"
      }
    );

  selectionOverlay
    .appendChild(
      freeDrawPreview
    );

  toolStatus.textContent =
    "Free Draw: drawing…";
}

function updateFreeDrawStroke(
  point
) {
  if (
    freeDrawPointerId === null ||
    !freeDrawPreview
  ) {
    return;
  }

  const last =
    freeDrawPoints[
      freeDrawPoints.length - 1
    ];

  const minimumDistance =
    1.5 /
    Math.max(
      zoom,
      0.05
    );

  if (
    last &&
    Math.hypot(
      point.x - last.x,
      point.y - last.y
    ) <
    minimumDistance
  ) {
    return;
  }

  freeDrawPoints.push({
    x: point.x,
    y: point.y
  });

  freeDrawPreview
    .setAttribute(
      "d",
      freeDrawPreviewD(
        freeDrawPoints
      )
    );
}

function cancelFreeDrawStroke() {
  freeDrawPreview?.remove();
  freeDrawPreview = null;
  freeDrawPoints = [];
  freeDrawPointerId = null;
}

function finishFreeDrawStroke() {
  if (
    freeDrawPointerId === null
  ) {
    return null;
  }

  const sourcePoints =
    [...freeDrawPoints];

  cancelFreeDrawStroke();

  if (
    sourcePoints.length < 2
  ) {
    toolStatus.textContent =
      "Free Draw: drag to draw";
    return null;
  }

  const smoothing =
    freeDrawSmoothingAmount();

  const detection =
    detectFreeDrawShape(
      sourcePoints
    );

  if (
    detection &&
    detection.confidence >=
      0.78
  ) {
    const detectedShape =
      freeDrawDetectedShapeElement(
        detection,
        sourcePoints
      );

    if (detectedShape) {
      detectedShape.dataset.freeDrawDetected =
        detection.type;

      art.appendChild(
        detectedShape
      );

      setSelection(
        [detectedShape],
        detectedShape
      );

      renderLayers();

      recordHistory({
        label:
          "Free Draw Shape Detected",
        detail:
          `${capitalize(detection.type)} detected and replaced`
      });

      toolStatus.textContent =
        `Free Draw: detected ${detection.type}`;

      return detectedShape;
    }
  }

  /*
   * Map 0–100 smoothing to an RDP simplification tolerance. Zoom adjustment
   * keeps the visual behavior reasonably consistent at different zoom levels.
   */
  const tolerance =
    (
      smoothing /
      100
    ) *
    (
      8 /
      Math.max(
        zoom,
        0.05
      )
    );

  const simplified =
    simplifyFreeDrawPoints(
      sourcePoints,
      tolerance
    );

  if (
    simplified.length < 2
  ) {
    return null;
  }

  const path =
    createBaseElement(
      "path"
    );

  path.dataset.name =
    `Free Draw ${objectCounter}`;

  path.dataset.shapeType =
    "freeDraw";

  path.dataset.closed =
    "false";

  path.dataset.freeDrawSmoothing =
    String(smoothing);

  path.setAttribute(
    "fill",
    "none"
  );

  path._anchors =
    freeDrawAnchorsFromPoints(
      simplified,
      smoothing
    );

  path.dataset.pathCornerRadii =
    JSON.stringify(
      Array(
        path._anchors.length
      ).fill(0)
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
      "Free Draw Path Created",
    detail:
      `${path._anchors.length} anchors • ${Math.round(smoothing)}% smoothing`
  });

  toolStatus.textContent =
    `Free Draw: ${path._anchors.length} anchors • ${Math.round(smoothing)}% smoothing`;

  return path;
}



