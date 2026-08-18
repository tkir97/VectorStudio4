/* Vector Studio modular baseline — source lines 9166-12272 from consolidated app.js.
   Classic-script module: shares the browser global lexical scope with ordered sibling modules. */

/* ---------------- PEN / BEZIER ---------------- */


function reverseEditablePathAnchors(path) {
  if (!path || !Array.isArray(path._anchors)) {
    return;
  }

  path._anchors = path._anchors
    .slice()
    .reverse()
    .map(anchor => ({
      ...anchor,
      inX: anchor.outX,
      inY: anchor.outY,
      outX: anchor.inX,
      outY: anchor.inY
    }));

  updatePathD(path);
}

function bakePathTransformIntoAnchors(path) {
  if (!path || !Array.isArray(path._anchors)) {
    return;
  }

  const transformed = path._anchors.map(anchor => {
    const point = canvasPointFromLocal(
      path,
      anchor.x,
      anchor.y
    );

    const inPoint = canvasPointFromLocal(
      path,
      anchor.inX,
      anchor.inY
    );

    const outPoint = canvasPointFromLocal(
      path,
      anchor.outX,
      anchor.outY
    );

    return {
      ...anchor,
      x: point.x,
      y: point.y,
      inX: inPoint.x,
      inY: inPoint.y,
      outX: outPoint.x,
      outY: outPoint.y
    };
  });

  path.dataset.tx = "0";
  path.dataset.ty = "0";
  path.dataset.rotation = "0";
  path.dataset.scaleX = "1";
  path.dataset.scaleY = "1";
  path.removeAttribute("transform");

  path._anchors = transformed;
  updatePathD(path);
}

function selectedOpenPathForPenContinuation() {
  if (
    selectedItems.length !== 1 ||
    !selected ||
    selected.tagName !== "path" ||
    selected.dataset.closed === "true"
  ) {
    return null;
  }

  normalizePathForEditing(selected);

  if (
    !Array.isArray(selected._anchors) ||
    selected._anchors.length < 2
  ) {
    return null;
  }

  return selected;
}


function selectedEditablePathForPenInsertion() {
  if (
    selectedItems.length !== 1 ||
    !selected ||
    selected.tagName !== "path"
  ) {
    return null;
  }

  normalizePathForEditing(
    selected
  );

  if (
    !Array.isArray(
      selected._anchors
    ) ||
    selected._anchors.length < 2
  ) {
    return null;
  }

  return selected;
}

function cubicPointLocalAt(a, b, t) {
  const mt = 1 - t;

  return {
    x:
      mt * mt * mt * a.x +
      3 * mt * mt * t *
        a.outX +
      3 * mt * t * t *
        b.inX +
      t * t * t * b.x,
    y:
      mt * mt * mt * a.y +
      3 * mt * mt * t *
        a.outY +
      3 * mt * t * t *
        b.inY +
      t * t * t * b.y
  };
}

function nearestPointOnEditablePath(
  path,
  canvasPoint
) {
  if (
    !path?._anchors?.length
  ) {
    return null;
  }

  const anchors =
    path._anchors;

  const segmentCount =
    path.dataset.closed === "true"
      ? anchors.length
      : anchors.length - 1;

  let best = null;

  for (
    let segmentIndex = 0;
    segmentIndex < segmentCount;
    segmentIndex += 1
  ) {
    const nextIndex =
      (segmentIndex + 1) %
      anchors.length;

    const a =
      anchors[
        segmentIndex
      ];

    const b =
      anchors[
        nextIndex
      ];

    /*
     * Dense coarse sampling gives a stable initial estimate, then a few
     * local refinements converge on the nearest point without depending on
     * SVG browser hit-testing.
     */
    const samples = 28;
    let segmentBest = null;

    for (
      let sampleIndex = 0;
      sampleIndex <= samples;
      sampleIndex += 1
    ) {
      const t =
        sampleIndex /
        samples;

      const local =
        cubicPointLocalAt(
          a,
          b,
          t
        );

      const point =
        canvasPointFromLocal(
          path,
          local.x,
          local.y
        );

      const distance =
        Math.hypot(
          canvasPoint.x -
            point.x,
          canvasPoint.y -
            point.y
        );

      if (
        !segmentBest ||
        distance <
          segmentBest.distance
      ) {
        segmentBest = {
          segmentIndex,
          nextIndex,
          t,
          local,
          point,
          distance
        };
      }
    }

    let centerT =
      segmentBest.t;

    let radius =
      1 / samples;

    for (
      let pass = 0;
      pass < 5;
      pass += 1
    ) {
      const candidates = [
        Math.max(
          0,
          centerT - radius
        ),
        centerT,
        Math.min(
          1,
          centerT + radius
        )
      ];

      candidates.forEach(t => {
        const local =
          cubicPointLocalAt(
            a,
            b,
            t
          );

        const point =
          canvasPointFromLocal(
            path,
            local.x,
            local.y
          );

        const distance =
          Math.hypot(
            canvasPoint.x -
              point.x,
            canvasPoint.y -
              point.y
          );

        if (
          distance <
          segmentBest.distance
        ) {
          segmentBest = {
            segmentIndex,
            nextIndex,
            t,
            local,
            point,
            distance
          };

          centerT = t;
        }
      });

      radius /= 2;
    }

    if (
      !best ||
      segmentBest.distance <
        best.distance
    ) {
      best =
        segmentBest;
    }
  }

  return best;
}

function penSegmentInsertionThreshold() {
  return 12 /
    Math.max(
      zoom,
      0.3
    );
}

function clearPenSegmentInsertionPreview() {
  document
    .querySelector(
      "#penSegmentInsertionPreview"
    )
    ?.remove();
}

function drawPenSegmentInsertionPreview(
  candidate
) {
  clearPenSegmentInsertionPreview();

  if (!candidate) return;

  const marker =
    svgEl(
      "circle",
      {
        id:
          "penSegmentInsertionPreview",
        cx:
          candidate.point.x,
        cy:
          candidate.point.y,
        r: 5.5,
        fill:
          "rgba(124, 58, 237, 0.18)",
        stroke:
          "#7c3aed",
        "stroke-width":
          1.4,
        "pointer-events":
          "none"
      }
    );

  selectionOverlay.appendChild(
    marker
  );
}

function penIntermediateAnchorCandidate(
  point
) {
  const path =
    selectedEditablePathForPenInsertion();

  if (!path) return null;

  const candidate =
    nearestPointOnEditablePath(
      path,
      point
    );

  if (
    !candidate ||
    candidate.distance >
      penSegmentInsertionThreshold()
  ) {
    return null;
  }

  /*
   * Endpoints are reserved for continuation behavior. This avoids the Pen
   * ambiguously inserting an almost-duplicate anchor near an open end.
   */
  if (
    path.dataset.closed !== "true" &&
    (
      (
        candidate.segmentIndex === 0 &&
        candidate.t < 0.08
      ) ||
      (
        candidate.nextIndex ===
          path._anchors.length - 1 &&
        candidate.t > 0.92
      )
    )
  ) {
    return null;
  }

  return {
    path,
    ...candidate
  };
}

