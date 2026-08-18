/* Vector Studio modular baseline — source lines 438-3708 from consolidated app.js.
   Classic-script module: shares the browser global lexical scope with ordered sibling modules. */

/* Curvature Tool */
let curvaturePath = null;
let curvatureAnchors = [];
let curvatureHover = null;
let curvatureDrag = null;
let curvaturePreviewPoint = null;
let curvaturePreviewCorner = false;
let curvatureCornerMode = false;
let curvaturePlacementUndoStack = [];
let curvatureLastClick = {
  time: 0,
  path: null,
  index: -1
};


function curvatureIsActive() {
  return activeTool === "curvature";
}

function curvatureAnchorPoint(
  anchor
) {
  return {
    x:
      Number(anchor.x) || 0,
    y:
      Number(anchor.y) || 0
  };
}




function curvatureSetSmoothHandlesForIndex(
  anchors,
  index
) {
  if (
    !Array.isArray(anchors) ||
    index < 0 ||
    index >= anchors.length
  ) {
    return;
  }

  curvatureSolveAnchorHandles(
    anchors
  );
}



function curvatureSolveLinearSystem(
  matrix,
  values
) {
  const n =
    matrix.length;

  const a =
    matrix.map(
      (
        row,
        index
      ) => [
        ...row.map(
          value =>
            Number(value) || 0
        ),
        Number(values[index]) || 0
      ]
    );

  for (
    let column = 0;
    column < n;
    column += 1
  ) {
    let pivot =
      column;

    for (
      let row =
        column + 1;
      row < n;
      row += 1
    ) {
      if (
        Math.abs(
          a[row][column]
        ) >
        Math.abs(
          a[pivot][column]
        )
      ) {
        pivot = row;
      }
    }

    if (
      Math.abs(
        a[pivot][column]
      ) <
      1e-10
    ) {
      continue;
    }

    if (
      pivot !==
      column
    ) {
      [
        a[pivot],
        a[column]
      ] = [
        a[column],
        a[pivot]
      ];
    }

    const divisor =
      a[column][column];

    for (
      let j = column;
      j <= n;
      j += 1
    ) {
      a[column][j] /=
        divisor;
    }

    for (
      let row = 0;
      row < n;
      row += 1
    ) {
      if (
        row ===
        column
      ) {
        continue;
      }

      const factor =
        a[row][column];

      if (
        Math.abs(factor) <
        1e-12
      ) {
        continue;
      }

      for (
        let j = column;
        j <= n;
        j += 1
      ) {
        a[row][j] -=
          factor *
          a[column][j];
      }
    }
  }

  return a.map(
    row =>
      Number.isFinite(
        row[n]
      )
        ? row[n]
        : 0
  );
}

function curvatureCentripetalStep(
  first,
  second
) {
  /*
   * Use chord-length spacing for the global C2 spline. The previous
   * sqrt(distance) centripetal parameterisation compressed long spans and
   * made unevenly-spaced Curvature clicks tighten abruptly. Chord length
   * tracks geometric distance directly, so curvature is distributed much
   * more evenly across the path while retaining the same C2 solve.
   *
   * Keep the historical function name because it is referenced throughout
   * the Curvature solver; only its spacing policy has changed.
   */
  return Math.max(
    1e-4,
    Math.hypot(
      second.x -
        first.x,
      second.y -
        first.y
    )
  );
}

function curvatureOpenC2Derivatives(
  points
) {
  const count =
    points.length;

  if (count <= 1) {
    return points.map(
      () => ({
        x: 0,
        y: 0
      })
    );
  }

  if (count === 2) {
    const h =
      curvatureCentripetalStep(
        points[0],
        points[1]
      );

    const derivative = {
      x:
        (
          points[1].x -
          points[0].x
        ) /
        h,
      y:
        (
          points[1].y -
          points[0].y
        ) /
        h
    };

    return [
      derivative,
      {
        ...derivative
      }
    ];
  }

  const h = [];

  for (
    let index = 0;
    index < count - 1;
    index += 1
  ) {
    h.push(
      curvatureCentripetalStep(
        points[index],
        points[index + 1]
      )
    );
  }

  const matrix =
    Array.from(
      {
        length:
          count
      },
      () =>
        new Array(
          count
        ).fill(0)
    );

  const rhsX =
    new Array(
      count
    ).fill(0);

  const rhsY =
    new Array(
      count
    ).fill(0);

  matrix[0][0] = 2;
  matrix[0][1] = 1;

  rhsX[0] =
    3 *
    (
      points[1].x -
      points[0].x
    ) /
    h[0];

  rhsY[0] =
    3 *
    (
      points[1].y -
      points[0].y
    ) /
    h[0];

  for (
    let index = 1;
    index < count - 1;
    index += 1
  ) {
    const previousStep =
      h[index - 1];

    const nextStep =
      h[index];

    matrix[index][index - 1] =
      nextStep;

    matrix[index][index] =
      2 *
      (
        previousStep +
        nextStep
      );

    matrix[index][index + 1] =
      previousStep;

    rhsX[index] =
      3 *
      (
        nextStep *
        (
          points[index].x -
          points[index - 1].x
        ) /
        previousStep +
        previousStep *
        (
          points[index + 1].x -
          points[index].x
        ) /
        nextStep
      );

    rhsY[index] =
      3 *
      (
        nextStep *
        (
          points[index].y -
          points[index - 1].y
        ) /
        previousStep +
        previousStep *
        (
          points[index + 1].y -
          points[index].y
        ) /
        nextStep
      );
  }

  matrix[count - 1][count - 2] = 1;
  matrix[count - 1][count - 1] = 2;

  rhsX[count - 1] =
    3 *
    (
      points[count - 1].x -
      points[count - 2].x
    ) /
    h[count - 2];

  rhsY[count - 1] =
    3 *
    (
      points[count - 1].y -
      points[count - 2].y
    ) /
    h[count - 2];

  const derivativeX =
    curvatureSolveLinearSystem(
      matrix,
      rhsX
    );

  const derivativeY =
    curvatureSolveLinearSystem(
      matrix,
      rhsY
    );

  return points.map(
    (
      point,
      index
    ) => ({
      x:
        derivativeX[index],
      y:
        derivativeY[index]
    })
  );
}

