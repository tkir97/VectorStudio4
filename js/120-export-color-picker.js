/* Vector Studio modular baseline — source lines 57656-60942 from consolidated app.js.
   Classic-script module: shares the browser global lexical scope with ordered sibling modules. */

/* ---------------- EXPORT ---------------- */

const exportModal = document.querySelector("#exportModal");
const exportFilename = document.querySelector("#exportFilename");
const exportFormat = document.querySelector("#exportFormat");
const exportScope = document.querySelector("#exportScope");
const exportIncludeBackground = document.querySelector("#exportIncludeBackground");
const exportMessage = document.querySelector("#exportMessage");
const aiExportCaveat = document.querySelector("#aiExportCaveat");
const svgPreviewWrap = document.querySelector("#svgPreviewWrap");
const svgOutput = document.querySelector("#svgOutput");
const downloadExportBtn = document.querySelector("#downloadExportBtn");
const repeatActionMenuItem = document.querySelector("#repeatActionMenuItem");
const repeatActionCopy = document.querySelector("#repeatActionCopy");
const repeatActionCopyRow = document.querySelector("#repeatActionCopyRow");
const pngExportOptions = document.querySelector("#pngExportOptions");
const pngResolutionPreset = document.querySelector("#pngResolutionPreset");
const pngCustomSizesWrap = document.querySelector("#pngCustomSizesWrap");
const pngCustomSizes = document.querySelector("#pngCustomSizes");
const pngResolutionSummary = document.querySelector("#pngResolutionSummary");

function baseExportName() {
  return (currentProjectName || "vector-artwork")
    .replace(/\.(vgs|json|svg|png|ai|pdf)$/i, "") || "vector-artwork";
}