function insertPenAnchorOnExistingPath(
  candidate
) {
  if (
    !candidate?.path
  ) {
    return false;
  }

  const path =
    candidate.path;

  bakePathTransformIntoAnchors(
    path
  );

  /*
   * Recompute after baking because the path's local coordinate space has
   * changed to canvas coordinates.
   */
  const bakedCandidate =
    nearestPointOnEditablePath(
      path,
      candidate.point
    );

  if (!bakedCandidate) {
    return false;
  }

  const anchors =
    path._anchors;

  const a =
    anchors[
      bakedCandidate.segmentIndex
    ];

  const b =
    anchors[
      bakedCandidate.nextIndex
    ];

  const split =
    splitCubicAnchorsAtT(
      a,
      b,
      bakedCandidate.t
    );

  a.outX =
    split.previousOut.x;
  a.outY =
    split.previousOut.y;

  b.inX =
    split.nextIn.x;
  b.inY =
    split.nextIn.y;

  const insertionIndex =
    bakedCandidate.nextIndex === 0
      ? anchors.length
      : bakedCandidate.nextIndex;

  anchors.splice(
    insertionIndex,
    0,
    split.anchor
  );

  if (
    path.dataset
      .pathCornerRadii
  ) {
    const radii =
      pathCornerRadii(
        path,
        anchors.length - 1
      );

    radii.splice(
      insertionIndex,
      0,
      0
    );

    path.dataset
      .pathCornerRadii =
        JSON.stringify(
          radii
        );
  }

  selectedAnchorIndex =
    insertionIndex;

  updatePathD(path);

  /*
   * Hand off directly to Vertex Selection after inserting the point.
   * setTool() redraws the selected path in direct-selection mode, so the
   * new anchor remains highlighted and its Bézier handles are immediately
   * available for editing.
   */
  setSelection(
    [path],
    path
  );

  clearPenSegmentInsertionPreview();
  clearPenContinuationPreview();

  setTool("vertex");

  /*
   * setTool() redraws selection, but preserve the exact newly-created anchor
   * explicitly in case any selection-side UI refresh touched anchor state.
   */
  selectedAnchorIndex =
    insertionIndex;

  drawSelection();
  renderLayers();
  updatePathEditingControls();

  recordHistory({
    label:
      "Anchor Point Added",
    detail:
      "Pen inserted anchor on existing path"
  });

  toolStatus.textContent =
    "Vertex Selection Tool — new anchor selected";

  return true;
}

function penContinuationEndpointInfo(path, point) {
  if (!path?._anchors?.length) {
    return null;
  }

  const first = path._anchors[0];
  const last = path._anchors[path._anchors.length - 1];

  const firstPoint = canvasPointFromLocal(
    path,
    first.x,
    first.y
  );

  const lastPoint = canvasPointFromLocal(
    path,
    last.x,
    last.y
  );

  const firstDistance = Math.hypot(
    point.x - firstPoint.x,
    point.y - firstPoint.y
  );

  const lastDistance = Math.hypot(
    point.x - lastPoint.x,
    point.y - lastPoint.y
  );

  return firstDistance <= lastDistance
    ? {
        side: "start",
        anchor: first,
        point: firstPoint,
        distance: firstDistance
      }
    : {
        side: "end",
        anchor: last,
        point: lastPoint,
        distance: lastDistance
      };
}

function penContinuationThreshold() {
  return 22 / Math.max(zoom, 0.3);
}

function clearPenContinuationPreview() {
  penContinuationCandidate = null;

  document
    .querySelector("#penContinuationEndpoint")
    ?.remove();

  document
    .querySelector("#penContinuationPreview")
    ?.remove();

  clearPenSegmentInsertionPreview();
}

function drawPenContinuationPreview(path, endpoint, pointer) {
  clearPenContinuationPreview();

  const snapped = snapPoint(
    pointer,
    [path]
  );

  drawSnapGuides();

  const endpointMarker = svgEl("circle", {
    id: "penContinuationEndpoint",
    cx: endpoint.point.x,
    cy: endpoint.point.y,
    r: 7,
    fill: "rgba(124, 58, 237, 0.16)",
    stroke: "#7c3aed",
    "stroke-width": 1.4,
    "pointer-events": "none"
  });

  selectionOverlay.appendChild(endpointMarker);

  const controlPoint =
    endpoint.side === "end"
      ? canvasPointFromLocal(
          path,
          endpoint.anchor.outX,
          endpoint.anchor.outY
        )
      : canvasPointFromLocal(
          path,
          endpoint.anchor.inX,
          endpoint.anchor.inY
        );

  const preview = svgEl("path", {
    id: "penContinuationPreview",
    fill: "none",
    stroke: "#7c3aed",
    "stroke-width": 1,
    "stroke-dasharray": "4 4",
    "pointer-events": "none"
  });

  preview.setAttribute(
    "d",
    `M ${endpoint.point.x} ${endpoint.point.y} C ${controlPoint.x} ${controlPoint.y}, ${snapped.x} ${snapped.y}, ${snapped.x} ${snapped.y}`
  );

  selectionOverlay.appendChild(preview);

  penContinuationCandidate = {
    path,
    side: endpoint.side
  };
}

function updatePenContinuationHover(point) {
  if (
    activeTool !== "pen" ||
    activePath ||
    penPointerDown
  ) {
    clearPenContinuationPreview();
    return;
  }

  const openPath =
    selectedOpenPathForPenContinuation();

  if (openPath) {
    const endpoint =
      penContinuationEndpointInfo(
        openPath,
        point
      );

    if (
      endpoint &&
      endpoint.distance <=
        penContinuationThreshold()
    ) {
      clearPenSegmentInsertionPreview();

      drawPenContinuationPreview(
        openPath,
        endpoint,
        point
      );

      return;
    }
  }

  clearPenContinuationPreview();

  const insertionCandidate =
    penIntermediateAnchorCandidate(
      point
    );

  if (insertionCandidate) {
    drawPenSegmentInsertionPreview(
      insertionCandidate
    );

    toolStatus.textContent =
      "Click to add anchor point";
  }
}