function curvatureClosedC2Derivatives(
  points
) {
  const count =
    points.length;

  if (count < 3) {
    return curvatureOpenC2Derivatives(
      points
    );
  }

  const h = [];

  for (
    let index = 0;
    index < count;
    index += 1
  ) {
    h.push(
      curvatureCentripetalStep(
        points[index],
        points[
          (
            index +
            1
          ) %
          count
        ]
      )
    );
  }

  const matrix =
    Array.from(
      {
        length:
          count
      },
      () =>
        new Array(
          count
        ).fill(0)
    );

  const rhsX =
    new Array(
      count
    ).fill(0);

  const rhsY =
    new Array(
      count
    ).fill(0);

  for (
    let index = 0;
    index < count;
    index += 1
  ) {
    const previous =
      (
        index -
        1 +
        count
      ) %
      count;

    const next =
      (
        index +
        1
      ) %
      count;

    const previousStep =
      h[previous];

    const nextStep =
      h[index];

    matrix[index][previous] =
      nextStep;

    matrix[index][index] =
      2 *
      (
        previousStep +
        nextStep
      );

    matrix[index][next] =
      previousStep;

    rhsX[index] =
      3 *
      (
        nextStep *
        (
          points[index].x -
          points[previous].x
        ) /
        previousStep +
        previousStep *
        (
          points[next].x -
          points[index].x
        ) /
        nextStep
      );

    rhsY[index] =
      3 *
      (
        nextStep *
        (
          points[index].y -
          points[previous].y
        ) /
        previousStep +
        previousStep *
        (
          points[next].y -
          points[index].y
        ) /
        nextStep
      );
  }

  const derivativeX =
    curvatureSolveLinearSystem(
      matrix,
      rhsX
    );

  const derivativeY =
    curvatureSolveLinearSystem(
      matrix,
      rhsY
    );

  return points.map(
    (
      point,
      index
    ) => ({
      x:
        derivativeX[index],
      y:
        derivativeY[index]
    })
  );
}


function curvatureSolveAnchorHandles(
  anchors
) {
  if (!Array.isArray(anchors)) {
    return anchors;
  }

  const count =
    anchors.length;

  if (!count) {
    return anchors;
  }

  anchors.forEach(
    anchor => {
      anchor.inX =
        anchor.x;
      anchor.inY =
        anchor.y;
      anchor.outX =
        anchor.x;
      anchor.outY =
        anchor.y;
    }
  );

  const point = anchor => ({
    x:
      Number(anchor?.x) || 0,
    y:
      Number(anchor?.y) || 0
  });

  const applySmoothRun = (
    start,
    end
  ) => {
    const run = [];

    for (
      let index = start;
      index <= end;
      index += 1
    ) {
      run.push(
        point(
          anchors[index]
        )
      );
    }

    const derivatives =
      curvatureOpenC2Derivatives(
        run
      );

    for (
      let localIndex = 0;
      localIndex <
        run.length - 1;
      localIndex += 1
    ) {
      const globalIndex =
        start +
        localIndex;

      const nextGlobalIndex =
        globalIndex +
        1;

      const h =
        curvatureCentripetalStep(
          run[localIndex],
          run[localIndex + 1]
        );

      const startAnchor =
        anchors[
          globalIndex
        ];

      const endAnchor =
        anchors[
          nextGlobalIndex
        ];

      const startPoint =
        run[
          localIndex
        ];

      const endPoint =
        run[
          localIndex + 1
        ];

      const startDerivative =
        derivatives[
          localIndex
        ];

      const endDerivative =
        derivatives[
          localIndex + 1
        ];

      startAnchor.outX =
        startPoint.x +
        startDerivative.x *
        h /
        3;

      startAnchor.outY =
        startPoint.y +
        startDerivative.y *
        h /
        3;

      endAnchor.inX =
        endPoint.x -
        endDerivative.x *
        h /
        3;

      endAnchor.inY =
        endPoint.y -
        endDerivative.y *
        h /
        3;
    }
  };

  let runStart = 0;

  for (
    let index = 1;
    index < count;
    index += 1
  ) {
    if (
      anchors[index]
        .curvatureCorner ===
        true
    ) {
      applySmoothRun(
        runStart,
        index
      );

      runStart =
        index;
    }
  }

  applySmoothRun(
    runStart,
    count - 1
  );

  /*
   * A Curvature corner is a TRUE corner. Option/Alt-created corners must not
   * retain generated Bezier handles at the corner vertex itself. The smooth
   * runs on either side still solve their neighbouring handles normally, but
   * both handles on the corner collapse exactly onto the anchor.
   */
  for (
    let index = 0;
    index < count;
    index += 1
  ) {
    const anchor =
      anchors[index];

    if (
      anchor.curvatureCorner !==
        true
    ) {
      continue;
    }

    anchor.inX =
      anchor.x;
    anchor.inY =
      anchor.y;
    anchor.outX =
      anchor.x;
    anchor.outY =
      anchor.y;
  }

  for (
    let index = 1;
    index < count;
    index += 1
  ) {
    const current =
      anchors[index];

    if (
      current.curvatureLineIn ===
        true
    ) {
      const previous =
        anchors[
          index - 1
        ];

      previous.outX =
        previous.x;
      previous.outY =
        previous.y;
      current.inX =
        current.x;
      current.inY =
        current.y;
    }
  }

  return anchors;
}

function curvatureCloneAnchors(
  anchors
) {
  return (
    Array.isArray(anchors)
      ? anchors.map(
          anchor => ({
            ...anchor
          })
        )
      : []
  );
}

function curvaturePathDFromAnchors(
  anchors,
  closed = false
) {
  if (!anchors.length) {
    return "";
  }

  let d =
    `M ${anchors[0].x} ${anchors[0].y}`;

  for (
    let index = 1;
    index < anchors.length;
    index += 1
  ) {
    const previous =
      anchors[index - 1];

    const current =
      anchors[index];

    d +=
      ` C ${previous.outX} ${previous.outY}, ${current.inX} ${current.inY}, ${current.x} ${current.y}`;
  }

  if (
    closed &&
    anchors.length > 1
  ) {
    const last =
      anchors[anchors.length - 1];

    const first =
      anchors[0];

    d +=
      ` C ${last.outX} ${last.outY}, ${first.inX} ${first.inY}, ${first.x} ${first.y} Z`;
  }

  return d;
}