function normalizeDownloadFilename(name, extension) {
  let filename = (name || "").trim() || "vector-artwork";
  filename = filename.replace(/[\\/:*?"<>|]+/g, "-");
  filename = filename.replace(/\.(svg|png|ai|pdf|vgs|json)$/i, "");
  return `${filename}.${extension}`;
}

function getExportTargets(scope) {
  if (scope === "selection") {
    return selectedItems.filter(
      item => item && item.isConnected && !isLayerHidden(item)
    );
  }

  return [...art.querySelectorAll(":scope > [data-object='true']")]
    .filter(element => !isLayerHidden(element));
}

function getSelectionExportBounds(targets) {
  const bounds = targets.map(elementCanvasBounds);
  return {
    left: Math.min(...bounds.map(b => b.left)),
    top: Math.min(...bounds.map(b => b.top)),
    right: Math.max(...bounds.map(b => b.right)),
    bottom: Math.max(...bounds.map(b => b.bottom))
  };
}

function collectSvgReferenceIds(root) {
  const ids = new Set();
  const nodes = [root, ...root.querySelectorAll("*")];
  const urlPattern = /url\(\s*['\"]?#([^)'\"\s]+)['\"]?\s*\)/g;

  nodes.forEach(node => {
    [...node.attributes].forEach(attribute => {
      const value = attribute.value || "";
      let match;
      urlPattern.lastIndex = 0;
      while ((match = urlPattern.exec(value))) ids.add(match[1]);

      if ((attribute.localName === "href" || attribute.name === "xlink:href") && value.startsWith("#")) {
        ids.add(value.slice(1));
      }
    });
  });

  return ids;
}

function appendReferencedPaintDefinitions(exportSvg) {
  const pending = [...collectSvgReferenceIds(exportSvg)];
  const copied = new Set();
  const defs = document.createElementNS(SVG_NS, "defs");

  while (pending.length) {
    const id = pending.shift();
    if (!id || copied.has(id)) continue;

    const source = paintDefs?.querySelector(`#${CSS.escape(id)}`);
    if (!source) continue;

    copied.add(id);
    const clone = source.cloneNode(true);
    defs.appendChild(clone);

    collectSvgReferenceIds(clone).forEach(referenceId => {
      if (!copied.has(referenceId)) pending.push(referenceId);
    });
  }

  if (defs.childNodes.length) exportSvg.insertBefore(defs, exportSvg.firstChild);
}

function buildExportSvg(scope = exportScope.value, includeBackground = exportIncludeBackground.checked) {
  if (activePath) finishPath();

  const targets = getExportTargets(scope);

  if (!targets.length) {
    throw new Error(
      scope === "selection"
        ? "No shapes are selected."
        : "There is nothing on the canvas to export."
    );
  }

  const exportSvg = document.createElementNS(SVG_NS, "svg");
  exportSvg.setAttribute("xmlns", SVG_NS);

  let width;
  let height;
  let viewBox;
  let backgroundRect = null;

  if (scope === "selection") {
    const bounds = getSelectionExportBounds(targets);
    width = Math.max(1, Math.ceil(bounds.right - bounds.left));
    height = Math.max(1, Math.ceil(bounds.bottom - bounds.top));
    viewBox = `${bounds.left} ${bounds.top} ${width} ${height}`;

    if (includeBackground && !canvasIsTransparent) {
      backgroundRect = document.createElementNS(SVG_NS, "rect");
      backgroundRect.setAttribute("x", bounds.left);
      backgroundRect.setAttribute("y", bounds.top);
      backgroundRect.setAttribute("width", width);
      backgroundRect.setAttribute("height", height);
      backgroundRect.setAttribute("fill", canvasBackgroundColor);
      exportSvg.appendChild(backgroundRect);
    }
  } else {
    width = canvasWidth;
    height = canvasHeight;
    viewBox = `0 0 ${canvasWidth} ${canvasHeight}`;

    if (includeBackground && !canvasIsTransparent) {
      backgroundRect = document.createElementNS(SVG_NS, "rect");
      backgroundRect.setAttribute("x", 0);
      backgroundRect.setAttribute("y", 0);
      backgroundRect.setAttribute("width", canvasWidth);
      backgroundRect.setAttribute("height", canvasHeight);
      backgroundRect.setAttribute("fill", canvasBackgroundColor);
      exportSvg.appendChild(backgroundRect);
    }
  }

  exportSvg.setAttribute("width", width);
  exportSvg.setAttribute("height", height);
  exportSvg.setAttribute("viewBox", viewBox);

  targets.forEach(target => {
    const clone = target.cloneNode(true);
    clone.style.strokeOpacity = "";
    exportSvg.appendChild(clone);

    const profile =
      normalizeStrokeProfile(
        target.dataset.strokeProfile
      );

    if (
      profile !== "uniform" &&
      strokeProfileEligible(target)
    ) {
      const profileClone =
        createStrokeProfileOverlay(
          target
        );

      if (profileClone) {
        profileClone.removeAttribute(
          "data-stroke-profile-overlay"
        );
        profileClone.removeAttribute(
          "data-stroke-profile-owner"
        );

        clone.style.strokeOpacity =
          "0";

        exportSvg.appendChild(
          profileClone
        );
      }
    }
  });

  appendReferencedPaintDefinitions(exportSvg);

  const source = new XMLSerializer().serializeToString(exportSvg);

  return { source, width, height };
}


const PNG_RESOLUTION_PRESETS = {
  single: {
    mode: "scale",
    values: [1]
  },
  retina: {
    mode: "scale",
    values: [1, 2, 3]
  },
  hires: {
    mode: "scale",
    values: [1, 2, 4]
  },
  icons: {
    mode: "maxDimension",
    values: [
      16,
      32,
      64,
      128,
      256,
      512
    ]
  },
  presentation: {
    mode: "maxDimension",
    values: [
      800,
      1200,
      1600,
      2400
    ]
  }
};

function parsePngCustomSizes() {
  return String(
    pngCustomSizes?.value ||
    ""
  )
    .split(/[,\s]+/)
    .map(Number)
    .filter(
      value =>
        Number.isFinite(value) &&
        value >= 1
    )
    .map(
      value =>
        Math.max(
          1,
          Math.min(
            16384,
            Math.round(value)
          )
        )
    )
    .filter(
      (value, index, values) =>
        values.indexOf(value) ===
        index
    )
    .sort(
      (a, b) =>
        a - b
    );
}

function pngResolutionDefinition() {
  const preset =
    pngResolutionPreset?.value ||
    "single";

  if (preset === "custom") {
    return {
      mode:
        "maxDimension",
      values:
        parsePngCustomSizes()
    };
  }

  return (
    PNG_RESOLUTION_PRESETS[
      preset
    ] ||
    PNG_RESOLUTION_PRESETS
      .single
  );
}

function pngOutputDimensions(
  sourceWidth,
  sourceHeight,
  definition
) {
  const width =
    Math.max(
      1,
      Number(sourceWidth) || 1
    );

  const height =
    Math.max(
      1,
      Number(sourceHeight) || 1
    );

  const maxDimension =
    Math.max(
      width,
      height
    );

  return definition.values.map(
    value => {
      let scale = 1;
      let label = "";

      if (
        definition.mode ===
        "scale"
      ) {
        scale =
          Math.max(
            0.01,
            Number(value) || 1
          );

        label =
          `${value}x`;
      } else {
        scale =
          Math.max(
            0.01,
            Number(value) /
              maxDimension
          );

        label =
          `${Math.round(
            value
          )}px`;
      }

      return {
        width:
          Math.max(
            1,
            Math.round(
              width * scale
            )
          ),
        height:
          Math.max(
            1,
            Math.round(
              height * scale
            )
          ),
        scale,
        label
      };
    }
  )
  .filter(
    (
      item,
      index,
      values
    ) =>
      values.findIndex(
        candidate =>
          candidate.width ===
            item.width &&
          candidate.height ===
            item.height
      ) === index
  );
}

function pngResolutionItems(
  width,
  height
) {
  const definition =
    pngResolutionDefinition();

  if (
    !definition.values.length
  ) {
    return [];
  }

  return pngOutputDimensions(
    width,
    height,
    definition
  );
}

function pngFilenameBase(
  filename
) {
  return normalizeDownloadFilename(
    filename,
    "png"
  ).replace(
    /\.png$/i,
    ""
  );
}

function pngResolutionFilename(
  base,
  item
) {
  return (
    `${base}-${item.width}x${item.height}.png`
  );
}

function updatePngExportOptions(
  width = null,
  height = null
) {
  const isPng =
    exportFormat.value ===
    "png";

  pngExportOptions.hidden =
    !isPng;

  if (!isPng) {
    return;
  }

  const isCustom =
    pngResolutionPreset.value ===
    "custom";

  pngCustomSizesWrap.hidden =
    !isCustom;

  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height)
  ) {
    pngResolutionSummary.textContent =
      "";
    return;
  }

  const items =
    pngResolutionItems(
      width,
      height
    );

  if (!items.length) {
    pngResolutionSummary.textContent =
      "Enter at least one valid size between 1 and 16384 px.";

    return;
  }

  const dimensions =
    items
      .map(
        item =>
          `${item.width}×${item.height}`
      )
      .join(", ");

  pngResolutionSummary.textContent =
    items.length === 1
      ? `1 PNG • ${dimensions} px`
      : `${items.length} PNGs in one ZIP • ${dimensions} px`;
}

function renderPngBlob(
  source,
  width,
  height
) {
  return new Promise(
    (resolve, reject) => {
      const svgBlob =
        new Blob(
          [source],
          {
            type:
              "image/svg+xml;charset=utf-8"
          }
        );

      const url =
        URL.createObjectURL(
          svgBlob
        );

      const img =
        new Image();

      img.onload =
        () => {
          const canvasEl =
            document.createElement(
              "canvas"
            );

          canvasEl.width =
            Math.max(
              1,
              Math.round(width)
            );

          canvasEl.height =
            Math.max(
              1,
              Math.round(height)
            );

          const ctx =
            canvasEl.getContext(
              "2d"
            );

          ctx.clearRect(
            0,
            0,
            canvasEl.width,
            canvasEl.height
          );

          ctx.drawImage(
            img,
            0,
            0,
            canvasEl.width,
            canvasEl.height
          );

          canvasEl.toBlob(
            blob => {
              URL.revokeObjectURL(
                url
              );

              if (!blob) {
                reject(
                  new Error(
                    "Could not create PNG export."
                  )
                );

                return;
              }

              resolve(blob);
            },
            "image/png"
          );
        };

      img.onerror =
        () => {
          URL.revokeObjectURL(
            url
          );

          reject(
            new Error(
              "Could not render PNG export."
            )
          );
        };

      img.src = url;
    }
  );
}

function downloadBlobFile(
  filename,
  blob
) {
  const url =
    URL.createObjectURL(
      blob
    );

  const link =
    document.createElement(
      "a"
    );

  link.href = url;
  link.download = filename;

  document.body.appendChild(
    link
  );

  link.click();
  link.remove();

  setTimeout(
    () =>
      URL.revokeObjectURL(
        url
      ),
    0
  );
}

async function downloadPngResolutionSet(
  filename,
  source,
  width,
  height
) {
  const items =
    pngResolutionItems(
      width,
      height
    );

  if (!items.length) {
    throw new Error(
      "Enter at least one valid PNG resolution."
    );
  }

  const base =
    pngFilenameBase(
      filename
    );

  if (
    items.length === 1
  ) {
    const item =
      items[0];

    const blob =
      await renderPngBlob(
        source,
        item.width,
        item.height
      );

    const outputName =
      pngResolutionPreset.value ===
        "single"
        ? `${base}.png`
        : pngResolutionFilename(
            base,
            item
          );

    downloadBlobFile(
      outputName,
      blob
    );

    return {
      count: 1,
      filename:
        outputName
    };
  }

  const JSZip =
    window.JSZip;

  if (
    typeof JSZip !==
    "function"
  ) {
    throw new Error(
      "PNG resolution-set ZIP library could not be loaded."
    );
  }

  const zip =
    new JSZip();

  const folder =
    zip.folder(
      `${base}-png`
    );

  for (
    const item of items
  ) {
    const blob =
      await renderPngBlob(
        source,
        item.width,
        item.height
      );

    folder.file(
      pngResolutionFilename(
        base,
        item
      ),
      blob
    );
  }

  const zipBlob =
    await zip.generateAsync({
      type:
        "blob",
      compression:
        "DEFLATE",
      compressionOptions: {
        level: 6
      }
    });

  const zipFilename =
    `${base}-png-resolutions.zip`;

  downloadBlobFile(
    zipFilename,
    zipBlob
  );

  return {
    count:
      items.length,
    filename:
      zipFilename
  };
}

function updateExportPreview() {
  const format = exportFormat.value;
  const scope = exportScope.value;

  svgPreviewWrap.style.display = format === "svg" ? "block" : "none";
  pngExportOptions.hidden =
    format !== "png";
  pngCustomSizesWrap.hidden =
    format !== "png" ||
    pngResolutionPreset.value !==
      "custom";

  if (canvasIsTransparent) {
    exportIncludeBackground.checked = false;
    exportIncludeBackground.disabled = true;
  } else {
    exportIncludeBackground.disabled = false;
  }

  if (scope === "selection" && !selectedItems.length) {
    exportMessage.textContent = "Select one or more shapes to export the selection.";
    downloadExportBtn.disabled = true;
    if (format === "svg") {
      svgOutput.value = "";
    }
    return;
  }

  downloadExportBtn.disabled = false;

  try {
    const { source, width, height } = buildExportSvg(scope, exportIncludeBackground.checked);

    const backgroundNote = canvasIsTransparent || !exportIncludeBackground.checked
      ? "transparent background"
      : "background included";

    aiExportCaveat.hidden = format !== "ai";

    updatePngExportOptions(
      width,
      height
    );

    const formatLabel =
      format === "ai"
        ? "AI (PDF-compatible vector)"
        : format.toUpperCase();

    const compatibilityNote =
      format === "ai"
        ? " • opens in Adobe Illustrator; Illustrator-native live metadata is not included"
        : "";

    const pngItems =
      format === "png"
        ? pngResolutionItems(
            width,
            height
          )
        : [];

    const pngNote =
      format === "png" &&
      pngItems.length > 1
        ? ` • ${pngItems.length} PNG resolutions`
        : "";

    exportMessage.textContent =
      `${formatLabel} export • ${scope === "canvas" ? "whole canvas" : "selection"} • source ${Math.round(width)} × ${Math.round(height)} px • ${backgroundNote}${pngNote}${compatibilityNote}`;

    if (format === "svg") {
      svgOutput.value = source;
    }
  } catch (error) {
    exportMessage.textContent = error.message || "Export is not available.";
    downloadExportBtn.disabled = true;
    if (format === "svg") {
      svgOutput.value = "";
    }
  }
}

function openExportModal() {
  selectionQuickMenu.hidden = true;
  closeCanvasContextMenu();

  exportFilename.value = baseExportName();
  exportIncludeBackground.checked = !canvasIsTransparent;
  exportIncludeBackground.disabled = canvasIsTransparent;
  exportScope.value = selectedItems.length ? "selection" : "canvas";
  exportFormat.value = "svg";
  updateExportPreview();
  exportModal.classList.remove("hidden");
}

function closeExportModal() {
  exportModal.classList.add("hidden");
  renderSelectionQuickMenu();
}

function downloadSvgFile(filename, source) {
  downloadTextFile(filename, source, "image/svg+xml");
}

function downloadPngFile(filename, source, width, height) {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();

    img.onload = () => {
      const canvasEl = document.createElement("canvas");
      canvasEl.width = Math.max(1, Math.round(width));
      canvasEl.height = Math.max(1, Math.round(height));

      const ctx = canvasEl.getContext("2d");
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      ctx.drawImage(img, 0, 0, canvasEl.width, canvasEl.height);

      canvasEl.toBlob(blob => {
        URL.revokeObjectURL(url);

        if (!blob) {
          reject(new Error("Could not create PNG export."));
          return;
        }

        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
        resolve();
      }, "image/png");
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not render PNG export."));
    };

    img.src = url;
  });
}