function beginContinuingSelectedOpenPath(point) {
  const path = selectedOpenPathForPenContinuation();

  if (!path) {
    return false;
  }

  const endpoint = penContinuationEndpointInfo(
    path,
    point
  );

  if (
    !endpoint ||
    endpoint.distance > penContinuationThreshold()
  ) {
    return false;
  }

  clearPenContinuationPreview();

  /*
   * Once an existing path becomes active for Pen construction, bake its
   * transform into anchor coordinates so all subsequently-created anchors
   * stay in the same coordinate space.
   */
  bakePathTransformIntoAnchors(path);

  if (endpoint.side === "start") {
    reverseEditablePathAnchors(path);
  }

  activePath = path;
  activePath.dataset.continuingExistingPath = "true";
  pathAnchors = activePath._anchors;

  activePath.dataset.path = "true";
  activePath.dataset.editorPath = "true";
  activePath.dataset.closed = "false";
  activePath.removeAttribute("data-shape");
  activePath.setAttribute("fill", "none");

  selectedAnchorIndex = pathAnchors.length - 1;

  setSelection(
    [activePath],
    activePath
  );

  /*
   * The endpoint click activates continuation only. It does not create a
   * duplicate anchor. Releasing the pointer then returns to the normal Pen
   * preview state for the next segment.
   */
  penPointerDown = true;
  penDownPoint = {
    x: pathAnchors[pathAnchors.length - 1].x,
    y: pathAnchors[pathAnchors.length - 1].y
  };
  penPendingAnchor = null;

  drawSelection();

  toolStatus.textContent =
    endpoint.side === "start"
      ? "Continuing path from start"
      : "Continuing path from end";

  return true;
}

function startPath(point) {
  activePath = createBaseElement("path");
  activePath.dataset.name = `Path ${objectCounter}`;
  activePath.dataset.path = "true";
  activePath.dataset.editorPath = "true";
  activePath.setAttribute("fill", "none");
  activePath.setAttribute("fill-opacity", Number(fillOpacity.value) / 100);
  activePath.setAttribute("stroke", stroke.value);
  activePath.setAttribute("stroke-width", strokeWidth.value);
  activePath.setAttribute("stroke-opacity", Number(strokeOpacity.value) / 100);
  applyAdvancedStroke(activePath);
  art.appendChild(activePath);

  pathAnchors = [{
    x: point.x,
    y: point.y,
    inX: point.x,
    inY: point.y,
    outX: point.x,
    outY: point.y
  }];

  activePath._anchors = pathAnchors;
  updatePathD(activePath);
  selectElement(activePath);
  renderLayers();
}

function addPathAnchor(point) {
  const anchor = {
    x: point.x,
    y: point.y,
    inX: point.x,
    inY: point.y,
    outX: point.x,
    outY: point.y
  };
  pathAnchors.push(anchor);
  activePath._anchors = pathAnchors;
  updatePathD(activePath);
  return anchor;
}


function anchorHandleCollapsed(
  anchor,
  side
) {
  if (!anchor) return true;

  const x =
    side === "in"
      ? Number(anchor.inX)
      : Number(anchor.outX);

  const y =
    side === "in"
      ? Number(anchor.inY)
      : Number(anchor.outY);

  return (
    Math.hypot(
      x - Number(anchor.x),
      y - Number(anchor.y)
    ) <
    0.001
  );
}

function pathCornerRadii(
  path,
  count =
    path?._anchors?.length || 0
) {
  try {
    const values =
      JSON.parse(
        path?.dataset
          ?.pathCornerRadii ||
        "[]"
      );

    if (
      Array.isArray(values) &&
      values.length === count
    ) {
      return values.map(
        value =>
          Math.max(
            0,
            Number(value) || 0
          )
      );
    }
  } catch (error) {
    console.warn(
      "Could not parse path live-corner radii.",
      error
    );
  }

  return Array(count).fill(0);
}

function pathAnchorCornerAngle(
  path,
  index
) {
  const anchors =
    path?._anchors || [];

  const count =
    anchors.length;

  const closed =
    path?.dataset.closed ===
    "true";

  if (
    count < 3 ||
    (!closed &&
      (
        index === 0 ||
        index === count - 1
      ))
  ) {
    return 0;
  }

  const previous =
    anchors[
      (index - 1 + count) %
      count
    ];

  const current =
    anchors[index];

  const next =
    anchors[
      (index + 1) %
      count
    ];

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

  const aLength =
    Math.max(
      1e-9,
      Math.hypot(ax, ay)
    );

  const bLength =
    Math.max(
      1e-9,
      Math.hypot(bx, by)
    );

  const dot =
    (
      ax * bx +
      ay * by
    ) /
    (
      aLength *
      bLength
    );

  return (
    Math.acos(
      Math.max(
        -1,
        Math.min(1, dot)
      )
    ) *
    180 /
    Math.PI
  );
}

function isPathLiveCornerEligible(
  path,
  index
) {
  const anchors =
    path?._anchors || [];

  const count =
    anchors.length;

  const closed =
    path?.dataset.closed ===
    "true";

  if (
    count < 3 ||
    !anchors[index] ||
    (
      !closed &&
      (
        index === 0 ||
        index === count - 1
      )
    )
  ) {
    return false;
  }

  const previousIndex =
    (index - 1 + count) %
    count;

  const nextIndex =
    (index + 1) %
    count;

  const previous =
    anchors[previousIndex];

  const current =
    anchors[index];

  const next =
    anchors[nextIndex];

  /*
   * Live corners apply where the two segments meeting the anchor are
   * straight. Curved Bézier joins keep their existing handles untouched.
   */
  const incomingStraight =
    anchorHandleCollapsed(
      previous,
      "out"
    ) &&
    anchorHandleCollapsed(
      current,
      "in"
    );

  const outgoingStraight =
    anchorHandleCollapsed(
      current,
      "out"
    ) &&
    anchorHandleCollapsed(
      next,
      "in"
    );

  if (
    !incomingStraight ||
    !outgoingStraight
  ) {
    return false;
  }

  const angle =
    pathAnchorCornerAngle(
      path,
      index
    );

  return (
    angle >=
      MIN_ROUNDABLE_CORNER_ANGLE &&
    angle <
      179.75
  );
}

function pathLiveCornerMaxRadius(
  path,
  index
) {
  if (
    !isPathLiveCornerEligible(
      path,
      index
    )
  ) {
    return 0;
  }

  const anchors =
    path._anchors;

  const count =
    anchors.length;

  const previous =
    anchors[
      (index - 1 + count) %
      count
    ];

  const current =
    anchors[index];

  const next =
    anchors[
      (index + 1) %
      count
    ];

  const previousLength =
    Math.hypot(
      previous.x - current.x,
      previous.y - current.y
    );

  const nextLength =
    Math.hypot(
      next.x - current.x,
      next.y - current.y
    );

  const angle =
    pathAnchorCornerAngle(
      path,
      index
    ) *
    Math.PI /
    180;

  const tanHalf =
    Math.max(
      1e-6,
      Math.tan(
        angle / 2
      )
    );

  const maxTangentDistance =
    Math.min(
      previousLength,
      nextLength
    ) *
    0.45;

  return Math.max(
    0,
    maxTangentDistance *
      tanHalf
  );
}

