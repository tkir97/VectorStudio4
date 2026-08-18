/* Vector Studio modular baseline — source lines 49117-53589 from consolidated app.js.
   Classic-script module: shares the browser global lexical scope with ordered sibling modules. */

/* ---------------- ADVANCED TRANSFORM TOOLS ---------------- */

function selectedTransformableItems() {
  return selectedItems.filter(
    element =>
      element?.isConnected &&
      element.parentNode === art &&
      isLayerInteractive(element)
  );
}

function normalizeRotationDegrees(
  value
) {
  let next =
    Number(value) || 0;

  while (next <= -180) {
    next += 360;
  }

  while (next > 180) {
    next -= 360;
  }

  return next;
}

function mirrorPerspectiveSource(
  element,
  axis
) {
  const source =
    perspective2ShapeSourceData(
      element
    );

  if (
    !source ||
    !perspective2State.visible
  ) {
    return false;
  }

  const centerX =
    (
      Number(source.startX) +
      Number(source.endX)
    ) / 2;

  const centerY =
    (
      Number(source.startY) +
      Number(source.endY)
    ) / 2;

  if (
    axis === "horizontal"
  ) {
    const startX =
      Number(source.startX);
    const endX =
      Number(source.endX);

    source.startX =
      centerX +
      (
        centerX -
        startX
      );

    source.endX =
      centerX +
      (
        centerX -
        endX
      );
  } else {
    const startY =
      Number(source.startY);
    const endY =
      Number(source.endY);

    source.startY =
      centerY +
      (
        centerY -
        startY
      );

    source.endY =
      centerY +
      (
        centerY -
        endY
      );
  }

  setPerspective2ShapeSourceData(
    element,
    source
  );

  perspective2ProjectedPathFromSource(
    element,
    source
  );

  return true;
}

function mirrorElement(
  element,
  axis
) {
  if (
    !element ||
    !element.isConnected
  ) {
    return;
  }

  if (
    element.dataset.perspective2 ===
      "true" &&
    element.dataset.perspective2Source &&
    mirrorPerspectiveSource(
      element,
      axis
    )
  ) {
    return;
  }

  const scale =
    getObjectScale(
      element
    );

  if (
    axis === "horizontal"
  ) {
    element.dataset.scaleX =
      String(
        -scale.x
      );
  } else {
    element.dataset.scaleY =
      String(
        -scale.y
      );
  }

  applyObjectTransform(
    element
  );

  if (
    isRasterImageElement(
      element
    )
  ) {
    ensureImageCropClip(
      element,
      imageCropForElement(
        element
      )
    );
  }
}

function rotateElementBy(
  element,
  degrees
) {
  if (
    !element ||
    !element.isConnected
  ) {
    return;
  }

  element.dataset.rotation =
    String(
      normalizeRotationDegrees(
        getRotation(
          element
        ) +
        degrees
      )
    );

  applyObjectTransform(
    element
  );
}

function resetElementRotation(
  element
) {
  if (!element) return;

  element.dataset.rotation =
    "0";

  applyObjectTransform(
    element
  );
}

function resetElementScale(
  element
) {
  if (!element) return;

  element.dataset.scaleX =
    "1";

  element.dataset.scaleY =
    "1";

  applyObjectTransform(
    element
  );

  if (
    isRasterImageElement(
      element
    )
  ) {
    ensureImageCropClip(
      element,
      imageCropForElement(
        element
      )
    );
  }
}

function runAdvancedTransformAction(
  action
) {
  const items =
    selectedTransformableItems();

  if (!items.length) {
    toolStatus.textContent =
      "Select an object to transform";
    return;
  }

  items.forEach(
    element => {
      if (
        action ===
          "mirror-horizontal"
      ) {
        mirrorElement(
          element,
          "horizontal"
        );
      } else if (
        action ===
          "mirror-vertical"
      ) {
        mirrorElement(
          element,
          "vertical"
        );
      } else if (
        action ===
          "rotate-left"
      ) {
        rotateElementBy(
          element,
          -90
        );
      } else if (
        action ===
          "rotate-right"
      ) {
        rotateElementBy(
          element,
          90
        );
      } else if (
        action ===
          "reset-rotation"
      ) {
        resetElementRotation(
          element
        );
      } else if (
        action ===
          "reset-scale"
      ) {
        resetElementScale(
          element
        );
      }
    }
  );

  drawSelection();
  renderLayers();
  updatePropertyControls();

  const labels = {
    "mirror-horizontal":
      "Mirrored Horizontally",
    "mirror-vertical":
      "Mirrored Vertically",
    "rotate-left":
      "Rotated −90°",
    "rotate-right":
      "Rotated +90°",
    "reset-rotation":
      "Rotation Reset",
    "reset-scale":
      "Scale Reset"
  };

  recordHistory({
    label:
      labels[action] ||
      "Transform Applied",
    detail:
      items.length === 1
        ? historyObjectLabel(
            items[0]
          )
        : `${items.length} objects`
  });

  toolStatus.textContent =
    labels[action] ||
    "Transform applied";
}

function clampAdvancedTransformPanelPosition(
  left,
  top
) {
  const stageRect =
    stage.getBoundingClientRect();

  const panelRect =
    advancedTransformPanel
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

function positionAdvancedTransformPanel() {
  if (
    advancedTransformPanel.hidden
  ) {
    return;
  }

  if (
    advancedTransformPanelManualPosition
  ) {
    const next =
      clampAdvancedTransformPanelPosition(
        advancedTransformPanelManualPosition.left,
        advancedTransformPanelManualPosition.top
      );

    advancedTransformPanelManualPosition =
      next;

    advancedTransformPanel.style.left =
      `${next.left}px`;

    advancedTransformPanel.style.top =
      `${next.top}px`;

    return;
  }

  advancedTransformPanel.style.left =
    "16px";

  advancedTransformPanel.style.top =
    "56px";
}

function toggleAdvancedTransformPanel(
  force = null
) {
  const next =
    force === null
      ? advancedTransformPanel.hidden
      : Boolean(force);

  advancedTransformPanel.hidden =
    !next;

  advancedTransformToggle.classList.toggle(
    "active",
    next
  );

  if (next) {
    requestAnimationFrame(
      positionAdvancedTransformPanel
    );
  }
}

advancedTransformToggle.addEventListener(
  "click",
  event => {
    event.preventDefault();
    event.stopPropagation();
    toggleAdvancedTransformPanel();
  }
);

closeAdvancedTransformButton.addEventListener(
  "click",
  () => {
    toggleAdvancedTransformPanel(
      false
    );
  }
);

advancedTransformPanel.addEventListener(
  "click",
  event => {
    const button =
      event.target.closest(
        "[data-transform-action]"
      );

    if (!button) return;

    runAdvancedTransformAction(
      button.dataset.transformAction
    );
  }
);

advancedTransformPanel.addEventListener(
  "pointerdown",
  event => {
    if (
      !event.target.closest(
        "[data-advanced-transform-drag='true']"
      ) ||
      event.target.closest(
        "button"
      ) ||
      event.button !== 0
    ) {
      return;
    }

    const rect =
      advancedTransformPanel
        .getBoundingClientRect();

    const stageRect =
      stage.getBoundingClientRect();

    advancedTransformPanelDrag = {
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

    advancedTransformPanel
      .setPointerCapture(
        event.pointerId
      );

    event.preventDefault();
  }
);

advancedTransformPanel.addEventListener(
  "pointermove",
  event => {
    if (
      !advancedTransformPanelDrag ||
      advancedTransformPanelDrag.pointerId !==
        event.pointerId
    ) {
      return;
    }

    const next =
      clampAdvancedTransformPanelPosition(
        event.clientX -
          advancedTransformPanelDrag.stageLeft -
          advancedTransformPanelDrag.offsetX,
        event.clientY -
          advancedTransformPanelDrag.stageTop -
          advancedTransformPanelDrag.offsetY
      );

    advancedTransformPanelManualPosition =
      next;

    advancedTransformPanel.style.left =
      `${next.left}px`;

    advancedTransformPanel.style.top =
      `${next.top}px`;
  }
);

[
  "pointerup",
  "pointercancel"
].forEach(
  type => {
    advancedTransformPanel.addEventListener(
      type,
      event => {
        if (
          !advancedTransformPanelDrag ||
          advancedTransformPanelDrag.pointerId !==
            event.pointerId
        ) {
          return;
        }

        if (
          advancedTransformPanel
            .hasPointerCapture(
              event.pointerId
            )
        ) {
          advancedTransformPanel
            .releasePointerCapture(
              event.pointerId
            );
        }

        advancedTransformPanelDrag =
          null;
      }
    );
  }
);

/* ---------------- OBJECT COMMANDS ---------------- */


function selectedTopLevelItemsInStackOrder() {
  const selectedCandidates = [
    ...(selectedItems || []),
    selected
  ]
    .filter(Boolean);

  const selectedSet =
    new Set(
      selectedCandidates.filter(
        element =>
          element?.isConnected &&
          element.parentNode ===
            art &&
          element.dataset?.object ===
            "true"
      )
    );

  return [...art.children]
    .filter(
      element =>
        element.dataset?.object ===
          "true" &&
        selectedSet.has(
          element
        )
    );
}


function bringSelectedToFront() {
  const items =
    selectedTopLevelItemsInStackOrder();

  if (!items.length) return;

  items.forEach(
    item =>
      art.appendChild(
        item
      )
  );

  renderLayers();
  drawSelection();
  recordHistory({
    label:
      "Bring to Front"
  });
}


function sendSelectedToBack() {
  const items =
    selectedTopLevelItemsInStackOrder();

  if (!items.length) return;

  const firstObject =
    [...art.children]
      .find(
        element =>
          element.dataset?.object ===
          "true" &&
          !items.includes(
            element
          )
      ) ||
    null;

  [...items]
    .reverse()
    .forEach(
      item => {
        if (firstObject) {
          art.insertBefore(
            item,
            firstObject
          );
        } else {
          art.appendChild(
            item
          );
        }
      }
    );

  renderLayers();
  drawSelection();
  recordHistory({
    label:
      "Send to Back"
  });
}


function bringSelectedForward() {
  const items =
    selectedTopLevelItemsInStackOrder();

  const selectedSet =
    new Set(items);

  if (!selectedSet.size) return;

  const children =
    [...art.children]
      .filter(
        element =>
          element.dataset?.object ===
          "true"
      );

  for (
    let index =
      children.length - 2;
    index >= 0;
    index -= 1
  ) {
    const item =
      children[index];

    const next =
      children[index + 1];

    if (
      selectedSet.has(item) &&
      !selectedSet.has(next)
    ) {
      art.insertBefore(
        next,
        item
      );

      children[index] =
        next;

      children[index + 1] =
        item;
    }
  }

  renderLayers();
  drawSelection();
  recordHistory({
    label:
      "Bring Forward"
  });
}


function sendSelectedBackward() {
  const items =
    selectedTopLevelItemsInStackOrder();

  const selectedSet =
    new Set(items);

  if (!selectedSet.size) return;

  const children =
    [...art.children]
      .filter(
        element =>
          element.dataset?.object ===
          "true"
      );

  for (
    let index = 1;
    index < children.length;
    index += 1
  ) {
    const item =
      children[index];

    const previous =
      children[index - 1];

    if (
      selectedSet.has(item) &&
      !selectedSet.has(previous)
    ) {
      art.insertBefore(
        item,
        previous
      );

      children[index] =
        previous;

      children[index - 1] =
        item;
    }
  }

  renderLayers();
  drawSelection();
  recordHistory({
    label:
      "Send Backward"
  });
}

function contextMenuItem(label, action, options = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "context-menu-item";
  button.dataset.contextAction = action;

  if (options.danger) button.classList.add("danger");

  const text = document.createElement("span");
  text.textContent = label;
  button.appendChild(text);

  if (options.shortcut) {
    const shortcut = document.createElement("span");
    shortcut.className = "context-menu-shortcut";
    shortcut.textContent = options.shortcut;
    button.appendChild(shortcut);
  }

  return button;
}

function contextMenuSeparator() {
  const separator = document.createElement("div");
  separator.className = "context-menu-separator";
  separator.setAttribute("role", "separator");
  return separator;
}

function closeCanvasContextMenu() {
  canvasContextMenu.hidden = true;
}

function placeCanvasContextMenu(clientX, clientY) {
  canvasContextMenu.style.left = `${clientX}px`;
  canvasContextMenu.style.top = `${clientY}px`;

  requestAnimationFrame(() => {
    const rect = canvasContextMenu.getBoundingClientRect();
    const pad = 8;
    const x = rect.right > window.innerWidth - pad
      ? Math.max(pad, window.innerWidth - rect.width - pad)
      : clientX;
    const y = rect.bottom > window.innerHeight - pad
      ? Math.max(pad, window.innerHeight - rect.height - pad)
      : clientY;

    canvasContextMenu.style.left = `${x}px`;
    canvasContextMenu.style.top = `${y}px`;
  });
}

function openCanvasContextMenu(event) {
  const target = event.target.closest("[data-object='true']");
  const validTarget = target && isLayerInteractive(target) ? target : null;

  if (validTarget) {
    if (!selectedItems.includes(validTarget)) {
      selectElement(validTarget);
    } else {
      selected = validTarget;
      drawSelection();
      renderLayers();
    }
  }

  if (!selectedItems.length) {
    closeCanvasContextMenu();
    return;
  }

  canvasContextMenu.replaceChildren();

  const multiple = selectedItems.length > 1;
  const single = multiple ? null : selectedItems[0];

  canvasContextMenu.append(
    contextMenuItem("Bring to Front", "bring-front"),
    contextMenuItem("Bring Forward", "bring-forward"),
    contextMenuItem("Send Backward", "send-backward"),
    contextMenuItem("Send to Back", "send-back"),
    contextMenuSeparator()
  );

  if (multiple) {
    canvasContextMenu.append(
      contextMenuItem("Group", "group", { shortcut: "Ctrl/Cmd+G" }),
      contextMenuItem("Align Horizontal Centers", "align-h"),
      contextMenuItem("Align Vertical Centers", "align-v"),
      contextMenuSeparator()
    );
  } else if (single && isGroup(single)) {
    canvasContextMenu.append(
      contextMenuItem("Ungroup", "ungroup"),
      contextMenuSeparator()
    );
  } else if (single) {
    let geometryActions = false;

    if (isTextElement(single)) {
      canvasContextMenu.append(
        contextMenuItem("Edit Text", "edit-text"),
        contextMenuItem("Convert Text to Outlines", "outline-text")
      );
      geometryActions = true;
    } else if (single.tagName !== "path") {
      canvasContextMenu.append(
        contextMenuItem("Convert to Path", "convert-path")
      );
      geometryActions = true;
    }

    if (!isTextElement(single) && isOffsetPathEligible(single)) {
      canvasContextMenu.append(
        contextMenuItem("Offset Path…", "offset-path")
      );
      geometryActions = true;
    }

    if (geometryActions) {
      canvasContextMenu.append(contextMenuSeparator());
    }
  }

  canvasContextMenu.append(
    contextMenuItem("Duplicate", "duplicate", { shortcut: "Ctrl/Cmd+D" }),
    contextMenuItem("Delete", "delete", { shortcut: "Del", danger: true })
  );

  canvasContextMenu.hidden = false;
  placeCanvasContextMenu(event.clientX, event.clientY);
}

function runCanvasContextAction(action) {
  if (action === "bring-front") bringSelectedToFront();
  if (action === "bring-forward") bringSelectedForward();
  if (action === "send-backward") sendSelectedBackward();
  if (action === "send-back") sendSelectedToBack();
  if (action === "duplicate") duplicateSelected();
  if (action === "delete") deleteSelected();
  if (action === "group") groupSelected();
  if (action === "ungroup") ungroupSelected();
  if (action === "convert-path") convertSelectedToPath();
  if (action === "edit-text" && isTextElement(selected)) beginTextEditing(selected);
  if (action === "outline-text") convertSelectedTextToOutlines();
  if (action === "offset-path") openOffsetPathModal();
  if (action === "align-h") alignSelectedObjects("hcenter");
  if (action === "align-v") alignSelectedObjects("vcenter");

  closeCanvasContextMenu();
  renderSelectionQuickMenu();
}

svg.addEventListener("contextmenu", event => {
  event.preventDefault();
  event.stopPropagation();
  openCanvasContextMenu(event);
});

canvasContextMenu.addEventListener("pointerdown", event => {
  event.stopPropagation();
});

canvasContextMenu.addEventListener("click", event => {
  const button = event.target.closest("[data-context-action]");
  if (!button) return;

  event.preventDefault();
  event.stopPropagation();
  runCanvasContextAction(button.dataset.contextAction);
});

document.addEventListener(
  "pointerdown",
  event => {
    if (!canvasContextMenu.contains(event.target)) {
      closeCanvasContextMenu();
    }

    if (!canvasTabContextMenu.contains(event.target)) {
      closeCanvasTabContextMenu();
    }
  },
  true
);


function copySelected() {
  const editableItems =
    selectedItems
      .filter(
        isLayerInteractive
      )
      .filter(
        item =>
          item.parentNode === art
      );

  if (!editableItems.length) {
    toolStatus.textContent =
      "Nothing selected to copy";
    return false;
  }

  /*
   * Preserve canvas stacking order rather than the order in which objects
   * happened to be selected.
   */
  const selectedSet =
    new Set(
      editableItems
    );

  vectorClipboard =
    [...art.children]
      .filter(element =>
        selectedSet.has(element)
      )
      .map(
        serializeElementForProject
      );

  vectorClipboardPasteCount = 0;

  broadcastSplitClipboard();

  toolStatus.textContent =
    editableItems.length === 1
      ? "Copied 1 object"
      : `Copied ${editableItems.length} objects`;

  return true;
}

function resetPastedElementIdentity(
  element,
  topLevel = true
) {
  if (!element) return;

  element.removeAttribute("id");

  delete element.dataset
    .strokeProfileId;

  /*
   * Gradient definitions use per-object ids in SVG <defs>. Retain the
   * gradient recipe but force the pasted object to receive a fresh id.
   */
  delete element.dataset
    .gradientId;

  if (topLevel) {
    objectCounter += 1;
    element.dataset.name =
      `${capitalize(element.tagName)} ${objectCounter}`;
    element.dataset.object =
      "true";
  }

  [...element.children].forEach(
    child =>
      resetPastedElementIdentity(
        child,
        false
      )
  );
}

function offsetPastedElement(
  element,
  amount
) {
  if (!element) return;

  const tx =
    Number(
      element.dataset.tx || 0
    );

  const ty =
    Number(
      element.dataset.ty || 0
    );

  element.dataset.tx =
    String(tx + amount);

  element.dataset.ty =
    String(ty + amount);

  applyObjectTransform(
    element
  );
}

function pasteClipboard() {
  if (!vectorClipboard.length) {
    toolStatus.textContent =
      "Clipboard is empty";
    return false;
  }

  vectorClipboardPasteCount += 1;

  const offset =
    20 *
    vectorClipboardPasteCount;

  const pasted = [];

  vectorClipboard.forEach(
    data => {
      const cloneData =
        JSON.parse(
          JSON.stringify(data)
        );

      const element =
        createElementFromProject(
          cloneData,
          true
        );

      resetPastedElementIdentity(
        element,
        true
      );

      art.appendChild(
        element
      );

      applyLayerState(
        element
      );

      offsetPastedElement(
        element,
        offset
      );

      pasted.push(
        element
      );
    }
  );

  /*
   * Rebuild paint definitions after ids have been regenerated so pasted
   * gradient objects remain independent from their originals.
   */
  restoreGradientDefinitions();
  refreshAllStrokeProfiles();

  setSelection(
    pasted,
    pasted[
      pasted.length - 1
    ]
  );

  renderLayers();

  recordHistory({
    label:
      pasted.length === 1
        ? "Object Pasted"
        : `${pasted.length} Objects Pasted`,
    detail:
      "Pasted from clipboard"
  });

  toolStatus.textContent =
    pasted.length === 1
      ? "Pasted 1 object"
      : `Pasted ${pasted.length} objects`;

  return true;
}

function cutSelected() {
  if (!copySelected()) {
    return false;
  }

  const count =
    selectedItems.length;

  deleteSelected();

  toolStatus.textContent =
    count === 1
      ? "Cut 1 object"
      : `Cut ${count} objects`;

  return true;
}


function updateRepeatActionMenuState() {
  if (!repeatActionMenuItem) {
    return;
  }

  repeatActionMenuItem.disabled =
    !lastRepeatAction;
}

function setLastRepeatAction(
  action
) {
  if (
    repeatActionApplying ||
    !action
  ) {
    return;
  }

  const meaningful =
    (
      action.type ===
        "move" &&
      (
        Math.abs(action.dx) >
          1e-6 ||
        Math.abs(action.dy) >
          1e-6
      )
    ) ||
    (
      action.type ===
        "rotate" &&
      Math.abs(
        action.delta
      ) >
        1e-6
    ) ||
    (
      action.type ===
        "scale" &&
      (
        Math.abs(
          action.scaleX -
            1
        ) >
          1e-6 ||
        Math.abs(
          action.scaleY -
            1
        ) >
          1e-6
      )
    );

  if (!meaningful) {
    return;
  }

  lastRepeatAction = {
    ...action
  };

  updateRepeatActionMenuState();
}

function cloneSelectionForRepeatAction() {
  const editableItems =
    selectedItems.filter(
      isLayerInteractive
    );

  if (!editableItems.length) {
    return [];
  }

  const clones = [];

  editableItems.forEach(
    item => {
      const clone =
        item.cloneNode(true);

      objectCounter += 1;

      clone.dataset.name =
        `${item.dataset.name || capitalize(item.tagName)} Copy ${objectCounter}`;

      delete clone.dataset
        .strokeProfileId;

      /*
       * Repeat Action copy starts exactly on the source. The repeated
       * transform itself supplies the displacement/rotation/scale.
       */
      const translation =
        getTranslation(item);

      clone.dataset.tx =
        String(
          translation.x
        );

      clone.dataset.ty =
        String(
          translation.y
        );

      clone.dataset.rotation =
        String(
          getRotation(item)
        );

      const scale =
        getObjectScale(item);

      clone.dataset.scaleX =
        String(scale.x);

      clone.dataset.scaleY =
        String(scale.y);

      if (item._anchors) {
        clone._anchors =
          item._anchors.map(
            anchor => ({
              ...anchor
            })
          );
      }

      applyObjectTransform(
        clone
      );

      art.appendChild(
        clone
      );

      clones.push(
        clone
      );
    }
  );

  setSelection(
    clones,
    clones[
      clones.length - 1
    ]
  );

  return clones;
}

function applyRepeatActionToElement(
  element,
  action
) {
  if (
    !element ||
    !action
  ) {
    return;
  }

  if (
    action.type ===
    "move"
  ) {
    const translation =
      getTranslation(
        element
      );

    element.dataset.tx =
      String(
        translation.x +
          action.dx
      );

    element.dataset.ty =
      String(
        translation.y +
          action.dy
      );
  }

  if (
    action.type ===
    "rotate"
  ) {
    element.dataset.rotation =
      String(
        getRotation(
          element
        ) +
        action.delta
      );
  }

  if (
    action.type ===
    "scale"
  ) {
    const scale =
      getObjectScale(
        element
      );

    element.dataset.scaleX =
      String(
        scale.x *
          action.scaleX
      );

    element.dataset.scaleY =
      String(
        scale.y *
          action.scaleY
      );
  }

  applyObjectTransform(
    element
  );
}

function repeatLastAction() {
  if (
    !lastRepeatAction
  ) {
    toolStatus.textContent =
      "Repeat Action: no move, rotate, or scale to repeat yet";

    return false;
  }

  if (
    !selectedItems
      .filter(
        isLayerInteractive
      )
      .length
  ) {
    toolStatus.textContent =
      "Repeat Action: select an object first";

    return false;
  }

  repeatActionApplying =
    true;

  try {
    const copy =
      Boolean(
        repeatActionCopy
          ?.checked
      );

    const targets =
      copy
        ? cloneSelectionForRepeatAction()
        : selectedItems.filter(
            isLayerInteractive
          );

    if (!targets.length) {
      return false;
    }

    targets.forEach(
      element =>
        applyRepeatActionToElement(
          element,
          lastRepeatAction
        )
    );

    setSelection(
      targets,
      targets[
        targets.length - 1
      ]
    );

    updatePropertyControls();
    drawSelection();
    renderLayers();

    const detail =
      lastRepeatAction.type ===
        "move"
        ? `Move ${lastRepeatAction.dx.toFixed(1)}, ${lastRepeatAction.dy.toFixed(1)}`
        : lastRepeatAction.type ===
            "rotate"
          ? `Rotate ${lastRepeatAction.delta.toFixed(1)}°`
          : `Scale ${lastRepeatAction.scaleX.toFixed(3)} × ${lastRepeatAction.scaleY.toFixed(3)}`;

    recordHistory({
      label:
        copy
          ? "Repeat Action Copy"
          : "Repeat Action",
      detail
    });

    toolStatus.textContent =
      copy
        ? `Repeated ${lastRepeatAction.type} on copy`
        : `Repeated ${lastRepeatAction.type}`;

    return true;
  } finally {
    repeatActionApplying =
      false;
  }
}

function duplicateSelected() {
  const editableItems = selectedItems.filter(isLayerInteractive);
  if (!editableItems.length) return;

  const clones = [];

  editableItems.forEach(item => {
    const clone = item.cloneNode(true);
    objectCounter++;
    clone.dataset.name = `${capitalize(clone.tagName)} ${objectCounter}`;
    delete clone.dataset.strokeProfileId;

    const t = getTranslation(item);
    clone.dataset.tx = t.x + 20;
    clone.dataset.ty = t.y + 20;
    if (clone.dataset.rotation === undefined) {
      clone.dataset.rotation = getRotation(item);
    }
    applyObjectTransform(clone);

    if (item._anchors) {
      clone._anchors = item._anchors.map(a => ({...a}));
    }

    art.appendChild(clone);
    clones.push(clone);
  });

  setSelection(clones, clones[clones.length - 1]);
  recordHistory({
    label:
      clones.length === 1
        ? `${historyObjectLabel(clones[0])} Duplicated`
        : `${clones.length} Objects Duplicated`,
    detail: "Duplicate created"
  });
}

function deleteSelected() {
  if (
    pathRepeatShapeEdit &&
    selectedItems.includes(
      pathRepeatShapeEdit.proxy
    )
  ) {
    endPathRepeatShapeEdit({
      selectRepeat: true,
      keepPanel: true
    });

    toolStatus.textContent =
      "Repeat Along Path: source edit cancelled";

    return;
  }

  const editableItems = selectedItems.filter(isLayerInteractive);

  if (!editableItems.length) {
    selected = null;
    selectedItems = [];
    selectionOverlay.innerHTML = "";
    selectionQuickMenu.hidden = true;
    renderSelectionQuickMenu();
    return;
  }

  editableItems.forEach(item => {
    removeStrokeProfileOverlay(
      item
    );
    item.remove();
  });

  selected = null;
  selectedItems = [];
  roundedCornerSelection.clear();
  selectionOverlay.innerHTML = "";
  selectionQuickMenu.replaceChildren();
  selectionQuickMenu.hidden = true;

  updateTransformPanel();
  updateAlignDistributeControls();
  renderLayers();
  renderSelectionQuickMenu();
  recordHistory({
    label:
      editableItems.length === 1
        ? "Object Deleted"
        : `${editableItems.length} Objects Deleted`,
    detail: "Removed from document"
  });
}

document.querySelector("#duplicateBtn").addEventListener("click", duplicateSelected);
document.querySelector("#deleteBtn").addEventListener("click", deleteSelected);

/* ---------------- LAYERS ---------------- */

function toggleLayerVisibility(element) {
  const willHide = !isLayerHidden(element);
  element.dataset.hidden = willHide ? "true" : "false";
  applyLayerState(element);

  if (willHide && selectedItems.includes(element)) {
    setSelection(
      selectedItems.filter(item => item !== element),
      selected === element ? null : selected
    );
  } else {
    drawSelection();
    renderLayers();
  }

  recordHistory();
}

function toggleLayerLock(element) {
  const willLock = !isLayerLocked(element);
  element.dataset.locked = willLock ? "true" : "false";
  applyLayerState(element);

  if (willLock && selectedItems.includes(element)) {
    setSelection(
      selectedItems.filter(item => item !== element),
      selected === element ? null : selected
    );
  } else {
    drawSelection();
    renderLayers();
  }

  recordHistory();
}

let layerDragState = null;

function isOrdinaryLayerGroup(element) {
  return Boolean(
    isGroup(element) &&
    !isRepeatGrid(element) &&
    !isPathRepeat(element) &&
    !isThreeDExtrude(element) &&
    !isArtBrushObject(element) &&
    !isRadialRepeat(element)
  );
}

function layerAncestorTranslation(element) {
  let x = 0;
  let y = 0;
  let node = element?.parentElement || null;

  while (node && node !== art) {
    if (isGroup(node)) {
      const translation = getTranslation(node);
      x += Number(translation.x) || 0;
      y += Number(translation.y) || 0;
    }
    node = node.parentElement;
  }

  return { x, y };
}

function layerWorldTranslation(element) {
  const own = getTranslation(element);
  const ancestors = layerAncestorTranslation(element);
  return {
    x: (Number(own.x) || 0) + ancestors.x,
    y: (Number(own.y) || 0) + ancestors.y
  };
}

function setLayerMembershipForParent(element, parent) {
  if (!element) return;

  if (parent === art) {
    element.dataset.object = "true";
    delete element.dataset.groupChild;
  } else {
    element.removeAttribute("data-object");
    element.dataset.groupChild = "true";
  }
}

function reparentLayerPreservingPosition(element, parent, beforeNode = null) {
  if (!element || !parent) return false;
  if (element === parent || element.contains?.(parent)) return false;

  const world = layerWorldTranslation(element);

  if (beforeNode && beforeNode.parentNode === parent) {
    parent.insertBefore(element, beforeNode);
  } else {
    parent.appendChild(element);
  }

  setLayerMembershipForParent(element, parent);

  const ancestors = layerAncestorTranslation(element);
  element.dataset.tx = String(world.x - ancestors.x);
  element.dataset.ty = String(world.y - ancestors.y);
  applyObjectTransform(element);
  applyLayerState(element);
  return true;
}

function createLayerGroupAtTarget(dragged, target) {
  if (!dragged || !target || dragged === target) return null;
  if (dragged.contains?.(target) || target.contains?.(dragged)) return null;

  const parent = target.parentNode;
  if (!parent || (parent !== art && !isGroup(parent))) return null;

  objectCounter++;
  const group = document.createElementNS(SVG_NS, "g");
  group.dataset.group = "true";
  group.dataset.name = `Group ${objectCounter}`;
  group.dataset.tx = "0";
  group.dataset.ty = "0";
  group.dataset.rotation = "0";
  group.dataset.scaleX = "1";
  group.dataset.scaleY = "1";
  group.dataset.hidden = "false";
  group.dataset.locked = "false";
  setLayerMembershipForParent(group, parent);

  // Put the new group exactly where the target sat in the parent's draw order.
  parent.insertBefore(group, target);
  reparentLayerPreservingPosition(target, group);
  reparentLayerPreservingPosition(dragged, group);
  applyObjectTransform(group);

  const key = group.dataset.name;
  expandedLayerGroups.add(key);
  return group;
}

function layerDropZone(row, clientY) {
  const rect = row.getBoundingClientRect();
  if (!rect.height) return "inside";

  const localY = Math.max(0, Math.min(rect.height, clientY - rect.top));
  const ratio = localY / rect.height;

  // Make reorder targets intentionally generous. The top and bottom 30% of
  // the target row are insertion zones; only the central 40% groups.
  // This prevents normal edge drops from being swallowed by the GROUP action.
  if (ratio < 0.30) return "above";
  if (ratio > 0.70) return "below";
  return "inside";
}

function clearLayerDropIndicators() {
  layersPanel.querySelectorAll(
    ".layer-drop-above, .layer-drop-below, .layer-drop-inside"
  ).forEach(node => {
    node.classList.remove(
      "layer-drop-above",
      "layer-drop-below",
      "layer-drop-inside"
    );
  });

  document.querySelectorAll(".layer-drop-zone-overlay").forEach(node => node.remove());
}

function showLayerDropZoneOverlay(row, activeZone) {
  if (!row) return;

  // Render drop feedback at viewport level so row overflow/cascade cannot clip it.
  // Position is derived only from the hovered target row.
  document.querySelectorAll(".layer-drop-zone-overlay").forEach(node => node.remove());

  const rect = row.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  if (activeZone === "above" || activeZone === "below") {
    const line = document.createElement("div");
    line.className = `layer-drop-zone-overlay layer-drop-insert-overlay layer-drop-insert-${activeZone}`;
    const y = activeZone === "above" ? rect.top : rect.bottom;
    line.style.cssText = [
      "position:fixed!important",
      `left:${rect.left + 3}px!important`,
      `top:${y}px!important`,
      `width:${Math.max(0, rect.width - 6)}px!important`,
      "height:0!important",
      "transform:translateY(-1px)!important",
      "border-top:2px dashed #a78bfa!important",
      "box-shadow:0 0 6px rgba(139,92,246,.32)!important",
      "z-index:2147483646!important",
      "pointer-events:none!important"
    ].join(";");
    document.body.appendChild(line);
    return;
  }

  if (activeZone !== "inside") return;

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const overlay = document.createElement("div");
  overlay.className = "layer-drop-zone-overlay layer-drop-group-overlay";
  overlay.textContent = "GROUP";
  overlay.style.cssText = [
    "position:fixed!important",
    `left:${centerX}px!important`,
    `top:${centerY}px!important`,
    "transform:translate(-50%,-50%)!important",
    "width:max-content!important",
    "height:auto!important",
    "padding:5px 10px!important",
    "display:inline-flex!important",
    "align-items:center!important",
    "justify-content:center!important",
    "z-index:2147483646!important",
    "pointer-events:none!important",
    "border:1px dashed #a78bfa!important",
    "border-radius:999px!important",
    "background:rgba(65,43,103,.94)!important",
    "color:#fff!important",
    "box-shadow:0 3px 10px rgba(0,0,0,.24)!important",
    "font:700 9px/1 system-ui,sans-serif!important",
    "letter-spacing:.12em!important",
    "text-transform:uppercase!important",
    "white-space:nowrap!important"
  ].join(";");

  document.body.appendChild(overlay);
}

function canDropLayerOn(dragged, target, zone) {
  if (!dragged || !target || dragged === target) return false;
  if (dragged.contains?.(target)) return false;

  if (zone === "inside") {
    // Dropping onto an existing group adds to it. Dropping onto a normal layer
    // creates a new group containing both layers.
    return !target.contains?.(dragged);
  }

  const targetParent = target.parentNode;
  return targetParent === art || isGroup(targetParent);
}


function layerGroupVisualBounds(group) {
  if (!group || !layersPanel) return null;

  const rows = [...layersPanel.querySelectorAll('.layer')].filter(row => {
    const element = row._layerElement;
    return element === group || (element && group.contains?.(element));
  });

  if (!rows.length) return null;
  const rects = rows.map(row => row.getBoundingClientRect()).filter(rect => rect.width && rect.height);
  if (!rects.length) return null;

  return {
    left: Math.min(...rects.map(rect => rect.left)),
    right: Math.max(...rects.map(rect => rect.right)),
    top: Math.min(...rects.map(rect => rect.top)),
    bottom: Math.max(...rects.map(rect => rect.bottom))
  };
}

function isPointerOutsideGroupLayerArea(group, clientX, clientY) {
  const bounds = layerGroupVisualBounds(group);
  if (!bounds) return false;
  return (
    clientX < bounds.left ||
    clientX > bounds.right ||
    clientY < bounds.top ||
    clientY > bounds.bottom
  );
}

function showLayerDetachOverlay(group) {
  document.querySelectorAll('.layer-drop-zone-overlay').forEach(node => node.remove());
  const bounds = layerGroupVisualBounds(group);
  if (!bounds) return;

  const overlay = document.createElement('div');
  overlay.className = 'layer-drop-zone-overlay layer-detach-overlay';
  overlay.textContent = 'REMOVE FROM GROUP';
  overlay.style.cssText = [
    'position:fixed!important',
    `left:${bounds.left + (bounds.right - bounds.left) / 2}px!important`,
    `top:${bounds.top + (bounds.bottom - bounds.top) / 2}px!important`,
    'transform:translate(-50%,-50%)!important',
    'padding:5px 10px!important',
    'display:inline-flex!important',
    'align-items:center!important',
    'justify-content:center!important',
    'z-index:2147483646!important',
    'pointer-events:none!important',
    'border:1px dashed #a78bfa!important',
    'border-radius:999px!important',
    'background:rgba(65,43,103,.94)!important',
    'color:#fff!important',
    'box-shadow:0 3px 10px rgba(0,0,0,.24)!important',
    'font:700 9px/1 system-ui,sans-serif!important',
    'letter-spacing:.09em!important',
    'white-space:nowrap!important'
  ].join(';');
  document.body.appendChild(overlay);
}

function detachLayerFromParentGroup(dragged) {
  if (!dragged || !isGroup(dragged.parentNode)) return false;

  const group = dragged.parentNode;
  const destination = group.parentNode;
  if (!destination || (destination !== art && !isGroup(destination))) return false;

  // Promote one hierarchy level and place it immediately above the old group in
  // the Layers panel (later sibling in SVG draw order). Preserve canvas/world position.
  const beforeNode = group.nextSibling;
  if (!reparentLayerPreservingPosition(dragged, destination, beforeNode)) return false;

  // Remove an empty wrapper group, but keep one-child groups intact because the
  // user may be deliberately maintaining that group structure.
  if (!group.children.length) {
    expandedLayerGroups.delete(group.dataset.name || 'Group');
    group.remove();
  }

  if (dragged.parentNode === art) {
    setSelection([dragged], dragged);
  } else {
    drawSelection();
  }

  renderLayers();
  recordHistory({
    label: 'Layer Removed from Group',
    detail: dragged.dataset.name || layerTypeLabel(dragged)
  });
  return true;
}

function ensureLayersPanelDetachDrop() {
  const layersView = document.querySelector('#layersView');
  if (!layersView || !layersPanel || layersView.dataset.detachDropWired === 'true') return;
  layersView.dataset.detachDropWired = 'true';

  function isEmptyDetachSpace(event) {
    // Detach is intentionally limited to the blank Layers-view space BELOW
    // the rendered layer list. Concrete layer rows continue to own their
    // ABOVE / GROUP / BELOW drop behavior.
    if (event.target.closest?.('.layer')) return false;

    const viewRect = layersView.getBoundingClientRect();
    const listRect = layersPanel.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;

    return (
      x >= viewRect.left && x <= viewRect.right &&
      y >= Math.max(listRect.bottom, viewRect.top) &&
      y <= viewRect.bottom
    );
  }

  function showEmptySpaceDetachFeedback() {
    document.querySelectorAll('.layer-drop-zone-overlay').forEach(node => node.remove());

    const viewRect = layersView.getBoundingClientRect();
    const listRect = layersPanel.getBoundingClientRect();
    const top = Math.max(listRect.bottom, viewRect.top);
    const availableHeight = Math.max(0, viewRect.bottom - top);
    if (availableHeight < 8) return;

    const overlay = document.createElement('div');
    overlay.className = 'layer-drop-zone-overlay layer-detach-overlay';
    overlay.textContent = 'REMOVE FROM GROUP';
    overlay.style.cssText = [
      'position:fixed!important',
      `left:${viewRect.left + viewRect.width / 2}px!important`,
      `top:${top + availableHeight / 2}px!important`,
      'transform:translate(-50%,-50%)!important',
      'padding:5px 10px!important',
      'display:inline-flex!important',
      'align-items:center!important',
      'justify-content:center!important',
      'z-index:2147483646!important',
      'pointer-events:none!important',
      'border:1px dashed #a78bfa!important',
      'border-radius:999px!important',
      'background:rgba(65,43,103,.94)!important',
      'color:#fff!important',
      'box-shadow:0 3px 10px rgba(0,0,0,.24)!important',
      'font:700 9px/1 system-ui,sans-serif!important',
      'letter-spacing:.09em!important',
      'white-space:nowrap!important'
    ].join(';');
    document.body.appendChild(overlay);
  }

  layersView.addEventListener('dragover', event => {
    const dragged = layerDragState?.element;
    if (!dragged || !isGroup(dragged.parentNode)) return;
    if (!isEmptyDetachSpace(event)) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    clearLayerDropIndicators();
    showEmptySpaceDetachFeedback();
  });

  layersView.addEventListener('drop', event => {
    const dragged = layerDragState?.element;
    if (!dragged || !isGroup(dragged.parentNode)) return;
    if (!isEmptyDetachSpace(event)) return;

    event.preventDefault();
    event.stopPropagation();
    clearLayerDropIndicators();
    detachLayerFromParentGroup(dragged);
  });

  layersView.addEventListener('dragleave', event => {
    if (event.relatedTarget && layersView.contains(event.relatedTarget)) return;
    clearLayerDropIndicators();
  });
}

function performLayerDrop(dragged, target, zone) {
  if (!canDropLayerOn(dragged, target, zone)) return false;

  let historyLabel = "Layer Reordered";
  let historyDetail = "Changed draw hierarchy";
  let selectionTarget = null;

  if (zone === "inside") {
    if (isOrdinaryLayerGroup(target)) {
      if (!reparentLayerPreservingPosition(dragged, target)) return false;
      expandedLayerGroups.add(target.dataset.name || "Group");
      selectionTarget = target;
      historyLabel = "Layer Added to Group";
      historyDetail = `${dragged.dataset.name || layerTypeLabel(dragged)} → ${target.dataset.name || "Group"}`;
    } else {
      const group = createLayerGroupAtTarget(dragged, target);
      if (!group) return false;
      selectionTarget = group;
      historyLabel = "Layers Grouped";
      historyDetail = `${target.dataset.name || layerTypeLabel(target)} + ${dragged.dataset.name || layerTypeLabel(dragged)}`;
    }
  } else {
    const parent = target.parentNode;
    if (!parent || (parent !== art && !isGroup(parent))) return false;

    // SVG draws later siblings on top. The Layers panel displays that order in
    // reverse, so "above" in the panel means insert AFTER the target in SVG.
    const beforeNode = zone === "above" ? target.nextSibling : target;
    if (!reparentLayerPreservingPosition(dragged, parent, beforeNode)) return false;
    selectionTarget = parent === art ? dragged : parent;
    historyDetail = `${dragged.dataset.name || layerTypeLabel(dragged)} ${zone} ${target.dataset.name || layerTypeLabel(target)}`;
  }

  if (selectionTarget && selectionTarget.parentNode === art) {
    setSelection([selectionTarget], selectionTarget);
  } else {
    drawSelection();
  }

  renderLayers();
  recordHistory({ label: historyLabel, detail: historyDetail });
  return true;
}

function wireLayerDragAndDrop(row, element) {
  row.draggable = true;
  row._layerElement = element;

  row.addEventListener("dragstart", event => {
    if (
      event.target.closest?.(".layer-control") ||
      event.target.closest?.(".layer-name-input") ||
      event.target.closest?.(".layer-expander")
    ) {
      event.preventDefault();
      return;
    }

    layerDragState = { row, element };
    row.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", element.dataset.name || "layer");
  });

  row.addEventListener("dragend", () => {
    row.classList.remove("dragging");
    clearLayerDropIndicators();
    layerDragState = null;
  });

  row.addEventListener("dragover", event => {
    const dragged = layerDragState?.element;
    if (!dragged || dragged === element) return;

    const zone = layerDropZone(row, event.clientY);
    if (!canDropLayerOn(dragged, element, zone)) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    clearLayerDropIndicators();
    row.classList.add(`layer-drop-${zone}`);
    showLayerDropZoneOverlay(row, zone);
  });

  row.addEventListener("dragleave", event => {
    if (event.relatedTarget && row.contains(event.relatedTarget)) return;
    row.classList.remove(
      "layer-drop-above",
      "layer-drop-below",
      "layer-drop-inside"
    );
  });

  row.addEventListener("drop", event => {
    const dragged = layerDragState?.element;
    if (!dragged || dragged === element) return;

    const zone = layerDropZone(row, event.clientY);
    if (!canDropLayerOn(dragged, element, zone)) return;

    event.preventDefault();
    event.stopPropagation();
    clearLayerDropIndicators();
    performLayerDrop(dragged, element, zone);
  });
}


function beginLayerRename(element, nameNode) {
  if (!element || !nameNode) return;

  const originalName = element.dataset.name || "Object";
  const input = document.createElement("input");

  input.type = "text";
  input.className = "layer-name-input";
  input.value = originalName;
  input.setAttribute("aria-label", "Layer name");

  let finished = false;

  function finish(commit) {
    if (finished) return;
    finished = true;

    if (commit) {
      const nextName = input.value.trim();

      if (nextName && nextName !== originalName) {
        element.dataset.name = nextName;
        recordHistory({
          label: "Layer Renamed",
          detail: `${originalName} → ${nextName}`
        });
      }
    }

    renderLayers();
  }

  input.addEventListener("click", event => {
    event.stopPropagation();
  });

  input.addEventListener("pointerdown", event => {
    event.stopPropagation();
  });

  input.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      finish(true);
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      finish(false);
    }
  });

  input.addEventListener("blur", () => {
    finish(true);
  });

  nameNode.replaceWith(input);
  input.focus();
  input.select();
}


function layerTypeLabel(element) {
  if (!element) return "Object";
  if (element.dataset.threeDObject === "true") return "3D object";
  if (isRepeatGrid(element)) return "Repeat grid";
  if (isGroup(element)) return "Group";
  if (element.dataset.compoundShape === "true") return "Compound path";
  if (element.tagName === "ellipse") return "Ellipse";
  if (element.tagName === "polygon") {
    return element.dataset.shapeType === "star" ? "Star" : "Polygon";
  }
  if (element.tagName === "rect") return "Rectangle";
  if (element.tagName === "line") return "Line";
  if (element.tagName === "text") return "Text";
  if (element.tagName === "path") {
    if (element.dataset.curvaturePath === "true") return "Curvature path";
    return "Path";
  }
  return "Object";
}

function createLayerSvgIcon(kind) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 20 20");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("layer-control-icon");

  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "1.55");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");

  if (kind === "eye") {
    path.setAttribute("d", "M2.4 10s2.7-4.4 7.6-4.4 7.6 4.4 7.6 4.4-2.7 4.4-7.6 4.4S2.4 10 2.4 10Z M10 7.6a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8Z");
  } else if (kind === "eye-off") {
    path.setAttribute("d", "M3 3l14 14 M7.2 5.9A8.4 8.4 0 0 1 10 5.4c4.9 0 7.6 4.6 7.6 4.6a11.7 11.7 0 0 1-2.2 2.7 M12.4 12.4A3.2 3.2 0 0 1 7.6 8 M4.7 7.2A12 12 0 0 0 2.4 10s2.7 4.6 7.6 4.6c.7 0 1.4-.1 2-.3");
  } else if (kind === "lock") {
    path.setAttribute("d", "M5.2 8.7V6.6a4.8 4.8 0 0 1 9.6 0v2.1 M4.4 8.7h11.2v8H4.4v-8Z M10 12v1.7");
  } else if (kind === "unlock") {
    path.setAttribute("d", "M14.8 8.7V6.6a4.8 4.8 0 0 0-9.1-2.1 M4.4 8.7h11.2v8H4.4v-8Z M10 12v1.7");
  } else if (kind === "drag") {
    path.setAttribute("d", "M7 5h.01 M13 5h.01 M7 10h.01 M13 10h.01 M7 15h.01 M13 15h.01");
    path.setAttribute("stroke-width", "2.6");
  }

  svg.appendChild(path);
  return svg;
}

function transformedLayerPreviewBounds(element) {
  // getBBox() can collapse to an empty box when the layer (or a hidden parent
  // group) is display:none. Temporarily reveal only the relevant SVG branch for
  // measurement, then restore the exact inline display values immediately.
  // This affects neither the canvas visually nor the persisted layer state.
  const revealed = [];
  let node = element;
  while (node && node !== art?.parentElement) {
    if (node instanceof SVGElement && (node.style.display === "none" || isLayerHidden(node))) {
      revealed.push({
        node,
        display: node.style.getPropertyValue("display"),
        priority: node.style.getPropertyPriority("display")
      });
      node.style.removeProperty("display");
    }
    if (node === art) break;
    node = node.parentElement;
  }

  let box;
  try {
    box = element.getBBox();
  } catch {
    box = null;
  } finally {
    for (let index = revealed.length - 1; index >= 0; index -= 1) {
      const entry = revealed[index];
      if (entry.display) {
        entry.node.style.setProperty("display", entry.display, entry.priority);
      } else {
        entry.node.style.removeProperty("display");
      }
    }
  }

  if (!box || !Number.isFinite(box.width) || !Number.isFinite(box.height)) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }

  let matrix = null;
  try {
    matrix = element.transform?.baseVal?.consolidate()?.matrix || null;
  } catch {
    matrix = null;
  }

  if (!matrix) {
    return {
      x: box.x,
      y: box.y,
      width: Math.max(box.width, 0.001),
      height: Math.max(box.height, 0.001)
    };
  }

  const corners = [
    [box.x, box.y],
    [box.x + box.width, box.y],
    [box.x + box.width, box.y + box.height],
    [box.x, box.y + box.height]
  ].map(([x, y]) => ({
    x: matrix.a * x + matrix.c * y + matrix.e,
    y: matrix.b * x + matrix.d * y + matrix.f
  }));

  const xs = corners.map(point => point.x);
  const ys = corners.map(point => point.y);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(Math.max(...xs) - Math.min(...xs), 0.001),
    height: Math.max(Math.max(...ys) - Math.min(...ys), 0.001)
  };
}

function createLayerThumbnail(element) {
  const frame = document.createElement("span");
  frame.className = "layer-thumbnail-frame";
  frame.title = layerTypeLabel(element);

  const preview = document.createElementNS(SVG_NS, "svg");
  preview.classList.add("layer-thumbnail");
  preview.setAttribute("aria-hidden", "true");
  preview.setAttribute("preserveAspectRatio", "xMidYMid meet");

  const bounds = transformedLayerPreviewBounds(element);
  const longest = Math.max(bounds.width, bounds.height, 1);
  const pad = Math.max(longest * 0.14, 2);
  preview.setAttribute(
    "viewBox",
    `${bounds.x - pad} ${bounds.y - pad} ${bounds.width + pad * 2} ${bounds.height + pad * 2}`
  );

  const clone = element.cloneNode(true);
  clone.removeAttribute("id");
  clone.removeAttribute("data-object");
  clone.removeAttribute("tabindex");
  clone.style.pointerEvents = "none";

  clone.querySelectorAll?.("[id]").forEach(node => node.removeAttribute("id"));
  clone.querySelectorAll?.("[data-object]").forEach(node => node.removeAttribute("data-object"));
  clone.querySelectorAll?.("[style]").forEach(node => {
    node.style.pointerEvents = "none";
  });

  // Layer visibility should affect the row, not erase its thumbnail completely.
  if (isLayerHidden(element)) {
    clone.style.display = "";
    clone.style.visibility = "visible";
    clone.style.opacity = "1";
  }

  preview.appendChild(clone);
  frame.appendChild(preview);
  return frame;
}


function enforceLayerTwoRowLayout(row, nameLine, metaLine, nameWrap, thumbnail, depth = 0) {
  const important = (el, prop, value) => el?.style?.setProperty(prop, value, "important");

  important(row, "display", "grid");
  important(row, "grid-template-columns", "minmax(0, 1fr)");
  important(row, "grid-template-rows", "auto auto");
  important(row, "align-items", "stretch");
  important(row, "width", "100%");
  important(row, "min-height", "0");
  important(row, "padding", "5px 6px 6px");
  important(row, "overflow", "hidden");

  important(nameLine, "display", "block");
  important(nameLine, "grid-column", "1");
  important(nameLine, "grid-row", "1");
  important(nameLine, "width", "100%");
  important(nameLine, "min-width", "0");
  important(nameLine, "min-height", "20px");
  important(nameLine, "margin", "0 0 3px");
  important(nameLine, "padding", "0");

  important(nameWrap, "display", "flex");
  important(nameWrap, "flex-direction", "row");
  important(nameWrap, "align-items", "center");
  important(nameWrap, "width", "100%");
  important(nameWrap, "min-width", "0");
  important(nameWrap, "height", "20px");
  important(nameWrap, "gap", "4px");
  important(nameWrap, "margin", "0");
  important(nameWrap, "padding", "0");

  // Compact professional metadata row:
  // thumbnail | flexible type/status | visibility | lock.
  important(metaLine, "display", "grid");
  important(metaLine, "grid-template-columns", "28px minmax(0, 1fr) 28px 28px");
  important(metaLine, "align-items", "center");
  important(metaLine, "justify-items", "center");
  important(metaLine, "grid-column", "1");
  important(metaLine, "grid-row", "2");
  important(metaLine, "width", "100%");
  important(metaLine, "min-width", "0");
  important(metaLine, "height", "28px");
  important(metaLine, "min-height", "28px");
  important(metaLine, "column-gap", "8px");
  important(metaLine, "margin", "0");
  important(metaLine, "padding", "0 2px");

  [...metaLine.children].forEach(child => {
    important(child, "position", "static");
    important(child, "grid-row", "1");
    important(child, "margin", "0");
  });

  const [thumb, typeLabel, visibility, lock] = metaLine.children;
  important(thumb, "grid-column", "1");
  important(typeLabel, "grid-column", "2");
  important(typeLabel, "justify-self", "stretch");
  important(typeLabel, "width", "100%");
  important(typeLabel, "min-width", "0");
  important(typeLabel, "text-align", "left");
  important(typeLabel, "padding-right", "8px");
  important(visibility, "grid-column", "3");
  important(lock, "grid-column", "4");

  if (thumbnail) {
    important(thumbnail, "flex", "0 0 24px");
    important(thumbnail, "width", "24px");
    important(thumbnail, "height", "24px");
    important(thumbnail, "min-width", "24px");
  }

  // Nested layers are inset as complete rows so hierarchy reads immediately.
  // Keep the indent modest and cumulative for deeper nested groups.
  if (depth > 0) {
    const indent = Math.min(depth * 12, 48);
    important(row, "margin-left", `${indent}px`);
    important(row, "width", `calc(100% - ${indent}px)`);
  } else {
    important(row, "margin-left", "0");
  }
}


let layerHoverRevealTarget = null;

function ensureLayerHoverRevealOverlay() {
  let overlay = document.getElementById("layerHoverRevealOverlay");
  if (overlay && overlay.isConnected) return overlay;

  overlay = svgEl("g", {
    id: "layerHoverRevealOverlay",
    "pointer-events": "none",
    "aria-hidden": "true"
  });

  // Keep hover reveal beneath actual selection handles/silhouettes.
  if (selectionOverlay?.parentNode) {
    selectionOverlay.parentNode.insertBefore(overlay, selectionOverlay);
  } else {
    svg.appendChild(overlay);
  }
  return overlay;
}

function styleLayerHoverRevealNode(node) {
  if (!(node instanceof SVGElement)) return;

  // Strip cloned IDs so preview-only geometry cannot collide with live defs.
  if (node.hasAttribute("id")) node.removeAttribute("id");
  node.removeAttribute("data-object");
  node.removeAttribute("data-name");
  node.setAttribute("pointer-events", "none");

  const tag = node.tagName.toLowerCase();
  const paintable = new Set([
    "path", "rect", "circle", "ellipse", "polygon", "polyline", "line", "text"
  ]);

  if (paintable.has(tag)) {
    node.setAttribute("fill", "none");
    node.setAttribute("stroke", "#38bdf8");
    node.setAttribute("stroke-width", "2.2");
    node.setAttribute("stroke-linecap", "round");
    node.setAttribute("stroke-linejoin", "round");
    node.setAttribute("vector-effect", "non-scaling-stroke");
    node.setAttribute("opacity", "0.95");
    node.style.filter = "drop-shadow(0 0 2px rgba(56,189,248,.65))";
  }

  [...node.children].forEach(styleLayerHoverRevealNode);
}

function buildLayerHoverRevealRoot(element) {
  const clone = element.cloneNode(true);
  clone.style.display = "";
  clone.style.visibility = "visible";
  clone.removeAttribute("display");
  clone.removeAttribute("visibility");
  clone.setAttribute("pointer-events", "none");
  styleLayerHoverRevealNode(clone);

  // Layer-list drill-down can target children inside transformed groups.
  // Recreate every ancestor transform so the hover outline appears at the
  // child's current canvas/world position.
  const ancestors = [];
  let parent = element.parentElement;
  while (parent && parent !== art && parent !== svg) {
    if (parent instanceof SVGGraphicsElement && parent.hasAttribute("transform")) {
      ancestors.unshift(parent.getAttribute("transform") || "");
    }
    parent = parent.parentElement;
  }

  let root = clone;
  [...ancestors].reverse().forEach(transform => {
    const wrapper = svgEl("g", {
      transform,
      "pointer-events": "none"
    });
    wrapper.appendChild(root);
    root = wrapper;
  });

  return root;
}

function clearLayerHoverReveal(element = null) {
  if (element && layerHoverRevealTarget && element !== layerHoverRevealTarget) return;
  layerHoverRevealTarget = null;
  const overlay = document.getElementById("layerHoverRevealOverlay");
  if (overlay) overlay.replaceChildren();
}

function showLayerHoverReveal(element) {
  if (!element || !element.isConnected || isLayerHidden(element)) {
    clearLayerHoverReveal();
    return;
  }

  // Selection already provides a stronger persistent indication; avoid
  // doubling it with hover decoration.
  if (selectedItems.includes(element)) {
    clearLayerHoverReveal();
    return;
  }

  layerHoverRevealTarget = element;
  const overlay = ensureLayerHoverRevealOverlay();
  overlay.replaceChildren(buildLayerHoverRevealRoot(element));
}

function wireLayerHoverReveal(row, element) {
  row.addEventListener("pointerenter", event => {
    // Suppress hover decoration during a Layers drag/drop gesture.
    if (layerDragState?.element) return;
    showLayerHoverReveal(element);
  });

  row.addEventListener("pointerleave", () => {
    clearLayerHoverReveal(element);
  });
}



let layerRowByElement = new WeakMap();
let pendingLayerSelectionScroll = null;

function layerExpansionKey(group) {
  if (!group || !isGroup(group)) return "";
  if (!group.dataset.layerExpandKey) {
    const seed = String(group.dataset.name || "Group")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "group";
    group.dataset.layerExpandKey = `${seed}-${Math.random().toString(36).slice(2, 9)}`;
  }
  return group.dataset.layerExpandKey;
}

function expandLayerAncestorsForElement(element) {
  if (!element || !element.isConnected) return false;
  let changed = false;
  let parent = element.parentElement;
  while (parent && parent !== art && parent !== svg) {
    if (isGroup(parent)) {
      const key = layerExpansionKey(parent);
      if (key && !expandedLayerGroups.has(key)) {
        expandedLayerGroups.add(key);
        changed = true;
      }
    }
    parent = parent.parentElement;
  }
  return changed;
}

function scrollLayerRowIntoView(element) {
  if (!element) return;
  pendingLayerSelectionScroll = element;
  requestAnimationFrame(() => {
    const target = pendingLayerSelectionScroll;
    pendingLayerSelectionScroll = null;
    if (!target) return;
    const row = layerRowByElement.get(target);
    if (!row || !row.isConnected) return;

    const view = document.getElementById("layersView") || layersPanel;
    if (!view) {
      row.scrollIntoView({ block: "nearest" });
      return;
    }

    const rowRect = row.getBoundingClientRect();
    const viewRect = view.getBoundingClientRect();
    if (rowRect.top < viewRect.top) {
      view.scrollTop -= (viewRect.top - rowRect.top) + 6;
    } else if (rowRect.bottom > viewRect.bottom) {
      view.scrollTop += (rowRect.bottom - viewRect.bottom) + 6;
    }
  });
}

function syncLayersToCurrentSelection() {
  const target = selected || selectedItems[selectedItems.length - 1] || null;
  if (!target) return;
  const expanded = expandLayerAncestorsForElement(target);
  if (expanded) {
    renderLayers();
    return;
  }
  scrollLayerRowIntoView(target);
}

function layerSearchQuery() {
  return (layersSearchInput?.value || "").trim().toLocaleLowerCase();
}

function layerMatchesSearch(element, query) {
  if (!query) return true;
  const name = element?.dataset?.name || layerTypeLabel(element) || "";
  const type = layerTypeLabel(element) || "";
  return `${name} ${type}`.toLocaleLowerCase().includes(query);
}

function layerSubtreeMatchesSearch(element, query) {
  if (!query) return true;
  if (layerMatchesSearch(element, query)) return true;
  if (!isGroup(element)) return false;
  return [...element.children].some(child => layerSubtreeMatchesSearch(child, query));
}

function layerDescendantMatchesSearch(element, query) {
  if (!query || !isGroup(element)) return false;
  return [...element.children].some(child => layerSubtreeMatchesSearch(child, query));
}

function countLayerSearchMatches(elements, query) {
  let count = 0;
  const visit = element => {
    if (layerMatchesSearch(element, query)) count += 1;
    if (isGroup(element)) [...element.children].forEach(visit);
  };
  elements.forEach(visit);
  return count;
}

function ensureLayersSearch() {
  if (!layersSearchInput || layersSearchInput.dataset.wired === "true") return;
  layersSearchInput.dataset.wired = "true";

  const sync = () => {
    if (layersSearchClear) layersSearchClear.hidden = !layersSearchInput.value;
    renderLayers();
  };

  layersSearchInput.addEventListener("input", sync);
  layersSearchInput.addEventListener("keydown", event => {
    event.stopPropagation();
    if (event.key === "Escape" && layersSearchInput.value) {
      event.preventDefault();
      layersSearchInput.value = "";
      sync();
    }
  });

  layersSearchClear?.addEventListener("click", event => {
    event.preventDefault();
    layersSearchInput.value = "";
    layersSearchClear.hidden = true;
    layersSearchInput.focus();
    renderLayers();
  });
}

function appendGroupChildRows(group, container, depth = 1, searchQuery = "") {
  const children = [...group.children].reverse();

  children.forEach(child => {
    if (searchQuery && !layerSubtreeMatchesSearch(child, searchQuery)) return;
    const row = document.createElement("div");
    row.className = "layer group-child-layer";
    row.style.setProperty("--layer-depth", depth);
    layerRowByElement.set(child, row);

    if (selectedItems.includes(child)) row.classList.add("selected");
    if (isLayerHidden(child)) row.classList.add("hidden-layer");
    if (isLayerLocked(child)) row.classList.add("locked-layer");

    const spacer = document.createElement("span");
    spacer.className = "layer-child-spacer";

    const thumbnail = createLayerThumbnail(child);

    const nameWrap = document.createElement("div");
    nameWrap.className = "layer-name-wrap layer-child-name-wrap";

    if (isGroup(child)) {
      const nestedKey = layerExpansionKey(child);
      const nestedExpanded = expandedLayerGroups.has(nestedKey) ||
        (searchQuery && layerDescendantMatchesSearch(child, searchQuery));
      const expander = document.createElement("button");
      expander.type = "button";
      expander.className = "layer-expander";
      expander.title = nestedExpanded ? "Collapse group" : "Expand group";
      expander.setAttribute("aria-expanded", nestedExpanded ? "true" : "false");
      expander.innerHTML = nestedExpanded
        ? '<svg class="layer-expander-icon" viewBox="0 0 16 16" aria-hidden="true"><path style="fill:none !important;stroke:var(--layer-expander-stroke,#e6e9ef) !important;stroke-width:2.25 !important;stroke-linecap:round !important;stroke-linejoin:round !important" d="M3.5 5.5 8 10l4.5-4.5"/></svg>'
        : '<svg class="layer-expander-icon" viewBox="0 0 16 16" aria-hidden="true"><path style="fill:none !important;stroke:var(--layer-expander-stroke,#e6e9ef) !important;stroke-width:2.25 !important;stroke-linecap:round !important;stroke-linejoin:round !important" d="m5.5 3.5 4.5 4.5-4.5 4.5"/></svg>';
      expander.addEventListener("pointerdown", event => event.stopPropagation());
      expander.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        if (expandedLayerGroups.has(nestedKey)) expandedLayerGroups.delete(nestedKey);
        else expandedLayerGroups.add(nestedKey);
        renderLayers();
      });
      nameWrap.appendChild(expander);
    } else {
      const expanderSpacer = document.createElement("span");
      expanderSpacer.className = "layer-expander-spacer";
      nameWrap.appendChild(expanderSpacer);
    }

    const name = document.createElement("span");
    name.className = "layer-name layer-child-name";
    name.textContent = child.dataset.name || layerTypeLabel(child);
    name.title = "Group child";

    const type = document.createElement("span");
    type.className = "layer-type-label";
    type.textContent = layerTypeLabel(child);

    nameWrap.append(name, type);

    const visibilityStatus = document.createElement("span");
    visibilityStatus.className = "layer-child-status layer-child-visibility-status";
    if (isLayerHidden(child)) {
      visibilityStatus.appendChild(createLayerSvgIcon("eye-off"));
      visibilityStatus.title = "Hidden inside group";
    }

    const lockStatus = document.createElement("span");
    lockStatus.className = "layer-child-status layer-child-lock-status";
    if (isLayerLocked(child)) {
      lockStatus.appendChild(createLayerSvgIcon("lock"));
      lockStatus.title = "Locked inside group";
    }

    const nameLine = document.createElement("div");
    nameLine.className = "layer-name-line";
    nameLine.appendChild(nameWrap);

    const metaLine = document.createElement("div");
    metaLine.className = "layer-meta-line";
    metaLine.append(thumbnail, type, visibilityStatus, lockStatus);

    // Type now lives on the compact metadata row; keep the name row text-only.
    if (type.parentNode === nameWrap) type.remove();
    row.append(nameLine, metaLine);
    enforceLayerTwoRowLayout(row, nameLine, metaLine, nameWrap, thumbnail, depth);

    // Explicitly choosing a group child from Layers enters direct-child edit
    // context. This is deliberately different from canvas selection, which
    // resolves the same artwork to its owning top-level group.
    row.addEventListener("click", event => {
      if (
        event.target.closest(".layer-control") ||
        event.target.closest(".layer-name-input") ||
        event.target.closest(".layer-expander")
      ) {
        return;
      }

      if (!isLayerInteractive(child)) return;

      if (activeTool !== "vertex") {
        setTool("select");
      }
      selectElement(child, event.shiftKey);
    });

    wireLayerDragAndDrop(row, child);
    wireLayerHoverReveal(row, child);
    wireLayerContextMenu(row, child);

    container.appendChild(row);

    if (isGroup(child)) {
      const nestedKey = layerExpansionKey(child);
      if (expandedLayerGroups.has(nestedKey)) {
        appendGroupChildRows(child, container, depth + 1, searchQuery);
      }
    }
  });
}



/* ---------------- LAYERS CONTEXT MENU ---------------- */

let layerContextMenu = null;
let layerContextTarget = null;
let layerContextMenuWired = false;

function ensureLayerContextMenu() {
  if (layerContextMenu?.isConnected) return layerContextMenu;

  layerContextMenu = document.createElement("div");
  layerContextMenu.id = "layerContextMenu";
  layerContextMenu.className = "canvas-context-menu layer-context-menu";
  layerContextMenu.setAttribute("role", "menu");
  layerContextMenu.setAttribute("aria-label", "Layer actions");
  layerContextMenu.hidden = true;
  document.body.appendChild(layerContextMenu);

  if (!layerContextMenuWired) {
    layerContextMenuWired = true;

    layerContextMenu.addEventListener("pointerdown", event => {
      event.stopPropagation();
    });

    layerContextMenu.addEventListener("click", event => {
      const button = event.target.closest("[data-context-action]");
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      runLayerContextAction(button.dataset.contextAction);
    });

    document.addEventListener("pointerdown", event => {
      if (layerContextMenu?.hidden) return;
      if (layerContextMenu.contains(event.target)) return;
      closeLayerContextMenu();
    }, true);

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") closeLayerContextMenu();
    });

    window.addEventListener("blur", closeLayerContextMenu);
    window.addEventListener("resize", closeLayerContextMenu);
    document.addEventListener("scroll", closeLayerContextMenu, true);
  }

  return layerContextMenu;
}

function closeLayerContextMenu() {
  if (layerContextMenu) layerContextMenu.hidden = true;
  layerContextTarget = null;
}

function placeLayerContextMenu(clientX, clientY) {
  if (!layerContextMenu) return;
  layerContextMenu.style.left = `${clientX}px`;
  layerContextMenu.style.top = `${clientY}px`;

  requestAnimationFrame(() => {
    if (!layerContextMenu || layerContextMenu.hidden) return;
    const rect = layerContextMenu.getBoundingClientRect();
    const pad = 8;
    const x = rect.right > window.innerWidth - pad
      ? Math.max(pad, window.innerWidth - rect.width - pad)
      : clientX;
    const y = rect.bottom > window.innerHeight - pad
      ? Math.max(pad, window.innerHeight - rect.height - pad)
      : clientY;
    layerContextMenu.style.left = `${x}px`;
    layerContextMenu.style.top = `${y}px`;
  });
}

function layerSiblingElements(element) {
  const parent = element?.parentNode;
  if (!parent) return [];
  return [...parent.children].filter(child =>
    child.dataset?.object === "true" ||
    child.dataset?.groupChild === "true"
  );
}

function reorderLayerContextTarget(element, action) {
  if (!element?.parentNode) return false;
  const parent = element.parentNode;
  const siblings = layerSiblingElements(element);
  const index = siblings.indexOf(element);
  if (index < 0) return false;

  if (action === "layer-bring-front") {
    parent.appendChild(element);
  } else if (action === "layer-send-back") {
    parent.insertBefore(element, siblings[0] || null);
  } else if (action === "layer-bring-forward") {
    if (index >= siblings.length - 1) return false;
    const next = siblings[index + 1];
    parent.insertBefore(next, element);
  } else if (action === "layer-send-backward") {
    if (index <= 0) return false;
    const previous = siblings[index - 1];
    parent.insertBefore(element, previous);
  } else {
    return false;
  }

  renderLayers();
  drawSelection();
  recordHistory({
    label: action === "layer-bring-front" ? "Layer Brought to Front" :
      action === "layer-send-back" ? "Layer Sent to Back" :
      action === "layer-bring-forward" ? "Layer Brought Forward" :
      "Layer Sent Backward",
    detail: element.dataset.name || layerTypeLabel(element)
  });
  return true;
}

function duplicateLayerContextTarget(element) {
  if (!element?.parentNode) return null;

  const clone = element.cloneNode(true);
  objectCounter++;
  clone.dataset.name = `${element.dataset.name || layerTypeLabel(element)} Copy`;
  delete clone.dataset.strokeProfileId;

  if (element._anchors) {
    clone._anchors = element._anchors.map(anchor => ({ ...anchor }));
  }

  element.parentNode.insertBefore(clone, element.nextSibling);
  setLayerMembershipForParent(clone, element.parentNode);
  applyObjectTransform(clone);
  applyLayerState(clone);

  if (clone.parentNode === art) {
    setSelection([clone], clone);
  } else {
    selectElement(clone);
  }

  recordHistory({
    label: `${historyObjectLabel(clone)} Duplicated`,
    detail: "Layer duplicate created"
  });
  renderLayers();
  return clone;
}

function canGroupLayerContextSelection() {
  const items = selectedItems.filter(isLayerInteractive);
  if (items.length < 2) return false;
  const parent = items[0]?.parentNode;
  return !!parent && items.every(item => item.parentNode === parent);
}

function groupLayerContextSelection() {
  const items = selectedItems.filter(isLayerInteractive);
  if (items.length < 2) return false;
  const parent = items[0]?.parentNode;
  if (!parent || !items.every(item => item.parentNode === parent)) return false;

  if (parent === art) {
    groupSelected();
    return true;
  }

  const siblings = [...parent.children];
  const ordered = siblings.filter(item => items.includes(item));
  if (ordered.length < 2) return false;
  const insertionPoint = ordered[ordered.length - 1].nextSibling;

  objectCounter++;
  const group = document.createElementNS(SVG_NS, "g");
  group.dataset.group = "true";
  group.dataset.groupChild = "true";
  group.dataset.name = `Group ${objectCounter}`;
  group.dataset.tx = "0";
  group.dataset.ty = "0";
  group.dataset.rotation = "0";
  group.dataset.scaleX = "1";
  group.dataset.scaleY = "1";
  group.dataset.hidden = "false";
  group.dataset.locked = "false";

  parent.insertBefore(group, insertionPoint);
  ordered.forEach(item => reparentLayerPreservingPosition(item, group));
  applyObjectTransform(group);
  expandedLayerGroups.add(layerExpansionKey(group));
  selectElement(group);
  renderLayers();
  recordHistory({ label: "Layers Grouped", detail: `${ordered.length} layers grouped` });
  return true;
}

function canUngroupLayerContextTarget(element) {
  return !!(
    element &&
    isGroup(element) &&
    !isRepeatGrid(element) &&
    !isPathRepeat(element) &&
    !isThreeDExtrude(element) &&
    !isArtBrushObject(element)
  );
}

function ungroupLayerContextTarget(group) {
  if (!canUngroupLayerContextTarget(group) || !group.parentNode) return false;

  if (group.parentNode === art) {
    setSelection([group], group);
    ungroupSelected();
    return true;
  }

  const parent = group.parentNode;
  const revealed = [];
  [...group.children].forEach(child => {
    reparentLayerPreservingPosition(child, parent, group);
    revealed.push(child);
  });
  expandedLayerGroups.delete(layerExpansionKey(group));
  group.remove();

  if (revealed.length) selectElement(revealed[revealed.length - 1]);
  renderLayers();
  recordHistory({ label: "Layer Group Ungrouped", detail: `${revealed.length} layers released` });
  return true;
}

function openLayerContextMenu(event, element) {
  if (!element) return;
  const menu = ensureLayerContextMenu();

  event.preventDefault();
  event.stopPropagation();
  closeCanvasContextMenu();
  clearLayerHoverReveal();

  if (!selectedItems.includes(element)) {
    if (activeTool !== "vertex") setTool("select");
    selectElement(element);
  } else {
    selected = element;
    drawSelection();
    renderLayers();
  }

  layerContextTarget = element;
  const multiple = selectedItems.length > 1 && selectedItems.includes(element);
  const hidden = isLayerHidden(element);
  const locked = isLayerLocked(element);

  menu.replaceChildren();

  menu.append(
    contextMenuItem("Rename", "layer-rename"),
    contextMenuItem("Duplicate", "layer-duplicate", { shortcut: "Ctrl/Cmd+D" }),
    contextMenuSeparator(),
    contextMenuItem(hidden ? "Show" : "Hide", "layer-toggle-visibility"),
    contextMenuItem(locked ? "Unlock" : "Lock", "layer-toggle-lock"),
    contextMenuSeparator(),
    contextMenuItem("Bring to Front", "layer-bring-front"),
    contextMenuItem("Bring Forward", "layer-bring-forward"),
    contextMenuItem("Send Backward", "layer-send-backward"),
    contextMenuItem("Send to Back", "layer-send-back")
  );

  if (multiple && canGroupLayerContextSelection()) {
    menu.append(
      contextMenuSeparator(),
      contextMenuItem("Group Selected", "layer-group", { shortcut: "Ctrl/Cmd+G" })
    );
  } else if (canUngroupLayerContextTarget(element)) {
    menu.append(
      contextMenuSeparator(),
      contextMenuItem("Ungroup", "layer-ungroup", { shortcut: "Ctrl/Cmd+Shift+G" })
    );
  }

  menu.append(
    contextMenuSeparator(),
    contextMenuItem("Delete", "layer-delete", { shortcut: "Del", danger: true })
  );

  menu.hidden = false;
  placeLayerContextMenu(event.clientX, event.clientY);
}

function runLayerContextAction(action) {
  const element = layerContextTarget;
  if (!element) {
    closeLayerContextMenu();
    return;
  }

  if (action === "layer-rename") {
    const row = layerRowByElement.get(element);
    const nameNode = row?.querySelector(".layer-name");
    closeLayerContextMenu();
    if (nameNode) beginLayerRename(element, nameNode);
    return;
  }

  if (action === "layer-duplicate") duplicateLayerContextTarget(element);
  else if (action === "layer-toggle-visibility") toggleLayerVisibility(element);
  else if (action === "layer-toggle-lock") toggleLayerLock(element);
  else if (action === "layer-bring-front" || action === "layer-bring-forward" ||
           action === "layer-send-backward" || action === "layer-send-back") {
    reorderLayerContextTarget(element, action);
  }
  else if (action === "layer-group") groupLayerContextSelection();
  else if (action === "layer-ungroup") ungroupLayerContextTarget(element);
  else if (action === "layer-delete") {
    if (!selectedItems.includes(element)) selectElement(element);
    deleteSelected();
  }

  closeLayerContextMenu();
}

function wireLayerContextMenu(row, element) {
  if (!row || !element) return;
  row.addEventListener("contextmenu", event => openLayerContextMenu(event, element));
}

function renderLayers() {
  clearLayerHoverReveal();
  ensureLayersPanelDetachDrop();
  ensureLayersSearch();
  layerRowByElement = new WeakMap();

  // A layer-list direct-child selection may live several groups deep.
  // Ensure every ancestor is open before rows are generated so the selected
  // child remains visible and addressable in the panel.
  const selectionTarget = selected || selectedItems[selectedItems.length - 1] || null;
  if (selectionTarget) expandLayerAncestorsForElement(selectionTarget);

  const objects = [...art.querySelectorAll(":scope > [data-object='true']")].reverse();
  const searchQuery = layerSearchQuery();
  const searchMatchCount = searchQuery ? countLayerSearchMatches(objects, searchQuery) : 0;
  objectCount.textContent = searchQuery ? `${searchMatchCount} found` : objects.length;
  if (layersSearchClear) layersSearchClear.hidden = !searchQuery;
  if (layersSearchEmpty) layersSearchEmpty.hidden = !searchQuery || searchMatchCount > 0;
  layersPanel.innerHTML = "";

  objects.forEach(element => {
    if (searchQuery && !layerSubtreeMatchesSearch(element, searchQuery)) return;
    applyLayerState(element);

    const row = document.createElement("div");
    row.className = "layer";
    layerRowByElement.set(element, row);

    if (selectedItems.includes(element)) row.classList.add("selected");
    if (isGroup(element)) row.classList.add("group-layer");
    if (isLayerHidden(element)) row.classList.add("hidden-layer");
    if (isLayerLocked(element)) row.classList.add("locked-layer");

    const groupKey = layerExpansionKey(element);
    const expanded = isGroup(element) && (
      expandedLayerGroups.has(groupKey) ||
      (searchQuery && layerDescendantMatchesSearch(element, searchQuery))
    );

    const visibilityButton = document.createElement("button");
    visibilityButton.type = "button";
    visibilityButton.className = "layer-control visibility";
    visibilityButton.title = isLayerHidden(element) ? "Show layer" : "Hide layer";
    visibilityButton.setAttribute("aria-label", visibilityButton.title);
    visibilityButton.replaceChildren(
      createLayerSvgIcon(isLayerHidden(element) ? "eye-off" : "eye")
    );

    const thumbnail = createLayerThumbnail(element);

    const nameWrap = document.createElement("div");
    nameWrap.className = "layer-name-wrap";

    if (isGroup(element)) {
      const expander = document.createElement("button");
      expander.type = "button";
      expander.className = "layer-expander";
      expander.title = expanded ? "Collapse group" : "Expand group";
      expander.setAttribute("aria-expanded", expanded ? "true" : "false");
      expander.innerHTML = expanded
        ? '<svg class="layer-expander-icon" viewBox="0 0 16 16" aria-hidden="true"><path style="fill:none !important;stroke:var(--layer-expander-stroke,#e6e9ef) !important;stroke-width:2.25 !important;stroke-linecap:round !important;stroke-linejoin:round !important" d="M3.5 5.5 8 10l4.5-4.5"/></svg>'
        : '<svg class="layer-expander-icon" viewBox="0 0 16 16" aria-hidden="true"><path style="fill:none !important;stroke:var(--layer-expander-stroke,#e6e9ef) !important;stroke-width:2.25 !important;stroke-linecap:round !important;stroke-linejoin:round !important" d="m5.5 3.5 4.5 4.5-4.5 4.5"/></svg>';

      expander.addEventListener("pointerdown", event => {
        event.stopPropagation();
      });

      expander.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();

        if (expandedLayerGroups.has(groupKey)) {
          expandedLayerGroups.delete(groupKey);
        } else {
          expandedLayerGroups.add(groupKey);
        }

        renderLayers();
      });

      nameWrap.appendChild(expander);
    } else {
      const expanderSpacer = document.createElement("span");
      expanderSpacer.className = "layer-expander-spacer";
      nameWrap.appendChild(expanderSpacer);
    }

    const name = document.createElement("span");
    name.className = "layer-name";
    name.textContent = element.dataset.name || layerTypeLabel(element);
    name.title = "Double-click to rename";

    const type = document.createElement("span");
    type.className = "layer-type-label";
    type.textContent = layerTypeLabel(element);

    name.addEventListener("pointerdown", event => {
      event.stopPropagation();
    });

    name.addEventListener("click", event => {
      event.stopPropagation();
    });

    name.addEventListener("dblclick", event => {
      event.preventDefault();
      event.stopPropagation();
      beginLayerRename(element, name);
    });

    nameWrap.append(name, type);

    const lockButton = document.createElement("button");
    lockButton.type = "button";
    lockButton.className = "layer-control lock";
    lockButton.title = isLayerLocked(element) ? "Unlock layer" : "Lock layer";
    lockButton.setAttribute("aria-label", lockButton.title);
    lockButton.replaceChildren(
      createLayerSvgIcon(isLayerLocked(element) ? "lock" : "unlock")
    );

    const nameLine = document.createElement("div");
    nameLine.className = "layer-name-line";
    nameLine.appendChild(nameWrap);

    const metaLine = document.createElement("div");
    metaLine.className = "layer-meta-line";
    metaLine.append(thumbnail, type, visibilityButton, lockButton);

    // Type now lives on the compact metadata row; keep the name row text-only.
    if (type.parentNode === nameWrap) type.remove();
    row.append(nameLine, metaLine);
    enforceLayerTwoRowLayout(row, nameLine, metaLine, nameWrap, thumbnail);

    visibilityButton.addEventListener("click", event => {
      event.stopPropagation();
      toggleLayerVisibility(element);
    });

    lockButton.addEventListener("click", event => {
      event.stopPropagation();
      toggleLayerLock(element);
    });

    row.addEventListener("click", event => {
      if (
        event.target.closest(".layer-control") ||
        event.target.closest(".layer-name") ||
        event.target.closest(".layer-name-input") ||
        event.target.closest(".layer-expander")
      ) {
        return;
      }

      if (!isLayerInteractive(element)) return;

      if (activeTool !== "vertex") {
        setTool("select");
      }
      selectElement(element, event.shiftKey);
    });

    wireLayerDragAndDrop(row, element);
    wireLayerHoverReveal(row, element);
    wireLayerContextMenu(row, element);

    layersPanel.appendChild(row);

    if (isGroup(element) && expanded) {
      appendGroupChildRows(element, layersPanel, 1, searchQuery);
    }
  });

  if (selectionTarget) scrollLayerRowIntoView(selectionTarget);
}

/* ---------------- ZOOM ---------------- */



function normalizeGuideData(guides) {
  if (!Array.isArray(guides)) return [];

  return guides
    .map(guide => ({
      id:
        String(
          guide?.id ||
          `guide-${Date.now()}-${Math.random().toString(36).slice(2)}`
        ),
      orientation:
        guide?.orientation === "horizontal"
          ? "horizontal"
          : "vertical",
      position:
        Number(guide?.position) || 0
    }))
    .filter(guide =>
      Number.isFinite(guide.position)
    );
}

function guideDocumentPositionFromClient(orientation, clientX, clientY) {
  const point = pointerPosition({
    clientX,
    clientY
  });

  return orientation === "vertical"
    ? point.x
    : point.y;
}

function snapGuidePositionToRuler(position, bypass = false) {
  if (bypass) {
    return position;
  }

  const majorStep =
    preferredRulerStep();

  const minorStep =
    majorStep / 2;

  if (
    !Number.isFinite(minorStep) ||
    minorStep <= 0
  ) {
    return position;
  }

  return (
    Math.round(position / minorStep) *
    minorStep
  );
}

function guideClientPosition(guide) {
  const point =
    guide.orientation === "vertical"
      ? documentPointToClient(
          guide.position,
          0
        )
      : documentPointToClient(
          0,
          guide.position
        );

  return guide.orientation === "vertical"
    ? point.x
    : point.y;
}

function renderGuides() {
  if (!guideOverlay) return;

  guideOverlay.classList.toggle(
    "guides-hidden",
    !guidesVisible
  );

  guideOverlay
    .querySelectorAll(".canvas-guide")
    .forEach(node => node.remove());

  if (!guidesVisible) {
    updateGuideMenuUi();
    return;
  }

  const stageRect =
    stage.getBoundingClientRect();

  documentGuides.forEach(guide => {
    const line =
      document.createElement("div");

    line.className =
      `canvas-guide ${guide.orientation}`;

    line.dataset.guideId =
      guide.id;

    if (guidesLocked) {
      line.classList.add("locked");
    }

    const client =
      guideClientPosition(guide);

    if (guide.orientation === "vertical") {
      line.style.left =
        `${client - stageRect.left}px`;
    } else {
      line.style.top =
        `${client - stageRect.top}px`;
    }

    line.addEventListener(
      "pointerdown",
      event => {
        if (
          guidesLocked ||
          event.button !== 0
        ) {
          return;
        }

        beginExistingGuideDrag(
          guide,
          line,
          event
        );
      }
    );

    guideOverlay.appendChild(
      line
    );
  });

  updateGuideMenuUi();
}

function updateGuideMenuUi() {
  if (guidesMenuItem) {
    const check =
      guidesMenuItem.querySelector(
        ".snap-check"
      );

    if (check) {
      check.textContent =
        guidesVisible ? "✓" : "";
    }

    guidesMenuItem.setAttribute(
      "aria-pressed",
      guidesVisible ? "true" : "false"
    );
  }

  if (lockGuidesMenuItem) {
    const check =
      lockGuidesMenuItem.querySelector(
        ".snap-check"
      );

    if (check) {
      check.textContent =
        guidesLocked ? "✓" : "";
    }

    lockGuidesMenuItem.setAttribute(
      "aria-pressed",
      guidesLocked ? "true" : "false"
    );
  }
}

function createGuidePreview(orientation) {
  const preview =
    document.createElement("div");

  preview.className =
    `canvas-guide-preview ${orientation}`;

  guideOverlay.appendChild(
    preview
  );

  return preview;
}

function updateGuidePreview(preview, orientation, clientX, clientY) {
  if (!preview) return;

  const rect =
    stage.getBoundingClientRect();

  if (orientation === "vertical") {
    preview.style.left =
      `${clientX - rect.left}px`;
  } else {
    preview.style.top =
      `${clientY - rect.top}px`;
  }
}

function beginNewGuideDrag(orientation, event) {
  if (
    event.button !== 0 ||
    guidesLocked
  ) {
    return;
  }

  guidesVisible = true;
  updateGuideMenuUi();

  const preview =
    createGuidePreview(
      orientation
    );

  guideDrag = {
    type: "new",
    orientation,
    preview,
    pointerId:
      event.pointerId
  };

  const startPosition =
    snapGuidePositionToRuler(
      guideDocumentPositionFromClient(
        orientation,
        event.clientX,
        event.clientY
      ),
      event.altKey
    );

  const startClient =
    orientation === "vertical"
      ? documentPointToClient(
          startPosition,
          0
        ).x
      : documentPointToClient(
          0,
          startPosition
        ).y;

  updateGuidePreview(
    preview,
    orientation,
    orientation === "vertical"
      ? startClient
      : event.clientX,
    orientation === "horizontal"
      ? startClient
      : event.clientY
  );

  window.addEventListener(
    "pointermove",
    handleGuidePointerMove
  );

  window.addEventListener(
    "pointerup",
    finishGuidePointerDrag,
    { once: true }
  );

  event.preventDefault();
  event.stopPropagation();
}

function beginExistingGuideDrag(guide, line, event) {
  line.classList.add("dragging");

  guideDrag = {
    type: "existing",
    guide,
    line,
    orientation:
      guide.orientation,
    pointerId:
      event.pointerId,
    originalPosition:
      guide.position
  };

  window.addEventListener(
    "pointermove",
    handleGuidePointerMove
  );

  window.addEventListener(
    "pointerup",
    finishGuidePointerDrag,
    { once: true }
  );

  event.preventDefault();
  event.stopPropagation();
}

function handleGuidePointerMove(event) {
  if (!guideDrag) return;

  if (guideDrag.preview) {
    const rawPosition =
      guideDocumentPositionFromClient(
        guideDrag.orientation,
        event.clientX,
        event.clientY
      );

    const snappedPosition =
      snapGuidePositionToRuler(
        rawPosition,
        event.altKey
      );

    const snappedClient =
      guideDrag.orientation === "vertical"
        ? documentPointToClient(
            snappedPosition,
            0
          ).x
        : documentPointToClient(
            0,
            snappedPosition
          ).y;

    updateGuidePreview(
      guideDrag.preview,
      guideDrag.orientation,
      guideDrag.orientation === "vertical"
        ? snappedClient
        : event.clientX,
      guideDrag.orientation === "horizontal"
        ? snappedClient
        : event.clientY
    );
  }

  if (
    guideDrag.type === "existing" &&
    guideDrag.guide
  ) {
    guideDrag.guide.position =
      snapGuidePositionToRuler(
        guideDocumentPositionFromClient(
          guideDrag.orientation,
          event.clientX,
          event.clientY
        ),
        event.altKey
      );

    renderGuides();
  }
}

function pointerInsideStage(clientX, clientY) {
  const rect =
    stage.getBoundingClientRect();

  return (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  );
}

function finishGuidePointerDrag(event) {
  window.removeEventListener(
    "pointermove",
    handleGuidePointerMove
  );

  if (!guideDrag) return;

  const drag =
    guideDrag;

  guideDrag = null;

  drag.preview?.remove();
  drag.line?.classList.remove(
    "dragging"
  );

  const inside =
    pointerInsideStage(
      event.clientX,
      event.clientY
    );

  if (drag.type === "new") {
    if (inside) {
      const position =
        snapGuidePositionToRuler(
          guideDocumentPositionFromClient(
            drag.orientation,
            event.clientX,
            event.clientY
          ),
          event.altKey
        );

      documentGuides.push({
        id:
          `guide-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        orientation:
          drag.orientation,
        position
      });

      renderGuides();

      recordHistory({
        label:
          drag.orientation === "vertical"
            ? "Vertical Guide Added"
            : "Horizontal Guide Added",
        detail:
          `${Math.round(position * 100) / 100} px`
      });
    }
  } else if (
    drag.type === "existing"
  ) {
    if (!inside) {
      documentGuides =
        documentGuides.filter(
          guide =>
            guide.id !==
            drag.guide.id
        );

      renderGuides();

      recordHistory({
        label: "Guide Removed",
        detail:
          drag.guide.orientation === "vertical"
            ? "Vertical guide removed"
            : "Horizontal guide removed"
      });
    } else if (
      Math.abs(
        drag.guide.position -
        drag.originalPosition
      ) > 0.0001
    ) {
      renderGuides();

      recordHistory({
        label: "Guide Moved",
        detail:
          `${Math.round(drag.guide.position * 100) / 100} px`
      });
    } else {
      renderGuides();
    }
  }
}

function setGuidesVisible(visible) {
  guidesVisible =
    Boolean(visible);

  renderGuides();
}

function setGuidesLocked(locked) {
  guidesLocked =
    Boolean(locked);

  renderGuides();
}

function clearGuides() {
  if (!documentGuides.length) {
    return;
  }

  const count =
    documentGuides.length;

  documentGuides = [];
  renderGuides();

  recordHistory({
    label: "Guides Cleared",
    detail:
      `${count} guide${count === 1 ? "" : "s"} removed`
  });
}

function preferredRulerStep() {
  const targetPx = 70;
  const rawUnits = targetPx / Math.max(zoom, 0.05);
  const exponent = Math.floor(Math.log10(rawUnits));
  const base = 10 ** exponent;
  const normalized = rawUnits / base;

  let multiplier = 1;

  if (normalized > 5) {
    multiplier = 10;
  } else if (normalized > 2) {
    multiplier = 5;
  } else if (normalized > 1) {
    multiplier = 2;
  }

  return multiplier * base;
}

function documentPointToClient(x, y) {
  const point = svg.createSVGPoint();
  point.x = x;
  point.y = y;

  const matrix = svg.getScreenCTM();

  if (!matrix) {
    return { x, y };
  }

  const transformed = point.matrixTransform(matrix);

  return {
    x: transformed.x,
    y: transformed.y
  };
}

function setupRulerCanvas(canvas) {
  if (!canvas) return null;

  const rect = canvas.getBoundingClientRect();
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  const width = Math.max(1, Math.round(rect.width * ratio));
  const height = Math.max(1, Math.round(rect.height * ratio));

  if (canvas.width !== width) {
    canvas.width = width;
  }

  if (canvas.height !== height) {
    canvas.height = height;
  }

  const context = canvas.getContext("2d");

  if (!context) return null;

  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, rect.width, rect.height);

  return {
    context,
    rect
  };
}

function rulerPalette() {
  const themePalette =
    applicationThemeRulerPalette();

  if (themePalette) {
    return themePalette;
  }

  const styles = getComputedStyle(document.documentElement);

  return {
    background:
      styles.getPropertyValue("--ui-bg-1").trim() ||
      "#202024",
    border:
      styles.getPropertyValue("--ui-border").trim() ||
      "#3c3c42",
    text:
      styles.getPropertyValue("--ui-text-muted").trim() ||
      "#a1a1aa",
    tick:
      styles.getPropertyValue("--ui-text-dim").trim() ||
      "#777780",
    zero:
      styles.getPropertyValue("--accent").trim() ||
      "#8b5cf6"
  };
}

function drawHorizontalRuler() {
  const setup = setupRulerCanvas(horizontalRuler);
  if (!setup) return;

  const { context, rect } = setup;
  const palette = rulerPalette();
  const stageRect = stage.getBoundingClientRect();
  const step = preferredRulerStep();

  context.fillStyle = palette.background;
  context.fillRect(0, 0, rect.width, rect.height);

  context.strokeStyle = palette.border;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, rect.height - 0.5);
  context.lineTo(rect.width, rect.height - 0.5);
  context.stroke();

  const leftClient = rect.left;
  const rightClient = rect.right;
  const p0 = pointerPosition({
    clientX: leftClient,
    clientY: stageRect.top + stageRect.height / 2
  });
  const p1 = pointerPosition({
    clientX: rightClient,
    clientY: stageRect.top + stageRect.height / 2
  });

  const minX = Math.min(p0.x, p1.x);
  const maxX = Math.max(p0.x, p1.x);
  const first = Math.floor(minX / step) * step;

  context.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace";
  context.textBaseline = "top";

  for (let value = first; value <= maxX + step; value += step) {
    const client = documentPointToClient(value, 0);
    const x = client.x - rect.left;

    if (x < -2 || x > rect.width + 2) continue;

    const isZero = Math.abs(value) < step * 0.001;

    context.strokeStyle = isZero ? palette.zero : palette.tick;
    context.fillStyle = isZero ? palette.zero : palette.text;
    context.lineWidth = 1;

    context.beginPath();
    context.moveTo(x + 0.5, rect.height);
    context.lineTo(x + 0.5, rect.height - 8);
    context.stroke();

    const halfStep = step / 2;

    if (halfStep > 0) {
      const halfClient = documentPointToClient(value + halfStep, 0);
      const halfX = halfClient.x - rect.left;

      if (halfX >= 0 && halfX <= rect.width) {
        context.strokeStyle = palette.tick;
        context.beginPath();
        context.moveTo(halfX + 0.5, rect.height);
        context.lineTo(halfX + 0.5, rect.height - 4);
        context.stroke();
      }
    }

    const label =
      String(Math.round(value * 1000) / 1000);

    const labelWidth =
      context.measureText(label).width;

    const labelX =
      Math.max(
        3,
        Math.min(
          x + 3,
          rect.width - labelWidth - 3
        )
      );

    context.fillText(
      label,
      labelX,
      2
    );
  }
}

function drawVerticalRuler() {
  const setup = setupRulerCanvas(verticalRuler);
  if (!setup) return;

  const { context, rect } = setup;
  const palette = rulerPalette();
  const stageRect = stage.getBoundingClientRect();
  const step = preferredRulerStep();

  context.fillStyle = palette.background;
  context.fillRect(0, 0, rect.width, rect.height);

  context.strokeStyle = palette.border;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(rect.width - 0.5, 0);
  context.lineTo(rect.width - 0.5, rect.height);
  context.stroke();

  const p0 = pointerPosition({
    clientX: stageRect.left + stageRect.width / 2,
    clientY: rect.top
  });
  const p1 = pointerPosition({
    clientX: stageRect.left + stageRect.width / 2,
    clientY: rect.bottom
  });

  const minY = Math.min(p0.y, p1.y);
  const maxY = Math.max(p0.y, p1.y);
  const first = Math.floor(minY / step) * step;

  context.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace";
  context.textBaseline = "middle";

  for (let value = first; value <= maxY + step; value += step) {
    const client = documentPointToClient(0, value);
    const y = client.y - rect.top;

    if (y < -2 || y > rect.height + 2) continue;

    const isZero = Math.abs(value) < step * 0.001;

    context.strokeStyle = isZero ? palette.zero : palette.tick;
    context.fillStyle = isZero ? palette.zero : palette.text;
    context.lineWidth = 1;

    context.beginPath();
    context.moveTo(rect.width, y + 0.5);
    context.lineTo(rect.width - 8, y + 0.5);
    context.stroke();

    const halfStep = step / 2;

    if (halfStep > 0) {
      const halfClient = documentPointToClient(0, value + halfStep);
      const halfY = halfClient.y - rect.top;

      if (halfY >= 0 && halfY <= rect.height) {
        context.strokeStyle = palette.tick;
        context.beginPath();
        context.moveTo(rect.width, halfY + 0.5);
        context.lineTo(rect.width - 4, halfY + 0.5);
        context.stroke();
      }
    }

    const label =
      String(Math.round(value * 1000) / 1000);

    const labelWidth =
      context.measureText(label).width;

    const labelY =
      Math.max(
        labelWidth + 4,
        Math.min(
          y,
          rect.height - 4
        )
      );

    context.save();

    /*
     * Anchor vertical ruler text just inside the left edge and use a
     * top baseline before rotation. This makes the glyph body extend
     * inward across the ruler instead of being clipped outside it.
     */
    context.textBaseline = "top";
    context.textAlign = "left";
    context.translate(3, labelY);
    context.rotate(-Math.PI / 2);
    context.fillText(
      label,
      0,
      0
    );
    context.restore();
  }
}

function renderRulers() {
  if (!rulersVisible || !stage.classList.contains("rulers-visible")) {
    return;
  }

  drawHorizontalRuler();
  drawVerticalRuler();
}

function updateRulerToggleUi() {
  stage.classList.toggle("rulers-visible", rulersVisible);

  if (rulersMenuItem) {
    const check = rulersMenuItem.querySelector(".snap-check");

    if (check) {
      check.textContent = rulersVisible ? "✓" : "";
    }

    rulersMenuItem.setAttribute(
      "aria-pressed",
      rulersVisible ? "true" : "false"
    );
  }

  requestAnimationFrame(() => {
    renderRulers();
    positionSelectionQuickMenu();
  });
}

function setRulersVisible(visible) {
  rulersVisible = Boolean(visible);

  try {
    localStorage.setItem(
      RULER_PREF_KEY,
      rulersVisible ? "true" : "false"
    );
  } catch {
    // Ignore unavailable browser storage.
  }

  updateRulerToggleUi();
}

function initializeRulers() {
  try {
    const saved = localStorage.getItem(RULER_PREF_KEY);

    if (saved === "false") {
      rulersVisible = false;
    }
  } catch {
    // Keep default visible state.
  }

  updateRulerToggleUi();
}

function applyZoomTransform() {
  artboardWrap.style.transform =
    `translate(${zoomPanX}px, ${zoomPanY}px) scale(${zoom})`;

  // Constraint annotations live inside the zoomed SVG overlay. Counter-scale
  // their typography so labels remain the same physical screen size at every
  // canvas zoom level instead of shrinking/growing with the artwork.
  if (selectionOverlay) {
    selectionOverlay.style.setProperty(
      "--constraint-label-inverse-zoom",
      String(1 / Math.max(zoom, 0.0001))
    );
  }

  document.querySelector("#zoomLabel").textContent =
    `${Math.round(zoom * 100)}%`;

  if (!switchingCanvasDocument) {
    const document = activeCanvasDocument();

    if (document) {
      document.zoom = zoom;
      document.panX = zoomPanX;
      document.panY = zoomPanY;
    }
  }

  requestAnimationFrame(() => {
    // Selection/vertex affordances live inside the zoomed artboard SVG. Their
    // geometry is authored in inverse-zoom document units, so redraw them at
    // the new zoom rather than letting the old overlay scale with the canvas.
    if (selectedItems?.length || selected) drawSelection();
    positionSelectionQuickMenu();
    if (activeTextEdit) positionTextEditorOverlay(activeTextEdit);
    renderRulers();
    renderGuides();
  });
}

function setZoom(value) {
  zoom = Math.max(0.3, Math.min(10, value));
  applyZoomTransform();
  scheduleAutosave();
}

function zoomAtCursor(clientX, clientY, nextZoom) {
  const clampedZoom = Math.max(0.3, Math.min(10, nextZoom));

  if (Math.abs(clampedZoom - zoom) < 0.0001) return;

  /*
   * With transform-origin at the artboard center:
   * screenPoint = baseCenter + pan + zoom * localOffset.
   * Solve for the new pan so the cursor's local point remains fixed.
   */
  const rect = artboardWrap.getBoundingClientRect();
  const transformedCenterX = rect.left + rect.width / 2;
  const transformedCenterY = rect.top + rect.height / 2;
  const baseCenterX = transformedCenterX - zoomPanX;
  const baseCenterY = transformedCenterY - zoomPanY;

  const localScreenX = clientX - baseCenterX - zoomPanX;
  const localScreenY = clientY - baseCenterY - zoomPanY;
  const ratio = clampedZoom / zoom;

  zoomPanX =
    clientX -
    baseCenterX -
    localScreenX * ratio;

  zoomPanY =
    clientY -
    baseCenterY -
    localScreenY * ratio;

  zoom = clampedZoom;
  applyZoomTransform();
}

const stage = document.querySelector("#stage");
const horizontalRuler = document.querySelector("#horizontalRuler");
const verticalRuler = document.querySelector("#verticalRuler");
const rulersMenuItem = document.querySelector("#rulersMenuItem");
const guidesMenuItem = document.querySelector("#guidesMenuItem");
const lockGuidesMenuItem = document.querySelector("#lockGuidesMenuItem");
const guideOverlay = document.querySelector("#guideOverlay");
let rulersVisible = true;
const RULER_PREF_KEY = "vectorStudio.rulersVisible";

window.addEventListener("resize", () => {
  requestAnimationFrame(() => {
    renderRulers();
    renderGuides();
  });
});

horizontalRuler.addEventListener(
  "pointerdown",
  event => {
    beginNewGuideDrag(
      "horizontal",
      event
    );
  }
);

verticalRuler.addEventListener(
  "pointerdown",
  event => {
    beginNewGuideDrag(
      "vertical",
      event
    );
  }
);

stage.addEventListener(
  "wheel",
  event => {
    event.preventDefault();

    /*
     * Responsive pointer-centered zoom.
     * Trackpad deltas stay smooth while mouse-wheel steps react faster.
     * Clamp extreme events so one noisy wheel tick cannot jump too far.
     */
    const delta =
      Math.max(
        -140,
        Math.min(
          140,
          event.deltaY
        )
      );

    const factor =
      Math.exp(
        -delta * 0.0025
      );

    zoomAtCursor(
      event.clientX,
      event.clientY,
      zoom * factor
    );
  },
  { passive: false }
);

document.querySelector("#zoomIn").addEventListener(
  "click",
  () => setZoom(zoom * 1.18)
);

document.querySelector("#zoomOut").addEventListener(
  "click",
  () => setZoom(zoom / 1.18)
);

document.querySelector("#zoomFit").addEventListener(
  "click",
  () => {
    zoomPanX = 0;
    zoomPanY = 0;
    setZoom(1);
  }
);



function isRasterImageElement(
  element
) {
  return Boolean(
    element &&
    element.tagName === "image" &&
    element.dataset.imageObject ===
      "true"
  );
}

function imageHref(
  element
) {
  return (
    element?.getAttribute("href") ||
    element?.getAttributeNS(
      "http://www.w3.org/1999/xlink",
      "href"
    ) ||
    ""
  );
}

function readFileAsDataURL(
  file
) {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const reader =
        new FileReader();

      reader.addEventListener(
        "load",
        () =>
          resolve(
            String(
              reader.result ||
              ""
            )
          )
      );

      reader.addEventListener(
        "error",
        () =>
          reject(
            reader.error ||
            new Error(
              "Could not read image."
            )
          )
      );

      reader.readAsDataURL(
        file
      );
    }
  );
}

function loadBrowserImage(
  source
) {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const image =
        new Image();

      image.addEventListener(
        "load",
        () =>
          resolve(image),
        { once: true }
      );

      image.addEventListener(
        "error",
        () =>
          reject(
            new Error(
              "Could not decode image."
            )
          ),
        { once: true }
      );

      image.src = source;
    }
  );
}

async function importRasterImageFile(
  file
) {
  if (!file) return null;

  if (
    !String(
      file.type ||
      ""
    ).startsWith(
      "image/"
    )
  ) {
    throw new Error(
      "Please choose an image file."
    );
  }

  const source =
    await readFileAsDataURL(
      file
    );

  const browserImage =
    await loadBrowserImage(
      source
    );

  const naturalWidth =
    Math.max(
      1,
      Number(
        browserImage.naturalWidth ||
        browserImage.width ||
        1
      )
    );

  const naturalHeight =
    Math.max(
      1,
      Number(
        browserImage.naturalHeight ||
        browserImage.height ||
        1
      )
    );

  const maximumWidth =
    canvasWidth * 0.7;

  const maximumHeight =
    canvasHeight * 0.7;

  const scale =
    Math.min(
      1,
      maximumWidth /
        naturalWidth,
      maximumHeight /
        naturalHeight
    );

  const width =
    naturalWidth * scale;

  const height =
    naturalHeight * scale;

  const element =
    createBaseElement(
      "image"
    );

  element.dataset.imageObject =
    "true";

  element.dataset.name =
    file.name
      ? file.name.replace(
          /\.[^.]+$/,
          ""
        )
      : `Image ${objectCounter}`;

  element.dataset.imageMime =
    file.type ||
    "image/png";

  element.dataset.imageNaturalWidth =
    String(
      naturalWidth
    );

  element.dataset.imageNaturalHeight =
    String(
      naturalHeight
    );

  element.dataset.imageCrop =
    JSON.stringify(
      defaultImageCrop()
    );

  element.dataset.scaleX =
    "1";

  element.dataset.scaleY =
    "1";

  element.setAttribute(
    "href",
    source
  );

  element.setAttribute(
    "x",
    (canvasWidth - width) / 2
  );

  element.setAttribute(
    "y",
    (canvasHeight - height) / 2
  );

  element.setAttribute(
    "width",
    width
  );

  element.setAttribute(
    "height",
    height
  );

  element.setAttribute(
    "preserveAspectRatio",
    "none"
  );

  element.setAttribute(
    "fill",
    "none"
  );

  element.setAttribute(
    "stroke",
    "none"
  );

  element.removeAttribute(
    "vector-effect"
  );

  art.appendChild(
    element
  );

  ensureImageCropClip(
    element
  );

  setSelection(
    [element],
    element
  );

  setTool(
    "select"
  );

  renderLayers();

  recordHistory({
    label:
      "Image Imported",
    detail:
      `${Math.round(width)} × ${Math.round(height)} px`
  });

  toolStatus.textContent =
    `Imported ${file.name || "image"}`;

  return element;
}

function openImagePicker() {
  imageFileInput.value =
    "";

  imageFileInput.click();
}


function defaultImageCrop() {
  return {
    left: 0,
    top: 0,
    right: 1,
    bottom: 1
  };
}

function normalizedImageCrop(
  crop
) {
  const source =
    crop &&
    typeof crop ===
      "object"
      ? crop
      : defaultImageCrop();

  let left =
    Math.max(
      0,
      Math.min(
        0.95,
        Number(source.left) || 0
      )
    );

  let top =
    Math.max(
      0,
      Math.min(
        0.95,
        Number(source.top) || 0
      )
    );

  let right =
    Math.max(
      0.05,
      Math.min(
        1,
        Number(source.right) || 1
      )
    );

  let bottom =
    Math.max(
      0.05,
      Math.min(
        1,
        Number(source.bottom) || 1
      )
    );

  if (
    right - left <
    0.05
  ) {
    right =
      Math.min(
        1,
        left + 0.05
      );

    left =
      Math.max(
        0,
        right - 0.05
      );
  }

  if (
    bottom - top <
    0.05
  ) {
    bottom =
      Math.min(
        1,
        top + 0.05
      );

    top =
      Math.max(
        0,
        bottom - 0.05
      );
  }

  return {
    left,
    top,
    right,
    bottom
  };
}

function imageCropForElement(
  element
) {
  if (
    !isRasterImageElement(
      element
    )
  ) {
    return defaultImageCrop();
  }

  try {
    return normalizedImageCrop(
      JSON.parse(
        element.dataset.imageCrop ||
        "{}"
      )
    );
  } catch {
    return defaultImageCrop();
  }
}

function imageCropLocalBounds(
  element,
  crop =
    imageCropForElement(
      element
    )
) {
  const x =
    Number(
      element.getAttribute("x") ||
      0
    );

  const y =
    Number(
      element.getAttribute("y") ||
      0
    );

  const width =
    Number(
      element.getAttribute("width") ||
      0
    );

  const height =
    Number(
      element.getAttribute("height") ||
      0
    );

  const normalized =
    normalizedImageCrop(
      crop
    );

  return {
    left:
      x +
      width *
      normalized.left,
    top:
      y +
      height *
      normalized.top,
    right:
      x +
      width *
      normalized.right,
    bottom:
      y +
      height *
      normalized.bottom,
    width:
      width *
      (
        normalized.right -
        normalized.left
      ),
    height:
      height *
      (
        normalized.bottom -
        normalized.top
      )
  };
}

function imageCropClipId(
  element
) {
  if (
    !element.dataset.imageCropClipId
  ) {
    element.dataset.imageCropClipId =
      `image-crop-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  return (
    element.dataset.imageCropClipId
  );
}

function removeImageCropClip(
  element
) {
  if (!element) return;

  const id =
    element.dataset.imageCropClipId;

  if (id) {
    paintDefs
      .querySelector(
        `#${CSS.escape(id)}`
      )
      ?.remove();
  }

  element.removeAttribute(
    "clip-path"
  );
}

function ensureImageCropClip(
  element,
  crop =
    imageCropForElement(
      element
    )
) {
  if (
    !isRasterImageElement(
      element
    )
  ) {
    return;
  }

  const normalized =
    normalizedImageCrop(
      crop
    );

  const isFull =
    normalized.left <=
      0.00001 &&
    normalized.top <=
      0.00001 &&
    normalized.right >=
      0.99999 &&
    normalized.bottom >=
      0.99999;

  if (isFull) {
    removeImageCropClip(
      element
    );
    return;
  }

  const id =
    imageCropClipId(
      element
    );

  paintDefs
    .querySelector(
      `#${CSS.escape(id)}`
    )
    ?.remove();

  const clip =
    document.createElementNS(
      SVG_NS,
      "clipPath"
    );

  clip.id = id;
  clip.setAttribute(
    "clipPathUnits",
    "userSpaceOnUse"
  );

  const bounds =
    imageCropLocalBounds(
      element,
      normalized
    );

  const rect =
    document.createElementNS(
      SVG_NS,
      "rect"
    );

  rect.setAttribute(
    "x",
    bounds.left
  );

  rect.setAttribute(
    "y",
    bounds.top
  );

  rect.setAttribute(
    "width",
    bounds.width
  );

  rect.setAttribute(
    "height",
    bounds.height
  );

  clip.appendChild(
    rect
  );

  paintDefs.appendChild(
    clip
  );

  element.setAttribute(
    "clip-path",
    `url(#${id})`
  );
}

function restoreImageCropClips() {
  art
    .querySelectorAll(
      'image[data-image-object="true"][data-image-crop]'
    )
    .forEach(
      element =>
        ensureImageCropClip(
          element
        )
    );
}

function cropPointSet(
  element,
  crop =
    imageCropForElement(
      element
    )
) {
  const bounds =
    imageCropLocalBounds(
      element,
      crop
    );

  const local = {
    nw: {
      x: bounds.left,
      y: bounds.top
    },
    n: {
      x:
        (
          bounds.left +
          bounds.right
        ) / 2,
      y: bounds.top
    },
    ne: {
      x: bounds.right,
      y: bounds.top
    },
    e: {
      x: bounds.right,
      y:
        (
          bounds.top +
          bounds.bottom
        ) / 2
    },
    se: {
      x: bounds.right,
      y: bounds.bottom
    },
    s: {
      x:
        (
          bounds.left +
          bounds.right
        ) / 2,
      y: bounds.bottom
    },
    sw: {
      x: bounds.left,
      y: bounds.bottom
    },
    w: {
      x: bounds.left,
      y:
        (
          bounds.top +
          bounds.bottom
        ) / 2
    }
  };

  const canvas = {};

  Object.entries(
    local
  ).forEach(
    (
      [
        key,
        point
      ]
    ) => {
      canvas[key] =
        canvasPointFromLocal(
          element,
          point.x,
          point.y
        );
    }
  );

  return {
    bounds,
    local,
    canvas
  };
}

function addImageCropHandle(
  point,
  handle
) {
  const size =
    13 / Math.max(
      zoom,
      0.3
    );

  const half =
    size / 2;

  const hitSize =
    22 / Math.max(
      zoom,
      0.3
    );

  const hit =
    svgEl(
      "rect",
      {
        x:
          point.x -
          hitSize / 2,
        y:
          point.y -
          hitSize / 2,
        width:
          hitSize,
        height:
          hitSize,
        class:
          "image-crop-handle-hit",
        "data-image-crop-handle":
          handle,
        "aria-label":
          `Crop ${handle}`
      }
    );

  selectionOverlay.appendChild(
    hit
  );

  const isCorner =
    [
      "nw",
      "ne",
      "se",
      "sw"
    ].includes(
      handle
    );

  if (isCorner) {
    const sx =
      handle.includes("w")
        ? 1
        : -1;

    const sy =
      handle.includes("n")
        ? 1
        : -1;

    const d = [
      `M ${point.x + sx * size} ${point.y}`,
      `L ${point.x} ${point.y}`,
      `L ${point.x} ${point.y + sy * size}`
    ].join(" ");

    selectionOverlay.appendChild(
      svgEl(
        "path",
        {
          d,
          class:
            `image-crop-corner-bracket image-crop-handle-${handle}`,
          "pointer-events":
            "none"
        }
      )
    );

    return;
  }

  const horizontal =
    handle === "n" ||
    handle === "s";

  selectionOverlay.appendChild(
    svgEl(
      "line",
      horizontal
        ? {
            x1:
              point.x - half,
            y1:
              point.y,
            x2:
              point.x + half,
            y2:
              point.y,
            class:
              `image-crop-edge-grip image-crop-handle-${handle}`,
            "pointer-events":
              "none"
          }
        : {
            x1:
              point.x,
            y1:
              point.y - half,
            x2:
              point.x,
            y2:
              point.y + half,
            class:
              `image-crop-edge-grip image-crop-handle-${handle}`,
            "pointer-events":
              "none"
          }
    )
  );
}

function drawImageCropControls(
  element
) {
  if (
    imageCropTarget !==
      element ||
    !imageCropDraft
  ) {
    return;
  }

  const fullX =
    Number(
      element.getAttribute("x") ||
      0
    );

  const fullY =
    Number(
      element.getAttribute("y") ||
      0
    );

  const fullWidth =
    Number(
      element.getAttribute("width") ||
      0
    );

  const fullHeight =
    Number(
      element.getAttribute("height") ||
      0
    );

  const fullCorners =
    [
      canvasPointFromLocal(
        element,
        fullX,
        fullY
      ),
      canvasPointFromLocal(
        element,
        fullX + fullWidth,
        fullY
      ),
      canvasPointFromLocal(
        element,
        fullX + fullWidth,
        fullY + fullHeight
      ),
      canvasPointFromLocal(
        element,
        fullX,
        fullY + fullHeight
      )
    ];

  selectionOverlay.appendChild(
    svgEl(
      "polygon",
      {
        points:
          fullCorners
            .map(
              point =>
                `${point.x},${point.y}`
            )
            .join(" "),
        class:
          "image-crop-original-outline"
      }
    )
  );

  const points =
    cropPointSet(
      element,
      imageCropDraft
    );

  const cropCorners = [
    points.canvas.nw,
    points.canvas.ne,
    points.canvas.se,
    points.canvas.sw
  ];

  const shadePath =
    [
      `M ${fullCorners[0].x} ${fullCorners[0].y}`,
      `L ${fullCorners[1].x} ${fullCorners[1].y}`,
      `L ${fullCorners[2].x} ${fullCorners[2].y}`,
      `L ${fullCorners[3].x} ${fullCorners[3].y}`,
      "Z",
      `M ${cropCorners[0].x} ${cropCorners[0].y}`,
      `L ${cropCorners[3].x} ${cropCorners[3].y}`,
      `L ${cropCorners[2].x} ${cropCorners[2].y}`,
      `L ${cropCorners[1].x} ${cropCorners[1].y}`,
      "Z"
    ].join(" ");

  selectionOverlay.appendChild(
    svgEl(
      "path",
      {
        d: shadePath,
        class:
          "image-crop-outside-shade",
        "fill-rule":
          "evenodd",
        "pointer-events":
          "none"
      }
    )
  );

  selectionOverlay.appendChild(
    svgEl(
      "polygon",
      {
        points:
          cropCorners
            .map(
              point =>
                `${point.x},${point.y}`
            )
            .join(" "),
        class:
          "image-crop-frame-overlay"
      }
    )
  );

  [
    "nw",
    "n",
    "ne",
    "e",
    "se",
    "s",
    "sw",
    "w"
  ].forEach(
    handle =>
      addImageCropHandle(
        points.canvas[
          handle
        ],
        handle
      )
  );
}

function beginImageCrop(
  element = selected
) {
  if (
    !isRasterImageElement(
      element
    )
  ) {
    return false;
  }

  imageCropTarget =
    element;

  imageCropOriginal =
    imageCropForElement(
      element
    );

  imageCropDraft = {
    ...imageCropOriginal
  };

  imageCropDrag =
    null;

  ensureImageCropClip(
    element,
    imageCropDraft
  );

  drawSelection();

  toolStatus.textContent =
    "Crop Image: drag crop handles, then choose Done";

  return true;
}

function cancelImageCrop() {
  if (
    !imageCropTarget
  ) {
    return;
  }

  ensureImageCropClip(
    imageCropTarget,
    imageCropOriginal ||
      defaultImageCrop()
  );

  imageCropTarget =
    null;

  imageCropDraft =
    null;

  imageCropOriginal =
    null;

  imageCropDrag =
    null;

  drawSelection();

  toolStatus.textContent =
    "Crop cancelled";
}

function resetImageCrop() {
  if (
    !imageCropTarget
  ) {
    return;
  }

  imageCropDraft =
    defaultImageCrop();

  ensureImageCropClip(
    imageCropTarget,
    imageCropDraft
  );

  drawSelection();
}

function commitImageCrop() {
  const element =
    imageCropTarget;

  if (
    !element ||
    !imageCropDraft
  ) {
    return;
  }

  const crop =
    normalizedImageCrop(
      imageCropDraft
    );

  const was =
    JSON.stringify(
      imageCropOriginal ||
      defaultImageCrop()
    );

  const now =
    JSON.stringify(
      crop
    );

  const nextBounds =
    imageCropLocalBounds(
      element,
      crop
    );

  const nextCenter = {
    x:
      nextBounds.left +
      nextBounds.width / 2,
    y:
      nextBounds.top +
      nextBounds.height / 2
  };

  /*
   * Capture where the new crop center currently appears while the object is
   * still using the previous crop center as its transform origin. Once the
   * crop is committed, editableLocalBounds/getLocalCenter switch to the new
   * visible crop bounds. Compensating translation keeps the artwork from
   * jumping even if it was already scaled or rotated.
   */
  const preservedCenter =
    canvasPointFromLocal(
      element,
      nextCenter.x,
      nextCenter.y
    );

  element.dataset.imageCrop =
    now;

  ensureImageCropClip(
    element,
    crop
  );

  applyObjectTransform(
    element
  );

  const movedCenter =
    canvasPointFromLocal(
      element,
      nextCenter.x,
      nextCenter.y
    );

  const translation =
    getTranslation(
      element
    );

  element.dataset.tx =
    String(
      translation.x +
      preservedCenter.x -
      movedCenter.x
    );

  element.dataset.ty =
    String(
      translation.y +
      preservedCenter.y -
      movedCenter.y
    );

  applyObjectTransform(
    element
  );

  imageCropTarget =
    null;

  imageCropDraft =
    null;

  imageCropOriginal =
    null;

  imageCropDrag =
    null;

  drawSelection();
  updateTransformPanel();
  renderLayers();

  if (was !== now) {
    recordHistory({
      label:
        "Image Crop Changed",
      detail:
        "Non-destructive crop bounds updated"
    });
  } else {
    scheduleAutosave();
  }

  toolStatus.textContent =
    "Image crop applied";
}

function beginImageCropHandleDrag(
  handle,
  point,
  pointerId
) {
  if (
    !imageCropTarget ||
    !imageCropDraft
  ) {
    return false;
  }

  const local =
    localPointFromCanvas(
      imageCropTarget,
      point
    );

  imageCropDrag = {
    handle,
    pointerId,
    start:
      local,
    original: {
      ...imageCropDraft
    }
  };

  return true;
}

function updateImageCropHandleDrag(
  point
) {
  if (
    !imageCropDrag ||
    !imageCropTarget
  ) {
    return false;
  }

  const element =
    imageCropTarget;

  const x =
    Number(
      element.getAttribute("x") ||
      0
    );

  const y =
    Number(
      element.getAttribute("y") ||
      0
    );

  const width =
    Math.max(
      1e-9,
      Number(
        element.getAttribute("width") ||
        0
      )
    );

  const height =
    Math.max(
      1e-9,
      Number(
        element.getAttribute("height") ||
        0
      )
    );

  const local =
    localPointFromCanvas(
      element,
      point
    );

  const nx =
    Math.max(
      0,
      Math.min(
        1,
        (
          local.x - x
        ) /
        width
      )
    );

  const ny =
    Math.max(
      0,
      Math.min(
        1,
        (
          local.y - y
        ) /
        height
      )
    );

  const next = {
    ...imageCropDrag.original
  };

  const minimum =
    0.05;

  const handle =
    imageCropDrag.handle;

  if (
    handle.includes("w")
  ) {
    next.left =
      Math.min(
        nx,
        next.right -
          minimum
      );
  }

  if (
    handle.includes("e")
  ) {
    next.right =
      Math.max(
        nx,
        next.left +
          minimum
      );
  }

  if (
    handle.includes("n")
  ) {
    next.top =
      Math.min(
        ny,
        next.bottom -
          minimum
      );
  }

  if (
    handle.includes("s")
  ) {
    next.bottom =
      Math.max(
        ny,
        next.top +
          minimum
      );
  }

  if (handle === "w") {
    next.left =
      Math.min(
        nx,
        next.right -
          minimum
      );
  }

  if (handle === "e") {
    next.right =
      Math.max(
        nx,
        next.left +
          minimum
      );
  }

  if (handle === "n") {
    next.top =
      Math.min(
        ny,
        next.bottom -
          minimum
      );
  }

  if (handle === "s") {
    next.bottom =
      Math.max(
        ny,
        next.top +
          minimum
      );
  }

  imageCropDraft =
    normalizedImageCrop(
      next
    );

  ensureImageCropClip(
    element,
    imageCropDraft
  );

  drawSelection();

  return true;
}

function endImageCropHandleDrag() {
  if (!imageCropDrag) {
    return false;
  }

  imageCropDrag =
    null;

  return true;
}

imageFileInput.addEventListener(
  "change",
  async () => {
    const file =
      imageFileInput.files?.[0];

    if (!file) return;

    try {
      await importRasterImageFile(
        file
      );
    } catch (error) {
      console.error(error);

      alert(
        error.message ||
        "Could not import this image."
      );
    }
  }
);



/* ---------------- NATIVE SVG IMPORT ---------------- */

function openSvgPicker() {
  if (!svgFileInput) return;
  svgFileInput.value = "";
  svgFileInput.click();
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(reader.error || new Error("Could not read SVG.")));
    reader.readAsText(file);
  });
}

const SVG_IMPORT_GEOMETRY_TAGS = new Set([
  "path", "rect", "circle", "ellipse", "polygon", "polyline", "line"
]);

function importedSvgPresentation(source, target) {
  const computed = getComputedStyle(source);
  const properties = [
    ["fill", "fill"], ["stroke", "stroke"], ["stroke-width", "strokeWidth"],
    ["fill-opacity", "fillOpacity"], ["stroke-opacity", "strokeOpacity"],
    ["opacity", "opacity"], ["stroke-linecap", "strokeLinecap"],
    ["stroke-linejoin", "strokeLinejoin"], ["stroke-miterlimit", "strokeMiterlimit"],
    ["stroke-dasharray", "strokeDasharray"], ["stroke-dashoffset", "strokeDashoffset"],
    ["fill-rule", "fillRule"], ["clip-rule", "clipRule"],
    ["vector-effect", "vectorEffect"]
  ];

  properties.forEach(([attribute, key]) => {
    const value = computed?.[key] || source.getAttribute(attribute);
    if (value && value !== "normal") target.setAttribute(attribute, value);
  });

  ["clip-path", "mask", "filter"].forEach(attribute => {
    const value = source.getAttribute(attribute);
    if (value) target.setAttribute(attribute, value);
  });
}

function importedSvgSafeName(source, fallback) {
  return source.getAttribute("data-name") ||
    source.getAttribute("inkscape:label") ||
    source.getAttribute("aria-label") ||
    source.getAttribute("id") || fallback;
}

function transformPaperPoint(matrix, point) {
  if (!matrix) return { x: point.x, y: point.y };
  const transformed = new DOMPoint(point.x, point.y).matrixTransform(matrix);
  return { x: transformed.x, y: transformed.y };
}

function firstPaperPath(item) {
  if (!item) return null;
  if (item.className === "Path") return item;
  if (item.className === "CompoundPath" && item.children?.length === 1) return item.children[0];
  if (item.children) {
    for (const child of item.children) {
      const found = firstPaperPath(child);
      if (found) return found;
    }
  }
  return null;
}

function sourceGeometryToEditablePath(source) {
  if (!window.paper) return null;
  try {
    if (!paper.project) paper.setup(new paper.Size(Math.max(1, canvasWidth), Math.max(1, canvasHeight)));
    const clone = source.cloneNode(true);
    clone.removeAttribute("transform");
    clone.removeAttribute("style");
    ["fill", "stroke", "class", "id", "clip-path", "mask", "filter"].forEach(name => clone.removeAttribute(name));
    const wrapper = `<svg xmlns="${SVG_NS}">${new XMLSerializer().serializeToString(clone)}</svg>`;
    const imported = paper.project.importSVG(wrapper, { insert: false, expandShapes: true });
    const paperPath = firstPaperPath(imported);
    if (!paperPath || !paperPath.segments?.length) {
      imported?.remove?.();
      return null;
    }

    const matrix = source.getCTM();
    const path = document.createElementNS(SVG_NS, "path");
    path.dataset.editorPath = "true";
    path.dataset.closed = paperPath.closed ? "true" : "false";
    path._anchors = paperPath.segments.map(segment => {
      const point = transformPaperPoint(matrix, segment.point);
      const handleInPoint = transformPaperPoint(matrix, segment.point.add(segment.handleIn));
      const handleOutPoint = transformPaperPoint(matrix, segment.point.add(segment.handleOut));
      return {
        x: point.x, y: point.y,
        inX: handleInPoint.x, inY: handleInPoint.y,
        outX: handleOutPoint.x, outY: handleOutPoint.y
      };
    });
    updatePathD(path);
    importedSvgPresentation(source, path);
    imported?.remove?.();
    return path;
  } catch (error) {
    console.warn("SVG geometry conversion failed", error);
    return null;
  }
}

function remapImportedSvgDefinitions(sourceSvg) {
  const defs = [...sourceSvg.querySelectorAll("defs")];
  const idMap = new Map();
  const prefix = `vs-import-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  sourceSvg.querySelectorAll("[id]").forEach(node => {
    const oldId = node.id;
    if (!oldId) return;
    idMap.set(oldId, `${prefix}-${oldId.replace(/[^a-zA-Z0-9_-]/g, "-")}`);
  });

  const rewriteValue = value => {
    if (!value) return value;
    let next = String(value);
    idMap.forEach((newId, oldId) => {
      next = next.replaceAll(`url(#${oldId})`, `url(#${newId})`);
      if (next === `#${oldId}`) next = `#${newId}`;
    });
    return next;
  };

  sourceSvg.querySelectorAll("*").forEach(node => {
    if (node.id && idMap.has(node.id)) node.id = idMap.get(node.id);
    [...node.attributes].forEach(attribute => {
      const rewritten = rewriteValue(attribute.value);
      if (rewritten !== attribute.value) node.setAttribute(attribute.name, rewritten);
    });
  });

  defs.forEach(defsNode => {
    [...defsNode.children].forEach(child => {
      if (["script", "foreignObject"].includes(child.tagName)) return;
      paintDefs.appendChild(child.cloneNode(true));
    });
  });
}

function importSvgNode(source, depth = 0) {
  const tag = source.tagName?.toLowerCase();
  if (!tag || ["defs", "style", "script", "metadata", "title", "desc", "foreignobject"].includes(tag)) return null;

  if (SVG_IMPORT_GEOMETRY_TAGS.has(tag)) {
    const path = sourceGeometryToEditablePath(source);
    if (!path) return null;
    objectCounter += 1;
    path.dataset.object = "true";
    path.dataset.name = importedSvgSafeName(source, `${capitalize(tag)} ${objectCounter}`);
    path.dataset.importedSvg = "true";
    path.dataset.tx = "0";
    path.dataset.ty = "0";
    path.dataset.rotation = "0";
    path.dataset.scaleX = "1";
    path.dataset.scaleY = "1";
    return path;
  }

  if (tag === "g" || tag === "svg" || tag === "a" || tag === "symbol") {
    const group = document.createElementNS(SVG_NS, "g");
    [...source.children].forEach(child => {
      const importedChild = importSvgNode(child, depth + 1);
      if (importedChild) group.appendChild(importedChild);
    });
    if (!group.children.length) return null;
    objectCounter += 1;
    group.dataset.object = "true";
    group.dataset.name = importedSvgSafeName(source, depth === 0 ? "Imported SVG" : `Group ${objectCounter}`);
    group.dataset.importedSvg = "true";
    group.dataset.tx = "0";
    group.dataset.ty = "0";
    group.dataset.rotation = "0";
    group.dataset.scaleX = "1";
    group.dataset.scaleY = "1";
    return group;
  }

  return null;
}

async function importSvgFile(file) {
  if (!file) return null;
  const text = await readFileAsText(file);
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  if (doc.querySelector("parsererror")) throw new Error("This SVG could not be parsed.");
  const sourceSvg = doc.documentElement;
  if (!sourceSvg || sourceSvg.tagName.toLowerCase() !== "svg") throw new Error("The selected file is not an SVG.");

  sourceSvg.querySelectorAll("script,foreignObject").forEach(node => node.remove());
  sourceSvg.querySelectorAll("image").forEach(node => {
    const href = node.getAttribute("href") || node.getAttribute("xlink:href") || "";
    if (/^https?:/i.test(href)) node.remove();
  });

  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-100000px;top:-100000px;visibility:hidden;pointer-events:none";
  const liveSvg = document.importNode(sourceSvg, true);
  const viewBox = liveSvg.getAttribute("viewBox")?.trim().split(/[ ,]+/).map(Number);
  if (viewBox?.length === 4 && viewBox.every(Number.isFinite)) {
    liveSvg.setAttribute("width", String(Math.max(1, viewBox[2])));
    liveSvg.setAttribute("height", String(Math.max(1, viewBox[3])));
  }
  host.appendChild(liveSvg);
  document.body.appendChild(host);

  try {
    remapImportedSvgDefinitions(liveSvg);
    const imported = importSvgNode(liveSvg, 0);
    if (!imported) throw new Error("No supported vector shapes were found in this SVG.");
    imported.dataset.name = file.name?.replace(/\.svg$/i, "") || "Imported SVG";
    art.appendChild(imported);

    const bounds = imported.getBBox();
    const fitScale = Math.min(1, (canvasWidth * 0.75) / Math.max(1, bounds.width), (canvasHeight * 0.75) / Math.max(1, bounds.height));
    imported.dataset.scaleX = String(fitScale);
    imported.dataset.scaleY = String(fitScale);
    imported.dataset.tx = String(canvasWidth / 2 - (bounds.x + bounds.width / 2));
    imported.dataset.ty = String(canvasHeight / 2 - (bounds.y + bounds.height / 2));
    applyObjectTransform(imported);

    expandedLayerGroups.add(layerExpansionKey(imported));
    selectElement(imported);
    recordHistory({ label: "SVG Imported", detail: file.name || "SVG artwork" });
    renderLayers();
    toolStatus.textContent = `Imported ${file.name || "SVG"} as editable vector layers`;
    return imported;
  } finally {
    host.remove();
  }
}

if (svgFileInput) {
  svgFileInput.addEventListener("change", async () => {
    const file = svgFileInput.files?.[0];
    if (!file) return;
    try {
      await importSvgFile(file);
    } catch (error) {
      console.error(error);
      alert(error.message || "Could not import this SVG.");
    } finally {
      svgFileInput.value = "";
    }
  });
}

/* ---------------- BITMAP COLOUR FLATTENER ---------------- */

let bitmapFlattenSourceElement = null;
let bitmapFlattenPreviewTimer = null;
let bitmapFlattenPreviewToken = 0;
let bitmapFlattenLastResult = null;
let bitmapFlattenFinalPreviewCache = null;

function selectedRasterForFlattening() {
  const candidate = selectedItems.length === 1 ? selectedItems[0] : null;
  return isRasterImageElement(candidate) ? candidate : null;
}

function bitmapFlattenSettings() {
  return {
    mode: ["auto", "colour", "reconstruct", "logo"].includes(bitmapFlattenMode?.value) ? bitmapFlattenMode.value : "auto",
    paint: bitmapFlattenPaint?.value === "gradient" ? "gradient" : "flat",
    colors: Math.max(2, Math.min(256, Math.round(Number(bitmapFlattenColors?.value) || 12))),
    detail: Math.max(0, Math.min(100, Number(bitmapFlattenDetail?.value) || 70)),
    noise: Math.max(0, Math.min(100, Number(bitmapFlattenNoise?.value) || 35)),
    minShapeArea: Math.max(0, Math.min(5000, Math.round(Number(bitmapFlattenMinArea?.value) || 0))),
    mergeShapeArea: Math.max(0, Math.min(5000, Math.round(Number(bitmapFlattenMergeArea?.value) || 0))),
    hybridPrimitiveSensitivity: Math.max(0, Math.min(100, Number(bitmapFlattenHybridSensitivity?.value) || 50)),
    axisSnap: Boolean(bitmapFlattenAxisSnap?.checked),
    axisSnapSensitivity: Math.max(0, Math.min(100, Number(bitmapFlattenAxisSnapSensitivity?.value) || 50)),
    simplify: Math.max(0, Math.min(100, Number(bitmapFlattenSimplify?.value) || 0)),
    // Potrace curve behaviour is now intentionally automatic. Keeping these
    // internal defaults preserves the v105 trace character without exposing
    // implementation-level sliders in the UI.
    smoothing: 25,
    straightening: 55
  };
}

function syncBitmapFlattenLabels() {
  if (bitmapFlattenMode && !bitmapFlattenMode.value) bitmapFlattenMode.value = "auto";
  if (bitmapFlattenPaint && !bitmapFlattenPaint.value) bitmapFlattenPaint.value = "flat";
  if (bitmapFlattenColorsValue) bitmapFlattenColorsValue.value = bitmapFlattenColors?.value || "12";
  if (bitmapFlattenDetailValue) bitmapFlattenDetailValue.value = bitmapFlattenDetail?.value || "70";
  if (bitmapFlattenNoiseValue) bitmapFlattenNoiseValue.value = bitmapFlattenNoise?.value || "35";
  if (bitmapFlattenHybridSensitivityValue) bitmapFlattenHybridSensitivityValue.value = bitmapFlattenHybridSensitivity?.value || "50";
  if (bitmapFlattenAxisSnapSensitivityValue) bitmapFlattenAxisSnapSensitivityValue.value = bitmapFlattenAxisSnapSensitivity?.value || "50";
  if (bitmapFlattenAxisSnapSensitivityRow) {
    const enabled = Boolean(bitmapFlattenAxisSnap?.checked);
    bitmapFlattenAxisSnapSensitivityRow.style.opacity = enabled ? "1" : "0.45";
    bitmapFlattenAxisSnapSensitivityRow.dataset.active = enabled ? "true" : "false";
    if (bitmapFlattenAxisSnapSensitivity) bitmapFlattenAxisSnapSensitivity.disabled = !enabled;
  }
  if (bitmapFlattenHybridSensitivityRow) {
    const reconstructMode = bitmapFlattenMode?.value === "reconstruct";
    bitmapFlattenHybridSensitivityRow.style.opacity = reconstructMode ? "1" : "0.45";
    bitmapFlattenHybridSensitivityRow.dataset.active = reconstructMode ? "true" : "false";
    if (bitmapFlattenHybridSensitivity) bitmapFlattenHybridSensitivity.disabled = !reconstructMode;
  }
  if (bitmapFlattenSimplifyValue) bitmapFlattenSimplifyValue.value = bitmapFlattenSimplify?.value || "0";
}

function setBitmapFlattenProgress(percent = 0, active = true) {
  if (!bitmapFlattenProgress || !bitmapFlattenProgressBar) return;
  const value = Math.max(0, Math.min(100, Number(percent) || 0));
  bitmapFlattenProgress.hidden = false;
  bitmapFlattenProgress.dataset.active = active ? "true" : "false";
  bitmapFlattenProgress.dataset.complete = value >= 100 ? "true" : "false";
  bitmapFlattenProgressBar.style.setProperty("--vectorizer-progress", `${value}%`);
  bitmapFlattenProgress.setAttribute("aria-hidden", "false");
}

function hideBitmapFlattenProgress() {
  if (!bitmapFlattenProgress || !bitmapFlattenProgressBar) return;
  bitmapFlattenProgress.dataset.active = "false";
  bitmapFlattenProgress.dataset.complete = "false";
  bitmapFlattenProgressBar.style.setProperty("--vectorizer-progress", "0%");
  bitmapFlattenProgress.hidden = true;
  bitmapFlattenProgress.setAttribute("aria-hidden", "true");
}

function closeBitmapFlatten() {
  if (!bitmapFlattenModal) return;
  bitmapFlattenModal.hidden = true;
  bitmapFlattenSourceElement = null;
  bitmapFlattenLastResult = null;
  bitmapFlattenFinalPreviewCache = null;
  if (bitmapFlattenIslandCount) bitmapFlattenIslandCount.value = "—";
  hideBitmapFlattenProgress();
  bitmapFlattenPreviewToken += 1;
}

function bitmapFlattenPotraceReady() {
  return typeof window.PotracePlus === "function";
}

function syncBitmapFlattenEngineState() {
  const badge = document.querySelector("#bitmapFlattenEngineBadge");
  const ready = bitmapFlattenPotraceReady();
  if (badge) {
    badge.textContent = ready ? "Engine: Potrace" : "Engine: Potrace unavailable";
    badge.dataset.ready = ready ? "true" : "false";
  }
  if (applyBitmapFlattenButton) applyBitmapFlattenButton.disabled = !ready;
  return ready;
}

async function openBitmapFlatten() {
  const source = selectedRasterForFlattening();
  if (!source) {
    toolStatus.textContent = "Select one bitmap image to flatten colours";
    return false;
  }
  bitmapFlattenSourceElement = source;
  bitmapFlattenLastResult = null;
  bitmapFlattenFinalPreviewCache = null;
  syncBitmapFlattenLabels();
  bitmapFlattenModal.hidden = false;
  if (!syncBitmapFlattenEngineState()) {
    if (bitmapFlattenStatus) bitmapFlattenStatus.textContent = "Potrace failed to load. Conversion is disabled.";
    return false;
  }
  if (bitmapFlattenStatus) bitmapFlattenStatus.textContent = "Preparing colour regions for Potrace…";
  setBitmapFlattenProgress(8, true);
  await scheduleBitmapFlattenPreview(true);
  return true;
}

function bitmapFlattenDistance(pixel, paletteColor) {
  const dr = pixel[0] - paletteColor[0];
  const dg = pixel[1] - paletteColor[1];
  const db = pixel[2] - paletteColor[2];
  /* Slightly favour green luminance differences to better respect perceived edges. */
  return dr * dr * 0.9 + dg * dg * 1.15 + db * db * 0.82;
}

function bitmapFlattenProgressivePalette(data, count) {
  const pixelCount = data.length / 4;
  const stride = Math.max(1, Math.floor(pixelCount / 16000));
  const samples = [];
  for (let pixel = 0; pixel < pixelCount; pixel += stride) {
    const offset = pixel * 4;
    if (data[offset + 3] < 16) continue;
    samples.push([data[offset], data[offset + 1], data[offset + 2]]);
  }
  if (!samples.length) return Array.from({ length: count }, () => [0, 0, 0]);

  const makeCluster = indices => {
    let sr = 0, sg = 0, sb = 0;
    for (const index of indices) {
      const color = samples[index];
      sr += color[0]; sg += color[1]; sb += color[2];
    }
    const n = Math.max(1, indices.length);
    const mean = [sr / n, sg / n, sb / n];
    let vr = 0, vg = 0, vb = 0, error = 0;
    for (const index of indices) {
      const color = samples[index];
      const dr = color[0] - mean[0];
      const dg = color[1] - mean[1];
      const db = color[2] - mean[2];
      vr += dr * dr; vg += dg * dg; vb += db * db;
      error += dr * dr * 0.9 + dg * dg * 1.15 + db * db * 0.82;
    }
    return { indices, mean, variance: [vr / n, vg / n, vb / n], error };
  };

  const all = Array.from({ length: samples.length }, (_, index) => index);
  const clusters = [makeCluster(all)];
  while (clusters.length < count) {
    let splitIndex = -1;
    let splitScore = -Infinity;
    for (let i = 0; i < clusters.length; i += 1) {
      const cluster = clusters[i];
      if (cluster.indices.length < 2) continue;
      // Largest within-cluster colour error gets refined next. The tie break
      // by existing index makes the whole hierarchy deterministic.
      if (cluster.error > splitScore + 1e-9) {
        splitScore = cluster.error;
        splitIndex = i;
      }
    }
    if (splitIndex < 0) break;

    const cluster = clusters[splitIndex];
    // Split along the channel with greatest weighted variance. This is a
    // progressive hierarchy: increasing N only splits one existing leaf,
    // leaving every unrelated palette colour untouched.
    const weightedVariance = [
      cluster.variance[0] * 0.9,
      cluster.variance[1] * 1.15,
      cluster.variance[2] * 0.82
    ];
    let axis = 0;
    if (weightedVariance[1] > weightedVariance[axis]) axis = 1;
    if (weightedVariance[2] > weightedVariance[axis]) axis = 2;
    const sorted = cluster.indices.slice().sort((a, b) => {
      const delta = samples[a][axis] - samples[b][axis];
      if (Math.abs(delta) > 1e-9) return delta;
      // Stable deterministic secondary ordering prevents palette flicker on
      // flat/near-flat colours.
      const ca = samples[a], cb = samples[b];
      return (ca[0] - cb[0]) || (ca[1] - cb[1]) || (ca[2] - cb[2]) || (a - b);
    });
    let cut = Math.floor(sorted.length / 2);
    cut = Math.max(1, Math.min(sorted.length - 1, cut));
    const left = makeCluster(sorted.slice(0, cut));
    const right = makeCluster(sorted.slice(cut));
    clusters[splitIndex] = left;
    clusters.push(right);
  }

  const palette = clusters.map(cluster => cluster.mean.slice());
  while (palette.length < count) palette.push(palette[palette.length - 1].slice());
  return palette;
}

function bitmapFlattenCluster(data, colorCount) {
  const palette = bitmapFlattenProgressivePalette(data, colorCount);
  const pixelCount = data.length / 4;
  // Uint16Array is required now that the Vectorizer supports up to 256
  // requested colours (index 255 is valid and should not alias through a
  // future increase beyond the old Uint8-era assumptions).
  const assignments = new Uint16Array(pixelCount);

  // Deliberately do not run global Lloyd/K-means refinement here. A global
  // refinement would move every centroid when the requested colour count
  // changes, defeating progressive palette stability. The hierarchical split
  // already supplies representative centroids; only the cluster being split
  // changes as N increases.
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * 4;
    if (data[offset + 3] < 16) continue;
    const value = [data[offset], data[offset + 1], data[offset + 2]];
    let best = 0;
    let bestDistance = Infinity;
    for (let index = 0; index < palette.length; index += 1) {
      const distance = bitmapFlattenDistance(value, palette[index]);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    }
    assignments[pixel] = best;
  }
  return { palette, assignments };
}

function bitmapFlattenMergePalette(data, clustered, settings) {
  const sourcePalette = clustered.palette || [];
  const sourceAssignments = clustered.assignments;
  const pixelCount = data.length / 4;
  const counts = new Array(sourcePalette.length).fill(0);
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    if (data[pixel * 4 + 3] < 16) continue;
    counts[sourceAssignments[pixel]] += 1;
  }

  const active = counts
    .map((count, index) => ({ index, count, color: sourcePalette[index] }))
    .filter(entry => entry.count > 0)
    .sort((a, b) => b.count - a.count);
  if (!active.length) return clustered;

  // Antialiased flat artwork tends to generate several near-identical edge
  // clusters. Merge those before region cleanup so Potrace sees the intended
  // artwork colours rather than a stack of fringe shades.
  const mergeDistance = 30 + (Number(settings.noise || 35) / 100) * 18;
  const mergeDistanceSq = mergeDistance * mergeDistance;
  const tinyFraction = 0.004 + (Number(settings.noise || 35) / 100) * 0.006;
  const opaqueCount = active.reduce((sum, entry) => sum + entry.count, 0) || 1;
  const merged = [];
  const sourceToMerged = new Array(sourcePalette.length).fill(-1);

  const colorDistanceSq = (a, b) => bitmapFlattenDistance(a, b);
  for (const entry of active) {
    let bestIndex = -1;
    let bestDistance = Infinity;
    for (let index = 0; index < merged.length; index += 1) {
      const distance = colorDistanceSq(entry.color, merged[index].color);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    }
    const isTiny = entry.count / opaqueCount <= tinyFraction;
    const canMerge = bestIndex >= 0 && (bestDistance <= mergeDistanceSq || (isTiny && bestDistance <= mergeDistanceSq * 3.2));
    if (canMerge) {
      const target = merged[bestIndex];
      const total = target.count + entry.count;
      // Tiny antialias/fringe clusters should be absorbed structurally without
      // tinting the dominant parent colour. Otherwise a dark fringe can pull
      // the entire foreground palette colour darker and become visible as a rim.
      if (!isTiny) {
        target.color = [
          (target.color[0] * target.count + entry.color[0] * entry.count) / total,
          (target.color[1] * target.count + entry.color[1] * entry.count) / total,
          (target.color[2] * target.count + entry.color[2] * entry.count) / total
        ];
      }
      target.count = total;
      sourceToMerged[entry.index] = bestIndex;
    } else {
      sourceToMerged[entry.index] = merged.length;
      merged.push({ color: entry.color.slice(), count: entry.count });
    }
  }

  const assignments = new Uint8Array(pixelCount);
  const sums = Array.from({ length: merged.length }, () => [0, 0, 0, 0]);
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * 4;
    if (data[offset + 3] < 16) continue;
    const mapped = Math.max(0, sourceToMerged[sourceAssignments[pixel]]);
    assignments[pixel] = mapped;
    const sum = sums[mapped];
    sum[0] += data[offset];
    sum[1] += data[offset + 1];
    sum[2] += data[offset + 2];
    sum[3] += 1;
  }
  const palette = merged.map((entry, index) => {
    const sum = sums[index];
    return sum[3] ? [sum[0] / sum[3], sum[1] / sum[3], sum[2] / sum[3]] : entry.color;
  });
  return { palette, assignments };
}

function bitmapFlattenAssignSourceToPalette(rgba, alpha, palette) {
  const pixelCount = Math.floor((rgba?.length || 0) / 4);
  const assignments = new Uint8Array(pixelCount);
  if (!pixelCount || !palette?.length) return assignments;
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    if (alpha?.[pixel] <= 8) continue;
    const o = pixel * 4;
    const color = [rgba[o], rgba[o + 1], rgba[o + 2]];
    let best = 0, bestDistance = Infinity;
    for (let index = 0; index < palette.length; index += 1) {
      const distance = bitmapFlattenDistance(color, palette[index]);
      if (distance < bestDistance) { bestDistance = distance; best = index; }
    }
    assignments[pixel] = best;
  }
  return assignments;
}

function bitmapFlattenSpatialCleanup(assignments, width, height, settings, edgeRgba = null, alpha = null, palette = null) {
  let current = assignments;
  const passes = Math.max(0, Math.min(5, Math.round(settings.noise / 28 + settings.smoothing / 45)));
  if (!passes) return current;
  const detailProtection = settings.detail / 100;
  const hasEdgeGuide = edgeRgba?.length >= width * height * 4 && palette?.length;

  const sourceColor = index => {
    const o = index * 4;
    return [edgeRgba[o], edgeRgba[o + 1], edgeRgba[o + 2]];
  };
  const sourceDistance = (a, b) => Math.sqrt(bitmapFlattenDistance(a, b));

  for (let pass = 0; pass < passes; pass += 1) {
    const next = current.slice();
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const index = y * width + x;
        if (alpha?.[index] <= 8) continue;
        const original = current[index];
        const counts = new Map();
        for (let oy = -1; oy <= 1; oy += 1) {
          for (let ox = -1; ox <= 1; ox += 1) {
            if (!ox && !oy) continue;
            const nextIndex = (y + oy) * width + x + ox;
            if (alpha?.[nextIndex] <= 8) continue;
            const value = current[nextIndex];
            counts.set(value, (counts.get(value) || 0) + 1);
          }
        }
        let winner = original;
        let winnerCount = 0;
        counts.forEach((count, value) => {
          if (count > winnerCount) { winner = value; winnerCount = count; }
        });
        const threshold = detailProtection > 0.75 ? 7 : detailProtection > 0.4 ? 6 : 5;
        if (winner === original || winnerCount < threshold) continue;

        if (hasEdgeGuide && palette[original] && palette[winner]) {
          const pixelColor = sourceColor(index);
          const originalDistance = sourceDistance(pixelColor, palette[original]);
          const winnerDistance = sourceDistance(pixelColor, palette[winner]);

          // Preserve topology wherever the unblurred source clearly supports
          // the current palette assignment. This prevents neighbourhood cleanup
          // from closing narrow high-contrast negative-space channels such as
          // counters, arrows and small interior gaps.
          if (originalDistance + 5 < winnerDistance) continue;

          let maxContrast = 0;
          let originalCardinalSupport = 0;
          const cardinal = [index - 1, index + 1, index - width, index + width];
          for (const neighbour of cardinal) {
            if (alpha?.[neighbour] <= 8) continue;
            maxContrast = Math.max(maxContrast, sourceDistance(pixelColor, sourceColor(neighbour)));
            if (current[neighbour] === original) originalCardinalSupport += 1;
          }
          if (maxContrast >= 32 && originalDistance <= winnerDistance + 10) continue;
          if (originalCardinalSupport >= 2 && originalDistance <= winnerDistance + 14) continue;
        }
        next[index] = winner;
      }
    }
    current = next;
  }
  return current;
}


function bitmapFlattenPointSegmentRgbDistance(color, a, b) {
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const vz = b[2] - a[2];
  const wx = color[0] - a[0];
  const wy = color[1] - a[1];
  const wz = color[2] - a[2];
  const denom = vx * vx + vy * vy + vz * vz;
  const t = denom > 1e-9 ? Math.max(0, Math.min(1, (wx * vx + wy * vy + wz * vz) / denom)) : 0;
  const dx = color[0] - (a[0] + vx * t);
  const dy = color[1] - (a[1] + vy * t);
  const dz = color[2] - (a[2] + vz * t);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function bitmapFlattenConsolidateEdgeColours(assignments, rgba, alpha, palette, width, height, settings = {}) {
  if (!assignments?.length || !palette?.length || palette.length < 3) return assignments;
  const size = width * height;
  const current = assignments.slice();
  const visited = new Uint8Array(size);
  const queue = new Int32Array(size);
  const detail = Math.max(0, Math.min(100, Number(settings.detail) || 70));
  const noise = Math.max(0, Math.min(100, Number(settings.noise) || 35));
  const maxArea = Math.max(8, Math.min(180, Math.round(size * (0.00008 + (100 - detail) * 0.0000022 + noise * 0.0000012))));
  const maxThinWidth = detail >= 85 ? 2 : 3;
  const blendTolerance = detail >= 85 ? 9 : detail >= 60 ? 12 : 16;
  const oneNeighbourTolerance = 24 + (noise / 100) * 10;

  const neighbours4 = (index, fn) => {
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) fn(index - 1);
    if (x + 1 < width) fn(index + 1);
    if (y > 0) fn(index - width);
    if (y + 1 < height) fn(index + width);
  };

  for (let start = 0; start < size; start += 1) {
    if (visited[start] || alpha[start] <= 8) continue;
    const label = current[start];
    let head = 0, tail = 0;
    queue[tail++] = start;
    visited[start] = 1;
    let minX = width, minY = height, maxX = -1, maxY = -1;
    let boundaryEdges = 0;
    const neighbourCounts = new Map();
    const pixels = [];
    let sumR = 0, sumG = 0, sumB = 0;

    while (head < tail) {
      const index = queue[head++];
      pixels.push(index);
      const x = index % width;
      const y = Math.floor(index / width);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      const o = index * 4;
      sumR += rgba[o]; sumG += rgba[o + 1]; sumB += rgba[o + 2];

      neighbours4(index, next => {
        if (alpha[next] <= 8) { boundaryEdges += 1; return; }
        if (current[next] === label) {
          if (!visited[next]) { visited[next] = 1; queue[tail++] = next; }
        } else {
          boundaryEdges += 1;
          neighbourCounts.set(current[next], (neighbourCounts.get(current[next]) || 0) + 1);
        }
      });
    }

    const area = pixels.length;
    if (!area || !neighbourCounts.size) continue;
    const boxW = maxX - minX + 1;
    const boxH = maxY - minY + 1;
    const thin = Math.min(boxW, boxH) <= maxThinWidth || area / Math.max(1, boxW * boxH) <= 0.42;
    const compactSmall = area <= Math.max(6, Math.round(maxArea * 0.33));
    if (area > maxArea || (!thin && !compactSmall)) continue;

    const ranked = [...neighbourCounts.entries()].sort((a, b) => b[1] - a[1]);
    const neighbourContact = ranked.reduce((sum, entry) => sum + entry[1], 0);
    const dominantContact = ranked[0]?.[1] || 0;
    if (neighbourContact < Math.max(3, Math.ceil(boundaryEdges * 0.45))) continue;
    if (dominantContact / Math.max(1, neighbourContact) < 0.34) continue;

    const mean = [sumR / area, sumG / area, sumB / area];
    const own = palette[label] || mean;
    let fringe = false;
    if (ranked.length >= 2) {
      const a = palette[ranked[0][0]];
      const b = palette[ranked[1][0]];
      if (a && b) {
        const blendError = bitmapFlattenPointSegmentRgbDistance(mean, a, b);
        const ownToA = Math.sqrt(bitmapFlattenDistance(own, a));
        const ownToB = Math.sqrt(bitmapFlattenDistance(own, b));
        fringe = blendError <= blendTolerance && Math.min(ownToA, ownToB) <= 95;
      }
    } else {
      const target = palette[ranked[0][0]];
      if (target) fringe = Math.sqrt(bitmapFlattenDistance(mean, target)) <= oneNeighbourTolerance;
    }
    if (!fringe) continue;

    const candidateLabels = ranked.slice(0, Math.min(3, ranked.length)).map(entry => entry[0]);
    // Reassign each fringe pixel independently to the best adjacent real colour.
    // This lets a one-pixel antialias strip between A/B split naturally across
    // both regions instead of becoming a conspicuous third-colour patch.
    for (const index of pixels) {
      const o = index * 4;
      const color = [rgba[o], rgba[o + 1], rgba[o + 2]];
      let bestLabel = candidateLabels[0];
      let bestScore = Infinity;
      for (const candidate of candidateLabels) {
        const target = palette[candidate];
        if (!target) continue;
        let adjacencyBonus = 0;
        neighbours4(index, next => {
          if (alpha[next] > 8 && current[next] === candidate) adjacencyBonus += 1;
        });
        const score = bitmapFlattenDistance(color, target) - adjacencyBonus * 120;
        if (score < bestScore) { bestScore = score; bestLabel = candidate; }
      }
      current[index] = bestLabel;
    }
  }
  return current;
}


function bitmapFlattenPruneFringePaletteAssignments(assignments, rgba, alpha, palette, width, height, settings = {}) {
  if (!assignments?.length || !palette?.length || palette.length < 3) return assignments;
  const current = assignments.slice();
  const size = width * height;
  const counts = new Array(palette.length).fill(0);
  const contacts = Array.from({ length: palette.length }, () => new Map());
  for (let i = 0; i < size; i += 1) {
    if (alpha[i] <= 8) continue;
    const label = current[i];
    counts[label] += 1;
    const x = i % width, y = Math.floor(i / width);
    const visit = j => {
      if (alpha[j] <= 8) return;
      const other = current[j];
      if (other === label) return;
      const map = contacts[label];
      map.set(other, (map.get(other) || 0) + 1);
    };
    if (x + 1 < width) visit(i + 1);
    if (y + 1 < height) visit(i + width);
  }
  const totalOpaque = counts.reduce((a, b) => a + b, 0) || 1;
  const detail = Math.max(0, Math.min(100, Number(settings.detail) || 70));
  const maxFraction = detail >= 85 ? 0.012 : detail >= 60 ? 0.02 : 0.032;
  const blendTolerance = detail >= 85 ? 7.5 : detail >= 60 ? 10 : 13;
  const candidates = [];
  for (let label = 0; label < palette.length; label += 1) {
    if (!counts[label] || counts[label] / totalOpaque > maxFraction) continue;
    const ranked = [...contacts[label].entries()].sort((a, b) => b[1] - a[1]);
    if (ranked.length < 2) continue;
    const [aIndex, aContact] = ranked[0];
    const [bIndex, bContact] = ranked[1];
    if (counts[aIndex] <= counts[label] * 1.5 || counts[bIndex] <= counts[label] * 1.5) continue;
    const contactTotal = ranked.reduce((sum, e) => sum + e[1], 0);
    if ((aContact + bContact) / Math.max(1, contactTotal) < 0.72) continue;
    const fringe = palette[label], a = palette[aIndex], b = palette[bIndex];
    if (!fringe || !a || !b) continue;
    if (bitmapFlattenPointSegmentRgbDistance(fringe, a, b) > blendTolerance) continue;
    candidates.push({ label, targets: [aIndex, bIndex] });
  }
  if (!candidates.length) return current;

  const candidateMap = new Map(candidates.map(item => [item.label, item.targets]));
  for (let i = 0; i < size; i += 1) {
    const targets = candidateMap.get(current[i]);
    if (!targets || alpha[i] <= 8) continue;
    const o = i * 4;
    const color = [rgba[o], rgba[o + 1], rgba[o + 2]];
    let best = targets[0], bestScore = Infinity;
    const x = i % width, y = Math.floor(i / width);
    for (const target of targets) {
      let neighbourSupport = 0;
      const check = j => { if (alpha[j] > 8 && current[j] === target) neighbourSupport += 1; };
      if (x > 0) check(i - 1);
      if (x + 1 < width) check(i + 1);
      if (y > 0) check(i - width);
      if (y + 1 < height) check(i + width);
      const score = bitmapFlattenDistance(color, palette[target]) - neighbourSupport * 90;
      if (score < bestScore) { bestScore = score; best = target; }
    }
    current[i] = best;
  }
  return current;
}

function bitmapFlattenAbsorbSmallIslands(assignments, rgba, alpha, palette, width, height, settings = {}) {
  const baseMergeArea = Math.max(0, Number(settings?.mergeShapeArea) || 0);
  if (baseMergeArea <= 1 || !assignments?.length) return assignments;

  // Keep the user's X threshold visually consistent between the ~720px preview
  // and the higher-resolution final trace. Areas grow with scale squared.
  const geometryScale = Math.max(1, Number(settings?.traceGeometryScale) || 1);
  const mergeArea = baseMergeArea * geometryScale * geometryScale;
  let current = assignments.slice();
  const size = width * height;
  const maxPasses = 4;

  const neighbours8 = (index, fn) => {
    const x = index % width;
    const y = Math.floor(index / width);
    for (let oy = -1; oy <= 1; oy += 1) {
      const yy = y + oy;
      if (yy < 0 || yy >= height) continue;
      for (let ox = -1; ox <= 1; ox += 1) {
        if (!ox && !oy) continue;
        const xx = x + ox;
        if (xx < 0 || xx >= width) continue;
        fn(yy * width + xx);
      }
    }
  };

  for (let pass = 0; pass < maxPasses; pass += 1) {
    const visited = new Uint8Array(size);
    const componentIds = new Int32Array(size);
    componentIds.fill(-1);
    const queue = new Int32Array(size);
    const components = [];

    // Build 8-connected islands. Diagonal antialias pixels should belong to the
    // same visual island rather than becoming separate one-pixel components.
    for (let start = 0; start < size; start += 1) {
      if (visited[start] || alpha[start] <= 8) continue;
      const label = current[start];
      let head = 0, tail = 0;
      queue[tail++] = start;
      visited[start] = 1;
      componentIds[start] = components.length;
      const pixels = [];
      let minX = width, minY = height, maxX = -1, maxY = -1;
      while (head < tail) {
        const index = queue[head++];
        pixels.push(index);
        const x = index % width, y = Math.floor(index / width);
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        neighbours8(index, next => {
          if (visited[next] || alpha[next] <= 8 || current[next] !== label) return;
          visited[next] = 1;
          componentIds[next] = components.length;
          queue[tail++] = next;
        });
      }
      components.push({ id: components.length, label, pixels, area: pixels.length, minX, minY, maxX, maxY });
    }

    let changed = 0;
    for (const component of components) {
      if (component.area >= mergeArea) continue;

      // Search an expanding ring around the island. This finds the visual layer
      // underneath even when a 1–2px antialias/fringe band separates them.
      const candidateScores = new Map();
      let transparentSamples = 0;
      const maxRadius = Math.max(2, Math.min(8, Math.ceil(1.5 * geometryScale + Math.sqrt(component.area) * 0.08)));
      for (let radius = 1; radius <= maxRadius; radius += 1) {
        const x0 = Math.max(0, component.minX - radius);
        const y0 = Math.max(0, component.minY - radius);
        const x1 = Math.min(width - 1, component.maxX + radius);
        const y1 = Math.min(height - 1, component.maxY + radius);
        const weight = 1 / radius;
        const sample = (x, y) => {
          const index = y * width + x;
          if (alpha[index] <= 8) { transparentSamples += weight; return; }
          const otherId = componentIds[index];
          if (otherId < 0 || otherId === component.id) return;
          const other = components[otherId];
          if (!other || other.area <= component.area) return;
          const previous = candidateScores.get(otherId) || 0;
          candidateScores.set(otherId, previous + weight);
        };
        for (let x = x0; x <= x1; x += 1) { sample(x, y0); if (y1 !== y0) sample(x, y1); }
        for (let y = y0 + 1; y < y1; y += 1) { sample(x0, y); if (x1 !== x0) sample(x1, y); }
      }
      if (!candidateScores.size) continue;

      const ranked = [...candidateScores.entries()].sort((a, b) => b[1] - a[1]);
      const [bestId, bestScore] = ranked[0];
      const secondScore = ranked[1]?.[1] || 0;
      const totalScore = ranked.reduce((sum, entry) => sum + entry[1], 0);
      const target = components[bestId];
      if (!target) continue;

      // Prefer a clearly surrounding larger island. Fully enclosed specks often
      // have overwhelming support; boundary specks with lots of transparency do not.
      const dominance = bestScore / Math.max(1e-6, totalScore);
      const separation = secondScore ? bestScore / secondScore : Infinity;
      if (dominance < 0.34) continue;
      if (separation < 1.04) continue;
      if (transparentSamples > bestScore * 1.5) continue;

      for (const index of component.pixels) current[index] = target.label;
      changed += component.pixels.length;
    }
    if (!changed) break;
  }

  return current;
}


function bitmapFlattenRefinePaletteFromSource(assignments, sourceRgba, sourceAlpha, palette, width, height) {
  if (!assignments?.length || !sourceRgba?.length || !palette?.length) return palette;
  const labelCount = palette.length;
  const makeHistograms = () => Array.from({ length: labelCount }, () => ({
    r: new Uint32Array(256),
    g: new Uint32Array(256),
    b: new Uint32Array(256),
    count: 0
  }));
  const all = makeHistograms();
  const interior = makeHistograms();
  const size = width * height;

  const add = (bucket, offset) => {
    bucket.r[sourceRgba[offset]] += 1;
    bucket.g[sourceRgba[offset + 1]] += 1;
    bucket.b[sourceRgba[offset + 2]] += 1;
    bucket.count += 1;
  };

  for (let index = 0; index < size; index += 1) {
    if ((sourceAlpha?.[index] ?? sourceRgba[index * 4 + 3]) <= 16) continue;
    const label = assignments[index];
    if (label < 0 || label >= labelCount) continue;
    const offset = index * 4;
    add(all[label], offset);

    // Only let pixels comfortably inside the final cleaned region determine
    // its displayed colour. Boundary pixels contain antialias mixtures and are
    // exactly what tends to make traced logo colours look dull/dark/off-hue.
    const x = index % width;
    const y = Math.floor(index / width);
    if (x <= 0 || y <= 0 || x >= width - 1 || y >= height - 1) continue;
    let isInterior = true;
    for (let oy = -1; oy <= 1 && isInterior; oy += 1) {
      for (let ox = -1; ox <= 1; ox += 1) {
        if (!ox && !oy) continue;
        const next = (y + oy) * width + x + ox;
        if ((sourceAlpha?.[next] ?? sourceRgba[next * 4 + 3]) <= 16 || assignments[next] !== label) {
          isInterior = false;
          break;
        }
      }
    }
    if (isInterior) add(interior[label], offset);
  }

  const percentileFromHistogram = (hist, count, q) => {
    if (!count) return 0;
    const target = Math.max(0, Math.min(count - 1, Math.floor((count - 1) * q)));
    let seen = 0;
    for (let value = 0; value < 256; value += 1) {
      seen += hist[value];
      if (seen > target) return value;
    }
    return 255;
  };

  return palette.map((fallback, label) => {
    const allBucket = all[label];
    const interiorBucket = interior[label];
    // Prefer interior samples whenever there are enough to be representative.
    // Tiny islands naturally fall back to all source pixels rather than losing
    // their colour because they have no 1px-eroded interior.
    const bucket = interiorBucket.count >= Math.max(6, Math.min(48, Math.round(allBucket.count * 0.08)))
      ? interiorBucket
      : allBucket;
    if (!bucket.count) return fallback;

    // Channel medians are deliberately used instead of a mean. For flat
    // artwork this recovers the dominant source colour and rejects antialias,
    // compression and fringe outliers without inventing extra palette colours.
    return [
      percentileFromHistogram(bucket.r, bucket.count, 0.5),
      percentileFromHistogram(bucket.g, bucket.count, 0.5),
      percentileFromHistogram(bucket.b, bucket.count, 0.5)
    ];
  });
}

async function bitmapFlattenProcess(element, maxDimension = 700) {
  const browserImage = await loadBrowserImage(imageHref(element));
  const naturalWidth = Math.max(1, browserImage.naturalWidth || browserImage.width || 1);
  const naturalHeight = Math.max(1, browserImage.naturalHeight || browserImage.height || 1);
  const scale = Math.min(1, maxDimension / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));
  const settings = bitmapFlattenSettings();
  // Geometry tolerances are authored against the 720px live-preview scale.
  // Higher final trace resolutions should improve localisation without
  // preserving proportionally more raster wobble in the finished SVG.
  const referenceDimension = Math.max(1, Math.min(720, Math.max(naturalWidth, naturalHeight)));
  settings.traceGeometryScale = Math.max(1, Math.max(width, height) / referenceDimension);

  // Keep an unblurred copy at the tracing resolution for sub-pixel edge
  // refinement. Segmentation can still use the lightly smoothed image below.
  const edgeCanvas = document.createElement("canvas");
  edgeCanvas.width = width;
  edgeCanvas.height = height;
  const edgeContext = edgeCanvas.getContext("2d", { willReadFrequently: true });
  edgeContext.clearRect(0, 0, width, height);
  edgeContext.drawImage(browserImage, 0, 0, width, height);
  const edgeImageData = edgeContext.getImageData(0, 0, width, height);

  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
  const blurAmount = (settings.smoothing / 100) * 2.4 * (1 - settings.detail / 135);
  sourceContext.clearRect(0, 0, width, height);
  sourceContext.filter = blurAmount > 0.05 ? `blur(${blurAmount.toFixed(2)}px)` : "none";
  sourceContext.drawImage(browserImage, 0, 0, width, height);
  sourceContext.filter = "none";
  const imageData = sourceContext.getImageData(0, 0, width, height);
  const clusteredRaw = bitmapFlattenCluster(imageData.data, settings.colors);
  const clustered = bitmapFlattenMergePalette(imageData.data, clusteredRaw, settings);
  const edgeAlpha = Uint8Array.from({ length: width * height }, (_, pixel) => edgeImageData.data[pixel * 4 + 3]);
  // Learn a stable palette from the lightly smoothed image, but classify the
  // final regions from the original unblurred pixels. Palette count controls
  // colour complexity; it should not also determine whether narrow negative
  // spaces survive the segmentation.
  const sourceAssignments = settings.paint === "gradient"
    ? clustered.assignments
    : bitmapFlattenAssignSourceToPalette(edgeImageData.data, edgeAlpha, clustered.palette);
  const spatiallyCleaned = bitmapFlattenSpatialCleanup(
    sourceAssignments,
    width,
    height,
    settings,
    edgeImageData.data,
    edgeAlpha,
    clustered.palette
  );
  const locallyConsolidated = settings.paint === "gradient"
    ? spatiallyCleaned
    : bitmapFlattenConsolidateEdgeColours(
        spatiallyCleaned,
        edgeImageData.data,
        edgeAlpha,
        clustered.palette,
        width,
        height,
        settings
      );
  const cleaned = settings.paint === "gradient"
    ? locallyConsolidated
    : bitmapFlattenPruneFringePaletteAssignments(
        locallyConsolidated,
        edgeImageData.data,
        edgeAlpha,
        clustered.palette,
        width,
        height,
        settings
      );
  const mergedIslands = settings.paint === "gradient"
    ? cleaned
    : bitmapFlattenAbsorbSmallIslands(
        cleaned,
        edgeImageData.data,
        edgeAlpha,
        clustered.palette,
        width,
        height,
        settings
      );
  const refinedPalette = settings.paint === "gradient"
    ? clustered.palette
    : bitmapFlattenRefinePaletteFromSource(
        mergedIslands,
        edgeImageData.data,
        edgeAlpha,
        clustered.palette,
        width,
        height
      );
  const outputData = new ImageData(width, height);
  for (let pixel = 0; pixel < mergedIslands.length; pixel += 1) {
    const offset = pixel * 4;
    const paletteColor = refinedPalette[mergedIslands[pixel]] || clustered.palette[mergedIslands[pixel]] || [0, 0, 0];
    outputData.data[offset] = Math.round(paletteColor[0]);
    outputData.data[offset + 1] = Math.round(paletteColor[1]);
    outputData.data[offset + 2] = Math.round(paletteColor[2]);
    outputData.data[offset + 3] = imageData.data[offset + 3];
  }
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = width;
  outputCanvas.height = height;
  outputCanvas.getContext("2d").putImageData(outputData, 0, 0);
  return {
    sourceCanvas,
    outputCanvas,
    width,
    height,
    palette: refinedPalette,
    assignments: mergedIslands,
    rgba: new Uint8ClampedArray(imageData.data),
    alpha: Uint8Array.from({ length: width * height }, (_, pixel) => imageData.data[pixel * 4 + 3]),
    edgeRgba: new Uint8ClampedArray(edgeImageData.data),
    edgeAlpha,
    activePaletteIndices: [...new Set(mergedIslands)].filter(index => refinedPalette[index]),
    settings
  };
}

function bitmapFlattenRegionMask(result, paletteIndex) {
  const width = result.width;
  const height = result.height;
  const size = width * height;
  const mask = new Uint8Array(size);
  for (let i = 0; i < size; i += 1) {
    if (result.alpha[i] > 8 && result.assignments[i] === paletteIndex) mask[i] = 1;
  }

  const color = result.palette[paletteIndex] || [0, 0, 0];
  const maxChannel = Math.max(color[0], color[1], color[2]);
  const minChannel = Math.min(color[0], color[1], color[2]);
  const neutral = maxChannel - minChannel < 24;
  const light = bitmapFlattenLuminance(color[0], color[1], color[2]) > 220;
  if (!(neutral && light)) {
    let count = 0;
    for (const value of mask) if (value) count += 1;
    return { mask, pixelCount: count, removedBackground: false };
  }

  // Remove only a large border-connected light-neutral component. This keeps
  // enclosed white artwork (for example the white Pepsi wave) while dropping
  // the white page/background around the logo.
  const visited = new Uint8Array(size);
  const queue = new Int32Array(size);
  const components = [];
  const enqueueComponent = start => {
    if (!mask[start] || visited[start]) return;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    visited[start] = 1;
    const pixels = [];
    let touchesBorder = false;
    while (head < tail) {
      const index = queue[head++];
      pixels.push(index);
      const x = index % width;
      const y = Math.floor(index / width);
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesBorder = true;
      const neighbours = [];
      if (x > 0) neighbours.push(index - 1);
      if (x + 1 < width) neighbours.push(index + 1);
      if (y > 0) neighbours.push(index - width);
      if (y + 1 < height) neighbours.push(index + width);
      for (const next of neighbours) {
        if (!visited[next] && mask[next]) {
          visited[next] = 1;
          queue[tail++] = next;
        }
      }
    }
    components.push({ pixels, touchesBorder });
  };

  for (let i = 0; i < size; i += 1) if (mask[i] && !visited[i]) enqueueComponent(i);
  const largestBorder = components
    .filter(component => component.touchesBorder)
    .sort((a, b) => b.pixels.length - a.pixels.length)[0];
  let removedBackground = false;
  if (largestBorder && largestBorder.pixels.length / size > 0.12) {
    largestBorder.pixels.forEach(index => { mask[index] = 0; });
    removedBackground = true;
  }
  let pixelCount = 0;
  for (const value of mask) if (value) pixelCount += 1;
  return { mask, pixelCount, removedBackground };
}

function bitmapFlattenAddSeamOverlap(baseMask, retainedCoverage, width, height) {
  // Potrace traces each palette region independently. When two masks meet exactly
  // on a raster boundary, curve fitting can pull both traced edges inward and
  // reveal a hairline gap. Grow only across boundaries shared with another
  // retained colour region; never grow beyond the combined artwork silhouette.
  const expanded = new Uint8Array(baseMask);
  const size = width * height;
  for (let index = 0; index < size; index += 1) {
    if (!baseMask[index]) continue;
    const x = index % width;
    const y = Math.floor(index / width);
    for (let dy = -1; dy <= 1; dy += 1) {
      const ny = y + dy;
      if (ny < 0 || ny >= height) continue;
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        if (nx < 0 || nx >= width) continue;
        const next = ny * width + nx;
        if (retainedCoverage[next] && !baseMask[next]) expanded[next] = 1;
      }
    }
  }
  return expanded;
}

function bitmapFlattenPaletteRegions(result) {
  const counts = new Array(result?.palette?.length || 0).fill(0);
  if (!result || !Array.isArray(result.assignments) && !(result.assignments instanceof Uint8Array) && !(result.assignments instanceof Uint16Array) && !(result.assignments instanceof Uint32Array)) {
    return [];
  }
  for (let i = 0; i < result.assignments.length; i += 1) {
    const paletteIndex = result.assignments[i];
    if (result.alpha[i] <= 8) continue;
    if (paletteIndex >= 0 && paletteIndex < counts.length) counts[paletteIndex] += 1;
  }
  return counts
    .map((pixelCount, paletteIndex) => ({
      paletteIndex,
      pixelCount,
      color: result.palette[paletteIndex]
    }))
    .filter(entry => entry.pixelCount > 0)
    .sort((a, b) => b.pixelCount - a.pixelCount);
}

function bitmapFlattenShouldUseLogoMode(result, analysis = null) {
  const mode = result?.settings?.mode || bitmapFlattenMode?.value || "auto";
  if (mode === "logo") return true;
  if (mode === "colour" || mode === "reconstruct") return false;
  const inspected = analysis || bitmapFlattenImageAnalysis(result);
  return !!inspected?.monochrome;
}

function bitmapFlattenFilterMaskByArea(mask, width, height, minArea = 0) {
  const threshold = Math.max(0, Number(minArea) || 0);
  if (!mask || threshold <= 1) return new Uint8Array(mask || 0);
  const size = width * height;
  const visited = new Uint8Array(size);
  const kept = new Uint8Array(size);
  const queue = new Int32Array(size);
  for (let start = 0; start < size; start += 1) {
    if (!mask[start] || visited[start]) continue;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    visited[start] = 1;
    while (head < tail) {
      const index = queue[head++];
      const x = index % width;
      const y = Math.floor(index / width);
      if (x > 0) {
        const next = index - 1;
        if (!visited[next] && mask[next]) { visited[next] = 1; queue[tail++] = next; }
      }
      if (x + 1 < width) {
        const next = index + 1;
        if (!visited[next] && mask[next]) { visited[next] = 1; queue[tail++] = next; }
      }
      if (y > 0) {
        const next = index - width;
        if (!visited[next] && mask[next]) { visited[next] = 1; queue[tail++] = next; }
      }
      if (y + 1 < height) {
        const next = index + width;
        if (!visited[next] && mask[next]) { visited[next] = 1; queue[tail++] = next; }
      }
    }
    if (tail >= threshold) {
      for (let i = 0; i < tail; i += 1) kept[queue[i]] = 1;
    }
  }
  return kept;
}

function bitmapFlattenFillEnclosedMaskHoles(mask, width, height) {
  // Painter-stack reconstruction needs every colour layer to retain its full
  // underlying coverage. Pixels occupied by a different colour above it appear
  // as enclosed gaps in the palette mask (Japan flag: the red disc cuts a hole
  // in the white mask). Flood only the exterior zero-space, then fill every
  // remaining enclosed zero component. This turns the lower layer into a solid
  // underpaint; the other colour is traced independently and painted above it.
  const size = width * height;
  if (!mask || mask.length !== size || width < 1 || height < 1) return mask;
  const exterior = new Uint8Array(size);
  const queue = new Int32Array(size);
  let head = 0, tail = 0;
  const enqueue = (index) => {
    if (index < 0 || index >= size || mask[index] || exterior[index]) return;
    exterior[index] = 1;
    queue[tail++] = index;
  };
  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    if (height > 1) enqueue((height - 1) * width + x);
  }
  for (let y = 1; y + 1 < height; y += 1) {
    enqueue(y * width);
    if (width > 1) enqueue(y * width + width - 1);
  }
  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) enqueue(index - 1);
    if (x + 1 < width) enqueue(index + 1);
    if (y > 0) enqueue(index - width);
    if (y + 1 < height) enqueue(index + width);
  }
  const filled = new Uint8Array(mask);
  for (let i = 0; i < size; i += 1) {
    if (!filled[i] && !exterior[i]) filled[i] = 1;
  }
  return filled;
}

function bitmapFlattenPainterComponentState(result) {
  if (!result) return null;
  if (!result._painterComponentState) {
    const state = bitmapFlattenLabelRasterComponents(result);
    state.width = result.width;
    state.height = result.height;
    result._painterComponentState = state;
  }
  return result._painterComponentState;
}

function bitmapFlattenCompleteOccludedUnderpaint(result, paletteIndex, baseMask) {
  // v78 SAFE BASELINE: do not synthesize open-edge/fragment occlusion geometry
  // with scanlines, rectangles, row/column consensus, or fragment bridges.
  // Those heuristics can create artificial blocky masses and orthogonal
  // protrusions that Potrace faithfully turns into visible vector artefacts.
  //
  // The only underpaint completion allowed here is a topologically safe one:
  // fill zero-regions that are fully enclosed by this colour mask. This handles
  // simple painter-stack cases (e.g. Japan flag: white rectangle under red disc)
  // without inventing geometry outside the visible contour. Harder open-edge
  // occlusions deliberately remain uncompleted until a contour-constrained
  // reconstruction pass can solve them without raster bridge artefacts.
  const width = result?.width || 0;
  const height = result?.height || 0;
  const safe = bitmapFlattenFillEnclosedMaskHoles(baseMask, width, height);
  if (result) {
    // Clear any graph evidence left by preview/earlier passes so final ordering
    // cannot be influenced by removed synthetic occlusion hypotheses.
    result._painterAboveEdges = new Set();
    result._painterFragmentLinks = new Set();
    if (!result._painterRestoredPixels) result._painterRestoredPixels = {};
    let restored = 0;
    if (baseMask && safe && baseMask.length === safe.length) {
      for (let i = 0; i < safe.length; i += 1) if (safe[i] && !baseMask[i]) restored += 1;
    }
    result._painterRestoredPixels[paletteIndex] = restored;
  }
  return safe;
}

function bitmapFlattenPreparedColourMask(result, paletteIndex) {
  const width = result.width;
  const height = result.height;
  const size = width * height;
  const mask = new Uint8Array(size);
  for (let i = 0; i < size; i += 1) {
    if (result.alpha[i] > 8 && result.assignments[i] === paletteIndex) mask[i] = 1;
  }
  const painterMask = bitmapFlattenCompleteOccludedUnderpaint(result, paletteIndex, mask);
  let painterPixelCount = 0;
  for (let i = 0; i < painterMask.length; i += 1) painterPixelCount += painterMask[i] ? 1 : 0;
  return { mask: painterMask, pixelCount: painterPixelCount, removedBackground: false };
}

function bitmapFlattenSplitMaskComponents(mask, width, height, paletteIndex, color) {
  const size = width * height;
  const visited = new Uint8Array(size);
  const queue = new Int32Array(size);
  const components = [];
  for (let start = 0; start < size; start += 1) {
    if (!mask[start] || visited[start]) continue;
    let head = 0, tail = 0;
    queue[tail++] = start;
    visited[start] = 1;
    const pixels = [];
    let minX = width, minY = height, maxX = -1, maxY = -1;
    while (head < tail) {
      const index = queue[head++];
      pixels.push(index);
      const x = index % width;
      const y = Math.floor(index / width);
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      if (x > 0) { const n=index-1; if(mask[n]&&!visited[n]){visited[n]=1;queue[tail++]=n;} }
      if (x + 1 < width) { const n=index+1; if(mask[n]&&!visited[n]){visited[n]=1;queue[tail++]=n;} }
      if (y > 0) { const n=index-width; if(mask[n]&&!visited[n]){visited[n]=1;queue[tail++]=n;} }
      if (y + 1 < height) { const n=index+width; if(mask[n]&&!visited[n]){visited[n]=1;queue[tail++]=n;} }
    }
    const componentMask = new Uint8Array(size);
    for (const index of pixels) componentMask[index] = 1;
    components.push({
      paletteIndex,
      color,
      mask: componentMask,
      pixelCount: pixels.length,
      bounds: { minX, minY, maxX, maxY },
      seedIndex: pixels[0]
    });
  }
  return components;
}

function bitmapFlattenPreparedColourComponents(result, paletteRegions) {
  const components = [];
  for (const region of paletteRegions) {
    const prepared = bitmapFlattenPreparedColourMask(result, region.paletteIndex);
    const split = bitmapFlattenSplitMaskComponents(
      prepared.mask,
      result.width,
      result.height,
      region.paletteIndex,
      region.color
    );
    split.forEach((component, localIndex) => {
      components.push({
        region: {
          paletteIndex: region.paletteIndex,
          pixelCount: component.pixelCount,
          color: region.color,
          componentIndex: localIndex
        },
        regionMask: {
          mask: component.mask,
          pixelCount: component.pixelCount,
          removedBackground: false
        },
        bounds: component.bounds,
        seedIndex: component.seedIndex
      });
    });
  }
  return components;
}

function bitmapFlattenLabelRasterComponents(result) {
  const width = result.width;
  const height = result.height;
  const size = width * height;
  const labels = new Int32Array(size);
  labels.fill(-1);
  const queue = new Int32Array(size);
  const components = [];
  for (let start = 0; start < size; start += 1) {
    if (labels[start] >= 0 || result.alpha[start] <= 8) continue;
    const paletteIndex = result.assignments[start];
    const id = components.length;
    let head = 0, tail = 0;
    queue[tail++] = start;
    labels[start] = id;
    let pixelCount = 0;
    let minX = width, minY = height, maxX = -1, maxY = -1;
    let touchesBorder = false;
    while (head < tail) {
      const index = queue[head++];
      pixelCount += 1;
      const x = index % width;
      const y = Math.floor(index / width);
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesBorder = true;
      const visit = next => {
        if (labels[next] >= 0 || result.alpha[next] <= 8 || result.assignments[next] !== paletteIndex) return;
        labels[next] = id;
        queue[tail++] = next;
      };
      if (x > 0) visit(index - 1);
      if (x + 1 < width) visit(index + 1);
      if (y > 0) visit(index - width);
      if (y + 1 < height) visit(index + width);
    }
    components.push({ id, paletteIndex, pixelCount, bounds: { minX, minY, maxX, maxY }, seedIndex: start, touchesBorder });
  }
  return { labels, components };
}

function bitmapFlattenContourBounds(contour) {
  const anchors = contour?.anchors || [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  anchors.forEach(anchor => {
    minX = Math.min(minX, anchor.x); minY = Math.min(minY, anchor.y);
    maxX = Math.max(maxX, anchor.x); maxY = Math.max(maxY, anchor.y);
  });
  return { minX, minY, maxX, maxY };
}

function bitmapFlattenBoundsDifference(a, b) {
  if (!a || !b) return Infinity;
  return Math.abs(a.minX - b.minX) + Math.abs(a.minY - b.minY) +
    Math.abs(a.maxX - b.maxX) + Math.abs(a.maxY - b.maxY);
}

function bitmapFlattenMatchContourComponent(contour, paletteIndex, componentState, used = new Set()) {
  const bounds = bitmapFlattenContourBounds(contour);
  let best = null;
  let bestScore = Infinity;
  for (const component of componentState.components) {
    if (component.paletteIndex !== paletteIndex || used.has(component.id)) continue;
    const seedX = component.seedIndex % componentState.width;
    const seedY = Math.floor(component.seedIndex / componentState.width);
    const insideOuter = bitmapFlattenPointInAnchorLoop({ x: seedX + 0.5, y: seedY + 0.5 }, contour.anchors);
    const score = bitmapFlattenBoundsDifference(bounds, component.bounds) + (insideOuter ? 0 : 1e6);
    if (score < bestScore) { bestScore = score; best = component; }
  }
  if (best) used.add(best.id);
  return best;
}

function bitmapFlattenForeignComponentsInsideHole(hole, ownerComponentId, componentState) {
  const anchors = hole?.anchors || [];
  if (anchors.length < 3) return new Set();
  const bounds = bitmapFlattenContourBounds(hole);
  const minX = Math.max(0, Math.floor(bounds.minX));
  const minY = Math.max(0, Math.floor(bounds.minY));
  const maxX = Math.min(componentState.width - 1, Math.ceil(bounds.maxX));
  const maxY = Math.min(componentState.height - 1, Math.ceil(bounds.maxY));
  const boxArea = Math.max(1, (maxX - minX + 1) * (maxY - minY + 1));
  const step = Math.max(1, Math.floor(Math.sqrt(boxArea / 6000)));
  const found = new Set();
  for (let y = minY; y <= maxY; y += step) {
    for (let x = minX; x <= maxX; x += step) {
      const index = y * componentState.width + x;
      const componentId = componentState.labels[index];
      if (componentId < 0 || componentId === ownerComponentId) continue;
      if (bitmapFlattenPointInAnchorLoop({ x: x + 0.5, y: y + 0.5 }, anchors)) found.add(componentId);
    }
  }
  // Very small enclosed regions can fall between coarse samples. Probe the
  // component seed points whose bounding boxes intersect this hole as a cheap fallback.
  if (!found.size) {
    for (const component of componentState.components) {
      if (component.id === ownerComponentId) continue;
      const b = component.bounds;
      if (b.maxX < minX || b.minX > maxX || b.maxY < minY || b.minY > maxY) continue;
      const x = component.seedIndex % componentState.width;
      const y = Math.floor(component.seedIndex / componentState.width);
      if (bitmapFlattenPointInAnchorLoop({ x: x + 0.5, y: y + 0.5 }, anchors)) found.add(component.id);
    }
  }
  return found;
}


function bitmapFlattenDominantComponentInsideHole(hole, ownerComponentId, componentState) {
  const anchors = hole?.anchors || [];
  if (anchors.length < 3 || !componentState?.labels) return null;
  const bounds = bitmapFlattenContourBounds(hole);
  const minX = Math.max(0, Math.floor(bounds.minX));
  const minY = Math.max(0, Math.floor(bounds.minY));
  const maxX = Math.min(componentState.width - 1, Math.ceil(bounds.maxX));
  const maxY = Math.min(componentState.height - 1, Math.ceil(bounds.maxY));
  const boxArea = Math.max(1, (maxX - minX + 1) * (maxY - minY + 1));
  const step = Math.max(1, Math.floor(Math.sqrt(boxArea / 10000)));
  const counts = new Map();
  for (let y = minY; y <= maxY; y += step) {
    for (let x = minX; x <= maxX; x += step) {
      if (!bitmapFlattenPointInAnchorLoop({ x:x + 0.5, y:y + 0.5 }, anchors)) continue;
      const id = componentState.labels[y * componentState.width + x];
      if (id < 0 || id === ownerComponentId) continue;
      counts.set(id, (counts.get(id) || 0) + 1);
    }
  }
  let bestId = -1, bestCount = 0;
  for (const [id, count] of counts) {
    if (count > bestCount) { bestCount = count; bestId = id; }
  }
  return bestId >= 0 ? componentState.components[bestId] || null : null;
}

function bitmapFlattenHoleMatchesSourceBackground(hole, result) {
  const anchors = hole?.anchors || [];
  if (anchors.length < 3 || !result?.width || !result?.height) return false;
  const rgba = result.edgeRgba || result.rgba;
  const alpha = result.edgeAlpha || result.alpha;
  if (!rgba || !alpha) return false;

  const width = result.width;
  const height = result.height;
  const borderSamples = [];
  const borderStep = Math.max(1, Math.floor(Math.max(width, height) / 160));
  const addBorder = index => {
    if (index < 0 || index >= width * height || alpha[index] < 24) return;
    const o = index * 4;
    borderSamples.push([rgba[o], rgba[o + 1], rgba[o + 2]]);
  };
  for (let x = 0; x < width; x += borderStep) {
    addBorder(x);
    addBorder((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += borderStep) {
    addBorder(y * width);
    addBorder(y * width + width - 1);
  }
  if (borderSamples.length < 4) return false;

  // Robust border colour: per-channel median resists logos that touch one edge.
  const medianChannel = channel => {
    const values = borderSamples.map(sample => sample[channel]).sort((a, b) => a - b);
    return values[Math.floor(values.length / 2)];
  };
  const background = [medianChannel(0), medianChannel(1), medianChannel(2)];

  const bounds = bitmapFlattenContourBounds(hole);
  const minX = Math.max(0, Math.floor(bounds.minX));
  const minY = Math.max(0, Math.floor(bounds.minY));
  const maxX = Math.min(width - 1, Math.ceil(bounds.maxX));
  const maxY = Math.min(height - 1, Math.ceil(bounds.maxY));
  const boxArea = Math.max(1, (maxX - minX + 1) * (maxY - minY + 1));
  const step = Math.max(1, Math.floor(Math.sqrt(boxArea / 1200)));
  let samples = 0;
  let close = 0;
  let sumDistance = 0;
  const threshold = 42 + ((Number(result.settings?.noise) || 35) / 100) * 10;
  for (let y = minY; y <= maxY; y += step) {
    for (let x = minX; x <= maxX; x += step) {
      if (!bitmapFlattenPointInAnchorLoop({ x: x + 0.5, y: y + 0.5 }, anchors)) continue;
      const index = y * width + x;
      if (alpha[index] < 24) continue;
      const o = index * 4;
      const distance = Math.hypot(
        rgba[o] - background[0],
        rgba[o + 1] - background[1],
        rgba[o + 2] - background[2]
      );
      samples += 1;
      sumDistance += distance;
      if (distance <= threshold) close += 1;
    }
  }
  if (samples < 3) return false;
  const closeFraction = close / samples;
  const meanDistance = sumDistance / samples;
  return closeFraction >= 0.62 && meanDistance <= threshold * 1.12;
}

function bitmapFlattenForegroundComponentsFromHole(componentIds, componentState) {
  const foreground = new Set();
  for (const id of componentIds || []) {
    const component = componentState?.components?.[id];
    if (!component) continue;
    // A border-connected opaque component is treated as backing/negative-space
    // paint. It should remain visible through the owner's hole rather than be
    // inferred as an enclosed foreground object sitting above the owner.
    if (component.touchesBorder) continue;
    foreground.add(id);
  }
  return foreground;
}


function bitmapFlattenFlattenResidualLineWaves(nodes, settings = {}) {
  if (!Array.isArray(nodes) || !nodes.length) return nodes;
  const geometryScale = bitmapFlattenGeometryToleranceScale(settings);
  const detail = Math.max(0, Math.min(100, Number(settings.detail) || 70));
  const joinTolerance = (detail >= 85 ? 3.0 : detail >= 60 ? 3.8 : 4.6) * Math.PI / 180;
  const minLength = (detail >= 85 ? 6.5 : detail >= 60 ? 5.5 : 4.5) * geometryScale;
  const rmsLimit = (detail >= 85 ? 0.20 : detail >= 60 ? 0.28 : 0.36) * geometryScale;
  const maxDeviationLimit = (detail >= 85 ? 0.42 : detail >= 60 ? 0.56 : 0.72) * geometryScale;
  const maxShift = (detail >= 85 ? 0.65 : detail >= 60 ? 0.82 : 1.0) * geometryScale;

  const contours = [];
  for (const node of nodes) {
    if (node?.contour?.anchors?.length >= 3) contours.push(node.contour);
    for (const hole of node?.holes || []) if (hole?.anchors?.length >= 3) contours.push(hole);
  }

  for (const contour of contours) {
    const anchors = contour.anchors;
    const closed = contour.closed !== false;
    const count = anchors.length;
    if (count < 3) continue;
    const segmentCount = closed ? count : count - 1;
    const segments = [];
    for (let i = 0; i < segmentCount; i += 1) {
      const j = (i + 1) % count;
      const a = anchors[i], b = anchors[j];
      const vx = b.x - a.x, vy = b.y - a.y;
      const length = Math.hypot(vx, vy);
      let angle = Math.atan2(vy, vx);
      if (angle < 0) angle += Math.PI;
      if (angle >= Math.PI) angle -= Math.PI;
      segments.push({ i, j, length, angle });
    }

    let runs = [];
    let current = null;
    for (const segment of segments) {
      if (segment.length < 0.5 * geometryScale) {
        if (current) runs.push(current);
        current = null;
        continue;
      }
      if (!current) current = { segments: [segment] };
      else {
        const meanAngle = bitmapFlattenWeightedModuloPiMean(current.segments.map(seg => ({ angle: seg.angle, weight: seg.length })));
        if (bitmapFlattenAngleDistanceModuloPi(meanAngle, segment.angle) <= joinTolerance) current.segments.push(segment);
        else { runs.push(current); current = { segments: [segment] }; }
      }
    }
    if (current) runs.push(current);
    if (closed && runs.length > 1 && runs[0].segments[0].i === 0 && runs.at(-1).segments.at(-1).j === 0) {
      const a = bitmapFlattenWeightedModuloPiMean(runs[0].segments.map(seg => ({ angle: seg.angle, weight: seg.length })));
      const b = bitmapFlattenWeightedModuloPiMean(runs.at(-1).segments.map(seg => ({ angle: seg.angle, weight: seg.length })));
      if (bitmapFlattenAngleDistanceModuloPi(a, b) <= joinTolerance) {
        runs[0] = { segments: [...runs.at(-1).segments, ...runs[0].segments] };
        runs.pop();
      }
    }

    for (const run of runs) {
      const totalLength = run.segments.reduce((sum, seg) => sum + seg.length, 0);
      if (totalLength < minLength) continue;
      const samples = [];
      const runIndices = new Set();
      for (const seg of run.segments) {
        const a = anchors[seg.i], b = anchors[seg.j];
        runIndices.add(seg.i); runIndices.add(seg.j);
        const n = Math.max(4, Math.min(12, Math.ceil(seg.length / Math.max(1, 3 * geometryScale))));
        for (let k = 0; k <= n; k += 1) samples.push(bitmapFlattenCubicSample(a, b, k / n));
      }
      if (samples.length < 5) continue;
      const fit = bitmapFlattenFitTlsLine(samples);
      if (!fit || fit.rms > rmsLimit) continue;
      const nx = -fit.dy, ny = fit.dx;
      let maxDeviation = 0;
      for (const point of samples) {
        maxDeviation = Math.max(maxDeviation, Math.abs((point.x - fit.cx) * nx + (point.y - fit.cy) * ny));
      }
      if (maxDeviation > maxDeviationLimit) continue;

      // Reject shallow true arcs: the midpoint must not consistently bow to
      // one side of the fitted line. Raster wobble alternates around the line;
      // an intended arc has coherent signed sag.
      let positive = 0, negative = 0, signedSum = 0;
      for (const point of samples) {
        const d = (point.x - fit.cx) * nx + (point.y - fit.cy) * ny;
        signedSum += d;
        if (d > rmsLimit * 0.35) positive += 1;
        else if (d < -rmsLimit * 0.35) negative += 1;
      }
      const oneSidedFraction = Math.max(positive, negative) / Math.max(1, positive + negative);
      if (oneSidedFraction > 0.78 && Math.abs(signedSum / samples.length) > rmsLimit * 0.18) continue;

      // Curvature veto: a broad shallow arc can sit inside a narrow line
      // corridor while its tangent rotates steadily from one end to the other.
      // Measure tangent deviation relative to the fitted line and reject runs
      // with a coherent directional trend. Raster wobble tends to alternate
      // around zero rather than accumulate turn across the span.
      const tangentDeviations = [];
      for (let i = 1; i < samples.length; i += 1) {
        let vx = samples[i].x - samples[i - 1].x;
        let vy = samples[i].y - samples[i - 1].y;
        const vl = Math.hypot(vx, vy);
        if (vl < 1e-6) continue;
        vx /= vl; vy /= vl;
        let dot = vx * fit.dx + vy * fit.dy;
        let cross = fit.dx * vy - fit.dy * vx;
        if (dot < 0) { dot = -dot; cross = -cross; }
        tangentDeviations.push(Math.atan2(cross, Math.max(1e-9, dot)));
      }
      if (tangentDeviations.length >= 6) {
        const endWindow = Math.max(2, Math.floor(tangentDeviations.length * 0.22));
        const mean = values => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
        const startAngle = mean(tangentDeviations.slice(0, endWindow));
        const endAngle = mean(tangentDeviations.slice(-endWindow));
        const netTurn = Math.abs(endAngle - startAngle);
        const tangentRange = Math.max(...tangentDeviations) - Math.min(...tangentDeviations);
        const turnLimit = (detail >= 85 ? 1.35 : detail >= 60 ? 1.65 : 2.0) * Math.PI / 180;
        const rangeLimit = (detail >= 85 ? 2.2 : detail >= 60 ? 2.7 : 3.2) * Math.PI / 180;

        // Linear correlation of tangent angle with distance along the run.
        // Strong correlation means the tangent is progressively rotating,
        // which is characteristic of a real arc rather than edge noise.
        const n = tangentDeviations.length;
        const mx = (n - 1) / 2;
        const my = mean(tangentDeviations);
        let cov = 0, vxSum = 0, vySum = 0;
        for (let i = 0; i < n; i += 1) {
          const dx = i - mx;
          const dy = tangentDeviations[i] - my;
          cov += dx * dy;
          vxSum += dx * dx;
          vySum += dy * dy;
        }
        const correlation = cov / Math.sqrt(Math.max(1e-12, vxSum * vySum));
        if ((netTurn > turnLimit && Math.abs(correlation) > 0.52) ||
            (tangentRange > rangeLimit && netTurn > turnLimit * 0.75 && Math.abs(correlation) > 0.62)) continue;
      }

      // Refit the line offset from all rendered samples, then force every
      // anchor in the accepted run onto that exact line. This removes residual
      // bowing that angle-only alignment cannot fix.
      for (const index of runIndices) {
        const anchor = anchors[index];
        const signedDistance = (anchor.x - fit.cx) * nx + (anchor.y - fit.cy) * ny;
        let mx = -signedDistance * nx, my = -signedDistance * ny;
        const distance = Math.hypot(mx, my);
        if (distance > maxShift) { mx *= maxShift / distance; my *= maxShift / distance; }
        anchor.x += mx; anchor.y += my;
        anchor.inX += mx; anchor.inY += my;
        anchor.outX += mx; anchor.outY += my;
      }
      for (const seg of run.segments) {
        const a = anchors[seg.i], b = anchors[seg.j];
        a.outX = a.x; a.outY = a.y;
        b.inX = b.x; b.inY = b.y;
      }
    }
    contour.signedArea = bitmapFlattenAnchorLoopArea(anchors);
  }
  return nodes;
}

function bitmapFlattenGlobalAlignTraceNodes(nodes, settings = {}) {
  if (!Array.isArray(nodes) || !nodes.length) return nodes;
  const geometryScale = bitmapFlattenGeometryToleranceScale(settings);
  const detail = Math.max(0, Math.min(100, Number(settings.detail) || 70));
  const zeroTolerance = 0.07 * geometryScale;
  const joinTolerance = (detail >= 85 ? 2.0 : detail >= 60 ? 2.6 : 3.1) * Math.PI / 180;
  const minRunLength = (detail >= 85 ? 7 : detail >= 60 ? 6 : 5) * geometryScale;
  const clusterTolerance = (detail >= 85 ? 1.7 : detail >= 60 ? 2.2 : 2.7) * Math.PI / 180;
  const maxAngleCorrection = (detail >= 85 ? 1.8 : detail >= 60 ? 2.4 : 3.0) * Math.PI / 180;
  const maxShift = (detail >= 85 ? 0.55 : detail >= 60 ? 0.7 : 0.85) * geometryScale;

  const contours = [];
  for (const node of nodes) {
    if (node?.contour?.anchors?.length >= 3) contours.push(node.contour);
    for (const hole of node?.holes || []) if (hole?.anchors?.length >= 3) contours.push(hole);
  }
  if (!contours.length) return nodes;

  const allRuns = [];
  for (const contour of contours) {
    const anchors = contour.anchors;
    const closed = contour.closed !== false;
    const count = anchors.length;
    const segmentCount = closed ? count : count - 1;
    const segments = [];
    for (let i = 0; i < segmentCount; i += 1) {
      const j = (i + 1) % count;
      const a = anchors[i], b = anchors[j];
      const vx = b.x - a.x, vy = b.y - a.y;
      const length = Math.hypot(vx, vy);
      if (length < 1e-6) { segments.push({ i, j, length, straight: false, angle: 0 }); continue; }
      const straight = Math.hypot(a.outX - a.x, a.outY - a.y) <= zeroTolerance &&
        Math.hypot(b.inX - b.x, b.inY - b.y) <= zeroTolerance;
      let angle = Math.atan2(vy, vx);
      if (angle < 0) angle += Math.PI;
      if (angle >= Math.PI) angle -= Math.PI;
      segments.push({ i, j, length, straight, angle });
    }
    let runs = [];
    let current = null;
    for (const segment of segments) {
      if (!segment.straight) { if (current) runs.push(current); current = null; continue; }
      if (!current) current = { segments: [segment] };
      else {
        const prev = current.segments[current.segments.length - 1];
        if (bitmapFlattenAngleDistanceModuloPi(prev.angle, segment.angle) <= joinTolerance) current.segments.push(segment);
        else { runs.push(current); current = { segments: [segment] }; }
      }
    }
    if (current) runs.push(current);
    if (closed && runs.length > 1 && runs[0].segments[0].i === 0 && runs[runs.length - 1].segments.at(-1).j === 0) {
      const firstAngle = runs[0].segments[0].angle;
      const lastAngle = runs[runs.length - 1].segments.at(-1).angle;
      if (bitmapFlattenAngleDistanceModuloPi(firstAngle, lastAngle) <= joinTolerance) {
        runs[0] = { segments: [...runs[runs.length - 1].segments, ...runs[0].segments] };
        runs.pop();
      }
    }
    for (const run of runs) {
      const weight = run.segments.reduce((sum, seg) => sum + seg.length, 0);
      if (weight < minRunLength) continue;
      const unique = [];
      const seen = new Set();
      for (const seg of run.segments) {
        if (!seen.has(seg.i)) { unique.push(anchors[seg.i]); seen.add(seg.i); }
        if (!seen.has(seg.j)) { unique.push(anchors[seg.j]); seen.add(seg.j); }
      }
      const fit = bitmapFlattenFitTlsLine(unique.map(a => ({ x: a.x, y: a.y })));
      if (!fit) continue;
      const originalAngle = bitmapFlattenWeightedModuloPiMean(run.segments.map(seg => ({ angle: seg.angle, weight: seg.length })));
      if (bitmapFlattenAngleDistanceModuloPi(fit.angle, originalAngle) > 2.5 * Math.PI / 180) continue;
      allRuns.push({ ...run, contour, anchors, angle: fit.angle, cx: fit.cx, cy: fit.cy, dx: fit.dx, dy: fit.dy, weight, originalAngle });
    }
  }
  if (allRuns.length < 2) return nodes;

  const clusters = [];
  for (const run of [...allRuns].sort((a, b) => b.weight - a.weight)) {
    let cluster = clusters.find(c => bitmapFlattenAngleDistanceModuloPi(c.angle, run.angle) <= clusterTolerance);
    if (!cluster) {
      cluster = { runs: [], angle: run.angle, weight: 0 };
      clusters.push(cluster);
    }
    cluster.runs.push(run);
    cluster.weight += run.weight;
    cluster.angle = bitmapFlattenWeightedModuloPiMean(cluster.runs.map(r => ({ angle: r.angle, weight: r.weight })));
  }

  // Only promote genuinely global families: either repeated across multiple
  // contours/runs or one overwhelmingly long family. This avoids aligning
  // incidental short edges in organic artwork.
  const totalWeight = allRuns.reduce((sum, run) => sum + run.weight, 0) || 1;
  const strongClusters = clusters.filter(cluster => {
    const contourCount = new Set(cluster.runs.map(run => run.contour)).size;
    return cluster.runs.length >= 2 && (contourCount >= 2 || cluster.weight / totalWeight >= 0.18);
  });
  if (!strongClusters.length) return nodes;

  // Enforce relative perpendicularity between strong direction families while
  // preserving the artwork's overall rotation.
  for (let i = 0; i < strongClusters.length; i += 1) {
    for (let j = i + 1; j < strongClusters.length; j += 1) {
      const a = strongClusters[i], b = strongClusters[j];
      const delta = bitmapFlattenAngleDistanceModuloPi(a.angle, b.angle);
      const error = Math.abs(Math.PI / 2 - delta);
      if (error > 2.4 * Math.PI / 180) continue;
      const targetB = (a.angle + Math.PI / 2) % Math.PI;
      let signed = b.angle - targetB;
      while (signed > Math.PI / 2) signed -= Math.PI;
      while (signed < -Math.PI / 2) signed += Math.PI;
      const total = a.weight + b.weight;
      const correctionA = signed * (b.weight / total);
      a.angle = (a.angle + correctionA + Math.PI) % Math.PI;
      b.angle = (a.angle + Math.PI / 2) % Math.PI;
    }
  }

  const acceptedRuns = [];
  for (const cluster of strongClusters) {
    for (const run of cluster.runs) {
      const correction = bitmapFlattenAngleDistanceModuloPi(run.angle, cluster.angle);
      if (correction > maxAngleCorrection) continue;
      run.angle = cluster.angle;
      run.dx = Math.cos(run.angle);
      run.dy = Math.sin(run.angle);
      acceptedRuns.push(run);
    }
  }
  if (!acceptedRuns.length) return nodes;

  // Move anchors using per-contour line intersections/projections. Each line
  // keeps its own offset; only its orientation is shared globally.
  const byContour = new Map();
  for (const run of acceptedRuns) {
    if (!byContour.has(run.contour)) byContour.set(run.contour, []);
    byContour.get(run.contour).push(run);
  }
  for (const [contour, runs] of byContour) {
    const anchors = contour.anchors;
    const memberships = Array.from({ length: anchors.length }, () => []);
    for (const run of runs) {
      const seen = new Set();
      for (const segment of run.segments) { seen.add(segment.i); seen.add(segment.j); }
      for (const index of seen) memberships[index].push(run);
    }
    for (let i = 0; i < anchors.length; i += 1) {
      const related = memberships[i];
      if (!related.length) continue;
      const anchor = anchors[i];
      let target = null;
      if (related.length >= 2) {
        let bestPair = null, bestCross = 0;
        for (let a = 0; a < related.length; a += 1) {
          for (let b = a + 1; b < related.length; b += 1) {
            const cross = Math.abs(related[a].dx * related[b].dy - related[a].dy * related[b].dx);
            if (cross > bestCross) { bestCross = cross; bestPair = [related[a], related[b]]; }
          }
        }
        if (bestPair && bestCross > 0.25) target = bitmapFlattenLineIntersection(bestPair[0], bestPair[1]);
      }
      if (!target) {
        let sx = 0, sy = 0;
        for (const line of related) {
          const t = (anchor.x - line.cx) * line.dx + (anchor.y - line.cy) * line.dy;
          sx += line.cx + line.dx * t;
          sy += line.cy + line.dy * t;
        }
        target = { x: sx / related.length, y: sy / related.length };
      }
      let mx = target.x - anchor.x, my = target.y - anchor.y;
      const distance = Math.hypot(mx, my);
      if (!Number.isFinite(distance) || distance < 0.01) continue;
      if (distance > maxShift) { mx *= maxShift / distance; my *= maxShift / distance; }
      anchor.x += mx; anchor.y += my;
      anchor.inX += mx; anchor.inY += my;
      anchor.outX += mx; anchor.outY += my;
    }
    for (const run of runs) {
      for (const segment of run.segments) {
        const a = anchors[segment.i], b = anchors[segment.j];
        a.outX = a.x; a.outY = a.y;
        b.inX = b.x; b.inY = b.y;
      }
    }
    contour.signedArea = bitmapFlattenAnchorLoopArea(anchors);
  }
  return nodes;
}

function bitmapFlattenOrderTraceNodes(nodes) {
  if (nodes.length < 2) return nodes;
  const componentToNode = new Map();
  nodes.forEach((node, index) => {
    node.nodeIndex = index;
    if (node.componentId >= 0) componentToNode.set(node.componentId, index);
  });
  const edges = nodes.map(() => new Set());
  const incoming = nodes.map(() => new Set());
  nodes.forEach((node, from) => {
    for (const componentId of node.foreignComponentIds || []) {
      const to = componentToNode.get(componentId);
      if (to == null || to === from) continue;
      edges[from].add(to);
      incoming[to].add(from);
    }
    // Synthetic local fill islands replace former true holes. They have no
    // raster component of their own, so explicitly constrain them above the
    // surrounding owner component without moving the global background layer.
    if (Number.isInteger(node.forceAboveComponentId) && node.forceAboveComponentId >= 0) {
      const below = componentToNode.get(node.forceAboveComponentId);
      if (below != null && below !== from) {
        edges[below].add(from);
        incoming[from].add(below);
      }
    }
  });
  const indegree = incoming.map(set => set.size);
  const remaining = new Set(nodes.map((_, i) => i));
  const ordered = [];
  const fallback = (a, b) =>
    ((nodes[b].lockedStackArea ?? nodes[b].area) - (nodes[a].lockedStackArea ?? nodes[a].area)) ||
    (nodes[a].paletteIndex - nodes[b].paletteIndex) || a - b;
  while (remaining.size) {
    let candidates = [...remaining].filter(i => indegree[i] === 0).sort(fallback);
    if (!candidates.length) candidates = [...remaining].sort(fallback);
    const next = candidates[0];
    remaining.delete(next);
    ordered.push(next);
    for (const to of edges[next]) if (remaining.has(to)) indegree[to] = Math.max(0, indegree[to] - 1);
  }
  return ordered.map((index, zIndex) => ({ ...nodes[index], inferredZIndex: zIndex, stackIncoming: incoming[index], stackOutgoing: edges[index] }));
}

function bitmapFlattenInferComponentStack(result, preparedComponents) {
  if (!Array.isArray(preparedComponents) || preparedComponents.length < 2) return preparedComponents || [];
  const width = result.width;
  const height = result.height;
  const size = width * height;

  // Pixel ownership lets an enclosed complement identify the exact foreign
  // connected component, rather than collapsing every occurrence of a colour
  // into one z-order node.
  const pixelOwner = new Int32Array(size);
  pixelOwner.fill(-1);
  preparedComponents.forEach((prepared, componentIndex) => {
    const mask = prepared.regionMask.mask;
    for (let i = 0; i < size; i += 1) if (mask[i]) pixelOwner[i] = componentIndex;
  });

  // A -> B means component A should be below component B.
  const edgeWeights = Array.from({ length: preparedComponents.length }, () => new Map());
  for (let ownerIndex = 0; ownerIndex < preparedComponents.length; ownerIndex += 1) {
    const ownMask = preparedComponents[ownerIndex].regionMask.mask;
    const visited = new Uint8Array(size);
    const queue = new Int32Array(size);
    for (let start = 0; start < size; start += 1) {
      if (ownMask[start] || visited[start]) continue;
      let head = 0, tail = 0;
      queue[tail++] = start;
      visited[start] = 1;
      let touchesBorder = false;
      const foreignCounts = new Map();
      let foreignTotal = 0;
      while (head < tail) {
        const index = queue[head++];
        const x = index % width;
        const y = Math.floor(index / width);
        if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesBorder = true;
        const foreignIndex = pixelOwner[index];
        if (foreignIndex >= 0 && foreignIndex !== ownerIndex) {
          foreignCounts.set(foreignIndex, (foreignCounts.get(foreignIndex) || 0) + 1);
          foreignTotal += 1;
        }
        if (x > 0) { const n=index-1; if(!ownMask[n]&&!visited[n]){visited[n]=1;queue[tail++]=n;} }
        if (x + 1 < width) { const n=index+1; if(!ownMask[n]&&!visited[n]){visited[n]=1;queue[tail++]=n;} }
        if (y > 0) { const n=index-width; if(!ownMask[n]&&!visited[n]){visited[n]=1;queue[tail++]=n;} }
        if (y + 1 < height) { const n=index+width; if(!ownMask[n]&&!visited[n]){visited[n]=1;queue[tail++]=n;} }
      }
      if (touchesBorder || foreignTotal < 1) continue;
      const minEvidence = Math.max(1, Math.round(foreignTotal * 0.005));
      for (const [foreignIndex, count] of foreignCounts) {
        if (count < minEvidence) continue;
        edgeWeights[ownerIndex].set(foreignIndex, (edgeWeights[ownerIndex].get(foreignIndex) || 0) + count);
      }
    }
  }

  // Remove pairwise contradictions. Quantisation around thin boundaries can
  // generate evidence in both directions; only retain a materially stronger cue.
  for (let a = 0; a < edgeWeights.length; a += 1) {
    for (const [b, ab] of [...edgeWeights[a]]) {
      const ba = edgeWeights[b]?.get(a) || 0;
      if (!ba) continue;
      if (ab >= ba * 1.2) edgeWeights[b].delete(a);
      else if (ba >= ab * 1.2) edgeWeights[a].delete(b);
      else { edgeWeights[a].delete(b); edgeWeights[b].delete(a); }
    }
  }

  const indegree = new Array(preparedComponents.length).fill(0);
  edgeWeights.forEach(edges => edges.forEach((_, to) => { indegree[to] += 1; }));
  const remaining = new Set(preparedComponents.map((_, i) => i));
  const ordered = [];
  const fallbackCompare = (a, b) => {
    const areaA = preparedComponents[a].regionMask.pixelCount || 0;
    const areaB = preparedComponents[b].regionMask.pixelCount || 0;
    // Larger components are more likely to be supporting/base paint when no
    // direct occlusion clue exists. Stable palette/component order breaks ties.
    return areaB - areaA ||
      preparedComponents[a].region.paletteIndex - preparedComponents[b].region.paletteIndex ||
      (preparedComponents[a].region.componentIndex || 0) - (preparedComponents[b].region.componentIndex || 0);
  };

  while (remaining.size) {
    let candidates = [...remaining].filter(i => indegree[i] === 0).sort(fallbackCompare);
    if (!candidates.length) {
      // Break a noisy cycle at the node with the weakest incoming evidence.
      candidates = [...remaining].sort((a, b) => {
        const incoming = node => {
          let total = 0;
          for (const from of remaining) total += edgeWeights[from]?.get(node) || 0;
          return total;
        };
        return incoming(a) - incoming(b) || fallbackCompare(a, b);
      });
    }
    const next = candidates[0];
    remaining.delete(next);
    ordered.push(next);
    edgeWeights[next].forEach((_, to) => {
      if (remaining.has(to)) indegree[to] = Math.max(0, indegree[to] - 1);
    });
  }

  return ordered.map((index, zIndex) => ({
    ...preparedComponents[index],
    inferredZIndex: zIndex
  }));
}


function bitmapFlattenCountMaskIslands(mask, width, height) {
  if (!mask || !width || !height) return 0;
  const size = width * height;
  const visited = new Uint8Array(size);
  const queue = new Int32Array(size);
  let islands = 0;
  for (let start = 0; start < size; start += 1) {
    if (!mask[start] || visited[start]) continue;
    islands += 1;
    let head = 0, tail = 0;
    queue[tail++] = start;
    visited[start] = 1;
    while (head < tail) {
      const index = queue[head++];
      const x = index % width;
      const y = Math.floor(index / width);
      if (x > 0) { const n = index - 1; if (mask[n] && !visited[n]) { visited[n] = 1; queue[tail++] = n; } }
      if (x + 1 < width) { const n = index + 1; if (mask[n] && !visited[n]) { visited[n] = 1; queue[tail++] = n; } }
      if (y > 0) { const n = index - width; if (mask[n] && !visited[n]) { visited[n] = 1; queue[tail++] = n; } }
      if (y + 1 < height) { const n = index + width; if (mask[n] && !visited[n]) { visited[n] = 1; queue[tail++] = n; } }
    }
  }
  return islands;
}

function bitmapFlattenIslandCountForResult(result) {
  if (!result) return 0;
  const minArea = bitmapFlattenMinimumTraceArea(result.settings || {});
  const analysis = bitmapFlattenImageAnalysis(result);
  const useLogoMode = bitmapFlattenShouldUseLogoMode(result, analysis);

  if (result?.settings?.paint === "gradient") {
    const foreground = bitmapFlattenGradientForegroundMask(result);
    const maskData = foreground.canvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, result.width, result.height).data;
    const mask = new Uint8Array(result.width * result.height);
    for (let i = 0; i < mask.length; i += 1) mask[i] = maskData[i * 4] < 128 ? 1 : 0;
    return bitmapFlattenCountMaskIslands(bitmapFlattenFilterMaskByArea(mask, result.width, result.height, minArea), result.width, result.height);
  }

  if (useLogoMode) {
    const logo = bitmapFlattenLogoMask(result, analysis);
    const maskData = logo.canvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, result.width, result.height).data;
    const mask = new Uint8Array(result.width * result.height);
    for (let i = 0; i < mask.length; i += 1) mask[i] = maskData[i * 4] < 128 ? 1 : 0;
    return bitmapFlattenCountMaskIslands(bitmapFlattenFilterMaskByArea(mask, result.width, result.height, minArea), result.width, result.height);
  }

  let total = 0;
  for (const region of bitmapFlattenPaletteRegions(result)) {
    const prepared = bitmapFlattenPreparedColourMask(result, region.paletteIndex);
    const kept = bitmapFlattenFilterMaskByArea(prepared.mask, result.width, result.height, minArea);
    total += bitmapFlattenCountMaskIslands(kept, result.width, result.height);
  }
  return total;
}

function bitmapFlattenPreviewCanvas(result) {
  const preview = document.createElement("canvas");
  preview.width = result.width;
  preview.height = result.height;
  const ctx = preview.getContext("2d", { willReadFrequently: true });
  const image = ctx.createImageData(result.width, result.height);
  const minArea = bitmapFlattenMinimumTraceArea(result.settings || {});
  const analysis = bitmapFlattenImageAnalysis(result);
  const useLogoMode = bitmapFlattenShouldUseLogoMode(result, analysis);

  if (result?.settings?.paint === "gradient") {
    const foreground = bitmapFlattenGradientForegroundMask(result);
    const maskData = foreground.canvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, result.width, result.height).data;
    const mask = new Uint8Array(result.width * result.height);
    for (let i = 0; i < mask.length; i += 1) mask[i] = maskData[i * 4] < 128 ? 1 : 0;
    const kept = bitmapFlattenFilterMaskByArea(mask, result.width, result.height, minArea);
    for (let i = 0; i < kept.length; i += 1) {
      if (!kept[i] || result.alpha[i] <= 8) continue;
      const src = i * 4;
      image.data[src] = result.rgba[src];
      image.data[src + 1] = result.rgba[src + 1];
      image.data[src + 2] = result.rgba[src + 2];
      image.data[src + 3] = result.rgba[src + 3];
    }
    ctx.putImageData(image, 0, 0);
    return preview;
  }

  if (useLogoMode) {
    const logo = bitmapFlattenLogoMask(result, analysis);
    const maskData = logo.canvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, result.width, result.height).data;
    const mask = new Uint8Array(result.width * result.height);
    for (let i = 0; i < mask.length; i += 1) mask[i] = maskData[i * 4] < 128 ? 1 : 0;
    const kept = bitmapFlattenFilterMaskByArea(mask, result.width, result.height, minArea);
    const fill = logo.fill || [0, 0, 0];
    for (let i = 0; i < kept.length; i += 1) {
      if (!kept[i]) continue;
      const dst = i * 4;
      image.data[dst] = Math.round(fill[0]);
      image.data[dst + 1] = Math.round(fill[1]);
      image.data[dst + 2] = Math.round(fill[2]);
      image.data[dst + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    return preview;
  }

  const paletteRegions = bitmapFlattenPaletteRegions(result);
  for (const region of paletteRegions) {
    const regionMask = bitmapFlattenPreparedColourMask(result, region.paletteIndex);
    const kept = bitmapFlattenFilterMaskByArea(regionMask.mask, result.width, result.height, minArea);
    const color = region.color || [0, 0, 0];
    for (let i = 0; i < kept.length; i += 1) {
      if (!kept[i]) continue;
      const dst = i * 4;
      image.data[dst] = Math.round(color[0]);
      image.data[dst + 1] = Math.round(color[1]);
      image.data[dst + 2] = Math.round(color[2]);
      image.data[dst + 3] = result.alpha[i] > 8 ? result.alpha[i] : 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return preview;
}

function drawBitmapFlattenCanvas(target, source) {
  if (!target || !source) return;
  target.width = source.width;
  target.height = source.height;
  const context = target.getContext("2d");
  context.clearRect(0, 0, target.width, target.height);
  context.drawImage(source, 0, 0);
}

async function bitmapFlattenPreviewImageFromVector(group, source, maxDimension = 720) {
  const bounds = elementCanvasBounds(source);
  const rendered = await bitmapFlattenRasterizeForError(group, bounds, maxDimension, false);
  const canvas = document.createElement("canvas");
  canvas.width = rendered.width;
  canvas.height = rendered.height;
  canvas.getContext("2d").putImageData(rendered, 0, 0);
  return canvas;
}

function bitmapFlattenPreviewCacheKey(source) {
  return JSON.stringify({
    settings: bitmapFlattenSettings(),
    href: imageHref(source),
    x: source.getAttribute("x") || "0",
    y: source.getAttribute("y") || "0",
    width: source.getAttribute("width") || "",
    height: source.getAttribute("height") || "",
    tx: source.dataset.tx || "0",
    ty: source.dataset.ty || "0",
    rotation: source.dataset.rotation || "0",
    scaleX: source.dataset.scaleX || "1",
    scaleY: source.dataset.scaleY || "1"
  });
}

async function bitmapFlattenPrepareVectorMetadata(group, source) {
  const refineBounds = elementCanvasBounds(source);
  if (!source.id) source.id = `vectorizer-source-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  group.dataset.vectorizerSourceRef = source.id;
  group.dataset.vectorizerRefineBounds = [refineBounds.left, refineBounds.top, refineBounds.right, refineBounds.bottom].join(",");
  const naturalImage = await loadBrowserImage(imageHref(source));
  const displayedWidth = Math.max(1e-6, Number(source.getAttribute("width")) || (refineBounds.right - refineBounds.left));
  const displayedHeight = Math.max(1e-6, Number(source.getAttribute("height")) || (refineBounds.bottom - refineBounds.top));
  group.dataset.vectorizerSourcePixelX = String(displayedWidth / Math.max(1, naturalImage.naturalWidth || naturalImage.width || 1));
  group.dataset.vectorizerSourcePixelY = String(displayedHeight / Math.max(1, naturalImage.naturalHeight || naturalImage.height || 1));
  return refineBounds;
}

async function scheduleBitmapFlattenPreview(immediate = false) {
  if (!bitmapFlattenSourceElement) return;
  if (bitmapFlattenPreviewTimer) clearTimeout(bitmapFlattenPreviewTimer);
  const token = ++bitmapFlattenPreviewToken;
  const run = async () => {
    const source = bitmapFlattenSourceElement;
    syncBitmapFlattenLabels();
    bitmapFlattenFinalPreviewCache = null;
    if (bitmapFlattenStatus) bitmapFlattenStatus.textContent = "Building final-quality vector preview…";
    setBitmapFlattenProgress(12, true);
    if (applyBitmapFlattenButton) applyBitmapFlattenButton.disabled = true;
    try {
      // Preview and Create deliberately share the exact same final-resolution
      // vector. This prevents the low-resolution preview / high-resolution
      // final retrace divergence that previously made Create look worse.
      const result = await bitmapFlattenProcess(source, bitmapFlattenFinalTraceDimension());
      if (token !== bitmapFlattenPreviewToken) return;
      bitmapFlattenLastResult = result;
      setBitmapFlattenProgress(48, true);
      const vectorized = await bitmapFlattenVectorGroup(source, result);
      if (token !== bitmapFlattenPreviewToken) return;
      await bitmapFlattenPrepareVectorMetadata(vectorized.group, source);
      setBitmapFlattenProgress(76, true);

      let refinement = null;
      if (result.settings?.mode === "reconstruct") {
        if (bitmapFlattenStatus) bitmapFlattenStatus.textContent = "Refining final preview against the original raster…";
        setBitmapFlattenProgress(84, true);
        refinement = await bitmapFlattenRefineGroupReconstruction(vectorized.group, source, { record: false, updateUi: false });
        if (token !== bitmapFlattenPreviewToken) return;
      }

      setBitmapFlattenProgress(94, true);
      const previewCanvas = await bitmapFlattenPreviewImageFromVector(vectorized.group, source, 720);
      if (token !== bitmapFlattenPreviewToken) return;
      drawBitmapFlattenCanvas(bitmapFlattenBefore, result.sourceCanvas);
      drawBitmapFlattenCanvas(bitmapFlattenAfter, previewCanvas);

      const paletteRegions = bitmapFlattenPaletteRegions(result);
      const islandCount = vectorized.created || bitmapFlattenIslandCountForResult(result);
      if (bitmapFlattenIslandCount) bitmapFlattenIslandCount.value = String(islandCount);
      const modeLabel = vectorized.mode === "gradient"
        ? "Gradient vector"
        : vectorized.mode === "logo"
          ? "Logo silhouette"
          : vectorized.mode === "reconstruct"
            ? `Reconstruction • ${vectorized.primitiveCreated || 0} primitive • ${vectorized.hybridCreated || 0} hybrid • ${vectorized.tracedCreated || 0} traced`
            : `${paletteRegions.length} colour region${paletteRegions.length === 1 ? "" : "s"}`;
      bitmapFlattenFinalPreviewCache = {
        key: bitmapFlattenPreviewCacheKey(source),
        source,
        result,
        vectorized,
        refinement
      };
      if (bitmapFlattenStatus) bitmapFlattenStatus.textContent = `${modeLabel} • ${islandCount} island${islandCount === 1 ? "" : "s"} • FINAL preview — Create uses this exact vector`;
      setBitmapFlattenProgress(100, false);
      setTimeout(() => { if (token === bitmapFlattenPreviewToken) hideBitmapFlattenProgress(); }, 420);
      if (applyBitmapFlattenButton) applyBitmapFlattenButton.disabled = false;
    } catch (error) {
      console.error(error);
      if (token !== bitmapFlattenPreviewToken) return;
      bitmapFlattenFinalPreviewCache = null;
      if (bitmapFlattenStatus) bitmapFlattenStatus.textContent = error.message || "Could not vectorize this bitmap.";
      hideBitmapFlattenProgress();
      if (applyBitmapFlattenButton) applyBitmapFlattenButton.disabled = false;
    }
  };
  if (immediate) await run();
  else bitmapFlattenPreviewTimer = setTimeout(run, 300);
}


function bitmapFlattenLuminance(r, g, b) {
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

function bitmapFlattenOtsuThreshold(result) {
  const histogram = new Uint32Array(256);
  let total = 0;
  for (let i = 0; i < result.alpha.length; i += 1) {
    if (result.alpha[i] < 16) continue;
    const offset = i * 4;
    const lum = Math.max(0, Math.min(255, Math.round(bitmapFlattenLuminance(result.rgba[offset], result.rgba[offset + 1], result.rgba[offset + 2]))));
    histogram[lum] += 1;
    total += 1;
  }
  if (!total) return 128;
  let sum = 0;
  for (let i = 0; i < 256; i += 1) sum += i * histogram[i];
  let sumBackground = 0;
  let weightBackground = 0;
  let bestVariance = -1;
  let threshold = 128;
  for (let t = 0; t < 256; t += 1) {
    weightBackground += histogram[t];
    if (!weightBackground) continue;
    const weightForeground = total - weightBackground;
    if (!weightForeground) break;
    sumBackground += t * histogram[t];
    const meanBackground = sumBackground / weightBackground;
    const meanForeground = (sum - sumBackground) / weightForeground;
    const variance = weightBackground * weightForeground * (meanBackground - meanForeground) ** 2;
    if (variance > bestVariance) {
      bestVariance = variance;
      threshold = t;
    }
  }
  return threshold;
}

function bitmapFlattenBorderLuminance(result) {
  const values = [];
  const push = index => {
    if (result.alpha[index] < 16) return;
    const offset = index * 4;
    values.push(bitmapFlattenLuminance(result.rgba[offset], result.rgba[offset + 1], result.rgba[offset + 2]));
  };
  for (let x = 0; x < result.width; x += 1) {
    push(x);
    push((result.height - 1) * result.width + x);
  }
  for (let y = 1; y < result.height - 1; y += 1) {
    push(y * result.width);
    push(y * result.width + result.width - 1);
  }
  if (!values.length) return 255;
  values.sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)];
}

function bitmapFlattenImageAnalysis(result) {
  let opaque = 0;
  let transparent = 0;
  let colorful = 0;
  let saturationSum = 0;
  const stride = Math.max(1, Math.floor(result.alpha.length / 20000));
  for (let i = 0; i < result.alpha.length; i += stride) {
    const a = result.alpha[i];
    if (a < 16) {
      transparent += 1;
      continue;
    }
    opaque += 1;
    const offset = i * 4;
    const r = result.rgba[offset];
    const g = result.rgba[offset + 1];
    const b = result.rgba[offset + 2];
    const saturation = Math.max(r, g, b) - Math.min(r, g, b);
    saturationSum += saturation;
    if (saturation > 28) colorful += 1;
  }
  const sampled = opaque + transparent || 1;
  const colorfulFraction = colorful / Math.max(1, opaque);
  const averageSaturation = saturationSum / Math.max(1, opaque);
  const transparentFraction = transparent / sampled;
  const monochrome = colorfulFraction < 0.08 && averageSaturation < 18;
  return {
    monochrome,
    transparentFraction,
    threshold: bitmapFlattenOtsuThreshold(result),
    borderLuminance: bitmapFlattenBorderLuminance(result)
  };
}

function bitmapFlattenLogoMask(result, analysis) {
  const canvas = document.createElement("canvas");
  canvas.width = result.width;
  canvas.height = result.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const image = context.createImageData(result.width, result.height);
  const foregroundColors = [];
  const useAlpha = analysis.transparentFraction > 0.02;
  const darkForeground = analysis.borderLuminance >= analysis.threshold;
  for (let i = 0; i < result.alpha.length; i += 1) {
    const offset = i * 4;
    const alpha = result.alpha[i];
    const lum = bitmapFlattenLuminance(result.rgba[offset], result.rgba[offset + 1], result.rgba[offset + 2]);
    const on = useAlpha
      ? alpha >= 24
      : alpha >= 16 && (darkForeground ? lum <= analysis.threshold : lum >= analysis.threshold);
    const value = on ? 0 : 255;
    image.data[offset] = value;
    image.data[offset + 1] = value;
    image.data[offset + 2] = value;
    image.data[offset + 3] = 255;
    if (on && foregroundColors.length < 12000) foregroundColors.push([result.rgba[offset], result.rgba[offset + 1], result.rgba[offset + 2]]);
  }
  context.putImageData(image, 0, 0);
  let fill = [0, 0, 0];
  if (foregroundColors.length) {
    const sums = foregroundColors.reduce((acc, color) => [acc[0] + color[0], acc[1] + color[1], acc[2] + color[2]], [0, 0, 0]);
    fill = sums.map(value => value / foregroundColors.length);
  }
  return { canvas, fill };
}


function bitmapFlattenGradientForegroundMask(result) {
  const canvas = document.createElement("canvas");
  canvas.width = result.width;
  canvas.height = result.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const image = ctx.createImageData(result.width, result.height);

  const analysis = bitmapFlattenImageAnalysis(result);
  const useAlpha = analysis.transparentFraction > 0.02;
  const borderSamples = [];
  const collect = index => {
    if (result.alpha[index] < 16) return;
    const o = index * 4;
    borderSamples.push([result.rgba[o], result.rgba[o + 1], result.rgba[o + 2]]);
  };
  for (let x = 0; x < result.width; x += Math.max(1, Math.floor(result.width / 80))) {
    collect(x);
    collect((result.height - 1) * result.width + x);
  }
  for (let y = 0; y < result.height; y += Math.max(1, Math.floor(result.height / 80))) {
    collect(y * result.width);
    collect(y * result.width + result.width - 1);
  }
  let bg = [255, 255, 255];
  if (borderSamples.length) {
    const sums = borderSamples.reduce((a,c)=>[a[0]+c[0],a[1]+c[1],a[2]+c[2]],[0,0,0]);
    bg = sums.map(v=>v/borderSamples.length);
  }

  const threshold = 34 + ((result.settings?.noise ?? 35) / 100) * 24;
  let count = 0;
  for (let i = 0; i < result.alpha.length; i += 1) {
    const o = i * 4;
    const alpha = result.alpha[i];
    const colorDistance = Math.sqrt(
      (result.rgba[o]-bg[0])**2 +
      (result.rgba[o+1]-bg[1])**2 +
      (result.rgba[o+2]-bg[2])**2
    );
    const on = useAlpha ? alpha >= 24 : alpha >= 16 && colorDistance >= threshold;
    const v = on ? 0 : 255;
    image.data[o] = image.data[o+1] = image.data[o+2] = v;
    image.data[o+3] = 255;
    if (on) count += 1;
  }
  ctx.putImageData(image,0,0);
  return { canvas, count, useAlpha, background:bg };
}

function bitmapFlattenLinearGradientAnalysis(result, maskCanvas) {
  const ctx = maskCanvas.getContext("2d", { willReadFrequently: true });
  const mask = ctx.getImageData(0, 0, result.width, result.height).data;
  const samples = [];
  const pixelCount = result.width * result.height;
  const stride = Math.max(1, Math.floor(pixelCount / 36000));

  const srgbToLinear = value => {
    const c = Math.max(0, Math.min(1, value / 255));
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const rgbToOklab = (r, g, b) => {
    const R = srgbToLinear(r), G = srgbToLinear(g), B = srgbToLinear(b);
    const l = 0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B;
    const m = 0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B;
    const ss = 0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B;
    const l3 = Math.cbrt(l), m3 = Math.cbrt(m), s3 = Math.cbrt(ss);
    return [
      0.2104542553 * l3 + 0.7936177850 * m3 - 0.0040720468 * s3,
      1.9779984951 * l3 - 2.4285922050 * m3 + 0.4505937099 * s3,
      0.0259040371 * l3 + 0.7827717662 * m3 - 0.8086757660 * s3
    ];
  };
  const labDistance2 = (p, q) => {
    const dl = p[0] - q[0], da = p[1] - q[1], db = p[2] - q[2];
    return dl * dl + da * da + db * db;
  };
  const rgbDistance = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
  const interpolate = (p, q, t) => [
    p[0] + (q[0] - p[0]) * t,
    p[1] + (q[1] - p[1]) * t,
    p[2] + (q[2] - p[2]) * t
  ];

  const isInterior = (x, y) => {
    if (x < 2 || y < 2 || x >= result.width - 2 || y >= result.height - 2) return false;
    for (let d = -2; d <= 2; d += 1) {
      if (mask[((y * result.width) + x + d) * 4] > 127) return false;
      if (mask[(((y + d) * result.width) + x) * 4] > 127) return false;
    }
    return true;
  };

  const collectSamples = interiorOnly => {
    samples.length = 0;
    for (let i = 0; i < pixelCount; i += stride) {
      if (mask[i * 4] > 127 || result.alpha[i] < 24) continue;
      const x = i % result.width, y = Math.floor(i / result.width);
      if (interiorOnly && !isInterior(x, y)) continue;
      const o = i * 4;
      const r = result.rgba[o], g = result.rgba[o + 1], b = result.rgba[o + 2];
      samples.push({ x, y, r, g, b, lab: rgbToOklab(r, g, b) });
    }
  };
  collectSamples(true);
  if (samples.length < 32) collectSamples(false);
  if (samples.length < 20) return null;

  let mx = 0, my = 0, meanLab = [0, 0, 0];
  for (const p of samples) {
    mx += p.x; my += p.y;
    meanLab[0] += p.lab[0]; meanLab[1] += p.lab[1]; meanLab[2] += p.lab[2];
  }
  mx /= samples.length; my /= samples.length;
  meanLab = meanLab.map(v => v / samples.length);
  let flatError = 0;
  for (const p of samples) flatError += labDistance2(p.lab, meanLab);
  if (flatError < 1e-7) return null;

  const scoreAngle = angle => {
    const ax = Math.cos(angle), ay = Math.sin(angle);
    let min = Infinity, max = -Infinity;
    for (const p of samples) {
      const t = (p.x - mx) * ax + (p.y - my) * ay;
      if (t < min) min = t;
      if (t > max) max = t;
    }
    const span = max - min;
    if (span < 1e-6) return { score: -Infinity, angle, ax, ay };
    const bins = 28;
    const sums = Array.from({ length: bins }, () => [0, 0, 0, 0]);
    for (const p of samples) {
      const t = (p.x - mx) * ax + (p.y - my) * ay;
      const bi = Math.max(0, Math.min(bins - 1, Math.floor(((t - min) / span) * bins)));
      const s = sums[bi];
      s[0] += p.lab[0]; s[1] += p.lab[1]; s[2] += p.lab[2]; s[3] += 1;
    }
    let explained = 0;
    for (const s of sums) {
      if (!s[3]) continue;
      const avg = [s[0] / s[3], s[1] / s[3], s[2] / s[3]];
      explained += s[3] * labDistance2(avg, meanLab);
    }
    return { score: explained / flatError, angle, ax, ay };
  };

  let best = { score: -Infinity, angle: 0, ax: 1, ay: 0 };
  const coarseSteps = 48;
  for (let i = 0; i < coarseSteps; i += 1) {
    const candidate = scoreAngle(i * Math.PI / coarseSteps);
    if (candidate.score > best.score) best = candidate;
  }
  const coarseStep = Math.PI / coarseSteps;
  for (let pass = 0; pass < 3; pass += 1) {
    const radius = coarseStep / (4 ** (pass + 1));
    for (let k = -4; k <= 4; k += 1) {
      const candidate = scoreAngle(best.angle + k * radius);
      if (candidate.score > best.score) best = candidate;
    }
  }
  if (!Number.isFinite(best.score) || best.score < 0.18) return null;
  let { angle, ax, ay } = best;

  const projections = [];
  for (const p of samples) {
    p.t = (p.x - mx) * ax + (p.y - my) * ay;
    projections.push(p.t);
  }
  projections.sort((u, v) => u - v);
  const percentile = q => projections[Math.max(0, Math.min(projections.length - 1, Math.round((projections.length - 1) * q)))];
  let min = percentile(0.0025), max = percentile(0.9975);
  if (!(max > min + 1e-6)) return null;

  const profileBins = Math.max(48, Math.min(96, Math.round(Math.sqrt(samples.length) * 0.7)));
  const buckets = Array.from({ length: profileBins }, () => []);
  for (const p of samples) {
    const u = Math.max(0, Math.min(0.999999, (p.t - min) / (max - min)));
    buckets[Math.floor(u * profileBins)].push(p);
  }
  const trimmedMean = (bucket, channel) => {
    const vals = bucket.map(p => channel(p)).sort((a, b) => a - b);
    const trim = vals.length >= 10 ? Math.floor(vals.length * 0.12) : 0;
    const lo = trim, hi = vals.length - trim;
    let sum = 0;
    for (let i = lo; i < hi; i += 1) sum += vals[i];
    return sum / Math.max(1, hi - lo);
  };
  const profile = [];
  for (let i = 0; i < profileBins; i += 1) {
    const bucket = buckets[i];
    if (!bucket.length) continue;
    const rgb = [
      trimmedMean(bucket, p => p.r),
      trimmedMean(bucket, p => p.g),
      trimmedMean(bucket, p => p.b)
    ];
    profile.push({ offset: (i + 0.5) / profileBins, rgb, lab: rgbToOklab(rgb[0], rgb[1], rgb[2]) });
  }
  if (profile.length < 2) return null;

  const tailColor = (lo, hi) => {
    const pts = samples.filter(p => {
      const u = (p.t - min) / (max - min);
      return u >= lo && u <= hi;
    });
    if (!pts.length) return null;
    return [trimmedMean(pts, p => p.r), trimmedMean(pts, p => p.g), trimmedMean(pts, p => p.b)];
  };
  const leftTail = tailColor(-0.02, 0.018);
  const rightTail = tailColor(0.982, 1.02);
  if (leftTail) profile.unshift({ offset: 0, rgb: leftTail, lab: rgbToOklab(...leftTail) });
  if (rightTail) profile.push({ offset: 1, rgb: rightTail, lab: rgbToOklab(...rightTail) });

  const keep = new Set([0, profile.length - 1]);
  const baseTolerance = 0.014 + ((result.settings?.noise ?? 35) / 100) * 0.010;
  const simplify = (lo, hi) => {
    if (hi <= lo + 1 || keep.size >= 16) return;
    const span = profile[hi].offset - profile[lo].offset || 1;
    let worst = -1, worstError = 0;
    for (let i = lo + 1; i < hi; i += 1) {
      const t = (profile[i].offset - profile[lo].offset) / span;
      const expected = interpolate(profile[lo].lab, profile[hi].lab, t);
      const perceptual = Math.sqrt(labDistance2(profile[i].lab, expected));
      const chroma = Math.hypot(profile[i].lab[1], profile[i].lab[2]);
      const weighted = perceptual * (1 + Math.min(0.65, chroma * 2.2));
      if (weighted > worstError) { worstError = weighted; worst = i; }
    }
    if (worst >= 0 && worstError > baseTolerance) {
      keep.add(worst);
      simplify(lo, worst);
      simplify(worst, hi);
    }
  };
  simplify(0, profile.length - 1);

  const velocities = [];
  for (let i = 1; i < profile.length; i += 1) {
    const du = Math.max(1e-5, profile[i].offset - profile[i - 1].offset);
    velocities.push({ i, v: Math.sqrt(labDistance2(profile[i].lab, profile[i - 1].lab)) / du });
  }
  const sortedV = velocities.map(x => x.v).sort((a, b) => a - b);
  const velocityCut = sortedV.length ? sortedV[Math.floor(sortedV.length * 0.88)] : Infinity;
  for (const item of velocities) {
    if (keep.size >= 16) break;
    if (item.v >= velocityCut && item.v > 0.35) {
      keep.add(Math.max(0, item.i - 1));
      if (keep.size < 16) keep.add(item.i);
    }
  }

  const selected = [...keep].sort((u, v) => u - v).map(i => ({
    offset: profile[i].offset,
    rgb: profile[i].rgb,
    lab: profile[i].lab,
    color: bitmapFlattenPaletteHex(profile[i].rgb)
  }));
  if (selected.length < 2) return null;

  const predictLab = u => {
    if (u <= selected[0].offset) return selected[0].lab;
    if (u >= selected[selected.length - 1].offset) return selected[selected.length - 1].lab;
    for (let i = 0; i < selected.length - 1; i += 1) {
      const s0 = selected[i], s1 = selected[i + 1];
      if (u <= s1.offset) {
        const t = (u - s0.offset) / Math.max(1e-6, s1.offset - s0.offset);
        return interpolate(s0.lab, s1.lab, t);
      }
    }
    return selected[selected.length - 1].lab;
  };
  let gradientError = 0;
  for (const p of samples) {
    const u = Math.max(0, Math.min(1, (p.t - min) / (max - min)));
    gradientError += labDistance2(p.lab, predictLab(u));
  }
  const improvement = 1 - gradientError / Math.max(1e-9, flatError);
  const delta = rgbDistance(selected[0].rgb, selected[selected.length - 1].rgb);
  let perceptualRange = 0;
  for (let i = 1; i < selected.length; i += 1) {
    perceptualRange += Math.sqrt(labDistance2(selected[i - 1].lab, selected[i].lab));
  }
  if ((delta < 14 && perceptualRange < 0.09) || improvement < 0.30) return null;

  angle = Math.atan2(ay, ax);
  const x1 = mx + min * ax, y1 = my + min * ay;
  const x2 = mx + max * ax, y2 = my + max * ay;
  const firstOffset = selected[0].offset, lastOffset = selected[selected.length - 1].offset;
  const stops = selected.map(stop => ({
    offset: Math.max(0, Math.min(1, (stop.offset - firstOffset) / Math.max(1e-6, lastOffset - firstOffset))),
    color: stop.color
  }));
  stops[0].offset = 0;
  stops[stops.length - 1].offset = 1;

  return {
    type: "linear",
    angle: angle * 180 / Math.PI,
    x1, y1, x2, y2,
    stops,
    delta,
    improvement,
    fitError: gradientError / Math.max(1e-9, flatError),
    axisScore: best.score,
    perceptualRange,
    sampleCount: samples.length
  };
}

function bitmapFlattenRadialGradientAnalysis(result, maskCanvas) {
  const ctx = maskCanvas.getContext("2d", { willReadFrequently: true });
  const mask = ctx.getImageData(0, 0, result.width, result.height).data;
  const pixelCount = result.width * result.height;
  const stride = Math.max(1, Math.floor(pixelCount / 30000));
  const samples = [];

  const srgbToLinear = value => {
    const c = Math.max(0, Math.min(1, value / 255));
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const rgbToOklab = (r, g, b) => {
    const R = srgbToLinear(r), G = srgbToLinear(g), B = srgbToLinear(b);
    const l = 0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B;
    const m = 0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B;
    const ss = 0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B;
    const l3 = Math.cbrt(l), m3 = Math.cbrt(m), s3 = Math.cbrt(ss);
    return [
      0.2104542553 * l3 + 0.7936177850 * m3 - 0.0040720468 * s3,
      1.9779984951 * l3 - 2.4285922050 * m3 + 0.4505937099 * s3,
      0.0259040371 * l3 + 0.7827717662 * m3 - 0.8086757660 * s3
    ];
  };
  const labDistance2 = (a, b) => {
    const dl = a[0] - b[0], da = a[1] - b[1], db = a[2] - b[2];
    return dl * dl + da * da + db * db;
  };
  const interpolate = (a, b, t) => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t
  ];
  const isInterior = (x, y) => {
    if (x < 2 || y < 2 || x >= result.width - 2 || y >= result.height - 2) return false;
    for (let d = -2; d <= 2; d += 1) {
      if (mask[((y * result.width) + x + d) * 4] > 127) return false;
      if (mask[(((y + d) * result.width) + x) * 4] > 127) return false;
    }
    return true;
  };
  const collect = interiorOnly => {
    samples.length = 0;
    for (let i = 0; i < pixelCount; i += stride) {
      if (mask[i * 4] > 127 || result.alpha[i] < 24) continue;
      const x = i % result.width, y = Math.floor(i / result.width);
      if (interiorOnly && !isInterior(x, y)) continue;
      const o = i * 4;
      const r = result.rgba[o], g = result.rgba[o + 1], b = result.rgba[o + 2];
      samples.push({ x, y, r, g, b, lab: rgbToOklab(r, g, b) });
    }
  };
  collect(true);
  if (samples.length < 40) collect(false);
  if (samples.length < 24) return null;

  let meanLab = [0, 0, 0], mx = 0, my = 0;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of samples) {
    meanLab[0] += p.lab[0]; meanLab[1] += p.lab[1]; meanLab[2] += p.lab[2];
    mx += p.x; my += p.y;
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
  }
  meanLab = meanLab.map(v => v / samples.length);
  mx /= samples.length; my /= samples.length;
  let flatError = 0;
  for (const p of samples) flatError += labDistance2(p.lab, meanLab);
  if (flatError < 1e-7) return null;

  const scoreCenter = (cx, cy) => {
    let maxR = 0;
    for (const p of samples) maxR = Math.max(maxR, Math.hypot(p.x - cx, p.y - cy));
    if (maxR < 1e-6) return { score: -Infinity, cx, cy, maxR };
    const bins = 30;
    const sums = Array.from({ length: bins }, () => [0, 0, 0, 0]);
    for (const p of samples) {
      const r = Math.hypot(p.x - cx, p.y - cy);
      const bi = Math.max(0, Math.min(bins - 1, Math.floor((r / maxR) * bins)));
      const s = sums[bi];
      s[0] += p.lab[0]; s[1] += p.lab[1]; s[2] += p.lab[2]; s[3] += 1;
    }
    let explained = 0;
    for (const s of sums) {
      if (!s[3]) continue;
      const avg = [s[0] / s[3], s[1] / s[3], s[2] / s[3]];
      explained += s[3] * labDistance2(avg, meanLab);
    }
    return { score: explained / flatError, cx, cy, maxR };
  };

  let best = scoreCenter(mx, my);
  const spanX = Math.max(2, maxX - minX), spanY = Math.max(2, maxY - minY);
  const grid = 9;
  for (let gy = 0; gy < grid; gy += 1) {
    const cy = minY + (spanY * gy) / (grid - 1);
    for (let gx = 0; gx < grid; gx += 1) {
      const cx = minX + (spanX * gx) / (grid - 1);
      const candidate = scoreCenter(cx, cy);
      if (candidate.score > best.score) best = candidate;
    }
  }
  let stepX = spanX / (grid - 1), stepY = spanY / (grid - 1);
  for (let pass = 0; pass < 3; pass += 1) {
    stepX *= 0.4; stepY *= 0.4;
    const origin = { ...best };
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        const candidate = scoreCenter(origin.cx + dx * stepX, origin.cy + dy * stepY);
        if (candidate.score > best.score) best = candidate;
      }
    }
  }
  if (!Number.isFinite(best.score) || best.score < 0.26) return null;

  const radii = samples.map(p => Math.hypot(p.x - best.cx, p.y - best.cy)).sort((a, b) => a - b);
  const radius = radii[Math.max(0, Math.min(radii.length - 1, Math.round((radii.length - 1) * 0.9975)))];
  if (!(radius > 1e-6)) return null;
  const profileBins = Math.max(56, Math.min(112, Math.round(Math.sqrt(samples.length) * 0.85)));
  const buckets = Array.from({ length: profileBins }, () => []);
  for (const p of samples) {
    const u = Math.max(0, Math.min(0.999999, Math.hypot(p.x - best.cx, p.y - best.cy) / radius));
    buckets[Math.floor(u * profileBins)].push(p);
  }
  const trimmedMean = (bucket, channel) => {
    const vals = bucket.map(channel).sort((a, b) => a - b);
    const trim = vals.length >= 10 ? Math.floor(vals.length * 0.12) : 0;
    let sum = 0;
    for (let i = trim; i < vals.length - trim; i += 1) sum += vals[i];
    return sum / Math.max(1, vals.length - trim * 2);
  };
  const profile = [];
  for (let i = 0; i < profileBins; i += 1) {
    const bucket = buckets[i];
    if (!bucket.length) continue;
    const rgb = [trimmedMean(bucket, p => p.r), trimmedMean(bucket, p => p.g), trimmedMean(bucket, p => p.b)];
    profile.push({ offset: (i + 0.5) / profileBins, rgb, lab: rgbToOklab(...rgb) });
  }
  if (profile.length < 3) return null;
  if (profile[0].offset > 0.001) profile.unshift({ offset: 0, rgb: profile[0].rgb, lab: profile[0].lab });
  if (profile[profile.length - 1].offset < 0.999) {
    const tail = profile[profile.length - 1];
    profile.push({ offset: 1, rgb: tail.rgb, lab: tail.lab });
  }

  const keep = new Set([0, profile.length - 1]);
  const tolerance = 0.013 + ((result.settings?.noise ?? 35) / 100) * 0.009;
  const simplify = (lo, hi) => {
    if (hi <= lo + 1 || keep.size >= 20) return;
    const span = profile[hi].offset - profile[lo].offset || 1;
    let worst = -1, worstError = 0;
    for (let i = lo + 1; i < hi; i += 1) {
      const t = (profile[i].offset - profile[lo].offset) / span;
      const expected = interpolate(profile[lo].lab, profile[hi].lab, t);
      const error = Math.sqrt(labDistance2(profile[i].lab, expected));
      if (error > worstError) { worstError = error; worst = i; }
    }
    if (worst >= 0 && worstError > tolerance) {
      keep.add(worst); simplify(lo, worst); simplify(worst, hi);
    }
  };
  simplify(0, profile.length - 1);
  const selected = [...keep].sort((a, b) => a - b).map(i => ({
    offset: profile[i].offset,
    rgb: profile[i].rgb,
    lab: profile[i].lab,
    color: bitmapFlattenPaletteHex(profile[i].rgb)
  }));
  if (selected.length < 2) return null;
  const predictLab = u => {
    if (u <= selected[0].offset) return selected[0].lab;
    if (u >= selected[selected.length - 1].offset) return selected[selected.length - 1].lab;
    for (let i = 0; i < selected.length - 1; i += 1) {
      const a = selected[i], b = selected[i + 1];
      if (u <= b.offset) {
        const t = (u - a.offset) / Math.max(1e-6, b.offset - a.offset);
        return interpolate(a.lab, b.lab, t);
      }
    }
    return selected[selected.length - 1].lab;
  };
  let gradientError = 0;
  for (const p of samples) {
    const u = Math.max(0, Math.min(1, Math.hypot(p.x - best.cx, p.y - best.cy) / radius));
    gradientError += labDistance2(p.lab, predictLab(u));
  }
  const improvement = 1 - gradientError / Math.max(1e-9, flatError);
  let perceptualRange = 0;
  for (let i = 1; i < selected.length; i += 1) perceptualRange += Math.sqrt(labDistance2(selected[i - 1].lab, selected[i].lab));
  if (improvement < 0.34 || perceptualRange < 0.075) return null;

  const stops = selected.map(stop => ({ offset: Math.max(0, Math.min(1, stop.offset)), color: stop.color }));
  stops[0].offset = 0; stops[stops.length - 1].offset = 1;
  return {
    type: "radial",
    cx: best.cx,
    cy: best.cy,
    radius,
    centerXPercent: Math.max(-50, Math.min(150, (best.cx / Math.max(1, result.width)) * 100)),
    centerYPercent: Math.max(-50, Math.min(150, (best.cy / Math.max(1, result.height)) * 100)),
    radiusPercent: Math.max(1, Math.min(200, (radius / Math.max(1, Math.max(result.width, result.height))) * 100)),
    stops,
    improvement,
    fitError: gradientError / Math.max(1e-9, flatError),
    radialScore: best.score,
    perceptualRange,
    sampleCount: samples.length
  };
}

function bitmapFlattenGradientAnalysis(result, maskCanvas) {
  const linear = bitmapFlattenLinearGradientAnalysis(result, maskCanvas);
  const radial = bitmapFlattenRadialGradientAnalysis(result, maskCanvas);
  if (!linear) return radial;
  if (!radial) return linear;
  // Radial has an extra centre parameter, so require a meaningful fit win to
  // avoid classifying ordinary diagonal/linear ramps as very large-radius radials.
  const radialAdvantage = (linear.fitError || 1) - (radial.fitError || 1);
  return radialAdvantage > 0.055 && radial.improvement > linear.improvement + 0.035 ? radial : linear;
}

function bitmapFlattenApplyDetectedGradient(path, gradient) {
  if (!path || !gradient || gradient.stops.length < 2) return false;
  gradientCounter += 1;
  const id = `vs-gradient-bitmap-${gradientCounter}`;
  const isRadial = gradient.type === "radial";
  const def = document.createElementNS(SVG_NS, isRadial ? "radialGradient" : "linearGradient");
  def.id = id;
  def.setAttribute("gradientUnits", "userSpaceOnUse");
  if (isRadial) {
    def.setAttribute("cx", Number(gradient.cx).toFixed(3));
    def.setAttribute("cy", Number(gradient.cy).toFixed(3));
    def.setAttribute("r", Number(gradient.radius).toFixed(3));
    def.setAttribute("fx", Number(gradient.cx).toFixed(3));
    def.setAttribute("fy", Number(gradient.cy).toFixed(3));
  } else {
    def.setAttribute("x1", Number(gradient.x1).toFixed(3));
    def.setAttribute("y1", Number(gradient.y1).toFixed(3));
    def.setAttribute("x2", Number(gradient.x2).toFixed(3));
    def.setAttribute("y2", Number(gradient.y2).toFixed(3));
  }
  gradient.stops.forEach(stopData => {
    const stop = document.createElementNS(SVG_NS, "stop");
    stop.setAttribute("offset", `${(stopData.offset * 100).toFixed(2)}%`);
    stop.setAttribute("stop-color", stopData.color);
    def.appendChild(stop);
  });
  paintDefs.appendChild(def);
  path.dataset.gradientId = id;
  path.dataset.gradient = JSON.stringify(isRadial ? {
    type: "radial",
    angle: 0,
    startColor: gradient.stops[0].color,
    endColor: gradient.stops[gradient.stops.length - 1].color,
    startOffset: 0,
    endOffset: 100,
    centerX: gradient.centerXPercent ?? 50,
    centerY: gradient.centerYPercent ?? 50,
    radius: gradient.radiusPercent ?? 50
  } : {
    type: "linear",
    angle: gradient.angle,
    startColor: gradient.stops[0].color,
    endColor: gradient.stops[gradient.stops.length - 1].color,
    startOffset: 0,
    endOffset: 100,
    centerX: 50,
    centerY: 50,
    radius: 50
  });
  path.dataset.bitmapGradient = "true";
  path.dataset.bitmapGradientType = isRadial ? "radial" : "linear";
  path.dataset.bitmapGradientStops = JSON.stringify(gradient.stops);
  path.dataset.bitmapGradientFit = String(Number(gradient.improvement || 0).toFixed(4));
  path.setAttribute("fill", `url(#${id})`);
  return true;
}

async function bitmapFlattenGradientVectorGroup(source, result) {
  if (!bitmapFlattenPotraceReady()) throw new Error("Potrace failed to load; conversion was not attempted.");
  const mask=bitmapFlattenGradientForegroundMask(result);
  if(mask.count < 2) throw new Error("Could not isolate a gradient foreground region.");
  const gradient=bitmapFlattenGradientAnalysis(result,mask.canvas);
  if (!gradient) return null;
  const accurateTrace=await bitmapFlattenTraceWithAccuracyRetry(
    window.PotracePlus,
    mask.canvas,
    bitmapFlattenPotraceOptions(result.settings||{}),
    bitmapFlattenMaskFromBinaryCanvas(mask.canvas),
    result.settings||{}
  );
  const traced=accurateTrace.traced;
  const d=accurateTrace.d;
  if(!d || !String(d).trim()) throw new Error("Potrace could not trace the gradient silhouette.");

  const sourceX=Number(source.getAttribute("x"))||0, sourceY=Number(source.getAttribute("y"))||0;
  const sourceWidth=Math.max(1e-6,Number(source.getAttribute("width"))||result.width);
  const sourceHeight=Math.max(1e-6,Number(source.getAttribute("height"))||result.height);
  const transform=`translate(${sourceX} ${sourceY}) scale(${sourceWidth/result.width} ${sourceHeight/result.height})`;
  const group=document.createElementNS(SVG_NS,"g");
  objectCounter += 1;
  group.dataset.object="true"; group.dataset.group="true";
  group.dataset.name=`${source.dataset.name || "Image"} — Potrace gradient`;
  group.dataset.tx=source.dataset.tx||"0"; group.dataset.ty=source.dataset.ty||"0";
  group.dataset.rotation=source.dataset.rotation||"0"; group.dataset.scaleX=source.dataset.scaleX||"1"; group.dataset.scaleY=source.dataset.scaleY||"1";
  group.dataset.hidden="false"; group.dataset.locked="false"; group.dataset.traceMode="gradient";
  const appended=bitmapFlattenAppendEditableTrace(group,String(d),gradient.stops[0].color,"Gradient region — Potrace",transform,result.settings||{});
  [...group.children].forEach(path=>bitmapFlattenApplyDetectedGradient(path,gradient));
  applyObjectTransform(group);
  return {group,created:appended.created,mode:"gradient"};
}

function bitmapFlattenFinalTraceDimension() {
  const detail = Math.max(0, Math.min(100, Number(bitmapFlattenDetail?.value) || 70));
  if (detail >= 85) return 2000;
  if (detail >= 60) return 1550;
  return 1150;
}

function bitmapFlattenMaskFromBinaryCanvas(canvas) {
  if (!canvas) return null;
  const width = canvas.width || 0;
  const height = canvas.height || 0;
  if (!width || !height) return null;
  const data = canvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, width, height).data;
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i += 1) mask[i] = data[i * 4] < 128 ? 1 : 0;
  return mask;
}

function bitmapFlattenTraceReconstructionError(d, expectedMask, width, height) {
  if (!d || !expectedMask || typeof Path2D !== "function" || expectedMask.length !== width * height) return null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#000";
    const path = new Path2D(String(d));
    try { ctx.fill(path, "evenodd"); } catch { ctx.fill(path); }
    const pixels = ctx.getImageData(0, 0, width, height).data;
    let mismatch = 0;
    let union = 0;
    for (let i = 0; i < expectedMask.length; i += 1) {
      const expected = !!expectedMask[i];
      const actual = pixels[i * 4 + 3] >= 128;
      if (expected || actual) union += 1;
      if (expected !== actual) mismatch += 1;
    }
    return union ? mismatch / union : 0;
  } catch (error) {
    console.warn("Could not measure Potrace reconstruction error", error);
    return null;
  }
}

async function bitmapFlattenTraceWithAccuracyRetry(traceFn, canvas, options, expectedMask, settings = {}) {
  const readD = traced => typeof traced?.getD === "function" ? traced.getD() : traced?.d;
  let traced = await traceFn(canvas, options);
  let d = readD(traced);
  if (!d || !String(d).trim()) return { traced, d, error: null, retried: false };
  let error = bitmapFlattenTraceReconstructionError(d, expectedMask, canvas.width, canvas.height);
  const detail = Math.max(0, Math.min(100, Number(settings?.detail) || 70));
  const target = detail >= 85 ? 0.008 : detail >= 60 ? 0.014 : 0.024;
  if (error == null || error <= target) return { traced, d, error, retried: false };

  const retryOptions = {
    ...options,
    turdsize: Math.min(Number(options.turdsize) || 1, 2),
    opttolerance: Math.max(0.015, (Number(options.opttolerance) || 0.1) * 0.45),
    alphamax: Math.max(0.55, Math.min(1.15, Number(options.alphamax) || 0.9)),
    decimals: Math.max(4, Number(options.decimals) || 3)
  };
  const retry = await traceFn(canvas, retryOptions);
  const retryD = readD(retry);
  if (!retryD || !String(retryD).trim()) return { traced, d, error, retried: true };
  const retryError = bitmapFlattenTraceReconstructionError(retryD, expectedMask, canvas.width, canvas.height);
  if (retryError != null && (error == null || retryError < error)) {
    return { traced: retry, d: retryD, error: retryError, retried: true };
  }
  return { traced, d, error, retried: true };
}

function bitmapFlattenBilinearRgba(result, x, y) {
  const data = result?.edgeRgba || result?.rgba;
  if (!data || !result?.width || !result?.height) return null;
  const width = result.width, height = result.height;
  const px = Math.max(0, Math.min(width - 1, x));
  const py = Math.max(0, Math.min(height - 1, y));
  const x0 = Math.floor(px), y0 = Math.floor(py);
  const x1 = Math.min(width - 1, x0 + 1), y1 = Math.min(height - 1, y0 + 1);
  const tx = px - x0, ty = py - y0;
  const sample = (sx, sy, channel) => data[(sy * width + sx) * 4 + channel];
  const out = [];
  for (let c = 0; c < 4; c += 1) {
    const a = sample(x0, y0, c) * (1 - tx) + sample(x1, y0, c) * tx;
    const b = sample(x0, y1, c) * (1 - tx) + sample(x1, y1, c) * tx;
    out[c] = a * (1 - ty) + b * ty;
  }
  return out;
}

function bitmapFlattenColourMembership(result, paletteIndex, x, y) {
  // Boundary ownership must come from the unblurred edge source. Sampling the
  // smoothed clustering image here creates synthetic dark/light mixtures that
  // can become visible halos around stacked foreground islands.
  const edgeSource = result?.edgeRgba ? { ...result, rgba: result.edgeRgba } : result;
  const rgba = bitmapFlattenBilinearRgba(edgeSource, x, y);
  const own = result?.palette?.[paletteIndex];
  if (!rgba || !own) return 0;
  const distance = color => Math.hypot(rgba[0] - color[0], rgba[1] - color[1], rgba[2] - color[2]);
  const ownDistance = distance(own);
  let otherDistance = Infinity;
  const activeIndices = Array.isArray(result.activePaletteIndices) && result.activePaletteIndices.length
    ? result.activePaletteIndices
    : result.palette.map((_, index) => index);
  for (const i of activeIndices) {
    if (i === paletteIndex || !result.palette[i]) continue;
    otherDistance = Math.min(otherDistance, distance(result.palette[i]));
  }
  if (!Number.isFinite(otherDistance)) otherDistance = 255;
  const colourConfidence = otherDistance - ownDistance;
  const alphaValue = result?.edgeAlpha
    ? (() => {
        const ix = Math.max(0, Math.min(result.width - 1, Math.round(x)));
        const iy = Math.max(0, Math.min(result.height - 1, Math.round(y)));
        return result.edgeAlpha[iy * result.width + ix];
      })()
    : rgba[3];
  const alphaConfidence = (alphaValue - 127.5) * 0.8;
  return Math.min(colourConfidence, alphaConfidence);
}

function bitmapFlattenRefineContourToColourBoundary(contour, result, paletteIndex) {
  const anchors = contour?.anchors;
  if (!Array.isArray(anchors) || anchors.length < 3 || !result?.palette?.[paletteIndex]) return contour;
  const detail = Math.max(0, Math.min(100, Number(result.settings?.detail) || 70));
  const geometryScale = bitmapFlattenGeometryToleranceScale(result.settings || {});
  const radius = (detail >= 85 ? 3.25 : detail >= 60 ? 2.5 : 1.75) * geometryScale;
  const step = (detail >= 85 ? 0.2 : 0.25) * geometryScale;
  const original = anchors.map(anchor => ({ ...anchor }));
  for (let i = 0; i < anchors.length; i += 1) {
    const prev = original[(i - 1 + original.length) % original.length];
    const curr = original[i];
    const next = original[(i + 1) % original.length];
    const tx = next.x - prev.x, ty = next.y - prev.y;
    const length = Math.hypot(tx, ty);
    if (length < 1e-6) continue;
    const nx = -ty / length, ny = tx / length;
    const samples = [];
    for (let offset = -radius; offset <= radius + 1e-6; offset += step) {
      samples.push({ offset, score: bitmapFlattenColourMembership(result, paletteIndex, curr.x + nx * offset, curr.y + ny * offset) });
    }
    let bestOffset = 0;
    let bestDistance = Infinity;
    for (let k = 1; k < samples.length; k += 1) {
      const a = samples[k - 1], b = samples[k];
      if ((a.score <= 0 && b.score >= 0) || (a.score >= 0 && b.score <= 0)) {
        const denom = Math.abs(a.score) + Math.abs(b.score);
        const t = denom > 1e-9 ? Math.abs(a.score) / denom : 0.5;
        const crossing = a.offset + (b.offset - a.offset) * t;
        const distance = Math.abs(crossing);
        if (distance < bestDistance) { bestDistance = distance; bestOffset = crossing; }
      }
    }
    if (!Number.isFinite(bestDistance)) {
      let best = null;
      for (const sample of samples) {
        const merit = Math.abs(sample.score) + Math.abs(sample.offset) * 1.5;
        if (!best || merit < best.merit) best = { ...sample, merit };
      }
      if (best && Math.abs(best.offset) <= radius * 0.65) bestOffset = best.offset;
    }
    // Avoid destabilising sharp corners with a large snap. Fine mode is allowed
    // a little more movement; lower detail remains deliberately conservative.
    const maxShift = detail >= 85 ? 1.65 : detail >= 60 ? 1.25 : 0.85;
    bestOffset = Math.max(-maxShift, Math.min(maxShift, bestOffset));
    if (Math.abs(bestOffset) < 0.035) continue;
    const dx = nx * bestOffset, dy = ny * bestOffset;
    anchors[i].x += dx; anchors[i].y += dy;
    anchors[i].inX += dx; anchors[i].inY += dy;
    anchors[i].outX += dx; anchors[i].outY += dy;
  }
  contour.signedArea = bitmapFlattenAnchorLoopArea(anchors);
  return contour;
}

function bitmapFlattenRefineContoursToColourBoundary(contours, result, paletteIndex) {
  if (!Array.isArray(contours)) return contours;
  contours.forEach(contour => bitmapFlattenRefineContourToColourBoundary(contour, result, paletteIndex));
  return contours;
}


function bitmapFlattenAngleDistanceModuloPi(a, b) {
  let d = Math.abs(a - b) % Math.PI;
  if (d > Math.PI / 2) d = Math.PI - d;
  return d;
}

function bitmapFlattenWeightedModuloPiMean(items) {
  let sx = 0, sy = 0, weightSum = 0;
  for (const item of items || []) {
    const w = Math.max(1e-6, Number(item.weight) || 1);
    sx += Math.cos((Number(item.angle) || 0) * 2) * w;
    sy += Math.sin((Number(item.angle) || 0) * 2) * w;
    weightSum += w;
  }
  if (!weightSum || (Math.abs(sx) < 1e-9 && Math.abs(sy) < 1e-9)) return 0;
  let angle = 0.5 * Math.atan2(sy, sx);
  if (angle < 0) angle += Math.PI;
  return angle;
}

function bitmapFlattenSourceBoundaryOffset(result, paletteIndex, x, y, nx, ny, radius = 2.2, step = 0.25) {
  const samples = [];
  for (let offset = -radius; offset <= radius + 1e-6; offset += step) {
    samples.push({ offset, score: bitmapFlattenColourMembership(result, paletteIndex, x + nx * offset, y + ny * offset) });
  }
  let bestOffset = null;
  let bestDistance = Infinity;
  for (let i = 1; i < samples.length; i += 1) {
    const a = samples[i - 1], b = samples[i];
    if ((a.score <= 0 && b.score >= 0) || (a.score >= 0 && b.score <= 0)) {
      const denom = Math.abs(a.score) + Math.abs(b.score);
      const t = denom > 1e-9 ? Math.abs(a.score) / denom : 0.5;
      const crossing = a.offset + (b.offset - a.offset) * t;
      if (Math.abs(crossing) < bestDistance) {
        bestDistance = Math.abs(crossing);
        bestOffset = crossing;
      }
    }
  }
  return bestOffset;
}

function bitmapFlattenFitTlsLine(points) {
  if (!Array.isArray(points) || points.length < 3) return null;
  let cx = 0, cy = 0;
  for (const point of points) { cx += point.x; cy += point.y; }
  cx /= points.length; cy /= points.length;
  let xx = 0, xy = 0, yy = 0;
  for (const point of points) {
    const dx = point.x - cx, dy = point.y - cy;
    xx += dx * dx; xy += dx * dy; yy += dy * dy;
  }
  const angle = 0.5 * Math.atan2(2 * xy, xx - yy);
  const dx = Math.cos(angle), dy = Math.sin(angle);
  const nx = -dy, ny = dx;
  let residual = 0;
  for (const point of points) {
    const distance = (point.x - cx) * nx + (point.y - cy) * ny;
    residual += distance * distance;
  }
  return { cx, cy, angle: angle < 0 ? angle + Math.PI : angle, dx, dy, rms: Math.sqrt(residual / points.length) };
}

function bitmapFlattenLineIntersection(a, b) {
  const cross = a.dx * b.dy - a.dy * b.dx;
  if (Math.abs(cross) < 1e-5) return null;
  const qx = b.cx - a.cx, qy = b.cy - a.cy;
  const t = (qx * b.dy - qy * b.dx) / cross;
  return { x: a.cx + a.dx * t, y: a.cy + a.dy * t };
}

function bitmapFlattenRegularizeContourGeometry(contour, result, paletteIndex) {
  const anchors = contour?.anchors;
  if (!Array.isArray(anchors) || anchors.length < 3 || !result?.palette?.[paletteIndex]) return contour;
  const closed = contour.closed !== false;
  const count = anchors.length;
  const detail = Math.max(0, Math.min(100, Number(result.settings?.detail) || 70));
  const geometryScale = bitmapFlattenGeometryToleranceScale(result.settings || {});
  const zeroTolerance = 0.055 * geometryScale;
  const segmentCount = closed ? count : count - 1;
  const segments = [];
  for (let i = 0; i < segmentCount; i += 1) {
    const j = (i + 1) % count;
    const a = anchors[i], b = anchors[j];
    const vx = b.x - a.x, vy = b.y - a.y;
    const length = Math.hypot(vx, vy);
    const straight = length > 1.5 &&
      Math.hypot(a.outX - a.x, a.outY - a.y) <= zeroTolerance &&
      Math.hypot(b.inX - b.x, b.inY - b.y) <= zeroTolerance;
    let angle = Math.atan2(vy, vx);
    if (angle < 0) angle += Math.PI;
    if (angle >= Math.PI) angle -= Math.PI;
    segments.push({ i, j, length, angle, straight });
  }

  const joinTolerance = (detail >= 85 ? 2.2 : detail >= 60 ? 2.8 : 3.4) * Math.PI / 180;
  let runs = [];
  let current = null;
  for (const segment of segments) {
    if (!segment.straight) { if (current) runs.push(current); current = null; continue; }
    if (!current) {
      current = { segments: [segment] };
    } else {
      const previous = current.segments[current.segments.length - 1];
      if (bitmapFlattenAngleDistanceModuloPi(previous.angle, segment.angle) <= joinTolerance) current.segments.push(segment);
      else { runs.push(current); current = { segments: [segment] }; }
    }
  }
  if (current) runs.push(current);
  if (closed && runs.length > 1 && runs[0].segments[0].i === 0 && runs[runs.length - 1].segments.at(-1).j === 0) {
    const firstAngle = runs[0].segments[0].angle;
    const lastAngle = runs[runs.length - 1].segments.at(-1).angle;
    if (bitmapFlattenAngleDistanceModuloPi(firstAngle, lastAngle) <= joinTolerance) {
      runs[0] = { segments: [...runs[runs.length - 1].segments, ...runs[0].segments] };
      runs.pop();
    }
  }

  runs = runs.filter(run => run.segments.reduce((sum, segment) => sum + segment.length, 0) >= (detail >= 85 ? 5 : 7) * geometryScale);
  if (!runs.length) return contour;

  const radius = (detail >= 85 ? 2.8 : detail >= 60 ? 2.35 : 1.9) * geometryScale;
  const fittedRuns = [];
  for (const run of runs) {
    const samples = [];
    let totalLength = 0;
    for (const segment of run.segments) {
      const a = anchors[segment.i], b = anchors[segment.j];
      const vx = b.x - a.x, vy = b.y - a.y;
      const length = Math.hypot(vx, vy);
      if (length < 1e-6) continue;
      totalLength += length;
      const nx = -vy / length, ny = vx / length;
      const sampleCount = Math.max(3, Math.min(12, Math.ceil(length / (5 * geometryScale))));
      for (let k = 0; k < sampleCount; k += 1) {
        const t = (k + 0.5) / sampleCount;
        const x = a.x + vx * t, y = a.y + vy * t;
        const offset = bitmapFlattenSourceBoundaryOffset(result, paletteIndex, x, y, nx, ny, radius, 0.25 * geometryScale);
        if (offset == null || Math.abs(offset) > radius) continue;
        samples.push({ x: x + nx * offset, y: y + ny * offset });
      }
    }
    const fit = bitmapFlattenFitTlsLine(samples);
    if (!fit || samples.length < 4) continue;
    const rmsLimit = (detail >= 85 ? 0.48 : detail >= 60 ? 0.62 : 0.78) * geometryScale;
    const originalAngle = bitmapFlattenWeightedModuloPiMean(run.segments.map(segment => ({ angle: segment.angle, weight: segment.length })));
    const angleShift = bitmapFlattenAngleDistanceModuloPi(fit.angle, originalAngle);
    if (fit.rms > rmsLimit || angleShift > 4.5 * Math.PI / 180) continue;
    fittedRuns.push({ ...run, ...fit, originalAngle, weight: totalLength, samples });
  }
  if (!fittedRuns.length) return contour;

  // Average strong near-parallel line families so independent antialias noise
  // cannot leave nominally parallel edges at slightly different angles.
  const clusterTolerance = (detail >= 85 ? 1.6 : 2.1) * Math.PI / 180;
  const clusters = [];
  for (const run of [...fittedRuns].sort((a, b) => b.weight - a.weight)) {
    let cluster = clusters.find(candidate => bitmapFlattenAngleDistanceModuloPi(candidate.angle, run.angle) <= clusterTolerance);
    if (!cluster) {
      cluster = { runs: [], angle: run.angle, weight: 0 };
      clusters.push(cluster);
    }
    cluster.runs.push(run);
    cluster.weight += run.weight;
    cluster.angle = bitmapFlattenWeightedModuloPiMean(cluster.runs.map(item => ({ angle: item.angle, weight: item.weight })));
  }

  // If two dominant families are already very close to perpendicular, enforce
  // exact perpendicularity around their weighted mean rather than snapping to
  // page axes. This preserves legitimately rotated artwork.
  for (let i = 0; i < clusters.length; i += 1) {
    for (let j = i + 1; j < clusters.length; j += 1) {
      const a = clusters[i], b = clusters[j];
      const delta = bitmapFlattenAngleDistanceModuloPi(a.angle, b.angle);
      const perpendicularError = Math.abs(Math.PI / 2 - delta);
      if (perpendicularError > 1.8 * Math.PI / 180) continue;
      const bAsPerpToA = (a.angle + Math.PI / 2) % Math.PI;
      let signed = b.angle - bAsPerpToA;
      while (signed > Math.PI / 2) signed -= Math.PI;
      while (signed < -Math.PI / 2) signed += Math.PI;
      const total = a.weight + b.weight;
      const correctionA = signed * (b.weight / total);
      a.angle = (a.angle + correctionA + Math.PI) % Math.PI;
      b.angle = (a.angle + Math.PI / 2) % Math.PI;
    }
  }

  for (const cluster of clusters) {
    for (const run of cluster.runs) {
      // Keep each edge's fitted centroid/offset, only share the family angle.
      run.angle = cluster.angle;
      run.dx = Math.cos(run.angle);
      run.dy = Math.sin(run.angle);
    }
  }

  const memberships = Array.from({ length: count }, () => []);
  for (const run of fittedRuns) {
    const seen = new Set();
    for (const segment of run.segments) {
      seen.add(segment.i); seen.add(segment.j);
    }
    for (const index of seen) memberships[index].push(run);
  }

  const maxShift = (detail >= 85 ? 1.15 : detail >= 60 ? 0.95 : 0.75) * geometryScale;
  for (let i = 0; i < count; i += 1) {
    const related = memberships[i];
    if (!related.length) continue;
    const anchor = anchors[i];
    let target = null;
    if (related.length >= 2) {
      let bestPair = null;
      let bestCross = 0;
      for (let a = 0; a < related.length; a += 1) {
        for (let b = a + 1; b < related.length; b += 1) {
          const cross = Math.abs(related[a].dx * related[b].dy - related[a].dy * related[b].dx);
          if (cross > bestCross) { bestCross = cross; bestPair = [related[a], related[b]]; }
        }
      }
      if (bestPair && bestCross > 0.22) target = bitmapFlattenLineIntersection(bestPair[0], bestPair[1]);
    }
    if (!target) {
      let sx = 0, sy = 0;
      for (const line of related) {
        const t = (anchor.x - line.cx) * line.dx + (anchor.y - line.cy) * line.dy;
        sx += line.cx + line.dx * t;
        sy += line.cy + line.dy * t;
      }
      target = { x: sx / related.length, y: sy / related.length };
    }
    let dx = target.x - anchor.x, dy = target.y - anchor.y;
    const distance = Math.hypot(dx, dy);
    if (!Number.isFinite(distance) || distance < 0.02) continue;
    if (distance > maxShift) { dx *= maxShift / distance; dy *= maxShift / distance; }
    anchor.x += dx; anchor.y += dy;
    anchor.inX += dx; anchor.inY += dy;
    anchor.outX += dx; anchor.outY += dy;
  }

  // Reinstate mathematically straight handles on every accepted run after
  // moving its anchors onto the shared fitted line.
  for (const run of fittedRuns) {
    for (const segment of run.segments) {
      const a = anchors[segment.i], b = anchors[segment.j];
      a.outX = a.x; a.outY = a.y;
      b.inX = b.x; b.inY = b.y;
    }
  }
  contour.signedArea = bitmapFlattenAnchorLoopArea(anchors);
  return contour;
}

function bitmapFlattenRegularizeContoursGeometry(contours, result, paletteIndex) {
  if (!Array.isArray(contours)) return contours;
  contours.forEach(contour => bitmapFlattenRegularizeContourGeometry(contour, result, paletteIndex));
  return contours;
}

function bitmapFlattenCubicSample(a, b, t) {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return {
    x: a.x * mt2 * mt + 3 * a.outX * mt2 * t + 3 * b.inX * mt * t2 + b.x * t2 * t,
    y: a.y * mt2 * mt + 3 * a.outY * mt2 * t + 3 * b.inY * mt * t2 + b.y * t2 * t
  };
}

function bitmapFlattenSampleAnchorContour(anchors, closed = true, spacing = 1.25) {
  if (!Array.isArray(anchors) || anchors.length < 2) return [];
  const points = [];
  const count = anchors.length;
  const segmentCount = closed ? count : count - 1;
  for (let i = 0; i < segmentCount; i += 1) {
    const j = (i + 1) % count;
    const a = anchors[i], b = anchors[j];
    let length = 0;
    let prev = { x: a.x, y: a.y };
    for (let k = 1; k <= 10; k += 1) {
      const point = bitmapFlattenCubicSample(a, b, k / 10);
      length += Math.hypot(point.x - prev.x, point.y - prev.y);
      prev = point;
    }
    const samples = Math.max(2, Math.min(80, Math.ceil(length / Math.max(0.45, spacing))));
    for (let k = 0; k < samples; k += 1) {
      if (i > 0 && k === 0) continue;
      const t = k / samples;
      points.push(bitmapFlattenCubicSample(a, b, t));
    }
  }
  if (!closed) points.push({ x: anchors[count - 1].x, y: anchors[count - 1].y });
  return points;
}

function bitmapFlattenPointSegmentDistance(point, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const denom = dx * dx + dy * dy;
  if (denom < 1e-12) return Math.hypot(point.x - a.x, point.y - a.y);
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / denom));
  return Math.hypot(point.x - (a.x + dx * t), point.y - (a.y + dy * t));
}

function bitmapFlattenSimplifyOpenPoints(points, tolerance) {
  if (!Array.isArray(points) || points.length <= 2) return points ? points.slice() : [];
  const keep = new Uint8Array(points.length);
  keep[0] = 1; keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [lo, hi] = stack.pop();
    let worstIndex = -1, worstDistance = tolerance;
    for (let i = lo + 1; i < hi; i += 1) {
      const distance = bitmapFlattenPointSegmentDistance(points[i], points[lo], points[hi]);
      if (distance > worstDistance) { worstDistance = distance; worstIndex = i; }
    }
    if (worstIndex >= 0) {
      keep[worstIndex] = 1;
      stack.push([lo, worstIndex], [worstIndex, hi]);
    }
  }
  return points.filter((_, index) => keep[index]);
}

function bitmapFlattenSimplifyClosedPoints(points, tolerance) {
  if (!Array.isArray(points) || points.length < 4) return points ? points.slice() : [];
  // Break the ring at two widely separated points. Using the point farthest
  // from point zero avoids the unstable seam produced by simplifying a closed
  // contour as though its first and last points were coincident endpoints.
  let split = 1, farthest = -1;
  for (let i = 1; i < points.length; i += 1) {
    const d = (points[i].x - points[0].x) ** 2 + (points[i].y - points[0].y) ** 2;
    if (d > farthest) { farthest = d; split = i; }
  }
  const first = points.slice(0, split + 1);
  const second = points.slice(split).concat([points[0]]);
  const a = bitmapFlattenSimplifyOpenPoints(first, tolerance);
  const b = bitmapFlattenSimplifyOpenPoints(second, tolerance);
  return a.slice(0, -1).concat(b.slice(0, -1));
}

function bitmapFlattenGeometryToleranceScale(settings = {}) {
  return Math.max(1, Number(settings?.traceGeometryScale) || 1);
}

function bitmapFlattenVecNormalize(v) {
  const length = Math.hypot(v.x, v.y);
  return length > 1e-10 ? { x: v.x / length, y: v.y / length } : { x: 0, y: 0 };
}

function bitmapFlattenBezierPoint(segment, t) {
  const mt = 1 - t, mt2 = mt * mt, t2 = t * t;
  return {
    x: segment.p0.x * mt2 * mt + 3 * segment.p1.x * mt2 * t + 3 * segment.p2.x * mt * t2 + segment.p3.x * t2 * t,
    y: segment.p0.y * mt2 * mt + 3 * segment.p1.y * mt2 * t + 3 * segment.p2.y * mt * t2 + segment.p3.y * t2 * t
  };
}

function bitmapFlattenChordParameters(points) {
  const u = new Float64Array(points.length);
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    u[i] = total;
  }
  if (total <= 1e-10) return u;
  for (let i = 1; i < u.length; i += 1) u[i] /= total;
  return u;
}

function bitmapFlattenFitSingleCubic(points, leftTangent, rightTangent, parameters) {
  const p0 = points[0], p3 = points[points.length - 1];
  let c00 = 0, c01 = 0, c11 = 0, x0 = 0, x1 = 0;
  for (let i = 0; i < points.length; i += 1) {
    const u = parameters[i], mt = 1 - u;
    const b0 = mt * mt * mt, b1 = 3 * u * mt * mt, b2 = 3 * u * u * mt, b3 = u * u * u;
    const a1 = { x: leftTangent.x * b1, y: leftTangent.y * b1 };
    const a2 = { x: rightTangent.x * b2, y: rightTangent.y * b2 };
    const base = {
      x: p0.x * (b0 + b1) + p3.x * (b2 + b3),
      y: p0.y * (b0 + b1) + p3.y * (b2 + b3)
    };
    const tmp = { x: points[i].x - base.x, y: points[i].y - base.y };
    c00 += a1.x * a1.x + a1.y * a1.y;
    c01 += a1.x * a2.x + a1.y * a2.y;
    c11 += a2.x * a2.x + a2.y * a2.y;
    x0 += a1.x * tmp.x + a1.y * tmp.y;
    x1 += a2.x * tmp.x + a2.y * tmp.y;
  }
  const det = c00 * c11 - c01 * c01;
  let alphaL = 0, alphaR = 0;
  if (Math.abs(det) > 1e-12) {
    alphaL = (x0 * c11 - x1 * c01) / det;
    alphaR = (c00 * x1 - c01 * x0) / det;
  }
  const chord = Math.hypot(p3.x - p0.x, p3.y - p0.y);
  const epsilon = chord * 1e-4;
  if (!(alphaL > epsilon) || !(alphaR > epsilon) || !Number.isFinite(alphaL) || !Number.isFinite(alphaR)) {
    alphaL = alphaR = chord / 3;
  }
  return {
    p0: { ...p0 },
    p1: { x: p0.x + leftTangent.x * alphaL, y: p0.y + leftTangent.y * alphaL },
    p2: { x: p3.x + rightTangent.x * alphaR, y: p3.y + rightTangent.y * alphaR },
    p3: { ...p3 }
  };
}

function bitmapFlattenCurveFeatureWeights(points) {
  const weights = new Float64Array(points.length);
  weights.fill(1);
  for (let i = 1; i + 1 < points.length; i += 1) {
    const a = bitmapFlattenVecNormalize({ x: points[i].x - points[i - 1].x, y: points[i].y - points[i - 1].y });
    const b = bitmapFlattenVecNormalize({ x: points[i + 1].x - points[i].x, y: points[i + 1].y - points[i].y });
    const dot = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y));
    const turn = Math.acos(dot);
    weights[i] = 1 + Math.min(7, turn / (Math.PI / 18) * 1.8);
  }
  return weights;
}

function bitmapFlattenCubicFitError(points, segment, parameters, weights) {
  let worst = 0, worstIndex = Math.floor(points.length / 2);
  for (let i = 1; i + 1 < points.length; i += 1) {
    const q = bitmapFlattenBezierPoint(segment, parameters[i]);
    const distance = Math.hypot(q.x - points[i].x, q.y - points[i].y);
    const weighted = distance * (weights?.[i] || 1);
    if (weighted > worst) { worst = weighted; worstIndex = i; }
  }
  return { error: worst, index: worstIndex };
}

function bitmapFlattenLineFitError(points, weights) {
  const a = points[0], b = points[points.length - 1];
  let worst = 0;
  for (let i = 1; i + 1 < points.length; i += 1) {
    worst = Math.max(worst, bitmapFlattenPointSegmentDistance(points[i], a, b) * (weights?.[i] || 1));
  }
  return worst;
}

function bitmapFlattenRobustEndpointTangent(points, fromStart = true) {
  if (!Array.isArray(points) || points.length < 2) return { x: 0, y: 0 };
  const span = Math.max(1, Math.min(5, Math.floor((points.length - 1) / 3)));
  if (fromStart) {
    return bitmapFlattenVecNormalize({ x: points[span].x - points[0].x, y: points[span].y - points[0].y });
  }
  const last = points.length - 1;
  return bitmapFlattenVecNormalize({ x: points[last - span].x - points[last].x, y: points[last - span].y - points[last].y });
}

function bitmapFlattenDenoiseCurveSamples(points, closed, strength = 0) {
  if (!Array.isArray(points) || points.length < 7 || strength <= 0) return points;
  const count = points.length;
  const features = new Set(bitmapFlattenFeatureIndices(points, closed));
  const protectedIndex = index => {
    for (let d = -2; d <= 2; d += 1) {
      let j = index + d;
      if (closed) j = (j + count) % count;
      if (!closed && (j < 0 || j >= count)) continue;
      if (features.has(j)) return true;
    }
    return false;
  };
  const result = points.map(p => ({ ...p }));
  // Savitzky-Golay 5-point smoothing preserves broad curvature substantially
  // better than a moving average. Only low-curvature, non-feature samples are
  // blended, so intentional corners and tight details remain untouched.
  const blend = Math.max(0, Math.min(0.72, strength));
  const first = closed ? 0 : 2;
  const last = closed ? count : count - 2;
  for (let i = first; i < last; i += 1) {
    if (protectedIndex(i)) continue;
    const idx = d => closed ? (i + d + count) % count : i + d;
    const p0 = points[idx(-2)], p1 = points[idx(-1)], p2 = points[i], p3 = points[idx(1)], p4 = points[idx(2)];
    const a = bitmapFlattenVecNormalize({ x: p2.x - p1.x, y: p2.y - p1.y });
    const b = bitmapFlattenVecNormalize({ x: p3.x - p2.x, y: p3.y - p2.y });
    const turn = Math.acos(Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y)));
    if (turn > 16 * Math.PI / 180) continue;
    const sx = (-3 * p0.x + 12 * p1.x + 17 * p2.x + 12 * p3.x - 3 * p4.x) / 35;
    const sy = (-3 * p0.y + 12 * p1.y + 17 * p2.y + 12 * p3.y - 3 * p4.y) / 35;
    result[i].x = p2.x + (sx - p2.x) * blend;
    result[i].y = p2.y + (sy - p2.y) * blend;
  }
  return result;
}

function bitmapFlattenFitCubicRecursive(points, tolerance, depth = 0) {
  if (points.length < 2) return [];
  if (points.length === 2) {
    return [{ p0: { ...points[0] }, p1: { ...points[0] }, p2: { ...points[1] }, p3: { ...points[1] }, straight: true }];
  }
  const weights = bitmapFlattenCurveFeatureWeights(points);
  if (bitmapFlattenLineFitError(points, weights) <= tolerance * 0.72) {
    return [{ p0: { ...points[0] }, p1: { ...points[0] }, p2: { ...points[points.length - 1] }, p3: { ...points[points.length - 1] }, straight: true }];
  }
  const leftTangent = bitmapFlattenRobustEndpointTangent(points, true);
  const rightTangent = bitmapFlattenRobustEndpointTangent(points, false);
  const parameters = bitmapFlattenChordParameters(points);
  const segment = bitmapFlattenFitSingleCubic(points, leftTangent, rightTangent, parameters);
  const measured = bitmapFlattenCubicFitError(points, segment, parameters, weights);
  if (measured.error <= tolerance || depth >= 16 || points.length <= 4) return [segment];
  let split = Math.max(2, Math.min(points.length - 3, measured.index));
  if (!Number.isFinite(split)) split = Math.floor(points.length / 2);
  const left = points.slice(0, split + 1);
  const right = points.slice(split);
  return bitmapFlattenFitCubicRecursive(left, tolerance, depth + 1).concat(bitmapFlattenFitCubicRecursive(right, tolerance, depth + 1));
}

function bitmapFlattenFeatureIndices(points, closed) {
  const count = points.length;
  const features = new Set();
  if (!closed) { features.add(0); features.add(count - 1); }
  const turns = new Float64Array(count);
  for (let i = closed ? 0 : 1; i < (closed ? count : count - 1); i += 1) {
    const prev = points[(i - 1 + count) % count], curr = points[i], next = points[(i + 1) % count];
    const a = bitmapFlattenVecNormalize({ x: curr.x - prev.x, y: curr.y - prev.y });
    const b = bitmapFlattenVecNormalize({ x: next.x - curr.x, y: next.y - curr.y });
    turns[i] = Math.acos(Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y)));
  }
  const hard = 42 * Math.PI / 180, notable = 26 * Math.PI / 180;
  for (let i = closed ? 0 : 1; i < (closed ? count : count - 1); i += 1) {
    const prevTurn = turns[(i - 1 + count) % count], nextTurn = turns[(i + 1) % count];
    if (turns[i] >= hard || (turns[i] >= notable && turns[i] >= prevTurn * 1.55 && turns[i] >= nextTurn * 1.55)) features.add(i);
  }
  return [...features].sort((a, b) => a - b);
}

function bitmapFlattenContourSpans(points, closed) {
  let features = bitmapFlattenFeatureIndices(points, closed);
  const count = points.length;
  if (!closed) {
    return features.slice(0, -1).map((start, i) => points.slice(start, features[i + 1] + 1));
  }
  if (features.length < 2) {
    let split = 1, farthest = -1;
    for (let i = 1; i < count; i += 1) {
      const d = (points[i].x - points[0].x) ** 2 + (points[i].y - points[0].y) ** 2;
      if (d > farthest) { farthest = d; split = i; }
    }
    features = [0, split].sort((a, b) => a - b);
  }
  const spans = [];
  for (let i = 0; i < features.length; i += 1) {
    const start = features[i], end = features[(i + 1) % features.length];
    const span = [];
    let cursor = start;
    span.push(points[cursor]);
    while (cursor !== end) {
      cursor = (cursor + 1) % count;
      span.push(points[cursor]);
      if (span.length > count + 1) break;
    }
    if (span.length >= 2) spans.push(span);
  }
  return spans;
}

function bitmapFlattenSampleBezierSegment(segment, count = 10, includeStart = true) {
  const points = [];
  for (let i = includeStart ? 0 : 1; i <= count; i += 1) {
    points.push(bitmapFlattenBezierPoint(segment, i / count));
  }
  return points;
}

function bitmapFlattenTryMergeBezierPair(a, b, tolerance) {
  if (!a || !b) return null;
  if (Math.hypot(a.p3.x - b.p0.x, a.p3.y - b.p0.y) > 1e-4) return null;
  const points = bitmapFlattenSampleBezierSegment(a, 12, true)
    .concat(bitmapFlattenSampleBezierSegment(b, 12, false));
  if (points.length < 4) return null;
  const weights = bitmapFlattenCurveFeatureWeights(points);
  if (bitmapFlattenLineFitError(points, weights) <= tolerance * 0.78) {
    return { p0: { ...points[0] }, p1: { ...points[0] }, p2: { ...points[points.length - 1] }, p3: { ...points[points.length - 1] }, straight: true };
  }
  const leftTangent = bitmapFlattenVecNormalize({ x: a.p1.x - a.p0.x, y: a.p1.y - a.p0.y });
  const rightTangent = bitmapFlattenVecNormalize({ x: b.p2.x - b.p3.x, y: b.p2.y - b.p3.y });
  const parameters = bitmapFlattenChordParameters(points);
  const merged = bitmapFlattenFitSingleCubic(points, leftTangent, rightTangent, parameters);
  const measured = bitmapFlattenCubicFitError(points, merged, parameters, weights);
  return measured.error <= tolerance ? merged : null;
}

function bitmapFlattenMergeBezierSegments(segments, tolerance, closed = false) {
  let current = Array.isArray(segments) ? segments.slice() : [];
  if (current.length < 2) return current;
  let changed = true;
  let guard = 0;
  while (changed && current.length > 1 && guard++ < 12) {
    changed = false;
    const next = [];
    for (let i = 0; i < current.length;) {
      if (i + 1 < current.length) {
        const merged = bitmapFlattenTryMergeBezierPair(current[i], current[i + 1], tolerance);
        if (merged) {
          next.push(merged);
          i += 2;
          changed = true;
          continue;
        }
      }
      next.push(current[i]);
      i += 1;
    }
    current = next;
  }
  // For closed contours, also try merging across the seam once the interior
  // merge pass has converged. Rotate the merged segment to the front.
  if (closed && current.length > 2) {
    const merged = bitmapFlattenTryMergeBezierPair(current[current.length - 1], current[0], tolerance);
    if (merged) current = [merged].concat(current.slice(1, -1));
  }
  return current;
}

function bitmapFlattenSegmentsToAnchors(segments, closed) {
  if (!segments.length) return [];
  const anchors = [];
  const first = segments[0];
  anchors.push({ x: first.p0.x, y: first.p0.y, inX: first.p0.x, inY: first.p0.y, outX: first.p1.x, outY: first.p1.y });
  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    const isClosure = closed && i === segments.length - 1;
    if (isClosure) {
      anchors[0].inX = segment.p2.x; anchors[0].inY = segment.p2.y;
      continue;
    }
    const next = segments[i + 1];
    anchors.push({
      x: segment.p3.x, y: segment.p3.y,
      inX: segment.p2.x, inY: segment.p2.y,
      outX: next ? next.p1.x : segment.p3.x,
      outY: next ? next.p1.y : segment.p3.y
    });
  }
  return anchors;
}

function bitmapFlattenPercentile(values, q) {
  if (!Array.isArray(values) || !values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.round((sorted.length - 1) * q)));
  return sorted[index];
}

function bitmapFlattenEllipseModel(points, geometryScale = 1) {
  if (!Array.isArray(points) || points.length < 16) return null;
  let cx = 0, cy = 0;
  for (const p of points) { cx += p.x; cy += p.y; }
  cx /= points.length; cy /= points.length;
  let xx = 0, xy = 0, yy = 0;
  for (const p of points) {
    const dx = p.x - cx, dy = p.y - cy;
    xx += dx * dx; xy += dx * dy; yy += dy * dy;
  }
  xx /= points.length; xy /= points.length; yy /= points.length;
  const angle = 0.5 * Math.atan2(2 * xy, xx - yy);
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const us = [], vs = [];
  for (const p of points) {
    const dx = p.x - cx, dy = p.y - cy;
    us.push(dx * ca + dy * sa);
    vs.push(-dx * sa + dy * ca);
  }
  const rx = Math.max(1e-6, (bitmapFlattenPercentile(us, 0.995) - bitmapFlattenPercentile(us, 0.005)) / 2);
  const ry = Math.max(1e-6, (bitmapFlattenPercentile(vs, 0.995) - bitmapFlattenPercentile(vs, 0.005)) / 2);
  if (Math.min(rx, ry) / Math.max(rx, ry) < 0.08) return null;
  const errors = [];
  for (let i = 0; i < points.length; i += 1) {
    const rho = Math.sqrt((us[i] / rx) ** 2 + (vs[i] / ry) ** 2);
    errors.push(Math.abs(rho - 1) * Math.min(rx, ry) / Math.max(1, geometryScale));
  }
  const medianError = bitmapFlattenPercentile(errors, 0.5);
  const p90Error = bitmapFlattenPercentile(errors, 0.9);
  const p98Error = bitmapFlattenPercentile(errors, 0.98);
  return { cx, cy, rx, ry, angle, medianError, p90Error, p98Error };
}

function bitmapFlattenEllipseAnchors(model, clockwise = false) {
  const { cx, cy, rx, ry, angle } = model;
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const k = 0.5522847498307936;
  const sign = clockwise ? -1 : 1;
  const transform = (u, v) => ({ x: cx + u * ca - v * sa, y: cy + u * sa + v * ca });
  const anchors = [];
  for (let i = 0; i < 4; i += 1) {
    const theta = sign * i * Math.PI / 2;
    const u = rx * Math.cos(theta), v = ry * Math.sin(theta);
    const tangentU = -rx * Math.sin(theta) * sign;
    const tangentV = ry * Math.cos(theta) * sign;
    const p = transform(u, v);
    const tin = transform(u - tangentU * k, v - tangentV * k);
    const tout = transform(u + tangentU * k, v + tangentV * k);
    anchors.push({ x: p.x, y: p.y, inX: tin.x, inY: tin.y, outX: tout.x, outY: tout.y });
  }
  return anchors;
}

function bitmapFlattenTryPrimitiveContour(contour, points, settings = {}) {
  if (contour?.closed === false || !Array.isArray(points) || points.length < 16) return null;
  const geometryScale = bitmapFlattenGeometryToleranceScale(settings);
  const simplify = Math.max(0, Math.min(100, Number(settings.simplify) || 0)) / 100;
  const features = bitmapFlattenFeatureIndices(points, true);
  // A genuine ellipse should not contain repeated hard corners. A single noisy
  // peak is tolerated, but multiple structural corners disqualify the model.
  if (features.length > 1) return null;
  const model = bitmapFlattenEllipseModel(points, geometryScale);
  if (!model) return null;
  const detail = Math.max(0, Math.min(100, Number(settings.detail) || 70));
  const baseLimit = detail >= 85 ? 0.22 : detail >= 60 ? 0.30 : 0.40;
  const p90Limit = baseLimit + simplify * (detail >= 85 ? 0.30 : 0.42);
  const p98Limit = p90Limit * 1.8;
  if (model.p90Error > p90Limit || model.p98Error > p98Limit || model.medianError > p90Limit * 0.55) return null;
  const signedArea = Number(contour.signedArea) || bitmapFlattenAnchorLoopArea(contour.anchors);
  return bitmapFlattenEllipseAnchors(model, signedArea < 0);
}

function bitmapFlattenContourSampleMetrics(anchors, closed = true, spacing = 0.55) {
  if (!Array.isArray(anchors) || anchors.length < 3) return null;
  const points = bitmapFlattenSampleAnchorContour(anchors, closed, spacing);
  if (!Array.isArray(points) || points.length < 3) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let area2 = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    minX = Math.min(minX, a.x); minY = Math.min(minY, a.y);
    maxX = Math.max(maxX, a.x); maxY = Math.max(maxY, a.y);
    area2 += a.x * b.y - b.x * a.y;
  }
  return {
    area: area2 / 2,
    absArea: Math.abs(area2 / 2),
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
    minX, minY, maxX, maxY
  };
}

function bitmapFlattenSimplifiedContourSurvives(sourceAnchors, candidateAnchors, closed, settings = {}) {
  if (!Array.isArray(candidateAnchors) || candidateAnchors.length < (closed ? 3 : 2)) return false;
  if (!closed) return true;
  const geometryScale = bitmapFlattenGeometryToleranceScale(settings);
  const source = bitmapFlattenContourSampleMetrics(sourceAnchors, true, 0.48 * geometryScale);
  const candidate = bitmapFlattenContourSampleMetrics(candidateAnchors, true, 0.48 * geometryScale);
  if (!source || !candidate || source.absArea < 1e-6 || candidate.absArea < 1e-6) return false;
  if (Math.sign(source.area) !== Math.sign(candidate.area)) return false;

  const sourceMinDim = Math.min(source.width, source.height) / geometryScale;
  const sourceEq = Math.sqrt(Math.max(1e-6, source.absArea)) / geometryScale;
  // Small islands get a much tighter survival envelope. Simplification may
  // reduce their node count, but it must not materially shrink or inflate the
  // filled footprint that keeps the island visible in the stacked result.
  const small = sourceMinDim < 28 || sourceEq < 24;
  const areaLow = small ? 0.78 : 0.62;
  const areaHigh = small ? 1.28 : 1.48;
  const widthLow = small ? 0.80 : 0.66;
  const widthHigh = small ? 1.24 : 1.50;
  const areaRatio = candidate.absArea / source.absArea;
  const widthRatio = source.width > 1e-6 ? candidate.width / source.width : 1;
  const heightRatio = source.height > 1e-6 ? candidate.height / source.height : 1;
  if (areaRatio < areaLow || areaRatio > areaHigh) return false;
  if (widthRatio < widthLow || widthRatio > widthHigh) return false;
  if (heightRatio < widthLow || heightRatio > widthHigh) return false;

  const centre = { x: (source.minX + source.maxX) / 2, y: (source.minY + source.maxY) / 2 };
  if (!bitmapFlattenPointInAnchorLoop(centre, candidateAnchors)) {
    // Concave shapes can have their bbox centre outside. Fall back to the first
    // source anchor as a topology probe; at least one interior-near probe must
    // remain represented by the simplified island.
    const probe = sourceAnchors[0];
    if (!probe || !bitmapFlattenPointInAnchorLoop({ x: probe.x, y: probe.y }, candidateAnchors)) return false;
  }
  return true;
}

function bitmapFlattenRefitSmoothContour(contour, settings = {}) {
  const source = contour?.anchors;
  if (!Array.isArray(source) || source.length < 3) return contour;
  const simplifyAmount = Math.max(0, Math.min(100, Number(settings.simplify) || 0));
  if (simplifyAmount <= 0) return contour;
  const closed = contour.closed !== false;
  const detail = Math.max(0, Math.min(100, Number(settings.detail) || 70));
  const geometryScale = bitmapFlattenGeometryToleranceScale(settings);

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const anchor of source) {
    minX = Math.min(minX, anchor.x); minY = Math.min(minY, anchor.y);
    maxX = Math.max(maxX, anchor.x); maxY = Math.max(maxY, anchor.y);
  }
  const sourceWidth = Math.max(0, (maxX - minX) / geometryScale);
  const sourceHeight = Math.max(0, (maxY - minY) / geometryScale);
  const minDimension = Math.min(sourceWidth, sourceHeight);
  const maxDimension = Math.max(sourceWidth, sourceHeight);
  const equivalentSize = Math.sqrt(Math.max(1e-6, sourceWidth * sourceHeight));
  // Only truly tiny islands bypass simplification. Small shapes still benefit
  // from fewer nodes, but their structural corners/notches are protected by
  // the feature-aware span splitter below.
  if (minDimension < 5 || maxDimension < 7 || equivalentSize < 6) return contour;

  const sizeBasis = Math.min(equivalentSize, maxDimension * 0.75);
  const sizeProtection = sizeBasis <= 12 ? 0.42
    : sizeBasis <= 20 ? 0.58
      : sizeBasis <= 32 ? 0.72
        : sizeBasis <= 48 ? 0.84
          : sizeBasis <= 72 ? 0.92
            : 1;
  const effective = (simplifyAmount / 100) * sizeProtection;
  const spacing = (detail >= 85 ? 0.38 : detail >= 60 ? 0.48 : 0.62) * geometryScale;
  const rawPoints = bitmapFlattenSampleAnchorContour(source, closed, spacing);
  if (rawPoints.length < 5) return contour;
  const points = bitmapFlattenDenoiseCurveSamples(rawPoints, closed, effective * (detail >= 85 ? 0.28 : detail >= 60 ? 0.42 : 0.55));

  // First try a structural primitive model. Clean circles/ellipses are better
  // represented by four mathematically smooth cubic arcs than by a generic
  // recursive fit, and this removes the small Potrace flats/jaggies entirely.
  const primitiveAnchors = bitmapFlattenTryPrimitiveContour(contour, points, settings);
  if (primitiveAnchors && primitiveAnchors.length < source.length &&
      bitmapFlattenSimplifiedContourSurvives(source, primitiveAnchors, closed, settings)) {
    contour.anchors = primitiveAnchors;
    contour.signedArea = bitmapFlattenAnchorLoopArea(primitiveAnchors);
    contour.datasetPrimitive = "ellipse";
    return contour;
  }

  // Source-space error target. Feature weighting makes sharp details much more
  // expensive to lose than broad low-curvature arcs.
  const base = detail >= 85 ? 0.055 : detail >= 60 ? 0.075 : 0.105;
  let tolerance = (base + Math.pow(effective, 1.25) * (detail >= 85 ? 1.15 : detail >= 60 ? 1.65 : 2.15)) * geometryScale;
  // Permit meaningful simplification on small islands, while keeping the
  // allowed deviation proportional to their own silhouette size.
  tolerance = Math.min(tolerance, Math.max(0.08, minDimension * (0.010 + effective * 0.010)) * geometryScale);

  const spans = bitmapFlattenContourSpans(points, closed);
  let segments = [];
  for (const span of spans) segments = segments.concat(bitmapFlattenFitCubicRecursive(span, tolerance));
  if (!segments.length) return contour;
  // Second-stage optimization: keep combining adjacent cubics while one cubic
  // can still represent the same rendered span within the feature-weighted
  // error budget. This is what allows long clean arcs to collapse to a handful
  // of anchors rather than one anchor per recursive split.
  segments = bitmapFlattenMergeBezierSegments(segments, tolerance * (0.92 + effective * 0.42), closed);

  const anchors = bitmapFlattenSegmentsToAnchors(segments, closed);
  if (anchors.length < (closed ? 3 : 2) || anchors.length >= source.length * 0.98) return contour;
  const cleanedAnchors = bitmapFlattenStraightenPotraceAnchors(anchors, closed, { ...settings, detail: Math.max(detail, 82) });
  if (!bitmapFlattenSimplifiedContourSurvives(source, cleanedAnchors, closed, settings)) return contour;
  contour.anchors = cleanedAnchors;
  contour.signedArea = bitmapFlattenAnchorLoopArea(contour.anchors);
  return contour;
}

function bitmapFlattenSmoothCurvedContours(contours, settings = {}) {
  if (!Array.isArray(contours)) return contours;
  contours.forEach(contour => bitmapFlattenRefitSmoothContour(contour, settings));
  return contours;
}

function bitmapFlattenPotraceOptions(settings) {
  const detail = settings.detail ?? 70;
  const smoothing = settings.smoothing ?? 25;
  const noise = settings.noise ?? 35;
  const straightening = settings.straightening ?? 55;
  const geometryScale = bitmapFlattenGeometryToleranceScale(settings);
  const baseOptTolerance = 0.08 + ((100 - detail) / 100) * 0.2 + (smoothing / 100) * 0.08;
  return {
    turnpolicy: "minority",
    turdsize: Math.max(1, Math.round((1 + (noise / 100) * 8) * geometryScale * geometryScale)),
    optcurve: true,
    alphamax: Math.max(0.2, Math.min(1.25, 0.95 - (straightening / 100) * 0.45 + (smoothing / 100) * 0.25)),
    opttolerance: Math.max(0.05, Math.min(1.0, baseOptTolerance * geometryScale)),
    crop: false,
    optimize: false,
    toRelative: false,
    toShorthands: false,
    addDimensions: true,
    decimals: 3,
    scale: 1,
    minSize: 1,
    maxSize: 5000
  };
}

function bitmapFlattenPaletteHex(color) {
  const part = value => Math.max(0, Math.min(255, Math.round(value || 0))).toString(16).padStart(2, "0");
  return `#${part(color?.[0])}${part(color?.[1])}${part(color?.[2])}`;
}



function bitmapFlattenPointLineDistance(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared < 1e-9) return Math.hypot(point.x - a.x, point.y - a.y);
  const t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared;
  const px = a.x + dx * t;
  const py = a.y + dy * t;
  return Math.hypot(point.x - px, point.y - py);
}

function bitmapFlattenStraightenPotraceAnchors(anchors, closed = true, settings = {}) {
  if (!Array.isArray(anchors) || anchors.length < 2) return anchors || [];
  let clean = anchors.map(anchor => ({ ...anchor }));
  const detail = Number(settings.detail ?? 70);
  const straightening = Number(settings.straightening ?? 55);
  // Pixel-space tolerances. Keep these conservative: this pass is topology
  // cleanup, not shape simplification.
  // Keep straight-line classification deliberately strict. Shallow genuine
  // curves are far more objectionable when flattened than an extra curved
  // handle on an actually straight edge.
  const geometryScale = bitmapFlattenGeometryToleranceScale(settings);
  const handleTolerance = (0.16 + ((100 - detail) / 100) * 0.16 + (straightening / 100) * 0.10) * geometryScale;
  const vertexTolerance = (0.16 + ((100 - detail) / 100) * 0.16 + (straightening / 100) * 0.10) * geometryScale;
  const mergeTolerance = (0.24 + ((100 - detail) / 100) * 0.22 + (straightening / 100) * 0.14) * geometryScale;
  const maxTurn = (1.25 + (straightening / 100) * 2.0) * Math.PI / 180;

  const zeroOutgoing = anchor => {
    anchor.outX = anchor.x;
    anchor.outY = anchor.y;
  };
  const zeroIncoming = anchor => {
    anchor.inX = anchor.x;
    anchor.inY = anchor.y;
  };
  const cubicPoint = (a, b, t) => {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const t2 = t * t;
    return {
      x: a.x * mt2 * mt + 3 * a.outX * mt2 * t + 3 * b.inX * mt * t2 + b.x * t2 * t,
      y: a.y * mt2 * mt + 3 * a.outY * mt2 * t + 3 * b.inY * mt * t2 + b.y * t2 * t
    };
  };
  const segmentChordDeviation = (a, b) => {
    let maxDeviation = 0;
    for (const t of [0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875]) {
      maxDeviation = Math.max(maxDeviation, bitmapFlattenPointLineDistance(cubicPoint(a, b, t), a, b));
    }
    return maxDeviation;
  };
  const segmentIsStraight = (a, b) => {
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    if (length < 1e-6) return true;
    const outPoint = { x: a.outX, y: a.outY };
    const inPoint = { x: b.inX, y: b.inY };
    const outDeviation = bitmapFlattenPointLineDistance(outPoint, a, b);
    const inDeviation = bitmapFlattenPointLineDistance(inPoint, a, b);
    // Require both handle geometry and rendered curve geometry to agree that
    // the segment is straight. The old OR test could turn shallow arcs into
    // little flat chords when Potrace happened to place their handles close
    // to the chord.
    return Math.max(outDeviation, inDeviation) <= handleTolerance &&
      segmentChordDeviation(a, b) <= handleTolerance * 0.72;
  };
  const twoSegmentRunDeviation = (prev, curr, next) => {
    let maxDeviation = bitmapFlattenPointLineDistance(curr, prev, next);
    for (const t of [0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875]) {
      maxDeviation = Math.max(
        maxDeviation,
        bitmapFlattenPointLineDistance(cubicPoint(prev, curr, t), prev, next),
        bitmapFlattenPointLineDistance(cubicPoint(curr, next, t), prev, next)
      );
    }
    return maxDeviation;
  };

  // First make visually straight Potrace cubics into true line-like editor
  // segments by zeroing only the handles that belong to that segment.
  const segmentCount = closed ? clean.length : Math.max(0, clean.length - 1);
  for (let i = 0; i < segmentCount; i += 1) {
    const nextIndex = (i + 1) % clean.length;
    const a = clean[i];
    const b = clean[nextIndex];
    if (segmentIsStraight(a, b)) {
      zeroOutgoing(a);
      zeroIncoming(b);
    }
  }

  const hasZeroOut = anchor => Math.hypot(anchor.outX - anchor.x, anchor.outY - anchor.y) < 1e-5;
  const hasZeroIn = anchor => Math.hypot(anchor.inX - anchor.x, anchor.inY - anchor.y) < 1e-5;

  // Remove redundant anchors only when both neighbouring segments are already
  // true straight segments and the middle vertex is effectively collinear.
  let changed = true;
  while (changed && clean.length > (closed ? 3 : 2)) {
    changed = false;
    const first = closed ? 0 : 1;
    const last = closed ? clean.length : clean.length - 1;
    for (let i = first; i < last; i += 1) {
      const prevIndex = (i - 1 + clean.length) % clean.length;
      const nextIndex = (i + 1) % clean.length;
      const prev = clean[prevIndex];
      const curr = clean[i];
      const next = clean[nextIndex];
      const neighbouringSegmentsAreLines = hasZeroOut(prev) && hasZeroIn(curr) && hasZeroOut(curr) && hasZeroIn(next);

      const ax = curr.x - prev.x;
      const ay = curr.y - prev.y;
      const bx = next.x - curr.x;
      const by = next.y - curr.y;
      const al = Math.hypot(ax, ay);
      const bl = Math.hypot(bx, by);
      if (al < 1e-6 || bl < 1e-6) {
        clean.splice(i, 1);
        changed = true;
        break;
      }
      const dot = Math.max(-1, Math.min(1, (ax * bx + ay * by) / (al * bl)));
      const turn = Math.acos(dot);
      const deviation = bitmapFlattenPointLineDistance(curr, prev, next);
      const runDeviation = twoSegmentRunDeviation(prev, curr, next);
      const conservativeLineMerge = neighbouringSegmentsAreLines && turn <= maxTurn && deviation <= vertexTolerance;
      // Second pass: Potrace often leaves a tiny pair of handles around an
      // otherwise straight intermediate anchor. Sample the rendered cubics
      // themselves and collapse the whole three-anchor run when it stays
      // inside a sub-pixel corridor around the direct chord.
      const sampledRunMerge = turn <= maxTurn * 1.45 && runDeviation <= mergeTolerance;
      if (conservativeLineMerge || sampledRunMerge) {
        zeroOutgoing(prev);
        zeroIncoming(next);
        clean.splice(i, 1);
        changed = true;
        break;
      }
    }
  }
  return clean;
}

function bitmapFlattenPotraceContourAnchors(d, settings = {}) {
  if (!d || !ensurePaperReady()) return [];
  let imported = null;
  try {
    const tempPath = document.createElementNS(SVG_NS, "path");
    tempPath.setAttribute("d", String(d));
    tempPath.setAttribute("fill-rule", "evenodd");
    imported = paper.project.importSVG(tempPath, { insert: false, expandShapes: true });
    const contours = [];
    const visit = item => {
      if (!item) return;
      if (item instanceof paper.Path) {
        const closed = item.closed !== false;
        const anchors = bitmapFlattenStraightenPotraceAnchors(paperPathToAnchors(item), closed, settings);
        if (anchors.length >= 2) contours.push({ anchors, closed, signedArea: Number(item.area) || 0 });
        return;
      }
      if (Array.isArray(item.children)) item.children.forEach(visit);
    };
    visit(imported);
    return contours;
  } catch (error) {
    console.warn("Could not convert Potrace output into editable contours", error);
    return [];
  } finally {
    removePaperItem(imported);
  }
}


function bitmapFlattenAnchorLoopArea(anchors) {
  if (!Array.isArray(anchors) || anchors.length < 3) return 0;
  let area = 0;
  for (let index = 0; index < anchors.length; index += 1) {
    const a = anchors[index];
    const b = anchors[(index + 1) % anchors.length];
    area += a.x * b.y - b.x * a.y;
  }
  return area / 2;
}

function bitmapFlattenPointInAnchorLoop(point, anchors) {
  if (!point || !Array.isArray(anchors) || anchors.length < 3) return false;
  let inside = false;
  for (let i = 0, j = anchors.length - 1; i < anchors.length; j = i++) {
    const xi = anchors[i].x;
    const yi = anchors[i].y;
    const xj = anchors[j].x;
    const yj = anchors[j].y;
    const crosses = (yi > point.y) !== (yj > point.y);
    if (!crosses) continue;
    const x = ((xj - xi) * (point.y - yi)) / ((yj - yi) || 1e-12) + xi;
    if (point.x < x) inside = !inside;
  }
  return inside;
}

function bitmapFlattenContourHierarchy(contours) {
  const entries = contours.map((contour, index) => ({
    ...contour,
    index,
    absArea: Math.abs(Number(contour.signedArea) || bitmapFlattenAnchorLoopArea(contour.anchors)),
    parentIndex: -1,
    depth: 0,
    holes: []
  }));

  for (const entry of entries) {
    const probe = entry.anchors?.[0];
    if (!probe) continue;
    let parent = null;
    for (const candidate of entries) {
      if (candidate === entry || candidate.absArea <= entry.absArea) continue;
      if (!bitmapFlattenPointInAnchorLoop(probe, candidate.anchors)) continue;
      if (!parent || candidate.absArea < parent.absArea) parent = candidate;
    }
    if (parent) entry.parentIndex = parent.index;
  }

  const depthFor = entry => {
    let depth = 0;
    let cursor = entry;
    const seen = new Set();
    while (cursor.parentIndex >= 0 && !seen.has(cursor.parentIndex)) {
      seen.add(cursor.parentIndex);
      depth += 1;
      cursor = entries[cursor.parentIndex];
    }
    return depth;
  };
  entries.forEach(entry => { entry.depth = depthFor(entry); });

  // Every odd-depth contour is a hole in its nearest even-depth ancestor.
  entries.filter(entry => entry.depth % 2 === 1).forEach(hole => {
    let parentIndex = hole.parentIndex;
    while (parentIndex >= 0 && entries[parentIndex].depth % 2 === 1) parentIndex = entries[parentIndex].parentIndex;
    if (parentIndex >= 0) entries[parentIndex].holes.push(hole);
  });

  return entries;
}

function bitmapFlattenMinimumTraceArea(settings = {}) {
  return Math.max(0, Number(settings?.minShapeArea) || 0);
}

function bitmapFlattenContourCentroid(contour) {
  const anchors = contour?.anchors || [];
  if (!anchors.length) return { x: 0, y: 0 };
  let x = 0, y = 0;
  for (const anchor of anchors) { x += anchor.x; y += anchor.y; }
  return { x: x / anchors.length, y: y / anchors.length };
}

function bitmapFlattenAppendContourSubpath(d, anchors) {
  if (!Array.isArray(anchors) || anchors.length < 2) return d;
  d += ` M ${anchors[0].x} ${anchors[0].y}`;
  for (let i = 1; i < anchors.length; i += 1) {
    const prev = anchors[i - 1];
    const curr = anchors[i];
    d += ` C ${prev.outX} ${prev.outY}, ${curr.inX} ${curr.inY}, ${curr.x} ${curr.y}`;
  }
  const last = anchors[anchors.length - 1];
  const first = anchors[0];
  d += ` C ${last.outX} ${last.outY}, ${first.inX} ${first.inY}, ${first.x} ${first.y} Z`;
  return d;
}

function bitmapFlattenEditableContourPath(contour, fill, name, transform, holes = [], extraContours = []) {
  const path = svgEl("path", {
    d: "",
    fill,
    stroke: "none",
    transform,
    "fill-rule": "evenodd",
    "clip-rule": "evenodd"
  });
  path.dataset.groupChild = "true";
  path.dataset.name = name;
  path.dataset.closed = contour.closed ? "true" : "false";
  path.dataset.editorPath = "true";
  path.dataset.hidden = "false";
  path.dataset.locked = "false";
  path.dataset.potraceEditablePath = "true";
  path.dataset.traceContourProxy = "false";
  path.dataset.potraceHasHoles = holes.length ? "true" : "false";
  path._anchors = contour.anchors.map(anchor => ({ ...anchor }));
  path._holeAnchors = holes.map(hole => hole.anchors.map(anchor => ({ ...anchor })));
  path._traceExtraContours = (extraContours || []).map(extra => ({
    anchors: (extra.anchors || []).map(anchor => ({ ...anchor })),
    holes: (extra.holes || []).map(hole => (hole.anchors || hole || []).map(anchor => ({ ...anchor })))
  }));
  path.dataset.potraceMergedIslands = path._traceExtraContours.length ? "true" : "false";
  updatePathD(path);
  return path;
}

function bitmapFlattenHoleContainsForeignRegionPixels(hole, ownMask, retainedCoverage, width, height) {
  const anchors = hole?.anchors;
  if (!Array.isArray(anchors) || anchors.length < 3 || !ownMask || !retainedCoverage) return false;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  anchors.forEach(anchor => {
    minX = Math.min(minX, anchor.x);
    minY = Math.min(minY, anchor.y);
    maxX = Math.max(maxX, anchor.x);
    maxY = Math.max(maxY, anchor.y);
  });
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return false;
  const startX = Math.max(0, Math.floor(minX) - 1);
  const startY = Math.max(0, Math.floor(minY) - 1);
  const endX = Math.min(width - 1, Math.ceil(maxX) + 1);
  const endY = Math.min(height - 1, Math.ceil(maxY) + 1);
  for (let y = startY; y <= endY; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      const index = y * width + x;
      if (!retainedCoverage[index] || ownMask[index]) continue;
      if (bitmapFlattenPointInAnchorLoop({ x: x + 0.5, y: y + 0.5 }, anchors)) return true;
    }
  }
  return false;
}

function bitmapFlattenResolveTraceHoles(contour, traceOptions = {}) {
  let holes = Array.isArray(contour?.holes) ? contour.holes : [];
  if (!holes.length) return holes;
  const minArea = bitmapFlattenMinimumTraceArea(traceOptions?.settings);
  if (minArea > 0) {
    holes = holes.filter(hole => {
      const area = Math.abs(Number(hole?.absArea) || bitmapFlattenAnchorLoopArea(hole?.anchors));
      return area >= minArea;
    });
  }
  if (!traceOptions?.stackedOpaque) return holes;
  const { ownMask, retainedCoverage, width, height } = traceOptions;
  if (!ownMask || !retainedCoverage || !width || !height) return holes;
  return holes.filter(hole => !bitmapFlattenHoleContainsForeignRegionPixels(
    hole,
    ownMask,
    retainedCoverage,
    width,
    height
  ));
}

function bitmapFlattenSyncEditableCompound() {
  // Potrace contours are normal visible editable paths. Hole contours are
  // encoded as even-odd subpaths on their owning outer path, never as extra
  // visible filled objects.
}

function bitmapFlattenAppendEditableTrace(group, d, fill, name, transform, settings = {}, traceOptions = {}) {
  const contours = bitmapFlattenPotraceContourAnchors(d, settings);
  if (!contours.length) {
    throw new Error("Potrace returned geometry that could not be converted into editable paths.");
  }

  const hierarchy = bitmapFlattenContourHierarchy(contours);
  const minArea = bitmapFlattenMinimumTraceArea(settings);
  const mergeArea = 0;
  const allOuters = hierarchy.filter(contour => contour.depth % 2 === 0);
  const surviving = allOuters.filter(contour => Math.abs(Number(contour.absArea) || 0) >= minArea);

  let roots = surviving;
  const mergedInto = new Map();
  if (mergeArea > 1 && surviving.length > 1) {
    const large = surviving.filter(contour => Math.abs(Number(contour.absArea) || 0) >= mergeArea);
    const small = surviving.filter(contour => Math.abs(Number(contour.absArea) || 0) < mergeArea);
    if (large.length) {
      roots = large;
      const rootCentres = large.map(contour => ({ contour, centre: bitmapFlattenContourCentroid(contour) }));
      for (const contour of small) {
        const centre = bitmapFlattenContourCentroid(contour);
        let best = null;
        let bestDistance = Infinity;
        for (const candidate of rootCentres) {
          const distance = Math.hypot(centre.x - candidate.centre.x, centre.y - candidate.centre.y);
          if (distance < bestDistance) { bestDistance = distance; best = candidate.contour; }
        }
        if (best) {
          if (!mergedInto.has(best.index)) mergedInto.set(best.index, []);
          mergedInto.get(best.index).push(contour);
        } else {
          roots.push(contour);
        }
      }
    }
  }

  let created = 0;
  roots.forEach((contour, index) => {
    const contourName = roots.length === 1 ? name : `${name} — path ${index + 1}`;
    const holes = bitmapFlattenResolveTraceHoles(contour, { ...traceOptions, settings });
    const extras = (mergedInto.get(contour.index) || []).map(extra => ({
      anchors: extra.anchors,
      holes: bitmapFlattenResolveTraceHoles(extra, { ...traceOptions, settings })
    }));
    const path = bitmapFlattenEditableContourPath(contour, fill, contourName, transform, holes, extras);
    group.appendChild(path);
    created += 1;
  });

  return { created, editable: true };
}


function bitmapFlattenMaskHasNeighbour(mask, width, height, x, y, radius = 1) {
  const cx = Math.max(0, Math.min(width - 1, Math.round(x)));
  const cy = Math.max(0, Math.min(height - 1, Math.round(y)));
  for (let oy = -radius; oy <= radius; oy += 1) {
    const yy = cy + oy;
    if (yy < 0 || yy >= height) continue;
    for (let ox = -radius; ox <= radius; ox += 1) {
      const xx = cx + ox;
      if (xx < 0 || xx >= width) continue;
      if (mask[yy * width + xx]) return true;
    }
  }
  return false;
}

function bitmapFlattenApplyInternalUnderlap(mask, width, height, result, factor) {
  // Stacked opaque shapes need a tiny amount of paint underlap at shared
  // internal boundaries. Potrace/Bezier fitting can otherwise retreat both
  // sides by a fraction of a source pixel and expose the darker lower layer
  // as a hairline halo. Expand by only ONE supersample cell (~0.5 source px
  // at 2x), and only where the original source is still opaque. This never
  // grows a transparent outer silhouette.
  if (!mask || factor < 2) return mask;
  const expanded = new Uint8Array(mask);
  const sourceWidth = result.width;
  const sourceHeight = result.height;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (mask[index]) continue;
      const sourceX = Math.max(0, Math.min(sourceWidth - 1, Math.floor((x + 0.5) / factor)));
      const sourceY = Math.max(0, Math.min(sourceHeight - 1, Math.floor((y + 0.5) / factor)));
      const sourceIndex = sourceY * sourceWidth + sourceX;
      const alpha = result.edgeAlpha?.[sourceIndex] ?? result.alpha?.[sourceIndex] ?? 0;
      if (alpha <= 8) continue;
      let touches = false;
      if (x > 0 && mask[index - 1]) touches = true;
      else if (x + 1 < width && mask[index + 1]) touches = true;
      else if (y > 0 && mask[index - width]) touches = true;
      else if (y + 1 < height && mask[index + width]) touches = true;
      if (touches) expanded[index] = 1;
    }
  }
  return expanded;
}

function bitmapFlattenSupersampledColourMask(result, paletteIndex, baseMask, scale = 2) {
  const factor = Math.max(1, Math.min(3, Math.round(scale) || 1));
  if (factor === 1) {
    const canvas = document.createElement("canvas");
    canvas.width = result.width; canvas.height = result.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const image = ctx.createImageData(result.width, result.height);
    for (let i = 0; i < baseMask.length; i += 1) {
      const value = baseMask[i] ? 0 : 255, o = i * 4;
      image.data[o] = image.data[o + 1] = image.data[o + 2] = value; image.data[o + 3] = 255;
    }
    const painterMask = bitmapFlattenFillEnclosedMaskHoles(new Uint8Array(baseMask), result.width, result.height);
    if (painterMask.some((value, index) => value !== baseMask[index])) {
      for (let i = 0; i < painterMask.length; i += 1) {
        const value = painterMask[i] ? 0 : 255, o = i * 4;
        image.data[o] = image.data[o + 1] = image.data[o + 2] = value; image.data[o + 3] = 255;
      }
      ctx.putImageData(image, 0, 0);
    } else {
      ctx.putImageData(image, 0, 0);
    }
    return { canvas, mask: painterMask, scale: 1 };
  }
  const width = result.width * factor, height = result.height * factor;
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const image = ctx.createImageData(width, height);
  const mask = new Uint8Array(width * height);
  // Use neutral nearest-colour ownership. The old negative bias expanded every
  // palette mask independently; with stacked shapes that could let a darker
  // under-layer peek out as a narrow outline around a foreground island.
  const bias = 0;
  for (let sy = 0; sy < height; sy += 1) {
    const y = (sy + 0.5) / factor - 0.5;
    for (let sx = 0; sx < width; sx += 1) {
      const x = (sx + 0.5) / factor - 0.5;
      const nearBase = bitmapFlattenMaskHasNeighbour(baseMask, result.width, result.height, x, y, 1);
      let on = false;
      if (nearBase) {
        // HARD PAINTER UNDERPAINT: bitmapFlattenPreparedColourMask may have
        // filled pixels which are visibly owned by another colour because that
        // colour is painted above this one (Japan flag: red disc over white
        // rectangle). Do not let sub-pixel colour-membership sampling reopen
        // those filled pixels. If the prepared base mask says this source pixel
        // belongs to the underpaint while the original assignment belongs to a
        // different palette colour, that coverage is intentional and must stay
        // opaque at every supersample. Only genuine boundary pixels belonging to
        // this palette use colour membership for sub-pixel edge refinement.
        const bx = Math.max(0, Math.min(result.width - 1, Math.round(x)));
        const by = Math.max(0, Math.min(result.height - 1, Math.round(y)));
        const bi = by * result.width + bx;
        const forcedUnderpaint = !!baseMask[bi] && result.alpha[bi] > 8 && result.assignments[bi] !== paletteIndex;
        if (forcedUnderpaint) on = true;
        else {
          const membership = bitmapFlattenColourMembership(result, paletteIndex, x, y);
          on = membership >= bias;
        }
      }
      const index = sy * width + sx, o = index * 4;
      mask[index] = on ? 1 : 0;
      const value = on ? 0 : 255;
      image.data[o] = image.data[o + 1] = image.data[o + 2] = value;
      image.data[o + 3] = 255;
    }
  }
  const underlappedMask = bitmapFlattenApplyInternalUnderlap(mask, width, height, result, factor);
  const painterMask = bitmapFlattenFillEnclosedMaskHoles(underlappedMask, width, height);
  for (let index = 0; index < painterMask.length; index += 1) {
    const o = index * 4;
    const value = painterMask[index] ? 0 : 255;
    image.data[o] = image.data[o + 1] = image.data[o + 2] = value;
    image.data[o + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return { canvas, mask: painterMask, scale: factor };
}

function bitmapFlattenScaleContours(contours, factor) {
  const scale = Number(factor) || 1;
  if (!Array.isArray(contours) || Math.abs(scale - 1) < 1e-9) return contours;
  for (const contour of contours) {
    for (const anchor of contour.anchors || []) {
      anchor.x *= scale; anchor.y *= scale;
      anchor.inX *= scale; anchor.inY *= scale;
      anchor.outX *= scale; anchor.outY *= scale;
    }
    contour.signedArea = bitmapFlattenAnchorLoopArea(contour.anchors);
  }
  return contours;
}

function bitmapFlattenOffsetContourOutward(contour, amount) {
  const anchors = contour?.anchors;
  const distance = Math.max(0, Number(amount) || 0);
  if (!Array.isArray(anchors) || anchors.length < 3 || distance <= 1e-6) return contour;
  const area = bitmapFlattenAnchorLoopArea(anchors);
  const clockwise = area >= 0;
  const moved = anchors.map((anchor, index) => {
    const prev = anchors[(index - 1 + anchors.length) % anchors.length];
    const next = anchors[(index + 1) % anchors.length];
    let tx = next.x - prev.x;
    let ty = next.y - prev.y;
    const len = Math.hypot(tx, ty) || 1;
    tx /= len; ty /= len;
    let nx = clockwise ? ty : -ty;
    let ny = clockwise ? -tx : tx;

    // Curved sections are where Potrace can still retreat far enough to reveal
    // the layer below. Increase the local coverage margin with turning angle,
    // while keeping straight runs close to the base distance.
    const v1x = anchor.x - prev.x, v1y = anchor.y - prev.y;
    const v2x = next.x - anchor.x, v2y = next.y - anchor.y;
    const l1 = Math.hypot(v1x, v1y) || 1;
    const l2 = Math.hypot(v2x, v2y) || 1;
    const dot = Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / (l1 * l2)));
    const turn = Math.acos(dot);
    const curveBoost = Math.min(0.85, Math.max(0, turn / (Math.PI * 0.55))) * 0.72;
    const localDistance = distance * (1 + curveBoost);

    // At sharp corners, a pure tangent normal can over-expand the vertex.
    // Blend with the radial direction from the local neighbour midpoint to
    // keep the offset conservative and stable on tight geometry.
    const mx = (prev.x + next.x) * 0.5;
    const my = (prev.y + next.y) * 0.5;
    let rx = anchor.x - mx, ry = anchor.y - my;
    const rl = Math.hypot(rx, ry);
    if (rl > 1e-6) {
      rx /= rl; ry /= rl;
      if (rx * nx + ry * ny < 0) { rx = -rx; ry = -ry; }
      nx = nx * 0.8 + rx * 0.2;
      ny = ny * 0.8 + ry * 0.2;
      const nl = Math.hypot(nx, ny) || 1;
      nx /= nl; ny /= nl;
    }
    const dx = nx * localDistance, dy = ny * localDistance;
    return {
      ...anchor,
      x: anchor.x + dx,
      y: anchor.y + dy,
      inX: anchor.inX + dx,
      inY: anchor.inY + dy,
      outX: anchor.outX + dx,
      outY: anchor.outY + dy
    };
  });
  contour.anchors = moved;
  contour.signedArea = bitmapFlattenAnchorLoopArea(moved);
  contour.absArea = Math.abs(contour.signedArea);
  return contour;
}

function bitmapFlattenApplyStackCoverageOffset(node, componentState, settings = {}) {
  if (!node || !componentState) return;
  const z = Number(node.inferredZIndex) || 0;
  if (z <= 0) return;
  const component = node.componentId >= 0 ? componentState.components[node.componentId] : null;
  if (!component?.bounds) return;
  const b = component.bounds;
  const touchesOuter = b.minX <= 0 || b.minY <= 0 || b.maxX >= componentState.width - 1 || b.maxY >= componentState.height - 1;
  if (touchesOuter) return;
  // Only offset shapes which are known/suspected to paint over something
  // below them. Explicit incoming stack evidence is strongest; for fallback
  // ordering, a non-base fully interior island still benefits from a smaller
  // coverage margin.
  const hasIncoming = (node.stackIncoming?.size || 0) > 0;
  const detail = Math.max(0, Math.min(100, Number(settings?.detail) || 70));
  const amount = (hasIncoming ? 0.42 : 0.24) * (0.9 + (100 - detail) / 500);
  bitmapFlattenOffsetContourOutward(node.contour, amount);
  // Merged same-colour islands are separate visible contours and need the
  // same tiny coverage allowance when they share this foreground z-level.
  for (const extra of node.extraContours || []) {
    bitmapFlattenOffsetContourOutward(extra, amount);
  }
}


function bitmapFlattenRectAnchors(x0, y0, x1, y1) {
  return [
    { x:x0, y:y0, inX:x0, inY:y0, outX:x0, outY:y0 },
    { x:x1, y:y0, inX:x1, inY:y0, outX:x1, outY:y0 },
    { x:x1, y:y1, inX:x1, inY:y1, outX:x1, outY:y1 },
    { x:x0, y:y1, inX:x0, inY:y1, outX:x0, outY:y1 }
  ];
}

function bitmapFlattenClusterPrimitiveEdges(values, tolerance = 2) {
  if (!values.length) return [];
  const counts = new Map();
  values.forEach(value => counts.set(value, (counts.get(value) || 0) + 1));
  const entries = [...counts].map(([value,count]) => ({ value:Number(value), count })).sort((a,b)=>a.value-b.value);
  const clusters = [];
  for (const entry of entries) {
    const last = clusters[clusters.length - 1];
    if (last && entry.value - last.max <= tolerance) {
      last.items.push(entry); last.max = entry.value; last.weight += entry.count;
    } else {
      clusters.push({ items:[entry], min:entry.value, max:entry.value, weight:entry.count });
    }
  }
  return clusters.map(cluster => {
    const ordered = cluster.items.slice().sort((a,b)=>b.count-a.count || a.value-b.value);
    return ordered[0].value;
  });
}

function bitmapFlattenNearestPrimitiveEdge(value, edges) {
  let best = value, distance = Infinity;
  for (const edge of edges) {
    const d = Math.abs(edge - value);
    if (d < distance) { distance = d; best = edge; }
  }
  return best;
}

function bitmapFlattenPrimitiveStructuralMask(componentId, componentState, bounds) {
  const { width, labels } = componentState;
  const w = bounds.maxX - bounds.minX + 1;
  const h = bounds.maxY - bounds.minY + 1;
  let mask = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      mask[y * w + x] = labels[(bounds.minY + y) * width + bounds.minX + x] === componentId ? 1 : 0;
    }
  }

  // Primitive inference should see through low-quality raster damage rather
  // than model it. A tiny, size-adaptive majority pass removes single-pixel
  // JPEG/antialias burrs while retaining meaningful bars, counters and gaps.
  const minDim = Math.max(1, Math.min(w, h));
  const passes = minDim >= 28 ? 2 : 1;
  for (let pass = 0; pass < passes; pass += 1) {
    const next = new Uint8Array(mask);
    for (let y = 1; y < h - 1; y += 1) {
      for (let x = 1; x < w - 1; x += 1) {
        let count = 0;
        for (let oy = -1; oy <= 1; oy += 1) {
          for (let ox = -1; ox <= 1; ox += 1) count += mask[(y + oy) * w + x + ox];
        }
        const idx = y * w + x;
        // Strong majority only: do not close narrow intentional negative space.
        if (!mask[idx] && count >= 7) next[idx] = 1;
        else if (mask[idx] && count <= 2) next[idx] = 0;
      }
    }
    mask = next;
  }
  return { mask, width:w, height:h };
}

function bitmapFlattenRectangleUnionForComponent(componentId, componentState, settings = {}) {
  const component = componentState?.components?.[componentId];
  if (!component?.bounds || component.pixelCount < 16) return null;
  const { width, height, labels } = componentState;
  const b = component.bounds;
  const structural = bitmapFlattenPrimitiveStructuralMask(componentId, componentState, b);
  const rawRows = [];
  const xEdges = [];
  for (let ly = 0; ly < structural.height; ly += 1) {
    const y = b.minY + ly;
    const runs = [];
    let lx = 0;
    while (lx < structural.width) {
      while (lx < structural.width && !structural.mask[ly * structural.width + lx]) lx += 1;
      if (lx >= structural.width) break;
      const x0 = b.minX + lx;
      while (lx < structural.width && structural.mask[ly * structural.width + lx]) lx += 1;
      const x1 = b.minX + lx;
      runs.push([x0, x1]);
      xEdges.push(x0, x1);
    }
    rawRows.push({ y, runs });
  }
  if (!rawRows.some(row => row.runs.length)) return null;

  // Low-quality bitmaps often move the same intended vertical edge by several
  // pixels from row to row. Cluster those observations relative to object size
  // instead of demanding literal pixel equality.
  const minDim = Math.max(1, Math.min(b.maxX-b.minX+1, b.maxY-b.minY+1));
  const qualityTolerance = Math.max(1, Math.min(6, Math.round(minDim * 0.025)));
  const clusteredEdges = bitmapFlattenClusterPrimitiveEdges(xEdges, qualityTolerance);
  if (clusteredEdges.length > 20) return null;

  const rows = rawRows.map(row => ({
    y: row.y,
    runs: row.runs.map(([x0,x1]) => [
      bitmapFlattenNearestPrimitiveEdge(x0, clusteredEdges),
      bitmapFlattenNearestPrimitiveEdge(x1, clusteredEdges)
    ]).filter(([x0,x1]) => x1 > x0)
  }));

  const rectangles = [];
  let active = new Map();
  for (const row of rows) {
    const current = new Map();
    for (const [x0,x1] of row.runs) {
      const key = `${x0}:${x1}`;
      const previous = active.get(key);
      if (previous) { previous.y1 = row.y + 1; current.set(key, previous); }
      else { const rect = { x0, x1, y0:row.y, y1:row.y+1 }; rectangles.push(rect); current.set(key, rect); }
    }
    active = current;
  }

  let compact = rectangles.filter(r => r.x1-r.x0 >= 1 && r.y1-r.y0 >= 1);
  // Merge tiny vertical discontinuities produced by raster noise when the
  // intended rectangle has the same snapped left/right edges.
  compact.sort((a,b)=>a.x0-b.x0 || a.x1-b.x1 || a.y0-b.y0);
  const merged = [];
  for (const r of compact) {
    const prev = merged[merged.length - 1];
    if (prev && prev.x0 === r.x0 && prev.x1 === r.x1 && r.y0 - prev.y1 <= qualityTolerance) prev.y1 = r.y1;
    else merged.push({ ...r });
  }
  compact = merged;
  if (!compact.length || compact.length > 18) return null;

  let structuralIntersection = 0, structuralUnion = 0;
  let rawIntersection = 0, rawUnion = 0, rawXor = 0;
  for (let y = b.minY; y <= b.maxY; y += 1) {
    for (let x = b.minX; x <= b.maxX; x += 1) {
      let predicted = false;
      for (const r of compact) {
        if (x + 0.5 >= r.x0 && x + 0.5 < r.x1 && y + 0.5 >= r.y0 && y + 0.5 < r.y1) { predicted = true; break; }
      }
      const si = (y-b.minY) * structural.width + (x-b.minX);
      const intended = !!structural.mask[si];
      const actual = labels[y * width + x] === componentId;
      if (intended && predicted) structuralIntersection += 1;
      if (intended || predicted) structuralUnion += 1;
      if (actual && predicted) rawIntersection += 1;
      if (actual || predicted) rawUnion += 1;
      if (actual !== predicted) rawXor += 1;
    }
  }
  const structuralIou = structuralUnion ? structuralIntersection / structuralUnion : 0;
  const rawIou = rawUnion ? rawIntersection / rawUnion : 0;
  const rawRelativeError = rawXor / Math.max(1, component.pixelCount);

  // Decide from intended structure, then use the noisy raster only as a sanity
  // constraint. This lets a clean primitive beat blur/JPEG damage without
  // allowing an unrelated boxy model to replace the component.
  // Reconstruction mode should prefer a compact clean explanation over literal
  // reproduction of low-quality edge damage. Keep a meaningful raw-raster guard,
  // but let the denoised structural model drive acceptance.
  if (structuralIou < 0.92 || rawIou < 0.78 || rawRelativeError > 0.28) return null;

  const useful = compact.every(r => {
    const area = (r.x1-r.x0) * (r.y1-r.y0);
    const longSide = Math.max(r.x1-r.x0, r.y1-r.y0);
    return area >= component.pixelCount * 0.010 || longSide >= Math.max(4, Math.sqrt(component.pixelCount) * 0.16);
  });
  if (!useful) return null;
  return { rectangles: compact, iou:rawIou, structuralIou, relativeError:rawRelativeError };
}


function bitmapFlattenPrimitiveGuideClusters(componentId, componentState) {
  const component = componentState?.components?.[componentId];
  if (!component?.bounds) return null;
  const b = component.bounds;
  const structural = bitmapFlattenPrimitiveStructuralMask(componentId, componentState, b);
  const xObservations = [], yObservations = [];
  const w = structural.width, h = structural.height, mask = structural.mask;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (!mask[y*w+x]) continue;
      if (x === 0 || !mask[y*w+x-1]) xObservations.push(b.minX + x);
      if (x === w-1 || !mask[y*w+x+1]) xObservations.push(b.minX + x + 1);
      if (y === 0 || !mask[(y-1)*w+x]) yObservations.push(b.minY + y);
      if (y === h-1 || !mask[(y+1)*w+x]) yObservations.push(b.minY + y + 1);
    }
  }
  const minDim = Math.max(1, Math.min(w,h));
  const tolerance = Math.max(1, Math.min(6, Math.round(minDim * 0.028)));
  const weightedClusters = values => {
    if (!values.length) return [];
    const counts = new Map();
    values.forEach(v => counts.set(v,(counts.get(v)||0)+1));
    const entries=[...counts].map(([value,count])=>({value:+value,count})).sort((a,b)=>a.value-b.value);
    const groups=[];
    for (const e of entries) {
      const last=groups.at(-1);
      if (last && e.value-last.max <= tolerance) {
        last.items.push(e); last.max=e.value; last.weight += e.count;
      } else groups.push({items:[e],min:e.value,max:e.value,weight:e.count});
    }
    return groups.map(g=>{
      const total=g.items.reduce((n,e)=>n+e.count,0);
      const value=g.items.reduce((n,e)=>n+e.value*e.count,0)/Math.max(1,total);
      return {value,weight:g.weight};
    }).sort((a,b)=>b.weight-a.weight);
  };
  const minSupport = Math.max(3, Math.round(minDim * 0.12));
  const xs = weightedClusters(xObservations).filter(g=>g.weight>=minSupport).slice(0,12).map(g=>g.value).sort((a,b)=>a-b);
  const ys = weightedClusters(yObservations).filter(g=>g.weight>=minSupport).slice(0,12).map(g=>g.value).sort((a,b)=>a-b);
  return { xs, ys, tolerance, bounds:b };
}

function bitmapFlattenApplyHybridPrimitiveGuides(contour, guides, settings = {}) {
  if (!contour?.anchors?.length || !guides) return 0;
  const anchors=contour.anchors;
  const count=anchors.length;
  const closed=contour.closed !== false;
  const segmentCount=closed ? count : count-1;
  const geometryScale=bitmapFlattenGeometryToleranceScale(settings);
  const detail=Math.max(0,Math.min(100,Number(settings.detail)||70));
  const sensitivity=Math.max(0,Math.min(100,Number(settings.hybridPrimitiveSensitivity) || 50));
  const sensitivity01=sensitivity/100;
  // Sensitivity controls how much evidence is needed before a mixed/freeform
  // island segment is promoted to exact primitive geometry. At 0 the pass is
  // deliberately strict; at 100 it tolerates more raster wobble and guide
  // displacement while retaining the existing curve-linearity veto.
  const baseAngle=(detail>=85?3.0:detail>=60?4.5:6.0);
  const baseSnap=(detail>=85?0.8:detail>=60?1.25:1.8);
  const baseCurve=(detail>=85?0.22:detail>=60?0.34:0.48);
  const angleTolerance=(baseAngle*(0.62 + sensitivity01*0.90))*Math.PI/180;
  const maxSnap=(baseSnap*(0.55 + sensitivity01*1.15))*geometryScale;
  const curveTolerance=(baseCurve*(0.58 + sensitivity01*1.05))*geometryScale;
  const minRunLength=(3.4 - 1.8*sensitivity01)*geometryScale;
  let changed=0;
  const nearest=(value,list)=>{
    let best=null,dist=Infinity;
    for (const v of list||[]) { const d=Math.abs(v-value); if(d<dist){dist=d;best=v;} }
    return dist<=maxSnap?best:null;
  };
  for(let i=0;i<segmentCount;i+=1){
    const j=(i+1)%count, a=anchors[i], b=anchors[j];
    const dx=b.x-a.x, dy=b.y-a.y, len=Math.hypot(dx,dy);
    if(len < minRunLength) continue;
    const angle=Math.atan2(dy,dx);
    const hErr=Math.min(Math.abs(angle),Math.abs(Math.PI-Math.abs(angle)));
    const vErr=Math.abs(Math.PI/2-Math.abs(angle));
    let orientation=null;
    if(hErr<=angleTolerance) orientation='h';
    else if(vErr<=angleTolerance) orientation='v';
    else continue;
    // Only primitive-snap spans whose rendered cubic is already convincingly
    // line-like. This permits exact bars inside mixed curved islands without
    // boxifying bowls/arcs.
    let maxDev=0;
    for(const t of [0.2,0.4,0.6,0.8]) maxDev=Math.max(maxDev,bitmapFlattenPointLineDistance(bitmapFlattenCubicSample(a,b,t),a,b));
    if(maxDev>curveTolerance) continue;
    if(orientation==='h'){
      const target=nearest((a.y+b.y)/2,guides.ys);
      if(target==null) continue;
      const da=target-a.y, db=target-b.y;
      a.y=target; a.inY+=da; a.outY+=da;
      b.y=target; b.inY+=db; b.outY+=db;
      a.outX=a.x; a.outY=a.y; b.inX=b.x; b.inY=b.y;
      changed+=1;
    } else {
      const target=nearest((a.x+b.x)/2,guides.xs);
      if(target==null) continue;
      const da=target-a.x, db=target-b.x;
      a.x=target; a.inX+=da; a.outX+=da;
      b.x=target; b.inX+=db; b.outX+=db;
      a.outX=a.x; a.outY=a.y; b.inX=b.x; b.inY=b.y;
      changed+=1;
    }
  }
  if(changed) contour.signedArea=bitmapFlattenAnchorLoopArea(anchors);
  return changed;
}


function bitmapFlattenAxisSnapContour(contour, settings = {}) {
  if (!settings?.axisSnap || !contour?.anchors?.length) return 0;
  const anchors = contour.anchors;
  const count = anchors.length;
  const closed = contour.closed !== false;
  const segmentCount = closed ? count : count - 1;
  if (segmentCount < 1) return 0;
  const geometryScale = bitmapFlattenGeometryToleranceScale(settings);
  const sensitivity = Math.max(0, Math.min(100, Number(settings.axisSnapSensitivity) || 50)) / 100;
  // Conservative at the low end; deliberately more forgiving of low-quality
  // bitmap wobble toward 100. Curve sampling still vetoes genuine arcs.
  const angleTolerance = (0.65 + sensitivity * 7.35) * Math.PI / 180;
  const curveTolerance = (0.10 + sensitivity * 0.58) * geometryScale;
  const minRunLength = (4.2 - sensitivity * 2.4) * geometryScale;
  const constraints = Array.from({ length: count }, () => ({ xs: [], ys: [] }));
  const accepted = [];

  for (let i = 0; i < segmentCount; i += 1) {
    const j = (i + 1) % count;
    const a = anchors[i], b = anchors[j];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < minRunLength) continue;
    const angle = Math.atan2(dy, dx);
    const hErr = Math.min(Math.abs(angle), Math.abs(Math.PI - Math.abs(angle)));
    const vErr = Math.abs(Math.PI / 2 - Math.abs(angle));
    const orientation = hErr <= angleTolerance ? 'h' : (vErr <= angleTolerance ? 'v' : null);
    if (!orientation) continue;

    // Rendered cubic must remain close to its chord. Progressive curvature is
    // additionally rejected by comparing local sample tangents.
    let maxDev = 0;
    const pts = [0, .2, .4, .6, .8, 1].map(t => bitmapFlattenCubicSample(a, b, t));
    for (let k = 1; k < pts.length - 1; k += 1) {
      maxDev = Math.max(maxDev, bitmapFlattenPointLineDistance(pts[k], a, b));
    }
    if (maxDev > curveTolerance) continue;
    let cumulativeTurn = 0;
    let previousAngle = null;
    for (let k = 1; k < pts.length; k += 1) {
      const sx = pts[k].x - pts[k - 1].x, sy = pts[k].y - pts[k - 1].y;
      if (Math.hypot(sx, sy) < 1e-6) continue;
      const tangent = Math.atan2(sy, sx);
      if (previousAngle != null) {
        let d = tangent - previousAngle;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        cumulativeTurn += Math.abs(d);
      }
      previousAngle = tangent;
    }
    const maxTurn = (1.8 + sensitivity * 3.2) * Math.PI / 180;
    if (cumulativeTurn > maxTurn) continue;

    if (orientation === 'h') {
      const target = (a.y + b.y) / 2;
      constraints[i].ys.push(target); constraints[j].ys.push(target);
    } else {
      const target = (a.x + b.x) / 2;
      constraints[i].xs.push(target); constraints[j].xs.push(target);
    }
    accepted.push({ i, j, orientation });
  }
  if (!accepted.length) return 0;

  // Solve shared corners once so a horizontal and vertical snapped edge meet
  // cleanly at exactly one axis-aligned corner.
  for (let i = 0; i < count; i += 1) {
    const c = constraints[i], a = anchors[i];
    let nx = a.x, ny = a.y;
    if (c.xs.length) nx = c.xs.reduce((n, v) => n + v, 0) / c.xs.length;
    if (c.ys.length) ny = c.ys.reduce((n, v) => n + v, 0) / c.ys.length;
    const mx = nx - a.x, my = ny - a.y;
    if (Math.abs(mx) < 1e-9 && Math.abs(my) < 1e-9) continue;
    a.x = nx; a.y = ny;
    a.inX += mx; a.inY += my;
    a.outX += mx; a.outY += my;
  }
  for (const seg of accepted) {
    const a = anchors[seg.i], b = anchors[seg.j];
    if (seg.orientation === 'h') {
      const y = (a.y + b.y) / 2;
      a.y = y; b.y = y;
    } else {
      const x = (a.x + b.x) / 2;
      a.x = x; b.x = x;
    }
    // Exact line segment; adjoining curved handles remain untouched.
    a.outX = a.x; a.outY = a.y;
    b.inX = b.x; b.inY = b.y;
  }
  contour.signedArea = bitmapFlattenAnchorLoopArea(anchors);
  return accepted.length;
}

function bitmapFlattenApplyAxisSnapToNodes(nodes, settings = {}) {
  if (!settings?.axisSnap) return 0;
  let changed = 0;
  for (const node of nodes || []) {
    changed += bitmapFlattenAxisSnapContour(node.contour, settings);
    for (const hole of node.holes || []) changed += bitmapFlattenAxisSnapContour(hole, settings);
  }
  return changed;
}

function bitmapFlattenApplyHybridPrimitiveGuidesToNodes(nodes, componentState, settings = {}) {
  if (settings?.mode !== 'reconstruct') return 0;
  let islands=0;
  for(const node of nodes||[]){
    const guides=bitmapFlattenPrimitiveGuideClusters(node.componentId,componentState);
    if(!guides || (guides.xs.length<2 && guides.ys.length<2)) continue;
    let changes=bitmapFlattenApplyHybridPrimitiveGuides(node.contour,guides,settings);
    for(const hole of node.holes||[]) changes += bitmapFlattenApplyHybridPrimitiveGuides(hole,guides,settings);
    if(changes){ node.primitiveHybrid=true; node.primitiveHybridSegments=changes; islands+=1; }
  }
  return islands;
}

function bitmapFlattenForcePainterSolidPath(path) {
  if (!path) return path;
  // Painter-stack invariant for colour/reconstruction output: an island may
  // never encode negative space internally. All visible openings must be
  // represented by separate sibling islands above this path. Strip every
  // compound-hole carrier immediately before/after emission and use nonzero
  // fill so even-odd cancellation cannot recreate a punch-out later.
  path._holeAnchors = [];
  if (Array.isArray(path._traceExtraContours)) {
    path._traceExtraContours = path._traceExtraContours.map(extra => ({
      anchors: Array.isArray(extra?.anchors) ? extra.anchors : [],
      holes: []
    }));
  }
  path.dataset.potraceHasHoles = "false";
  path.setAttribute("fill-rule", "nonzero");
  path.setAttribute("clip-rule", "nonzero");
  updatePathD(path);
  return path;
}

function bitmapFlattenEditableRectangleUnionPath(model, fill, name, transform) {
  const rects = model?.rectangles || [];
  if (!rects.length) return null;
  const contour = { closed:true, anchors:bitmapFlattenRectAnchors(rects[0].x0, rects[0].y0, rects[0].x1, rects[0].y1) };
  const extras = rects.slice(1).map(rect => ({ anchors:bitmapFlattenRectAnchors(rect.x0, rect.y0, rect.x1, rect.y1), holes:[] }));
  const path = bitmapFlattenEditableContourPath(contour, fill, name, transform, [], extras);
  // Overlapping same-winding rectangle subpaths are a geometric union under
  // nonzero fill. Even-odd would incorrectly cancel their intersections.
  path.setAttribute("fill-rule", "nonzero");
  path.setAttribute("clip-rule", "nonzero");
  path.dataset.vectorizerPrimitive = "rectangle-union";
  path.dataset.vectorizerPrimitiveCount = String(rects.length);
  path.dataset.vectorizerPrimitiveIou = String(model.iou || 0);
  updatePathD(path);
  return path;
}

function bitmapFlattenPainterOrderNodes(nodes, result) {
  const list = [...(nodes || [])];
  if (list.length < 2) return list.map((node, inferredZIndex) => ({ ...node, inferredZIndex }));
  const indexByComponent = new Map();
  list.forEach((node, index) => { if (node.componentId >= 0) indexByComponent.set(node.componentId, index); });
  const outgoing = list.map(() => new Set());
  const indegree = new Array(list.length).fill(0);
  for (const edge of result?._painterAboveEdges || []) {
    const [baseId, aboveId] = String(edge).split('>').map(Number);
    const a = indexByComponent.get(baseId), b = indexByComponent.get(aboveId);
    if (a == null || b == null || a === b || outgoing[a].has(b)) continue;
    outgoing[a].add(b); indegree[b] += 1;
  }
  const fallbackCompare = (ia, ib) => {
    const a=list[ia], b=list[ib];
    return ((b.lockedStackArea ?? b.area) - (a.lockedStackArea ?? a.area)) ||
      (a.paletteIndex - b.paletteIndex) || ((a.componentIndex || 0) - (b.componentIndex || 0));
  };
  const ready=[];
  indegree.forEach((d,i)=>{ if(!d) ready.push(i); });
  ready.sort(fallbackCompare);
  const ordered=[];
  while(ready.length){
    const i=ready.shift(); ordered.push(list[i]);
    for(const j of outgoing[i]){
      indegree[j]-=1;
      if(indegree[j]===0){ ready.push(j); ready.sort(fallbackCompare); }
    }
  }
  if(ordered.length<list.length){
    const seen=new Set(ordered);
    list.filter(n=>!seen.has(n)).sort((a,b)=>((b.lockedStackArea??b.area)-(a.lockedStackArea??a.area))).forEach(n=>ordered.push(n));
  }
  return ordered.map((node,inferredZIndex)=>({ ...node, inferredZIndex }));
}

async function bitmapFlattenVectorGroup(source, result) {
  if (result?.settings?.paint === "gradient") {
    const gradientResult = await bitmapFlattenGradientVectorGroup(source, result);
    if (gradientResult) return gradientResult;
  }
  if (!bitmapFlattenPotraceReady()) {
    throw new Error("Potrace failed to load; conversion was not attempted.");
  }
  const traceFn = window.PotracePlus;
  const sourceX = Number(source.getAttribute("x")) || 0;
  const sourceY = Number(source.getAttribute("y")) || 0;
  const sourceWidth = Math.max(1e-6, Number(source.getAttribute("width")) || result.width);
  const sourceHeight = Math.max(1e-6, Number(source.getAttribute("height")) || result.height);
  const scaleX = sourceWidth / result.width;
  const scaleY = sourceHeight / result.height;

  const group = document.createElementNS(SVG_NS, "g");
  objectCounter += 1;
  group.dataset.object = "true";
  group.dataset.group = "true";
  group.dataset.tx = source.dataset.tx || "0";
  group.dataset.ty = source.dataset.ty || "0";
  group.dataset.rotation = source.dataset.rotation || "0";
  group.dataset.scaleX = source.dataset.scaleX || "1";
  group.dataset.scaleY = source.dataset.scaleY || "1";
  group.dataset.hidden = "false";
  group.dataset.locked = "false";

  const options = bitmapFlattenPotraceOptions(result.settings || {});
  const analysis = bitmapFlattenImageAnalysis(result);
  const paletteRegions = bitmapFlattenPaletteRegions(result);
  const useLogoMode = bitmapFlattenShouldUseLogoMode(result, analysis);
  let created = 0;
  let primitiveCreated = 0;
  let hybridCreated = 0;

  if (useLogoMode) {
    const logo = bitmapFlattenLogoMask(result, analysis);
    const accurateTrace = await bitmapFlattenTraceWithAccuracyRetry(
      traceFn,
      logo.canvas,
      options,
      bitmapFlattenMaskFromBinaryCanvas(logo.canvas),
      result.settings || {}
    );
    const traced = accurateTrace.traced;
    const d = accurateTrace.d;
    if (!d || !String(d).trim()) throw new Error("Potrace could not find a foreground silhouette in this image.");
    const appended = bitmapFlattenAppendEditableTrace(
      group,
      String(d),
      bitmapFlattenPaletteHex(logo.fill),
      "Logo silhouette — Potrace",
      `translate(${sourceX} ${sourceY}) scale(${scaleX} ${scaleY})`,
      result.settings || {}
    );
    group.dataset.name = `${source.dataset.name || "Image"} — Potrace logo silhouette`;
    group.dataset.traceMode = "logo";
    created = appended.created;
  } else {
    const mask = document.createElement("canvas");
    mask.width = result.width;
    mask.height = result.height;
    const ctx = mask.getContext("2d", { willReadFrequently: true });
    const image = ctx.createImageData(result.width, result.height);

    const componentState = bitmapFlattenLabelRasterComponents(result);
    componentState.width = result.width;
    componentState.height = result.height;
    const traceNodes = [];
    const minArea = bitmapFlattenMinimumTraceArea(result.settings || {});

    // Trace each palette exactly once. Potrace's contour hierarchy gives us the
    // individual connected outlines and their holes without a full-image trace
    // for every component.
    for (const region of paletteRegions) {
      const regionMask = bitmapFlattenPreparedColourMask(result, region.paletteIndex);
      if (regionMask.pixelCount < 2) continue;
      const supersampleScale = Math.max(result.width, result.height) <= 2200 ? 2 : 1;
      const traceMask = bitmapFlattenSupersampledColourMask(
        result,
        region.paletteIndex,
        regionMask.mask,
        supersampleScale
      );
      const accurateTrace = await bitmapFlattenTraceWithAccuracyRetry(
        traceFn,
        traceMask.canvas,
        options,
        traceMask.mask,
        result.settings || {}
      );
      const d = accurateTrace.d;
      if (!d || !String(d).trim()) continue;
      const contours = bitmapFlattenPotraceContourAnchors(String(d), result.settings || {});
      if (!contours.length) continue;
      bitmapFlattenScaleContours(contours, 1 / traceMask.scale);
      bitmapFlattenRefineContoursToColourBoundary(contours, result, region.paletteIndex);
      bitmapFlattenRegularizeContoursGeometry(contours, result, region.paletteIndex);

      // STRICT PAINTER MODEL (v73): colour reconstruction never carries holes
      // or punch-outs. Potrace may detect inner contours, but we deliberately
      // keep only even-depth outer contours and emit each as a completely solid
      // island. Overlap is represented solely by SVG paint order.
      const preSimplifyHierarchy = bitmapFlattenContourHierarchy(contours);
      const solidSourceIndices = preSimplifyHierarchy
        .filter(contour => contour.depth % 2 === 0)
        .map(contour => contour._traceSourceIndex ?? contour.index);

      bitmapFlattenSmoothCurvedContours(contours, result.settings || {});
      const hierarchy = bitmapFlattenContourHierarchy(contours);
      const bySourceIndex = new Map();
      for (const contour of hierarchy) {
        const sourceIndex = contour._traceSourceIndex ?? contour.index;
        bySourceIndex.set(sourceIndex, contour);
      }

      const usedComponents = new Set();
      for (const sourceIndex of solidSourceIndices) {
        const contour = bySourceIndex.get(sourceIndex);
        if (!contour) continue;
        const area = Math.abs(Number(contour.absArea) || bitmapFlattenAnchorLoopArea(contour.anchors));
        if (area < minArea) continue;
        const component = bitmapFlattenMatchContourComponent(contour, region.paletteIndex, componentState, usedComponents);
        if (component?.id >= 0) usedComponents.add(component.id);
        traceNodes.push({
          contour,
          holes: [],
          extraContours: [],
          paletteIndex: region.paletteIndex,
          componentId: component?.id ?? -1,
          componentIndex: component
            ? componentState.components.filter(c => c.paletteIndex === region.paletteIndex && c.id <= component.id).length - 1
            : 0,
          color: region.color,
          area,
          lockedStackArea: component?.pixelCount ?? area,
          foreignComponentIds: new Set(),
          strictPainterSolid: true
        });
      }
    }

    bitmapFlattenApplyHybridPrimitiveGuidesToNodes(traceNodes, componentState, result.settings || {});
    bitmapFlattenGlobalAlignTraceNodes(traceNodes, result.settings || {});
    bitmapFlattenFlattenResidualLineWaves(traceNodes, result.settings || {});
    bitmapFlattenApplyAxisSnapToNodes(traceNodes, result.settings || {});
    // Painter order comes first from explicit occlusion completion evidence:
    // when component B was used to restore hidden coverage of component A, B
    // must be painted above A. Area is only a fallback for unrelated islands.
    let orderedNodes = bitmapFlattenPainterOrderNodes(traceNodes, result);

    // Small-island merging happens at the raster-assignment stage so the
    // island is genuinely absorbed into the surrounding larger region colour.

    for (let nodeIndex = 0; nodeIndex < orderedNodes.length; nodeIndex += 1) {
      const node = orderedNodes[nodeIndex];
      bitmapFlattenApplyStackCoverageOffset(node, componentState, result.settings || {});
      const hex = bitmapFlattenPaletteHex(node.color);
      const pathName = `Colour ${node.paletteIndex + 1} component ${Number(node.componentIndex || 0) + 1} — ${hex.toUpperCase()}`;
      const pathTransform = `translate(${sourceX} ${sourceY}) scale(${scaleX} ${scaleY})`;
      const primitiveModel = result.settings?.mode === "reconstruct" && !(node.holes || []).length
        ? bitmapFlattenRectangleUnionForComponent(node.componentId, componentState, result.settings || {})
        : null;
      let path = primitiveModel
        ? bitmapFlattenEditableRectangleUnionPath(primitiveModel, hex, `${pathName} — reconstructed rectangles`, pathTransform)
        : bitmapFlattenEditableContourPath(
            node.contour,
            hex,
            pathName,
            pathTransform,
            [],
            (node.extraContours || []).map(extra => ({ ...extra, holes: [] }))
          );
      path = bitmapFlattenForcePainterSolidPath(path);
      if (primitiveModel && path) primitiveCreated += 1;
      else if (node.primitiveHybrid && path) {
        hybridCreated += 1;
        path.dataset.vectorizerPrimitive = "hybrid-rectilinear";
        path.dataset.vectorizerPrimitiveSegments = String(node.primitiveHybridSegments || 0);
      }
      path.dataset.inferredZIndex = String(node.inferredZIndex ?? nodeIndex);
      path.dataset.paletteIndex = String(node.paletteIndex);
      path.dataset.paletteComponentIndex = String(node.componentIndex ?? 0);
      group.appendChild(path);
      created += 1;
    }
    const reconstructMode = result.settings?.mode === "reconstruct";
    group.dataset.name = `${source.dataset.name || "Image"} — ${reconstructMode ? "Reconstructed" : "Potrace"} ${paletteRegions.length} colours`;
    group.dataset.traceMode = reconstructMode ? "reconstruct" : "colour";
    group.dataset.painterTopology = "safe-enclosed-underpaint-v78";
  }

  if (!created) throw new Error("No vector regions could be created from this bitmap.");
  // Final belt-and-braces check: later geometry passes must never be able to
  // reintroduce a compound knockout into painter-stack colour output.
  if (group.dataset.traceMode === "colour" || group.dataset.traceMode === "reconstruct") {
    for (const path of group.querySelectorAll('path[data-editor-path="true"]')) {
      bitmapFlattenForcePainterSolidPath(path);
    }
  }
  group.dataset.vectorizerPrimitiveCount = String(primitiveCreated);
  group.dataset.vectorizerHybridCount = String(hybridCreated);
  group.dataset.vectorizerTracedCount = String(Math.max(0, created - primitiveCreated - hybridCreated));
  group.dataset.vectorizerBuild = "v80";
  applyObjectTransform(group);
  return { group, created, primitiveCreated, hybridCreated, tracedCreated: Math.max(0, created - primitiveCreated - hybridCreated), mode: group.dataset.traceMode || "colour" };
}


function bitmapFlattenReconstructionTarget() {
  const candidate = selectedItems.length === 1 ? selectedItems[0] : selected;
  if (!candidate?.dataset?.vectorizerSourceRef) return null;
  const source = document.getElementById(candidate.dataset.vectorizerSourceRef);
  if (!source || !isRasterImageElement(source)) return null;
  return { group: candidate, source };
}

function bitmapFlattenRefineBounds(group, source) {
  const encoded = group?.dataset?.vectorizerRefineBounds || "";
  const values = encoded.split(",").map(Number);
  if (values.length === 4 && values.every(Number.isFinite)) {
    return { left: values[0], top: values[1], right: values[2], bottom: values[3] };
  }
  return elementCanvasBounds(source);
}

async function bitmapFlattenRasterizeForError(element, bounds, maxDimension = 560, revealRaster = false) {
  const width = Math.max(1e-4, bounds.right - bounds.left);
  const height = Math.max(1e-4, bounds.bottom - bounds.top);
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const pixelWidth = Math.max(2, Math.round(width * scale));
  const pixelHeight = Math.max(2, Math.round(height * scale));
  const wrapper = document.createElementNS(SVG_NS, "svg");
  wrapper.setAttribute("xmlns", SVG_NS);
  wrapper.setAttribute("viewBox", `${bounds.left} ${bounds.top} ${width} ${height}`);
  wrapper.setAttribute("width", String(pixelWidth));
  wrapper.setAttribute("height", String(pixelHeight));
  const defs = svg.querySelector("defs");
  if (defs) wrapper.appendChild(defs.cloneNode(true));
  const clone = element.cloneNode(true);
  if (revealRaster) {
    clone.removeAttribute("display");
    clone.dataset.hidden = "false";
    clone.style.display = "";
    clone.style.visibility = "visible";
    clone.style.opacity = "1";
  }
  wrapper.appendChild(clone);
  const text = new XMLSerializer().serializeToString(wrapper);
  const url = URL.createObjectURL(new Blob([text], { type: "image/svg+xml" }));
  try {
    const image = await loadBrowserImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.clearRect(0, 0, pixelWidth, pixelHeight);
    context.drawImage(image, 0, 0, pixelWidth, pixelHeight);
    return context.getImageData(0, 0, pixelWidth, pixelHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function bitmapFlattenReconstructionError(target, rendered) {
  const a = target.data, b = rendered.data;
  let error = 0, weight = 0;
  for (let i = 0; i < a.length; i += 4) {
    const aa = a[i + 3] / 255, ba = b[i + 3] / 255;
    const coverage = Math.max(0.08, aa, ba);
    const dr = a[i] * aa - b[i] * ba;
    const dg = a[i + 1] * aa - b[i + 1] * ba;
    const db = a[i + 2] * aa - b[i + 2] * ba;
    const da = (a[i + 3] - b[i + 3]) * 1.35;
    error += coverage * (0.9 * dr * dr + 1.1 * dg * dg + 0.82 * db * db + da * da);
    weight += coverage;
  }
  return error / Math.max(1, weight);
}

function bitmapFlattenHexRgb(value) {
  const match = /^#([0-9a-f]{6})$/i.exec(String(value || "").trim());
  if (!match) return null;
  const n = parseInt(match[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function bitmapFlattenRgbHex(rgb) {
  return `#${rgb.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;
}

async function bitmapFlattenPathSourceColour(path, group, targetRaster, bounds, maxDimension = 560) {
  const fill = bitmapFlattenHexRgb(path.getAttribute("fill"));
  if (!fill) return null;
  const maskGroup = group.cloneNode(false);
  maskGroup.appendChild(path.cloneNode(true));
  const mask = await bitmapFlattenRasterizeForError(maskGroup, bounds, maxDimension, false);
  const samples = [[], [], []];
  for (let i = 0; i < targetRaster.data.length; i += 4) {
    if (mask.data[i + 3] < 180 || targetRaster.data[i + 3] < 180) continue;
    samples[0].push(targetRaster.data[i]);
    samples[1].push(targetRaster.data[i + 1]);
    samples[2].push(targetRaster.data[i + 2]);
  }
  if (samples[0].length < 12) return null;
  const median = values => {
    values.sort((a,b)=>a-b);
    return values[Math.floor(values.length / 2)];
  };
  return samples.map(median);
}

async function bitmapFlattenRefineGroupReconstruction(group, source, { record = false, updateUi = false } = {}) {
  const bounds = bitmapFlattenRefineBounds(group, source);
  const paths = [...group.querySelectorAll("path")].filter(path => path.dataset.editorPath === "true");
  if (!paths.length) return { accepted: 0, improvement: 0, startError: 0, bestError: 0 };
  if (updateUi) toolStatus.textContent = "Refining vector against original raster…";
  await new Promise(resolve => requestAnimationFrame(resolve));

  const targetRaster = await bitmapFlattenRasterizeForError(source, bounds, 560, true);
  let rendered = await bitmapFlattenRasterizeForError(group, bounds, 560, false);
  let bestError = bitmapFlattenReconstructionError(targetRaster, rendered);
  const startError = bestError;
  let accepted = 0;

  for (const path of paths.slice(0, 18)) {
    const originalFill = path.getAttribute("fill");
    const current = bitmapFlattenHexRgb(originalFill);
    if (!current) continue;
    const sourceColour = await bitmapFlattenPathSourceColour(path, group, targetRaster, bounds, 560);
    if (!sourceColour) continue;
    let bestFill = originalFill;
    let localBest = bestError;
    for (const mix of [0.55, 1]) {
      const candidate = current.map((v, i) => v + (sourceColour[i] - v) * mix);
      path.setAttribute("fill", bitmapFlattenRgbHex(candidate));
      const trial = await bitmapFlattenRasterizeForError(group, bounds, 560, false);
      const error = bitmapFlattenReconstructionError(targetRaster, trial);
      if (error + 0.01 < localBest) {
        localBest = error;
        bestFill = path.getAttribute("fill");
      }
    }
    path.setAttribute("fill", bestFill);
    if (localBest < bestError) { bestError = localBest; accepted += 1; }
  }

  const ranked = paths.map(path => {
    let area = 0;
    try { const b = path.getBBox(); area = Math.max(0, b.width * b.height); } catch (_) {}
    return { path, area };
  }).sort((a,b)=>b.area-a.area).slice(0, 8);
  const sourcePixelX = Number(group.dataset.vectorizerSourcePixelX) || ((bounds.right - bounds.left) / 1000);
  const sourcePixelY = Number(group.dataset.vectorizerSourcePixelY) || ((bounds.bottom - bounds.top) / 1000);
  for (const item of ranked) {
    const path = item.path;
    const base = path.getAttribute("transform") || "";
    let bestTransform = base;
    let localBest = bestError;
    const nudges = [
      [ sourcePixelX * 0.28, 0], [-sourcePixelX * 0.28, 0],
      [0, sourcePixelY * 0.28], [0, -sourcePixelY * 0.28]
    ];
    for (const [dx, dy] of nudges) {
      path.setAttribute("transform", `translate(${dx} ${dy}) ${base}`.trim());
      const trial = await bitmapFlattenRasterizeForError(group, bounds, 560, false);
      const error = bitmapFlattenReconstructionError(targetRaster, trial);
      if (error + 0.01 < localBest) {
        localBest = error;
        bestTransform = path.getAttribute("transform");
      }
    }
    path.setAttribute("transform", bestTransform);
    if (localBest < bestError) { bestError = localBest; accepted += 1; }
  }

  const improvement = startError > 0 ? Math.max(0, (1 - bestError / startError) * 100) : 0;
  if (record) recordHistory({ label: "Refine Raster Match", detail: `${accepted} accepted adjustment${accepted === 1 ? "" : "s"} • ${improvement.toFixed(1)}% lower reconstruction error` });
  if (updateUi) {
    renderLayers();
    drawSelection();
    toolStatus.textContent = accepted
      ? `Raster match refined: ${accepted} accepted adjustment${accepted === 1 ? "" : "s"}, ${improvement.toFixed(1)}% lower error`
      : "Raster match already locally optimal at this refinement scale";
  }
  return { accepted, improvement, startError, bestError };
}

async function refineSelectedVectorizerReconstruction() {
  const target = bitmapFlattenReconstructionTarget();
  if (!target) {
    toolStatus.textContent = "Select a group created by Vectorizer to refine its raster match";
    return;
  }
  const { group, source } = target;
  const paths = [...group.querySelectorAll("path")].filter(path => path.dataset.editorPath === "true");
  if (!paths.length) {
    toolStatus.textContent = "This Vectorizer group has no editable paths to refine";
    return;
  }
  return bitmapFlattenRefineGroupReconstruction(group, source, { record: true, updateUi: true });
}


async function applyBitmapFlattenedCopy() {
  const source = bitmapFlattenSourceElement;
  if (!source || !isRasterImageElement(source)) return;
  if (applyBitmapFlattenButton) applyBitmapFlattenButton.disabled = true;
  if (bitmapFlattenStatus) bitmapFlattenStatus.textContent = "Using exact final preview vector…";
  setBitmapFlattenProgress(18, true);
  try {
    const key = bitmapFlattenPreviewCacheKey(source);
    if (!bitmapFlattenFinalPreviewCache || bitmapFlattenFinalPreviewCache.key !== key) {
      // A setting changed after the last preview completed. Rebuild the final
      // preview first, then commit that exact result rather than retracing in a
      // separate Create-only code path.
      await scheduleBitmapFlattenPreview(true);
    }
    const cache = bitmapFlattenFinalPreviewCache;
    if (!cache || cache.key !== bitmapFlattenPreviewCacheKey(source)) {
      throw new Error("Final vector preview is not ready yet.");
    }
    setBitmapFlattenProgress(72, true);
    const { result, vectorized } = cache;
    const group = vectorized.group;
    source.parentNode.insertBefore(group, source.nextSibling);
    source.dataset.hidden = "true";
    source.setAttribute("display", "none");
    setSelection([group], group);
    renderLayers();
    drawSelection();

    const paletteRegions = bitmapFlattenPaletteRegions(result);
    const primitiveSummary = vectorized.mode === "reconstruct"
      ? ` • ${vectorized.primitiveCreated || 0} primitive island${vectorized.primitiveCreated === 1 ? "" : "s"} • ${vectorized.hybridCreated || 0} hybrid island${vectorized.hybridCreated === 1 ? "" : "s"} • ${vectorized.tracedCreated || 0} traced fallback${vectorized.tracedCreated === 1 ? "" : "s"}`
      : "";
    recordHistory({ label: "Bitmap Vectorized", detail: `${vectorized.created} path${vectorized.created === 1 ? "" : "s"} • ${vectorized.mode === "gradient" ? "detected gradient" : vectorized.mode === "logo" ? "logo silhouette" : `${paletteRegions.length} colour region${paletteRegions.length === 1 ? "" : "s"}`}${primitiveSummary} • exact preview committed` });
    toolStatus.textContent = vectorized.mode === "gradient"
      ? "Created the exact gradient vector shown in Preview"
      : vectorized.mode === "logo"
        ? "Created the exact logo silhouette shown in Preview"
        : vectorized.mode === "reconstruct"
          ? `Created exact Preview reconstruction: ${vectorized.primitiveCreated || 0} primitive, ${vectorized.hybridCreated || 0} hybrid, ${vectorized.tracedCreated || 0} traced`
          : `Created the exact ${paletteRegions.length}-colour vector shown in Preview • v80 exact-preview`;
    setBitmapFlattenProgress(100, false);
    bitmapFlattenFinalPreviewCache = null; // group is now owned by the document.
    await new Promise(resolve => setTimeout(resolve, 120));
    closeBitmapFlatten();
  } catch (error) {
    console.error(error);
    if (bitmapFlattenStatus) bitmapFlattenStatus.textContent = error.message || "Could not vectorize this bitmap.";
    hideBitmapFlattenProgress();
    if (applyBitmapFlattenButton) applyBitmapFlattenButton.disabled = false;
  }
}


[bitmapFlattenMode, bitmapFlattenPaint, bitmapFlattenColors, bitmapFlattenDetail, bitmapFlattenNoise, bitmapFlattenMinArea, bitmapFlattenMergeArea, bitmapFlattenHybridSensitivity, bitmapFlattenAxisSnap, bitmapFlattenAxisSnapSensitivity, bitmapFlattenSimplify]
  .filter(Boolean)
  .forEach(control => control.addEventListener("input", () => { bitmapFlattenFinalPreviewCache = null; scheduleBitmapFlattenPreview(false); }));

closeBitmapFlattenButton?.addEventListener("click", closeBitmapFlatten);
cancelBitmapFlattenButton?.addEventListener("click", closeBitmapFlatten);
applyBitmapFlattenButton?.addEventListener("click", applyBitmapFlattenedCopy);
bitmapFlattenModal?.addEventListener("pointerdown", event => {
  if (event.target === bitmapFlattenModal) closeBitmapFlatten();
});
bitmapFlattenModal?.addEventListener("keydown", event => {
  if (event.key === "Escape") { event.preventDefault(); closeBitmapFlatten(); }
});

document.addEventListener("keydown", event => {
  if (!bitmapFlattenModal || bitmapFlattenModal.hidden) return;
  if (event.key !== "Enter") return;
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (event.isComposing || event.repeat) return;
  if (applyBitmapFlattenButton?.disabled) return;
  event.preventDefault();
  applyBitmapFlattenedCopy();
});
