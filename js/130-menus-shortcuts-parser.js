/* Vector Studio modular baseline — source lines 60943-63133 from consolidated app.js.
   Classic-script module: shares the browser global lexical scope with ordered sibling modules. */

/* ---------------- MENU BAR ---------------- */

document.querySelectorAll(".menu-trigger").forEach(trigger => {
  trigger.addEventListener("click", event => {
    event.stopPropagation();
    const menu = trigger.closest(".menu");
    document.querySelectorAll(".menu.open").forEach(m => {
      if (m !== menu) m.classList.remove("open");
    });
    menu.classList.toggle("open");
  });
});

document.addEventListener("click", () => {
  document.querySelectorAll(".menu.open").forEach(m => m.classList.remove("open"));
});


function clearHelpSearchHighlights() {
  helpGuideContent
    .querySelectorAll("mark[data-help-highlight]")
    .forEach(mark => {
      mark.replaceWith(
        document.createTextNode(
          mark.textContent
        )
      );
    });

  helpGuideContent.normalize();
}

function highlightHelpMatches(
  section,
  query
) {
  if (!query) return;

  const escaped =
    query.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

  const expression =
    new RegExp(
      escaped,
      "gi"
    );

  const walker =
    document.createTreeWalker(
      section,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (
            !node.nodeValue
              .toLowerCase()
              .includes(
                query.toLowerCase()
              )
          ) {
            return NodeFilter.FILTER_REJECT;
          }

          if (
            node.parentElement?.closest(
              "script, style, mark"
            )
          ) {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

  const nodes = [];

  while (walker.nextNode()) {
    nodes.push(
      walker.currentNode
    );
  }

  nodes.forEach(node => {
    const text =
      node.nodeValue;

    let lastIndex = 0;
    let match;
    const fragment =
      document.createDocumentFragment();

    expression.lastIndex = 0;

    while (
      (
        match =
          expression.exec(text)
      )
    ) {
      if (
        match.index >
        lastIndex
      ) {
        fragment.append(
          document.createTextNode(
            text.slice(
              lastIndex,
              match.index
            )
          )
        );
      }

      const mark =
        document.createElement(
          "mark"
        );

      mark.dataset.helpHighlight =
        "true";

      mark.textContent =
        match[0];

      fragment.append(mark);

      lastIndex =
        match.index +
        match[0].length;

      if (
        match[0].length === 0
      ) {
        expression.lastIndex += 1;
      }
    }

    if (
      lastIndex <
      text.length
    ) {
      fragment.append(
        document.createTextNode(
          text.slice(
            lastIndex
          )
        )
      );
    }

    node.replaceWith(fragment);
  });
}

function selectHelpTopic(
  id,
  {
    scroll = true
  } = {}
) {
  const target =
    document.getElementById(id);

  if (
    !target ||
    target.classList.contains(
      "search-hidden"
    )
  ) {
    return;
  }

  helpGuideNav
    .querySelectorAll(
      ".help-nav-item"
    )
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.helpTarget ===
          id
      );
    });

  if (scroll) {
    target.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

function filterHelpGuide() {
  clearHelpSearchHighlights();

  const query =
    helpGuideSearch.value
      .trim()
      .toLowerCase();

  clearHelpGuideSearch.hidden =
    !query;

  const sections =
    [...helpGuideContent.querySelectorAll(
      "[data-help-topic]"
    )];

  let matches = 0;

  sections.forEach(section => {
    const haystack =
      section.textContent
        .toLowerCase();

    const visible =
      !query ||
      haystack.includes(query);

    section.classList.toggle(
      "search-hidden",
      !visible
    );

    const navButton =
      helpGuideNav.querySelector(
        `[data-help-target="${section.id}"]`
      );

    navButton?.classList.toggle(
      "search-hidden",
      !visible
    );

    if (visible) {
      matches += 1;

      if (query) {
        highlightHelpMatches(
          section,
          query
        );
      }
    }
  });

  helpNoResults.hidden =
    matches !== 0;

  helpSearchSummary.hidden =
    !query ||
    matches === 0;

  if (
    query &&
    matches > 0
  ) {
    helpSearchSummary.textContent =
      `${matches} help topic${matches === 1 ? "" : "s"} matching “${helpGuideSearch.value.trim()}”`;

    const firstVisible =
      sections.find(section =>
        !section.classList.contains(
          "search-hidden"
        )
      );

    if (firstVisible) {
      selectHelpTopic(
        firstVisible.id,
        { scroll: false }
      );

      helpGuideContent.scrollTop =
        0;
    }
  } else if (!query) {
    sections.forEach(section =>
      section.classList.remove(
        "search-hidden"
      )
    );

    helpGuideNav
      .querySelectorAll(
        ".help-nav-item"
      )
      .forEach(button =>
        button.classList.remove(
          "search-hidden"
        )
      );

    selectHelpTopic(
      "getting-started",
      { scroll: false }
    );
  }
}

function openHelpGuide(
  topic = "getting-started"
) {
  helpGuideModal.hidden =
    false;

  helpGuideSearch.value =
    "";

  filterHelpGuide();

  requestAnimationFrame(() => {
    selectHelpTopic(
      topic,
      { scroll: false }
    );

    helpGuideContent.scrollTop =
      0;

    helpGuideSearch.focus();
  });
}

function closeHelpGuide() {
  helpGuideModal.hidden =
    true;

  helpGuideSearch.value =
    "";

  filterHelpGuide();
}

helpGuideNav.addEventListener(
  "click",
  event => {
    const button =
      event.target.closest(
        "[data-help-target]"
      );

    if (!button) return;

    selectHelpTopic(
      button.dataset.helpTarget
    );
  }
);

helpGuideSearch.addEventListener(
  "input",
  filterHelpGuide
);

clearHelpGuideSearch.addEventListener(
  "click",
  () => {
    helpGuideSearch.value =
      "";

    filterHelpGuide();
    helpGuideSearch.focus();
  }
);

closeHelpGuideButton.addEventListener(
  "click",
  closeHelpGuide
);

helpGuideModal.addEventListener(
  "pointerdown",
  event => {
    if (
      event.target ===
      helpGuideModal
    ) {
      closeHelpGuide();
    }
  }
);

helpGuideModal.addEventListener(
  "keydown",
  event => {
    if (
      event.key === "Escape"
    ) {
      event.preventDefault();
      closeHelpGuide();
    }
  }
);


function runCommand(command) {
  if (command === "undo") {
    undo();
    return;
  }

  if (command === "redo") {
    redo();
    return;
  }

  if (command === "new") {
    newCanvasTab();
  }
  if (command === "open-project") openProjectPicker();
  if (command === "import-svg") openSvgPicker();
  if (command === "import-image") openImagePicker();
  if (command === "flatten-bitmap-colors") openBitmapFlatten();
  if (command === "refine-vectorizer-match") refineSelectedVectorizerReconstruction();
  if (command === "save-project") saveProject();
  if (command === "export") openExportModal();
  if (command === "align-left") alignSelectedObjects("left");
  if (command === "align-h-center") alignSelectedObjects("h-center");
  if (command === "align-right") alignSelectedObjects("right");
  if (command === "align-top") alignSelectedObjects("top");
  if (command === "align-v-center") alignSelectedObjects("v-center");
  if (command === "align-bottom") alignSelectedObjects("bottom");
  if (command === "distribute-horizontal") distributeSelectedObjects("horizontal");
  if (command === "distribute-vertical") distributeSelectedObjects("vertical");
  if (command === "group") groupSelected();
  if (command === "ungroup") ungroupSelected();
  if (command === "convert-to-path") convertSelectedToPath();
  if (command === "stroke-to-path") strokeSelectedToPath();
  if (command === "offset-path") openOffsetPathModal();
  if (command === "repeat-grid") {
    createRepeatGridFromSelected();
    syncRepeatGridPanel();
  }
  if (command === "geometry-constraints") {
    geometryConstraintsPanelRequested =
      !geometryConstraintsPanelRequested;

    if (
      geometryConstraintsPanelRequested
    ) {
      if (
        activeTool !==
          "vertex"
      ) {
        setTool(
          "vertex"
        );
      }

      beginConstraintMaker();
    }

    syncGeometryConstraintsPanel();

    toolStatus.textContent =
      geometryConstraintsPanelRequested
        ? "Path Constraints: select 2 or 3 vertices"
        : "Path Constraints closed";
  }

  if (command === "art-brush") {
    artBrushPanelRequested =
      !artBrushPanelRequested;

    syncArtBrushPanel();

    toolStatus.textContent =
      artBrushPanelRequested
        ? "Vector Art Brush panel open"
        : "Vector Art Brush panel closed";
  }

  if (command === "3d-extrude") {
    if (selectedThreeDExtrude()) {
      threeDPanelRequested =
        !threeDPanelRequested;

      if (
        !threeDPanelRequested
      ) {
        threeDOrbitDrag =
          null;
        threeDSelectedFace =
          null;
      } else {
        threeDSelectedFace =
          threeDSelectedFace ||
          selectedThreeDExtrude()?.dataset.threeDSelectedFace ||
          "front";

        selectedThreeDExtrude().dataset.threeDSelectedFace =
          threeDSelectedFace;
      }

      syncThreeDPanel();

      if (
        threeDPanelRequested
      ) {
        syncAppearanceControlsToThreeDFace(
          selectedThreeDExtrude(),
          threeDSelectedFace
        );
      }

      drawSelection();

      toolStatus.textContent =
        threeDPanelRequested
          ? "3D Extrude editing active"
          : "3D Extrude editing hidden";
    } else {
      createThreeDExtrudeFromSelected();
      syncThreeDPanel();
    }
  }


  if (command === "3d-revolve") {
    if (selectedThreeDExtrude() && isThreeDRevolve(selectedThreeDExtrude())) {
      threeDPanelRequested = !threeDPanelRequested;
      if (!threeDPanelRequested) {
        threeDOrbitDrag = null;
        threeDSelectedFace = null;
      }
      syncThreeDPanel();
      drawSelection();
      toolStatus.textContent = threeDPanelRequested
        ? "3D Revolve editing active"
        : "3D Revolve editing hidden";
    } else if (selectedThreeDExtrude()) {
      toolStatus.textContent = "Select a 2D vector profile to create a 3D Revolve";
    } else {
      createThreeDRevolveFromSelected();
      syncThreeDPanel();
    }
  }

  if (command === "repeat-along-path") {
    if (selectedPathRepeat()) {
      pathRepeatPanelRequested =
        !pathRepeatPanelRequested;

      if (
        !pathRepeatPanelRequested
      ) {
        if (pathRepeatShapeEdit) {
          endPathRepeatShapeEdit({
            selectRepeat: true,
            keepPanel: false
          });
        }

        pathRepeatGuideEdit =
          false;
        pathRepeatGuideDrag =
          null;
      }

      syncPathRepeatPanel();
      drawSelection();

      toolStatus.textContent =
        pathRepeatPanelRequested
          ? "Repeat Along Path editing active"
          : "Repeat Along Path editing hidden";
    } else {
      const created =
        createPathRepeatFromSelected();

      if (created) {
        pathRepeatPanelRequested =
          true;
      }

      syncPathRepeatPanel();
      syncRepeatToolActiveStates();
    }
  }

  if (command === "radial-repeat") {
    if (selectedRadialRepeat()) {
      radialRepeatPanelRequested =
        !radialRepeatPanelRequested;

      if (!radialRepeatPanelRequested) {
        radialRepeatCenterDrag =
          null;

        radialRepeatCenterPick =
          null;

        radialRepeatPanel.hidden =
          true;

        clearSnapGuides();

        toolStatus.textContent =
          "Radial Repeat editing hidden";
      } else {
        toolStatus.textContent =
          "Radial Repeat editing active";
      }

      syncRadialRepeatPanel();
      drawSelection();
    } else {
      createRadialRepeatFromSelected();
      syncRadialRepeatPanel();
    }
  }
  if (command === "cut") cutSelected();
  if (command === "copy") copySelected();
  if (command === "paste") pasteClipboard();
  if (command === "duplicate") duplicateSelected();
  if (command === "repeat-action") repeatLastAction();
  if (command === "delete") deleteSelected();
  if (command === "deselect") deselect();
  if (command === "bring-front" && selectedItems.length) {
    bringSelectedToFront();
  }
  if (command === "send-back" && selectedItems.length) {
    sendSelectedToBack();
  }
  if (command === "shape-builder") {
    setTool("shapeBuilder");
  }
  if (command === "select-by-color") {
    selectByReferenceColor();
  }
  if (command === "select-similar-shapes") {
    selectSimilarShapes();
  }
  if (command === "select-next") {
    const items = [...art.querySelectorAll("[data-object='true']")]
      .filter(isLayerInteractive);
    if (!items.length) return;
    const i = selected ? items.indexOf(selected) : -1;
    selectElement(items[(i + 1) % items.length]);
  }
  if (command === "smart-guides") toggleSnapSetting("smartGuides");
  if (command === "snap-guides") toggleSnapSetting("guides");
  if (command === "snap-grid") toggleSnapSetting("grid");
  if (command === "toggle-grid") setGridVisible(!gridVisible);
  if (command === "snap-object-edges") toggleSnapSetting("objectEdges");
  if (command === "snap-object-centers") toggleSnapSetting("objectCenters");
  if (command === "snap-canvas-edges") toggleSnapSetting("canvasEdges");
  if (command === "snap-canvas-center") toggleSnapSetting("canvasCenter");
  if (command === "snap-rotation") toggleSnapSetting("rotation");
  if (command === "zoom-in") setZoom(zoom + 0.1);
  if (command === "zoom-out") setZoom(zoom - 0.1);
  if (command === "zoom-fit" || command === "zoom-100") setZoom(1);
  if (command === "theme-dark") {
    setApplicationTheme("dark");
  }
  if (command === "theme-light") {
    setApplicationTheme("light");
  }
  if (command === "theme-high-contrast") {
    setApplicationTheme("high-contrast");
  }
  if (command === "toggle-rulers") {
    setRulersVisible(!rulersVisible);
  }
  if (command === "toggle-guides") {
    setGuidesVisible(!guidesVisible);
  }
  if (command === "lock-guides") {
    setGuidesLocked(!guidesLocked);
  }
  if (command === "clear-guides") {
    clearGuides();
  }
  if (command === "show-properties") {
    showRightPanel("properties");
  }
  if (command === "show-layers") {
    showRightPanel("layers");
  }
  if (command === "show-history") {
    showHistoryPanel();
  }
  if (command === "help-guide") {
    openHelpGuide();
  }
  if (command === "about") {
    alert("Vector Studio — browser-based SVG vector editor.");
  }

  renderLayers();
}

document.querySelectorAll("[data-command]").forEach(button => {
  button.addEventListener("click", event => {
    event.stopPropagation();
    runCommand(button.dataset.command);
    document.querySelectorAll(".menu.open").forEach(m => m.classList.remove("open"));
  });
});

repeatActionCopyRow?.addEventListener(
  "click",
  event => {
    event.stopPropagation();
  }
);

repeatActionCopy?.addEventListener(
  "change",
  () => {
    try {
      localStorage.setItem(
        "vectorStudio.repeatActionCopy",
        repeatActionCopy.checked
          ? "true"
          : "false"
      );
    } catch {}
  }
);

if (repeatActionCopy) {
  try {
    repeatActionCopy.checked =
      localStorage.getItem(
        "vectorStudio.repeatActionCopy"
      ) === "true";
  } catch {}
}

updateRepeatActionMenuState();

/* ---------------- SHAPE QUICK MENU ---------------- */

const shapeQuickMenuItems = [
  { key: "1", code: "Digit1", tool: "rect", label: "Rectangle" },
  { key: "2", code: "Digit2", tool: "ellipse", label: "Ellipse" },
  { key: "3", code: "Digit3", tool: "polygon", label: "Polygon" },
  { key: "4", code: "Digit4", tool: "star", label: "Star" },
  { key: "5", code: "Digit5", tool: "line", label: "Line" }
];

const drawingQuickMenuItems = [
  { key: "1", code: "Digit1", tool: "pen", label: "Pen" },
  { key: "2", code: "Digit2", tool: "curvature", label: "Curvature" },
  { key: "3", code: "Digit3", tool: "freeDraw", label: "Pencil" },
  { key: "4", code: "Digit4", command: "art-brush", label: "Art Brush" },
  { key: "5", code: "Digit5", command: "geometry-constraints", label: "Path Constraints" }
];

let shapeQuickMenu = null;
let shapeQuickMenuOpen = false;
let drawingQuickMenu = null;
let drawingQuickMenuOpen = false;
let lastPointerClientPosition = null;

function ensureShapeQuickMenu() {
  if (shapeQuickMenu) return shapeQuickMenu;

  const menu = document.createElement("div");
  menu.className = "shape-quick-menu";
  menu.hidden = true;
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", "Quick shape selection");

  const heading = document.createElement("div");
  heading.className = "shape-quick-menu-heading";
  heading.textContent = "Shape";
  menu.appendChild(heading);

  shapeQuickMenuItems.forEach(item => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "shape-quick-menu-item";
    button.dataset.shapeQuickTool = item.tool;
    button.setAttribute("role", "menuitem");
    button.innerHTML = `<kbd>${item.key}</kbd><span>${item.label}</span>`;
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      chooseShapeFromQuickMenu(item.tool);
    });
    menu.appendChild(button);
  });

  document.body.appendChild(menu);
  shapeQuickMenu = menu;
  return menu;
}