function pathLiveCornerData(
  path
) {
  const anchors =
    path?._anchors || [];

  const count =
    anchors.length;

  const radii =
    pathCornerRadii(
      path,
      count
    );

  return anchors.map(
    (
      current,
      index
    ) => {
      const eligible =
        isPathLiveCornerEligible(
          path,
          index
        );

      const radius =
        eligible
          ? Math.min(
              radii[index],
              pathLiveCornerMaxRadius(
                path,
                index
              )
            )
          : 0;

      if (
        !eligible ||
        radius <= 0
      ) {
        return {
          radius: 0,
          incoming: {
            x: current.x,
            y: current.y
          },
          outgoing: {
            x: current.x,
            y: current.y
          }
        };
      }

      const previous =
        anchors[
          (index - 1 + count) %
          count
        ];

      const next =
        anchors[
          (index + 1) %
          count
        ];

      const previousDx =
        previous.x -
        current.x;

      const previousDy =
        previous.y -
        current.y;

      const nextDx =
        next.x -
        current.x;

      const nextDy =
        next.y -
        current.y;

      const previousLength =
        Math.max(
          1e-9,
          Math.hypot(
            previousDx,
            previousDy
          )
        );

      const nextLength =
        Math.max(
          1e-9,
          Math.hypot(
            nextDx,
            nextDy
          )
        );

      const angle =
        pathAnchorCornerAngle(
          path,
          index
        ) *
        Math.PI /
        180;

      const tangentDistance =
        Math.min(
          radius /
            Math.max(
              1e-6,
              Math.tan(
                angle / 2
              )
            ),
          previousLength *
            0.45,
          nextLength *
            0.45
        );

      return {
        radius,
        incoming: {
          x:
            current.x +
            (
              previousDx /
              previousLength
            ) *
            tangentDistance,
          y:
            current.y +
            (
              previousDy /
              previousLength
            ) *
            tangentDistance
        },
        outgoing: {
          x:
            current.x +
            (
              nextDx /
              nextLength
            ) *
            tangentDistance,
          y:
            current.y +
            (
              nextDy /
              nextLength
            ) *
            tangentDistance
        }
      };
    }
  );
}

function pathSegmentIsStraight(
  start,
  end
) {
  return (
    anchorHandleCollapsed(
      start,
      "out"
    ) &&
    anchorHandleCollapsed(
      end,
      "in"
    )
  );
}

function roundedEditablePathD(
  path
) {
  const anchors =
    path?._anchors || [];

  const count =
    anchors.length;

  if (!count) return "";

  const closed =
    path.dataset.closed ===
    "true";

  const cornerData =
    pathLiveCornerData(
      path
    );

  const hasCorners =
    cornerData.some(
      corner =>
        corner.radius > 0
    );

  if (!hasCorners) {
    return null;
  }

  const commands = [];

  const startPoint =
    closed
      ? cornerData[0]
          .outgoing
      : {
          x: anchors[0].x,
          y: anchors[0].y
        };

  commands.push(
    `M ${startPoint.x} ${startPoint.y}`
  );

  const segmentCount =
    closed
      ? count
      : count - 1;

  for (
    let step = 0;
    step < segmentCount;
    step++
  ) {
    const startIndex =
      step;

    const endIndex =
      (step + 1) %
      count;

    const start =
      anchors[startIndex];

    const end =
      anchors[endIndex];

    const endCorner =
      cornerData[endIndex];

    const destination =
      endCorner.radius > 0
        ? endCorner.incoming
        : {
            x: end.x,
            y: end.y
          };

    if (
      pathSegmentIsStraight(
        start,
        end
      )
    ) {
      commands.push(
        `L ${destination.x} ${destination.y}`
      );
    } else {
      commands.push(
        `C ${start.outX} ${start.outY}, ${end.inX} ${end.inY}, ${destination.x} ${destination.y}`
      );
    }

    if (
      endCorner.radius > 0
    ) {
      commands.push(
        `Q ${end.x} ${end.y} ${endCorner.outgoing.x} ${endCorner.outgoing.y}`
      );
    }
  }

  if (closed) {
    commands.push("Z");
  }

  return commands.join(" ");
}

function pathLiveCornerBisectorPoint(
  path,
  index,
  distance
) {
  const anchors =
    path?._anchors || [];

  const count =
    anchors.length;

  const current =
    anchors[index];

  const previous =
    anchors[
      (index - 1 + count) %
      count
    ];

  const next =
    anchors[
      (index + 1) %
      count
    ];

  if (
    !current ||
    !previous ||
    !next
  ) {
    return current || {
      x: 0,
      y: 0
    };
  }

  const previousDx =
    previous.x -
    current.x;

  const previousDy =
    previous.y -
    current.y;

  const nextDx =
    next.x -
    current.x;

  const nextDy =
    next.y -
    current.y;

  const previousLength =
    Math.max(
      1e-9,
      Math.hypot(
        previousDx,
        previousDy
      )
    );

  const nextLength =
    Math.max(
      1e-9,
      Math.hypot(
        nextDx,
        nextDy
      )
    );

  let bx =
    previousDx /
      previousLength +
    nextDx /
      nextLength;

  let by =
    previousDy /
      previousLength +
    nextDy /
      nextLength;

  const bisectorLength =
    Math.max(
      1e-9,
      Math.hypot(
        bx,
        by
      )
    );

  bx /= bisectorLength;
  by /= bisectorLength;

  return {
    x:
      current.x +
      bx * distance,
    y:
      current.y +
      by * distance
  };
}

function drawPathLiveCornerControls() {
  if (
    !selected ||
    selected.tagName !==
      "path" ||
    !Array.isArray(
      selected._anchors
    ) ||
    activeTool !== "vertex"
  ) {
    return;
  }

  const selectedIndices =
    selectedAnchorIndices.size
      ? [...selectedAnchorIndices]
      : (
          selectedAnchorIndex !==
          null
            ? [
                selectedAnchorIndex
              ]
            : []
        );

  if (!selectedIndices.length) {
    return;
  }

  const radii =
    pathCornerRadii(
      selected,
      selected._anchors.length
    );

  const baseInset =
    15 /
    Math.max(
      zoom,
      0.05
    );

  selectedIndices
    .filter(index =>
      isPathLiveCornerEligible(
        selected,
        index
      )
    )
    .forEach(index => {
      const anchor =
        selected._anchors[index];

      const radius =
        Math.min(
          radii[index] || 0,
          pathLiveCornerMaxRadius(
            selected,
            index
          )
        );

      const handleDistance =
        Math.max(
          baseInset,
          radius
        );

      const localHandle =
        pathLiveCornerBisectorPoint(
          selected,
          index,
          handleDistance
        );

      const canvasAnchor =
        canvasPointFromLocal(
          selected,
          anchor.x,
          anchor.y
        );

      const canvasHandle =
        canvasPointFromLocal(
          selected,
          localHandle.x,
          localHandle.y
        );

      selectionOverlay.appendChild(
        svgEl(
          "line",
          {
            x1: canvasAnchor.x,
            y1: canvasAnchor.y,
            x2: canvasHandle.x,
            y2: canvasHandle.y,
            class:
              "corner-radius-line path-live-corner-line"
          }
        )
      );

      selectionOverlay.appendChild(
        svgEl(
          "circle",
          {
            cx: canvasHandle.x,
            cy: canvasHandle.y,
            r: selectionScreenSpaceUnits(5),
            class:
              "corner-radius-handle path-live-corner-handle",
            "data-handle":
              "path-corner-radius",
            "data-radius-index":
              index
          }
        )
      );
    });
}