function curvatureClosedPreviewAnchors() {
  if (
    !curvaturePath ||
    curvaturePath._anchors.length < 3 ||
    curvatureHover?.type !==
      "anchor" ||
    curvatureHover.path !==
      curvaturePath ||
    curvatureHover.index !==
      0
  ) {
    return null;
  }

  const anchors =
    curvatureCloneAnchors(
      curvaturePath._anchors
    );

  curvatureSolveClosedAnchorHandles(
    anchors
  );

  return anchors;
}

function curvaturePredictedAnchors() {
  if (
    !curvaturePath ||
    !curvaturePreviewPoint
  ) {
    return null;
  }

  const anchors =
    curvatureCloneAnchors(
      curvaturePath._anchors
    );

  const local =
    localPointFromCanvas(
      curvaturePath,
      curvaturePreviewPoint
    );

  const previewAnchor =
    curvatureCreateAnchor(
      local,
      curvaturePreviewCorner
    );

  previewAnchor.curvatureLineIn =
    false;

  anchors.push(
    previewAnchor
  );

  curvatureSolveAnchorHandles(
    anchors
  );

  return anchors;
}

function curvatureMakeCorner(
  path,
  index,
  {
    straightIncoming = false
  } = {}
) {
  const anchor =
    path?._anchors?.[index];

  if (!anchor) {
    return false;
  }

  anchor.curvatureCorner =
    true;

  anchor.curvatureLineIn =
    Boolean(
      straightIncoming
    );

  curvatureRecomputeSmoothHandles(
    path
  );

  return true;
}




function curvatureSolveClosedAnchorHandles(
  anchors
) {
  if (
    !Array.isArray(anchors) ||
    anchors.length < 3
  ) {
    return curvatureSolveAnchorHandles(
      anchors
    );
  }

  const count =
    anchors.length;

  const points =
    anchors.map(
      anchor => ({
        x:
          Number(anchor?.x) || 0,
        y:
          Number(anchor?.y) || 0
      })
    );

  anchors.forEach(
    anchor => {
      anchor.inX =
        anchor.x;
      anchor.inY =
        anchor.y;
      anchor.outX =
        anchor.x;
      anchor.outY =
        anchor.y;
    }
  );

  const cornerIndices =
    anchors
      .map(
        (
          anchor,
          index
        ) =>
          anchor.curvatureCorner
            ? index
            : -1
      )
      .filter(
        index =>
          index >= 0
      );

  if (
    cornerIndices.length === 0
  ) {
    /*
     * Fully smooth closed loop: solve all derivatives periodically so point 0
     * has no special endpoint treatment.
     */
    const derivatives =
      curvatureClosedC2Derivatives(
        points
      );

    for (
      let index = 0;
      index < count;
      index += 1
    ) {
      const next =
        (
          index +
          1
        ) %
        count;

      const h =
        curvatureCentripetalStep(
          points[index],
          points[next]
        );

      anchors[index].outX =
        points[index].x +
        derivatives[index].x *
        h /
        3;

      anchors[index].outY =
        points[index].y +
        derivatives[index].y *
        h /
        3;

      anchors[next].inX =
        points[next].x -
        derivatives[next].x *
        h /
        3;

      anchors[next].inY =
        points[next].y -
        derivatives[next].y *
        h /
        3;
    }
  } else if (
    cornerIndices.length === 1
  ) {
    /*
     * IMPORTANT:
     * With one corner, that same corner is both ends of ONE smooth run that
     * travels around the entire closed loop.
     *
     * The previous implementation produced runIndices=[corner] because
     * start===end, leaving every other handle collapsed at its anchor. That
     * made all vertices LOOK like corners even though their semantic flags
     * were still smooth.
     *
     * Duplicate the single corner at the end of the run:
     *   corner, next, ..., previous, corner
     * so an open C2 solve can create independent incoming/outgoing tangents
     * at the corner while every other vertex remains smooth.
     */
    const corner =
      cornerIndices[0];

    const runIndices =
      [corner];

    for (
      let step = 1;
      step <= count;
      step += 1
    ) {
      runIndices.push(
        (
          corner +
          step
        ) %
        count
      );
    }

    const runPoints =
      runIndices.map(
        index =>
          points[index]
      );

    const derivatives =
      curvatureOpenC2Derivatives(
        runPoints
      );

    for (
      let localIndex = 0;
      localIndex <
        runIndices.length - 1;
      localIndex += 1
    ) {
      const currentIndex =
        runIndices[
          localIndex
        ];

      const nextIndex =
        runIndices[
          localIndex + 1
        ];

      const h =
        curvatureCentripetalStep(
          runPoints[
            localIndex
          ],
          runPoints[
            localIndex + 1
          ]
        );

      anchors[
        currentIndex
      ].outX =
        runPoints[
          localIndex
        ].x +
        derivatives[
          localIndex
        ].x *
        h /
        3;

      anchors[
        currentIndex
      ].outY =
        runPoints[
          localIndex
        ].y +
        derivatives[
          localIndex
        ].y *
        h /
        3;

      anchors[
        nextIndex
      ].inX =
        runPoints[
          localIndex + 1
        ].x -
        derivatives[
          localIndex + 1
        ].x *
        h /
        3;

      anchors[
        nextIndex
      ].inY =
        runPoints[
          localIndex + 1
        ].y -
        derivatives[
          localIndex + 1
        ].y *
        h /
        3;
    }
  } else {
    /*
     * Two or more corners split the loop into independent smooth runs.
     * Each corner belongs to the end of one run and the start of the next,
     * giving it independent incoming and outgoing tangents.
     */
    for (
      let cornerNumber = 0;
      cornerNumber <
        cornerIndices.length;
      cornerNumber += 1
    ) {
      const start =
        cornerIndices[
          cornerNumber
        ];

      const end =
        cornerIndices[
          (
            cornerNumber +
            1
          ) %
          cornerIndices.length
        ];

      const runIndices =
        [start];

      let cursor =
        start;

      while (
        cursor !==
        end
      ) {
        cursor =
          (
            cursor +
            1
          ) %
          count;

        runIndices.push(
          cursor
        );
      }

      const runPoints =
        runIndices.map(
          index =>
            points[index]
        );

      const derivatives =
        curvatureOpenC2Derivatives(
          runPoints
        );

      for (
        let localIndex = 0;
        localIndex <
          runIndices.length - 1;
        localIndex += 1
      ) {
        const currentIndex =
          runIndices[
            localIndex
          ];

        const nextIndex =
          runIndices[
            localIndex + 1
          ];

        const h =
          curvatureCentripetalStep(
            runPoints[
              localIndex
            ],
            runPoints[
              localIndex + 1
            ]
          );

        anchors[
          currentIndex
        ].outX =
          runPoints[
            localIndex
          ].x +
          derivatives[
            localIndex
          ].x *
          h /
          3;

        anchors[
          currentIndex
        ].outY =
          runPoints[
            localIndex
          ].y +
          derivatives[
            localIndex
          ].y *
          h /
          3;

        anchors[
          nextIndex
        ].inX =
          runPoints[
            localIndex + 1
          ].x -
          derivatives[
            localIndex + 1
          ].x *
          h /
          3;

        anchors[
          nextIndex
        ].inY =
          runPoints[
            localIndex + 1
          ].y -
          derivatives[
            localIndex + 1
          ].y *
          h /
          3;
      }
    }
  }

  /* Closed paths follow the same true-corner rule as open Curvature paths. */
  for (
    let index = 0;
    index < count;
    index += 1
  ) {
    const anchor =
      anchors[index];

    if (
      anchor.curvatureCorner !==
        true
    ) {
      continue;
    }

    anchor.inX =
      anchor.x;
    anchor.inY =
      anchor.y;
    anchor.outX =
      anchor.x;
    anchor.outY =
      anchor.y;
  }

  for (
    let index = 0;
    index < count;
    index += 1
  ) {
    const current =
      anchors[index];

    if (
      current.curvatureLineIn !==
        true
    ) {
      continue;
    }

    const previous =
      anchors[
        (
          index -
          1 +
          count
        ) %
        count
      ];

    previous.outX =
      previous.x;
    previous.outY =
      previous.y;
    current.inX =
      current.x;
    current.inY =
      current.y;
  }

  return anchors;
}


