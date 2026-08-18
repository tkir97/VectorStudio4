/* Vector Studio modular baseline — source lines 53590-57655 from consolidated app.js.
   Classic-script module: shares the browser global lexical scope with ordered sibling modules. */

/* ---------------- SAVE / OPEN PROJECT ---------------- */

function serializeElementForProject(element) {
  const data = {
    tag: element.tagName,
    attributes: {},
    dataset: { ...element.dataset }
  };

  [...element.attributes].forEach(attr => {
    if (attr.name !== "data-object" && !attr.name.startsWith("data-")) {
      data.attributes[attr.name] = attr.value;
    }
  });

  if (element._anchors) {
    data.anchors = element._anchors.map(anchor => ({ ...anchor }));
  }

  if (isGroup(element)) {
    data.children = [...element.children].map(
      serializeElementForProject
    );
  } else if (
    element.dataset.compoundShape === "true" ||
    element.tagName === "text"
  ) {
    data.innerHTML = element.innerHTML;
  }

  return data;
}

function canvasDocumentById(id) {
  return canvasDocuments.find(document => document.id === id) || null;
}

function activeCanvasDocument() {
  return canvasDocumentById(activeCanvasDocumentId);
}

function displayCanvasDocumentTitle(document) {
  return (
    document?.title ||
    document?.filename?.replace(/\.vgs$/i, "") ||
    "Untitled"
  );
}

function blankCanvasProject() {
  return {
    format: "vector-studio-project",
    version: 1,
    document: {
      width: 960,
      height: 640,
      backgroundColor: "#ffffff",
      transparent: false,
      snapping: { ...snapSettings },
      guides: [],
      guidesVisible: true,
      guidesLocked: false,
      customGoogleFonts:
        customGoogleFontsForProject(),
      geometryConstraints:
        documentGeometryConstraints.map(
          constraint =>
            JSON.parse(
              JSON.stringify(
                constraint
              )
            )
        ),
      patternSwatches:
        patternSwatches.map(
          swatch => ({
            ...swatch
          })
        ),
      artBrushPresets:
        artBrushPresets.map(
          preset => ({
            ...preset
          })
        ),
      perspective2:
        normalizePerspective2State(
          perspective2State
        )
    },
    objects: []
  };
}

function saveActiveCanvasDocumentState() {
  const document = activeCanvasDocument();

  if (!document || switchingCanvasDocument) return;

  document.project = serializeProject();
  document.filename = currentProjectName;
  document.undoHistory = [...undoHistory];
  document.redoHistory = [...redoHistory];
  document.undoHistoryMeta = [...undoHistoryMeta];
  document.redoHistoryMeta = [...redoHistoryMeta];
  document.zoom = zoom;
  document.panX = zoomPanX;
  document.panY = zoomPanY;
}


function compactProjectForAutosave(project) {
  const copy = JSON.parse(JSON.stringify(project));

  const compactObject = object => {
    if (!object || typeof object !== "object") return;

    /*
     * Live 3D extrudes are fully reconstructable from their compact
     * data-three-d-source + data-three-d-settings payloads. Persisting every
     * generated face polygon duplicates that data and can easily overflow
     * localStorage, especially across undo-history snapshots.
     */
    if (object.dataset?.threeDExtrude === "true") {
      delete object.children;
      delete object.innerHTML;
      return;
    }

    if (Array.isArray(object.children)) {
      object.children.forEach(compactObject);
    }
  };

  if (Array.isArray(copy?.objects)) {
    copy.objects.forEach(compactObject);
  }

  return copy;
}

function compactAutosaveHistorySnapshot(snapshot) {
  if (typeof snapshot !== "string" || !snapshot) {
    return snapshot;
  }

  try {
    return JSON.stringify(
      compactProjectForAutosave(
        JSON.parse(snapshot)
      )
    );
  } catch {
    return snapshot;
  }
}

function autosaveHistoryTail(
  values,
  limit =
    AUTOSAVE_HISTORY_LIMIT + 1
) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.slice(
    -limit
  ).map(compactAutosaveHistorySnapshot);
}

function autosaveDocumentData(
  document
) {
  return {
    id: document.id,
    title: document.title,
    filename: document.filename,
    project:
      compactProjectForAutosave(
        document.project ||
        blankCanvasProject()
      ),
    undoHistory:
      autosaveHistoryTail(
        document.undoHistory
      ),
    redoHistory:
      autosaveHistoryTail(
        document.redoHistory,
        AUTOSAVE_HISTORY_LIMIT
      ),
    undoHistoryMeta:
      autosaveHistoryTail(
        document.undoHistoryMeta
      ),
    redoHistoryMeta:
      autosaveHistoryTail(
        document.redoHistoryMeta,
        AUTOSAVE_HISTORY_LIMIT
      ),
    zoom:
      Number(document.zoom) || 1,
    panX:
      Number(document.panX) || 0,
    panY:
      Number(document.panY) || 0
  };
}

function buildAutosaveSession() {
  saveActiveCanvasDocumentState();

  return {
    format:
      "vector-studio-autosave",
    version: 1,
    savedAt:
      new Date().toISOString(),
    activeCanvasDocumentId,
    canvasDocumentCounter,
    documents:
      canvasDocuments.map(
        autosaveDocumentData
      )
  };
}

function autosavePayloadString(payload) {
  return JSON.stringify(payload);
}

function lightweightAutosaveSession(payload) {
  return {
    ...payload,
    documents: (payload.documents || []).map(document => ({
      ...document,
      undoHistory: [],
      redoHistory: [],
      undoHistoryMeta: [],
      redoHistoryMeta: []
    }))
  };
}

function writeRefreshAutosaveFallback(serialized) {
  let wrote = false;

  try {
    sessionStorage.setItem(
      AUTOSAVE_SESSION_KEY,
      serialized
    );
    wrote = true;
  } catch (error) {
    console.warn(
      "Vector Studio refresh autosave could not be written to sessionStorage.",
      error
    );
  }

  /*
   * window.name survives a normal refresh in the current tab and gives us a
   * synchronous last-resort recovery channel in environments where Web
   * Storage is restricted (notably some local-file/browser configurations).
   * It is used only for our prefixed payload and never trusted without normal
   * autosave validation on restore.
   */
  try {
    window.name =
      AUTOSAVE_WINDOW_NAME_PREFIX +
      serialized;
    wrote = true;
  } catch (error) {
    console.warn(
      "Vector Studio refresh autosave could not be written to window.name.",
      error
    );
  }

  return wrote;
}

function writeAutosaveNow() {
  if (
    autosaveRestoring ||
    switchingCanvasDocument
  ) {
    return false;
  }

  try {
    const payload =
      buildAutosaveSession();

    if (!payload.documents.length) {
      return false;
    }

    let serialized =
      autosavePayloadString(payload);
    let persistentWritten = false;

    try {
      localStorage.setItem(
        AUTOSAVE_STORAGE_KEY,
        serialized
      );
      persistentWritten = true;
    } catch (error) {
      /*
       * History is useful but should never be allowed to prevent refresh
       * recovery. Retry with the current document states only.
       */
      console.warn(
        "Vector Studio full autosave could not be written; retrying compact refresh state.",
        error
      );

      const lightweight =
        lightweightAutosaveSession(payload);
      serialized =
        autosavePayloadString(lightweight);

      try {
        localStorage.setItem(
          AUTOSAVE_STORAGE_KEY,
          serialized
        );
        persistentWritten = true;
      } catch (fallbackError) {
        console.warn(
          "Vector Studio compact local autosave could not be written.",
          fallbackError
        );
      }
    }

    const refreshWritten =
      writeRefreshAutosaveFallback(
        serialized
      );

    return Boolean(
      persistentWritten ||
      refreshWritten
    );
  } catch (error) {
    console.warn(
      "Vector Studio autosave could not be written.",
      error
    );

    return false;
  }
}

function scheduleAutosave(
  delay = 350
) {
  if (
    autosaveRestoring
  ) {
    return;
  }

  if (autosaveTimer) {
    clearTimeout(
      autosaveTimer
    );
  }

  autosaveTimer =
    setTimeout(
      () => {
        autosaveTimer = null;
        writeAutosaveNow();
      },
      delay
    );
}

function validAutosaveProject(
  project
) {
  return Boolean(
    project &&
    project.format ===
      "vector-studio-project" &&
    project.document &&
    Array.isArray(
      project.objects
    )
  );
}

function normalizeAutosaveDocument(
  data,
  index
) {
  if (
    !data ||
    !validAutosaveProject(
      data.project
    )
  ) {
    return null;
  }

  const id =
    typeof data.id === "string" &&
    data.id
      ? data.id
      : `canvas-document-${index + 1}`;

  const filename =
    normalizeProjectFilename(
      data.filename ||
      data.title ||
      `Untitled ${index + 1}`
    );

  const undo =
    Array.isArray(
      data.undoHistory
    )
      ? [...data.undoHistory]
      : [];

  const undoMeta =
    Array.isArray(
      data.undoHistoryMeta
    )
      ? [...data.undoHistoryMeta]
      : [];

  if (!undo.length) {
    undo.push(
      JSON.stringify(
        data.project
      )
    );
  }

  while (
    undoMeta.length <
    undo.length
  ) {
    undoMeta.push(
      undoMeta.length === 0
        ? {
            label:
              "Restored Session",
            detail:
              "Recovered from local autosave"
          }
        : null
    );
  }

  return {
    id,
    title:
      String(
        data.title ||
        filename.replace(
          /\.vgs$/i,
          ""
        ) ||
        `Untitled ${index + 1}`
      ),
    filename,
    project:
      JSON.parse(
        JSON.stringify(
          data.project
        )
      ),
    undoHistory: undo,
    redoHistory:
      Array.isArray(
        data.redoHistory
      )
        ? [...data.redoHistory]
        : [],
    undoHistoryMeta:
      undoMeta,
    redoHistoryMeta:
      Array.isArray(
        data.redoHistoryMeta
      )
        ? [...data.redoHistoryMeta]
        : [],
    zoom:
      Number(data.zoom) || 1,
    panX:
      Number(data.panX) || 0,
    panY:
      Number(data.panY) || 0
  };
}