function updatePathD(path) {
  /*
   * Shape Builder GeoJSON/compound paths have authoritative SVG `d` geometry
   * but do not use the editor's `_anchors` model. Do not erase them when a
   * paint-only update happens.
   *
   * Normal editor paths, including temporary one-anchor construction paths,
   * do use `_anchors` and must retain the original update behavior.
   */
  if (
    !Array.isArray(
      path?._anchors
    )
  ) {
    return;
  }

  const anchors =
    path._anchors;

  if (!anchors.length) {
    path.setAttribute(
      "d",
      ""
    );
    return;
  }

  const roundedD =
    roundedEditablePathD(
      path
    );

  if (roundedD) {
    path.setAttribute(
      "d",
      roundedD
    );

    requestAnimationFrame(
      renderFillSeamUnderlayPassive
    );

    if (
      path.dataset.strokeProfile &&
      path.dataset.strokeProfile !==
        "uniform"
    ) {
      refreshStrokeProfile(
        path
      );
    }

    return;
  }

  let d =
    `M ${anchors[0].x} ${anchors[0].y}`;

  for (
    let i = 1;
    i < anchors.length;
    i++
  ) {
    const prev =
      anchors[i - 1];

    const curr =
      anchors[i];

    d +=
      ` C ${prev.outX} ${prev.outY}, ${curr.inX} ${curr.inY}, ${curr.x} ${curr.y}`;
  }

  if (
    path.dataset.closed ===
      "true" &&
    anchors.length > 1
  ) {
    const last =
      anchors[
        anchors.length - 1
      ];

    const first =
      anchors[0];

    d +=
      ` C ${last.outX} ${last.outY}, ${first.inX} ${first.inY}, ${first.x} ${first.y} Z`;
  }

  // Potrace colour traces can carry nested counter contours (e.g. the holes
  // in P/e/o). Keep those holes on the same visible path using even-odd fill
  // rather than emitting each counter as a separately filled object.
  if (Array.isArray(path._holeAnchors)) {
    path._holeAnchors.forEach(holeAnchors => {
      if (!Array.isArray(holeAnchors) || holeAnchors.length < 2) return;
      d += ` M ${holeAnchors[0].x} ${holeAnchors[0].y}`;
      for (let i = 1; i < holeAnchors.length; i++) {
        const prev = holeAnchors[i - 1];
        const curr = holeAnchors[i];
        d += ` C ${prev.outX} ${prev.outY}, ${curr.inX} ${curr.inY}, ${curr.x} ${curr.y}`;
      }
      const last = holeAnchors[holeAnchors.length - 1];
      const first = holeAnchors[0];
      d += ` C ${last.outX} ${last.outY}, ${first.inX} ${first.inY}, ${first.x} ${first.y} Z`;
    });
  }

  // Same-colour cleanup can combine disconnected islands into one SVG object
  // without drawing a bridge between them. These are ordinary filled subpaths,
  // followed by any true holes that belong to each island.
  if (Array.isArray(path._traceExtraContours)) {
    path._traceExtraContours.forEach(extra => {
      const extraAnchors = extra?.anchors;
      if (!Array.isArray(extraAnchors) || extraAnchors.length < 2) return;
      d = bitmapFlattenAppendContourSubpath(d, extraAnchors);
      (extra.holes || []).forEach(holeAnchors => {
        d = bitmapFlattenAppendContourSubpath(d, holeAnchors);
      });
    });
  }

  path.setAttribute(
    "d",
    d
  );

  if (path.dataset.traceContourProxy === "true") {
    bitmapFlattenSyncEditableCompound(path.parentNode);
  }

  requestAnimationFrame(
    renderFillSeamUnderlayPassive
  );

  if (
    path.dataset.strokeProfile &&
    path.dataset.strokeProfile !==
      "uniform"
  ) {
    refreshStrokeProfile(
      path
    );
  }
}


function editableSelectedPath() {
  if (
    selectedItems.length !== 1 ||
    !selected ||
    selected.tagName !== "path"
  ) {
    return null;
  }

  normalizePathForEditing(selected);

  if (
    !Array.isArray(selected._anchors) ||
    selected._anchors.length < 2
  ) {
    return null;
  }

  return selected;
}

function selectedEditableAnchor() {
  const path =
    editableSelectedPath();

  if (
    !path ||
    selectedAnchorIndex === null ||
    !path._anchors[selectedAnchorIndex]
  ) {
    return null;
  }

  return {
    path,
    index: selectedAnchorIndex,
    anchor:
      path._anchors[
        selectedAnchorIndex
      ]
  };
}

function cloneAnchor(anchor) {
  return {
    ...anchor,
    x: Number(anchor.x),
    y: Number(anchor.y),
    inX: Number(anchor.inX),
    inY: Number(anchor.inY),
    outX: Number(anchor.outX),
    outY: Number(anchor.outY)
  };
}

function cubicPointAt(a, b, t) {
  const mt = 1 - t;

  return {
    x:
      mt * mt * mt * a.x +
      3 * mt * mt * t * a.outX +
      3 * mt * t * t * b.inX +
      t * t * t * b.x,
    y:
      mt * mt * mt * a.y +
      3 * mt * mt * t * a.outY +
      3 * mt * t * t * b.inY +
      t * t * t * b.y
  };
}

function splitCubicAnchorsAtT(a, b, t) {
  const clampedT =
    Math.max(
      0.0001,
      Math.min(
        0.9999,
        Number(t)
      )
    );

  const p0 = { x: a.x, y: a.y };
  const p1 = { x: a.outX, y: a.outY };
  const p2 = { x: b.inX, y: b.inY };
  const p3 = { x: b.x, y: b.y };

  const lerpPoint = (p, q) => ({
    x:
      p.x +
      (q.x - p.x) *
        clampedT,
    y:
      p.y +
      (q.y - p.y) *
        clampedT
  });

  const q0 =
    lerpPoint(p0, p1);

  const q1 =
    lerpPoint(p1, p2);

  const q2 =
    lerpPoint(p2, p3);

  const r0 =
    lerpPoint(q0, q1);

  const r1 =
    lerpPoint(q1, q2);

  const s =
    lerpPoint(r0, r1);

  return {
    previousOut: q0,
    nextIn: q2,
    anchor: {
      x: s.x,
      y: s.y,
      inX: r0.x,
      inY: r0.y,
      outX: r1.x,
      outY: r1.y,
      handleMode: "smooth"
    }
  };
}

function splitCubicAnchorsAtHalf(a, b) {
  return splitCubicAnchorsAtT(
    a,
    b,
    0.5
  );
}