async function downloadAiCompatibleFile(
  filename,
  source,
  width,
  height
) {
  const aiFilename =
    normalizeDownloadFilename(filename, "ai");

  const jsPdfNamespace = window.jspdf;
  const jsPDF = jsPdfNamespace?.jsPDF;

  if (!jsPDF) {
    throw new Error(
      "Illustrator-compatible export library could not be loaded."
    );
  }

  const parser = new DOMParser();
  const parsed = parser.parseFromString(
    source,
    "image/svg+xml"
  );

  const svgElement = parsed.documentElement;

  if (
    !svgElement ||
    svgElement.nodeName.toLowerCase() !== "svg"
  ) {
    throw new Error(
      "Could not prepare vector artwork for Illustrator export."
    );
  }

  const pageWidth = Math.max(1, Number(width));
  const pageHeight = Math.max(1, Number(height));

  const pdf = new jsPDF({
    orientation:
      pageWidth >= pageHeight
        ? "landscape"
        : "portrait",
    unit: "px",
    format: [
      pageWidth,
      pageHeight
    ],
    hotfixes: ["px_scaling"],
    compress: true
  });

  if (typeof pdf.svg !== "function") {
    throw new Error(
      "Illustrator-compatible SVG conversion library could not be loaded."
    );
  }

  await pdf.svg(
    svgElement,
    {
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight
    }
  );

  const pdfBlob = pdf.output("blob");

  /*
   * Modern Illustrator AI files can contain PDF-compatible vector syntax.
   * This export intentionally writes that interoperable vector layer and uses
   * the .ai extension. It does not attempt to fabricate Adobe's private PGF
   * editing data.
   */
  const aiBuffer = await pdfBlob.arrayBuffer();

  /*
   * The payload is the PDF-compatible vector portion Illustrator can open,
   * but the download itself is intentionally presented as an Illustrator
   * document so browsers do not rename/classify the exported file as .pdf.
   */
  const aiBlob = new Blob(
    [aiBuffer],
    { type: "application/illustrator" }
  );

  const url = URL.createObjectURL(aiBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = aiFilename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(
    () => URL.revokeObjectURL(url),
    0
  );

  return aiFilename;
}

async function downloadExport() {
  try {
    const format = exportFormat.value;
    const scope = exportScope.value;
    const filename = normalizeDownloadFilename(exportFilename.value, format);
    const { source, width, height } = buildExportSvg(scope, exportIncludeBackground.checked);

    if (format === "svg") {
      downloadSvgFile(filename, source);
    } else if (format === "png") {
      const pngResult =
        await downloadPngResolutionSet(
          filename,
          source,
          width,
          height
        );

      exportMessage.textContent =
        pngResult.count > 1
          ? `Exported ${pngResult.count} PNG resolutions • ${pngResult.filename}`
          : `Exported ${pngResult.filename}`;

      return;
    } else if (format === "ai") {
      const aiFilename =
        await downloadAiCompatibleFile(
          filename,
          source,
          width,
          height
        );

      exportMessage.textContent =
        `Exported ${aiFilename} • Illustrator-compatible vector`;
      return;
    } else {
      throw new Error(
        `Unsupported export format: ${format}`
      );
    }

    exportMessage.textContent =
      `Exported ${filename}`;
  } catch (error) {
    console.error(error);
    exportMessage.textContent = error.message || "Export failed.";
    alert(error.message || "Export failed.");
  }
}

document.querySelector("#exportBtn")?.addEventListener("click", openExportModal);
document.querySelector("#closeExport").addEventListener("click", closeExportModal);
downloadExportBtn.addEventListener("click", downloadExport);

[exportFormat, exportScope, exportIncludeBackground].forEach(control => {
  control.addEventListener("input", updateExportPreview);
  control.addEventListener("change", updateExportPreview);
});

[pngResolutionPreset, pngCustomSizes].forEach(control => {
  control.addEventListener("input", updateExportPreview);
  control.addEventListener("change", updateExportPreview);
});

exportFilename.addEventListener("input", () => {
  if (!exportMessage.textContent) {
    updateExportPreview();
  }
});


function appFullscreenActive() {
  return Boolean(
    document.fullscreenElement
  );
}

function updateFullscreenMenuState() {
  document
    .querySelectorAll(
      '[data-command="toggle-fullscreen"]'
    )
    .forEach(
      item => {
        const mark =
          item.querySelector(
            "span"
          );

        if (mark) {
          mark.textContent =
            appFullscreenActive()
              ? "✓"
              : "";
        }
      }
    );
}

async function toggleAppFullscreen() {
  try {
    if (
      !appFullscreenActive()
    ) {
      const target =
        document.documentElement;

      await target.requestFullscreen?.();
    } else {
      await document.exitFullscreen?.();
    }
  } catch (
    error
  ) {
    toolStatus.textContent =
      "Fullscreen is unavailable in this browser context";
  }

  updateFullscreenMenuState();
}

document.addEventListener(
  "fullscreenchange",
  updateFullscreenMenuState
);


let activeRightPanelView = "properties";

let rightPanelCollapsed = false;

let rightPanelStacked = false;
let rightPanelStackOrder = [];
let rightPanelStackPending = [];

function setRightPanelCollapsed(collapsed) {
  rightPanelCollapsed = Boolean(collapsed);
  document.body.classList.toggle("right-panel-collapsed", rightPanelCollapsed);

  const panel = document.querySelector("#rightPanel");
  if (panel) {
    panel.setAttribute("aria-hidden", rightPanelCollapsed ? "true" : "false");
  }
}

function renderRightPanelMode() {
  const stackedPanels = rightPanelStacked ? rightPanelStackOrder.slice(0, 2) : [];

  document.body.classList.toggle("right-panel-stacked", rightPanelStacked);
  document.body.dataset.rightPanelStack = stackedPanels.join(",");

  document.querySelectorAll(".right-panel-view[data-panel]").forEach(view => {
    const panelName = view.dataset.panel;
    const stackIndex = stackedPanels.indexOf(panelName);
    const active = rightPanelStacked ? stackIndex !== -1 : panelName === activeRightPanelView;

    view.classList.toggle("active", active);
    view.classList.toggle("right-panel-stack-view", stackIndex !== -1);
    view.classList.toggle("right-panel-stack-first", stackIndex === 0);
    view.classList.toggle("right-panel-stack-second", stackIndex === 1);
    view.style.order = stackIndex === -1 ? "" : String(stackIndex + 1);
  });

  document.querySelectorAll("#rightPanelTabRail [data-panel-view]").forEach(tab => {
    const panelName = tab.dataset.panelView;
    const stackIndex = stackedPanels.indexOf(panelName);
    const pendingIndex = rightPanelStackPending.indexOf(panelName);
    const active = rightPanelStacked ? stackIndex !== -1 : panelName === activeRightPanelView;

    tab.classList.toggle("active", active);
    tab.classList.toggle("stacked", stackIndex !== -1);
    tab.classList.toggle("stack-pending", !rightPanelStacked && pendingIndex !== -1);
    tab.dataset.stackOrder = stackIndex === -1 ? "" : String(stackIndex + 1);
    tab.setAttribute("aria-selected", active ? "true" : "false");
  });

  if (stackedPanels.includes("layers") && typeof renderLayers === "function") {
    renderLayers();
  }
  if (stackedPanels.includes("history") && typeof renderHistoryPanel === "function") {
    renderHistoryPanel();
  }
}

function clearRightPanelStackSelection() {
  rightPanelStacked = false;
  rightPanelStackOrder = [];
  rightPanelStackPending = [];
  renderRightPanelMode();
}

function shiftSelectRightPanel(panelName) {
  setRightPanelCollapsed(false);

  if (rightPanelStacked) {
    // Start a fresh ordered pair when the user Shift-clicks after a completed stack.
    rightPanelStacked = false;
    rightPanelStackOrder = [];
    rightPanelStackPending = [panelName];
    activeRightPanelView = panelName;
    renderRightPanelMode();
    return;
  }

  if (rightPanelStackPending.length === 0) {
    rightPanelStackPending = [panelName];
    activeRightPanelView = panelName;
    renderRightPanelMode();
    return;
  }

  if (rightPanelStackPending[0] === panelName) {
    // Re-clicking the same pending panel leaves it as the first stack choice.
    activeRightPanelView = panelName;
    renderRightPanelMode();
    return;
  }

  rightPanelStackOrder = [rightPanelStackPending[0], panelName];
  rightPanelStackPending = [];
  rightPanelStacked = true;
  activeRightPanelView = rightPanelStackOrder[0];
  renderRightPanelMode();
}

function showRightPanel(panelName) {
  // A normal click always returns to single-panel mode. If it is exiting a
  // stack/pending choice, never interpret that same click as a collapse.
  const wasChoosingStack = rightPanelStacked || rightPanelStackPending.length > 0;
  rightPanelStacked = false;
  rightPanelStackOrder = [];
  rightPanelStackPending = [];

  if (
    !wasChoosingStack &&
    panelName === activeRightPanelView &&
    !rightPanelCollapsed
  ) {
    setRightPanelCollapsed(true);
    renderRightPanelMode();
    return;
  }

  activeRightPanelView = panelName;
  setRightPanelCollapsed(false);
  renderRightPanelMode();

  if (panelName === "history") {
    renderHistoryPanel();
  }
}

const closeColorPickerButton =
  document.querySelector(
    "#closeColorPicker"
  );

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

/* Restored explicit color-picker runtime state. */
const customColorPicker = document.querySelector("#customColorPicker");
const colorField = document.querySelector("#colorField");
const colorFieldHandle = document.querySelector("#colorFieldHandle");
const hueSlider = document.querySelector("#hueSlider");
const hueHandle = document.querySelector("#hueHandle");
const colorPreview = document.querySelector("#colorPreview");
const colorHexInput = document.querySelector("#colorHexInput");
const colorRedInput = document.querySelector("#colorRedInput");
const colorGreenInput = document.querySelector("#colorGreenInput");
const colorBlueInput = document.querySelector("#colorBlueInput");
const colorEyedropperButton = document.querySelector("#colorEyedropperButton");
const colorTransparentButton = document.querySelector("#colorTransparentButton");
const addCustomSwatchButton = document.querySelector("#addCustomSwatchButton");
const clearCustomSwatchesButton = document.querySelector("#clearCustomSwatchesButton");
const customSwatches = document.querySelector("#customSwatches");
const CUSTOM_COLOR_SWATCHES_STORAGE_KEY = "vectorStudio.customColorSwatches";
let customColorSwatchValues = [];
let activeColorTarget = null;
let pickerHue = 0;
let pickerSaturation = 1;
let pickerValue = 1;

function normalizeHexColor(value) {
  const raw = String(value || "").trim();

  if (/^#[0-9a-f]{6}$/i.test(raw)) {
    return raw.toLowerCase();
  }

  if (/^#[0-9a-f]{3}$/i.test(raw)) {
    return (
      "#" +
      raw.slice(1).split("").map(char => char + char).join("")
    ).toLowerCase();
  }

  return null;
}

function hexToRgb(hex) {
  const normalized = normalizeHexColor(hex) || "#000000";
  const value = parseInt(normalized.slice(1), 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b]
    .map(value =>
      Math.max(0, Math.min(255, Math.round(value)))
        .toString(16)
        .padStart(2, "0")
    )
    .join("");
}

function rgbToHsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;

  if (delta) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;

    h *= 60;
    if (h < 0) h += 360;
  }

  return {
    h,
    s: max === 0 ? 0 : delta / max,
    v: max
  };
}