function parseAutosaveCandidate(raw, source) {
  if (!raw || typeof raw !== "string") {
    return null;
  }

  try {
    const payload = JSON.parse(raw);

    if (
      !payload ||
      payload.format !== "vector-studio-autosave" ||
      payload.version !== 1 ||
      !Array.isArray(payload.documents)
    ) {
      return null;
    }

    const restored =
      payload.documents
        .map(normalizeAutosaveDocument)
        .filter(Boolean);

    if (!restored.length) {
      return null;
    }

    const savedTime =
      Date.parse(payload.savedAt || "") || 0;

    return {
      source,
      payload,
      restored,
      savedTime
    };
  } catch (error) {
    console.warn(
      `Vector Studio autosave candidate from ${source} could not be parsed.`,
      error
    );
    return null;
  }
}

function autosaveRestoreCandidates() {
  const candidates = [];

  try {
    const candidate = parseAutosaveCandidate(
      localStorage.getItem(
        AUTOSAVE_STORAGE_KEY
      ),
      "localStorage"
    );
    if (candidate) candidates.push(candidate);
  } catch (error) {
    console.warn(
      "Vector Studio local autosave storage is unavailable.",
      error
    );
  }

  try {
    const candidate = parseAutosaveCandidate(
      sessionStorage.getItem(
        AUTOSAVE_SESSION_KEY
      ),
      "sessionStorage"
    );
    if (candidate) candidates.push(candidate);
  } catch (error) {
    console.warn(
      "Vector Studio refresh autosave storage is unavailable.",
      error
    );
  }

  try {
    if (
      typeof window.name === "string" &&
      window.name.startsWith(
        AUTOSAVE_WINDOW_NAME_PREFIX
      )
    ) {
      const candidate = parseAutosaveCandidate(
        window.name.slice(
          AUTOSAVE_WINDOW_NAME_PREFIX.length
        ),
        "window.name"
      );
      if (candidate) candidates.push(candidate);
    }
  } catch (error) {
    console.warn(
      "Vector Studio window refresh cache is unavailable.",
      error
    );
  }

  return candidates.sort(
    (a, b) => b.savedTime - a.savedTime
  );
}

function restoreAutosaveSession() {
  const candidate =
    autosaveRestoreCandidates()[0];

  if (!candidate) {
    return false;
  }

  try {
    const { payload, restored, source } =
      candidate;

    autosaveRestoring = true;

    try {
      canvasDocuments = restored;
      closedCanvasDocuments = [];

      const numericIds =
        restored.map(document => {
          const match =
            String(document.id).match(
              /canvas-document-(\d+)/
            );

          return match
            ? Number(match[1])
            : 0;
        });

      canvasDocumentCounter =
        Math.max(
          Number(
            payload.canvasDocumentCounter
          ) || 0,
          restored.length,
          ...numericIds
        );

      const preferred =
        restored.find(
          document =>
            document.id ===
            payload.activeCanvasDocumentId
        ) || restored[0];

      activeCanvasDocumentId = null;

      renderCanvasTabs();
      switchCanvasDocument(
        preferred.id
      );

      toolStatus.textContent =
        `Restored autosave • ${displayCanvasDocumentTitle(preferred)}`;

      console.info(
        `Vector Studio restored refresh state from ${source}.`
      );
    } finally {
      autosaveRestoring = false;
    }

    /* Refresh all recovery stores from the state we just accepted. */
    scheduleAutosave(0);
    return true;
  } catch (error) {
    console.warn(
      "Vector Studio autosave could not be restored.",
      error
    );

    return false;
  }
}

function clearAutosaveSession() {
  if (autosaveTimer) {
    clearTimeout(
      autosaveTimer
    );
    autosaveTimer = null;
  }

  try {
    localStorage.removeItem(
      AUTOSAVE_STORAGE_KEY
    );
  } catch (error) {
    console.warn(
      "Vector Studio autosave could not be cleared.",
      error
    );
  }

  try {
    sessionStorage.removeItem(
      AUTOSAVE_SESSION_KEY
    );
  } catch {
    // Ignore refresh-cache storage errors.
  }

  try {
    if (
      typeof window.name === "string" &&
      window.name.startsWith(
        AUTOSAVE_WINDOW_NAME_PREFIX
      )
    ) {
      window.name = "";
    }
  } catch {
    // Ignore window.name errors.
  }
}


function createCanvasDocument(
  {
    project = blankCanvasProject(),
    title = null,
    filename = "untitled.vgs",
    activate = true
  } = {}
) {
  const document = {
    id: `canvas-document-${++canvasDocumentCounter}`,
    title:
      title ||
      filename.replace(/\.vgs$/i, "") ||
      `Untitled ${canvasDocumentCounter}`,
    filename: normalizeProjectFilename(filename),
    project: JSON.parse(JSON.stringify(project)),
    undoHistory: [JSON.stringify(project)],
    redoHistory: [],
    undoHistoryMeta: [{ label: "Initial State", detail: "Document created" }],
    redoHistoryMeta: [],
    zoom: 1,
    panX: 0,
    panY: 0
  };

  canvasDocuments.push(document);
  renderCanvasTabs();

  if (activate) {
    switchCanvasDocument(document.id);
  }

  scheduleAutosave();

  return document;
}

function switchCanvasDocument(id) {
  if (id === activeCanvasDocumentId) return;

  const next = canvasDocumentById(id);
  if (!next) return;

  saveActiveCanvasDocumentState();

  switchingCanvasDocument = true;
  historyRestoring = true;

  try {
    activeCanvasDocumentId = next.id;
    currentProjectName = next.filename || "untitled.vgs";

    loadProjectData(
      JSON.parse(JSON.stringify(next.project))
    );

    undoHistory = [...(next.undoHistory || [])];
    redoHistory = [...(next.redoHistory || [])];
    undoHistoryMeta = [...(next.undoHistoryMeta || [])];
    redoHistoryMeta = [...(next.redoHistoryMeta || [])];

    if (!undoHistory.length) {
      undoHistory = [projectSnapshotString()];
    }

    while (undoHistoryMeta.length < undoHistory.length) {
      undoHistoryMeta.push(
        undoHistoryMeta.length === 0
          ? { label: "Initial State", detail: "Document opened" }
          : null
      );
    }

    while (redoHistoryMeta.length < redoHistory.length) {
      redoHistoryMeta.push(null);
    }

    zoom = Number(next.zoom) || 1;
    zoomPanX = Number(next.panX) || 0;
    zoomPanY = Number(next.panY) || 0;

    applyZoomTransform();
  } finally {
    historyRestoring = false;
    switchingCanvasDocument = false;
  }

  updateHistoryControls();
  renderCanvasTabs();
  renderLayers();
  drawSelection();
  renderHistoryPanel();

  toolStatus.textContent =
    `Canvas: ${displayCanvasDocumentTitle(next)}`;

  if (
    splitCanvasViewActive
  ) {
    ensureSplitCanvasSecondaryDocument();
    loadSplitCanvasSecondaryIntoIframe();
  }

  scheduleAutosave();
}

function closeCanvasDocument(id) {
  const index = canvasDocuments.findIndex(
    document => document.id === id
  );

  if (index < 0) return;

  const wasActive = id === activeCanvasDocumentId;

  if (wasActive) {
    saveActiveCanvasDocumentState();
  }

  const closingDocument =
    canvasDocuments[index];

  closedCanvasDocuments.push({
    document: JSON.parse(
      JSON.stringify(closingDocument)
    ),
    index
  });

  if (closedCanvasDocuments.length > 20) {
    closedCanvasDocuments.shift();
  }

  canvasDocuments.splice(index, 1);

  if (!canvasDocuments.length) {
    activeCanvasDocumentId = null;
    createCanvasDocument({
      title: "Untitled",
      filename: "untitled.vgs",
      activate: true
    });
    return;
  }

  if (wasActive) {
    activeCanvasDocumentId = null;

    const next =
      canvasDocuments[Math.min(index, canvasDocuments.length - 1)];

    switchCanvasDocument(next.id);
  } else {
    renderCanvasTabs();
    scheduleAutosave();
  }

  if (
    splitCanvasViewActive
  ) {
    ensureSplitCanvasSecondaryDocument();
    loadSplitCanvasSecondaryIntoIframe();
  }
}


function beginCanvasTabRename(canvasDocument, tabElement) {
  const titleElement =
    tabElement.querySelector(".canvas-tab-title");

  if (!titleElement) return;

  closeCanvasTabContextMenu();

  const input = window.document.createElement("input");
  input.className = "canvas-tab-rename";
  input.value = displayCanvasDocumentTitle(canvasDocument);

  const main =
    tabElement.querySelector(".canvas-tab-main");

  tabElement.classList.add("renaming");
  main.replaceChildren(input);

  requestAnimationFrame(() => {
    input.focus();
    input.select();
  });

  let finished = false;

  const finish = save => {
    if (finished) return;
    finished = true;

    if (save) {
      const nextTitle = input.value.trim();

      if (nextTitle) {
        canvasDocument.title = nextTitle;
        canvasDocument.filename =
          normalizeProjectFilename(nextTitle);

        if (canvasDocument.id === activeCanvasDocumentId) {
          currentProjectName = canvasDocument.filename;
          saveActiveCanvasDocumentState();
        }
      }
    }

    renderCanvasTabs();

    if (save) {
      scheduleAutosave();
    }
  };

  input.addEventListener("pointerdown", event => {
    event.stopPropagation();
  });

  input.addEventListener("click", event => {
    event.stopPropagation();
  });

  input.addEventListener("dblclick", event => {
    event.stopPropagation();
  });

  input.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      finish(true);
    }

    if (event.key === "Escape") {
      event.preventDefault();
      finish(false);
    }
  });

  input.addEventListener("blur", () => finish(true));
}