function addAnchorPointToSelectedPath() {
  const path =
    editableSelectedPath();

  if (!path) {
    toolStatus.textContent =
      "Select one editable path";
    return;
  }

  const anchors = path._anchors;
  let startIndex =
    selectedAnchorIndex !== null
      ? selectedAnchorIndex
      : 0;

  let endIndex =
    startIndex + 1;

  if (endIndex >= anchors.length) {
    if (
      path.dataset.closed === "true"
    ) {
      endIndex = 0;
    } else {
      startIndex =
        Math.max(
          0,
          anchors.length - 2
        );

      endIndex =
        startIndex + 1;
    }
  }

  const a =
    anchors[startIndex];

  const b =
    anchors[endIndex];

  const split =
    splitCubicAnchorsAtHalf(
      a,
      b
    );

  a.outX =
    split.previousOut.x;
  a.outY =
    split.previousOut.y;

  b.inX =
    split.nextIn.x;
  b.inY =
    split.nextIn.y;

  const insertionIndex =
    endIndex === 0
      ? anchors.length
      : endIndex;

  anchors.splice(
    insertionIndex,
    0,
    split.anchor
  );

  const shiftedConstraints =
    pathGeometryConstraints(path)
      .map(constraint => {
        const next = { ...constraint };

        ["a", "b", "pivot", "c"].forEach(key => {
          if (
            Number.isInteger(next[key]) &&
            next[key] >= insertionIndex
          ) {
            next[key] += 1;
          }
        });

        return next;
      });

  savePathGeometryConstraints(
    path,
    shiftedConstraints
  );

  remapDocumentGeometryConstraintsForAnchorInsert(
    path,
    insertionIndex
  );

  remapSelectedVertexRefsForAnchorInsert(
    path,
    insertionIndex
  );

  selectedAnchorIndex =
    insertionIndex;

  updatePathD(path);
  drawSelection();
  updatePathEditingControls();

  recordHistory({
    label: "Anchor Point Added",
    detail:
      `${anchors.length} anchors`
  });
}

function deleteSelectedAnchorPoint() {
  const selectedAnchor =
    selectedEditableAnchor();

  if (!selectedAnchor) {
    toolStatus.textContent =
      "Select an anchor point";
    return;
  }

  const {
    path,
    index
  } = selectedAnchor;

  const minimum =
    path.dataset.closed === "true"
      ? 3
      : 2;

  if (
    path._anchors.length <= minimum
  ) {
    toolStatus.textContent =
      "Path needs more anchors before one can be deleted";
    return;
  }

  path._anchors.splice(
    index,
    1
  );

  const remappedConstraints =
    pathGeometryConstraints(path)
      .filter(constraint => {
        const indices =
          constraint.type === "distance"
            ? [constraint.a, constraint.b]
            : [constraint.a, constraint.pivot, constraint.c];

        return !indices.includes(index);
      })
      .map(constraint => {
        const next = { ...constraint };

        ["a", "b", "pivot", "c"].forEach(key => {
          if (
            Number.isInteger(next[key]) &&
            next[key] > index
          ) {
            next[key] -= 1;
          }
        });

        return next;
      });

  savePathGeometryConstraints(
    path,
    remappedConstraints
  );

  remapDocumentGeometryConstraintsForAnchorDelete(
    path,
    index
  );

  remapSelectedVertexRefsForAnchorDelete(
    path,
    index
  );

  if (
    path.dataset
      .pathCornerRadii
  ) {
    const oldCount =
      path._anchors.length + 1;

    const radii =
      pathCornerRadii(
        path,
        oldCount
      );

    radii.splice(
      index,
      1
    );

    path.dataset
      .pathCornerRadii =
        JSON.stringify(
          radii
        );
  }

  selectedAnchorIndices.clear();

  selectedAnchorIndex =
    Math.min(
      index,
      path._anchors.length - 1
    );

  updatePathD(path);
  drawSelection();
  updatePathEditingControls();

  recordHistory({
    label: "Anchor Point Deleted",
    detail:
      `${path._anchors.length} anchors remain`
  });
}

function anchorNeighborDirection(
  path,
  index
) {
  const anchors =
    path._anchors;

  const current =
    anchors[index];

  const previous =
    anchors[index - 1] ||
    (
      path.dataset.closed === "true"
        ? anchors[
            anchors.length - 1
          ]
        : null
    );

  const next =
    anchors[index + 1] ||
    (
      path.dataset.closed === "true"
        ? anchors[0]
        : null
    );

  let vx = 1;
  let vy = 0;

  if (previous && next) {
    vx =
      next.x - previous.x;
    vy =
      next.y - previous.y;
  } else if (next) {
    vx =
      next.x - current.x;
    vy =
      next.y - current.y;
  } else if (previous) {
    vx =
      current.x - previous.x;
    vy =
      current.y - previous.y;
  }

  const length =
    Math.hypot(vx, vy) || 1;

  return {
    x: vx / length,
    y: vy / length,
    previous,
    next
  };
}

function smoothSelectedAnchor() {
  const selectedAnchor =
    selectedEditableAnchor();

  if (!selectedAnchor) {
    toolStatus.textContent =
      "Select an anchor point";
    return;
  }

  const {
    path,
    index,
    anchor
  } = selectedAnchor;

  const direction =
    anchorNeighborDirection(
      path,
      index
    );

  const previousLength =
    direction.previous
      ? Math.hypot(
          anchor.x -
            direction.previous.x,
          anchor.y -
            direction.previous.y
        ) / 3
      : 0;

  const nextLength =
    direction.next
      ? Math.hypot(
          direction.next.x -
            anchor.x,
          direction.next.y -
            anchor.y
        ) / 3
      : 0;

  const existingIn =
    Math.hypot(
      anchor.inX - anchor.x,
      anchor.inY - anchor.y
    );

  const existingOut =
    Math.hypot(
      anchor.outX - anchor.x,
      anchor.outY - anchor.y
    );

  const inLength =
    existingIn > .5
      ? existingIn
      : previousLength;

  const outLength =
    existingOut > .5
      ? existingOut
      : nextLength;

  anchor.inX =
    anchor.x -
    direction.x * inLength;

  anchor.inY =
    anchor.y -
    direction.y * inLength;

  anchor.outX =
    anchor.x +
    direction.x * outLength;

  anchor.outY =
    anchor.y +
    direction.y * outLength;

  anchor.handleMode =
    "smooth";

  updatePathD(path);
  drawSelection();

  recordHistory({
    label: "Anchor Converted to Smooth",
    detail: "Handles joined"
  });
}

function cornerSelectedAnchor() {
  const selectedAnchor =
    selectedEditableAnchor();

  if (!selectedAnchor) {
    toolStatus.textContent =
      "Select an anchor point";
    return;
  }

  const {
    path,
    anchor
  } = selectedAnchor;

  anchor.inX = anchor.x;
  anchor.inY = anchor.y;
  anchor.outX = anchor.x;
  anchor.outY = anchor.y;
  anchor.handleMode =
    "corner";

  updatePathD(path);
  drawSelection();

  recordHistory({
    label: "Anchor Converted to Corner",
    detail: "Handles collapsed"
  });
}