window.getCurvatureDiagnostics =
  function getCurvatureDiagnostics(
    path =
      selected
  ) {
    if (
      !path ||
      !Array.isArray(
        path._anchors
      )
    ) {
      return null;
    }

    return {
      closed:
        path.dataset.closed ===
        "true",
      vertexCount:
        path._anchors.length,
      corners:
        path._anchors.map(
          (
            anchor,
            index
          ) => ({
            index,
            corner:
              Boolean(
                anchor.curvatureCorner
              ),
            straightIncoming:
              Boolean(
                anchor.curvatureLineIn
              ),
            inHandleLength:
              Math.hypot(
                Number(anchor.x) -
                  Number(anchor.inX),
                Number(anchor.y) -
                  Number(anchor.inY)
              ),
            outHandleLength:
              Math.hypot(
                Number(anchor.outX) -
                  Number(anchor.x),
                Number(anchor.outY) -
                  Number(anchor.y)
              )
          })
        )
    };
  };

function curvatureRecomputeSmoothHandles(
  path
) {
  if (
    !path ||
    !Array.isArray(
      path._anchors
    )
  ) {
    return;
  }

  if (
    path.dataset.closed ===
      "true" &&
    path._anchors.length >= 3
  ) {
    curvatureSolveClosedAnchorHandles(
      path._anchors
    );
  } else {
    curvatureSolveAnchorHandles(
      path._anchors
    );
  }

  updatePathD(
    path
  );
}

function curvatureCreateAnchor(
  point,
  corner = false
) {
  return {
    x:
      point.x,
    y:
      point.y,
    inX:
      point.x,
    inY:
      point.y,
    outX:
      point.x,
    outY:
      point.y,
    curvatureCorner:
      Boolean(corner),
    curvatureLineIn:
      false
  };
}


function curvaturePushPlacementUndoState() {
  if (
    !curvaturePath ||
    !Array.isArray(
      curvaturePath._anchors
    )
  ) {
    return;
  }

  curvaturePlacementUndoStack.push(
    curvatureCloneAnchors(
      curvaturePath._anchors
    )
  );

  if (
    curvaturePlacementUndoStack.length >
      100
  ) {
    curvaturePlacementUndoStack.shift();
  }
}

function curvatureUndoLastPlacement() {
  if (
    !curvaturePath
  ) {
    return false;
  }

  if (
    curvaturePath._anchors
      ?.length <= 1
  ) {
    curvaturePath.remove();

    curvaturePath =
      null;

    curvatureAnchors =
      [];

    curvaturePlacementUndoStack =
      [];

    curvaturePreviewPoint =
      null;

    curvaturePreviewCorner =
      false;

    selected =
      null;

    selectedItems =
      [];

    renderLayers();
    drawSelection();

    toolStatus.textContent =
      "Curvature Tool";

    scheduleAutosave();

    return true;
  }

  const previous =
    curvaturePlacementUndoStack.pop();

  if (
    previous &&
    previous.length
  ) {
    curvaturePath._anchors =
      curvatureCloneAnchors(
        previous
      );
  } else {
    curvaturePath._anchors.pop();
  }

  curvatureAnchors =
    curvaturePath._anchors;

  curvatureRecomputeSmoothHandles(
    curvaturePath
  );

  selectElement(
    curvaturePath
  );

  renderLayers();
  drawSelection();
  scheduleAutosave();

  toolStatus.textContent =
    `Curvature: ${curvaturePath._anchors.length} point${curvaturePath._anchors.length === 1 ? "" : "s"} • Ctrl/Cmd+Z removes last point`;

  return true;
}

function curvatureBeginPath(
  point,
  corner = false
) {
  const path =
    createBaseElement(
      "path"
    );

  path.dataset.name =
    `Path ${objectCounter}`;

  path.dataset.path =
    "true";

  path.dataset.editorPath =
    "true";

  path.dataset.curvaturePath =
    "true";

  path.setAttribute(
    "fill",
    "none"
  );

  path.setAttribute(
    "fill-opacity",
    Number(fillOpacity.value) /
      100
  );

  path.setAttribute(
    "stroke",
    stroke.value
  );

  path.setAttribute(
    "stroke-width",
    strokeWidth.value
  );

  path.setAttribute(
    "stroke-opacity",
    Number(strokeOpacity.value) /
      100
  );

  applyAdvancedStroke(
    path
  );

  art.appendChild(
    path
  );

  /*
   * A freshly-created path has no transform, so the pointer's artboard
   * coordinates are also its local coordinates.
   */
  curvaturePlacementUndoStack =
    [];

  curvatureAnchors = [
    curvatureCreateAnchor(
      point,
      corner
    )
  ];

  path._anchors =
    curvatureAnchors;

  curvaturePath =
    path;

  selectElement(
    path
  );

  updatePathD(
    path
  );

  renderLayers();
  drawSelection();

  toolStatus.textContent =
    "Curvature: click to add smooth points • Alt/Option for corner • click first point to close";

  return path;
}