function closeCanvasTabContextMenu() {
  canvasTabContextMenu.hidden = true;
  canvasTabContextMenu.dataset.canvasDocumentId = "";
}

function placeCanvasTabContextMenu(clientX, clientY) {
  canvasTabContextMenu.style.left = `${clientX}px`;
  canvasTabContextMenu.style.top = `${clientY}px`;

  requestAnimationFrame(() => {
    const rect = canvasTabContextMenu.getBoundingClientRect();
    const pad = 8;

    const x =
      rect.right > window.innerWidth - pad
        ? Math.max(pad, window.innerWidth - rect.width - pad)
        : clientX;

    const y =
      rect.bottom > window.innerHeight - pad
        ? Math.max(pad, window.innerHeight - rect.height - pad)
        : clientY;

    canvasTabContextMenu.style.left = `${x}px`;
    canvasTabContextMenu.style.top = `${y}px`;
  });
}

function duplicateCanvasDocument(id) {
  if (id === activeCanvasDocumentId) {
    saveActiveCanvasDocumentState();
  }

  const source = canvasDocumentById(id);
  if (!source) return;

  const copyNumber =
    canvasDocuments.filter(document =>
      displayCanvasDocumentTitle(document).startsWith(
        `${displayCanvasDocumentTitle(source)} Copy`
      )
    ).length + 1;

  const title =
    copyNumber === 1
      ? `${displayCanvasDocumentTitle(source)} Copy`
      : `${displayCanvasDocumentTitle(source)} Copy ${copyNumber}`;

  const duplicate = {
    id: `canvas-document-${++canvasDocumentCounter}`,
    title,
    filename: normalizeProjectFilename(title),
    project: JSON.parse(JSON.stringify(source.project)),
    undoHistory: [...(source.undoHistory || [])],
    redoHistory: [...(source.redoHistory || [])],
    undoHistoryMeta: [...(source.undoHistoryMeta || [])],
    redoHistoryMeta: [...(source.redoHistoryMeta || [])],
    zoom: Number(source.zoom) || 1,
    panX: Number(source.panX) || 0,
    panY: Number(source.panY) || 0
  };

  const sourceIndex = canvasDocuments.findIndex(
    document => document.id === id
  );

  canvasDocuments.splice(
    sourceIndex + 1,
    0,
    duplicate
  );

  renderCanvasTabs();
  switchCanvasDocument(duplicate.id);
}

function reopenLastClosedCanvasDocument() {
  const entry = closedCanvasDocuments.pop();

  if (!entry) {
    return;
  }

  saveActiveCanvasDocumentState();

  const restored = {
    ...entry.document,
    id: `canvas-document-${++canvasDocumentCounter}`,
    project: JSON.parse(
      JSON.stringify(entry.document.project)
    ),
    undoHistory: [
      ...(entry.document.undoHistory || [])
    ],
    redoHistory: [
      ...(entry.document.redoHistory || [])
    ],
    undoHistoryMeta: [
      ...(entry.document.undoHistoryMeta || [])
    ],
    redoHistoryMeta: [
      ...(entry.document.redoHistoryMeta || [])
    ]
  };

  const insertIndex = Math.min(
    Math.max(entry.index, 0),
    canvasDocuments.length
  );

  canvasDocuments.splice(
    insertIndex,
    0,
    restored
  );

  renderCanvasTabs();
  switchCanvasDocument(restored.id);
}

function closeOtherCanvasDocuments(id) {
  if (id === activeCanvasDocumentId) {
    saveActiveCanvasDocumentState();
  }

  const target = canvasDocumentById(id);
  if (!target) return;

  canvasDocuments = [target];

  if (activeCanvasDocumentId !== id) {
    activeCanvasDocumentId = null;
    switchCanvasDocument(id);
  } else {
    renderCanvasTabs();
  }
}

function closeCanvasDocumentsToRight(id) {
  const index = canvasDocuments.findIndex(
    document => document.id === id
  );

  if (index < 0 || index >= canvasDocuments.length - 1) {
    return;
  }

  const removedIds = new Set(
    canvasDocuments
      .slice(index + 1)
      .map(document => document.id)
  );

  const activeRemoved =
    removedIds.has(activeCanvasDocumentId);

  if (activeCanvasDocumentId) {
    saveActiveCanvasDocumentState();
  }

  canvasDocuments =
    canvasDocuments.slice(0, index + 1);

  if (activeRemoved) {
    activeCanvasDocumentId = null;
    switchCanvasDocument(id);
  } else {
    renderCanvasTabs();
  }
}

function openCanvasTabContextMenu(
  event,
  canvasDocument,
  tabElement
) {
  event.preventDefault();
  event.stopPropagation();

  closeCanvasContextMenu();
  closeCanvasTabContextMenu();

  canvasTabContextMenu.dataset.canvasDocumentId =
    canvasDocument.id;

  canvasTabContextMenu.replaceChildren(
    contextMenuItem("Rename", "tab-rename"),
    contextMenuItem("Duplicate Tab", "tab-duplicate"),
    contextMenuSeparator(),
    contextMenuItem("Close", "tab-close"),
    contextMenuItem(
      "Close Other Tabs",
      "tab-close-others",
      {
        disabled: canvasDocuments.length <= 1
      }
    ),
    contextMenuItem(
      "Close Tabs to the Right",
      "tab-close-right",
      {
        disabled:
          canvasDocuments.findIndex(
            document => document.id === canvasDocument.id
          ) >= canvasDocuments.length - 1
      }
    ),
    contextMenuSeparator(),
    contextMenuItem(
      "Reopen Last Closed Tab",
      "tab-reopen-last",
      {
        disabled: !closedCanvasDocuments.length
      }
    )
  );

  /*
   * contextMenuItem predates tab menus and ignores disabled, so apply it here
   * explicitly for actions that are not currently available.
   */
  [...canvasTabContextMenu.querySelectorAll(".context-menu-item")]
    .forEach(button => {
      const action = button.dataset.contextAction;

      if (
        action === "tab-close-others" &&
        canvasDocuments.length <= 1
      ) {
        button.disabled = true;
      }

      if (
        action === "tab-close-right" &&
        canvasDocuments.findIndex(
          document => document.id === canvasDocument.id
        ) >= canvasDocuments.length - 1
      ) {
        button.disabled = true;
      }

      if (
        action === "tab-reopen-last" &&
        !closedCanvasDocuments.length
      ) {
        button.disabled = true;
      }
    });

  canvasTabContextMenu.hidden = false;
  placeCanvasTabContextMenu(
    event.clientX,
    event.clientY
  );
}

function runCanvasTabContextAction(action) {
  const id =
    canvasTabContextMenu.dataset.canvasDocumentId;

  const canvasDocument =
    canvasDocumentById(id);

  if (!canvasDocument) {
    closeCanvasTabContextMenu();
    return;
  }

  if (action === "tab-rename") {
    const tab =
      canvasTabs.querySelector(
        `[data-canvas-document-id="${id}"]`
      );

    if (tab) {
      beginCanvasTabRename(
        canvasDocument,
        tab
      );
      return;
    }
  }

  if (action === "tab-duplicate") {
    duplicateCanvasDocument(id);
  }

  if (action === "tab-close") {
    closeCanvasDocument(id);
  }

  if (action === "tab-close-others") {
    closeOtherCanvasDocuments(id);
  }

  if (action === "tab-close-right") {
    closeCanvasDocumentsToRight(id);
  }

  if (action === "tab-reopen-last") {
    reopenLastClosedCanvasDocument();
  }

  closeCanvasTabContextMenu();
}

canvasTabContextMenu.addEventListener(
  "pointerdown",
  event => {
    event.stopPropagation();
  }
);

canvasTabContextMenu.addEventListener(
  "click",
  event => {
    const button =
      event.target.closest("[data-context-action]");

    if (!button || button.disabled) return;

    event.preventDefault();
    event.stopPropagation();

    runCanvasTabContextAction(
      button.dataset.contextAction
    );
  }
);



let splitCanvasInteractionTarget =
  "main";

function setSplitCanvasInteractionTarget(
  target
) {
  if (
    target !== "main" &&
    target !== "secondary"
  ) {
    return;
  }

  splitCanvasInteractionTarget =
    target;

  splitCanvasLivePane?.classList.toggle(
    "split-target-active",
    target === "main"
  );

  splitCanvasIframePane?.classList.toggle(
    "split-target-active",
    target === "secondary"
  );

  document.body.classList.toggle(
    "split-target-secondary",
    target === "secondary"
  );
}

function splitCanvasTargetsSecondary() {
  return (
    !splitEmbeddedMode &&
    splitCanvasViewActive &&
    splitCanvasInteractionTarget ===
      "secondary"
  );
}

function sendSplitColorChange(
  color,
  targetId,
  record
) {
  if (
    !splitCanvasTargetsSecondary()
  ) {
    return false;
  }

  postToSplitCanvasIframe({
    type:
      "vector-split-apply-color",
    color,
    targetId,
    record:
      Boolean(record)
  });

  return true;
}

let splitCanvasViewActive =
  false;

let splitCanvasSecondaryDocumentId =
  null;

let splitCanvasHost =
  null;

let splitCanvasLivePane =
  null;

let splitCanvasIframePane =
  null;

let splitCanvasIframe =
  null;

let splitCanvasIframeTitle =
  null;

function splitCanvasSecondaryDocument() {
  return canvasDocumentById(
    splitCanvasSecondaryDocumentId
  );
}