function positionShapeQuickMenu(clientX, clientY) {
  const menu = ensureShapeQuickMenu();
  const gap = 12;

  menu.style.left = "0px";
  menu.style.top = "0px";
  menu.hidden = false;

  const rect = menu.getBoundingClientRect();
  const maxLeft = Math.max(gap, window.innerWidth - rect.width - gap);
  const maxTop = Math.max(gap, window.innerHeight - rect.height - gap);
  const left = Math.min(Math.max(gap, clientX + gap), maxLeft);
  const top = Math.min(Math.max(gap, clientY + gap), maxTop);

  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}

function openShapeQuickMenu() {
  const fallback = {
    x: Math.round(window.innerWidth / 2),
    y: Math.round(window.innerHeight / 2)
  };
  const point = lastPointerClientPosition || fallback;

  shapeQuickMenuOpen = true;
  positionShapeQuickMenu(point.x, point.y);
}

function closeShapeQuickMenu() {
  shapeQuickMenuOpen = false;
  if (shapeQuickMenu) shapeQuickMenu.hidden = true;
}

function chooseShapeFromQuickMenu(tool) {
  closeShapeQuickMenu();
  setTool(tool);
}

function ensureDrawingQuickMenu() {
  if (drawingQuickMenu) return drawingQuickMenu;

  const menu = document.createElement("div");
  menu.className = "shape-quick-menu drawing-quick-menu";
  menu.hidden = true;
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", "Quick drawing tool selection");

  const heading = document.createElement("div");
  heading.className = "shape-quick-menu-heading";
  heading.textContent = "Draw";
  menu.appendChild(heading);

  drawingQuickMenuItems.forEach(item => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "shape-quick-menu-item";
    button.setAttribute("role", "menuitem");
    button.innerHTML = `<kbd>${item.key}</kbd><span>${item.label}</span>`;
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      chooseDrawingFromQuickMenu(item);
    });
    menu.appendChild(button);
  });

  document.body.appendChild(menu);
  drawingQuickMenu = menu;
  return menu;
}