function hsvToRgb(h, s, v) {
  const wrappedHue = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((wrappedHue / 60) % 2) - 1));
  const m = v - c;

  let rp = 0;
  let gp = 0;
  let bp = 0;

  if (wrappedHue < 60) [rp, gp, bp] = [c, x, 0];
  else if (wrappedHue < 120) [rp, gp, bp] = [x, c, 0];
  else if (wrappedHue < 180) [rp, gp, bp] = [0, c, x];
  else if (wrappedHue < 240) [rp, gp, bp] = [0, x, c];
  else if (wrappedHue < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];

  return {
    r: (rp + m) * 255,
    g: (gp + m) * 255,
    b: (bp + m) * 255
  };
}

function currentPickerHex() {
  const rgb = hsvToRgb(
    pickerHue,
    pickerSaturation,
    pickerValue
  );

  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

function syncColorTrigger(targetId, color) {
  const trigger = document.querySelector(
    `[data-color-target="${targetId}"]`
  );
  if (!trigger) return;

  const normalized = normalizeHexColor(color) || color;
  const swatch = trigger.querySelector(".color-swatch");
  const valueNode = trigger.querySelector(".color-value");

  if (swatch) {
    swatch.style.setProperty("--swatch-color", normalized);
  }

  if (valueNode) {
    valueNode.textContent = String(normalized).toUpperCase();
  }
}

function syncMatchingColorInputs(source) {
  if (source === fill || source === topFill) {
    fill.value = source.value;
    topFill.value = source.value;
    syncColorTrigger("fill", source.value);
    syncColorTrigger("topFill", source.value);
  }

  if (source === stroke || source === topStroke) {
    stroke.value = source.value;
    topStroke.value = source.value;
    syncColorTrigger("stroke", source.value);
    syncColorTrigger("topStroke", source.value);
  }

  if (source === canvasBackground) {
    syncColorTrigger("canvasBackground", source.value);
  }

  if (source === gradientStart || source === gradientEnd) {
    syncColorTrigger(source.id, source.value);
  }
}

function clampRgbChannel(value) {
  const number =
    Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      255,
      Math.round(number)
    )
  );
}

function pickerRgbInputs() {
  return [
    colorRedInput,
    colorGreenInput,
    colorBlueInput
  ];
}

function currentPickerRgb() {
  const rgb =
    hsvToRgb(
      pickerHue,
      pickerSaturation,
      pickerValue
    );

  return {
    r:
      clampRgbChannel(rgb.r),
    g:
      clampRgbChannel(rgb.g),
    b:
      clampRgbChannel(rgb.b)
  };
}

function syncRgbInputsFromPicker() {
  if (
    !colorRedInput ||
    !colorGreenInput ||
    !colorBlueInput
  ) {
    return;
  }

  const rgb =
    currentPickerRgb();

  colorRedInput.value =
    String(rgb.r);

  colorGreenInput.value =
    String(rgb.g);

  colorBlueInput.value =
    String(rgb.b);
}