function breakSelectedAnchorHandles() {
  const selectedAnchor =
    selectedEditableAnchor();

  if (!selectedAnchor) {
    toolStatus.textContent =
      "Select an anchor point";
    return;
  }

  selectedAnchor.anchor.handleMode =
    "broken";

  drawSelection();

  recordHistory({
    label: "Anchor Handles Broken",
    detail: "Handles can move independently"
  });
}

function joinSelectedAnchorHandles() {
  const selectedAnchor =
    selectedEditableAnchor();

  if (!selectedAnchor) {
    toolStatus.textContent =
      "Select an anchor point";
    return;
  }

  const {
    path,
    index,
    anchor
  } = selectedAnchor;

  const inLength =
    Math.hypot(
      anchor.inX - anchor.x,
      anchor.inY - anchor.y
    );

  const outLength =
    Math.hypot(
      anchor.outX - anchor.x,
      anchor.outY - anchor.y
    );

  let vx =
    anchor.outX - anchor.x;

  let vy =
    anchor.outY - anchor.y;

  if (
    Math.hypot(vx, vy) < 1e-9
  ) {
    const direction =
      anchorNeighborDirection(
        path,
        index
      );

    vx = direction.x;
    vy = direction.y;
  }

  const length =
    Math.hypot(vx, vy) || 1;

  const ux =
    vx / length;

  const uy =
    vy / length;

  anchor.outX =
    anchor.x +
    ux * outLength;

  anchor.outY =
    anchor.y +
    uy * outLength;

  anchor.inX =
    anchor.x -
    ux * inLength;

  anchor.inY =
    anchor.y -
    uy * inLength;

  anchor.handleMode =
    "smooth";

  updatePathD(path);
  drawSelection();

  recordHistory({
    label: "Anchor Handles Joined",
    detail: "Handles constrained to one tangent"
  });
}

function cloneEditablePathShell(
  source,
  label = "Path"
) {
  const path =
    document.createElementNS(
      SVG_NS,
      "path"
    );

  [
    "fill",
    "stroke",
    "stroke-width",
    "fill-opacity",
    "stroke-opacity",
    "stroke-linecap",
    "stroke-linejoin",
    "stroke-miterlimit",
    "stroke-dasharray",
    "stroke-dashoffset",
    "vector-effect"
  ].forEach(name => {
    const value =
      source.getAttribute(name);

    if (value !== null) {
      path.setAttribute(
        name,
        value
      );
    }
  });

  objectCounter += 1;
  path.dataset.object = "true";
  path.dataset.name =
    `${label} ${objectCounter}`;
  path.dataset.tx = "0";
  path.dataset.ty = "0";
  path.dataset.rotation = "0";
  path.dataset.scaleX = "1";
  path.dataset.scaleY = "1";
  path.dataset.hidden = "false";
  path.dataset.locked = "false";
  path.dataset.editorPath = "true";

  return path;
}

function transformedAnchorIntoPath(
  source,
  target,
  anchor
) {
  const point =
    canvasPointFromLocal(
      source,
      anchor.x,
      anchor.y
    );

  const inPoint =
    canvasPointFromLocal(
      source,
      anchor.inX,
      anchor.inY
    );

  const outPoint =
    canvasPointFromLocal(
      source,
      anchor.outX,
      anchor.outY
    );

  return {
    ...anchor,
    ...localPointFromCanvas(
      target,
      point
    ),
    inX:
      localPointFromCanvas(
        target,
        inPoint
      ).x,
    inY:
      localPointFromCanvas(
        target,
        inPoint
      ).y,
    outX:
      localPointFromCanvas(
        target,
        outPoint
      ).x,
    outY:
      localPointFromCanvas(
        target,
        outPoint
      ).y
  };
}

function pathEndpointCandidates(path) {
  normalizePathForEditing(path);

  if (
    !path._anchors?.length ||
    path.dataset.closed === "true"
  ) {
    return [];
  }

  const last =
    path._anchors.length - 1;

  return [
    {
      index: 0,
      point:
        canvasPointFromLocal(
          path,
          path._anchors[0].x,
          path._anchors[0].y
        )
    },
    {
      index: last,
      point:
        canvasPointFromLocal(
          path,
          path._anchors[last].x,
          path._anchors[last].y
        )
    }
  ];
}

function joinSelectedOpenPaths() {
  const paths =
    selectedItems.filter(
      element => {
        normalizePathForEditing(
          element
        );

        return (
          element.tagName === "path" &&
          element.dataset.closed !== "true" &&
          Array.isArray(
            element._anchors
          ) &&
          element._anchors.length >= 2
        );
      }
    );

  if (paths.length !== 2) {
    toolStatus.textContent =
      "Select exactly two open editable paths";
    return;
  }

  const [a, b] =
    paths;

  const pairs = [];

  pathEndpointCandidates(a)
    .forEach(aEnd => {
      pathEndpointCandidates(b)
        .forEach(bEnd => {
          pairs.push({
            a: aEnd,
            b: bEnd,
            distance:
              Math.hypot(
                aEnd.point.x -
                  bEnd.point.x,
                aEnd.point.y -
                  bEnd.point.y
              )
          });
        });
    });

  pairs.sort(
    (x, y) =>
      x.distance - y.distance
  );

  const best =
    pairs[0];

  let aAnchors =
    a._anchors.map(cloneAnchor);

  let bAnchors =
    b._anchors.map(cloneAnchor);

  if (best.a.index === 0) {
    aAnchors.reverse();

    aAnchors.forEach(anchor => {
      [
        anchor.inX,
        anchor.outX
      ] = [
        anchor.outX,
        anchor.inX
      ];

      [
        anchor.inY,
        anchor.outY
      ] = [
        anchor.outY,
        anchor.inY
      ];
    });
  }

  if (
    best.b.index ===
    b._anchors.length - 1
  ) {
    bAnchors.reverse();

    bAnchors.forEach(anchor => {
      [
        anchor.inX,
        anchor.outX
      ] = [
        anchor.outX,
        anchor.inX
      ];

      [
        anchor.inY,
        anchor.outY
      ] = [
        anchor.outY,
        anchor.inY
      ];
    });
  }

  const joined =
    cloneEditablePathShell(
      a,
      "Joined Path"
    );

  joined._anchors = [
    ...aAnchors.map(anchor =>
      transformedAnchorIntoPath(
        a,
        joined,
        anchor
      )
    ),
    ...bAnchors.map(anchor =>
      transformedAnchorIntoPath(
        b,
        joined,
        anchor
      )
    )
  ];

  joined.dataset.closed =
    "false";

  joined.setAttribute(
    "fill",
    "none"
  );

  updatePathD(joined);

  const order =
    [...art.children];

  const later =
    order.indexOf(a) >
      order.indexOf(b)
      ? a
      : b;

  art.insertBefore(
    joined,
    later.nextSibling
  );

  a.remove();
  b.remove();

  setSelection(
    [joined],
    joined
  );

  selectedAnchorIndex =
    aAnchors.length - 1;

  renderLayers();
  drawSelection();

  recordHistory({
    label: "Open Paths Joined",
    detail:
      `${joined._anchors.length} anchors`
  });
}

