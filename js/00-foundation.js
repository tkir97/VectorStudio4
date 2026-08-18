/* Vector Studio modular baseline — source lines 1-437 from consolidated app.js.
   Classic-script module: shares the browser global lexical scope with ordered sibling modules. */


const splitEmbeddedMode =
  new URLSearchParams(
    window.location.search
  ).get("splitEmbedded") ===
    "1";

let splitEmbeddedDocumentId =
  null;

if (splitEmbeddedMode) {
  document.documentElement.classList.add(
    "split-embedded"
  );
}

const SVG_NS = "http://www.w3.org/2000/svg";
const DEFAULT_SHAPE_STROKE = "#8b5cf6";

const svg = document.querySelector("#canvas");
const art = document.querySelector("#art");
const fillSeamUnderlay = document.querySelector("#fillSeamUnderlay");
const artboardSurface = document.querySelector("#artboardSurface");
const selectionOverlay = document.querySelector("#selectionOverlay");
const perspectiveOverlay = document.querySelector("#perspectiveOverlay");
const perspective2Toggle = document.querySelector("#perspective2Toggle");
const perspectivePlaneSelector = document.querySelector("#perspectivePlaneSelector");
const selectionQuickMenu = document.querySelector("#selectionQuickMenu");
const canvasContextMenu = document.querySelector("#canvasContextMenu");
const canvasTabContextMenu = document.querySelector("#canvasTabContextMenu");
const tools = [...document.querySelectorAll(".tool[data-tool]")];

const fill = document.querySelector("#fill");
const stroke = document.querySelector("#stroke");
const strokeWidth = document.querySelector("#strokeWidth");
const fillOpacity = document.querySelector("#fillOpacity");
const fillOpacityNumber = document.querySelector("#fillOpacityNumber");
const strokeOpacity = document.querySelector("#strokeOpacity");
const strokeOpacityNumber = document.querySelector("#strokeOpacityNumber");
const strokeWidthNumber = document.querySelector("#strokeWidthNumber");
const topFill = document.querySelector("#topFill");
const topStroke = document.querySelector("#topStroke");
const topStrokeWidth = document.querySelector("#topStrokeWidth");
const strokeValue = document.querySelector("#strokeValue");
const fillOpacityValue = document.querySelector("#fillOpacityValue");
const strokeOpacityValue = document.querySelector("#strokeOpacityValue");
const strokeCap = document.querySelector("#strokeCap");
const strokeJoin = document.querySelector("#strokeJoin");
const strokeAlignment = document.querySelector("#strokeAlignment");
const strokeMiterLimit = document.querySelector("#strokeMiterLimit");
const strokeProfile = document.querySelector("#strokeProfile");
const strokeDash = document.querySelector("#strokeDash");
const strokeDashOffset = document.querySelector("#strokeDashOffset");
const strokeDashOffsetValue = document.querySelector("#strokeDashOffsetValue");
const fillType = document.querySelector("#fillType");
const gradientEditor = document.querySelector("#gradientEditor");
const gradientPreview = document.querySelector("#gradientPreview");
const gradientStart = document.querySelector("#gradientStart");
const gradientEnd = document.querySelector("#gradientEnd");
const gradientStartOffset = document.querySelector("#gradientStartOffset");
const gradientEndOffset = document.querySelector("#gradientEndOffset");
const gradientStartOffsetValue = document.querySelector("#gradientStartOffsetValue");
const gradientEndOffsetValue = document.querySelector("#gradientEndOffsetValue");
const gradientAngle = document.querySelector("#gradientAngle");
const gradientAngleValue = document.querySelector("#gradientAngleValue");
const gradientCenterX = document.querySelector("#gradientCenterX");
const gradientCenterY = document.querySelector("#gradientCenterY");
const gradientRadius = document.querySelector("#gradientRadius");
const gradientCenterXValue = document.querySelector("#gradientCenterXValue");
const gradientCenterYValue = document.querySelector("#gradientCenterYValue");
const gradientRadiusValue = document.querySelector("#gradientRadiusValue");
const linearGradientControls = document.querySelector("#linearGradientControls");
const radialGradientControls = document.querySelector("#radialGradientControls");
const patternEditor = document.querySelector("#patternEditor");
const patternSwatch = document.querySelector("#patternSwatch");
const patternPreview = document.querySelector("#patternPreview");
const createPatternFromSelectionButton = document.querySelector("#createPatternFromSelection");
const patternScale = document.querySelector("#patternScale");
const patternRotation = document.querySelector("#patternRotation");
const patternSpacingX = document.querySelector("#patternSpacingX");
const patternSpacingY = document.querySelector("#patternSpacingY");
const patternScaleValue = document.querySelector("#patternScaleValue");
const patternRotationValue = document.querySelector("#patternRotationValue");
const patternSpacingXValue = document.querySelector("#patternSpacingXValue");
const patternSpacingYValue = document.querySelector("#patternSpacingYValue");
const paintDefs = document.querySelector("#paintDefs");