function rgbInputsHex() {
  if (
    !colorRedInput ||
    !colorGreenInput ||
    !colorBlueInput
  ) {
    return currentPickerHex();
  }

  return rgbToHex(
    clampRgbChannel(
      colorRedInput.value
    ),
    clampRgbChannel(
      colorGreenInput.value
    ),
    clampRgbChannel(
      colorBlueInput.value
    )
  );
}

function applyRgbInputsToPicker(
  record = false
) {
  const hex =
    rgbInputsHex();

  setPickerFromHex(hex);
  applyCustomColorLive(
    hex,
    record
  );
}

function refreshColorPickerUI() {
  const hueRgb = hsvToRgb(pickerHue, 1, 1);
  colorField.style.background = rgbToHex(
    hueRgb.r,
    hueRgb.g,
    hueRgb.b
  );

  colorFieldHandle.style.left = `${pickerSaturation * 100}%`;
  colorFieldHandle.style.top = `${(1 - pickerValue) * 100}%`;
  hueHandle.style.left = `${(pickerHue / 360) * 100}%`;

  const hex = currentPickerHex();
  colorPreview.style.background = hex;
  colorHexInput.value = hex.toUpperCase();
  syncRgbInputsFromPicker();
}

function setPickerFromHex(hex) {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return false;

  const rgb = hexToRgb(normalized);
  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);

  pickerHue = hsv.h;
  pickerSaturation = hsv.s;
  pickerValue = hsv.v;
  refreshColorPickerUI();
  return true;
}


function loadCustomColorSwatches() {
  try {
    const stored = JSON.parse(
      localStorage.getItem(
        CUSTOM_COLOR_SWATCHES_STORAGE_KEY
      ) || "[]"
    );

    customColorSwatchValues =
      Array.isArray(stored)
        ? stored
            .map(normalizeHexColor)
            .filter(Boolean)
            .filter(
              (color, index, values) =>
                values.indexOf(color) === index
            )
            .slice(0, 32)
        : [];
  } catch {
    customColorSwatchValues = [];
  }

  renderCustomColorSwatches();
}

function saveCustomColorSwatches() {
  try {
    localStorage.setItem(
      CUSTOM_COLOR_SWATCHES_STORAGE_KEY,
      JSON.stringify(
        customColorSwatchValues
      )
    );
  } catch {
    // Swatches still work for the current session.
  }
}

function renderCustomColorSwatches() {
  if (!customSwatches) return;

  customSwatches.replaceChildren();

  customColorSwatchValues.forEach(color => {
    const button =
      document.createElement("button");

    button.type = "button";
    button.className = "custom-swatch";
    button.style.background = color;
    button.title =
      `${color.toUpperCase()} · Right-click to remove`;
    button.setAttribute(
      "aria-label",
      `Use custom swatch ${color}`
    );

    button.addEventListener(
      "click",
      event => {
        event.preventDefault();
        event.stopPropagation();
        setPickerFromHex(color);
        applyCustomColorLive(
          color,
          true
        );
      }
    );

    button.addEventListener(
      "contextmenu",
      event => {
        event.preventDefault();
        event.stopPropagation();

        customColorSwatchValues =
          customColorSwatchValues.filter(
            value => value !== color
          );

        saveCustomColorSwatches();
        renderCustomColorSwatches();
      }
    );

    customSwatches.appendChild(
      button
    );
  });
}

function addCurrentColorAsSwatch() {
  const color =
    normalizeHexColor(
      currentPickerHex()
    );

  if (!color) return;

  customColorSwatchValues = [
    color,
    ...customColorSwatchValues.filter(
      value => value !== color
    )
  ].slice(0, 32);

  saveCustomColorSwatches();
  renderCustomColorSwatches();
}


function applyTransparentColorTarget() {
  if (!activeColorTarget) {
    return false;
  }

  const targetId =
    activeColorTarget.id;

  if (
    targetId ===
      "canvasBackground"
  ) {
    if (canvasTransparent) {
      canvasTransparent.checked =
        true;

      canvasTransparent.dispatchEvent(
        new Event(
          "change",
          {
            bubbles:
              true
          }
        )
      );
    }

    return true;
  }

  const paintKind =
    (
      targetId === "stroke" ||
      targetId === "topStroke"
    )
      ? "stroke"
      : (
          targetId === "fill" ||
          targetId === "topFill"
        )
        ? "fill"
        : null;

  if (!paintKind) {
    toolStatus.textContent =
      "Transparent is available for fill, stroke, and canvas background";
    return false;
  }

  const items =
    (
      selectedItems?.length
        ? selectedItems
        : selected
          ? [selected]
          : []
    )
      .filter(Boolean);

  items.forEach(
    element => {
      element.setAttribute(
        paintKind,
        "none"
      );
    }
  );

  /*
   * Keep the paired UI controls visually synchronized even though hidden
   * color inputs themselves remain valid hex values.
   */
  const pairedIds =
    paintKind ===
      "fill"
      ? [
          "fill",
          "topFill"
        ]
      : [
          "stroke",
          "topStroke"
        ];

  pairedIds.forEach(
    id => {
      document
        .querySelectorAll(
          `[data-color-target="${id}"]`
        )
        .forEach(
          trigger => {
            trigger
              .querySelector(
                ".color-value"
              )
              ?.replaceChildren(
                "Transparent"
              );

            const swatch =
              trigger.querySelector(
                ".color-swatch"
              );

            if (swatch) {
              swatch.classList.add(
                "transparent-color-value"
              );
            }
          }
        );
    }
  );

  updatePropertyControls();
  drawSelection();
  renderLayers();

  recordHistory({
    label:
      paintKind ===
        "fill"
        ? "Transparent Fill"
        : "Transparent Stroke"
  });

  scheduleAutosave();

  toolStatus.textContent =
    paintKind ===
      "fill"
      ? "Fill: Transparent"
      : "Stroke: Transparent";

  return true;
}



function applyCurrentPickerColorLive(
  record = false
) {
  const color =
    normalizeHexColor(
      currentPickerHex()
    );

  if (!color) {
    return false;
  }

  return applyCustomColorLive(
    color,
    record
  );
}

/*
 * Bind only to controls that actually exist in this custom picker.
 * Field/hue dragging is handled by their pointer handlers below.
 */
[
  colorHexInput,
  colorRedInput,
  colorGreenInput,
  colorBlueInput
]
  .filter(Boolean)
  .forEach(
    control => {
      control.addEventListener(
        "input",
        () => {
          applyCurrentPickerColorLive(
            false
          );
        }
      );

      control.addEventListener(
        "change",
        () => {
          applyCurrentPickerColorLive(
            true
          );
        }
      );
    }
  );

function stopColorEyedropper() {
  colorEyedropperActive = false;
  document.body.classList.remove(
    "color-eyedropper-active"
  );

  
if (colorTransparentButton) {
  colorTransparentButton.addEventListener(
    "click",
    event => {
      event.preventDefault();
      event.stopPropagation();

      applyTransparentColorTarget();
      closeCustomColorPicker();
    }
  );
}

if (colorEyedropperButton) {
    colorEyedropperButton.classList.remove(
      "active"
    );
  }
}

function startColorEyedropper() {
  colorEyedropperActive = true;
  document.body.classList.add(
    "color-eyedropper-active"
  );

  if (colorEyedropperButton) {
    colorEyedropperButton.classList.add(
      "active"
    );
  }
}

function cssColorToHex(value) {
  const normalized =
    normalizeHexColor(value);

  if (normalized) {
    return normalized;
  }

  const raw =
    String(value || "").trim();

  const match = raw.match(
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/
  );

  if (!match) return null;

  return rgbToHex(
    Number(match[1]),
    Number(match[2]),
    Number(match[3])
  );
}


let colorEyedropperActive = false;

const eyedropperImageCache =
  new Map();