function ensureSplitCanvasSecondaryDocument() {
  let candidates =
    canvasDocuments.filter(
      canvasDocument =>
        canvasDocument.id !==
          activeCanvasDocumentId
    );

  if (!candidates.length) {
    const created =
      createCanvasDocument({
        title:
          `Untitled ${Math.max(
            2,
            canvasDocuments.length + 1
          )}`,
        filename:
          `untitled-${Math.max(
            2,
            canvasDocuments.length + 1
          )}.vgs`,
        activate:
          false
      });

    candidates =
      [created];
  }

  const current =
    candidates.find(
      canvasDocument =>
        canvasDocument.id ===
          splitCanvasSecondaryDocumentId
    );

  const next =
    current ||
    candidates[0];

  splitCanvasSecondaryDocumentId =
    next?.id ||
    null;

  return next ||
    null;
}

function splitCanvasEditorSettings() {
  return {
    tool:
      activeTool,
    fill:
      fill?.value ||
      "none",
    stroke:
      stroke?.value ||
      "#000000",
    strokeWidth:
      strokeWidth?.value ||
      "1"
  };
}

function postToSplitCanvasIframe(
  message
) {
  if (
    !splitCanvasIframe?.contentWindow
  ) {
    return;
  }

  splitCanvasIframe.contentWindow.postMessage(
    message,
    "*"
  );
}

function syncSplitCanvasEditorSettings() {
  if (
    !splitCanvasViewActive
  ) {
    return;
  }

  postToSplitCanvasIframe({
    type:
      "vector-split-editor-settings",
    settings:
      splitCanvasEditorSettings()
  });
}

function loadSplitCanvasSecondaryIntoIframe() {
  if (
    !splitCanvasViewActive ||
    !splitCanvasIframe?.contentWindow
  ) {
    return;
  }

  const secondary =
    ensureSplitCanvasSecondaryDocument();

  if (!secondary) {
    return;
  }

  if (
    splitCanvasIframeTitle
  ) {
    splitCanvasIframeTitle.textContent =
      displayCanvasDocumentTitle(
        secondary
      );
  }

  postToSplitCanvasIframe({
    type:
      "vector-split-load-document",
    documentId:
      secondary.id,
    title:
      displayCanvasDocumentTitle(
        secondary
      ),
    filename:
      secondary.filename,
    project:
      JSON.parse(
        JSON.stringify(
          secondary.project ||
          blankCanvasProject()
        )
      ),
    undoHistory:
      [
        ...(
          secondary.undoHistory ||
          []
        )
      ],
    redoHistory:
      [
        ...(
          secondary.redoHistory ||
          []
        )
      ],
    undoHistoryMeta:
      JSON.parse(
        JSON.stringify(
          secondary.undoHistoryMeta ||
          []
        )
      ),
    redoHistoryMeta:
      JSON.parse(
        JSON.stringify(
          secondary.redoHistoryMeta ||
          []
        )
      ),
    zoom:
      Number(
        secondary.zoom
      ) ||
      1,
    panX:
      Number(
        secondary.panX
      ) ||
      0,
    panY:
      Number(
        secondary.panY
      ) ||
      0,
    settings:
      splitCanvasEditorSettings(),
    clipboard:
      JSON.parse(
        JSON.stringify(
          vectorClipboard ||
          []
        )
      )
  });
}

function setSplitCanvasSecondaryDocument(
  id
) {
  if (
    !splitCanvasViewActive ||
    id ===
      activeCanvasDocumentId
  ) {
    return;
  }

  const canvasDocument =
    canvasDocumentById(
      id
    );

  if (!canvasDocument) {
    return;
  }

  splitCanvasSecondaryDocumentId =
    canvasDocument.id;

  renderCanvasTabs();
  loadSplitCanvasSecondaryIntoIframe();
}

function updateSplitCanvasView() {
  if (
    !splitCanvasHost
  ) {
    return;
  }

  splitCanvasHost.classList.toggle(
    "split-active",
    splitCanvasViewActive
  );

  document.body.classList.toggle(
    "canvas-split-view",
    splitCanvasViewActive
  );

  const button =
    document.querySelector(
      "#splitCanvasViewButton"
    );

  button?.classList.toggle(
    "active",
    splitCanvasViewActive
  );

  button?.setAttribute(
    "aria-pressed",
    splitCanvasViewActive
      ? "true"
      : "false"
  );

  if (
    splitCanvasViewActive
  ) {
    saveActiveCanvasDocumentState();
    ensureSplitCanvasSecondaryDocument();
    renderCanvasTabs();

    requestAnimationFrame(
      () => {
        loadSplitCanvasSecondaryIntoIframe();
        syncSplitCanvasEditorSettings();
      }
    );
  }
}

function toggleSplitCanvasView() {
  splitCanvasViewActive =
    !splitCanvasViewActive;

  updateSplitCanvasView();
}

function initializeSplitCanvasView() {
  if (
    splitEmbeddedMode
  ) {
    return;
  }

  const stageElement =
    document.querySelector(
      "#stage"
    );

  const toggle =
    document.querySelector(
      "#splitCanvasViewButton"
    );

  if (
    !stageElement ||
    !toggle ||
    splitCanvasHost
  ) {
    return;
  }

  splitCanvasHost =
    document.createElement(
      "div"
    );

  splitCanvasHost.id =
    "splitCanvasHost";

  splitCanvasHost.className =
    "split-canvas-host";

  splitCanvasLivePane =
    document.createElement(
      "div"
    );

  splitCanvasLivePane.className =
    "split-canvas-pane split-canvas-live-pane";

  splitCanvasIframePane =
    document.createElement(
      "div"
    );

  splitCanvasIframePane.className =
    "split-canvas-pane split-canvas-iframe-pane";

  const iframeHeader =
    document.createElement(
      "div"
    );

  iframeHeader.className =
    "split-canvas-pane-header";

  splitCanvasIframeTitle =
    document.createElement(
      "span"
    );

  splitCanvasIframeTitle.className =
    "split-canvas-pane-title";

  iframeHeader.appendChild(
    splitCanvasIframeTitle
  );

  splitCanvasIframe =
    document.createElement(
      "iframe"
    );

  splitCanvasIframe.className =
    "split-canvas-editor-frame";

  splitCanvasIframe.title =
    "Secondary editable canvas";

  splitCanvasIframe.src =
    "index.html?splitEmbedded=1";

  splitCanvasIframe.setAttribute(
    "loading",
    "eager"
  );

  splitCanvasIframePane.append(
    iframeHeader,
    splitCanvasIframe
  );

  stageElement.parentNode.insertBefore(
    splitCanvasHost,
    stageElement
  );

  splitCanvasLivePane.appendChild(
    stageElement
  );

  splitCanvasHost.append(
    splitCanvasLivePane,
    splitCanvasIframePane
  );

  splitCanvasLivePane.addEventListener(
    "pointerdown",
    () => {
      if (
        splitCanvasViewActive
      ) {
        setSplitCanvasInteractionTarget(
          "main"
        );
      }
    },
    true
  );

  splitCanvasIframePane.addEventListener(
    "pointerdown",
    () => {
      if (
        splitCanvasViewActive
      ) {
        setSplitCanvasInteractionTarget(
          "secondary"
        );
      }
    },
    true
  );

  splitCanvasIframe.addEventListener(
    "load",
    () => {
      if (
        splitCanvasViewActive
      ) {
        loadSplitCanvasSecondaryIntoIframe();
        syncSplitCanvasEditorSettings();
      }
    }
  );

  toggle.addEventListener(
    "click",
    event => {
      event.preventDefault();
      event.stopPropagation();

      toggleSplitCanvasView();
    }
  );

  updateSplitCanvasView();
  setSplitCanvasInteractionTarget(
    "main"
  );
}

function broadcastSplitClipboard() {
  const payload =
    JSON.parse(
      JSON.stringify(
        vectorClipboard ||
        []
      )
    );

  if (
    splitEmbeddedMode
  ) {
    window.parent?.postMessage(
      {
        type:
          "vector-split-clipboard-updated",
        clipboard:
          payload
      },
      "*"
    );

    return;
  }

  if (
    splitCanvasViewActive
  ) {
    postToSplitCanvasIframe({
      type:
        "vector-split-clipboard-updated",
      clipboard:
        payload
    });
  }
}

function splitEmbeddedNotifyParent(
  reason =
    "change"
) {
  if (
    !splitEmbeddedMode ||
    !splitEmbeddedDocumentId ||
    window.parent ===
      window
  ) {
    return;
  }

  window.parent.postMessage(
    {
      type:
        "vector-split-document-state",
      reason,
      documentId:
        splitEmbeddedDocumentId,
      project:
        serializeProject(),
      filename:
        currentProjectName,
      undoHistory:
        [...undoHistory],
      redoHistory:
        [...redoHistory],
      undoHistoryMeta:
        JSON.parse(
          JSON.stringify(
            undoHistoryMeta ||
            []
          )
        ),
      redoHistoryMeta:
        JSON.parse(
          JSON.stringify(
            redoHistoryMeta ||
            []
          )
        ),
      zoom:
        Number(zoom) ||
        1,
      panX:
        Number(zoomPanX) ||
        0,
      panY:
        Number(zoomPanY) ||
        0
    },
    "*"
  );
}

