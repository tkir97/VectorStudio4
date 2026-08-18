/* Vector Studio modular baseline — source lines 27124-30412 from consolidated app.js.
   Classic-script module: shares the browser global lexical scope with ordered sibling modules. */

/* ---------------- POINTER EVENTS ---------------- */

svg.addEventListener("pointerdown", event => {
  let position = pointerPosition(event);

  if (activeTool === "lasso" && event.button === 0) {
    lassoPoints = [position];
    lassoAdditive = event.shiftKey;
    lassoBaseSelection = event.shiftKey ? [...selectedItems] : [];

    if (!event.shiftKey) {
      selected = null;
      selectedItems = [];
      drawSelection();
      renderLayers();
    }

    drawLassoSelection();
    svg.setPointerCapture(event.pointerId);
    event.preventDefault();
    return;
  }

  if (
    event.button === 0 &&
    curvatureIsActive()
  ) {
    const cornerRequested =
      event.altKey ||
      event.metaKey && event.shiftKey;

    const targetPath =
      curvaturePath ||
      (
        selected?.tagName ===
          "path"
          ? selected
          : null
      );

    const anchorHit =
      curvatureHitAnchor(
        event.clientX,
        event.clientY,
        targetPath
      );

    if (anchorHit) {
      const now =
        performance.now();

      const isDouble =
        curvatureLastClick.path ===
          anchorHit.path &&
        curvatureLastClick.index ===
          anchorHit.index &&
        now -
          curvatureLastClick.time <
          360;

      curvatureLastClick = {
        time:
          now,
        path:
          anchorHit.path,
        index:
          anchorHit.index
      };

      if (isDouble) {
        curvatureDrag =
          null;

        if (
          curvaturePath &&
          anchorHit.path ===
            curvaturePath &&
          anchorHit.index ===
            curvaturePath._anchors.length - 1 &&
          anchorHit.index > 0
        ) {
          /*
           * Preserve the special "double-click while placing" behavior.
           */
          const anchor =
            curvaturePath._anchors[
              anchorHit.index
            ];

          if (
            anchor.curvatureCorner &&
            anchor.curvatureLineIn
          ) {
            curvatureToggleCorner(
              anchorHit.path,
              anchorHit.index
            );
          } else {
            anchor.curvatureCorner =
              true;

            anchor.curvatureLineIn =
              true;

            curvatureRecomputeSmoothHandles(
              anchorHit.path
            );

            updatePathD(
              anchorHit.path
            );

            recordHistory({
              label:
                "Curvature Straight Corner",
              detail:
                `Vertex ${anchorHit.index + 1}`
            });

            scheduleAutosave();
            drawSelection();
          }
        } else {
          /*
           * Existing vertices, including point 0 on a closed path, simply
           * toggle the clicked anchor between corner and smooth.
           */
          curvatureToggleCorner(
            anchorHit.path,
            anchorHit.index
          );
        }

        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (
        curvaturePath &&
        anchorHit.index === 0 &&
        curvaturePath._anchors.length >= 3
      ) {
        if (
          cornerRequested
        ) {
          curvaturePath._anchors[0]
            .curvatureCorner =
            true;

          curvaturePath._anchors[0]
            .curvatureLineIn =
            false;
        }

        curvatureFinishPath(
          true
        );
      } else if (
        cornerRequested
      ) {
        curvatureMakeCorner(
          anchorHit.path,
          anchorHit.index,
          {
            straightIncoming:
              false
          }
        );

        recordHistory({
          label:
            "Curvature Corner Point",
          detail:
            `Vertex ${anchorHit.index + 1}`
        });

        scheduleAutosave();
        drawSelection();
      } else {
        curvatureDrag = {
          path:
            anchorHit.path,
          index:
            anchorHit.index,
          start:
            position
        };

        selected =
          anchorHit.path;

        selectedItems =
          [
            anchorHit.path
          ];
      }

      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const segmentHit =
      curvatureHitSegment(
        event.clientX,
        event.clientY,
        targetPath
      );

    if (
      segmentHit &&
      !curvaturePath
    ) {
      curvatureInsertPoint(
        segmentHit.path,
        segmentHit,
        cornerRequested
      );

      event.preventDefault();
      event.stopPropagation();
      return;
    }

    /* New Curvature vertices use the same grid/guide snapping as Pen. */
    position = snapPoint(
      position,
      curvaturePath ? [curvaturePath] : []
    );
    drawSnapGuides();

    if (!curvaturePath) {
      curvatureBeginPath(
        position,
        cornerRequested
      );
    } else {
      curvaturePushPlacementUndoState();

      const nextAnchor =
        curvatureCreateAnchor(
          localPointFromCanvas(
            curvaturePath,
            position
          ),
          cornerRequested
        );

      /*
       * Alt/Option creates a true corner anchor. Its own Bezier handles stay
       * collapsed; neighbouring smooth anchors may still curve into/out of it.
       */
      nextAnchor.curvatureLineIn =
        false;

      curvaturePath._anchors
        .push(
          nextAnchor
        );

      curvaturePreviewPoint =
        null;

      curvatureRecomputeSmoothHandles(
        curvaturePath
      );

      drawSelection();
    }

    event.preventDefault();
    event.stopPropagation();
    return;
  }

  if (
    event.button === 0 &&
    constraintEdgeRelationMode
  ) {
    const hit =
      constraintMakerHitEdge(
        event.clientX,
        event.clientY
      );

    if (hit) {
      captureEdgeRelationEdge(
        hit
      );

      event.preventDefault();
      event.stopPropagation();
      return;
    }
  }

  if (
    event.button === 0 &&
    constraintMakerAnglePlacement &&
    !constraintMakerPendingPlacement
  ) {
    beginAngleConstraintValueEntry();

    event.preventDefault();
    event.stopPropagation();
    return;
  }

  if (
    event.button === 0 &&
    constraintMakerAutoFirstEdge &&
    constraintMakerAngleHoverEdge &&
    !constraintMakerPendingPlacement
  ) {
    const second =
      constraintMakerAngleHoverEdge;

    constraintMakerSelectedEdges = [
      constraintMakerAutoFirstEdge,
      edgeConstraintRefFromHit(
        second
      )
    ];

    constraintMakerAngleHoverEdge =
      null;

    /*
     * We are now definitely making an angle, not a distance. Remove the
     * distance endpoint/placement state so the generic distance pointer
     * handler cannot rebuild a dotted distance dimension.
     */
    constraintMakerPlacement =
      null;

    constraintMakerPlacementMode =
      null;

    crossConstraintEndpointA =
      null;

    crossConstraintEndpointB =
      null;

    constraintMakerActive =
      false;

    constraintMakerAnglePlacement = {
      radius:
        34 /
        Math.max(
          zoom,
          0.3
        )
    };

    toolStatus.textContent =
      "Move the cursor to position the angle dimension";

    drawSelection();

    event.preventDefault();
    event.stopPropagation();
    return;
  }

  if (
    event.button === 0 &&
    constraintMakerPlacement &&
    crossConstraintEndpointA &&
    crossConstraintEndpointB &&
    !constraintMakerPendingPlacement
  ) {
    beginConstraintValueEntry();

    event.preventDefault();
    event.stopPropagation();
    return;
  }

  if (
    event.button === 0 &&
    constraintMakerActive
  ) {
    const hit =
      constraintMakerHitGeometry(
        event.clientX,
        event.clientY
      );

    if (
      hit?.type ===
        "edge"
    ) {
      setConstraintMakerAutoFirstEdge(
        hit
      );

      constraintMakerActive =
        false;
    } else if (
      hit?.type ===
        "vertex"
    ) {
      setConstraintMakerSelectionFromVertex(
        hit
      );
    }

    event.preventDefault();
    event.stopPropagation();
    return;
  }

  if (
    event.button === 0 &&
    constraintMakerType === "__legacy-angle__" &&
    constraintMakerAnglePlacement &&
    !constraintMakerPendingPlacement
  ) {
    beginAngleConstraintValueEntry();

    event.preventDefault();
    event.stopPropagation();
    return;
  }

  if (
    event.button === 0 &&
    constraintMakerType === "__legacy-angle__" &&
    constraintMakerActive
  ) {
    const hit =
      constraintMakerAngleHoverEdge ||
      constraintMakerHitEdge(
        event.clientX,
        event.clientY
      );

    if (
      hit &&
      angleHoverEdgeIsValid(hit)
    ) {
      selectConstraintMakerAngleEdge(hit);
    }

    event.preventDefault();
    event.stopPropagation();
    return;
  }


  if (event.button === 0) {
    if (
      constraintMakerPlacement &&
      crossConstraintEndpointA &&
      crossConstraintEndpointB
    ) {
      beginConstraintValueEntry();
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (constraintMakerActive) {
      /*
       * Prefer the editor's actual anchor handles. This keeps the maker in
       * lockstep with normal Vertex Selection and selectedAnchorIndices.
       */
      const anchorHandle =
        event.target.closest(
          "[data-anchor-index]"
        );

      if (
        anchorHandle &&
        selected &&
        selectedItems.length === 1 &&
        selected.tagName === "path"
      ) {
        const index =
          Number(
            anchorHandle.dataset
              .anchorIndex
          );

        const alreadyHasOne =
          selectedAnchorIndices.size > 0;

        setVertexAnchorSelection(
          index,
          alreadyHasOne
        );

        drawSelection();

        if (
          selectedConstraintVertexIndices()
            .length === 2
        ) {
          constraintMakerSelectionFromCurrentVertexSelection();
        } else {
          toolStatus.textContent =
            "Distance: select the second vertex";
        }

        event.preventDefault();
        event.stopPropagation();
        return;
      }

      /*
       * Edge picking still uses the CAD hit-test because an edge is not part
       * of the editor's anchor-selection state.
       */
      const hit =
        constraintMakerHitGeometry(
          event.clientX,
          event.clientY
        );

      if (hit?.type === "edge") {
        setConstraintMakerSelectionFromEdge(
          hit
        );
      } else if (
        hit?.type === "vertex"
      ) {
        /*
         * Fallback for a vertex hit when the overlay handle itself was not
         * the event target (e.g. transform/zoom edge cases). Select the path
         * normally, then use the same authoritative anchor selection.
         */
        if (
          selected !== hit.path
        ) {
          selectElement(
            hit.path,
            false
          );
        }

        const alreadyHasOne =
          selectedAnchorIndices.size > 0;

        setVertexAnchorSelection(
          hit.index,
          alreadyHasOne
        );

        drawSelection();

        if (
          selectedConstraintVertexIndices()
            .length === 2
        ) {
          constraintMakerSelectionFromCurrentVertexSelection();
        }
      }

      event.preventDefault();
      event.stopPropagation();
      return;
    }
  }

  const selectionPanModifier =
    navigator.platform.toLowerCase().includes("mac")
      ? event.metaKey
      : event.ctrlKey;

  if (
    selectionPanModifier &&
    event.button === 0
  ) {
    closeCanvasContextMenu();

    selectionPanDrag = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPanX: zoomPanX,
      startPanY: zoomPanY
    };

    svg.setPointerCapture(event.pointerId);
    clearSnapGuides();
    selectionQuickMenu.hidden = true;
    svg.style.cursor = "grabbing";

    event.preventDefault();
    return;
  }

  const activeRadialRepeat =
    selectedRadialRepeat();

  const activeRadialSettings =
    activeRadialRepeat
      ? normalizeRadialRepeatSettings(
          radialRepeatSettings(
            activeRadialRepeat
          ) || {}
        )
      : null;

  const activeRadialCenterCanvas =
    activeRadialRepeat &&
    activeRadialSettings
      ? canvasPointFromLocal(
          activeRadialRepeat,
          activeRadialSettings.centerX,
          activeRadialSettings.centerY
        )
      : null;

  const radialCenterHitDistance =
    activeRadialCenterCanvas
      ? Math.hypot(
          position.x -
            activeRadialCenterCanvas.x,
          position.y -
            activeRadialCenterCanvas.y
        )
      : Infinity;



  const activeThreeDRepeat =
    selectedThreeDExtrude();

  const threeDOrbitSurface =
    (
      event.button === 0 &&
      threeDPanelRequested &&
      activeThreeDRepeat
    )
      ? threeDNearestFaceAtClientPoint(
          event.clientX,
          event.clientY,
          activeThreeDRepeat
        )
      : null;

  if (
    event.button === 0 &&
    threeDPanelRequested &&
    activeThreeDRepeat &&
    threeDOrbitSurface
  ) {
    const repeat =
      activeThreeDRepeat;

    const settings =
      normalizeThreeDSettings(
        threeDSettings(repeat) || {}
      );

    threeDOrbitDrag = {
      pointerId:
        event.pointerId,
      repeat,
      startClientX:
        event.clientX,
      startClientY:
        event.clientY,
      startRotateX:
        settings.rotateX,
      startRotateY:
        settings.rotateY,
      faceType:
        threeDOrbitSurface.dataset
          .threeDFace ||
        "side",
      faceKey:
        threeDOrbitSurface.dataset
          .threeDFaceKey ||
        threeDOrbitSurface.dataset
          .threeDFace ||
        "front",
      moved:
        false
    };

    svg.setPointerCapture(
      event.pointerId
    );

    svg.style.cursor =
      "grabbing";

    event.preventDefault();
    event.stopPropagation();
    return;
  }

  const pathRepeatAnchorHandle =
    event.target.closest(
      "[data-path-repeat-anchor-index]"
    );

  const pathRepeatControlHandle =
    event.target.closest(
      "[data-path-repeat-control-index]"
    );

  const pathRepeatLinePointHandle =
    event.target.closest(
      "[data-path-repeat-line-point]"
    );

  if (
    event.button === 0 &&
    pathRepeatGuideEdit &&
    pathRepeatPanelRequested &&
    selectedPathRepeat() &&
    (
      pathRepeatAnchorHandle ||
      pathRepeatControlHandle ||
      pathRepeatLinePointHandle
    )
  ) {
    const repeat =
      selectedPathRepeat();

    const guide =
      pathRepeatGuideForEditing(
        repeat
      );

    if (guide) {
      if (
        pathRepeatAnchorHandle
      ) {
        pathRepeatGuideDrag = {
          type:
            "anchor",
          pointerId:
            event.pointerId,
          repeat,
          guide,
          index:
            Number(
              pathRepeatAnchorHandle.dataset
                .pathRepeatAnchorIndex
            )
        };
      } else if (
        pathRepeatControlHandle
      ) {
        pathRepeatGuideDrag = {
          type:
            "control",
          pointerId:
            event.pointerId,
          repeat,
          guide,
          index:
            Number(
              pathRepeatControlHandle.dataset
                .pathRepeatControlIndex
            ),
          side:
            pathRepeatControlHandle.dataset
              .pathRepeatControlSide
        };
      } else {
        pathRepeatGuideDrag = {
          type:
            "line",
          pointerId:
            event.pointerId,
          repeat,
          guide,
          linePoint:
            pathRepeatLinePointHandle.dataset
              .pathRepeatLinePoint
        };
      }

      svg.setPointerCapture(
        event.pointerId
      );

      event.preventDefault();
      event.stopPropagation();
      return;
    }
  }

  const radialCenterHandle =
    event.target.closest(
      "[data-radial-repeat-center]"
    );

  if (
    event.button === 0 &&
    activeRadialRepeat &&
    isRadialRepeatEditingActive(
      activeRadialRepeat
    ) &&
    (
      radialCenterHandle ||
      radialCenterHitDistance <=
        14 /
        Math.max(
          zoom,
          0.3
        )
    )
  ) {
    radialRepeatCenterDrag = {
      pointerId:
        event.pointerId,
      repeat:
        activeRadialRepeat,
      /*
       * Radial geometry is stored in the repeat group's local coordinate
       * system so moving the group does not invalidate the center/anchor.
       */
      anchorCenter: {
        x:
          activeRadialSettings.anchorCenterX,
        y:
          activeRadialSettings.anchorCenterY
      }
    };

    svg.setPointerCapture(
      event.pointerId
    );

    event.preventDefault();
    event.stopPropagation();
    return;
  }

  if (
    radialRepeatCenterPick &&
    event.button === 0
  ) {
    const snappedCenter =
      snapRadialRepeatCenterPoint(
        position,
        radialRepeatCenterPick.sourceCenter,
        []
      );

    commitRadialRepeatCenter(
      snappedCenter
    );

    event.preventDefault();
    return;
  }

  const perspectiveHandle =
    event.target.closest(
      "[data-perspective-handle]"
    );

  if (
    perspective2State.visible &&
    perspectiveHandle &&
    event.button === 0
  ) {
    beginPerspective2HandleDrag(
      perspectiveHandle.dataset
        .perspectiveHandle,
      position,
      event.pointerId
    );

    svg.setPointerCapture(
      event.pointerId
    );

    event.preventDefault();
    return;
  }

  if (
    activeTool === "freeDraw" &&
    event.button === 0
  ) {
    position = snapPoint(position, []);
    drawSnapGuides();

    beginFreeDrawStroke(
      position,
      event.pointerId
    );

    svg.setPointerCapture(
      event.pointerId
    );

    event.preventDefault();
    return;
  }

  if (activeTool === "text" && event.button === 0) {
    deselect();

    textCreateDrag = {
      pointerId: event.pointerId,
      start: position,
      current: position,
      guide: document.createElementNS(SVG_NS, "rect")
    };

    textCreateDrag.guide.classList.add("text-area-guide");
    textCreateDrag.guide.setAttribute("x", position.x);
    textCreateDrag.guide.setAttribute("y", position.y);
    textCreateDrag.guide.setAttribute("width", 0);
    textCreateDrag.guide.setAttribute("height", 0);
    selectionOverlay.appendChild(textCreateDrag.guide);

    svg.setPointerCapture(event.pointerId);
    event.preventDefault();
    return;
  }

  /* Two-click shape creation must take priority over selection handles.
     First click starts, mouse move previews, second click commits. */
  if (["rect", "ellipse", "polygon", "star", "line"].includes(activeTool)) {
    const polygonRadiusMode =
      activeTool === "polygon" &&
      Boolean(pendingShape);

    position = pendingShape
      ? (
          polygonRadiusMode
            ? snapPoint(
                position,
                [pendingShape]
              )
            : snapShapeCreationPoint(
                position,
                event.shiftKey,
                event.altKey
              )
        )
      : snapPoint(position, []);

    drawSnapGuides();

    if (
      activeTool === "polygon" &&
      !pendingShape
    ) {
      startPoint = position;
      openPolygonSidesModal(
        position
      );

      event.preventDefault();
      return;
    }

    if (!pendingShape) {
      deselect();
      startPoint = position;
      pendingShape = createShape(position);
      selected = pendingShape;
      selectedItems = [pendingShape];
      updatePropertyControls();
      updatePendingShape(
        position,
        event.shiftKey,
        event.altKey
      );
      renderLayers();
    } else {
      updatePendingShape(
        position,
        activeTool === "polygon"
          ? true
          : event.shiftKey,
        activeTool === "polygon"
          ? true
          : event.altKey
      );
      let finished = pendingShape;

      if (
        perspective2State.visible &&
        startPoint &&
        ["rect", "polygon"].includes(
          finished.tagName
        )
      ) {
        finished =
          convertPendingShapeToPerspectivePath(
            finished,
            startPoint,
            position
          );
      }

      pendingShape = null;
      startPoint = null;
      setSelection([finished], finished);

      if (
        !perspective2State.visible
      ) {
        setTool("select");
      } else {
        drawPerspective2Grid();
      }

      recordHistory({
        label: `${historyObjectLabel(finished)} Created`,
        detail: "Shape added"
      });
    }

    event.preventDefault();
    return;
  }

  if (activeTool === "shapeBuilder") {
    const eligible = selectedItems.filter(isShapeBuilderEligible);

    if (
      eligible.length < 2 ||
      !eligible.some(isShapeBuilderFillSource)
    ) {
      toolStatus.textContent =
        "Shape Builder: select a closed shape plus another shape or open line";
      return;
    }

    if (!buildShapeBuilderRegions(eligible)) {
      toolStatus.textContent =
        "Shape Builder: could not split the selected shapes into regions";
      return;
    }

    shapeBuilderDrawing = true;
    if (
    textCreateDrag &&
    event.pointerId === textCreateDrag.pointerId
  ) {
    textCreateDrag.current = position;

    const x = Math.min(textCreateDrag.start.x, position.x);
    const y = Math.min(textCreateDrag.start.y, position.y);
    const width = Math.abs(position.x - textCreateDrag.start.x);
    const height = Math.abs(position.y - textCreateDrag.start.y);

    textCreateDrag.guide.setAttribute("x", x);
    textCreateDrag.guide.setAttribute("y", y);
    textCreateDrag.guide.setAttribute("width", width);
    textCreateDrag.guide.setAttribute("height", height);

    event.preventDefault();
    return;
  }

  shapeBuilderAltHeld = event.altKey;
    shapeBuilderSubtracting = event.altKey;
    shapeBuilderHoverRegion = null;
    clearShapeBuilderHover();
    shapeBuilderPoints = [position];
    shapeBuilderHits = [];

    updateShapeBuilderHits();

    toolStatus.textContent = shapeBuilderSubtracting
      ? "Shape Builder: subtract regions — release to remove"
      : "Shape Builder: merge regions — drag through regions to combine";

    drawSelection();
    drawShapeBuilderStroke();

    svg.setPointerCapture(event.pointerId);
    event.preventDefault();
    return;
  }

  const primitiveVertexHandle =
    event.target.closest(
      "[data-primitive-vertex-index]"
    );

  if (
    primitiveVertexHandle &&
    selected &&
    activeTool === "vertex"
  ) {
    const primitiveIndex =
      Number(
        primitiveVertexHandle.dataset
          .primitiveVertexIndex
      );

    if (event.shiftKey) {
      setVertexAnchorSelection(
        primitiveIndex,
        true
      );
      drawSelection();
      event.preventDefault();
      return;
    }

    if (
      beginPrimitiveVertexDrag(
        primitiveVertexHandle,
        position
      )
    ) {
      drawSelection();
      svg.setPointerCapture(
        event.pointerId
      );
      event.preventDefault();
      return;
    }
  }

  const polygonCornerSelect = event.target.closest("[data-polygon-corner-select]");

  if (polygonCornerSelect && selected && activeTool === "vertex") {
    togglePolygonCorner(Number(polygonCornerSelect.dataset.polygonCornerSelect));
    event.preventDefault();
    return;
  }

  const cornerSelect = event.target.closest("[data-corner-select]");

  if (cornerSelect && selected && activeTool === "vertex") {
    toggleRoundedCorner(cornerSelect.dataset.cornerSelect);
    event.preventDefault();
    return;
  }

  const imageCropHandle =
    event.target.closest(
      "[data-image-crop-handle]"
    );

  if (
    imageCropHandle &&
    imageCropTarget ===
      selected &&
    activeTool ===
      "select"
  ) {
    if (
      beginImageCropHandleDrag(
        imageCropHandle.dataset
          .imageCropHandle,
        position,
        event.pointerId
      )
    ) {
      svg.setPointerCapture(
        event.pointerId
      );

      event.preventDefault();
      return;
    }
  }

  const handle = event.target.closest("[data-handle], [data-anchor-index], [data-control-index]");

  if (
    handle &&
    selected &&
    activeTool === "select" &&
    handle.dataset.handle ===
      "center-move"
  ) {
    if (
      beginCenterMoveDrag(
        position,
        event.altKey
      )
    ) {
      svg.setPointerCapture(
        event.pointerId
      );

      event.preventDefault();
      return;
    }
  }

  if (handle && selected) {
    if (
      activeTool === "vertex" &&
      handle.dataset.anchorIndex !== undefined &&
      event.shiftKey
    ) {
      setVertexAnchorSelection(
        Number(
          handle.dataset.anchorIndex
        ),
        true
      );
      drawSelection();
      event.preventDefault();
      return;
    }

    const isVertexHandle =
      handle.dataset.anchorIndex !== undefined ||
      handle.dataset.controlIndex !== undefined ||
      handle.dataset.handle === "line-start" ||
      handle.dataset.handle === "line-end" ||
      handle.dataset.handle === "corner-radius" ||
      handle.dataset.handle === "polygon-corner-radius" ||
      handle.dataset.handle === "path-corner-radius";

    const isObjectHandle =
      handle.dataset.handle === "rotate" ||
      [
        "nw", "n", "ne", "e",
        "se", "s", "sw", "w"
      ].includes(handle.dataset.handle);

    if (
      activeTool === "vertex" &&
      handle.dataset.multipathVertex ===
        "true" &&
      handle.dataset.anchorIndex !==
        undefined
    ) {
      const ownerPath =
        handle.__vertexOwnerPath;

      if (
        ownerPath &&
        selectedItems.includes(
          ownerPath
        )
      ) {
        const index =
          Number(
            handle.dataset
              .anchorIndex
          );

        const alreadySelected =
          selectedVertexRefIsSelected(
            ownerPath,
            index
          );

        /*
         * Selection semantics:
         * - first plain click selects one vertex
         * - Shift-click adds/removes a vertex across the selected path set
         * - pressing an already-selected vertex NEVER mutates the registry;
         *   it starts a drag of the existing selected vertex set
         */
        if (
          !alreadySelected
        ) {
          if (
            event.shiftKey
          ) {
            toggleSelectedVertexRef(
              ownerPath,
              index,
              true
            );
          } else if (
            selectedVertexRefsPruned()
              .length === 0
          ) {
            toggleSelectedVertexRef(
              ownerPath,
              index,
              false
            );
          } else {
            /*
             * In multi-path Vertex mode, a second plain vertex click is
             * treated additively so the CAD workflow can select A then B
             * without requiring Shift. Clicking empty canvas/marquee still
             * starts a fresh selection.
             */
            toggleSelectedVertexRef(
              ownerPath,
              index,
              true
            );
          }
        }

        syncOwnerPathAnchorMirror(
          ownerPath,
          index
        );

        notifyConstraintMakerFromVertexRefs();

        if (
          selectedVertexRefIsSelected(
            ownerPath,
            index
          ) &&
          beginMultiPathVertexDrag(
            ownerPath,
            index,
            position
          )
        ) {
          svg.setPointerCapture(
            event.pointerId
          );
        }

        drawSelection();
        renderLayers();

        event.preventDefault();
        return;
      }
    }

    if (
      (activeTool === "vertex" && isVertexHandle) ||
      (activeTool === "select" && isObjectHandle)
    ) {
      beginGeometryHandleDrag(handle, position);
      drawSelection();
      svg.setPointerCapture(event.pointerId);
      event.preventDefault();
      return;
    }
  }

  if (activeTool === "vertex") {
    let target =
      event.target.closest(
        "[data-object='true']"
      );

    if (
      target &&
      !isLayerInteractive(target)
    ) {
      target = null;
    }

    if (
      target &&
      !selectedItems.includes(
        target
      )
    ) {
      /*
       * Vertex Selection only edits the paths already chosen with Selection.
       * Clicking an unselected path does not change the working set.
       */
      toolStatus.textContent =
        "Use Selection to add this path first";

      event.preventDefault();
      return;
    }

    /*
     * Once an object is active in Vertex Selection, dragging from the object
     * itself or empty canvas creates an anchor marquee instead of moving the
     * whole object. Shift preserves the existing anchor selection.
     */
    if (
      selectedItems.some(
        item =>
          item?.tagName ===
            "path"
      ) &&
      beginVertexMarquee(
        position,
        event.shiftKey
      )
    ) {
      svg.setPointerCapture(
        event.pointerId
      );

      drawSelection();
      drawMarquee(
        currentVertexMarqueeBounds(
          position
        )
      );

      event.preventDefault();
      return;
    }

    if (!event.shiftKey) {
      selected = null;
      selectedItems = [];
      selectedAnchorIndices.clear();
      selectedAnchorIndex = null;
      drawSelection();
      renderLayers();
    }

    return;
  }

  if (activeTool === "select" && event.detail >= 2) {
    const rawTextTarget = event.target.closest("text[data-object='true']");
    const textTarget = canvasSelectionTarget(rawTextTarget);
    if (
      textTarget &&
      textTarget.tagName === "text" &&
      isLayerInteractive(textTarget)
    ) {
      beginTextEditing(textTarget);
      event.preventDefault();
      return;
    }
  }

  if (activeTool === "select") {
    let target =
      event.target.closest(
        "[data-object='true']"
      );

    // Canvas clicks always address the owning top-level object/group.
    // Layers-panel clicks can still select an individual grouped child.
    target = canvasSelectionTarget(target);

    if (
      target &&
      !isLayerInteractive(
        target
      )
    ) {
      target =
        null;
    }

    /*
     * fill:none + stroke:none removes the element from normal SVG pointer
     * hit-testing. Fall back to its geometry so fully transparent artwork
     * remains recoverable directly from the canvas.
     */
    if (!target) {
      target =
        transparentSelectableAtPoint(
          event.clientX,
          event.clientY
        );
    }

    if (!target) {
      if (!event.shiftKey) {
        selected = null;
        selectedItems = [];
        drawSelection();
        renderLayers();
      }

      marqueeStart = position;
      marquee = {
        additive: event.shiftKey,
        baseSelection: event.shiftKey ? [...selectedItems] : []
      };

      drawMarquee({
        left: position.x,
        top: position.y,
        right: position.x,
        bottom: position.y
      });

      svg.setPointerCapture(event.pointerId);
      return;
    }

    if (event.shiftKey) {
      selectElement(target, true);
      return;
    }

    if (!selectedItems.includes(target)) {
      selectElement(target);
    } else {
      selected = target;
      drawSelection();
      renderLayers();
    }

    /*
     * Option/Alt-drag duplicates the active selection in place, then the
     * same pointer gesture immediately drags the duplicates. The source
     * objects remain untouched and the duplicate+move is committed as one
     * history step on pointerup.
     */
    const optionDragDuplicated =
      event.altKey
        ? duplicateSelectionInPlaceForDrag()
        : false;
    dragging = true;

    // Preserve the oriented multi-selection frame through a translation.
    // Scale/rotate already update this retained frame explicitly; ordinary
    // move must do the same or the artwork moves while the box stays behind.
    const moveFrame =
      selectedItems.length > 1
        ? ensureMultiSelectionFrame()
        : null;

    dragOffset = {
      x: position.x,
      y: position.y,
      optionDragDuplicated,
      multiFrameStartCenter:
        moveFrame?.center
          ? { ...moveFrame.center }
          : null,
      originals: selectedItems.map(el => {
        const t = getTranslation(el);
        return { element: el, tx: t.x, ty: t.y };
      })
    };

    svg.setPointerCapture(event.pointerId);
    return;
  }

  if (activeTool === "pen") {
    if (
      !activePath &&
      beginContinuingSelectedOpenPath(position)
    ) {
      svg.setPointerCapture(event.pointerId);
      event.preventDefault();
      return;
    }

    if (!activePath) {
      const insertionCandidate =
        penIntermediateAnchorCandidate(
          position
        );

      if (
        insertionCandidate &&
        insertPenAnchorOnExistingPath(
          insertionCandidate
        )
      ) {
        event.preventDefault();
        return;
      }
    }

    position = snapPoint(
      position,
      activePath ? [activePath] : []
    );

    drawSnapGuides();

    penPointerDown = true;
    penDownPoint = position;

    if (!activePath) {
      startPath(position);
      penPendingAnchor = pathAnchors[0];
    } else if (
      event.target.closest("[data-pen-close='true']") ||
      closePathIfNearFirst(position)
    ) {
      closeActivePath();
      event.preventDefault();
      return;
    } else {
      penPendingAnchor = addPathAnchor(position);
    }

    drawSelection();
    svg.setPointerCapture(event.pointerId);
    return;
  }

});


svg.addEventListener("pointermove", event => {
  if (
    curvatureIsActive()
  ) {
    const point =
      pointerPosition(
        event
      );

    curvaturePreviewPoint =
      curvaturePath
        ? snapPoint(
            point,
            [curvaturePath]
          )
        : null;

    if (curvaturePath) {
      drawSnapGuides();
    }

    curvaturePreviewCorner =
      Boolean(
        event.altKey
      );

    if (
      curvatureDrag
    ) {
      curvatureMoveAnchor(
        curvatureDrag.path,
        curvatureDrag.index,
        point
      );

      drawSelection();

      event.preventDefault();
      return;
    }

    const targetPath =
      curvaturePath ||
      (
        selected?.tagName ===
          "path"
          ? selected
          : null
      );

    const anchorHit =
      curvatureHitAnchor(
        event.clientX,
        event.clientY,
        targetPath
      );

    if (anchorHit) {
      curvatureHover = {
        ...anchorHit,
        type:
          "anchor"
      };

      if (
        curvaturePath &&
        anchorHit.index === 0 &&
        curvaturePath._anchors.length >= 3
      ) {
        curvaturePreviewPoint =
          null;
      }
    } else {
      const segmentHit =
        curvatureHitSegment(
          event.clientX,
          event.clientY,
          targetPath
        );

      curvatureHover =
        segmentHit
          ? {
              ...segmentHit,
              type:
                "segment"
            }
          : null;
    }

    if (
      curvatureHover
    ) {
      curvaturePreviewPoint =
        null;
    }

    drawSelection();

    svg.style.cursor =
      curvatureHover
        ? "pointer"
        : "crosshair";

    return;
  }

  if (
    constraintEdgeRelationMode
  ) {
    constraintMakerHover =
      constraintMakerHitEdge(
        event.clientX,
        event.clientY
      );

    drawSelection();
    svg.style.cursor =
      constraintMakerHover
        ? "crosshair"
        : "not-allowed";

    return;
  }

  if (
    constraintMakerAnglePlacement &&
    constraintMakerSelectedEdges.length === 2 &&
    !constraintMakerPendingPlacement
  ) {
    constraintMakerPlacement =
      null;

    constraintMakerPlacementMode =
      null;

    updateConstraintMakerAnglePlacement(
      event.clientX,
      event.clientY
    );

    drawSelection();
    svg.style.cursor =
      "crosshair";

    return;
  }


  if (
    constraintMakerAutoFirstEdge &&
    !constraintMakerPendingPlacement &&
    !constraintMakerAnglePlacement
  ) {
    const adjacent =
      autoConstraintAdjacentEdgeHit(
        event.clientX,
        event.clientY
      );

    constraintMakerAngleHoverEdge =
      adjacent;

    if (adjacent) {
      constraintMakerPlacement =
        null;

      constraintMakerPlacementMode =
        null;

      drawSelection();
      svg.style.cursor =
        "crosshair";

      return;
    }

    updateConstraintMakerPlacementFromPointer(
      event.clientX,
      event.clientY
    );

    drawSelection();
    svg.style.cursor =
      "crosshair";

    return;
  }


  if (
    constraintMakerType === "__legacy-angle__" &&
    constraintMakerAnglePlacement &&
    !constraintMakerPendingPlacement
  ) {
    updateConstraintMakerAnglePlacement(
      event.clientX,
      event.clientY
    );

    drawSelection();
    svg.style.cursor = "crosshair";
    return;
  }

  if (
    !constraintMakerAnglePlacement &&
    crossConstraintEndpointA &&
    crossConstraintEndpointB &&
    !constraintMakerActive &&
    !constraintMakerPendingPlacement
  ) {
    updateConstraintMakerPlacementFromPointer(
      event.clientX,
      event.clientY
    );

    drawSelection();
    svg.style.cursor = "crosshair";
    return;
  }

  if (constraintMakerActive) {
    constraintMakerHover =
      constraintMakerHitGeometry(
        event.clientX,
        event.clientY
      );

    drawSelection();

    svg.style.cursor =
      constraintMakerHover
        ? "crosshair"
        : "not-allowed";

    return;
  }

  if (
    threeDOrbitDrag &&
    threeDOrbitDrag.pointerId ===
      event.pointerId
  ) {
    const repeat =
      threeDOrbitDrag.repeat;

    if (
      !repeat?.isConnected
    ) {
      threeDOrbitDrag =
        null;
      return;
    }

    const settings =
      normalizeThreeDSettings(
        threeDSettings(repeat) || {}
      );

    const dx =
      event.clientX -
      threeDOrbitDrag.startClientX;

    const dy =
      event.clientY -
      threeDOrbitDrag.startClientY;

    if (
      Math.hypot(
        dx,
        dy
      ) > 3
    ) {
      threeDOrbitDrag.moved =
        true;
    }

    /*
     * Trackball-style basic orbit:
     * horizontal drag -> Y rotation
     * vertical drag   -> X rotation
     */
    settings.rotateY =
      threeDOrbitDrag.startRotateY -
      dx * 0.6;

    settings.rotateX =
      threeDOrbitDrag.startRotateX +
      dy * 0.6;

    repeat.dataset.threeDSettings =
      JSON.stringify(
        settings
      );

    renderThreeDExtrude(
      repeat
    );

    threeDRotateX.value =
      Math.round(
        settings.rotateX * 10
      ) / 10;

    threeDRotateY.value =
      Math.round(
        settings.rotateY * 10
      ) / 10;

    drawSelection();
    renderLayers();

    toolStatus.textContent =
      `3D Orbit: X ${Math.round(settings.rotateX)}° • Y ${Math.round(settings.rotateY)}°`;

    event.preventDefault();
    return;
  }

  if (
    pathRepeatGuideDrag &&
    pathRepeatGuideDrag.pointerId ===
      event.pointerId
  ) {
    const {
      repeat,
      guide
    } =
      pathRepeatGuideDrag;

    const snappedCanvas =
      snapPoint(
        pointerPosition(
          event
        ),
        [repeat]
      );

    const local =
      pathRepeatCanvasToGuideLocal(
        repeat,
        guide,
        snappedCanvas
      );

    if (
      pathRepeatGuideDrag.type ===
        "anchor"
    ) {
      const anchor =
        guide._anchors?.[
          pathRepeatGuideDrag.index
        ];

      if (anchor) {
        const dx =
          local.x -
          anchor.x;

        const dy =
          local.y -
          anchor.y;

        anchor.x =
          local.x;
        anchor.y =
          local.y;
        anchor.inX +=
          dx;
        anchor.inY +=
          dy;
        anchor.outX +=
          dx;
        anchor.outY +=
          dy;

        updatePathD(
          guide
        );
      }
    } else if (
      pathRepeatGuideDrag.type ===
        "control"
    ) {
      const anchor =
        guide._anchors?.[
          pathRepeatGuideDrag.index
        ];

      if (anchor) {
        if (
          pathRepeatGuideDrag.side ===
            "in"
        ) {
          anchor.inX =
            local.x;
          anchor.inY =
            local.y;
        } else {
          anchor.outX =
            local.x;
          anchor.outY =
            local.y;
        }

        updatePathD(
          guide
        );
      }
    } else if (
      pathRepeatGuideDrag.type ===
        "line"
    ) {
      if (
        pathRepeatGuideDrag.linePoint ===
          "start"
      ) {
        guide.setAttribute(
          "x1",
          local.x
        );
        guide.setAttribute(
          "y1",
          local.y
        );
      } else {
        guide.setAttribute(
          "x2",
          local.x
        );
        guide.setAttribute(
          "y2",
          local.y
        );
      }
    }

    persistPathRepeatGuide(
      repeat,
      guide
    );

    drawSelection();
    drawSnapGuides();
    syncPathRepeatPanel();

    toolStatus.textContent =
      "Repeat Along Path: guide updated";

    event.preventDefault();
    return;
  }

  if (
    radialRepeatCenterPick
  ) {
    const previewPoint =
      snapRadialRepeatCenterPoint(
        pointerPosition(event),
        radialRepeatCenterPick.sourceCenter,
        []
      );

    drawSnapGuides();

    toolStatus.textContent =
      `Radial Repeat: center ${Math.round(previewPoint.x)}, ${Math.round(previewPoint.y)}`;

    event.preventDefault();
    return;
  }

  if (
    radialRepeatCenterDrag &&
    isRadialRepeatEditingActive(
      radialRepeatCenterDrag.repeat ||
      selectedRadialRepeat()
    ) &&
    radialRepeatCenterDrag.pointerId ===
      event.pointerId
  ) {
    const repeat =
      radialRepeatCenterDrag.repeat ||
      selectedRadialRepeat();

    if (repeat) {
      const rawPoint =
        pointerPosition(
          event
        );

      const settings =
        normalizeRadialRepeatSettings(
          radialRepeatSettings(
            repeat
          ) || {}
        );

      const anchorCenter =
        (
          radialRepeatCenterDrag
            .anchorCenter &&
          Number.isFinite(
            radialRepeatCenterDrag
              .anchorCenter.x
          ) &&
          Number.isFinite(
            radialRepeatCenterDrag
              .anchorCenter.y
          )
        )
          ? radialRepeatCenterDrag
              .anchorCenter
          : {
              x:
                settings.anchorCenterX,
              y:
                settings.anchorCenterY
            };

      const anchorCenterCanvas =
        anchorCenter
          ? canvasPointFromLocal(
              repeat,
              anchorCenter.x,
              anchorCenter.y
            )
          : null;

      const snappedPointCanvas =
        snapRadialRepeatCenterPoint(
          rawPoint,
          anchorCenterCanvas,
          []
        );

      const snappedPointLocal =
        localPointFromCanvas(
          repeat,
          snappedPointCanvas
        );

      settings.centerX =
        snappedPointLocal.x;
      settings.centerY =
        snappedPointLocal.y;

      if (anchorCenter) {
        const dx =
          anchorCenter.x -
          settings.centerX;

        const dy =
          anchorCenter.y -
          settings.centerY;

        settings.radius =
          Math.hypot(
            dx,
            dy
          );

        settings.startAngle =
          Math.atan2(
            dy,
            dx
          ) *
          180 /
          Math.PI;
      }

      repeat.dataset.radialRepeatSettings =
        JSON.stringify(
          settings
        );

      renderRadialRepeat(
        repeat
      );

      drawSelection();
      drawSnapGuides();
      syncRadialRepeatPanel();

      const visibleRadialCenter =
        canvasPointFromLocal(
          repeat,
          settings.centerX,
          settings.centerY
        );

      toolStatus.textContent =
        `Radial Repeat: center ${Math.round(visibleRadialCenter.x)}, ${Math.round(visibleRadialCenter.y)} • radius ${Math.round(settings.radius)}`;
    }

    event.preventDefault();
    return;
  }


  const perspectivePosition =
    pointerPosition(
      event
    );

  if (
    perspective2Drag &&
    perspective2Drag.pointerId ===
      event.pointerId
  ) {
    updatePerspective2HandleDrag(
      perspectivePosition
    );

    event.preventDefault();
    return;
  }

  if (
    perspective2Draw &&
    perspective2Draw.pointerId ===
      event.pointerId
  ) {
    updatePerspective2Draw(
      perspectivePosition
    );

    event.preventDefault();
    return;
  }


  const position = pointerPosition(event);

  if (
    selectionPanDrag &&
    event.pointerId === selectionPanDrag.pointerId
  ) {
    zoomPanX =
      selectionPanDrag.startPanX +
      (event.clientX - selectionPanDrag.startClientX);

    zoomPanY =
      selectionPanDrag.startPanY +
      (event.clientY - selectionPanDrag.startClientY);

    applyZoomTransform();
    selectionQuickMenu.hidden = true;

    event.preventDefault();
    return;
  }

  if (
    activeTool === "freeDraw" &&
    freeDrawPointerId ===
      event.pointerId
  ) {
    const snappedFreeDrawPoint =
      snapPoint(position, []);
    drawSnapGuides();

    updateFreeDrawStroke(
      snappedFreeDrawPoint
    );

    event.preventDefault();
    return;
  }

  if (
    imageCropDrag &&
    imageCropDrag.pointerId ===
      event.pointerId
  ) {
    updateImageCropHandleDrag(
      position
    );

    event.preventDefault();
    return;
  }

  shapeBuilderAltHeld = event.altKey;

  if (activeTool === "shapeBuilder" && !shapeBuilderDrawing) {
    updateShapeBuilderHover(position);
    updateShapeBuilderSubtractCursor(event);
  }

  if (editDrag) {
    shiftDown = event.shiftKey;
    altDown = event.altKey;

    if (
      editDrag.type === "rotate" ||
      editDrag.type === "multi-rotate"
    ) {
      updateGeometryHandleDrag(position);
      clearSnapGuides();
    } else {
      const snappedPosition = snapPoint(position, selected ? [selected] : []);
      updateGeometryHandleDrag(snappedPosition);
      drawSnapGuides();
    }

    return;
  }

  if (
    textCreateDrag &&
    event.pointerId === textCreateDrag.pointerId
  ) {
    const drag = textCreateDrag;
    textCreateDrag = null;

    if (svg.hasPointerCapture(event.pointerId)) {
      svg.releasePointerCapture(event.pointerId);
    }

    drag.guide.remove();

    const dx = drag.current.x - drag.start.x;
    const dy = drag.current.y - drag.start.y;
    const isArea = Math.hypot(dx, dy) > 6;

    const x = isArea ? Math.min(drag.start.x, drag.current.x) : drag.start.x;
    const y = isArea
      ? Math.min(drag.start.y, drag.current.y) + Math.max(24, Number(textFontSize.value || 32))
      : drag.start.y;

    const width = isArea ? Math.max(40, Math.abs(dx)) : 180;

    const element = createTextElement({ x, y }, isArea ? "area" : "point", width);
    setSelection([element], element);
    renderLayers();
    recordHistory();
    beginTextEditing(element);

    event.preventDefault();
    return;
  }

  if (shapeBuilderDrawing && activeTool === "shapeBuilder") {
    const last = shapeBuilderPoints[shapeBuilderPoints.length - 1];

    if (
      !last ||
      Math.hypot(position.x - last.x, position.y - last.y) >= 2
    ) {
      shapeBuilderPoints.push(position);
    }

    updateShapeBuilderHits();
    drawSelection();
    drawShapeBuilderStroke();
    return;
  }


  if (
    activeTool === "pen" &&
    !activePath &&
    !penPointerDown
  ) {
    updatePenContinuationHover(position);
  } else if (
    activeTool !== "pen"
  ) {
    clearPenContinuationPreview();
  }

  if (activeTool === "pen" && penPointerDown && penPendingAnchor && penDownPoint) {
    const dx = position.x - penDownPoint.x;
    const dy = position.y - penDownPoint.y;

    /* Illustrator-like: drag establishes opposing tangent handles. */
    penPendingAnchor.outX = penPendingAnchor.x + dx;
    penPendingAnchor.outY = penPendingAnchor.y + dy;
    penPendingAnchor.inX = penPendingAnchor.x - dx;
    penPendingAnchor.inY = penPendingAnchor.y - dy;

    updatePathD(activePath);
    drawSelection();
    return;
  }

  if (activeTool === "pen" && activePath && !penPointerDown && pathAnchors.length) {
    clearPenContinuationPreview();

    /* Preview next segment without committing an anchor. */
    const last =
      pathAnchors[
        pathAnchors.length - 1
      ];

    const angleResult =
      smartAngleSnapPoint(
        position,
        {
          x: last.x,
          y: last.y
        },
        45,
        4
      );

    const snappedPosition =
      snapPoint(
        angleResult.point,
        [activePath]
      );

    if (
      angleResult.snapped
    ) {
      pushSmartGuideLine(
        last.x,
        last.y,
        snappedPosition.x,
        snappedPosition.y,
        "angle"
      );

      pushSmartGuideLabel(
        (
          last.x +
          snappedPosition.x
        ) / 2,
        (
          last.y +
          snappedPosition.y
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

    drawSnapGuides();
    const d = activePath.getAttribute("d") || "";
    const preview = document.querySelector("#penPreview") || svgEl("path", {
      id: "penPreview",
      fill: "none",
      stroke: "#7c3aed",
      "stroke-width": 1,
      "stroke-dasharray": "4 4",
      "pointer-events": "none"
    });

    if (!preview.parentNode) selectionOverlay.appendChild(preview);
    preview.setAttribute(
      "d",
      `M ${last.x} ${last.y} C ${last.outX} ${last.outY}, ${snappedPosition.x} ${snappedPosition.y}, ${snappedPosition.x} ${snappedPosition.y}`
    );
    return;
  }

  if (
    vertexMarquee &&
    activeTool === "vertex"
  ) {
    updateVertexMarquee(
      position
    );
    event.preventDefault();
    return;
  }

  if (lassoPoints && activeTool === "lasso") {
    const previous = lassoPoints[lassoPoints.length - 1];
    const minStep = 3 / Math.max(zoom, 0.05);
    if (!previous || Math.hypot(position.x - previous.x, position.y - previous.y) >= minStep) {
      lassoPoints.push(position);
    }
    const hits = lassoPoints.length >= 3
      ? [...art.querySelectorAll("[data-object='true']")]
          .filter(isLayerInteractive)
          .filter(element => shapeIntersectsLasso(element, lassoPoints))
      : [];
    const nextSelection = lassoAdditive
      ? [...new Set([...lassoBaseSelection, ...hits])]
      : hits;
    selectedItems = nextSelection;
    selected = nextSelection[nextSelection.length - 1] || null;
    drawSelection();
    drawLassoSelection();
    renderLayers();
    event.preventDefault();
    return;
  }

  if (marquee && marqueeStart) {
    const bounds = currentMarqueeBounds(position);

    const hits = [...art.querySelectorAll("[data-object='true']")]
      .filter(isLayerInteractive)
      .filter(element => shapeIntersectsMarquee(element, bounds));

    const nextSelection = marquee.additive
      ? [...new Set([...marquee.baseSelection, ...hits])]
      : hits;

    selectedItems = nextSelection;
    selected = nextSelection[nextSelection.length - 1] || null;

    drawSelection();
    drawMarquee(bounds);
    renderLayers();
    return;
  }

  if (pendingShape) {
    shiftDown = event.shiftKey;

    const snappedPosition = snapShapeCreationPoint(
      position,
      event.shiftKey,
      event.altKey
    );

    updatePendingShape(
      snappedPosition,
      event.shiftKey,
      event.altKey
    );

    if (
      snapSettings.smartGuides &&
      startPoint
    ) {
      currentSmartGuideData.labels =
        currentSmartGuideData.labels.filter(
          label =>
            label.kind !==
            "shape-measurement"
        );

      const width =
        Math.abs(
          snappedPosition.x -
          startPoint.x
        );

      const height =
        Math.abs(
          snappedPosition.y -
          startPoint.y
        );

      pushSmartGuideLabel(
        snappedPosition.x +
          14 /
          Math.max(
            zoom,
            0.05
          ),
        snappedPosition.y -
          12 /
          Math.max(
            zoom,
            0.05
          ),
        pendingShape.tagName ===
          "line"
          ? formatSmartDistance(
              Math.hypot(
                snappedPosition.x -
                  startPoint.x,
                snappedPosition.y -
                  startPoint.y
              )
            )
          : `${formatSmartDistance(width)} × ${formatSmartDistance(height)}`,
        "shape-measurement"
      );
    }

    drawSnapGuides();
    return;
  }

  if (
    [
      "rect",
      "ellipse",
      "triangle",
      "pentagon",
      "hexagon",
      "star",
      "line"
    ].includes(activeTool)
  ) {
    /*
     * Preview the exact snap target before the first click so the user can
     * see where the creation anchor will land.
     */
    snapPoint(position, []);
    drawSnapGuides();
  }

  if (dragging && selectedItems.length) {
    const rawDx = position.x - dragOffset.x;
    const rawDy = position.y - dragOffset.y;
    const snappedDelta = snapMoveDelta(rawDx, rawDy);
    const dx = snappedDelta.dx;
    const dy = snappedDelta.dy;

    dragOffset.originals.forEach(item => {
      if (
        perspective2State.visible &&
        item.element.dataset.perspective2 ===
          "true" &&
        item.element.dataset.perspective2Source
      ) {
        const currentTx =
          getTranslation(
            item.element
          );

        /*
         * Source coordinates are stored in canvas space, so derive the
         * movement from the original drag delta rather than accumulating.
         */
        const source =
          perspective2ShapeSourceData(
            item.element
          );

        if (
          source &&
          !item.perspectiveSource
        ) {
          item.perspectiveSource = {
            ...source
          };
        }

        if (
          item.perspectiveSource
        ) {
          const movedSource = {
            startX:
              Number(
                item.perspectiveSource
                  .startX
              ) + dx,
            startY:
              Number(
                item.perspectiveSource
                  .startY
              ) + dy,
            endX:
              Number(
                item.perspectiveSource
                  .endX
              ) + dx,
            endY:
              Number(
                item.perspectiveSource
                  .endY
              ) + dy,
            side:
              ["left", "right", "horizontal"].includes(
                item.perspectiveSource.side
              )
                ? item.perspectiveSource.side
                : "right"
          };

          setPerspective2ShapeSourceData(
            item.element,
            movedSource
          );

          item.element.dataset.tx =
            "0";

          item.element.dataset.ty =
            "0";

          perspective2ProjectedPathFromSource(
            item.element,
            movedSource
          );
        }
      } else {
        const tx = item.tx + dx;
        const ty = item.ty + dy;
        item.element.dataset.tx = tx;
        item.element.dataset.ty = ty;
        applyObjectTransform(item.element);
      preservePinnedVerticesDuringObjectMove(
        item.element
      );
      }
    });

    const lockedCrossKeys =
      new Set();

    dragOffset.originals.forEach(
      item => {
        lockedCrossConstraintKeysForPath(
          item.element
        ).forEach(
          key =>
            lockedCrossKeys.add(
              key
            )
        );
      }
    );

    enforceDocumentGeometryConstraints(
      lockedCrossKeys
    );

    // Keep the retained oriented multi-select frame attached to the objects
    // during a normal move. Use the original drag center plus the current
    // snapped delta so movement does not accumulate frame error.
    if (
      dragOffset.multiFrameStartCenter &&
      multiSelectionFrameMatchesSelection()
    ) {
      multiSelectionFrame.center = {
        x: dragOffset.multiFrameStartCenter.x + dx,
        y: dragOffset.multiFrameStartCenter.y + dy
      };
    }

    drawSelection();
    drawSnapGuides();
  }
});

svg.addEventListener("pointerleave", () => {
  if (
    !pendingShape &&
    [
      "rect",
      "ellipse",
      "triangle",
      "pentagon",
      "hexagon",
      "star",
      "line"
    ].includes(activeTool)
  ) {
    clearSnapGuides();
  }

  if (activeTool === "shapeBuilder") {
    shapeBuilderHoverRegion = null;
    clearShapeBuilderHover();
    document.querySelector("#shapeBuilderSubtractCursor")?.remove();
  }
});

svg.addEventListener("pointerup", event => {
  if (
    curvatureIsActive() &&
    curvatureDrag
  ) {
    const completed =
      curvatureDrag;

    curvatureDrag =
      null;

    recordHistory({
      label:
        "Curvature Point Moved",
      detail:
        `Vertex ${completed.index + 1}`
    });

    scheduleAutosave();
    drawSelection();

    event.preventDefault();
    return;
  }

  if (
    threeDOrbitDrag &&
    threeDOrbitDrag.pointerId ===
      event.pointerId
  ) {
    const dragState =
      threeDOrbitDrag;

    const repeat =
      dragState.repeat;

    threeDOrbitDrag =
      null;

    if (
      svg.hasPointerCapture(
        event.pointerId
      )
    ) {
      svg.releasePointerCapture(
        event.pointerId
      );
    }

    svg.style.cursor =
      activeTool === "select"
        ? "default"
        : "crosshair";

    if (
      repeat?.isConnected
    ) {
      if (
        !dragState.moved
      ) {
        threeDSelectedFace =
          dragState.faceKey ||
          dragState.faceType;

        repeat.dataset.threeDSelectedFace =
          threeDSelectedFace;

        renderThreeDExtrude(
          repeat
        );

        syncAppearanceControlsToThreeDFace(
          repeat,
          threeDSelectedFace
        );

        drawSelection();

        toolStatus.textContent =
          `3D face selected — use the existing Fill/Stroke controls`;
      } else {
        const settings =
          normalizeThreeDSettings(
            threeDSettings(repeat) || {}
          );

        recordHistory({
          label:
            "3D Orbit Rotated",
          detail:
            `X ${Math.round(settings.rotateX)}°, Y ${Math.round(settings.rotateY)}°`
        });

        scheduleAutosave();
      }
    }

    event.preventDefault();
    return;
  }

  if (
    pathRepeatGuideDrag &&
    pathRepeatGuideDrag.pointerId ===
      event.pointerId
  ) {
    pathRepeatGuideDrag =
      null;

    clearSnapGuides();

    if (
      svg.hasPointerCapture(
        event.pointerId
      )
    ) {
      svg.releasePointerCapture(
        event.pointerId
      );
    }

    recordHistory({
      label:
        "Path Repeat Guide Edited",
      detail:
        "Live guide path updated"
    });

    event.preventDefault();
    return;
  }

  if (
    radialRepeatCenterDrag &&
    isRadialRepeatEditingActive(
      radialRepeatCenterDrag.repeat ||
      selectedRadialRepeat()
    ) &&
    radialRepeatCenterDrag.pointerId ===
      event.pointerId
  ) {
    radialRepeatCenterDrag =
      null;

    clearSnapGuides();

    if (
      svg.hasPointerCapture(
        event.pointerId
      )
    ) {
      svg.releasePointerCapture(
        event.pointerId
      );
    }

    recordHistory({
      label:
        "Radial Repeat Center Moved",
      detail:
        "Center and radius updated; anchor copy stayed fixed"
    });

    event.preventDefault();
    return;
  }


  if (
    perspective2Drag &&
    perspective2Drag.pointerId ===
      event.pointerId
  ) {
    endPerspective2HandleDrag();

    if (
      svg.hasPointerCapture(
        event.pointerId
      )
    ) {
      svg.releasePointerCapture(
        event.pointerId
      );
    }

    event.preventDefault();
    return;
  }

  if (
    perspective2Draw &&
    perspective2Draw.pointerId ===
      event.pointerId
  ) {
    finishPerspective2Draw();

    if (
      svg.hasPointerCapture(
        event.pointerId
      )
    ) {
      svg.releasePointerCapture(
        event.pointerId
      );
    }

    event.preventDefault();
    return;
  }


  clearSnapGuides();

  if (
    selectionPanDrag &&
    event.pointerId === selectionPanDrag.pointerId
  ) {
    selectionPanDrag = null;

    if (svg.hasPointerCapture(event.pointerId)) {
      svg.releasePointerCapture(event.pointerId);
    }

    svg.style.cursor = "default";
    renderSelectionQuickMenu();
    scheduleAutosave();

    event.preventDefault();
    return;
  }

  if (
    activeTool === "freeDraw" &&
    freeDrawPointerId ===
      event.pointerId
  ) {
    finishFreeDrawStroke();

    if (
      svg.hasPointerCapture(
        event.pointerId
      )
    ) {
      svg.releasePointerCapture(
        event.pointerId
      );
    }

    event.preventDefault();
    return;
  }

  if (
    imageCropDrag &&
    imageCropDrag.pointerId ===
      event.pointerId
  ) {
    endImageCropHandleDrag();

    if (
      svg.hasPointerCapture(
        event.pointerId
      )
    ) {
      svg.releasePointerCapture(
        event.pointerId
      );
    }

    event.preventDefault();
    return;
  }

  if (shapeBuilderDrawing && activeTool === "shapeBuilder") {
    finishShapeBuilderStroke();
    shapeBuilderAltHeld = event.altKey;
    updateShapeBuilderSubtractCursor(event);
    updateShapeBuilderHover(pointerPosition(event));
    return;
  }

  if (editDrag) {
    const completedEdit =
      editDrag;

    editDrag = null;

    if (
      completedEdit.type ===
        "rotate" &&
      selectedItems.length === 1 &&
      selected
    ) {
      setLastRepeatAction({
        type:
          "rotate",
        delta:
          getRotation(
            selected
          ) -
          completedEdit
            .originalRotation
      });
    }

    if (
      completedEdit.type ===
        "resize" &&
      selectedItems.length === 1 &&
      selected &&
      Number.isFinite(
        completedEdit.scaleX
      ) &&
      Number.isFinite(
        completedEdit.scaleY
      )
    ) {
      const currentScale =
        getObjectScale(
          selected
        );

      setLastRepeatAction({
        type:
          "scale",
        scaleX:
          Math.abs(
            completedEdit.scaleX
          ) >
            1e-9
            ? currentScale.x /
              completedEdit.scaleX
            : 1,
        scaleY:
          Math.abs(
            completedEdit.scaleY
          ) >
            1e-9
            ? currentScale.y /
              completedEdit.scaleY
            : 1
      });
    }

    if (
      completedEdit.type ===
        "resize" &&
      selected?.tagName ===
        "path" &&
      pinnedVertexConstraints(
        selected
      ).length
    ) {
      preservePinnedVerticesAfterResize(
        selected,
        completedEdit,
        pinnedResizeFreedom(
          selected,
          completedEdit
        )
      );
    }

    updatePropertyControls();
    renderLayers();
    recordHistory(
      completedEdit.type === "multi-rotate"
        ? { label: "Selection Rotated", detail: "Multiple objects rotated" }
        : completedEdit.type === "multi-resize"
          ? { label: "Selection Resized", detail: "Multiple objects scaled" }
          : historyTransformLabel(
              completedEdit.type,
              selected
            )
    );
    return;
  }

  if (vertexMarquee) {
    vertexMarquee = null;

    if (
      svg.hasPointerCapture(
        event.pointerId
      )
    ) {
      svg.releasePointerCapture(
        event.pointerId
      );
    }

    drawSelection();

    if (
      geometryConstraintsPanelRequested &&
      selectedConstraintVertexRefs()
        .length === 2
    ) {
      constraintMakerSelectionFromCurrentVertexSelection();
    }

    renderLayers();
    return;
  }

  if (lassoPoints) {
    lassoPoints = null;
    lassoBaseSelection = [];
    lassoAdditive = false;
    selectionOverlay.querySelector("#lassoSelection")?.remove();
    if (svg.hasPointerCapture(event.pointerId)) {
      svg.releasePointerCapture(event.pointerId);
    }
    drawSelection();
    renderLayers();
    return;
  }

  if (marquee) {
    marquee = null;
    marqueeStart = null;
    drawSelection();
    renderLayers();
    return;
  }

  if (activeTool === "pen" && penPointerDown) {
    penPointerDown = false;
    penDownPoint = null;
    penPendingAnchor = null;
    drawSelection();
    return;
  }

  if (dragging) {
    const completedDrag =
      dragOffset;

    dragging = false;

    if (
      completedDrag
        ?.originals
        ?.length
    ) {
      const first =
        completedDrag
          .originals[0];

      const current =
        getTranslation(
          first.element
        );

      setLastRepeatAction({
        type:
          "move",
        dx:
          current.x -
          first.tx,
        dy:
          current.y -
          first.ty
      });
    }

    if (
      completedDrag
        ?.originals
        ?.length
    ) {
      completedDrag.originals.forEach(
        item => {
          preservePinnedVerticesDuringObjectMove(
            item.element
          );
        }
      );
    }

    dragOffset = null;
    updatePropertyControls();
    recordHistory({
      label:
        completedDrag?.optionDragDuplicated
          ? (selectedItems.length === 1
              ? `${historyObjectLabel(selected)} Duplicated & Moved`
              : `${selectedItems.length} Objects Duplicated & Moved`)
          : (selectedItems.length === 1
              ? `${historyObjectLabel(selected)} Translated`
              : `${selectedItems.length} Objects Translated`),
      detail:
        completedDrag?.optionDragDuplicated
          ? "Option/Alt-drag duplicate created and positioned"
          : "Position changed"
    });
    return;
  }

  dragging = false;
  dragOffset = null;
});

svg.addEventListener("pointercancel", event => {
  if (
    threeDOrbitDrag &&
    threeDOrbitDrag.pointerId ===
      event.pointerId
  ) {
    threeDOrbitDrag =
      null;

    if (
      svg.hasPointerCapture(
        event.pointerId
      )
    ) {
      svg.releasePointerCapture(
        event.pointerId
      );
    }

    svg.style.cursor =
      activeTool === "select"
        ? "default"
        : "crosshair";
  }


  if (
    perspective2Drag?.pointerId ===
      event.pointerId
  ) {
    endPerspective2HandleDrag();
  }

  if (
    perspective2Draw?.pointerId ===
      event.pointerId
  ) {
    perspective2Draw =
      null;

    drawPerspective2Grid();
  }


  clearSnapGuides();

  if (
    imageCropDrag &&
    imageCropDrag.pointerId ===
      event.pointerId
  ) {
    endImageCropHandleDrag();
  }

  if (
    freeDrawPointerId ===
      event.pointerId
  ) {
    cancelFreeDrawStroke();
  }
});