function positionDrawingQuickMenu(clientX, clientY) {
  const menu = ensureDrawingQuickMenu();
  const gap = 12;

  menu.style.left = "0px";
  menu.style.top = "0px";
  menu.hidden = false;

  const rect = menu.getBoundingClientRect();
  const maxLeft = Math.max(gap, window.innerWidth - rect.width - gap);
  const maxTop = Math.max(gap, window.innerHeight - rect.height - gap);
  const left = Math.min(Math.max(gap, clientX + gap), maxLeft);
  const top = Math.min(Math.max(gap, clientY + gap), maxTop);

  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}

function openDrawingQuickMenu() {
  closeShapeQuickMenu();
  const fallback = {
    x: Math.round(window.innerWidth / 2),
    y: Math.round(window.innerHeight / 2)
  };
  const point = lastPointerClientPosition || fallback;

  drawingQuickMenuOpen = true;
  positionDrawingQuickMenu(point.x, point.y);
}

function closeDrawingQuickMenu() {
  drawingQuickMenuOpen = false;
  if (drawingQuickMenu) drawingQuickMenu.hidden = true;
}

function chooseDrawingFromQuickMenu(item) {
  closeDrawingQuickMenu();
  if (item.tool) {
    setTool(item.tool);
    return;
  }
  if (item.command) runCommand(item.command);
}