const canvasWidthInput = document.querySelector("#canvasWidth");
const canvasHeightInput = document.querySelector("#canvasHeight");
const preset = document.querySelector("#preset");
const canvasStatus = document.querySelector("#canvasStatus");
const canvasTabs = document.querySelector("#canvasTabs");
const newCanvasTabButton = document.querySelector("#newCanvasTab");
const newDocumentModal = document.querySelector("#newDocumentModal");
const newDocumentName = document.querySelector("#newDocumentName");
const newDocumentPreset = document.querySelector("#newDocumentPreset");
const newDocumentWidth = document.querySelector("#newDocumentWidth");
const newDocumentHeight = document.querySelector("#newDocumentHeight");
const newDocumentBackground = document.querySelector("#newDocumentBackground");
const newDocumentTransparent = document.querySelector("#newDocumentTransparent");
const newDocumentThemeChoices = document.querySelector("#newDocumentThemeChoices");
const polygonSidesModal = document.querySelector("#polygonSidesModal");
const helpGuideModal = document.querySelector("#helpGuideModal");
const helpGuideSearch = document.querySelector("#helpGuideSearch");
const clearHelpGuideSearch = document.querySelector("#clearHelpGuideSearch");
const helpGuideNav = document.querySelector("#helpGuideNav");
const helpGuideContent = document.querySelector("#helpGuideContent");
const helpSearchSummary = document.querySelector("#helpSearchSummary");
const helpNoResults = document.querySelector("#helpNoResults");
const closeHelpGuideButton = document.querySelector("#closeHelpGuide");
const polygonSidesInput = document.querySelector("#polygonSidesInput");
const polygonSidesPreviewShape = document.querySelector("#polygonSidesPreviewShape");
const polygonSidesDecrease = document.querySelector("#polygonSidesDecrease");
const polygonSidesIncrease = document.querySelector("#polygonSidesIncrease");
const closePolygonSidesModalButton = document.querySelector("#closePolygonSidesModal");
const cancelPolygonSidesButton = document.querySelector("#cancelPolygonSides");
const confirmPolygonSidesButton = document.querySelector("#confirmPolygonSides");
const swapNewDocumentSize = document.querySelector("#swapNewDocumentSize");
const closeNewDocumentModalButton = document.querySelector("#closeNewDocumentModal");
const cancelNewDocumentButton = document.querySelector("#cancelNewDocument");
const createNewDocumentButton = document.querySelector("#createNewDocument");
const toolStatus = document.querySelector("#toolStatus");
const artboardWrap = document.querySelector("#artboardWrap");
const canvasBackground = document.querySelector("#canvasBackground");
const canvasTransparent = document.querySelector("#canvasTransparent");
const projectFileInput = document.querySelector("#projectFileInput");
const imageFileInput = document.querySelector("#imageFileInput");
const bitmapFlattenModal = document.querySelector("#bitmapFlattenModal");
const bitmapFlattenBefore = document.querySelector("#bitmapFlattenBefore");
const bitmapFlattenAfter = document.querySelector("#bitmapFlattenAfter");
const bitmapFlattenMode = document.querySelector("#bitmapFlattenMode");
const bitmapFlattenPaint = document.querySelector("#bitmapFlattenPaint");
const bitmapFlattenColors = document.querySelector("#bitmapFlattenColors");
const bitmapFlattenColorsValue = document.querySelector("#bitmapFlattenColorsValue");
const bitmapFlattenDetail = document.querySelector("#bitmapFlattenDetail");
const bitmapFlattenDetailValue = document.querySelector("#bitmapFlattenDetailValue");
const bitmapFlattenNoise = document.querySelector("#bitmapFlattenNoise");
const bitmapFlattenNoiseValue = document.querySelector("#bitmapFlattenNoiseValue");
const bitmapFlattenMinArea = document.querySelector("#bitmapFlattenMinArea");
const bitmapFlattenMergeArea = document.querySelector("#bitmapFlattenMergeArea");
const bitmapFlattenHybridSensitivity = document.querySelector("#bitmapFlattenHybridSensitivity");
const bitmapFlattenHybridSensitivityValue = document.querySelector("#bitmapFlattenHybridSensitivityValue");
const bitmapFlattenHybridSensitivityRow = document.querySelector("#bitmapFlattenHybridSensitivityRow");
const bitmapFlattenAxisSnap = document.querySelector("#bitmapFlattenAxisSnap");
const bitmapFlattenAxisSnapSensitivity = document.querySelector("#bitmapFlattenAxisSnapSensitivity");
const bitmapFlattenAxisSnapSensitivityValue = document.querySelector("#bitmapFlattenAxisSnapSensitivityValue");
const bitmapFlattenAxisSnapSensitivityRow = document.querySelector("#bitmapFlattenAxisSnapSensitivityRow");
const bitmapFlattenSimplify = document.querySelector("#bitmapFlattenSimplify");
const bitmapFlattenSimplifyValue = document.querySelector("#bitmapFlattenSimplifyValue");
const bitmapFlattenIslandCount = document.querySelector("#bitmapFlattenIslandCount");
const bitmapFlattenSmoothing = document.querySelector("#bitmapFlattenSmoothing");
const bitmapFlattenSmoothingValue = document.querySelector("#bitmapFlattenSmoothingValue");
const bitmapFlattenStraightening = document.querySelector("#bitmapFlattenStraightening");
const bitmapFlattenStraighteningValue = document.querySelector("#bitmapFlattenStraighteningValue");
const bitmapFlattenProgress = document.querySelector("#bitmapFlattenProgress");
const bitmapFlattenProgressBar = document.querySelector("#bitmapFlattenProgressBar");
const bitmapFlattenStatus = document.querySelector("#bitmapFlattenStatus");
const closeBitmapFlattenButton = document.querySelector("#closeBitmapFlatten");
const cancelBitmapFlattenButton = document.querySelector("#cancelBitmapFlatten");
const applyBitmapFlattenButton = document.querySelector("#applyBitmapFlatten");
const svgFileInput = document.querySelector("#svgFileInput");
const advancedTransformToggle = document.querySelector("#advancedTransformToggle");
const advancedTransformPanel = document.querySelector("#advancedTransformPanel");
const closeAdvancedTransformButton = document.querySelector("#closeAdvancedTransform");
const radialRepeatPanel = document.querySelector("#radialRepeatPanel");
const repeatGridPanel = document.querySelector("#repeatGridPanel");
const geometryConstraintsPanel = document.querySelector("#geometryConstraintsPanel");
const geometryConstraintDistanceInput = document.querySelector("#geometryConstraintDistance");
const geometryConstraintAngleInput = document.querySelector("#geometryConstraintAngle");
const setDistanceConstraintButton = document.querySelector("#setDistanceConstraint");
const setAngleConstraintButton = document.querySelector("#setAngleConstraint");
const clearGeometryConstraintsButton = document.querySelector("#clearGeometryConstraints");
const geometryConstraintList = document.querySelector("#geometryConstraintList");
const closeGeometryConstraintsButton = document.querySelector("#closeGeometryConstraints");
const captureCrossConstraintAButton = document.querySelector("#captureCrossConstraintA");
const captureCrossConstraintBButton = document.querySelector("#captureCrossConstraintB");
const crossConstraintAReadout = document.querySelector("#crossConstraintAReadout");
const crossConstraintBReadout = document.querySelector("#crossConstraintBReadout");
const crossConstraintDistanceInput = document.querySelector("#crossConstraintDistance");
const setCrossPathDistanceConstraintButton = document.querySelector("#setCrossPathDistanceConstraint");
const clearCrossConstraintEndpointsButton = document.querySelector("#clearCrossConstraintEndpoints");
const startConstraintMakerButton = document.querySelector("#startConstraintMaker");
const lockCurrentGeometryConstraintButton = document.querySelector("#lockCurrentGeometryConstraint");
const pinSelectedVerticesConstraintButton = document.querySelector("#pinSelectedVerticesConstraint");
const parallelEdgesConstraintButton = document.querySelector("#parallelEdgesConstraint");
const perpendicularEdgesConstraintButton = document.querySelector("#perpendicularEdgesConstraint");
const constraintMakerStatus = document.querySelector("#constraintMakerStatus");
const constraintMakerTypeButtons = [...document.querySelectorAll("[data-constraint-maker-type]")];
const constraintValuePopup = document.querySelector("#constraintValuePopup");
const constraintValuePopupInput = document.querySelector("#constraintValuePopupInput");
const artBrushPanel = document.querySelector("#artBrushPanel");
const createArtBrushPresetButton = document.querySelector("#createArtBrushPreset");
const artBrushPresetSelect = document.querySelector("#artBrushPresetSelect");
const artBrushSpacing = document.querySelector("#artBrushSpacing");
const artBrushScale = document.querySelector("#artBrushScale");
const artBrushOffset = document.querySelector("#artBrushOffset");
const artBrushRotation = document.querySelector("#artBrushRotation");
const applyArtBrushButton = document.querySelector("#applyArtBrush");
const expandArtBrushButton = document.querySelector("#expandArtBrush");
const closeArtBrushButton = document.querySelector("#closeArtBrush");
const threeDPanel = document.querySelector("#threeDPanel");
const threeDDepth = document.querySelector("#threeDDepth");
const threeDDepthControl = document.querySelector("#threeDDepthControl");
const threeDRevolveAngleControl = document.querySelector("#threeDRevolveAngleControl");
const threeDRevolveSegmentsControl = document.querySelector("#threeDRevolveSegmentsControl");
const threeDRevolveAxisControl = document.querySelector("#threeDRevolveAxisControl");
const threeDRevolveAngle = document.querySelector("#threeDRevolveAngle");
const threeDRevolveSegments = document.querySelector("#threeDRevolveSegments");
const threeDRevolveAxis = document.querySelector("#threeDRevolveAxis");
const threeDWholeFill = document.querySelector("#threeDWholeFill");
const threeDWholeStrokeMode = document.querySelector("#threeDWholeStrokeMode");
const threeDWholeStroke = document.querySelector("#threeDWholeStroke");
const threeDWholeStrokeWidth = document.querySelector("#threeDWholeStrokeWidth");
const threeDShadeMode = document.querySelector("#threeDShadeMode");
const threeDWholeStrokeColorControl = document.querySelector("#threeDWholeStrokeColorControl");
const threeDWholeStrokeWidthControl = document.querySelector("#threeDWholeStrokeWidthControl");
const threeDPanelTitle = document.querySelector("#threeDPanelTitle");
const threeDPanelSubtitle = document.querySelector("#threeDPanelSubtitle");
const threeDPanelHint = document.querySelector("#threeDPanelHint");
const threeDRotateX = document.querySelector("#threeDRotateX");
const threeDRotateY = document.querySelector("#threeDRotateY");
const threeDRotateZ = document.querySelector("#threeDRotateZ");
const threeDMoveX = document.querySelector("#threeDMoveX");
const threeDMoveY = document.querySelector("#threeDMoveY");
const threeDMoveZ = document.querySelector("#threeDMoveZ");
const doneThreeDPanelButton = document.querySelector("#doneThreeDPanel");
const expandThreeDPanelButton = document.querySelector("#expandThreeDPanel");
const closeThreeDPanelButton = document.querySelector("#closeThreeDPanel");
const pathRepeatPanel = document.querySelector("#pathRepeatPanel");
const pathRepeatCount = document.querySelector("#pathRepeatCount");
const pathRepeatStart = document.querySelector("#pathRepeatStart");
const pathRepeatEnd = document.querySelector("#pathRepeatEnd");
const pathRepeatOrientation = document.querySelector("#pathRepeatOrientation");
const pathRepeatRotation = document.querySelector("#pathRepeatRotation");
const pathRepeatRandomRotation = document.querySelector("#pathRepeatRandomRotation");
const pathRepeatScale = document.querySelector("#pathRepeatScale");
const editPathRepeatGuideButton = document.querySelector("#editPathRepeatGuide");
const editPathRepeatShapeButton = document.querySelector("#editPathRepeatShape");
const donePathRepeatPanelButton = document.querySelector("#donePathRepeatPanel");
const expandPathRepeatPanelButton = document.querySelector("#expandPathRepeatPanel");
const closePathRepeatPanelButton = document.querySelector("#closePathRepeatPanel");
const doneRadialRepeatPanelButton = document.querySelector("#doneRadialRepeatPanel");
const expandRadialRepeatPanelButton = document.querySelector("#expandRadialRepeatPanel");
const closeRadialRepeatPanelButton = document.querySelector("#closeRadialRepeatPanel");
const expandRepeatGridPanelButton = document.querySelector("#expandRepeatGridPanel");
const closeRepeatGridPanelButton = document.querySelector("#closeRepeatGridPanel");
const radialRepeatCount = document.querySelector("#radialRepeatCount");
const radialRepeatRadius = document.querySelector("#radialRepeatRadius");
const radialRepeatStartAngle = document.querySelector("#radialRepeatStartAngle");
const radialRepeatSweepAngle = document.querySelector("#radialRepeatSweepAngle");
const radialRepeatOrientation = document.querySelector("#radialRepeatOrientation");
const radialRepeatRotation = document.querySelector("#radialRepeatRotation");
const radialRepeatScale = document.querySelector("#radialRepeatScale");
const repeatGridColumns = document.querySelector("#repeatGridColumns");
const repeatGridRows = document.querySelector("#repeatGridRows");
const repeatGridSpacingX = document.querySelector("#repeatGridSpacingX");
const repeatGridSpacingY = document.querySelector("#repeatGridSpacingY");
const repeatGridRotation = document.querySelector("#repeatGridRotation");
const repeatGridScale = document.querySelector("#repeatGridScale");
const saveProjectModal = document.querySelector("#saveProjectModal");
const saveProjectFilename = document.querySelector("#saveProjectFilename");
const confirmSaveProject = document.querySelector("#confirmSaveProject");
const cancelSaveProject = document.querySelector("#cancelSaveProject");
const closeSaveProjectModal = document.querySelector("#closeSaveProjectModal");
const historySteps = document.querySelector("#historySteps");
const historyUndoButton = document.querySelector("#historyUndoButton");
const historyRedoButton = document.querySelector("#historyRedoButton");
const historyPositionLabel = document.querySelector("#historyPositionLabel");
const historyView = document.querySelector("#historyView");
const offsetPathModal = document.querySelector("#offsetPathModal");
const offsetPathAmount = document.querySelector("#offsetPathAmount");
const offsetPathJoin = document.querySelector("#offsetPathJoin");
const offsetPathMessage = document.querySelector("#offsetPathMessage");
const closeOffsetPathModalButton = document.querySelector("#closeOffsetPathModal");
const cancelOffsetPathButton = document.querySelector("#cancelOffsetPath");
const confirmOffsetPathButton = document.querySelector("#confirmOffsetPath");
const offsetPathDecreaseButton = document.querySelector("#offsetPathDecrease");
const offsetPathIncreaseButton = document.querySelector("#offsetPathIncrease");
const offsetPathDirection = document.querySelector("#offsetPathDirection");
const freeDrawSmoothing = document.querySelector("#freeDrawSmoothing");
const freeDrawSmoothingValue = document.querySelector("#freeDrawSmoothingValue");
const freeDrawShapeDetection = document.querySelector("#freeDrawShapeDetection");
const layersPanel = document.querySelector("#layers");
const objectCount = document.querySelector("#objectCount");
const layersSearchInput = document.querySelector("#layersSearchInput");
const layersSearchClear = document.querySelector("#layersSearchClear");
const layersSearchEmpty = document.querySelector("#layersSearchEmpty");
const transformSection = document.querySelector("#transformSection");
const transformEmptyState = document.querySelector("#transformEmptyState");
const transformControls = document.querySelector("#transformControls");
const transformX = document.querySelector("#transformX");
const transformY = document.querySelector("#transformY");
const transformWidth = document.querySelector("#transformWidth");
const transformHeight = document.querySelector("#transformHeight");
const transformRotation = document.querySelector("#transformRotation");
const transformScaleX = document.querySelector("#transformScaleX");
const transformScaleY = document.querySelector("#transformScaleY");
const pathfinderHint = document.querySelector("#pathfinderHint");
const pathEditingHint = document.querySelector("#pathEditingHint");
const transformLockAspect = document.querySelector("#transformLockAspect");
const textEditorOverlay = document.querySelector("#textEditorOverlay");
const textPropertiesEmpty = document.querySelector("#textPropertiesEmpty");
const textPropertiesControls = document.querySelector("#textPropertiesControls");
const textFontFamily = document.querySelector("#textFontFamily");
const textFontWeight = document.querySelector("#textFontWeight");
const textFontSize = document.querySelector("#textFontSize");
const textLineHeight = document.querySelector("#textLineHeight");
const textLetterSpacing = document.querySelector("#textLetterSpacing");
const textAlign = document.querySelector("#textAlign");
const editTextContentButton = document.querySelector("#editTextContent");
const convertTextToOutlinesButton = document.querySelector("#convertTextToOutlines");
const textOutlineHint = document.querySelector("#textOutlineHint");
const googleFontInput = document.querySelector("#googleFontInput");
const addGoogleFontButton = document.querySelector("#addGoogleFont");
const googleFontMessage = document.querySelector("#googleFontMessage");