function cutSelectedPathAtAnchor() {
  const selectedAnchor =
    selectedEditableAnchor();

  if (!selectedAnchor) {
    toolStatus.textContent =
      "Select an anchor point to cut";
    return;
  }

  const {
    path,
    index
  } = selectedAnchor;

  const anchors =
    path._anchors.map(
      cloneAnchor
    );

  if (
    path.dataset.closed === "true"
  ) {
    const rotated = [
      ...anchors.slice(index),
      ...anchors.slice(0, index + 1)
    ];

    path._anchors =
      rotated;

    path.dataset.closed =
      "false";

    path.removeAttribute(
      "data-shape"
    );

    path.setAttribute(
      "fill",
      "none"
    );

    selectedAnchorIndex = 0;
    updatePathD(path);
    drawSelection();

    recordHistory({
      label: "Closed Path Cut",
      detail: "Path opened at selected anchor"
    });

    return;
  }

  if (
    index === 0 ||
    index === anchors.length - 1
  ) {
    toolStatus.textContent =
      "Choose an interior anchor to split an open path";
    return;
  }

  const firstAnchors =
    anchors.slice(
      0,
      index + 1
    );

  const secondAnchors =
    anchors.slice(index);

  const secondPath =
    path.cloneNode(false);

  objectCounter += 1;
  secondPath.dataset.object =
    "true";

  secondPath.dataset.name =
    `Cut Path ${objectCounter}`;

  secondPath._anchors =
    secondAnchors;

  secondPath.dataset.editorPath =
    "true";

  secondPath.dataset.closed =
    "false";

  secondPath.setAttribute(
    "fill",
    "none"
  );

  path._anchors =
    firstAnchors;

  path.dataset.closed =
    "false";

  path.setAttribute(
    "fill",
    "none"
  );

  updatePathD(path);
  updatePathD(secondPath);

  art.insertBefore(
    secondPath,
    path.nextSibling
  );

  setSelection(
    [path, secondPath],
    secondPath
  );

  selectedAnchorIndex = 0;

  renderLayers();
  drawSelection();

  recordHistory({
    label: "Path Cut with Scissors",
    detail: "Open path split into two paths"
  });
}

function runPathEditCommand(command) {
  const actions = {
    "add-anchor":
      addAnchorPointToSelectedPath,
    "delete-anchor":
      deleteSelectedAnchorPoint,
    "smooth-anchor":
      smoothSelectedAnchor,
    "corner-anchor":
      cornerSelectedAnchor,
    "break-handles":
      breakSelectedAnchorHandles,
    "join-handles":
      joinSelectedAnchorHandles,
    "join-paths":
      joinSelectedOpenPaths,
    "cut-path":
      cutSelectedPathAtAnchor
  };

  actions[command]?.();
  updatePathEditingControls();
}

function updatePathEditingControls() {
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

  const openPathCount =
    selectedItems.filter(
      element => {
        normalizePathForEditing(
          element
        );

        return (
          element.tagName === "path" &&
          element.dataset.closed !== "true" &&
          Array.isArray(
            element._anchors
          )
        );
      }
    ).length;

  document
    .querySelectorAll(
      "[data-path-edit]"
    )
    .forEach(button => {
      const command =
        button.dataset.pathEdit;

      if (
        command === "join-paths"
      ) {
        button.disabled =
          openPathCount !== 2;
      } else if (
        command === "add-anchor"
      ) {
        button.disabled =
          !path;
      } else {
        button.disabled =
          !hasAnchor;
      }
    });

  if (!pathEditingHint) return;

  if (
    openPathCount === 2 &&
    selectedItems.length === 2
  ) {
    pathEditingHint.textContent =
      "Two open paths selected — Join Paths is available.";
  } else if (!path) {
    pathEditingHint.textContent =
      "Use the Vertex Selection tool and select an editable path.";
  } else if (!hasAnchor) {
    pathEditingHint.textContent =
      "Click an anchor point to select it.";
  } else {
    const mode =
      path._anchors[
        selectedAnchorIndex
      ].handleMode ||
      "broken";

    pathEditingHint.textContent =
      `Anchor ${selectedAnchorIndex + 1} selected — ${mode} handles.`;
  }
}

document
  .querySelectorAll(
    "[data-path-edit]"
  )
  .forEach(button => {
    button.addEventListener(
      "click",
      () => {
        runPathEditCommand(
          button.dataset.pathEdit
        );
      }
    );
  });

function finishPath() {
  clearPenContinuationPreview();

  if (!activePath) return;

  const shouldRecord = pathAnchors.length >= 2;
  const continuedExisting =
    activePath?.dataset?.continuingExistingPath === "true";

  if (pathAnchors.length < 2) {
    activePath.remove();
    selected = null;
    selectedItems = [];
  } else {
    activePath._anchors = pathAnchors.map(a => ({ ...a }));

    if (activePath.dataset.closed === "true") {
      activePath.dataset.shape = "true";
      activePath.setAttribute("fill", fill.value);
    } else {
      activePath.removeAttribute("data-shape");
      activePath.setAttribute("fill", "none");
    }

    delete activePath.dataset.continuingExistingPath;
    selectElement(activePath);
  }

  activePath = null;
  pathAnchors = [];
  penPointerDown = false;
  penPendingAnchor = null;
  renderLayers();
  drawSelection();

  if (shouldRecord) {
    recordHistory({
      label:
        continuedExisting
          ? "Open Path Continued"
          : "Path Created",
      detail:
        continuedExisting
          ? "New segments appended to existing path"
          : "Pen path completed"
    });
  }
}

function cancelPath() {
  clearPenContinuationPreview();

  if (activePath) activePath.remove();
  activePath = null;
  pathAnchors = [];
  penPointerDown = false;
  penPendingAnchor = null;
  selected = null;
  selectedItems = [];
  drawSelection();
  renderLayers();
}

function closePathIfNearFirst(point) {
  if (!activePath || pathAnchors.length < 2) return false;

  const first = pathAnchors[0];
  const screenThreshold = 14 / Math.max(zoom, 0.3);

  return Math.hypot(
    point.x - first.x,
    point.y - first.y
  ) <= screenThreshold;
}

function closeActivePath() {
  clearPenContinuationPreview();

  if (!activePath || pathAnchors.length < 2) return;

  activePath.dataset.closed = "true";
  activePath.dataset.shape = "true";
  activePath.setAttribute("fill", fill.value);
  activePath._anchors = pathAnchors.map(anchor => ({ ...anchor }));
  updatePathD(activePath);

  const completedPath = activePath;

  activePath = null;
  pathAnchors = [];
  penPointerDown = false;
  penDownPoint = null;
  penPendingAnchor = null;

  setSelection([completedPath], completedPath);
  renderLayers();
  recordHistory();
}