document.addEventListener(
  "pointermove",
  event => {
    lastPointerClientPosition = {
      x: event.clientX,
      y: event.clientY
    };
  },
  true
);

document.addEventListener(
  "pointerdown",
  event => {
    if (
      shapeQuickMenuOpen &&
      !event.target.closest(".shape-quick-menu")
    ) {
      closeShapeQuickMenu();
    }
    if (
      drawingQuickMenuOpen &&
      !event.target.closest(".drawing-quick-menu")
    ) {
      closeDrawingQuickMenu();
    }
  },
  true
);

window.addEventListener("blur", () => {
  closeShapeQuickMenu();
  closeDrawingQuickMenu();
});
window.addEventListener("resize", () => {
  closeShapeQuickMenu();
  closeDrawingQuickMenu();
});

/* ---------------- KEYBOARD ---------------- */

function nudgeSelectedObjectsByCanvasDelta(dx, dy) {
  if (activeTool !== "select") return false;

  const items = Array.isArray(selectedItems)
    ? selectedItems.filter(element => element?.isConnected)
    : [];

  if (!items.length && selected?.isConnected) {
    items.push(selected);
  }

  const uniqueItems = [...new Set(items)];
  if (!uniqueItems.length) return false;

  uniqueItems.forEach(element => {
    // Convert the requested canvas-space nudge into the selected object's
    // parent coordinate system. This keeps a 1 px keyboard nudge visually
    // equal to 1 canvas px even for children inside transformed groups.
    let localDx = dx;
    let localDy = dy;

    if (typeof parentPointFromCanvas === "function") {
      const parentOrigin = parentPointFromCanvas(element, { x: 0, y: 0 });
      const parentTarget = parentPointFromCanvas(element, { x: dx, y: dy });
      localDx = parentTarget.x - parentOrigin.x;
      localDy = parentTarget.y - parentOrigin.y;
    }

    element.dataset.tx = String(Number(element.dataset.tx || 0) + localDx);
    element.dataset.ty = String(Number(element.dataset.ty || 0) + localDy);
    applyObjectTransform(element);

    if (typeof preservePinnedVerticesDuringObjectMove === "function") {
      preservePinnedVerticesDuringObjectMove(element);
    }
  });

  if (
    uniqueItems.length > 1 &&
    typeof multiSelectionFrameMatchesSelection === "function" &&
    multiSelectionFrameMatchesSelection() &&
    multiSelectionFrame?.center
  ) {
    multiSelectionFrame.center = {
      x: multiSelectionFrame.center.x + dx,
      y: multiSelectionFrame.center.y + dy
    };
  }

  if (typeof enforceDocumentGeometryConstraints === "function") {
    enforceDocumentGeometryConstraints(new Set());
  }

  drawSelection();
  if (typeof renderLayers === "function") renderLayers();

  const distance = Math.max(Math.abs(dx), Math.abs(dy));
  recordHistory({
    label: uniqueItems.length > 1 ? `${uniqueItems.length} Objects Nudged` : `${historyObjectLabel(uniqueItems[0])} Nudged`,
    detail: `${distance}px`
  });

  return true;
}