function applySplitEmbeddedDocument(
  message
) {
  if (
    !splitEmbeddedMode ||
    !message?.project
  ) {
    return;
  }

  splitEmbeddedDocumentId =
    message.documentId ||
    splitEmbeddedDocumentId;

  currentProjectName =
    message.filename ||
    "untitled.vgs";

  historyRestoring =
    true;

  try {
    loadProjectData(
      JSON.parse(
        JSON.stringify(
          message.project
        )
      )
    );
  } finally {
    historyRestoring =
      false;
  }

  undoHistory =
    Array.isArray(
      message.undoHistory
    ) &&
    message.undoHistory.length
      ? [
          ...message.undoHistory
        ]
      : [
          projectSnapshotString()
        ];

  redoHistory =
    Array.isArray(
      message.redoHistory
    )
      ? [
          ...message.redoHistory
        ]
      : [];

  undoHistoryMeta =
    Array.isArray(
      message.undoHistoryMeta
    )
      ? JSON.parse(
          JSON.stringify(
            message.undoHistoryMeta
          )
        )
      : [];

  redoHistoryMeta =
    Array.isArray(
      message.redoHistoryMeta
    )
      ? JSON.parse(
          JSON.stringify(
            message.redoHistoryMeta
          )
        )
      : [];

  zoom =
    Number(
      message.zoom
    ) ||
    1;

  zoomPanX =
    Number(
      message.panX
    ) ||
    0;

  zoomPanY =
    Number(
      message.panY
    ) ||
    0;

  applyZoomTransform();
  renderLayers();
  drawSelection();
  updateHistoryControls();

  if (
    message.settings
  ) {
    applySplitEmbeddedEditorSettings(
      message.settings
    );
  }

  if (
    Array.isArray(
      message.clipboard
    )
  ) {
    vectorClipboard =
      JSON.parse(
        JSON.stringify(
          message.clipboard
        )
      );

    vectorClipboardPasteCount =
      0;
  }

  window.parent?.postMessage(
    {
      type:
        "vector-split-editor-ready",
      documentId:
        splitEmbeddedDocumentId
    },
    "*"
  );
}

function applySplitEmbeddedEditorSettings(
  settings
) {
  if (
    !splitEmbeddedMode ||
    !settings
  ) {
    return;
  }

  if (
    fill &&
    typeof settings.fill ===
      "string"
  ) {
    fill.value =
      settings.fill;
  }

  if (
    stroke &&
    typeof settings.stroke ===
      "string"
  ) {
    stroke.value =
      settings.stroke;
  }

  if (
    strokeWidth &&
    settings.strokeWidth !==
      undefined
  ) {
    strokeWidth.value =
      String(
        settings.strokeWidth
      );
  }

  if (
    settings.tool &&
    settings.tool !==
      activeTool
  ) {
    setTool(
      settings.tool
    );
  }
}


if (
  splitEmbeddedMode
) {
  document.addEventListener(
    "pointerdown",
    () => {
      window.parent?.postMessage(
        {
          type:
            "vector-split-interaction-target",
          target:
            "secondary"
        },
        "*"
      );
    },
    true
  );
}

window.addEventListener(
  "message",
  event => {
    const message =
      event.data;

    if (
      !message ||
      typeof message !==
        "object"
    ) {
      return;
    }

    if (
      splitEmbeddedMode
    ) {
      if (
        message.type ===
          "vector-split-load-document"
      ) {
        applySplitEmbeddedDocument(
          message
        );

        return;
      }

      if (
        message.type ===
          "vector-split-editor-settings"
      ) {
        applySplitEmbeddedEditorSettings(
          message.settings
        );

        return;
      }

      if (
        message.type ===
          "vector-split-apply-color"
      ) {
        const target =
          document.getElementById(
            message.targetId
          );

        if (target) {
          activeColorTarget =
            target;
        }

        applyCustomColorLive(
          message.color,
          Boolean(
            message.record
          )
        );

        return;
      }

      if (
        message.type ===
          "vector-split-clipboard-updated" &&
        Array.isArray(
          message.clipboard
        )
      ) {
        vectorClipboard =
          JSON.parse(
            JSON.stringify(
              message.clipboard
            )
          );

        vectorClipboardPasteCount =
          0;

        return;
      }
    }

    if (
      splitEmbeddedMode
    ) {
      return;
    }

    if (
      message.type ===
        "vector-split-interaction-target" &&
      message.target ===
        "secondary"
    ) {
      setSplitCanvasInteractionTarget(
        "secondary"
      );

      return;
    }

    if (
      message.type ===
        "vector-split-document-state"
    ) {
      const canvasDocument =
        canvasDocumentById(
          message.documentId
        );

      if (!canvasDocument) {
        return;
      }

      canvasDocument.project =
        JSON.parse(
          JSON.stringify(
            message.project
          )
        );

      canvasDocument.filename =
        message.filename ||
        canvasDocument.filename;

      canvasDocument.undoHistory =
        [
          ...(
            message.undoHistory ||
            []
          )
        ];

      canvasDocument.redoHistory =
        [
          ...(
            message.redoHistory ||
            []
          )
        ];

      canvasDocument.undoHistoryMeta =
        JSON.parse(
          JSON.stringify(
            message.undoHistoryMeta ||
            []
          )
        );

      canvasDocument.redoHistoryMeta =
        JSON.parse(
          JSON.stringify(
            message.redoHistoryMeta ||
            []
          )
        );

      canvasDocument.zoom =
        Number(
          message.zoom
        ) ||
        1;

      canvasDocument.panX =
        Number(
          message.panX
        ) ||
        0;

      canvasDocument.panY =
        Number(
          message.panY
        ) ||
        0;

      scheduleAutosave();

      return;
    }

    if (
      message.type ===
        "vector-split-clipboard-updated" &&
      Array.isArray(
        message.clipboard
      )
    ) {
      vectorClipboard =
        JSON.parse(
          JSON.stringify(
            message.clipboard
          )
        );

      vectorClipboardPasteCount =
        0;

      return;
    }

    if (
      message.type ===
        "vector-split-request-settings"
    ) {
      syncSplitCanvasEditorSettings();

      return;
    }

    if (
      message.type ===
        "vector-split-editor-ready"
    ) {
      syncSplitCanvasEditorSettings();

      postToSplitCanvasIframe({
        type:
          "vector-split-clipboard-updated",
        clipboard:
          JSON.parse(
            JSON.stringify(
              vectorClipboard ||
              []
            )
          )
      });
    }
  }
);

if (
  splitEmbeddedMode
) {
  window.addEventListener(
    "focus",
    () => {
      window.parent?.postMessage(
        {
          type:
            "vector-split-request-settings"
        },
        "*"
      );
    }
  );
}



function renderCanvasTabs() {
  canvasTabs.replaceChildren();

  canvasDocuments.forEach(document => {
    const tab = window.document.createElement("div");
    tab.className = "canvas-tab";
    tab.dataset.canvasDocumentId = document.id;
    tab.classList.toggle(
      "active",
      document.id === activeCanvasDocumentId
    );
    tab.classList.toggle(
      "split-secondary",
      splitCanvasViewActive &&
      document.id ===
        splitCanvasSecondaryDocumentId
    );
    tab.setAttribute(
      "role",
      "tab"
    );
    tab.setAttribute(
      "aria-selected",
      document.id === activeCanvasDocumentId
        ? "true"
        : "false"
    );

    const main = window.document.createElement("button");
    main.type = "button";
    main.className = "canvas-tab-main";
    main.title = displayCanvasDocumentTitle(document);

    const title = window.document.createElement("span");
    title.className = "canvas-tab-title";
    title.textContent = displayCanvasDocumentTitle(document);
    main.appendChild(title);

    const close = window.document.createElement("button");
    close.type = "button";
    close.className = "canvas-tab-close";
    close.title = "Close canvas";
    close.setAttribute("aria-label", "Close canvas");
    close.textContent = "×";

    main.addEventListener("click", () => {
      if (
        splitCanvasViewActive &&
        document.id !==
          activeCanvasDocumentId
      ) {
        setSplitCanvasSecondaryDocument(
          document.id
        );

        return;
      }

      switchCanvasDocument(
        document.id
      );
    });

    main.addEventListener("dblclick", event => {
      event.preventDefault();
      event.stopPropagation();
      beginCanvasTabRename(document, tab);
    });

    tab.addEventListener("contextmenu", event => {
      openCanvasTabContextMenu(
        event,
        document,
        tab
      );
    });

    close.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      closeCanvasDocument(document.id);
    });

    tab.append(main, close);
    canvasTabs.appendChild(tab);
  });

  requestAnimationFrame(() => {
    canvasTabs
      .querySelector(".canvas-tab.active")
      ?.scrollIntoView({
        block: "nearest",
        inline: "nearest"
      });
  });
}

let newDocumentStartupMode = false;
let newDocumentSelectedTheme = "dark";

function clampNewDocumentDimension(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;

  return Math.max(
    16,
    Math.min(
      10000,
      Math.round(number)
    )
  );
}

function updateNewDocumentPresetFromSize() {
  const value =
    `${newDocumentWidth.value}x${newDocumentHeight.value}`;

  const match =
    [...newDocumentPreset.options]
      .find(option =>
        option.value === value
      );

  newDocumentPreset.value =
    match
      ? match.value
      : "custom";
}

function updateNewDocumentThemeCards(theme) {
  newDocumentSelectedTheme =
    normalizeApplicationTheme(theme);

  newDocumentThemeChoices
    .querySelectorAll(
      "[data-new-document-theme]"
    )
    .forEach(card => {
      const selected =
        card.dataset.newDocumentTheme ===
        newDocumentSelectedTheme;

      card.classList.toggle(
        "selected",
        selected
      );

      card.setAttribute(
        "aria-checked",
        selected
          ? "true"
          : "false"
      );
    });
}

function openNewDocumentModal({
  startup = false
} = {}) {
  if (!newDocumentModal) return;

  newDocumentStartupMode =
    Boolean(startup);

  newDocumentModal.dataset.startup =
    newDocumentStartupMode
      ? "true"
      : "false";

  const nextNumber =
    Math.max(
      1,
      canvasDocuments.length +
        (newDocumentStartupMode ? 0 : 1)
    );

  newDocumentName.value =
    newDocumentStartupMode
      ? "Untitled"
      : `Untitled ${nextNumber}`;

  newDocumentWidth.value =
    String(
      canvasWidth || 960
    );

  newDocumentHeight.value =
    String(
      canvasHeight || 640
    );

  newDocumentBackground.value =
    canvasBackgroundColor ||
    "#ffffff";

  newDocumentTransparent.checked =
    Boolean(
      canvasIsTransparent
    );

  newDocumentBackground.disabled =
    newDocumentTransparent.checked;

  updateNewDocumentPresetFromSize();

  updateNewDocumentThemeCards(
    applicationTheme
  );

  newDocumentModal.hidden =
    false;

  requestAnimationFrame(() => {
    newDocumentName.focus();
    newDocumentName.select();
  });
}

