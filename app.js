// =======================================
// MÄTVERKTYG – STENSKIVOR.SE
// app.js
// =======================================

document.addEventListener("DOMContentLoaded", init);

function init() {
  // ---------- KONFIG ----------
  const SCALE = 5;          // 1 mm = 1/5 px
  const SNAP_MM = 10;       // snappning i verkliga mm
  const GRID = SNAP_MM / SCALE;
  const RADIUS = 22;        // rundningsradie i px (visuell indikator)
  const BRAND = "#18b68c";

  const MIN_LENGTH_MM = 50;
  const MAX_LENGTH_MM = 10000;
  const MIN_DEPTH_MM = 10;
  const MAX_DEPTH_MM = 2000;

  const WALL_MIN_LENGTH_MM = 100;
  const WALL_MAX_LENGTH_MM = 12000;

  const EDGE_PROFILES = [
    "Rakfasad",
    "Halvpostad",
    "Halvrundad",
    "Helrundad",
    "Antique",
    "Kantlimning 45"
  ];

  const MATERIALS = [
    "Marmor",
    "Granit",
    "Kvarts (Silestone)",
    "Komposit",
    "Keramik (Dekton)",
    "Terrazzo"
  ];

  const MAX_UNDO = 50;

  // ---------- STAGE ----------
  const canvasEl = document.getElementById("canvas-container");

  const stage = new Konva.Stage({
    container: "canvas-container",
    width: canvasEl.clientWidth,
    height: canvasEl.clientHeight
  });

  const BG_SIZE = 40000; // stor nog för att täcka ritytan oavsett zoom/pan
  const gridLayer = new Konva.Layer();
  const background = new Konva.Rect({
    x: -BG_SIZE / 2,
    y: -BG_SIZE / 2,
    width: BG_SIZE,
    height: BG_SIZE,
    fill: "#eef3f8",
    listening: true
  });
  gridLayer.add(background);
  stage.add(gridLayer);

  const layer = new Konva.Layer();
  stage.add(layer);

  const selectionRect = new Konva.Rect({
    fill: "rgba(24,182,140,0.15)",
    stroke: BRAND,
    strokeWidth: 1,
    visible: false,
    listening: false
  });
  layer.add(selectionRect);

  // ---------- STATE ----------
  let parts = [];
  let selected = null;
  let multiSelected = [];
  let selectionStart = null;
  let nextId = 1;
  let undoStack = [];
  let isUndoing = false;
  let hasFitOnce = false;
  let spacePanning = false;

  const project = {
    customerName: "",
    customerAddress: "",
    customerPhone: "",
    projectDate: new Date().toISOString().slice(0, 10),
    projectRef: ""
  };

  // ---------- HELPERS ----------
  function mmToPx(mm) { return mm / SCALE; }
  function pxToMm(px) { return Math.round((px * SCALE) / 10) * 10; }
  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

  function typeLabel(type) {
    switch (type) {
      case "countertop": return "Bänkskiva";
      case "splash": return "Stänkskydd";
      case "sink": return "Diskho (urtag)";
      case "hob": return "Häll (urtag)";
      case "faucet": return "Blandarhål (urtag)";
      case "outlet": return "Uttag (urtag)";
      default: return "Vägg";
    }
  }

  function isWallType(type) { return type === "wall"; }
  function isCutoutType(type) {
    return type === "sink" || type === "hob" || type === "faucet" || type === "outlet";
  }
  function isSlabType(type) { return type === "countertop" || type === "splash"; }

  function setCursor(c) { stage.container().style.cursor = c; }

  function defaultData(type) {
    let length = 2400, depth = 620;
    if (type === "wall") { length = 1200; depth = 100; }
    if (type === "sink") { length = 800; depth = 500; }
    if (type === "hob") { length = 560; depth = 490; }
    if (type === "faucet") { length = 40; depth = 40; }
    if (type === "outlet") { length = 80; depth = 80; }

    return {
      id: nextId++,
      type,
      length,
      depth,
      rotation: 0,
      material: isSlabType(type) ? MATERIALS[2] : null,
      edgeProfile: EDGE_PROFILES[0],
      edges: { top: false, bottom: false, left: false, right: false },
      corners: { tl: false, tr: false, bl: false, br: false },
      done: false
    };
  }

  function totalAreaM2() {
    return parts
      .filter((p) => isSlabType(p.type))
      .reduce((sum, p) => sum + (p.data.length * p.data.depth) / 1e6, 0);
  }

  // ---------- UNDO ----------
  function saveState() {
    if (isUndoing) return;
    const state = parts.map((p) => ({
      data: JSON.parse(JSON.stringify(p.data)),
      x: p.group.x(),
      y: p.group.y(),
      rotation: p.group.rotation()
    }));
    undoStack.push(state);
    if (undoStack.length > MAX_UNDO) undoStack.shift();
  }

  function undo() {
    if (undoStack.length === 0) return;
    isUndoing = true;

    const state = undoStack.pop();
    parts.forEach((p) => p.group.destroy());
    parts = [];

    state.forEach((o) => {
      const item = addPart(o.data.type, o.data);
      item.group.x(o.x);
      item.group.y(o.y);
      item.group.rotation(o.rotation);
    });

    selected = null;
    renderProperties(null);
    updateList();
    layer.draw();
    isUndoing = false;
  }

  // ---------- ZOOM / PAN ----------
  function zoomAt(newScaleRaw, focalPoint) {
    const oldScale = stage.scaleX();
    const newScale = clamp(newScaleRaw, 0.15, 5);
    const mousePointTo = {
      x: (focalPoint.x - stage.x()) / oldScale,
      y: (focalPoint.y - stage.y()) / oldScale
    };
    stage.scale({ x: newScale, y: newScale });
    stage.position({
      x: focalPoint.x - mousePointTo.x * newScale,
      y: focalPoint.y - mousePointTo.y * newScale
    });
    stage.batchDraw();
  }

  stage.on("wheel", (e) => {
    e.evt.preventDefault();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    const scaleBy = 1.05;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    zoomAt(newScale, pointer);
  });

  function fitCanvas() {
    if (parts.length === 0) return;

    const box = layer.getClientRect({ skipTransform: true });
    if (box.width === 0 || box.height === 0) return;

    const padding = 140;
    const scaleX = stage.width() / (box.width + padding);
    const scaleY = stage.height() / (box.height + padding);
    const scale = clamp(Math.min(scaleX, scaleY, 1.2), 0.15, 5);

    stage.scale({ x: scale, y: scale });
    stage.position({
      x: (stage.width() - box.width * scale) / 2 - box.x * scale,
      y: (stage.height() - box.height * scale) / 2 - box.y * scale
    });
    stage.batchDraw();
  }

  document.getElementById("zoomInBtn").onclick = () =>
    zoomAt(stage.scaleX() * 1.25, { x: stage.width() / 2, y: stage.height() / 2 });
  document.getElementById("zoomOutBtn").onclick = () =>
    zoomAt(stage.scaleX() / 1.25, { x: stage.width() / 2, y: stage.height() / 2 });
  document.getElementById("zoomFitBtn").onclick = fitCanvas;

  // Mellanslag för panorering
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" && !spacePanning) {
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      spacePanning = true;
      stage.draggable(true);
      setCursor("grab");
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "Space") {
      spacePanning = false;
      stage.draggable(false);
      setCursor("default");
    }
  });

  // ---------- CREATE PART ----------
  function addPart(type, savedData) {
    const data = savedData || defaultData(type);
    if (data.id === undefined || data.id === null) data.id = nextId++;
    if (data.id >= nextId) nextId = data.id + 1;

    const wall = isWallType(type);
    const cutout = isCutoutType(type);

    const w = mmToPx(data.length);
    const h = type === "splash" ? SPLASH_VISUAL_H : mmToPx(data.depth);

    const group = new Konva.Group({
      x: 220 + w / 2,
      y: 220 + h / 2,
      offsetX: w / 2,
      offsetY: h / 2,
      rotation: data.rotation || 0,
      draggable: true
    });

    const rect = new Konva.Rect({
      width: w,
      height: h,
      fill: wall ? "#64748b" : cutout ? "rgba(220,38,38,0.06)" : "#ffffff",
      stroke: wall ? "#1e293b" : cutout ? "#dc2626" : "#1e293b",
      strokeWidth: 2,
      dash: cutout ? [7, 5] : undefined,
      cornerRadius: 0
    });

    group.add(rect);

    let lengthText = null;
    let depthText = null;
    let cutoutLabel = null;

    if (!wall) {
      lengthText = new Konva.Text({ fontSize: 12, fill: "#475569", align: "center" });
      depthText = new Konva.Text({ fontSize: 12, fill: "#475569" });
      group.add(lengthText);
      group.add(depthText);
    }

    if (cutout) {
      cutoutLabel = new Konva.Text({
        text: { sink: "DISKHO", hob: "HÄLL", faucet: "BLANDARE", outlet: "UTTAG" }[type] || "",
        fontSize: 11,
        fontStyle: "bold",
        fill: "#dc2626",
        align: "center",
        width: w
      });
      group.add(cutoutLabel);
    }

    const item = { id: data.id, type, group, rect, lengthText, depthText, cutoutLabel, data, handles: null };
    parts.push(item);

    applyCorners(item);

    if (!wall) {
      updateMeasure(item);
      drawEdges(item);
    } else {
      item.handles = createWallHandles(item);
    }

    group.on("click tap", (e) => {
      e.cancelBubble = true;
      selectItem(item);
    });

    group.on("mouseenter", () => {
      if (item !== selected) rect.stroke(cutout ? "#dc2626" : "#64748b");
      setCursor("move");
      layer.batchDraw();
    });

    group.on("mouseleave", () => {
      if (item !== selected) rect.stroke(cutout ? "#dc2626" : wall ? "#1e293b" : "#1e293b");
      setCursor("default");
      layer.batchDraw();
    });

    group.on("dragstart", () => {
      saveState();
      if (!multiSelected.includes(item)) multiSelected = [item];
      multiSelected.forEach((p) => {
        p.dragStartX = p.group.x();
        p.dragStartY = p.group.y();
      });
    });

    group.on("dragmove", () => {
      if (multiSelected.length > 1 && multiSelected.includes(item)) {
        const dx = group.x() - item.dragStartX;
        const dy = group.y() - item.dragStartY;
        multiSelected.forEach((p) => {
          if (p === item) return;
          p.group.x(p.dragStartX + dx);
          p.group.y(p.dragStartY + dy);
        });
      }
      group.x(Math.round(group.x() / GRID) * GRID);
      group.y(Math.round(group.y() / GRID) * GRID);
      layer.batchDraw();
    });

    layer.add(group);

    if (!hasFitOnce && parts.length === 1) {
      hasFitOnce = true;
      fitCanvas();
    }

    layer.draw();
    updateList();
    updateSummary();

    return item;
  }

  // ---------- SELECT ----------
  stage.on("click tap", (e) => {
    if (e.target === stage || e.target === background) selectItem(null);
  });

  function selectItem(item) {
    selected = item;
    multiSelected = item ? [item] : [];

    parts.forEach((p) => {
      const active = p === item;
      const cutout = isCutoutType(p.type);
      p.rect.stroke(active ? BRAND : cutout ? "#dc2626" : "#1e293b");
      p.rect.strokeWidth(active ? 4 : 2);

      if (p.handles) {
        p.handles.left.visible(active);
        p.handles.right.visible(active);
        p.handles.left.listening(active);
        p.handles.right.listening(active);
      }
    });

    layer.draw();
    renderProperties(item);
    updateList();
  }

  // ---------- MEASUREMENTS ----------
  function updateMeasure(item) {
    if (item.type === "wall") return;
    const { rect, lengthText, depthText, cutoutLabel, data } = item;

    lengthText.text(`${data.length} mm`);
    lengthText.width(rect.width());
    lengthText.x(0);
    lengthText.y(-18);

    depthText.text(`${data.depth} mm`);
    depthText.x(rect.width() + 8);
    depthText.y(rect.height() / 2 - 6);

    if (cutoutLabel) {
      cutoutLabel.width(rect.width());
      cutoutLabel.x(0);
      cutoutLabel.y(rect.height() / 2 - 6);
    }
  }

  // ---------- RESIZE ----------
  function resizePart(item) {
    const { rect, group, data, type } = item;
    const w = mmToPx(data.length);
    const h = type === "splash" ? SPLASH_VISUAL_H : mmToPx(data.depth);

    rect.width(w);
    rect.height(h);
    group.offsetX(w / 2);
    group.offsetY(h / 2);

    applyCorners(item);

    if (type !== "wall") {
      updateMeasure(item);
      drawEdges(item);
    } else if (item.handles) {
      positionWallHandles(item);
    }

    layer.draw();
    updateList();
    updateSummary();
  }

  // ---------- CORNERS ----------
  function applyCorners(item) {
    if (item.type === "wall") return;
    const c = item.data.corners;
    item.rect.cornerRadius([
      c.tl ? RADIUS : 0,
      c.tr ? RADIUS : 0,
      c.br ? RADIUS : 0,
      c.bl ? RADIUS : 0
    ]);
  }

  // ---------- EDGES ----------
  function drawEdges(item) {
    if (isCutoutType(item.type)) return; // urtag har ingen kantprofilering i verktyget
    const { group, rect, data } = item;

    group.find(".edgeMarker").forEach((m) => m.destroy());

    function arrow(x, y, r) {
      group.add(
        new Konva.RegularPolygon({
          name: "edgeMarker",
          x, y,
          sides: 3,
          radius: 9,
          rotation: r,
          fill: BRAND,
          listening: false
        })
      );
    }

    if (data.edges.top) arrow(rect.width() / 2, 0, 0);
    if (data.edges.bottom) arrow(rect.width() / 2, rect.height(), 180);
    if (data.edges.left) arrow(0, rect.height() / 2, 270);
    if (data.edges.right) arrow(rect.width(), rect.height() / 2, 90);

    layer.draw();
  }

  // ---------- VÄGG: DRA UT I SIDORNA ----------
  function createWallHandles(item) {
    const group = item.group;
    const rect = item.rect;

    const style = {
      width: 10,
      height: 18,
      fill: BRAND,
      cornerRadius: 3,
      draggable: true,
      visible: false,
      listening: false,
      offsetX: 5,
      offsetY: 9
    };

    const left = new Konva.Rect(Object.assign({ x: 0, y: rect.height() / 2 }, style));
    const right = new Konva.Rect(Object.assign({ x: rect.width(), y: rect.height() / 2 }, style));

    group.add(left);
    group.add(right);

    right.on("dragmove", () => {
      right.y(rect.height() / 2);
      const min = mmToPx(WALL_MIN_LENGTH_MM);
      const max = mmToPx(WALL_MAX_LENGTH_MM);
      const nw = clamp(right.x(), min, max);
      rect.width(nw);
      right.x(nw);
      item.data.length = pxToMm(nw);
      layer.batchDraw();
    });

    right.on("dragend", () => {
      saveState();
      syncLengthInput(item);
      layer.draw();
    });

    left.on("dragmove", () => {
      left.y(rect.height() / 2);
      const oldWidth = rect.width();
      const newX = clamp(left.x(), -(mmToPx(WALL_MAX_LENGTH_MM) - oldWidth), oldWidth - mmToPx(WALL_MIN_LENGTH_MM));
      let newWidth = clamp(oldWidth - newX, mmToPx(WALL_MIN_LENGTH_MM), mmToPx(WALL_MAX_LENGTH_MM));

      const rot = (group.rotation() * Math.PI) / 180;
      group.x(group.x() + newX * Math.cos(rot));
      group.y(group.y() + newX * Math.sin(rot));

      rect.width(newWidth);
      left.x(0);
      right.x(newWidth);
      item.data.length = pxToMm(newWidth);
      layer.batchDraw();
    });

    left.on("dragend", () => {
      group.x(Math.round(group.x() / GRID) * GRID);
      group.y(Math.round(group.y() / GRID) * GRID);
      saveState();
      syncLengthInput(item);
      layer.draw();
    });

    right.on("mouseenter", () => setCursor("ew-resize"));
    right.on("mouseleave", () => setCursor("default"));
    left.on("mouseenter", () => setCursor("ew-resize"));
    left.on("mouseleave", () => setCursor("default"));

    return { left, right };
  }

  function positionWallHandles(item) {
    if (!item.handles) return;
    const h = item.rect.height();
    item.handles.left.position({ x: 0, y: h / 2 });
    item.handles.right.position({ x: item.rect.width(), y: h / 2 });
  }

  function syncLengthInput(item) {
    if (selected !== item) return;
    const input = document.getElementById("editLength");
    if (input) input.value = item.data.length;
  }

  // ---------- MULTI-SELECT (BOX) ----------
  stage.on("mousedown", (e) => {
    if (spacePanning) return;
    if (e.target !== stage && e.target !== background) return;

    selectionStart = stage.getRelativePointerPosition();
    selectionRect.visible(true);
    selectionRect.position(selectionStart);
    selectionRect.width(0);
    selectionRect.height(0);
  });

  stage.on("mousemove", () => {
    if (!selectionStart) return;
    const pos = stage.getRelativePointerPosition();
    selectionRect.setAttrs({
      x: Math.min(pos.x, selectionStart.x),
      y: Math.min(pos.y, selectionStart.y),
      width: Math.abs(pos.x - selectionStart.x),
      height: Math.abs(pos.y - selectionStart.y)
    });
    layer.batchDraw();
  });

  stage.on("mouseup", () => {
    if (!selectionStart) return;
    const box = selectionRect.getClientRect();

    multiSelected = [];
    parts.forEach((p) => {
      if (Konva.Util.haveIntersection(box, p.group.getClientRect())) {
        multiSelected.push(p);
        p.rect.stroke(BRAND);
        p.rect.strokeWidth(4);
      }
    });

    selectionRect.visible(false);
    selectionStart = null;
    layer.draw();
  });

  // ---------- OBJEKTLISTA ----------
  function updateList() {
    const list = document.getElementById("objectList");
    if (!list) return;
    list.innerHTML = "";

    const visible = parts.filter((p) => p.type !== "wall");

    if (visible.length === 0) {
      list.innerHTML = '<p class="empty">Inga objekt ännu</p>';
      return;
    }

    visible.forEach((p) => {
      const d = p.data;
      const el = document.createElement("div");
      el.className = "object-item" + (p === selected ? " selected" : "");

      const tag = isCutoutType(p.type)
        ? `<span class="tag cutout">Urtag</span>`
        : isSlabType(p.type) && d.material
        ? `<span class="tag">${d.material}</span>`
        : "";

      el.innerHTML = `
        <b>${typeLabel(d.type)}</b>${tag}
        <div class="obj-meta">${d.length} × ${d.depth} mm ${d.done ? "· ✓ Klar" : ""}</div>
      `;

      el.onclick = () => selectItem(p);
      list.appendChild(el);
    });
  }

  // ---------- SAMMANSTÄLLNING ----------
  function updateSummary() {
    const box = document.getElementById("summaryBox");
    if (!box) return;

    const countertops = parts.filter((p) => p.type === "countertop").length;
    const splashes = parts.filter((p) => p.type === "splash").length;
    const sinks = parts.filter((p) => p.type === "sink").length;
    const hobs = parts.filter((p) => p.type === "hob").length;
    const area = totalAreaM2();

    box.innerHTML = `
      <h3>Sammanställning</h3>
      <div class="summary-row"><span>Bänkskivor</span><span>${countertops} st</span></div>
      <div class="summary-row"><span>Stänkskydd</span><span>${splashes} st</span></div>
      <div class="summary-row"><span>Diskho-urtag</span><span>${sinks} st</span></div>
      <div class="summary-row"><span>Häll-urtag</span><span>${hobs} st</span></div>
      <div class="summary-total"><span>Total yta (brutto)</span><span>${area.toFixed(2)} m²</span></div>
    `;
  }

  // ---------- EGENSKAPSPANEL ----------
  function renderProperties(item) {
    const box = document.getElementById("propertiesContent");
    if (!box) return;

    if (!item) {
      box.innerHTML = "<p>Markera ett objekt</p>";
      return;
    }

    const d = item.data;
    const isWall = item.type === "wall";
    const isCutout = isCutoutType(item.type);
    const isSlab = isSlabType(item.type);
    const lenMin = isWall ? WALL_MIN_LENGTH_MM : MIN_LENGTH_MM;
    const lenMax = isWall ? WALL_MAX_LENGTH_MM : MAX_LENGTH_MM;

    box.innerHTML = `
      <h3>${typeLabel(d.type)}</h3>

      <label class="field-label" for="editLength">Längd (mm)</label>
      <input id="editLength" type="number" min="${lenMin}" max="${lenMax}" step="10" value="${d.length}">

      <label class="field-label" for="editDepth">Djup${isWall ? " / tjocklek" : ""} (mm)</label>
      <input id="editDepth" type="number" min="${MIN_DEPTH_MM}" max="${MAX_DEPTH_MM}" step="10" value="${d.depth}">

      ${
        isSlab
          ? `
        <label class="field-label" for="materialSelect">Material</label>
        <select id="materialSelect">
          ${MATERIALS.map((m) => `<option${d.material === m ? " selected" : ""}>${m}</option>`).join("")}
        </select>

        <label class="field-label" for="edgeSelect">Kantprofil</label>
        <select id="edgeSelect">
          ${EDGE_PROFILES.map((p) => `<option${d.edgeProfile === p ? " selected" : ""}>${p}</option>`).join("")}
        </select>

        <div class="field-label">Kanter med profil</div>
        <div id="edgeButtons" class="edge-buttons">
          <button type="button" class="edge-btn${d.edges.top ? " active" : ""}" data-edge="top">↑ Bak</button>
          <button type="button" class="edge-btn${d.edges.bottom ? " active" : ""}" data-edge="bottom">↓ Fram</button>
          <button type="button" class="edge-btn${d.edges.left ? " active" : ""}" data-edge="left">← Vänster</button>
          <button type="button" class="edge-btn${d.edges.right ? " active" : ""}" data-edge="right">→ Höger</button>
        </div>
      `
          : isCutout
          ? `<p class="hint">Placera urtaget där diskhon/hällen ska sitta på bänkskivan. Dra i objektet för att positionera.</p>`
          : `<p class="hint">Tips: dra i de gröna handtagen på väggens sidor i ritytan för att ändra längd direkt.</p>`
      }

      ${
        !isWall
          ? `
        <div class="field-label">Rundade hörn</div>
        <div class="corner-buttons">
          <button type="button" class="corner-btn${d.corners.tl ? " active" : ""}" data-corner="tl">↖ Övre vänster</button>
          <button type="button" class="corner-btn${d.corners.tr ? " active" : ""}" data-corner="tr">↗ Övre höger</button>
          <button type="button" class="corner-btn${d.corners.bl ? " active" : ""}" data-corner="bl">↙ Nedre vänster</button>
          <button type="button" class="corner-btn${d.corners.br ? " active" : ""}" data-corner="br">↘ Nedre höger</button>
        </div>
      `
          : ""
      }

      <div class="prop-actions">
        <button type="button" id="rotateBtn">↻ Rotera 90°</button>
        <button type="button" id="deleteBtn" class="btn-danger">🗑 Radera</button>
      </div>

      ${
        isSlab
          ? `
        <label class="done-label">
          <input type="checkbox" id="doneCheck" ${d.done ? "checked" : ""}>
          Klar
        </label>
      `
          : ""
      }
    `;

    document.getElementById("editLength").onchange = (e) => {
      saveState();
      const v = clamp(parseInt(e.target.value, 10) || d.length, lenMin, lenMax);
      d.length = v;
      e.target.value = v;
      resizePart(item);
    };

    document.getElementById("editDepth").onchange = (e) => {
      saveState();
      const v = clamp(parseInt(e.target.value, 10) || d.depth, MIN_DEPTH_MM, MAX_DEPTH_MM);
      d.depth = v;
      e.target.value = v;
      resizePart(item);
    };

    document.getElementById("rotateBtn").onclick = () => {
      saveState();
      d.rotation = (d.rotation + 90) % 360;
      item.group.rotation(d.rotation);
      layer.draw();
    };

    document.getElementById("deleteBtn").onclick = () => {
      if (!confirm(`Ta bort denna ${typeLabel(d.type).toLowerCase()}?`)) return;
      saveState();
      item.group.destroy();
      parts = parts.filter((p) => p !== item);
      selected = null;
      updateList();
      updateSummary();
      renderProperties(null);
      layer.draw();
    };

    document.querySelectorAll(".corner-btn").forEach((btn) => {
      btn.onclick = () => {
        const c = btn.dataset.corner;
        d.corners[c] = !d.corners[c];
        btn.classList.toggle("active", d.corners[c]);
        applyCorners(item);
        layer.draw();
      };
    });

    if (isSlab) {
      document.getElementById("materialSelect").onchange = (e) => {
        d.material = e.target.value;
        updateList();
      };

      document.getElementById("edgeSelect").onchange = (e) => {
        d.edgeProfile = e.target.value;
      };

      document.querySelectorAll(".edge-btn").forEach((btn) => {
        btn.onclick = () => {
          const side = btn.dataset.edge;
          d.edges[side] = !d.edges[side];
          btn.classList.toggle("active", d.edges[side]);
          drawEdges(item);
        };
      });

      document.getElementById("doneCheck").onchange = (e) => {
        d.done = e.target.checked;
        updateList();
      };
    }
  }

  // ---------- KNAPPAR: LÄGG TILL ----------
  document.getElementById("addCountertop").onclick = () => { saveState(); addPart("countertop"); };
  document.getElementById("addSplash").onclick = () => { saveState(); addPart("splash"); };
  document.getElementById("addWall").onclick = () => { saveState(); addPart("wall"); };
  document.getElementById("addSink").onclick = () => { saveState(); addPart("sink"); };
  document.getElementById("addHob").onclick = () => { saveState(); addPart("hob"); };

  document.getElementById("undoBtn").onclick = undo;

  document.getElementById("clearAll").onclick = () => {
    if (parts.length === 0) return;
    if (!confirm("Detta tar bort alla objekt från ritningen. Fortsätta?")) return;
    saveState();
    parts.forEach((p) => p.group.destroy());
    parts = [];
    selected = null;
    updateList();
    updateSummary();
    renderProperties(null);
    layer.draw();
  };

  // ---------- TANGENTBORD ----------
  window.addEventListener("keydown", (e) => {
    const tag = document.activeElement && document.activeElement.tagName;
    const typing = tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA";

    if (!typing && (e.key === "Delete" || e.key === "Backspace") && selected) {
      e.preventDefault();
      const btn = document.getElementById("deleteBtn");
      if (btn) btn.click();
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      undo();
    }
  });

  // ---------- PROJEKT / KUNDUPPGIFTER ----------
  document.getElementById("customerName").value = project.customerName;
  document.getElementById("customerAddress").value = project.customerAddress;
  document.getElementById("customerPhone").value = project.customerPhone;
  document.getElementById("projectDate").value = project.projectDate;
  document.getElementById("projectRef").value = project.projectRef;

  ["customerName", "customerAddress", "customerPhone", "projectDate", "projectRef"].forEach((id) => {
    document.getElementById(id).addEventListener("input", (e) => {
      project[id] = e.target.value;
    });
  });

  document.getElementById("toggleProjectBar").onclick = (e) => {
    const bar = document.getElementById("projectBar");
    const collapsed = bar.classList.toggle("collapsed");
    e.target.textContent = collapsed ? "Visa ▼" : "Dölj ▲";
  };

  // ---------- SPARA ----------
  document.getElementById("saveProject").onclick = () => {
    if (parts.length === 0) {
      alert("Det finns inget att spara ännu.");
      return;
    }

    const save = {
      meta: project,
      parts: parts.map((p) => ({
        data: p.data,
        x: p.group.x(),
        y: p.group.y(),
        rotation: p.group.rotation()
      }))
    };

    const blob = new Blob([JSON.stringify(save, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "koksskiva.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ---------- ÖPPNA ----------
  document.getElementById("loadProject").onclick = () => {
    document.getElementById("fileInput").click();
  };

  document.getElementById("fileInput").onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      let parsed;
      try {
        parsed = JSON.parse(reader.result);
      } catch (err) {
        alert("Kunde inte läsa filen. Är det en giltig sparfil (.json) från detta verktyg?");
        return;
      }

      // Stöd för både nytt format ({meta, parts}) och gamla ([...])
      const savedParts = Array.isArray(parsed) ? parsed : parsed.parts || [];
      const savedMeta = Array.isArray(parsed) ? null : parsed.meta;

      if (parts.length > 0 && !confirm("Att öppna en fil ersätter den nuvarande ritningen. Fortsätta?")) {
        return;
      }

      parts.forEach((p) => p.group.destroy());
      parts = [];
      selected = null;
      hasFitOnce = false;

      savedParts.forEach((entry) => {
        const data = entry.data;
        data.rotation = entry.rotation || 0;
        if (data.material === undefined) data.material = isSlabType(data.type) ? MATERIALS[2] : null;
        if (!EDGE_PROFILES.includes(data.edgeProfile)) data.edgeProfile = EDGE_PROFILES[0];
        const item = addPart(data.type, data);
        item.group.x(entry.x);
        item.group.y(entry.y);
        item.group.rotation(entry.rotation || 0);
      });

      if (savedMeta) {
        Object.assign(project, savedMeta);
        document.getElementById("customerName").value = project.customerName || "";
        document.getElementById("customerAddress").value = project.customerAddress || "";
        document.getElementById("customerPhone").value = project.customerPhone || "";
        document.getElementById("projectDate").value = project.projectDate || "";
        document.getElementById("projectRef").value = project.projectRef || "";
      }

      renderProperties(null);
      layer.draw();
      updateList();
      updateSummary();
      fitCanvas();
    };

    reader.onerror = () => alert("Ett fel uppstod vid inläsning av filen.");
    reader.readAsText(file);
    e.target.value = "";
  };

  // ---------- EXPORTERA BILD ----------
  function renderToDataUrl() {
    const prevSelected = selected;
    if (prevSelected) selectItem(null);

    // Visa alltid hela ritningen i exporten, oavsett aktuell zoom/pan
    const prevScale = stage.scaleX();
    const prevPos = stage.position();
    fitCanvas();

    // Vit bakgrund istället för rutnätsfärgen i den exporterade bilden
    const prevFill = background.fill();
    background.fill("#ffffff");
    gridLayer.draw();

    const uri = stage.toDataURL({ pixelRatio: 2 });

    background.fill(prevFill);
    stage.scale({ x: prevScale, y: prevScale });
    stage.position(prevPos);
    stage.batchDraw();

    if (prevSelected) selectItem(prevSelected);

    return uri;
  }

  document.getElementById("exportImage").onclick = () => {
    const uri = renderToDataUrl();
    const a = document.createElement("a");
    a.href = uri;
    a.download = "koksskiva.png";
    a.click();
  };

  // ---------- EXPORTERA PDF (mätunderlag) ----------
  document.getElementById("exportPdf").onclick = () => {
    if (parts.length === 0) {
      alert("Inget att exportera ännu.");
      return;
    }
    if (!window.jspdf) {
      alert("PDF-biblioteket kunde inte laddas. Kontrollera internetanslutningen och försök igen.");
      return;
    }

    const imgData = renderToDataUrl();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    let y = 0;

    // Header
    doc.setFillColor(24, 182, 140);
    doc.rect(0, 0, pageW, 24, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text("Mätunderlag – Stenskivor.se", 10, 15);
    y = 32;

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.text(`Kund: ${project.customerName || "-"}`, 10, y); y += 6;
    doc.text(`Adress: ${project.customerAddress || "-"}`, 10, y); y += 6;
    doc.text(`Telefon: ${project.customerPhone || "-"}`, 10, y); y += 6;
    doc.text(`Datum: ${project.projectDate || "-"}`, 10, y); y += 6;
    doc.text(`Referens: ${project.projectRef || "-"}`, 10, y); y += 8;

    // Bild
    const imgProps = doc.getImageProperties(imgData);
    const imgW = pageW - 20;
    const imgH = Math.min((imgProps.height * imgW) / imgProps.width, 110);
    doc.addImage(imgData, "PNG", 10, y, imgW, imgH);
    y += imgH + 10;

    // Specifikation
    doc.setFontSize(13);
    doc.text("Specifikation", 10, y);
    y += 7;
    doc.setFontSize(10);

    parts
      .filter((p) => p.type !== "wall")
      .forEach((p) => {
        const d = p.data;
        let line = `${typeLabel(d.type)} — ${d.length} × ${d.depth} mm`;
        if (isSlabType(p.type)) line += ` — ${d.material} — Kant: ${d.edgeProfile}`;
        if (y > pageH - 25) { doc.addPage(); y = 15; }
        doc.text(line, 10, y);
        y += 6;
      });

    y += 4;
    if (y > pageH - 20) { doc.addPage(); y = 15; }
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text(`Total yta (bänkskiva + stänkskydd): ${totalAreaM2().toFixed(2)} m²`, 10, y);
    doc.setFont(undefined, "normal");

    doc.save("matunderlag.pdf");
  };

  // ---------- SKRIV UT ----------
  document.getElementById("printBtn").onclick = () => window.print();

  // ---------- FÖNSTERSTORLEK ----------
  window.addEventListener("resize", () => {
    stage.width(canvasEl.clientWidth);
    stage.height(canvasEl.clientHeight);
    layer.draw();
    gridLayer.draw();
  });

  // ---------- START ----------
  updateList();
  updateSummary();
  layer.draw();
}