window.addEventListener("keydown", event => {
  const arrowDeltas = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1]
  };

  if (
    arrowDeltas[event.key] &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    !event.target.closest("input, textarea, select, [contenteditable='true']")
  ) {
    const step = event.shiftKey ? 10 : 1;
    const [ux, uy] = arrowDeltas[event.key];
    if (nudgeSelectedObjectsByCanvasDelta(ux * step, uy * step)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
  }
  if (
    event.key === "Enter" &&
    !event.shiftKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    !event.target.closest(
      "input, textarea, select, [contenteditable='true']"
    ) &&
    selectedRadialRepeat()
  ) {
    if (commitSelectedRadialRepeat()) {
      event.preventDefault();
      return;
    }
  }

  if (
    event.key === "Enter" &&
    !event.shiftKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    !event.target.closest(
      "input, textarea, select, [contenteditable='true']"
    ) &&
    selectedPathRepeat() &&
    pathRepeatPanelRequested
  ) {
    if (commitSelectedPathRepeat()) {
      event.preventDefault();
      return;
    }
  }

  if (
    event.key === "Enter" &&
    !event.shiftKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    !event.target.closest(
      "input, textarea, select, [contenteditable='true']"
    ) &&
    selectedThreeDExtrude() &&
    threeDPanelRequested
  ) {
    if (commitSelectedThreeDExtrude()) {
      event.preventDefault();
      return;
    }
  }

  if (event.key === "Shift") {
    shiftDown = true;
  }

  if (event.key === "Alt") {
    altDown = true;
    shapeBuilderAltHeld = true;

    if (activeTool === "shapeBuilder") {
      drawShapeBuilderHover();
    }
  }

  if (
    pendingShape &&
    ["rect", "ellipse", "polygon", "line"].includes(pendingShape.tagName)
  ) {
    const current = lastPointerPosition || startPoint;

    if (current) {
      const snapped = snapShapeCreationPoint(
        current,
        shiftDown,
        event.altKey
      );

      updatePendingShape(
        snapped,
        shiftDown,
        event.altKey
      );
      drawSnapGuides();
    }
  }
});

window.addEventListener("keyup", event => {
  if (event.key === "Shift") {
    shiftDown = false;
  }

  if (event.key === "Alt") {
    altDown = false;
    shapeBuilderAltHeld = false;
    drawShapeBuilderHover();
    updateShapeBuilderSubtractCursor(null);
  }

  if (
    pendingShape &&
    ["rect", "ellipse", "polygon", "line"].includes(pendingShape.tagName)
  ) {
    const current = lastPointerPosition || startPoint;

    if (current) {
      const snapped = snapShapeCreationPoint(
        current,
        shiftDown,
        event.altKey
      );

      updatePendingShape(
        snapped,
        shiftDown,
        event.altKey
      );
      drawSnapGuides();
    }
  }
});


document.addEventListener(
  "keydown",
  event => {
    if (
      event.key === "Escape" &&
      (
        constraintMakerActive ||
        constraintMakerPlacement ||
        constraintMakerPendingPlacement ||
        !constraintValuePopup.hidden
      )
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      cancelConstraintMaking();
    }
  },
  true
);

constraintValuePopupInput.addEventListener(
  "keydown",
  event => {
    if (
      event.key === "Enter"
    ) {
      event.preventDefault();
      event.stopPropagation();
      if (
        constraintMakerPendingPlacement?.mode === "angle"
      ) {
        commitAngleConstraintValueEntry();
      } else {
        commitConstraintValueEntry();
      }

      return;
    }

    if (
      event.key === "Escape"
    ) {
      event.preventDefault();
      event.stopPropagation();
      cancelConstraintMaking();
    }
  }
);


document.addEventListener(
  "keydown",
  event => {
    const tag =
      event.target?.tagName
        ?.toLowerCase();

    const typing =
      tag === "input" ||
      tag === "textarea" ||
      tag === "select" ||
      event.target?.isContentEditable;

    if (
      !typing &&
      event.key === "F11"
    ) {
      event.preventDefault();
      toggleAppFullscreen();
      return;
    }


  },
  true
);