function closeNewDocumentModal({
  force = false
} = {}) {
  if (!newDocumentModal) return;

  if (
    newDocumentStartupMode &&
    !force
  ) {
    return;
  }

  newDocumentModal.hidden = true;
  newDocumentStartupMode = false;
}

function newDocumentProjectFromForm() {
  const width =
    clampNewDocumentDimension(
      newDocumentWidth.value,
      960
    );

  const height =
    clampNewDocumentDimension(
      newDocumentHeight.value,
      640
    );

  newDocumentWidth.value =
    String(width);

  newDocumentHeight.value =
    String(height);

  return {
    format: "vector-studio-project",
    version: 1,
    document: {
      width,
      height,
      backgroundColor:
        newDocumentBackground.value ||
        "#ffffff",
      transparent:
        Boolean(
          newDocumentTransparent.checked
        ),
      snapping:
        { ...snapSettings },
      guides: [],
      guidesVisible: true,
      guidesLocked: false,
      customGoogleFonts:
        customGoogleFontsForProject(),
      patternSwatches: [],
      perspective2: {
        horizonY: 220,
        leftVP: {
          x: -260,
          y: 220
        },
        rightVP: {
          x: 1220,
          y: 220
        },
        visible: false,
        activeSide: "right"
      }
    },
    objects: []
  };
}

function createDocumentFromNewDocumentModal() {
  const project =
    newDocumentProjectFromForm();

  const name =
    (
      newDocumentName.value ||
      "Untitled"
    ).trim() ||
    "Untitled";

  setApplicationTheme(
    newDocumentSelectedTheme
  );

  if (newDocumentStartupMode) {
    canvasDocuments = [];
    closedCanvasDocuments = [];
    activeCanvasDocumentId = null;
  } else {
    saveActiveCanvasDocumentState();
  }

  newDocumentModal.hidden = true;
  newDocumentStartupMode = false;

  createCanvasDocument({
    title: name,
    filename:
      normalizeProjectFilename(
        name
      ),
    project,
    activate: true
  });

  resetHistory();
  saveActiveCanvasDocumentState();
  renderCanvasTabs();

  toolStatus.textContent =
    `Created ${name} — ${project.document.width} × ${project.document.height} px`;
}

function newCanvasTab() {
  openNewDocumentModal();
}

newDocumentPreset.addEventListener(
  "change",
  () => {
    if (
      newDocumentPreset.value ===
      "custom"
    ) {
      return;
    }

    const [
      width,
      height
    ] =
      newDocumentPreset.value
        .split("x")
        .map(Number);

    newDocumentWidth.value =
      String(width);

    newDocumentHeight.value =
      String(height);
  }
);

[
  newDocumentWidth,
  newDocumentHeight
].forEach(input => {
  input.addEventListener(
    "input",
    updateNewDocumentPresetFromSize
  );
});

swapNewDocumentSize.addEventListener(
  "click",
  () => {
    const width =
      newDocumentWidth.value;

    newDocumentWidth.value =
      newDocumentHeight.value;

    newDocumentHeight.value =
      width;

    updateNewDocumentPresetFromSize();
  }
);

newDocumentTransparent.addEventListener(
  "change",
  () => {
    newDocumentBackground.disabled =
      newDocumentTransparent.checked;
  }
);

newDocumentThemeChoices.addEventListener(
  "click",
  event => {
    const card =
      event.target.closest(
        "[data-new-document-theme]"
      );

    if (!card) return;

    updateNewDocumentThemeCards(
      card.dataset.newDocumentTheme
    );
  }
);

newDocumentThemeChoices.addEventListener(
  "keydown",
  event => {
    const cards =
      [...newDocumentThemeChoices.querySelectorAll(
        "[data-new-document-theme]"
      )];

    const currentIndex =
      cards.findIndex(card =>
        card.getAttribute(
          "aria-checked"
        ) === "true"
      );

    if (
      ![
        "ArrowLeft",
        "ArrowRight"
      ].includes(event.key)
    ) {
      return;
    }

    event.preventDefault();

    const direction =
      event.key === "ArrowRight"
        ? 1
        : -1;

    const next =
      cards[
        (
          currentIndex +
          direction +
          cards.length
        ) %
        cards.length
      ];

    updateNewDocumentThemeCards(
      next.dataset.newDocumentTheme
    );

    next.focus();
  }
);

closeNewDocumentModalButton.addEventListener(
  "click",
  () => closeNewDocumentModal()
);

cancelNewDocumentButton.addEventListener(
  "click",
  () => closeNewDocumentModal()
);

createNewDocumentButton.addEventListener(
  "click",
  createDocumentFromNewDocumentModal
);

newDocumentModal.addEventListener(
  "pointerdown",
  event => {
    if (
      event.target ===
        newDocumentModal &&
      !newDocumentStartupMode
    ) {
      closeNewDocumentModal();
    }
  }
);

newDocumentModal.addEventListener(
  "keydown",
  event => {
    if (
      event.key === "Escape"
    ) {
      event.preventDefault();
      closeNewDocumentModal();
    }

    if (
      event.key === "Enter" &&
      event.target.tagName !== "BUTTON" &&
      event.target.tagName !== "SELECT"
    ) {
      event.preventDefault();
      createDocumentFromNewDocumentModal();
    }
  }
);


function initializeDefaultShapeAppearance() {
  fill.value = "none";
  stroke.value = DEFAULT_SHAPE_STROKE;
  strokeWidth.value = "1";

  const fillTrigger =
    document.querySelector(
      '[data-color-target="fill"]'
    );

  const strokeTrigger =
    document.querySelector(
      '[data-color-target="stroke"]'
    );

  if (fillTrigger) {
    const swatch =
      fillTrigger.querySelector(
        ".color-swatch"
      );

    const value =
      fillTrigger.querySelector(
        ".color-value"
      );

    if (swatch) {
      swatch.style.background =
        "transparent";
      swatch.classList.add(
        "transparent-swatch"
      );
    }

    if (value) {
      value.textContent = "None";
    }
  }

  if (strokeTrigger) {
    const swatch =
      strokeTrigger.querySelector(
        ".color-swatch"
      );

    const value =
      strokeTrigger.querySelector(
        ".color-value"
      );

    if (swatch) {
      swatch.classList.remove(
        "transparent-swatch"
      );
      swatch.style.background =
        DEFAULT_SHAPE_STROKE;
    }

    if (value) {
      value.textContent =
        DEFAULT_SHAPE_STROKE.toUpperCase();
    }
  }
}

function initializeCanvasTabs() {
  if (canvasDocuments.length) return;

  const initialProject = serializeProject();

  const document = {
    id: `canvas-document-${++canvasDocumentCounter}`,
    title: currentProjectName.replace(/\.vgs$/i, "") || "Untitled",
    filename: currentProjectName,
    project: JSON.parse(JSON.stringify(initialProject)),
    undoHistory: [...undoHistory],
    redoHistory: [...redoHistory],
    undoHistoryMeta: [...undoHistoryMeta],
    redoHistoryMeta: [...redoHistoryMeta],
    zoom,
    panX: zoomPanX,
    panY: zoomPanY
  };

  canvasDocuments.push(document);
  activeCanvasDocumentId = document.id;
  renderCanvasTabs();
}

newCanvasTabButton.addEventListener("click", newCanvasTab);

function serializeProject() {
  return {
    format: "vector-studio-project",
    version: 1,
    document: {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: canvasBackgroundColor,
      transparent: canvasIsTransparent,
      snapping: { ...snapSettings },
      guides: documentGuides.map(guide => ({ ...guide })),
      guidesVisible,
      guidesLocked,
      customGoogleFonts:
        customGoogleFontsForProject(),
      geometryConstraints:
        documentGeometryConstraints.map(
          constraint =>
            JSON.parse(
              JSON.stringify(
                constraint
              )
            )
        )
    },
    objects: [...art.querySelectorAll(":scope > [data-object='true']")]
      .map(serializeElementForProject)
  };
}



function historyTimelineEntries() {
  const past = undoHistory.map((snapshot, index) => ({
    snapshot,
    meta: undoHistoryMeta[index] || null
  }));

  const futureSnapshots = [...redoHistory].reverse();
  const futureMeta = [...redoHistoryMeta].reverse();

  return [
    ...past,
    ...futureSnapshots.map((snapshot, index) => ({
      snapshot,
      meta: futureMeta[index] || null
    }))
  ];
}


function normalizeHistoryMeta(meta) {
  if (!meta) return null;
  if (typeof meta === "string") return { label: meta, detail: "" };
  return {
    label: String(meta.label || "Edit"),
    detail: String(meta.detail || "")
  };
}