function curvatureFinishPath(
  closed = false
) {
  if (!curvaturePath) {
    return;
  }

  if (
    closed &&
    curvaturePath._anchors
      ?.length >= 3
  ) {
    curvaturePath.dataset.closed =
      "true";

    curvaturePath.dataset.shape =
      "true";

    curvaturePath.setAttribute(
      "fill",
      fill.value
    );
  } else {
    curvaturePath.removeAttribute(
      "data-shape"
    );

    curvaturePath.setAttribute(
      "fill",
      "none"
    );
  }

  curvaturePath._anchors =
    curvaturePath._anchors
      .map(
        anchor => ({
          ...anchor
        })
      );

  curvatureRecomputeSmoothHandles(
    curvaturePath
  );

  selectElement(
    curvaturePath
  );

  renderLayers();

  recordHistory({
    label:
      "Curvature Path Created",
    detail:
      closed
        ? "Closed path"
        : "Open path"
  });

  scheduleAutosave();

  curvaturePath =
    null;

  curvatureAnchors =
    [];

  curvaturePlacementUndoStack =
    [];

  curvaturePreviewPoint =
    null;

  curvaturePreviewCorner =
    false;

  drawSelection();

  toolStatus.textContent =
    "Curvature Tool";
}

function curvatureHitAnchor(
  clientX,
  clientY,
  path =
    selected
) {
  if (
    !path ||
    path.tagName !==
      "path" ||
    !Array.isArray(
      path._anchors
    )
  ) {
    return null;
  }

  const point =
    pointerPosition({
      clientX,
      clientY
    });

  const threshold =
    10 /
    Math.max(
      zoom,
      0.3
    );

  let best =
    null;

  path._anchors
    .forEach(
      (
        anchor,
        index
      ) => {
        const canvas =
          canvasPointFromLocal(
            path,
            anchor.x,
            anchor.y
          );

        const distance =
          Math.hypot(
            canvas.x -
              point.x,
            canvas.y -
              point.y
          );

        if (
          distance <=
            threshold &&
          (
            !best ||
            distance <
              best.distance
          )
        ) {
          best = {
            path,
            index,
            anchor,
            point:
              canvas,
            distance
          };
        }
      }
    );

  return best;
}

function curvatureClosestPointOnLine(
  point,
  a,
  b
) {
  const abx =
    b.x -
    a.x;

  const aby =
    b.y -
    a.y;

  const lengthSq =
    abx *
      abx +
    aby *
      aby;

  if (
    lengthSq <=
    1e-12
  ) {
    return {
      x:
        a.x,
      y:
        a.y,
      t:
        0
    };
  }

  let t =
    (
      (
        point.x -
        a.x
      ) *
        abx +
      (
        point.y -
        a.y
      ) *
        aby
    ) /
    lengthSq;

  t =
    Math.max(
      0,
      Math.min(
        1,
        t
      )
    );

  return {
    x:
      a.x +
      abx *
      t,
    y:
      a.y +
      aby *
      t,
    t
  };
}

function curvatureHitSegment(
  clientX,
  clientY,
  path =
    selected
) {
  if (
    !path ||
    path.tagName !==
      "path" ||
    !Array.isArray(
      path._anchors
    ) ||
    path._anchors.length < 2
  ) {
    return null;
  }

  const point =
    pointerPosition({
      clientX,
      clientY
    });

  const threshold =
    9 /
    Math.max(
      zoom,
      0.3
    );

  let best =
    null;

  const count =
    path._anchors.length;

  const segmentCount =
    path.dataset.closed ===
      "true"
      ? count
      : count - 1;

  for (
    let index = 0;
    index <
    segmentCount;
    index += 1
  ) {
    const nextIndex =
      (
        index + 1
      ) %
      count;

    const aAnchor =
      path._anchors[index];

    const bAnchor =
      path._anchors[
        nextIndex
      ];

    const a =
      canvasPointFromLocal(
        path,
        aAnchor.x,
        aAnchor.y
      );

    const b =
      canvasPointFromLocal(
        path,
        bAnchor.x,
        bAnchor.y
      );

    /*
     * Use a line approximation for hit-testing. Once the point is inserted,
     * the curvature handle recompute makes the resulting path smooth.
     */
    const closest =
      curvatureClosestPointOnLine(
        point,
        a,
        b
      );

    const distance =
      Math.hypot(
        closest.x -
          point.x,
        closest.y -
          point.y
      );

    if (
      distance <=
        threshold &&
      (
        !best ||
        distance <
          best.distance
      )
    ) {
      best = {
        path,
        index,
        nextIndex,
        point:
          closest,
        distance
      };
    }
  }

  return best;
}

function curvatureInsertPoint(
  path,
  segment,
  corner = false
) {
  if (
    !path ||
    !segment
  ) {
    return false;
  }

  const local =
    localPointFromCanvas(
      path,
      segment.point
    );

  const insertionIndex =
    segment.nextIndex ===
      0
      ? path._anchors
          .length
      : segment.nextIndex;

  path._anchors.splice(
    insertionIndex,
    0,
    curvatureCreateAnchor(
      local,
      corner
    )
  );

  curvatureRecomputeSmoothHandles(
    path
  );

  selected =
    path;

  selectedItems =
    [path];

  recordHistory({
    label:
      "Curvature Point Added",
    detail:
      `Vertex ${insertionIndex + 1}`
  });

  scheduleAutosave();
  drawSelection();

  return true;
}



function curvatureVectorLength(
  dx,
  dy
) {
  return Math.hypot(
    Number(dx) || 0,
    Number(dy) || 0
  );
}

function curvatureNormalizeVector(
  dx,
  dy
) {
  const length =
    Math.max(
      1e-8,
      curvatureVectorLength(
        dx,
        dy
      )
    );

  return {
    x: dx / length,
    y: dy / length
  };
}