function eyedropperBrowserImage(
  element
) {
  const href =
    imageHref(
      element
    );

  if (!href) {
    return Promise.resolve(
      null
    );
  }

  if (
    eyedropperImageCache.has(
      href
    )
  ) {
    return eyedropperImageCache.get(
      href
    );
  }

  const pending =
    loadBrowserImage(
      href
    )
      .catch(
        () => null
      );

  eyedropperImageCache.set(
    href,
    pending
  );

  return pending;
}

async function sampleRasterImageColor(
  element,
  clientX,
  clientY
) {
  if (
    !isRasterImageElement(
      element
    )
  ) {
    return null;
  }

  const browserImage =
    await eyedropperBrowserImage(
      element
    );

  if (!browserImage) {
    return null;
  }

  const screenMatrix =
    element.getScreenCTM();

  if (!screenMatrix) {
    return null;
  }

  const screenPoint =
    new DOMPoint(
      clientX,
      clientY
    );

  const local =
    screenPoint.matrixTransform(
      screenMatrix.inverse()
    );

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

  if (
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }

  const u =
    (local.x - x) /
    width;

  const v =
    (local.y - y) /
    height;

  if (
    u < 0 ||
    u > 1 ||
    v < 0 ||
    v > 1
  ) {
    return null;
  }

  const sourceX =
    Math.max(
      0,
      Math.min(
        browserImage.naturalWidth - 1,
        Math.floor(
          u *
          browserImage.naturalWidth
        )
      )
    );

  const sourceY =
    Math.max(
      0,
      Math.min(
        browserImage.naturalHeight - 1,
        Math.floor(
          v *
          browserImage.naturalHeight
        )
      )
    );

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width = 1;
  canvas.height = 1;

  const context =
    canvas.getContext(
      "2d",
      {
        willReadFrequently:
          true
      }
    );

  if (!context) {
    return null;
  }

  try {
    context.drawImage(
      browserImage,
      sourceX,
      sourceY,
      1,
      1,
      0,
      0,
      1,
      1
    );

    const pixel =
      context.getImageData(
        0,
        0,
        1,
        1
      ).data;

    if (
      pixel[3] === 0
    ) {
      return {
        transparent:
          true,
        color:
          null
      };
    }

    return {
      transparent:
        false,
      color:
        rgbToHex(
          pixel[0],
          pixel[1],
          pixel[2]
        )
    };
  } catch {
    return null;
  }
}

async function sampleColorAtPointAsync(
  clientX,
  clientY
) {
  const pickerWasHidden =
    customColorPicker.classList.contains(
      "hidden"
    );

  if (!pickerWasHidden) {
    customColorPicker.style.visibility =
      "hidden";
  }

  const target =
    document.elementFromPoint(
      clientX,
      clientY
    );

  if (!pickerWasHidden) {
    customColorPicker.style.removeProperty(
      "visibility"
    );
  }

  const image =
    target?.closest?.(
      "#art image[data-image-object='true']"
    );

  if (image) {
    const sampled =
      await sampleRasterImageColor(
        image,
        clientX,
        clientY
      );

    if (sampled) {
      return sampled;
    }
  }

  const vectorColor =
    sampledArtworkColor(
      target
    );

  return vectorColor
    ? {
        transparent:
          false,
        color:
          vectorColor
      }
    : null;
}

function sampledArtworkColor(target) {
  if (!target) return null;

  const artworkNode =
    target.closest?.(
      "#art [data-object='true'], " +
      "#art [data-group-child='true'], " +
      "#art path, #art rect, #art ellipse, " +
      "#art polygon, #art line, #art text"
    );

  if (artworkNode) {
    const computed =
      getComputedStyle(
        artworkNode
      );

    const fillValue =
      artworkNode.getAttribute(
        "fill"
      ) || computed.fill;

    const fillColor =
      fillValue !== "none"
        ? cssColorToHex(fillValue)
        : null;

    if (fillColor) return fillColor;

    const strokeValue =
      artworkNode.getAttribute(
        "stroke"
      ) || computed.stroke;

    const strokeColor =
      strokeValue !== "none"
        ? cssColorToHex(strokeValue)
        : null;

    if (strokeColor) {
      return strokeColor;
    }
  }

  if (
    target === art ||
    target.closest?.("#art")
  ) {
    return (
      cssColorToHex(
        canvasBackground.value
      ) ||
      "#ffffff"
    );
  }

  return null;
}

function sampleColorAtPoint(
  clientX,
  clientY
) {
  const pickerWasHidden =
    customColorPicker.classList.contains(
      "hidden"
    );

  if (!pickerWasHidden) {
    customColorPicker.style.visibility =
      "hidden";
  }

  const target =
    document.elementFromPoint(
      clientX,
      clientY
    );

  if (!pickerWasHidden) {
    customColorPicker.style.removeProperty(
      "visibility"
    );
  }

  return sampledArtworkColor(target);
}

function positionColorPicker(trigger) {
  const rect = trigger.getBoundingClientRect();
  const width = 270;
  const estimatedHeight = 458;

  let left = rect.left;
  let top = rect.bottom + 6;

  if (left + width > window.innerWidth - 8) {
    left = window.innerWidth - width - 8;
  }

  if (top + estimatedHeight > window.innerHeight - 8) {
    top = Math.max(8, rect.top - estimatedHeight - 6);
  }

  customColorPicker.style.left = `${Math.max(8, left)}px`;
  customColorPicker.style.top = `${Math.max(8, top)}px`;
}

function openCustomColorPicker(targetId, trigger) {
  activeColorTarget = document.querySelector(`#${targetId}`);
  if (!activeColorTarget) return;

  setPickerFromHex(activeColorTarget.value || "#000000");
  customColorPicker.classList.remove("hidden");
  positionColorPicker(trigger);
}

function closeCustomColorPicker() {
  stopColorEyedropper();
  customColorPicker.classList.add("hidden");
  activeColorTarget = null;
}



function isShapeBuilderResultElement(
  element
) {
  return Boolean(
    element &&
    (
      element.dataset
        ?.shapeBuilderGeoJSON ===
          "true" ||
      element.dataset
        ?.shapeBuilderGeometry ||
      element.dataset
        ?.compoundShape ===
          "true"
    )
  );
}

function ensureShapeBuilderPaintVisible(
  element,
  kind
) {
  if (
    !isShapeBuilderResultElement(
      element
    )
  ) {
    return false;
  }

  const attribute =
    kind === "stroke"
      ? "stroke-opacity"
      : "fill-opacity";

  const raw =
    element.getAttribute(
      attribute
    );

  const opacity =
    raw === null ||
    raw === ""
      ? 1
      : Number(raw);

  if (
    Number.isFinite(opacity) &&
    opacity > 0
  ) {
    return false;
  }

  element.setAttribute(
    attribute,
    "1"
  );

  if (
    kind === "fill"
  ) {
    if (fillOpacity) {
      fillOpacity.value =
        "100";
    }

    if (fillOpacityNumber) {
      fillOpacityNumber.value =
        "100";
    }

    if (fillOpacityValue) {
      fillOpacityValue.textContent =
        "100%";
    }
  } else {
    if (strokeOpacity) {
      strokeOpacity.value =
        "100";
    }

    if (strokeOpacityNumber) {
      strokeOpacityNumber.value =
        "100";
    }

    if (strokeOpacityValue) {
      strokeOpacityValue.textContent =
        "100%";
    }
  }

  return true;
}