function capitalizeHistoryLabel(value) {
  return String(value || "Object")
    .replace(/[-_]+/g, " ")
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function historyObjectLabel(element = selected) {
  if (!element) return "Object";
  if (isTextElement(element)) return "Text";
  if (isGroup(element)) return "Group";

  return capitalizeHistoryLabel(
    element.dataset.name ||
    element.dataset.shapeType ||
    element.dataset.originalShape ||
    element.dataset.shape ||
    element.tagName ||
    "Object"
  );
}

function historyTransformLabel(type, element = selected) {
  const object = historyObjectLabel(element);

  if (type === "move") {
    return { label: `${object} Translated`, detail: "Position changed" };
  }
  if (type === "rotate") {
    return { label: `${object} Rotated`, detail: "Rotation changed" };
  }
  if (type === "resize") {
    return { label: `${object} Resized`, detail: "Dimensions changed" };
  }
  if (type === "anchor") {
    return { label: `${object} Path Edited`, detail: "Anchor point moved" };
  }
  if (type === "control") {
    return { label: `${object} Path Edited`, detail: "Bézier handle adjusted" };
  }
  if (
    type === "corner-radius" ||
    type === "polygon-corner-radius" ||
    type === "path-corner-radius"
  ) {
    return { label: `${object} Corners Edited`, detail: "Corner radius changed" };
  }

  return { label: `${object} Edited`, detail: "Geometry changed" };
}

function parseHistorySnapshot(
  snapshot
) {
  try {
    return JSON.parse(snapshot);
  } catch {
    return null;
  }
}

function historyObjectName(
  object
) {
  if (!object) return "Object";

  return (
    object.dataset?.name ||
    object.dataset?.textValue ||
    (
      object.tag
        ? capitalize(
            String(object.tag)
          )
        : "Object"
    )
  );
}

function describeHistoryTransition(
  previousSnapshot,
  nextSnapshot
) {
  const previous =
    parseHistorySnapshot(
      previousSnapshot
    );

  const next =
    parseHistorySnapshot(
      nextSnapshot
    );

  if (!previous || !next) {
    return {
      label: "Edit",
      detail: "Document state",
    };
  }

  const previousObjects =
    previous.objects || [];
  const nextObjects =
    next.objects || [];

  if (
    nextObjects.length >
    previousObjects.length
  ) {
    const added =
      nextObjects[
        nextObjects.length - 1
      ];

    return {
      label:
        `Create ${historyObjectName(added)}`,
      detail:
        `${nextObjects.length} object${nextObjects.length === 1 ? "" : "s"}`,
    };
  }

  if (
    nextObjects.length <
    previousObjects.length
  ) {
    return {
      label: "Delete",
      detail:
        `${nextObjects.length} object${nextObjects.length === 1 ? "" : "s"} remaining`,
    };
  }

  const prevDoc =
    previous.document || {};
  const nextDoc =
    next.document || {};

  if (
    prevDoc.width !== nextDoc.width ||
    prevDoc.height !== nextDoc.height
  ) {
    return {
      label: "Resize Artboard",
      detail:
        `${nextDoc.width} × ${nextDoc.height}`,
    };
  }

  if (
    prevDoc.backgroundColor !==
      nextDoc.backgroundColor ||
    prevDoc.transparent !==
      nextDoc.transparent
  ) {
    return {
      label: "Canvas Appearance",
      detail:
        nextDoc.transparent
          ? "Transparent background"
          : String(
              nextDoc.backgroundColor ||
              "Background"
            ),
    };
  }

  if (
    JSON.stringify(
      previousObjects
    ) !==
    JSON.stringify(
      nextObjects
    )
  ) {
    let changedIndex = -1;

    for (
      let index = 0;
      index <
      Math.min(
        previousObjects.length,
        nextObjects.length
      );
      index += 1
    ) {
      if (
        JSON.stringify(
          previousObjects[index]
        ) !==
        JSON.stringify(
          nextObjects[index]
        )
      ) {
        changedIndex = index;
        break;
      }
    }

    const changed =
      changedIndex >= 0
        ? nextObjects[changedIndex]
        : null;

    return {
      label: changed
        ? `Edit ${historyObjectName(changed)}`
        : "Edit Artwork",
      detail:
        "Transform, appearance, geometry, or order",
    };
  }

  return {
    label: "Document Change",
    detail: "Editor state",
  };
}

function renderHistoryPanel() {
  if (
    !historyView ||
    !historyView.classList.contains("active")
  ) {
    return;
  }

  const entries =
    historyTimelineEntries();

  const snapshots =
    entries.map(entry => entry.snapshot);

  const currentIndex =
    undoHistory.length - 1;

  historySteps.replaceChildren();

  snapshots.forEach(
    (snapshot, index) => {
      const explicitMeta =
        normalizeHistoryMeta(entries[index]?.meta);

      const description =
        explicitMeta ||
        (
          index === 0
            ? {
                label: "Initial State",
                detail: "Document opened",
              }
            : describeHistoryTransition(
                snapshots[index - 1],
                snapshot
              )
        );

      const button =
        document.createElement(
          "button"
        );

      button.type = "button";
      button.className =
        "history-step";

      if (index === currentIndex) {
        button.classList.add(
          "current"
        );
      } else if (
        index > currentIndex
      ) {
        button.classList.add(
          "future"
        );
      }

      button.dataset.historyIndex =
        String(index);

      button.setAttribute(
        "role",
        "option"
      );

      button.setAttribute(
        "aria-selected",
        index === currentIndex
          ? "true"
          : "false"
      );

      const indexLabel =
        String(index).padStart(
          2,
          "0"
        );

      button.innerHTML = `
        <span class="history-step-index">${indexLabel}</span>
        <span class="history-step-copy">
          <span class="history-step-label"></span>
          <span class="history-step-detail"></span>
        </span>
        <span class="history-step-state"></span>
      `;

      button.querySelector(
        ".history-step-label"
      ).textContent =
        description.label;

      button.querySelector(
        ".history-step-detail"
      ).textContent =
        description.detail;

      button.querySelector(
        ".history-step-state"
      ).textContent =
        index === currentIndex
          ? "Current"
          : index > currentIndex
            ? "Redo"
            : "";

      historySteps.appendChild(
        button
      );
    }
  );

  historyUndoButton.disabled =
    undoHistory.length <= 1;

  historyRedoButton.disabled =
    redoHistory.length === 0;

  historyPositionLabel.textContent =
    `${currentIndex + 1} / ${snapshots.length}`;

  requestAnimationFrame(() => {
    historySteps
      .querySelector(
        ".history-step.current"
      )
      ?.scrollIntoView({
        block: "nearest",
      });
  });
}

function showHistoryPanel() {
  showRightPanel("history");
  renderHistoryPanel();
}

function jumpToHistoryStep(
  index
) {
  const entries =
    historyTimelineEntries();

  const snapshots =
    entries.map(entry => entry.snapshot);

  const metas =
    entries.map(entry => normalizeHistoryMeta(entry.meta));

  const targetIndex =
    Math.max(
      0,
      Math.min(
        snapshots.length - 1,
        Number(index)
      )
    );

  if (
    !Number.isFinite(
      targetIndex
    )
  ) {
    return;
  }

  const targetSnapshot =
    snapshots[targetIndex];

  undoHistory =
    snapshots.slice(
      0,
      targetIndex + 1
    );

  undoHistoryMeta =
    metas.slice(
      0,
      targetIndex + 1
    );

  redoHistory =
    snapshots
      .slice(targetIndex + 1)
      .reverse();

  redoHistoryMeta =
    metas
      .slice(targetIndex + 1)
      .reverse();

  restoreHistorySnapshot(
    targetSnapshot
  );

  toolStatus.textContent =
    `History step ${targetIndex + 1}`;

  renderHistoryPanel();
}

function projectSnapshotString() {
  return JSON.stringify(serializeProject());
}

function updateHistoryControls() {
  if (!switchingCanvasDocument) {
    const document = activeCanvasDocument();

    if (document) {
      document.undoHistory = [...undoHistory];
      document.redoHistory = [...redoHistory];
      document.undoHistoryMeta = [...undoHistoryMeta];
      document.redoHistoryMeta = [...redoHistoryMeta];
      document.project = serializeProject();
      document.filename = currentProjectName;
    }
  }

  document.querySelectorAll('[data-command="undo"]').forEach(button => {
    button.disabled = undoHistory.length <= 1;
  });

  document.querySelectorAll('[data-command="redo"]').forEach(button => {
    button.disabled = redoHistory.length === 0;
  });

  renderHistoryPanel();
}

function resetHistory() {
  undoHistory = [projectSnapshotString()];
  redoHistory = [];
  undoHistoryMeta = [{ label: "Initial State", detail: "Document opened" }];
  redoHistoryMeta = [];
  updateHistoryControls();
}

function recordHistory(meta = null) {
  if (historyRestoring) return;

  const snapshot = projectSnapshotString();
  const current = undoHistory[undoHistory.length - 1];

  if (snapshot === current) {
    updateHistoryControls();
    return;
  }

  undoHistory.push(snapshot);
  undoHistoryMeta.push(normalizeHistoryMeta(meta));

  if (undoHistory.length > HISTORY_LIMIT + 1) {
    undoHistory.shift();
    undoHistoryMeta.shift();
  }

  redoHistory = [];
  redoHistoryMeta = [];
  updateHistoryControls();
  scheduleAutosave();

  splitEmbeddedNotifyParent(
    "history"
  );
}

function restoreHistorySnapshot(snapshot) {
  historyRestoring = true;

  try {
    const project = JSON.parse(snapshot);
    loadProjectData(project);
  } finally {
    historyRestoring = false;
  }

  updateHistoryControls();
}

function undo() {
  if (undoHistory.length <= 1) return;

  const current = undoHistory.pop();
  const meta = undoHistoryMeta.pop() || null;

  redoHistory.push(current);
  redoHistoryMeta.push(meta);

  if (redoHistory.length > HISTORY_LIMIT) {
    redoHistory.shift();
    redoHistoryMeta.shift();
  }

  restoreHistorySnapshot(undoHistory[undoHistory.length - 1]);
  toolStatus.textContent = "Undo";
  scheduleAutosave();

  splitEmbeddedNotifyParent(
    "undo"
  );
}

function redo() {
  if (!redoHistory.length) return;

  const snapshot = redoHistory.pop();
  const meta = redoHistoryMeta.pop() || null;

  undoHistory.push(snapshot);
  undoHistoryMeta.push(meta);

  if (undoHistory.length > HISTORY_LIMIT + 1) {
    undoHistory.shift();
    undoHistoryMeta.shift();
  }

  restoreHistorySnapshot(snapshot);
  toolStatus.textContent = "Redo";
  scheduleAutosave();

  splitEmbeddedNotifyParent(
    "redo"
  );
}

function downloadTextFile(filename, text, mime = "application/json") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function normalizeProjectFilename(name) {
  let filename = (name || "").trim();

  if (!filename) {
    filename = "untitled.vgs";
  }

  filename = filename.replace(/[\\/:*?"<>|]+/g, "-");

  if (!filename.toLowerCase().endsWith(".vgs")) {
    filename += ".vgs";
  }

  return filename;
}

function openSaveProjectFallback(json) {
  saveProjectFilename.value = normalizeProjectFilename(currentProjectName);
  selectionQuickMenu.hidden = true;
  closeCanvasContextMenu();
  saveProjectModal.hidden = false;

  requestAnimationFrame(() => {
    saveProjectFilename.focus();
    const dot = saveProjectFilename.value.toLowerCase().lastIndexOf(".vgs");
    saveProjectFilename.setSelectionRange(0, dot > 0 ? dot : saveProjectFilename.value.length);
  });

  saveProjectModal._pendingJson = json;
}

function closeSaveProjectFallback() {
  saveProjectModal.hidden = true;
  saveProjectModal._pendingJson = null;
  renderSelectionQuickMenu();
}

function confirmFallbackSave() {
  const json = saveProjectModal._pendingJson;
  if (!json) return;

  currentProjectName = normalizeProjectFilename(saveProjectFilename.value);

  downloadTextFile(
    currentProjectName,
    json,
    "application/json"
  );

  const activeDocument = activeCanvasDocument();

  if (activeDocument) {
    activeDocument.filename = currentProjectName;
    activeDocument.title =
      currentProjectName.replace(/\.vgs$/i, "");
    saveActiveCanvasDocumentState();
    renderCanvasTabs();
  }

  toolStatus.textContent = `Saved ${currentProjectName}`;
  closeSaveProjectFallback();
}


historySteps.addEventListener(
  "click",
  event => {
    const step =
      event.target.closest(
        "[data-history-index]"
      );

    if (!step) return;

    jumpToHistoryStep(
      step.dataset.historyIndex
    );
  }
);

historyUndoButton.addEventListener(
  "click",
  () => {
    undo();
    renderHistoryPanel();
  }
);

historyRedoButton.addEventListener(
  "click",
  () => {
    redo();
    renderHistoryPanel();
  }
);

confirmSaveProject.addEventListener("click", confirmFallbackSave);
cancelSaveProject.addEventListener("click", closeSaveProjectFallback);
closeSaveProjectModal.addEventListener("click", closeSaveProjectFallback);

saveProjectModal.addEventListener("pointerdown", event => {
  if (event.target === saveProjectModal) {
    closeSaveProjectFallback();
  }
});

saveProjectFilename.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    confirmFallbackSave();
  }

  if (event.key === "Escape") {
    event.preventDefault();
    closeSaveProjectFallback();
  }
});

