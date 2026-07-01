// =======================================
// KÖKSSKIVA RITVERKTYG
// app.js
// =======================================

document.addEventListener("DOMContentLoaded", init);

function init() {
  const SCALE = 3;   // 1 mm = 1/3 px
  const GRID = 10;   // snappning i px
  const RADIUS = 25; // rundningsradie i px

  const canvasEl = document.getElementById("canvas-container");

  const stage = new Konva.Stage({
    container: "canvas-container",
    width: canvasEl.clientWidth,
    height: canvasEl.clientHeight
  });

  const gridLayer = new Konva.Layer();
  const background = new Konva.Rect({
    x: 0,
    y: 0,
    width: stage.width(),
    height: stage.height(),
    fill: "#eef3f8",
    listening: false
  });
  gridLayer.add(background);
  stage.add(gridLayer);

  const layer = new Konva.Layer();
  stage.add(layer);

  let parts = [];      // { id, type, group, rect, text, data }
  let selected = null;
  let nextId = 1;

  // ===================================
  // HELPERS
  // ===================================

  function mmToPx(mm) {
    return mm / SCALE;
  }

  function typeLabel(type) {
    if (type === "countertop") return "Bänkskiva";
    if (type === "splash") return "Stänkskydd";
    return "Vägg";
  }

  function defaultData(type) {
    return {
      id: nextId++,
      type,
      length: type === "wall" ? 1200 : 2400,
      depth: type === "wall" ? 100 : 620,
      rotation: 0,
      edgeProfile: "Rak",
      edges: { top: false, bottom: false, left: false, right: false },
      corners: { tl: false, tr: false, bl: false, br: false },
      done: false
    };
  }

  // ===================================
  // CREATE PART
  // ===================================

  function addPart(type, savedData) {
    const data = savedData || defaultData(type);
    if (data.id === undefined || data.id === null) data.id = nextId++;
    if (data.id >= nextId) nextId = data.id + 1;

    const w = mmToPx(data.length);
    const h = mmToPx(data.depth);

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
      fill: type === "wall" ? "#64748b" : "#ffffff",
      stroke: "#1e293b",
      strokeWidth: 2,
      cornerRadius: 0
    });

    const text = new Konva.Text({
      fontSize: 13,
      fill: "#1e293b",
      align: "center"
    });

    group.add(rect);
    group.add(text);

    const item = { id: data.id, type, group, rect, text, data };
    parts.push(item);

    applyCorners(item);
    if (type !== "wall") {
      updateMeasure(item);
      drawEdges(item);
    }

    group.on("click tap", (e) => {
      e.cancelBubble = true;
      selectItem(item);
    });

    group.on("dragmove", () => {
      group.x(Math.round(group.x() / GRID) * GRID);
      group.y(Math.round(group.y() / GRID) * GRID);
      updateMeasure(item);
      layer.batchDraw();
    });

    layer.add(group);
    layer.draw();
    updateList();

    return item;
  }

  // Avmarkera vid klick på tom yta
  stage.on("click tap", (e) => {
    if (e.target === stage || e.target === background) {
      selectItem(null);
    }
  });

  // ===================================
  // SELECT
  // ===================================

  function selectItem(item) {
    selected = item;

    parts.forEach((p) => {
      const isSelected = p === item;
      p.rect.stroke(isSelected ? "#2563eb" : "#1e293b");
      p.rect.strokeWidth(isSelected ? 4 : 2);
    });

    layer.draw();
    renderProperties(item);
    updateList();
  }

  // ===================================
  // MEASUREMENTS
  // ===================================

  function updateMeasure(item) {
    const { rect, text, data } = item;
    text.text(`${data.length} × ${data.depth} mm`);
    text.width(rect.width());
    text.align("center");
    text.x(0);
    text.y(-22);
  }

  // ===================================
  // RESIZE
  // ===================================

  function resizePart(item) {
    const { rect, group, data, type } = item;
    const w = mmToPx(data.length);
    const h = mmToPx(data.depth);

    rect.width(w);
    rect.height(h);
    group.offsetX(w / 2);
    group.offsetY(h / 2);

    applyCorners(item);

    if (type !== "wall") {
      updateMeasure(item);
      drawEdges(item);
    }

    layer.draw();
  }

  // ===================================
  // CORNERS (varje hörn oberoende)
  // ===================================

  function applyCorners(item) {
    const { rect, data } = item;
    const c = data.corners;
    // Konva-ordning: [top-left, top-right, bottom-right, bottom-left]
    rect.cornerRadius([
      c.tl ? RADIUS : 0,
      c.tr ? RADIUS : 0,
      c.br ? RADIUS : 0,
      c.bl ? RADIUS : 0
    ]);
  }

  // ===================================
  // EDGE MARKERS (kantprofilpilar)
  // ===================================

  function drawEdges(item) {
    const { group, rect, data } = item;

    group.find(".edgeMarker").forEach((m) => m.destroy());

    const size = 9;

    function addArrow(x, y, rot) {
      group.add(
        new Konva.RegularPolygon({
          name: "edgeMarker",
          x,
          y,
          sides: 3,
          radius: size,
          rotation: rot,
          fill: "#2563eb",
          listening: false
        })
      );
    }

    if (data.edges.top) addArrow(rect.width() / 2, 0, 0);
    if (data.edges.bottom) addArrow(rect.width() / 2, rect.height(), 180);
    if (data.edges.left) addArrow(0, rect.height() / 2, 270);
    if (data.edges.right) addArrow(rect.width(), rect.height() / 2, 90);

    layer.draw();
  }

  // ===================================
  // LIST
  // ===================================

  function updateList() {
    const list = document.getElementById("objectList");
    list.innerHTML = "";

    if (parts.length === 0) {
      list.innerHTML = '<p class="empty">Inga objekt ännu</p>';
      return;
    }

    parts.forEach((p) => {
      const d = p.data;

      const item = document.createElement("div");
      item.className = "object-item" + (p === selected ? " selected" : "");

      item.innerHTML = `
        <b>${typeLabel(d.type)}</b>
        <br>
        ${d.length} × ${d.depth} mm
        ${d.done ? " ✓" : ""}
      `;

      item.onclick = () => selectItem(p);
      list.appendChild(item);
    });
  }

  // ===================================
  // PROPERTIES PANEL
  // ===================================

  function renderProperties(item) {
    const box = document.getElementById("propertiesContent");

    if (!item) {
      box.innerHTML = "<p>Markera ett objekt</p>";
      return;
    }

    const d = item.data;
    const isWall = item.type === "wall";

    box.innerHTML = `
      <h3>${typeLabel(d.type)}</h3>

      <label class="field-label" for="editLength">Längd (mm)</label>
      <input id="editLength" type="number" min="50" max="10000" step="10" value="${d.length}">

      <label class="field-label" for="editDepth">Djup (mm)</label>
      <input id="editDepth" type="number" min="10" max="2000" step="10" value="${d.depth}">

      ${
        !isWall
          ? `
        <label class="field-label" for="edgeSelect">Kantprofil</label>
        <select id="edgeSelect">
          <option${d.edgeProfile === "Rak" ? " selected" : ""}>Rak</option>
          <option${d.edgeProfile === "Fasad" ? " selected" : ""}>Fasad</option>
          <option${d.edgeProfile === "Rund" ? " selected" : ""}>Rund</option>
        </select>

        <div class="field-label">Kanter med profil</div>
        <div id="edgeButtons" class="edge-buttons">
          <button type="button" class="edge-btn${d.edges.top ? " active" : ""}" data-edge="top">↑ Bak</button>
          <button type="button" class="edge-btn${d.edges.bottom ? " active" : ""}" data-edge="bottom">↓ Fram</button>
          <button type="button" class="edge-btn${d.edges.left ? " active" : ""}" data-edge="left">← Vänster</button>
          <button type="button" class="edge-btn${d.edges.right ? " active" : ""}" data-edge="right">→ Höger</button>
        </div>

        <div class="field-label">Rundade hörn</div>
        <label><input type="checkbox" id="tl" ${d.corners.tl ? "checked" : ""}> Övre vänster</label>
        <label><input type="checkbox" id="tr" ${d.corners.tr ? "checked" : ""}> Övre höger</label>
        <label><input type="checkbox" id="bl" ${d.corners.bl ? "checked" : ""}> Nedre vänster</label>
        <label><input type="checkbox" id="br" ${d.corners.br ? "checked" : ""}> Nedre höger</label>
      `
          : ""
      }

      <div class="prop-actions">
        <button type="button" id="rotateBtn">↻ Rotera 90°</button>
        <button type="button" id="deleteBtn" class="btn-danger">🗑 Radera</button>
      </div>

      ${
        !isWall
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
      const v = clamp(parseInt(e.target.value, 10) || d.length, 50, 10000);
      d.length = v;
      e.target.value = v;
      resizePart(item);
    };

    document.getElementById("editDepth").onchange = (e) => {
      const v = clamp(parseInt(e.target.value, 10) || d.depth, 10, 2000);
      d.depth = v;
      e.target.value = v;
      resizePart(item);
    };

    document.getElementById("rotateBtn").onclick = () => {
      d.rotation = (d.rotation + 90) % 360;
      item.group.rotation(d.rotation);
      layer.draw();
    };

    document.getElementById("deleteBtn").onclick = () => {
      if (!confirm(`Ta bort denna ${typeLabel(d.type).toLowerCase()}?`)) return;
      item.group.destroy();
      parts = parts.filter((p) => p !== item);
      selected = null;
      updateList();
      renderProperties(null);
      layer.draw();
    };

    if (!isWall) {
      document.getElementById("edgeSelect").onchange = (e) => {
        d.edgeProfile = e.target.value;
      };

      document.querySelectorAll("#edgeButtons .edge-btn").forEach((btn) => {
        btn.onclick = () => {
          const side = btn.dataset.edge;
          d.edges[side] = !d.edges[side];
          btn.classList.toggle("active", d.edges[side]);
          drawEdges(item);
        };
      });

      ["tl", "tr", "bl", "br"].forEach((c) => {
        document.getElementById(c).onchange = (e) => {
          d.corners[c] = e.target.checked;
          resizePart(item);
        };
      });

      document.getElementById("doneCheck").onchange = (e) => {
        d.done = e.target.checked;
        updateList();
      };
    }
  }

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  // ===================================
  // BUTTONS: LÄGG TILL
  // ===================================

  document.getElementById("addCountertop").onclick = () => addPart("countertop");
  document.getElementById("addSplash").onclick = () => addPart("splash");
  document.getElementById("addWall").onclick = () => addPart("wall");

  // ===================================
  // RENSA ALLT
  // ===================================

  const clearBtn = document.getElementById("clearAll");
  if (clearBtn) {
    clearBtn.onclick = () => {
      if (parts.length === 0) return;
      if (!confirm("Detta tar bort alla objekt från ritningen. Fortsätta?")) return;
      parts.forEach((p) => p.group.destroy());
      parts = [];
      selected = null;
      nextId = 1;
      updateList();
      renderProperties(null);
      layer.draw();
    };
  }

  // ===================================
  // TANGENTBORD (Delete/Backspace = radera valt objekt)
  // ===================================

  window.addEventListener("keydown", (e) => {
    const tag = document.activeElement && document.activeElement.tagName;
    const typing = tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA";
    if (typing || !selected) return;

    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      document.getElementById("deleteBtn") && document.getElementById("deleteBtn").click();
    }
  });

  // ===================================
  // SPARA
  // ===================================

  document.getElementById("saveProject").onclick = () => {
    if (parts.length === 0) {
      alert("Det finns inget att spara ännu.");
      return;
    }

    const save = parts.map((p) => ({
      data: p.data,
      x: p.group.x(),
      y: p.group.y(),
      rotation: p.group.rotation()
    }));

    const blob = new Blob([JSON.stringify(save, null, 2)], {
      type: "application/json"
    });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "koksskiva.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ===================================
  // ÖPPNA
  // ===================================

  document.getElementById("loadProject").onclick = () => {
    document.getElementById("fileInput").click();
  };

  document.getElementById("fileInput").onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      let saved;
      try {
        saved = JSON.parse(reader.result);
        if (!Array.isArray(saved)) throw new Error("Ogiltigt filformat");
      } catch (err) {
        alert("Kunde inte läsa filen. Är det en giltig sparfil (.json) från detta verktyg?");
        return;
      }

      if (parts.length > 0 && !confirm("Att öppna en fil ersätter den nuvarande ritningen. Fortsätta?")) {
        return;
      }

      // rensa nuvarande ritning
      parts.forEach((p) => p.group.destroy());
      parts = [];
      selected = null;
      nextId = 1;

      saved.forEach((entry) => {
        const data = entry.data;
        data.rotation = entry.rotation || 0;
        const item = addPart(data.type, data);
        item.group.x(entry.x);
        item.group.y(entry.y);
        item.group.rotation(entry.rotation || 0);
      });

      renderProperties(null);
      layer.draw();
      updateList();
    };

    reader.onerror = () => {
      alert("Ett fel uppstod vid inläsning av filen.");
    };

    reader.readAsText(file);
    e.target.value = ""; // så samma fil kan väljas igen senare
  };

  // ===================================
  // EXPORTERA BILD
  // ===================================

  document.getElementById("exportImage").onclick = () => {
    const prevSelected = selected;
    if (prevSelected) selectItem(null);

    const uri = stage.toDataURL({ pixelRatio: 2 });

    if (prevSelected) selectItem(prevSelected);

    const a = document.createElement("a");
    a.href = uri;
    a.download = "koksskiva.png";
    a.click();
  };

  // ===================================
  // RESIZE WINDOW
  // ===================================

  window.addEventListener("resize", () => {
    stage.width(canvasEl.clientWidth);
    stage.height(canvasEl.clientHeight);
    background.width(stage.width());
    background.height(stage.height());
    layer.draw();
    gridLayer.draw();
  });
}