document.addEventListener("keydown", event => {
  const keyboardTarget = event.target;
  const keyboardTyping = Boolean(
    keyboardTarget?.closest?.(
      "input, textarea, select, [contenteditable='true']"
    )
  );

  if (shapeQuickMenuOpen) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeShapeQuickMenu();
      return;
    }

    const quickChoice = shapeQuickMenuItems.find(
      item => item.code === event.code || item.key === event.key
    );

    if (quickChoice) {
      event.preventDefault();
      event.stopPropagation();
      chooseShapeFromQuickMenu(quickChoice.tool);
      return;
    }

    /* Any unrelated command closes the transient picker first. */
    if (!event.shiftKey && !["Shift", "Control", "Alt", "Meta"].includes(event.key)) {
      closeShapeQuickMenu();
    }
  }

  if (drawingQuickMenuOpen) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeDrawingQuickMenu();
      return;
    }

    const quickChoice = drawingQuickMenuItems.find(
      item => item.code === event.code || item.key === event.key
    );

    if (quickChoice) {
      event.preventDefault();
      event.stopPropagation();
      chooseDrawingFromQuickMenu(quickChoice);
      return;
    }

    if (!event.shiftKey && !["Shift", "Control", "Alt", "Meta"].includes(event.key)) {
      closeDrawingQuickMenu();
    }
  }

  if (
    !keyboardTyping &&
    event.shiftKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    event.key.toLowerCase() === "s"
  ) {
    event.preventDefault();
    event.stopPropagation();
    openShapeQuickMenu();
    return;
  }

  if (
    !keyboardTyping &&
    event.shiftKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    event.key.toLowerCase() === "d"
  ) {
    event.preventDefault();
    event.stopPropagation();
    openDrawingQuickMenu();
    return;
  }

  if (
    curvatureIsActive() &&
    curvaturePath &&
    (
      event.ctrlKey ||
      event.metaKey
    ) &&
    !event.shiftKey &&
    event.key.toLowerCase() ===
      "z"
  ) {
    if (
      curvatureUndoLastPlacement()
    ) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
  }

  if (
    event.key.toLowerCase() === "c" &&
    event.shiftKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey
  ) {
    setTool("curvature");
    event.preventDefault();
    return;
  }


  if (
    curvatureIsActive()
  ) {
    if (
      event.key ===
        "Escape"
    ) {
      if (
        curvaturePath
      ) {
        curvatureFinishPath(
          false
        );
      }

      curvatureHover =
        null;

      curvatureDrag =
        null;

      drawSelection();

      event.preventDefault();
      return;
    }

    if (
      event.key ===
        "Enter" &&
      curvaturePath
    ) {
      curvatureFinishPath(
        false
      );

      event.preventDefault();
      return;
    }

    if (
      event.key.toLowerCase() ===
        "c" &&
      event.shiftKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      setTool(
        "curvature"
      );

      event.preventDefault();
      return;
    }
  }

  const element = document.activeElement;

  if (
    event.key === "F1" &&
    !helpGuideModal.hidden
  ) {
    event.preventDefault();
    return;
  }

  if (
    event.key === "F1"
  ) {
    event.preventDefault();
    openHelpGuide();
    return;
  }

  if (["INPUT", "SELECT", "TEXTAREA"].includes(element.tagName)) return;

  if (event.ctrlKey || event.metaKey) {
    const key = event.key.toLowerCase();

    if (key === "c" && !event.shiftKey) {
      event.preventDefault();
      copySelected();
      return;
    }

    if (key === "x" && !event.shiftKey) {
      event.preventDefault();
      cutSelected();
      return;
    }

    if (key === "v" && !event.shiftKey) {
      event.preventDefault();
      pasteClipboard();
      return;
    }

    if (key === "z" && event.shiftKey) {
      event.preventDefault();
      redo();
      return;
    }

    if (key === "z") {
      event.preventDefault();
      undo();
      return;
    }

    if (key === "y") {
      event.preventDefault();
      redo();
      return;
    }

    if (key === "h") {
      event.preventDefault();
      showHistoryPanel();
      return;
    }

    if (key === "g" && event.shiftKey) {
      event.preventDefault();
      ungroupSelected();
      return;
    }

    if (key === "g") {
      event.preventDefault();
      groupSelected();
      return;
    }

    if (
      key === "d" &&
      event.shiftKey
    ) {
      event.preventDefault();
      repeatLastAction();
      return;
    }

    if (key === "d") {
      event.preventDefault();
      duplicateSelected();
    }
    if (key === "e") {
      event.preventDefault();
      openExportModal();
    }
    if (key === "n") {
      event.preventDefault();
      runCommand("new");
    }
    if (key === "s") {
      event.preventDefault();
      saveProject();
    }
    if (key === "o") {
      event.preventDefault();
      openProjectPicker();
    }
    return;
  }

  const key = event.key.toLowerCase();

  if (key === "v") setTool("select");
  if (key === "a") setTool("vertex");
  if (key === "m" && event.shiftKey) setTool("shapeBuilder");
  if (key === "p") setTool("pen");
  if (key === "b") setTool("freeDraw");
  if (key === "t") setTool("text");
  if (key === "r") setTool("rect");
  if (key === "e") setTool("ellipse");
  if (key === "l") setTool("line");

  if (event.key === "Enter" && activePath) {
    event.preventDefault();
    finishPath();
    return;
  }

  if (event.key === "Escape") {
    if (
      radialRepeatCenterPick
    ) {
      radialRepeatCenterPick =
        null;

      clearSnapGuides();

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

      svg.style.cursor =
        activeTool === "select"
          ? "default"
          : "crosshair";

      toolStatus.textContent =
        "Radial Repeat cancelled";

      event.preventDefault();
      return;
    }

    if (
      perspective2Draw
    ) {
      perspective2Draw =
        null;
      drawPerspective2Grid();
      event.preventDefault();
      return;
    }

    if (
      perspective2Drag
    ) {
      perspective2Drag =
        null;
      drawPerspective2Grid();
      event.preventDefault();
      return;
    }

    if (
      imageCropTarget
    ) {
      cancelImageCrop();
      event.preventDefault();
      return;
    }

    if (
      freeDrawPointerId !== null
    ) {
      cancelFreeDrawStroke();
      toolStatus.textContent =
        "Free Draw: cancelled";
      return;
    }

    closeCanvasContextMenu();
    closeCanvasTabContextMenu();

    if (activeTextEdit) {
      finishTextEditing(false);
      return;
    }

    if (textCreateDrag) {
      textCreateDrag.guide?.remove();
      textCreateDrag = null;
      return;
    }

    if (shapeBuilderDrawing) {
      shapeBuilderDrawing = false;
      shapeBuilderPoints = [];
      shapeBuilderHits = [];
      shapeBuilderSubtracting = false;
      resetShapeBuilderRegions();
      drawSelection();
    } else if (activePath) {
      finishPath();
    } else if (pendingShape) {
      pendingShape.remove();
      pendingShape = null;
      startPoint = null;
      selected = null;
      selectedItems = [];
      selectionOverlay.innerHTML = "";
      renderLayers();
    } else {
      deselect();
    }
    return;
  }

  if (event.key === "Delete" || event.key === "Backspace") {
    deleteSelected();
  }
});