async function saveProject() {
  if (activePath) finishPath();

  const project = serializeProject();
  const json = JSON.stringify(project, null, 2);

  currentProjectName = normalizeProjectFilename(currentProjectName);

  /*
   * Use the real OS Save As picker where available.
   */
  if ("showSaveFilePicker" in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: currentProjectName,
        types: [
          {
            description: "Vector Studio Project",
            accept: {
              "application/json": [".vgs"]
            }
          }
        ],
        excludeAcceptAllOption: false
      });

      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();

      currentProjectName = handle.name || currentProjectName;

      const activeDocument = activeCanvasDocument();

      if (activeDocument) {
        activeDocument.filename = currentProjectName;
        activeDocument.title =
          currentProjectName.replace(/\.vgs$/i, "");
        saveActiveCanvasDocumentState();
        renderCanvasTabs();
      }

      toolStatus.textContent = `Saved ${currentProjectName}`;
      return;
    } catch (error) {
      if (error && error.name === "AbortError") {
        toolStatus.textContent = "Save cancelled";
        return;
      }

      console.warn(
        "Native Save As failed; opening in-app filename dialog.",
        error
      );
    }
  }

  /*
   * Browsers without File System Access cannot expose a folder picker.
   * Give the user an in-app filename dialog instead of immediately downloading.
   */
  openSaveProjectFallback(json);
}

function createElementFromProject(data, isTopLevel = true) {
  const element = document.createElementNS(SVG_NS, data.tag);

  Object.entries(data.attributes || {}).forEach(([name, value]) => {
    element.setAttribute(name, value);
  });

  Object.entries(data.dataset || {}).forEach(([name, value]) => {
    element.dataset[name] = value;
  });

  if (isTopLevel) {
    element.dataset.object = "true";
    delete element.dataset.groupChild;
  } else {
    element.removeAttribute("data-object");
    element.dataset.groupChild = "true";
  }

  if (Array.isArray(data.children) && data.dataset?.group === "true") {
    data.children.forEach(childData => {
      element.appendChild(
        createElementFromProject(childData, false)
      );
    });
  } else if (
    data.innerHTML &&
    (
      data.dataset?.compoundShape === "true" ||
      data.tag === "text"
    )
  ) {
    element.innerHTML = data.innerHTML;
  }

  if (data.tag === "text") {
    renderTextElement(element);
  }

  if (Array.isArray(data.anchors)) {
    element._anchors = data.anchors.map(anchor => ({ ...anchor }));
    element.dataset.editorPath = "true";
    updatePathD(element);
  }

  return element;
}

function loadProjectData(project) {
  if (
    !project ||
    project.format !== "vector-studio-project" ||
    !project.document ||
    !Array.isArray(project.objects)
  ) {
    throw new Error("This is not a valid Vector Studio project file.");
  }

  cancelPath();
  pendingShape = null;
  startPoint = null;
  shapeBuilderDrawing = false;
  shapeBuilderPoints = [];
  shapeBuilderHits = [];
  resetShapeBuilderRegions();

  art.innerHTML = "";
  paintDefs.innerHTML = "";
  deselect();

  resizeCanvas(
    Number(project.document.width) || 960,
    Number(project.document.height) || 640
  );

  canvasBackgroundColor =
    project.document.backgroundColor || "#ffffff";

  canvasIsTransparent =
    Boolean(project.document.transparent);

  canvasBackground.value = canvasBackgroundColor;
  canvasTransparent.checked = canvasIsTransparent;
  updateCanvasBackground();

  if (project.document.snapping) {
    Object.assign(snapSettings, project.document.snapping);
  }
  updateSnapMenuChecks();

  documentGuides =
    normalizeGuideData(
      project.document.guides
    );

  guidesVisible =
    project.document.guidesVisible !== false;

  guidesLocked =
    Boolean(
      project.document.guidesLocked
    );

  renderGuides();

  documentGeometryConstraints =
    normalizeDocumentGeometryConstraints(
      project.document.geometryConstraints ||
      []
    );

  crossConstraintEndpointA =
    null;

  crossConstraintEndpointB =
    null;

  restoreCustomGoogleFonts(
    project.document.customGoogleFonts
  );

  patternSwatches =
    Array.isArray(
      project.document.patternSwatches
    )
      ? project.document.patternSwatches.map(
          swatch => ({
            ...swatch
          })
        )
      : [];

  renderPatternSwatches();

  artBrushPresets =
    Array.isArray(
      project.document.artBrushPresets
    )
      ? project.document.artBrushPresets.map(
          preset => ({
            ...preset
          })
        )
      : [];

  artBrushPresetCounter =
    artBrushPresets.length;

  renderArtBrushPresetOptions();

  perspective2State =
    normalizePerspective2State(
      project.document.perspective2 ||
      {
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
        visible: false,
        activeSide: "right"
      }
    );

  drawPerspective2Grid();

  let highestCounter = 0;

  project.objects.forEach(data => {
    const element = createElementFromProject(data);
    art.appendChild(element);

    if (element.dataset.rotation === undefined) {
      element.dataset.rotation = 0;
    }
    if (
      isArtBrushObject(
        element
      )
    ) {
      renderArtBrushObject(
        element
      );
    }

    if (
      isThreeDExtrude(
        element
      )
    ) {
      renderThreeDExtrude(
        element
      );
    }

    applyObjectTransform(element);
    applyLayerState(element);
    refreshStrokeAlignmentForObject(element);

    const name = element.dataset.name || "";
    const match = name.match(/(\d+)$/);

    if (match) {
      highestCounter = Math.max(highestCounter, Number(match[1]));
    }
  });

  objectCounter = Math.max(
    highestCounter,
    project.objects.length
  );

  art
    .querySelectorAll(
      ":scope > path"
    )
    .forEach(
      path => {
        if (
          path.dataset.constraintPathId
        ) {
          ensurePathConstraintId(
            path
          );
        }
      }
    );

  pruneDocumentGeometryConstraints();

  restoreGradientDefinitions();
  refreshAllStrokeProfiles();
  refreshPerspective2LinkedShapes();
  setTool("select");
  renderLayers();
  drawSelection();
}

function openProjectPicker() {
  projectFileInput.value = "";
  projectFileInput.click();
}

projectFileInput.addEventListener("change", async () => {
  const file = projectFileInput.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const project = JSON.parse(text);

    createCanvasDocument({
      project,
      title: file.name.replace(/\.(vgs|json)$/i, ""),
      filename: file.name.replace(/\.json$/i, ".vgs"),
      activate: true
    });

    resetHistory();
    saveActiveCanvasDocumentState();
    renderCanvasTabs();
    toolStatus.textContent = `Opened ${file.name}`;
  } catch (error) {
    console.error(error);
    alert(error.message || "Could not open this project file.");
  }
});