let activeTool = "select";

let perspective2State = {
  horizonY: 220,
  leftVP: { x: -260, y: 220 },
  rightVP: { x: 1220, y: 220 },
  visible: false,
  activeSide: "right"
};

let perspective2Drag = null;
let perspective2Draw = null;
let selected = null;
let selectedItems = [];
let multiSelectionFrame = null;
let marquee = null;
let marqueeStart = null;
let lassoPoints = null;
let lassoBaseSelection = [];
let lassoAdditive = false;
let pendingShape = null;
let startPoint = null;
let pendingNgonCenter = null;
let currentNgonSides = 5;
let dragging = false;
let dragOffset = null;
let editDrag = null;
let selectedAnchorIndex = null;
let selectedAnchorIndices = new Set();
let selectedVertexRefs = [];
let vertexMarquee = null;
let zoom = 1;
let zoomPanX = 0;
let zoomPanY = 0;
let selectionPanDrag = null;
let objectCounter = 0;
let canvasWidth = 960;
let canvasHeight = 640;
let canvasBackgroundColor = "#ffffff";

const PASTEBOARD_SCALE = 5;
const PASTEBOARD_MARGIN_UNITS = 2;

function updatePasteboardViewport(width, height) {
  const viewX =
    -width * PASTEBOARD_MARGIN_UNITS;
  const viewY =
    -height * PASTEBOARD_MARGIN_UNITS;
  const viewWidth =
    width * PASTEBOARD_SCALE;
  const viewHeight =
    height * PASTEBOARD_SCALE;

  svg.setAttribute(
    "viewBox",
    `${viewX} ${viewY} ${viewWidth} ${viewHeight}`
  );
  svg.setAttribute("width", viewWidth);
  svg.setAttribute("height", viewHeight);

  if (artboardSurface) {
    artboardSurface.setAttribute("x", 0);
    artboardSurface.setAttribute("y", 0);
    artboardSurface.setAttribute(
      "width",
      width
    );
    artboardSurface.setAttribute(
      "height",
      height
    );
  }
}
let canvasIsTransparent = false;
let applicationTheme = "dark";
let currentProjectName = "untitled.vgs";
let canvasDocuments = [];
let closedCanvasDocuments = [];
let activeCanvasDocumentId = null;
let canvasDocumentCounter = 0;
let switchingCanvasDocument = false;