function curvatureSmoothCornerPreservingShape(
  path,
  index
) {
  const anchors =
    path?._anchors;

  const anchor =
    anchors?.[index];

  if (
    !anchor ||
    !anchor.curvatureCorner
  ) {
    return false;
  }

  const semanticState =
    curvatureAnchorStateSnapshot(
      anchors
    );

  const closed =
    path.dataset.closed ===
    "true";

  const previous =
    index > 0
      ? anchors[index - 1]
      : closed
        ? anchors[
            anchors.length - 1
          ]
        : null;

  const next =
    index <
      anchors.length - 1
      ? anchors[index + 1]
      : closed
        ? anchors[0]
        : null;

  const inDx =
    Number(anchor.x) -
    Number(anchor.inX);

  const inDy =
    Number(anchor.y) -
    Number(anchor.inY);

  const outDx =
    Number(anchor.outX) -
    Number(anchor.x);

  const outDy =
    Number(anchor.outY) -
    Number(anchor.y);

  let inLength =
    curvatureVectorLength(
      inDx,
      inDy
    );

  let outLength =
    curvatureVectorLength(
      outDx,
      outDy
    );

  if (
    inLength < 1e-6 &&
    previous
  ) {
    inLength =
      Math.hypot(
        Number(anchor.x) -
        Number(previous.x),
        Number(anchor.y) -
        Number(previous.y)
      ) / 3;
  }

  if (
    outLength < 1e-6 &&
    next
  ) {
    outLength =
      Math.hypot(
        Number(next.x) -
        Number(anchor.x),
        Number(next.y) -
        Number(anchor.y)
      ) / 3;
  }

  const incomingDirection =
    inLength > 1e-6
      ? curvatureNormalizeVector(
          inDx,
          inDy
        )
      : previous
        ? curvatureNormalizeVector(
            Number(anchor.x) -
            Number(previous.x),
            Number(anchor.y) -
            Number(previous.y)
          )
        : null;

  const outgoingDirection =
    outLength > 1e-6
      ? curvatureNormalizeVector(
          outDx,
          outDy
        )
      : next
        ? curvatureNormalizeVector(
            Number(next.x) -
            Number(anchor.x),
            Number(next.y) -
            Number(anchor.y)
          )
        : null;

  let tangent =
    null;

  if (
    incomingDirection &&
    outgoingDirection
  ) {
    const weightIn =
      Math.max(
        inLength,
        1
      );

    const weightOut =
      Math.max(
        outLength,
        1
      );

    const combinedX =
      incomingDirection.x *
        weightIn +
      outgoingDirection.x *
        weightOut;

    const combinedY =
      incomingDirection.y *
        weightIn +
      outgoingDirection.y *
        weightOut;

    const combinedMagnitude =
      curvatureVectorLength(
        combinedX,
        combinedY
      );

    if (
      combinedMagnitude >
      1e-5
    ) {
      tangent =
        curvatureNormalizeVector(
          combinedX,
          combinedY
        );
    } else if (
      previous &&
      next
    ) {
      tangent =
        curvatureNormalizeVector(
          Number(next.x) -
            Number(previous.x),
          Number(next.y) -
            Number(previous.y)
        );
    }
  } else if (
    incomingDirection
  ) {
    tangent =
      incomingDirection;
  } else if (
    outgoingDirection
  ) {
    tangent =
      outgoingDirection;
  }

  if (
    !tangent &&
    previous &&
    next
  ) {
    tangent =
      curvatureNormalizeVector(
        Number(next.x) -
          Number(previous.x),
        Number(next.y) -
          Number(previous.y)
      );
  }

  tangent ||=
    {
      x: 1,
      y: 0
    };

  anchor.curvatureCorner =
    false;

  anchor.curvatureLineIn =
    false;

  anchor.inX =
    Number(anchor.x) -
    tangent.x *
    inLength;

  anchor.inY =
    Number(anchor.y) -
    tangent.y *
    inLength;

  anchor.outX =
    Number(anchor.x) +
    tangent.x *
    outLength;

  anchor.outY =
    Number(anchor.y) +
    tangent.y *
    outLength;

  /*
   * Keep the converted point's shape-preserving tangent as the local target.
   * Neighboring smooth handles are blended toward the normal C2 solution
   * instead of replacing the entire path immediately.
   */
  const preserved = {
    inX:
      anchor.inX,
    inY:
      anchor.inY,
    outX:
      anchor.outX,
    outY:
      anchor.outY
  };

  /*
   * Keep this conversion strictly local so toggling one closed-path anchor
   * cannot reinterpret or mutate any other anchor's corner state.
   */
  const previousIndex =
    closed
      ? (
          index -
          1 +
          anchors.length
        ) %
        anchors.length
      : index - 1;

  const nextIndex =
    closed
      ? (
          index +
          1
        ) %
        anchors.length
      : index + 1;

  if (
    previousIndex >= 0 &&
    previousIndex <
      anchors.length &&
    !anchors[previousIndex]
      .curvatureCorner
  ) {
    const neighbor =
      anchors[
        previousIndex
      ];

    const handleLength =
      curvatureVectorLength(
        Number(neighbor.outX) -
          Number(neighbor.x),
        Number(neighbor.outY) -
          Number(neighbor.y)
      );

    const direction =
      curvatureNormalizeVector(
        Number(anchor.x) -
          Number(neighbor.x),
        Number(anchor.y) -
          Number(neighbor.y)
      );

    neighbor.outX =
      Number(neighbor.x) +
      direction.x *
      handleLength;

    neighbor.outY =
      Number(neighbor.y) +
      direction.y *
      handleLength;
  }

  if (
    nextIndex >= 0 &&
    nextIndex <
      anchors.length &&
    !anchors[nextIndex]
      .curvatureCorner
  ) {
    const neighbor =
      anchors[
        nextIndex
      ];

    const handleLength =
      curvatureVectorLength(
        Number(neighbor.x) -
          Number(neighbor.inX),
        Number(neighbor.y) -
          Number(neighbor.inY)
      );

    const direction =
      curvatureNormalizeVector(
        Number(neighbor.x) -
          Number(anchor.x),
        Number(neighbor.y) -
          Number(anchor.y)
      );

    neighbor.inX =
      Number(neighbor.x) -
      direction.x *
      handleLength;

    neighbor.inY =
      Number(neighbor.y) -
      direction.y *
      handleLength;
  }

  anchor.inX =
    preserved.inX;
  anchor.inY =
    preserved.inY;
  anchor.outX =
    preserved.outX;
  anchor.outY =
    preserved.outY;

  curvatureRestoreUnchangedAnchorStates(
    anchors,
    semanticState,
    index
  );

  anchor.curvatureCorner =
    false;

  anchor.curvatureLineIn =
    false;

  updatePathD(
    path
  );

  return true;
}



