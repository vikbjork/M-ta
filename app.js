// =======================================
// KÖKSSKIVA RITVERKTYG
// app.js
// =======================================

document.addEventListener("DOMContentLoaded", init);

function init() {
  const SCALE = 5;   // 1 mm = 1/3 px
  const GRID = 3;   // snappning i px
  const RADIUS = 25; // rundningsradie i px

  const MIN_LENGTH_MM = 50;
  const MAX_LENGTH_MM = 10000;
  const MIN_DEPTH_MM = 10;
  const MAX_DEPTH_MM = 2000;

  const WALL_MIN_LENGTH_MM = 100;
  const WALL_MAX_LENGTH_MM = 12000;

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
  const selectionRect = new Konva.Rect({
  fill: "rgba(37,99,235,0.15)",
  stroke: "#2563eb",
  strokeWidth: 1,
  visible:false
});

layer.add(selectionRect);


let selectionStart = null;
let multiSelected = [];

  let parts = [];      // { id, type, group, rect, lengthText, depthText, handles, data }
  let selected = null;
  let nextId = 1;
 

  // ===================================
  // HELPERS
  // ===================================

  function mmToPx(mm) {
    return mm / SCALE;
  }

  function pxToMm(px) {
    return Math.round((px * SCALE) / 10) * 10; // avrundat till närmaste 10 mm
  }

  function typeLabel(type) {
    if (type === "countertop") return "Bänkskiva";
    if (type === "splash") return "Stänkskydd";
    return "Vägg";
  }

  function isWallType(type) {
    return type === "wall";
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

  function setCursor(cursor) {
    stage.container().style.cursor = cursor;
  }

  // ===================================
  // CREATE PART
  // ===================================

  function addPart(type, savedData) {
    const data = savedData || defaultData(type);
    if (data.id === undefined || data.id === null) data.id = nextId++;
    if (data.id >= nextId) nextId = data.id + 1;

    const wall = isWallType(type);

const w = mmToPx(data.length);

const h =
type === "splash"
?
50
:
mmToPx(data.depth);

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
      fill: wall ? "#64748b" : "#ffffff",
      stroke: "#1e293b",
      strokeWidth: 2,
      cornerRadius: 0
    });

    group.add(rect);

    let lengthText = null;
    let depthText = null;

    if (!wall) {
      // Längd visas ovanför (horisontell sida), djup visas till höger (lodrät sida)
      lengthText = new Konva.Text({
        fontSize: 12,
        fill: "#475569",
        align: "center"
      });
      depthText = new Konva.Text({
        fontSize: 12,
        fill: "#475569",
        align: "left"
      });
      group.add(lengthText);
      group.add(depthText);
    }

    const item = { id: data.id, type, group, rect, lengthText, depthText, data, handles: null };
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
      if (item !== selected) rect.stroke("#64748b");
      setCursor("move");
      layer.batchDraw();
    });

    group.on("mouseleave", () => {
      if (item !== selected) rect.stroke("#1e293b");
      setCursor("default");
      layer.batchDraw();
    });

   

  group.on("dragstart",()=>{

  multiSelected.forEach(p=>{
    p.startX = p.group.x();
    p.startY = p.group.y();
  });

});


group.on("dragmove",()=>{


  if(multiSelected.length > 1 && multiSelected.includes(item)){


    const dx = group.x() - group.startX;
    const dy = group.y() - group.startY;


    multiSelected.forEach(p=>{

      if(p === item) return;


      p.group.x(
        p.startX + dx
      );

      p.group.y(
        p.startY + dy
      );

    });

  }


  group.x(
    Math.round(group.x()/GRID)*GRID
  );

  group.y(
    Math.round(group.y()/GRID)*GRID
  );


  layer.batchDraw();

});

  }



  group.x(
    Math.round(group.x()/GRID)*GRID
  );


  group.y(
    Math.round(group.y()/GRID)*GRID
  );


  layer.batchDraw();



    layer.add(group);

fitCanvas();

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
  stage.on("mousedown", (e)=>{

  if(e.target !== stage && e.target !== background) return;


  selectionStart = stage.getPointerPosition();


  selectionRect.visible(true);

  selectionRect.position(selectionStart);

  selectionRect.width(0);
  selectionRect.height(0);

});