/* Local autosave */
const AUTOSAVE_STORAGE_KEY =
  "vectorStudio.autosaveSession.v1";
const AUTOSAVE_SESSION_KEY =
  "vectorStudio.autosaveSession.refresh.v1";
const AUTOSAVE_WINDOW_NAME_PREFIX =
  "vectorStudio.autosaveSession.v1:";
const AUTOSAVE_HISTORY_LIMIT = 30;
let autosaveTimer = null;
let autosaveRestoring = false;

/* Internal vector clipboard */
let vectorClipboard = [];
let vectorClipboardPasteCount = 0;

/* Raster image import/crop */
let imageCropTarget = null;
let imageCropDraft = null;
let imageCropOriginal = null;
let imageCropDrag = null;
let radialRepeatPanelDrag = null;
let radialRepeatPanelManualPosition = null;
let radialRepeatCenterPick = null;
let radialRepeatCenterDrag = null;
let radialRepeatPanelRequested = false;
let repeatGridPanelDrag = null;
let repeatGridPanelManualPosition = null;
let pathRepeatPanelDrag = null;
let pathRepeatPanelManualPosition = null;
let pathRepeatPanelRequested = false;
let geometryConstraintsPanelRequested = false;
let geometryConstraintsPanelDrag = null;
let geometryConstraintsPanelManualPosition = null;
let geometryConstraintCounter = 0;
let documentGeometryConstraints = [];
let crossConstraintEndpointA = null;
let crossConstraintEndpointB = null;
let pathConstraintIdCounter = 0;
let constraintMakerActive = false;
let constraintToolPersistentActive = false;
let constraintMakerType = "auto";
let constraintMakerStage = "a";
let constraintMakerHover = null;
let constraintMakerPendingPlacement = null;
let constraintMakerSelectedEdges = [];
let constraintMakerAnglePlacement = null;
let constraintMakerAngleHoverEdge = null;
let constraintMakerAutoFirstEdge = null;
let constraintMakerSelection = null;
let constraintMakerPlacement = null;
let constraintMakerPlacementMode = null;
let constraintEdgeRelationMode = null;
let constraintEdgeRelationFirst = null;