function applyCustomColorLive(
  color,
  record = false
) {
  const normalized =
    normalizeHexColor(
      color
    );

  if (
    !normalized ||
    !activeColorTarget
  ) {
    return false;
  }

  const targetId =
    activeColorTarget.id;

  if (
    sendSplitColorChange(
      normalized,
      targetId,
      record
    )
  ) {
    /*
     * Keep the parent/shared color UI synchronized even though the actual
     * artwork mutation occurs in the secondary live editor.
     */
    if (
      targetId === "fill" ||
      targetId === "topFill"
    ) {
      if (fill) {
        fill.value =
          normalized;
      }

      if (topFill) {
        topFill.value =
          normalized;
      }

      rememberVisiblePaint(
        "fill",
        normalized
      );

      if (fill) {
        syncMatchingColorInputs(
          fill
        );
      }
    } else if (
      targetId === "stroke" ||
      targetId === "topStroke"
    ) {
      if (stroke) {
        stroke.value =
          normalized;
      }

      if (topStroke) {
        topStroke.value =
          normalized;
      }

      rememberVisiblePaint(
        "stroke",
        normalized
      );

      if (stroke) {
        syncMatchingColorInputs(
          stroke
        );
      }
    }

    return true;
  }


  /*
   * Keep the underlying picker/input value synchronized first.
   */
  if (
    typeof activeColorTarget.value !==
      "undefined"
  ) {
    activeColorTarget.value =
      normalized;
  }

  /*
   * 3D Extrude face appearance is stored in the live 3D settings, not on the
   * top-level <g>. Route fill/stroke changes to the currently picked face
   * before the generic selected-object paint path runs.
   */
  const selectedThreeD =
    selectedThreeDExtrude();

  const isThreeDFaceColorTarget =
    targetId === "fill" ||
    targetId === "topFill" ||
    targetId === "stroke" ||
    targetId === "topStroke";

  const activeThreeDFace =
    activeThreeDFaceSelection(
      selectedThreeD
    );

  if (
    selectedThreeD &&
    activeThreeDFace &&
    isThreeDFaceColorTarget
  ) {
    if (
      targetId === "fill" ||
      targetId === "topFill"
    ) {
      if (fill) {
        fill.value =
          normalized;
      }

      if (topFill) {
        topFill.value =
          normalized;
      }

      rememberVisiblePaint(
        "fill",
        normalized
      );

      if (fill) {
        syncMatchingColorInputs(
          fill
        );
      }
    } else {
      if (stroke) {
        stroke.value =
          normalized;
      }

      if (topStroke) {
        topStroke.value =
          normalized;
      }

      rememberVisiblePaint(
        "stroke",
        normalized
      );

      if (stroke) {
        syncMatchingColorInputs(
          stroke
        );
      }
    }

    const sourceControl =
      targetId === "fill"
        ? fill
        : targetId === "topFill"
          ? topFill
          : targetId === "stroke"
            ? stroke
            : topStroke;

    const changed =
      applyAppearanceControlToThreeDFace(
        selectedThreeD,
        activeThreeDFace,
        sourceControl
      );

    if (changed) {
      document
        .querySelectorAll(
          `[data-color-target="${targetId}"]`
        )
        .forEach(
          trigger => {
            const swatch =
              trigger.querySelector(
                ".color-swatch"
              );

            if (swatch) {
              swatch.classList.remove(
                "transparent-color-value"
              );

              swatch.style.background =
                normalized;
            }

            const value =
              trigger.querySelector(
                ".color-value"
              );

            if (value) {
              value.textContent =
                normalized.toUpperCase();
            }
          }
        );

      if (record) {
        recordHistory({
          label:
            targetId === "stroke" ||
            targetId === "topStroke"
              ? `3D ${activeThreeDFace} Face Stroke Changed`
              : `3D ${activeThreeDFace} Face Fill Changed`,
          detail:
            normalized.toUpperCase()
        });
      }

      return true;
    }
  }

  /*
   * The color picker is live: any already-selected artwork should update
   * immediately as the picker changes.
   */
  const items =
    (
      selectedItems?.length
        ? selectedItems
        : selected
          ? [selected]
          : []
    )
      .filter(Boolean);

  if (
    targetId ===
      "fill" ||
    targetId ===
      "topFill"
  ) {
    items.forEach(
      element => {
        if (
          element?.setAttribute
        ) {
          element.setAttribute(
            "fill",
            normalized
          );

          ensureShapeBuilderPaintVisible(
            element,
            "fill"
          );
        }
      }
    );

    if (fill) {
      fill.value =
        normalized;
    }

    rememberVisiblePaint(
      "fill",
      normalized
    );

    if (topFill) {
      topFill.value =
        normalized;
    }

    if (fill) {
      syncMatchingColorInputs(
        fill
      );
    }
  } else if (
    targetId ===
      "stroke" ||
    targetId ===
      "topStroke"
  ) {
    items.forEach(
      element => {
        if (
          element?.setAttribute
        ) {
          element.setAttribute(
            "stroke",
            normalized
          );

          ensureShapeBuilderPaintVisible(
            element,
            "stroke"
          );
        }
      }
    );

    if (stroke) {
      stroke.value =
        normalized;
    }

    rememberVisiblePaint(
      "stroke",
      normalized
    );

    if (topStroke) {
      topStroke.value =
        normalized;
    }

    if (stroke) {
      syncMatchingColorInputs(
        stroke
      );
    }
  } else if (
    targetId ===
      "canvasBackground"
  ) {
    canvasBackground.value =
      normalized;

    if (canvasTransparent) {
      canvasTransparent.checked =
        false;
    }

    if (
      typeof updateCanvasBackground ===
        "function"
    ) {
      updateCanvasBackground();
    }
  } else {
    /*
     * Preserve support for any specialized color target that already uses
     * its own input/change handling.
     */
    activeColorTarget.dispatchEvent(
      new Event(
        "input",
        {
          bubbles:
            true
        }
      )
    );
  }

  document
    .querySelectorAll(
      `[data-color-target="${targetId}"]`
    )
    .forEach(
      trigger => {
        const swatch =
          trigger.querySelector(
            ".color-swatch"
          );

        if (swatch) {
          swatch.classList.remove(
            "transparent-color-value"
          );

          swatch.style.background =
            normalized;
        }

        const value =
          trigger.querySelector(
            ".color-value"
          );

        if (value) {
          value.textContent =
            normalized.toUpperCase();
        }
      }
    );

  items.forEach(
    element => {
      /*
       * Rebuild d only for paths that actually use the editor anchor model.
       * Shape Builder GeoJSON/compound results already carry authoritative
       * SVG path data; calling updatePathD() on those during a paint-only
       * change can replace their geometry with an empty/invalid path.
       */
      if (
        element?.tagName ===
          "path" &&
        Array.isArray(
          element._anchors
        )
      ) {
        updatePathD(
          element
        );
      }
    }
  );

  updatePropertyControls();
  drawSelection();
  renderLayers();

  if (record) {
    recordHistory({
      label:
        targetId ===
          "stroke" ||
        targetId ===
          "topStroke"
          ? "Stroke Color Changed"
          : targetId ===
              "canvasBackground"
            ? "Canvas Color Changed"
            : "Fill Color Changed"
    });
  } else {
    scheduleAutosave();
  }

  return true;
}

function updateColorFieldFromPointer(event) {
  const rect = colorField.getBoundingClientRect();
  pickerSaturation = clamp01(
    (event.clientX - rect.left) / rect.width
  );
  pickerValue = 1 - clamp01(
    (event.clientY - rect.top) / rect.height
  );
  refreshColorPickerUI();
  applyCustomColorLive(
    currentPickerHex(),
    false
  );
}

function updateHueFromPointer(event) {
  const rect = hueSlider.getBoundingClientRect();
  pickerHue = clamp01(
    (event.clientX - rect.left) / rect.width
  ) * 360;
  refreshColorPickerUI();
  applyCustomColorLive(
    currentPickerHex(),
    false
  );
}

if (
  customColorPicker &&
  colorField &&
  colorFieldHandle &&
  hueSlider &&
  hueHandle &&
  colorPreview &&
  colorHexInput &&
  colorRedInput &&
  colorGreenInput &&
  colorBlueInput &&
  closeColorPickerButton
) {
  document.querySelectorAll("[data-color-target]").forEach(trigger => {
    trigger.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      openCustomColorPicker(
        trigger.dataset.colorTarget,
        trigger
      );
    });
  });

  colorField.addEventListener("pointerdown", event => {
  colorField.setPointerCapture(event.pointerId);
  updateColorFieldFromPointer(event);
});

colorField.addEventListener("pointermove", event => {
  if (!colorField.hasPointerCapture(event.pointerId)) return;
  updateColorFieldFromPointer(event);
});

hueSlider.addEventListener("pointerdown", event => {
  hueSlider.setPointerCapture(event.pointerId);
  updateHueFromPointer(event);
});