/* ---------------- PATH PARSER ----------------
   Used for duplicated/exported paths created by this editor.
*/
function parseSimpleCubicPath(d) {
  if (!d) return [];
  const nums = (d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || []).map(Number);
  const anchors = [];
  if (nums.length < 2) return anchors;

  anchors.push({
    x: nums[0], y: nums[1],
    inX: nums[0], inY: nums[1],
    outX: nums[0], outY: nums[1]
  });

  let i = 2;
  while (i + 5 < nums.length) {
    const prev = anchors[anchors.length - 1];
    prev.outX = nums[i];
    prev.outY = nums[i + 1];

    anchors.push({
      inX: nums[i + 2],
      inY: nums[i + 3],
      x: nums[i + 4],
      y: nums[i + 5],
      outX: nums[i + 4],
      outY: nums[i + 5]
    });

    i += 6;
  }

  return anchors;
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function propertySectionKey(section, title) {
  if (section.id) {
    return section.id;
  }

  return (
    "property-" +
    title
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  );
}

function initializeCollapsiblePropertySections() {
  const sections = [
    ...propertiesView.querySelectorAll(":scope > .panel-section")
  ];

  const defaultOpenTitles = new Set([
    "Transform",
    "Appearance"
  ]);

  sections.forEach(section => {
    if (section.dataset.collapsibleReady === "true") {
      return;
    }

    const existingHeading =
      section.querySelector(":scope > h3") ||
      section.querySelector(":scope > .transform-heading");

    if (!existingHeading) return;

    const headingText =
      existingHeading.matches("h3")
        ? existingHeading.textContent.trim()
        : existingHeading.querySelector("h3")?.textContent.trim();

    if (!headingText) return;

    const sectionKey = propertySectionKey(
      section,
      headingText
    );

    const storageKey =
      `vector-studio-property-section:${sectionKey}`;

    let open = defaultOpenTitles.has(headingText);

    try {
      const stored = localStorage.getItem(storageKey);

      if (stored === "open") open = true;
      if (stored === "closed") open = false;
    } catch {
      // Storage can be unavailable in restricted/local contexts.
    }

    const header = document.createElement("div");
    header.className = "panel-section-header";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "panel-section-toggle";
    toggle.setAttribute(
      "aria-expanded",
      open ? "true" : "false"
    );

    const chevron = document.createElement("span");
    chevron.className = "panel-section-chevron";
    chevron.textContent = "›";

    const title = document.createElement("span");
    title.className = "panel-section-title";
    title.textContent = headingText;

    toggle.append(
      chevron,
      title
    );

    header.appendChild(toggle);

    /*
     * Transform already has the aspect-ratio link button in its heading.
     * Keep it as a header accessory rather than burying it inside the body.
     */
    if (existingHeading.matches(".transform-heading")) {
      const accessory =
        existingHeading.querySelector("#transformLockAspect");

      if (accessory) {
        accessory.classList.add("panel-section-accessory");
        header.appendChild(accessory);
      }
    }

    const body = document.createElement("div");
    body.className = "panel-section-body";

    const children = [...section.children];

    children.forEach(child => {
      if (child !== existingHeading) {
        body.appendChild(child);
      }
    });

    existingHeading.remove();

    section.replaceChildren(
      header,
      body
    );

    section.dataset.collapsibleReady = "true";
    section.dataset.sectionKey = sectionKey;
    section.classList.toggle(
      "collapsed",
      !open
    );

    toggle.addEventListener("click", () => {
      const nextOpen =
        section.classList.contains("collapsed");

      section.classList.toggle(
        "collapsed",
        !nextOpen
      );

      toggle.setAttribute(
        "aria-expanded",
        nextOpen ? "true" : "false"
      );

      try {
        localStorage.setItem(
          storageKey,
          nextOpen ? "open" : "closed"
        );
      } catch {
        // Ignore storage errors.
      }
    });
  });
}

initializeCollapsiblePropertySections();
resizeCanvas(960, 640);
updateCanvasBackground();
renderLayers();
setTool("select");
showRightPanel("properties");
syncColorTrigger("fill", fill.value);
syncColorTrigger("topFill", topFill.value);
syncColorTrigger("stroke", stroke.value);
syncColorTrigger("topStroke", topStroke.value);
syncColorTrigger("canvasBackground", canvasBackground.value);
updateGradientEditorVisuals();
updateAlignDistributeControls();
fillOpacityValue.textContent = `${fillOpacity.value}%`;
strokeOpacityValue.textContent = `${strokeOpacity.value}%`;
updateAdvancedStrokeLabels();
syncAppearanceNumericFields();
setStrokeProfileOnSelection(
  strokeProfile.value,
  { record: false }
);
updateSnapMenuChecks();
initializeApplicationTheme();
renderPatternSwatches();
updatePatternEditorVisuals();
initializeFreeDrawSmoothing();
initializeFreeDrawShapeDetection();
resetHistory();
updatePasteboardViewport(canvasWidth, canvasHeight);
updatePathfinderControls();
updatePathEditingControls();
initializeRulers();
renderGuides();
initializeDefaultShapeAppearance();

const restoredAutosave =
  splitEmbeddedMode
    ? false
    : restoreAutosaveSession();

if (!restoredAutosave) {
  initializeCanvasTabs();

  if (
    !splitEmbeddedMode
  ) {
    openNewDocumentModal({
      startup: true
    });
  }
}

window.addEventListener(
  "beforeunload",
  () => {
    if (
      splitEmbeddedMode
    ) {
      splitEmbeddedNotifyParent(
        "beforeunload"
      );

      return;
    }

    writeAutosaveNow();
  }
);

document.addEventListener(
  "visibilitychange",
  () => {
    if (
      document.visibilityState ===
      "hidden"
    ) {
      writeAutosaveNow();
    }
  }
);

window.addEventListener(
  "pagehide",
  () => {
    if (!splitEmbeddedMode) {
      writeAutosaveNow();
    }
  }
);

window.addEventListener("resize", positionSelectionQuickMenu);

window.addEventListener("resize", closeCanvasContextMenu);

window.addEventListener("resize", closeCanvasTabContextMenu);


constraintValuePopup.addEventListener(
  "pointerdown",
  event => {
    event.stopPropagation();
  }
);


updateFullscreenMenuState();

function positionRightPanelTabRailBelowHeader() {
  const rail =
    document.querySelector(
      "#rightPanelTabRail"
    );

  if (!rail) return;

  /*
   * The rail now lives inside #rightPanel and is positioned relative to that
   * panel, so no viewport/header offset calculation is required.
   */
  rail.style.top =
    "0px";

  rail.style.right =
    "0px";
}




function initializeRightPanelTabs() {
  const rail =
    document.querySelector(
      "#rightPanelTabRail"
    );

  if (
    !rail ||
    rail.dataset.clickBound ===
      "true"
  ) {
    return;
  }

  rail.dataset.clickBound =
    "true";

  let dragState =
    null;

  const finishDrag =
    event => {
      if (
        !dragState ||
        event.pointerId !==
          dragState.pointerId
      ) {
        return;
      }

      const {
        tab,
        dragging
      } =
        dragState;

      try {
        tab.releasePointerCapture?.(
          event.pointerId
        );
      } catch {}

      tab.classList.remove(
        "dragging"
      );

      if (
        !dragging
      ) {
        if (dragState.shiftKey || event.shiftKey) {
          shiftSelectRightPanel(tab.dataset.panelView);
        } else {
          showRightPanel(tab.dataset.panelView);
        }
      }

      dragState =
        null;

      event.preventDefault();
      event.stopPropagation();
    };

  rail.addEventListener(
    "pointerdown",
    event => {
      const tab =
        event.target.closest(
          ".right-panel-tab"
        );

      if (
        !tab ||
        event.button !== 0
      ) {
        return;
      }

      dragState = {
        tab,
        pointerId:
          event.pointerId,
        startX:
          event.clientX,
        startY:
          event.clientY,
        dragging:
          false,
        shiftKey:
          event.shiftKey
      };

      tab.setPointerCapture?.(
        event.pointerId
      );

      event.preventDefault();
      event.stopPropagation();
    }
  );

  rail.addEventListener(
    "pointermove",
    event => {
      if (
        !dragState ||
        event.pointerId !==
          dragState.pointerId
      ) {
        return;
      }

      const distance =
        Math.hypot(
          event.clientX -
            dragState.startX,
          event.clientY -
            dragState.startY
        );

      if (
        !dragState.dragging &&
        distance >= 6
      ) {
        dragState.dragging =
          true;

        dragState.tab.classList.add(
          "dragging"
        );
      }

      if (
        !dragState.dragging
      ) {
        return;
      }

      const candidates =
        [
          ...rail.querySelectorAll(
            ".right-panel-tab:not(.dragging)"
          )
        ];

      const beforeTab =
        candidates.find(
          tab => {
            const rect =
              tab.getBoundingClientRect();

            return (
              event.clientY <
              rect.top +
                rect.height / 2
            );
          }
        );

      rail.insertBefore(
        dragState.tab,
        beforeTab ||
        null
      );

      event.preventDefault();
      event.stopPropagation();
    }
  );

  rail.addEventListener(
    "pointerup",
    finishDrag
  );

  rail.addEventListener(
    "pointercancel",
    event => {
      if (
        !dragState ||
        event.pointerId !==
          dragState.pointerId
      ) {
        return;
      }

      dragState.tab.classList.remove(
        "dragging"
      );

      dragState =
        null;
    }
  );

  /*
   * Suppress the synthetic click generated after pointerup.
   * Activation is handled directly in finishDrag().
   */
  rail.addEventListener(
    "click",
    event => {
      if (
        event.target.closest(
          ".right-panel-tab"
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  );
}







if (
  document.readyState ===
    "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    initializeRightPanelTabs,
    {
      once:
        true
    }
  );
} else {

}


window.addEventListener(
  "resize",
  () =>
    requestAnimationFrame(
      positionRightPanelTabRailBelowHeader
    )
);

document.addEventListener(
  "fullscreenchange",
  () =>
    requestAnimationFrame(
      positionRightPanelTabRailBelowHeader
    )
);


if (
  document.readyState ===
    "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    initializeRightPanelTabs,
    {
      once:
        true
    }
  );
} else {
  initializeRightPanelTabs();
showRightPanel("properties");
}


if (
  document.readyState ===
    "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      initializeRightPanelTabs();
    },
    {
      once:
        true
    }
  );
} else {
  initializeRightPanelTabs();
}


if (
  document.readyState ===
    "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    initializeSplitCanvasView,
    {
      once:
        true
    }
  );
} else {
  initializeSplitCanvasView();
}


document.addEventListener(
  "pointerdown",
  event => {
    if (
      splitEmbeddedMode ||
      !splitCanvasViewActive
    ) {
      return;
    }

    if (
      splitCanvasLivePane?.contains(
        event.target
      )
    ) {
      setSplitCanvasInteractionTarget(
        "main"
      );
    }
  },
  true
);