function curvatureAnchorStateSnapshot(
  anchors
) {
  return (
    Array.isArray(anchors)
      ? anchors.map(
          anchor => ({
            curvatureCorner:
              Boolean(
                anchor.curvatureCorner
              ),
            curvatureLineIn:
              Boolean(
                anchor.curvatureLineIn
              )
          })
        )
      : []
  );
}

function curvatureRestoreUnchangedAnchorStates(
  anchors,
  snapshot,
  changedIndex
) {
  if (
    !Array.isArray(anchors) ||
    !Array.isArray(snapshot)
  ) {
    return;
  }

  anchors.forEach(
    (
      anchor,
      index
    ) => {
      if (
        index ===
          changedIndex ||
        !snapshot[index]
      ) {
        return;
      }

      anchor.curvatureCorner =
        snapshot[index]
          .curvatureCorner;

      anchor.curvatureLineIn =
        snapshot[index]
          .curvatureLineIn;
    }
  );
}

function curvatureCopySolvedHandlesOnly(
  targetAnchors,
  solvedAnchors
) {
  if (
    !Array.isArray(
      targetAnchors
    ) ||
    !Array.isArray(
      solvedAnchors
    )
  ) {
    return;
  }

  const count =
    Math.min(
      targetAnchors.length,
      solvedAnchors.length
    );

  for (
    let index = 0;
    index < count;
    index += 1
  ) {
    const target =
      targetAnchors[index];

    const solved =
      solvedAnchors[index];

    target.inX =
      solved.inX;
    target.inY =
      solved.inY;
    target.outX =
      solved.outX;
    target.outY =
      solved.outY;
  }
}




function curvatureToggleCorner(
  path,
  index
) {
  const anchors =
    path?._anchors;

  const anchor =
    anchors?.[
      index
    ];

  if (!anchor) {
    return false;
  }

  const closed =
    path.dataset.closed ===
      "true";

  const previous =
    index > 0
      ? anchors[
          index - 1
        ]
      : closed
        ? anchors[
            anchors.length - 1
          ]
        : null;

  const next =
    index <
      anchors.length - 1
      ? anchors[
          index + 1
        ]
      : closed
        ? anchors[0]
        : null;

  const wasCorner =
    Boolean(
      anchor.curvatureCorner
    );

  if (!wasCorner) {
    /*
     * SMOOTH -> CORNER
     *
     * A semantic flag alone is not enough: the path must visibly acquire a
     * tangent break. Preserve the current handle lengths, but rotate the
     * incoming handle onto the incoming chord and the outgoing handle onto
     * the outgoing chord. Only this vertex is edited.
     */
    let inLength =
      Math.hypot(
        Number(anchor.x) -
          Number(anchor.inX),
        Number(anchor.y) -
          Number(anchor.inY)
      );

    let outLength =
      Math.hypot(
        Number(anchor.outX) -
          Number(anchor.x),
        Number(anchor.outY) -
          Number(anchor.y)
      );

    if (
      inLength < 1e-6 &&
      previous
    ) {
      inLength =
        Math.hypot(
          Number(anchor.x) -
            Number(previous.x),
          Number(anchor.y) -
            Number(previous.y)
        ) / 3;
    }

    if (
      outLength < 1e-6 &&
      next
    ) {
      outLength =
        Math.hypot(
          Number(next.x) -
            Number(anchor.x),
          Number(next.y) -
            Number(anchor.y)
        ) / 3;
    }

    if (previous) {
      const incoming =
        curvatureNormalizeVector(
          Number(anchor.x) -
            Number(previous.x),
          Number(anchor.y) -
            Number(previous.y)
        );

      anchor.inX =
        Number(anchor.x) -
        incoming.x *
        inLength;

      anchor.inY =
        Number(anchor.y) -
        incoming.y *
        inLength;
    }

    if (next) {
      const outgoing =
        curvatureNormalizeVector(
          Number(next.x) -
            Number(anchor.x),
          Number(next.y) -
            Number(anchor.y)
        );

      anchor.outX =
        Number(anchor.x) +
        outgoing.x *
        outLength;

      anchor.outY =
        Number(anchor.y) +
        outgoing.y *
        outLength;
    }

    anchor.curvatureCorner =
      true;

    anchor.curvatureLineIn =
      false;
  } else {
    /*
     * CORNER -> SMOOTH
     *
     * Build one common tangent from the two current one-sided directions,
     * preserving the separate handle lengths so the local shape changes as
     * little as possible while the kink disappears.
     */
    const inDx =
      Number(anchor.x) -
      Number(anchor.inX);

    const inDy =
      Number(anchor.y) -
      Number(anchor.inY);

    const outDx =
      Number(anchor.outX) -
      Number(anchor.x);

    const outDy =
      Number(anchor.outY) -
      Number(anchor.y);

    let inLength =
      Math.hypot(
        inDx,
        inDy
      );

    let outLength =
      Math.hypot(
        outDx,
        outDy
      );

    if (
      inLength < 1e-6 &&
      previous
    ) {
      inLength =
        Math.hypot(
          Number(anchor.x) -
            Number(previous.x),
          Number(anchor.y) -
            Number(previous.y)
        ) / 3;
    }

    if (
      outLength < 1e-6 &&
      next
    ) {
      outLength =
        Math.hypot(
          Number(next.x) -
            Number(anchor.x),
          Number(next.y) -
            Number(anchor.y)
        ) / 3;
    }

    const incoming =
      inLength > 1e-6
        ? curvatureNormalizeVector(
            inDx,
            inDy
          )
        : previous
          ? curvatureNormalizeVector(
              Number(anchor.x) -
                Number(previous.x),
              Number(anchor.y) -
                Number(previous.y)
            )
          : null;

    const outgoing =
      outLength > 1e-6
        ? curvatureNormalizeVector(
            outDx,
            outDy
          )
        : next
          ? curvatureNormalizeVector(
              Number(next.x) -
                Number(anchor.x),
              Number(next.y) -
                Number(anchor.y)
            )
          : null;

    let tangent =
      null;

    if (
      incoming &&
      outgoing
    ) {
      const combinedX =
        incoming.x *
          Math.max(
            inLength,
            1
          ) +
        outgoing.x *
          Math.max(
            outLength,
            1
          );

      const combinedY =
        incoming.y *
          Math.max(
            inLength,
            1
          ) +
        outgoing.y *
          Math.max(
            outLength,
            1
          );

      if (
        Math.hypot(
          combinedX,
          combinedY
        ) > 1e-6
      ) {
        tangent =
          curvatureNormalizeVector(
            combinedX,
            combinedY
          );
      }
    }

    if (
      !tangent &&
      previous &&
      next
    ) {
      tangent =
        curvatureNormalizeVector(
          Number(next.x) -
            Number(previous.x),
          Number(next.y) -
            Number(previous.y)
        );
    }

    tangent ||=
      incoming ||
      outgoing ||
      {
        x: 1,
        y: 0
      };

    anchor.inX =
      Number(anchor.x) -
      tangent.x *
      inLength;

    anchor.inY =
      Number(anchor.y) -
      tangent.y *
      inLength;

    anchor.outX =
      Number(anchor.x) +
      tangent.x *
      outLength;

    anchor.outY =
      Number(anchor.y) +
      tangent.y *
      outLength;

    anchor.curvatureCorner =
      false;

    anchor.curvatureLineIn =
      false;
  }

  /*
   * Do not run a global spline solve here. The double-click conversion is a
   * local edit: exactly one vertex changes semantic state and handle geometry.
   */
  updatePathD(
    path
  );

  recordHistory({
    label:
      anchor.curvatureCorner
        ? "Curvature Corner Point"
        : "Curvature Smooth Point",
    detail:
      `Vertex ${index + 1}`
  });

  scheduleAutosave();
  drawSelection();

  return true;
}