hueSlider.addEventListener("pointermove", event => {
  if (!hueSlider.hasPointerCapture(event.pointerId)) return;
  updateHueFromPointer(event);
});

colorHexInput.addEventListener("input", () => {
  if (setPickerFromHex(colorHexInput.value)) {
    applyCustomColorLive(colorHexInput.value);
  }
});

colorHexInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    applyCustomColorLive(colorHexInput.value, true);
    closeCustomColorPicker();
  }

  if (event.key === "Escape") {
    event.preventDefault();
    closeCustomColorPicker();
  }
});

pickerRgbInputs().forEach(
  input => {
    input.addEventListener(
      "input",
      () => {
        /*
         * Keep fields usable while typing. A blank channel temporarily acts
         * as zero; blur/commit normalizes it to the final integer value.
         */
        applyRgbInputsToPicker(
          false
        );
      }
    );

    input.addEventListener(
      "change",
      () => {
        input.value =
          String(
            clampRgbChannel(
              input.value
            )
          );

        applyRgbInputsToPicker(
          true
        );
      }
    );

    input.addEventListener(
      "keydown",
      event => {
        if (
          event.key ===
          "Enter"
        ) {
          event.preventDefault();

          input.value =
            String(
              clampRgbChannel(
                input.value
              )
            );

          applyRgbInputsToPicker(
            true
          );

          closeCustomColorPicker();
        }

        if (
          event.key ===
          "Escape"
        ) {
          event.preventDefault();
          closeCustomColorPicker();
        }
      }
    );
  }
);

document.querySelectorAll("[data-preset-color]").forEach(button => {
  button.addEventListener("click", () => {
    setPickerFromHex(button.dataset.presetColor);
    applyCustomColorLive(button.dataset.presetColor, true);
  });
});



if (addCustomSwatchButton) {
  addCustomSwatchButton.addEventListener(
    "click",
    event => {
      event.preventDefault();
      event.stopPropagation();
      addCurrentColorAsSwatch();
    }
  );
}

if (clearCustomSwatchesButton) {
  clearCustomSwatchesButton.addEventListener(
    "click",
    event => {
      event.preventDefault();
      event.stopPropagation();
      customColorSwatchValues = [];
      saveCustomColorSwatches();
      renderCustomColorSwatches();
    }
  );
}

if (colorEyedropperButton) {
  colorEyedropperButton.addEventListener(
    "click",
    event => {
      event.preventDefault();
      event.stopPropagation();

      if (colorEyedropperActive) {
        stopColorEyedropper();
      } else {
        startColorEyedropper();
      }
    }
  );
}

loadCustomColorSwatches();

closeColorPickerButton?.addEventListener("click", () => {
  applyCustomColorLive(currentPickerHex(), true);
  closeCustomColorPicker();
});

document.addEventListener("pointerdown", event => {
  if (customColorPicker.classList.contains("hidden")) return;

  if (colorEyedropperActive) {
    if (customColorPicker.contains(event.target)) {
      return;
    }

    /*
     * Capture the intended paint target and artwork BEFORE raster sampling.
     * Image sampling is asynchronous, so relying on activeColorTarget or the
     * live selection after the promise resolves can miss the original shape.
     */
    const eyedropperTargetId =
      activeColorTarget?.id ||
      null;

    const eyedropperSelection =
      (
        selectedItems?.length
          ? [...selectedItems]
          : selected
            ? [selected]
            : []
      )
        .filter(
          element =>
            element?.isConnected
        );

    const eyedropperPrimarySelection =
      selected &&
      selected.isConnected
        ? selected
        : eyedropperSelection[
            eyedropperSelection.length - 1
          ] ||
          null;

    /*
     * Sampling must never become a selection gesture. Keep the exact selection
     * alive while clicking elsewhere on the canvas/image.
     */
    const restoreEyedropperSelection =
      () => {
        const stillConnected =
          eyedropperSelection.filter(
            element =>
              element?.isConnected
          );

        if (
          stillConnected.length
        ) {
          setSelection(
            stillConnected,
            eyedropperPrimarySelection &&
            eyedropperPrimarySelection.isConnected
              ? eyedropperPrimarySelection
              : stillConnected[
                  stillConnected.length - 1
                ]
          );
        }
      };

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    restoreEyedropperSelection();

    sampleColorAtPointAsync(
      event.clientX,
      event.clientY
    )
      .then(
        sampled => {
          if (!sampled) {
            return;
          }

          const paintKind =
            (
              eyedropperTargetId ===
                "stroke" ||
              eyedropperTargetId ===
                "topStroke"
            )
              ? "stroke"
              : (
                  eyedropperTargetId ===
                    "fill" ||
                  eyedropperTargetId ===
                    "topFill"
                )
                ? "fill"
                : null;

          if (
            paintKind &&
            eyedropperSelection.length
          ) {
            restoreEyedropperSelection();

            eyedropperSelection.forEach(
              element => {
                element.setAttribute(
                  paintKind,
                  sampled.transparent
                    ? "none"
                    : sampled.color
                );

                if (
                  element.tagName ===
                    "path"
                ) {
                  updatePathD(
                    element
                  );
                }
              }
            );

            if (
              !sampled.transparent &&
              sampled.color
            ) {
              setPickerFromHex(
                sampled.color
              );

              if (
                paintKind ===
                  "fill"
              ) {
                fill.value =
                  sampled.color;

                topFill.value =
                  sampled.color;

                syncMatchingColorInputs(
                  fill
                );
              } else {
                stroke.value =
                  sampled.color;

                topStroke.value =
                  sampled.color;

                syncMatchingColorInputs(
                  stroke
                );
              }
            }

            updatePropertyControls();
            renderLayers();
            drawSelection();
            scheduleAutosave();

            recordHistory({
              label:
                sampled.transparent
                  ? (
                      paintKind ===
                        "fill"
                        ? "Eyedropper Transparent Fill"
                        : "Eyedropper Transparent Stroke"
                    )
                  : (
                      paintKind ===
                        "fill"
                        ? "Eyedropper Fill"
                        : "Eyedropper Stroke"
                    )
            });
          } else if (
            sampled.transparent
          ) {
            applyTransparentColorTarget();
          } else if (
            sampled.color
          ) {
            setPickerFromHex(
              sampled.color
            );

            applyCustomColorLive(
              sampled.color,
              true
            );
          }
        }
      )
      .finally(
        () => {
          restoreEyedropperSelection();
          stopColorEyedropper();
          drawSelection();
        }
      );

    return;
  }

  if (
    customColorPicker.contains(event.target) ||
    event.target.closest("[data-color-target]")
  ) {
    return;
  }

  applyCustomColorLive(currentPickerHex(), true);
  closeCustomColorPicker();
},
  true
);

  window.addEventListener("resize", () => {
  if (!customColorPicker.classList.contains("hidden")) {
    applyCustomColorLive(currentPickerHex(), true);
  }
  closeCustomColorPicker();
});
} else {
  console.warn("Custom color picker could not initialize because required UI elements are missing.");
}


document.addEventListener(
  "keydown",
  event => {
    if (
      event.key === "Escape" &&
      colorEyedropperActive
    ) {
      event.preventDefault();
      event.stopPropagation();
      stopColorEyedropper();
    }
  },
  true
);



if (gridSpacingInput) {
  gridSpacingInput.value = String(GRID_SIZE);
  gridSpacingInput.addEventListener("click", event => event.stopPropagation());
  gridSpacingInput.addEventListener("pointerdown", event => event.stopPropagation());
  gridSpacingInput.addEventListener("keydown", event => event.stopPropagation());
  gridSpacingInput.addEventListener("change", () => setGridSpacing(gridSpacingInput.value));
  gridSpacingInput.addEventListener("input", () => {
    const value = Number(gridSpacingInput.value);
    if (Number.isFinite(value) && value >= 1) setGridSpacing(value);
  });
}

const gridSettingRow = document.querySelector(".menu-grid-setting-row");
if (gridSettingRow) {
  gridSettingRow.addEventListener("click", event => event.stopPropagation());
  gridSettingRow.addEventListener("pointerdown", event => event.stopPropagation());
}

renderGridOverlay();
updateSnapMenuChecks();