stage.on("mousemove", ()=>{

 if(!selectionStart) return;


 const pos = stage.getPointerPosition();


 selectionRect.setAttrs({

   x: Math.min(pos.x, selectionStart.x),
   y: Math.min(pos.y, selectionStart.y),

   width: Math.abs(pos.x-selectionStart.x),
   height: Math.abs(pos.y-selectionStart.y)

 });


 layer.batchDraw();

});



stage.on("mouseup", ()=>{


 if(!selectionStart) return;


 const box =
 selectionRect.getClientRect();


 multiSelected=[];


 parts.forEach(p=>{


   const itemBox =
   p.group.getClientRect();



   if(
    Konva.Util.haveIntersection(
      box,
      itemBox
    )
   ){

      multiSelected.push(p);

      p.rect.stroke("#2563eb");
      p.rect.strokeWidth(4);

   }


 });


 selectionRect.visible(false);


 selectionStart=null;


 layer.draw();

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

      if (p.handles) {
        p.handles.left.visible(isSelected);
        p.handles.left.listening(isSelected);
        p.handles.right.visible(isSelected);
        p.handles.right.listening(isSelected);
      }
    });

    layer.draw();
    renderProperties(item);
    updateList();
  }

  // ===================================
  // MEASUREMENTS (längd ovanför, djup till höger)
  // ===================================

  function updateMeasure(item) {
    if (item.type === "wall") return; // väggar visar inga mått
    const { rect, lengthText, depthText, data } = item;

    lengthText.text(`${data.length} mm`);
    lengthText.width(rect.width());
    lengthText.x(0);
    lengthText.y(-18);

    depthText.text(`${data.depth} mm`);
    depthText.x(rect.width() + 8);
    depthText.y(rect.height() / 2 - 6);
  }

  // ===================================
  // RESIZE (från egenskapspanelen)
  // ===================================

  function resizePart(item) {
    const { rect, group, data, type } = item;
    const w = mmToPx(data.length);

const h =
type === "splash"
?
100
:
mmToPx(data.depth);

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
  // VÄGG: DRA UT I SIDORNA
  // ===================================

  function createWallHandles(item) {
    const { group, rect } = item;
    const h = rect.height();

    const handleStyle = {
      width: 10,
      height: 18,
      fill: "#2563eb",
      cornerRadius: 3,
      draggable: true,
      visible: false,
      listening: false,
      offsetX: 5,
      offsetY: 9
    };

    const left = new Konva.Rect(Object.assign({ x: 0, y: h / 2 }, handleStyle));
    const right = new Konva.Rect(Object.assign({ x: rect.width(), y: h / 2 }, handleStyle));

    group.add(left);
    group.add(right);

    let dragTooltip = null;

    function showTooltip(text, x, y) {
      if (!dragTooltip) {
        dragTooltip = new Konva.Label({ x, y, listening: false });
        dragTooltip.add(
          new Konva.Tag({ fill: "#1e293b", cornerRadius: 4 })
        );
        dragTooltip.add(
          new Konva.Text({
            text,
            fontSize: 12,
            padding: 5,
            fill: "#fff"
          })
        );
        layer.add(dragTooltip);
      } else {
        dragTooltip.getText().text(text);
        dragTooltip.position({ x, y });
      }
      dragTooltip.moveToTop();
    }

    function hideTooltip() {
      if (dragTooltip) {
        dragTooltip.destroy();
        dragTooltip = null;
      }
    }

    // --- Höger handtag: flyttar bara höger kant ---
    right.on("dragmove", () => {
      right.y(h / 2); // lås lodrät rörelse
      const minW = mmToPx(WALL_MIN_LENGTH_MM);
      const maxW = mmToPx(WALL_MAX_LENGTH_MM);
      const newW = Math.min(maxW, Math.max(minW, right.x()));
      right.x(newW);

      rect.width(newW);
      item.data.length = pxToMm(newW);

      const abs = right.getAbsolutePosition();
      showTooltip(`${item.data.length} mm`, abs.x + 12, abs.y - 30);

      layer.batchDraw();
    });

    right.on("dragend", () => {
      hideTooltip();
      syncLengthInput(item);
      layer.draw();
    });

    right.on("mouseenter", () => setCursor("ew-resize"));
    right.on("mouseleave", () => setCursor("default"));

    // --- Vänster handtag: flyttar vänster kant, håller höger kant still ---
    left.on("dragmove", () => {
      left.y(h / 2); // lås lodrät rörelse

      const maxExtend = mmToPx(WALL_MAX_LENGTH_MM) - rect.width();
      const minLocalX = -maxExtend;
      const maxLocalX = rect.width() - mmToPx(WALL_MIN_LENGTH_MM);
      const localX = Math.min(maxLocalX, Math.max(minLocalX, left.x()));
      left.x(localX);

      const newW = rect.width() - localX;

      // Håll höger kant fixerad i absoluta koordinater genom att
      // flytta gruppen längs sin egen (ev. roterade) x-axel.
      const rot = (group.rotation() * Math.PI) / 180;
      const dx = localX * Math.cos(rot);
      const dy = localX * Math.sin(rot);

      group.x(group.x() + dx);
      group.y(group.y() + dy);

      rect.width(newW);
      right.x(newW);
      left.x(0);

      item.data.length = pxToMm(newW);

      const abs = left.getAbsolutePosition();
      showTooltip(`${item.data.length} mm`, abs.x + 12, abs.y - 30);

      layer.batchDraw();
    });

    left.on("dragend", () => {
      hideTooltip();
      // snappa gruppens position till rutnätet efter förflyttningen
      group.x(Math.round(group.x() / GRID) * GRID);
      group.y(Math.round(group.y() / GRID) * GRID);
      syncLengthInput(item);
      layer.draw();
    });

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

  // Uppdaterar längdfältet i egenskapspanelen live om väggen just nu är vald
  function syncLengthInput(item) {
    if (selected !== item) return;
    const input = document.getElementById("editLength");
    if (input) input.value = item.data.length;
  }

  // ===================================
  // LIST (väggar visas inte här)
  // ===================================

  function updateList() {
    const list = document.getElementById("objectList");
    list.innerHTML = "";

    const visibleParts = parts.filter((p) => p.type !== "wall");

    if (visibleParts.length === 0) {
      list.innerHTML = '<p class="empty">Inga objekt ännu</p>';
      return;
    }

    visibleParts.forEach((p) => {
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
    const lenMin = isWall ? WALL_MIN_LENGTH_MM : MIN_LENGTH_MM;
    const lenMax = isWall ? WALL_MAX_LENGTH_MM : MAX_LENGTH_MM;

    box.innerHTML = `
      <h3>${typeLabel(d.type)}</h3>

      <label class="field-label" for="editLength">Längd (mm)</label>
      <input id="editLength" type="number" min="${lenMin}" max="${lenMax}" step="10" value="${d.length}">

      <label class="field-label" for="editDepth">Djup${isWall ? " / tjocklek" : ""} (mm)</label>
      <input id="editDepth" type="number" min="${MIN_DEPTH_MM}" max="${MAX_DEPTH_MM}" step="10" value="${d.depth}">

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
          : `<p class="hint">Tips: dra i de blå handtagen på väggens sidor i ritytan för att ändra längd direkt.</p>`
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
      const v = clamp(parseInt(e.target.value, 10) || d.length, lenMin, lenMax);
      d.length = v;
      e.target.value = v;
      resizePart(item);
    };

    document.getElementById("editDepth").onchange = (e) => {
      const v = clamp(parseInt(e.target.value, 10) || d.depth, MIN_DEPTH_MM, MAX_DEPTH_MM);
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
      const btn = document.getElementById("deleteBtn");
      if (btn) btn.click();
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
    function fitCanvas(){

    if(parts.length === 0) return;


    let box = layer.getClientRect({
        skipTransform:true
    });


    let padding = 120;


    let scaleX =
    stage.width() /
    (box.width + padding);


    let scaleY =
    stage.height() /
    (box.height + padding);


    let scale =
    Math.min(scaleX, scaleY, 1);



    stage.scale({
        x:scale,
        y:scale
    });



    stage.position({

        x:
        (stage.width() -
        box.width*scale)/2
        -
        box.x*scale,


        y:
        (stage.height() -
        box.height*scale)/2
        -
        box.y*scale

    });



    stage.batchDraw();

}
  });
}