let artBrushPanelRequested = false;
let artBrushPresets = [];
let artBrushPresetCounter = 0;
let artBrushPanelDrag = null;
let artBrushPanelManualPosition = null;

let threeDPanelRequested = false;
let threeDPanelDrag = null;
let threeDPanelManualPosition = null;
let threeDOrbitDrag = null;
let threeDSelectedFace = null;
let pathRepeatGuideEdit = false;
let pathRepeatGuideDrag = null;
let pathRepeatShapeEdit = null;
let pathRepeatShapeEditSyncing = false;
let advancedTransformPanelDrag = null;
let advancedTransformPanelManualPosition = null;

/* Selection quick-menu dragging */
let selectionQuickMenuDrag = null;
let selectionQuickMenuManualPosition = null;

/* Free Draw / Pencil state */
let freeDrawPointerId = null;
let freeDrawPoints = [];
let freeDrawPreview = null;
const FREE_DRAW_SMOOTHING_KEY =
  "vectorStudio.freeDrawSmoothing";
const FREE_DRAW_SHAPE_DETECTION_KEY =
  "vectorStudio.freeDrawShapeDetection";

/* Pen state */
let activePath = null;
let pathAnchors = [];
let penPointerDown = false;
let penDownPoint = null;
let penPendingAnchor = null;
let penContinuationCandidate = null;