function curvatureMoveAnchor(
  path,
  index,
  canvasPoint
) {
  const anchor =
    path?._anchors?.[
      index
    ];

  if (!anchor) {
    return false;
  }

  const local =
    localPointFromCanvas(
      path,
      canvasPoint
    );

  moveConstraintAnchor(
    path,
    index,
    local.x,
    local.y
  );

  curvatureRecomputeSmoothHandles(
    path
  );

  enforcePathGeometryConstraints(
    path,
    new Set([
      index
    ])
  );

  enforceDocumentGeometryConstraints(
    lockedCrossConstraintKeysForPath(
      path,
      [index]
    )
  );

  enforcePinnedVertices(
    path
  );

  updatePathD(
    path
  );

  return true;
}

function drawCurvatureOverlay() {
  if (!curvatureIsActive()) {
    return;
  }

  const path =
    curvaturePath ||
    (
      selected?.tagName ===
        "path"
        ? selected
        : null
    );

  if (
    !path ||
    !Array.isArray(
      path._anchors
    )
  ) {
    return;
  }

  const closedPrediction =
    curvatureClosedPreviewAnchors();

  const predicted =
    closedPrediction ||
    curvaturePredictedAnchors();

  if (
    predicted &&
    predicted.length >= 2
  ) {
    const previewPath =
      svgEl(
        "path",
        {
          d:
            curvaturePathDFromAnchors(
              predicted,
              Boolean(
                closedPrediction
              )
            ),
          class:
            "curvature-live-preview",
          fill:
            "none",
          style:
            `stroke-width:${1.35 / Math.max(zoom, 0.3)}px;stroke-dasharray:${4.5 / Math.max(zoom, 0.3)}px ${2.5 / Math.max(zoom, 0.3)}px;filter:drop-shadow(0 0 ${0.9 / Math.max(zoom, 0.3)}px rgba(124,58,237,0.42))`,
          "pointer-events":
            "none"
        }
      );

    selectionOverlay
      .appendChild(
        previewPath
      );

    if (
      !closedPrediction
    ) {
      const previewLocal =
        predicted[
          predicted.length - 1
        ];

      const previewCanvas =
        canvasPointFromLocal(
          path,
          previewLocal.x,
          previewLocal.y
        );

      selectionOverlay
        .appendChild(
          svgEl(
            curvaturePreviewCorner
              ? "rect"
              : "circle",
            curvaturePreviewCorner
              ? {
                  x:
                    previewCanvas.x -
                    3.25 / Math.max(zoom, 0.3),
                  y:
                    previewCanvas.y -
                    3.25 / Math.max(zoom, 0.3),
                  width:
                    6.5 / Math.max(zoom, 0.3),
                  height:
                    6.5 / Math.max(zoom, 0.3),
                  class:
                    "curvature-preview-point curvature-preview-corner",
                  "pointer-events":
                    "none"
                }
              : {
                  cx:
                    previewCanvas.x,
                  cy:
                    previewCanvas.y,
                  r:
                    3.25 / Math.max(zoom, 0.3),
                  class:
                    "curvature-preview-point",
                  "pointer-events":
                    "none"
                }
          )
        );
    }
  }

  path._anchors
    .forEach(
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

        const pointNode =
          svgEl(
            anchor.curvatureCorner
              ? "rect"
              : "circle",
            anchor.curvatureCorner
              ? {
                  x:
                    point.x -
                    4.5 /
                    Math.max(
                      zoom,
                      0.3
                    ),
                  y:
                    point.y -
                    4.5 /
                    Math.max(
                      zoom,
                      0.3
                    ),
                  width:
                    9 /
                    Math.max(
                      zoom,
                      0.3
                    ),
                  height:
                    9 /
                    Math.max(
                      zoom,
                      0.3
                    ),
                  rx:
                    0.8 /
                    Math.max(
                      zoom,
                      0.3
                    ),
                  class:
                    "curvature-point curvature-point-corner",
                  "pointer-events":
                    "none"
                }
              : {
                  cx:
                    point.x,
                  cy:
                    point.y,
                  r:
                    5 /
                    Math.max(
                      zoom,
                      0.3
                    ),
                  class:
                    "curvature-point",
                  "pointer-events":
                    "none"
                }
          );

        selectionOverlay
          .appendChild(
            pointNode
          );

        if (
          curvatureHover?.type ===
            "anchor" &&
          curvatureHover.path ===
            path &&
          curvatureHover.index ===
            index
        ) {
          pointNode.classList.add(
            "hover"
          );
        }
      }
    );

  if (
    curvatureHover?.type ===
      "segment"
  ) {
    selectionOverlay
      .appendChild(
        svgEl(
          "circle",
          {
            cx:
              curvatureHover.point.x,
            cy:
              curvatureHover.point.y,
            r:
              4 /
              Math.max(
                zoom,
                0.3
              ),
            class:
              "curvature-segment-insert",
            "pointer-events":
              "none"
          }
        )
      );
  }
}

