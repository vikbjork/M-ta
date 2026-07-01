// =======================================
// KÖKSSKIVA RITVERKTYG
// app.js
// DEL 1/3
// =======================================

document.addEventListener("DOMContentLoaded", init);

function init() {

const SCALE = 5;
const GRID = 3;
const RADIUS = 25;

const MIN_LENGTH_MM = 50;
const MAX_LENGTH_MM = 10000;
const MIN_DEPTH_MM = 10;
const MAX_DEPTH_MM = 2000;

const WALL_MIN_LENGTH_MM = 100;
const WALL_MAX_LENGTH_MM = 12000;


const canvasEl = document.getElementById("canvas-container");


const stage = new Konva.Stage({
 container:"canvas-container",
 width:canvasEl.clientWidth,
 height:canvasEl.clientHeight
});


const gridLayer = new Konva.Layer();

const background = new Konva.Rect({
 x:0,
 y:0,
 width:stage.width(),
 height:stage.height(),
 fill:"#eef3f8",
 listening:false
});


gridLayer.add(background);
stage.add(gridLayer);



const layer = new Konva.Layer();
stage.add(layer);



const selectionRect = new Konva.Rect({
 fill:"rgba(37,99,235,0.15)",
 stroke:"#2563eb",
 strokeWidth:1,
 visible:false
});


layer.add(selectionRect);



let selectionStart=null;
let multiSelected=[];


let parts=[];
let selected=null;
let nextId=1;



// =======================================
// HELPERS
// =======================================


function mmToPx(mm){
 return mm / SCALE;
}


function pxToMm(px){
 return Math.round((px*SCALE)/10)*10;
}


function clamp(v,min,max){
 return Math.min(max,Math.max(min,v));
}


function typeLabel(type){

 if(type==="countertop") return "Bänkskiva";
 if(type==="splash") return "Stänkskydd";

 return "Vägg";
}


function isWallType(type){
 return type==="wall";
}


function setCursor(c){
 stage.container().style.cursor=c;
}



function defaultData(type){

 return {

 id:nextId++,

 type:type,

 length:type==="wall"?1200:2400,

 depth:type==="wall"?100:620,

 rotation:0,

 edgeProfile:"Rak",

 edges:{
  top:false,
  bottom:false,
  left:false,
  right:false
 },

 corners:{
  tl:false,
  tr:false,
  bl:false,
  br:false
 },

 done:false

 };

}



// =======================================
// FIT CANVAS
// =======================================


function fitCanvas(){

 if(parts.length===0) return;


 let box=layer.getClientRect({
  skipTransform:true
 });


 let padding=120;


 let scaleX =
 stage.width() /
 (box.width+padding);


 let scaleY =
 stage.height() /
 (box.height+padding);



 let scale=Math.min(scaleX,scaleY,1);



 stage.scale({
  x:scale,
  y:scale
 });



 stage.position({

 x:
 (stage.width()-box.width*scale)/2
 -
 box.x*scale,


 y:
 (stage.height()-box.height*scale)/2
 -
 box.y*scale

 });


 stage.batchDraw();

}





// =======================================
// CREATE PART
// =======================================


function addPart(type,savedData){


const data=savedData || defaultData(type);


if(data.id===undefined){
 data.id=nextId++;
}


if(data.id>=nextId){
 nextId=data.id+1;
}



const wall=isWallType(type);



const w=mmToPx(data.length);


const h =
type==="splash"
?
50
:
mmToPx(data.depth);





const group=new Konva.Group({

 x:220+w/2,

 y:220+h/2,

 offsetX:w/2,

 offsetY:h/2,

 rotation:data.rotation || 0,

 draggable:true

});





const rect=new Konva.Rect({

 width:w,

 height:h,

 fill:wall ? "#64748b":"#ffffff",

 stroke:"#1e293b",

 strokeWidth:2

});




group.add(rect);




let lengthText=null;
let depthText=null;



if(!wall){


lengthText=new Konva.Text({

 fontSize:12,

 fill:"#475569",

 align:"center"

});


depthText=new Konva.Text({

 fontSize:12,

 fill:"#475569"

});


group.add(lengthText);
group.add(depthText);


}





const item={

 id:data.id,

 type:type,

 group,

 rect,

 lengthText,

 depthText,

 data,

 handles:null

};



parts.push(item);





applyCorners(item);



if(!wall){

 updateMeasure(item);

 drawEdges(item);

}

else{

 item.handles=createWallHandles(item);

}





// CLICK

group.on("click tap",(e)=>{

 e.cancelBubble=true;

 selectItem(item);

});





// HOVER

group.on("mouseenter",()=>{

 if(item!==selected){
  rect.stroke("#64748b");
 }

 setCursor("move");

 layer.batchDraw();

});




group.on("mouseleave",()=>{

 if(item!==selected){
  rect.stroke("#1e293b");
 }

 setCursor("default");

 layer.batchDraw();

});





// DRAG

// =======================================
// DRAG + MULTI MOVE
// =======================================

group.on("dragstart",()=>{

  if(!multiSelected.includes(item)){
    multiSelected = [item];
  }


  multiSelected.forEach(p=>{

    p.dragStartX = p.group.x();
    p.dragStartY = p.group.y();

  });

});





group.on("dragmove",()=>{


  if(
    multiSelected.length > 1 &&
    multiSelected.includes(item)
  ){


    const dx =
      group.x() - item.dragStartX;


    const dy =
      group.y() - item.dragStartY;



    multiSelected.forEach(p=>{


      if(p===item) return;


      p.group.x(
        p.dragStartX + dx
      );


      p.group.y(
        p.dragStartY + dy
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





layer.add(group);


fitCanvas();


layer.draw();


updateList();


return item;


}

// =======================================
// SELECT
// =======================================


function selectItem(item){

 selected=item;


 parts.forEach(p=>{


 const active=p===item;


 p.rect.stroke(
  active ? "#2563eb":"#1e293b"
 );


 p.rect.strokeWidth(
  active ? 4:2
 );



 if(p.handles){

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





// =======================================
// MEASUREMENTS
// =======================================


function updateMeasure(item){


if(item.type==="wall") return;


const {
 rect,
 lengthText,
 depthText,
 data
}=item;



lengthText.text(
 `${data.length} mm`
);


lengthText.width(
 rect.width()
);


lengthText.x(0);
lengthText.y(-18);




depthText.text(
 `${data.depth} mm`
);


depthText.x(
 rect.width()+8
);


depthText.y(
 rect.height()/2-6
);


}





// =======================================
// RESIZE
// =======================================


function resizePart(item){


const {
 rect,
 group,
 data,
 type
}=item;



const w=mmToPx(data.length);


const h =
type==="splash"
?
100
:
mmToPx(data.depth);




rect.width(w);
rect.height(h);



group.offsetX(w/2);
group.offsetY(h/2);



applyCorners(item);



if(type!=="wall"){

 updateMeasure(item);

 drawEdges(item);

}

else if(item.handles){

 positionWallHandles(item);

}



layer.draw();


}






// =======================================
// CORNERS
// =======================================


function applyCorners(item){


const c=item.data.corners;


item.rect.cornerRadius([

 c.tl ? RADIUS:0,

 c.tr ? RADIUS:0,

 c.br ? RADIUS:0,

 c.bl ? RADIUS:0

]);


}





// =======================================
// EDGES
// =======================================


function drawEdges(item){


const {
 group,
 rect,
 data
}=item;



group.find(".edgeMarker")
.forEach(m=>m.destroy());



function arrow(x,y,r){


group.add(

new Konva.RegularPolygon({

name:"edgeMarker",

x:x,

y:y,

sides:3,

radius:9,

rotation:r,

fill:"#2563eb",

listening:false

})

);


}





if(data.edges.top)
arrow(rect.width()/2,0,0);


if(data.edges.bottom)
arrow(rect.width()/2,rect.height(),180);



if(data.edges.left)
arrow(0,rect.height()/2,270);



if(data.edges.right)
arrow(rect.width(),rect.height()/2,90);



layer.draw();


}






// =======================================
// WALL HANDLES
// =======================================


function createWallHandles(item){


const group=item.group;
const rect=item.rect;


const style={

width:10,

height:18,

fill:"#2563eb",

cornerRadius:3,

draggable:true,

visible:false,

listening:false,

offsetX:5,

offsetY:9

};



const left=new Konva.Rect({

x:0,

y:rect.height()/2,

...style

});



const right=new Konva.Rect({

x:rect.width(),

y:rect.height()/2,

...style

});



group.add(left);
group.add(right);





right.on("dragmove",()=>{


right.y(rect.height()/2);



let min=mmToPx(WALL_MIN_LENGTH_MM);

let max=mmToPx(WALL_MAX_LENGTH_MM);



let nw=clamp(
 right.x(),
 min,
 max
);



right.x(nw);


rect.width(nw);


item.data.length=pxToMm(nw);



layer.batchDraw();


});





left.on("dragmove",()=>{


left.y(rect.height()/2);



let nw =
rect.width()-left.x();



nw=clamp(
 nw,
 mmToPx(WALL_MIN_LENGTH_MM),
 mmToPx(WALL_MAX_LENGTH_MM)
);



rect.width(nw);


item.data.length=pxToMm(nw);



left.x(0);

right.x(nw);



layer.batchDraw();


});





right.on("mouseenter",()=>setCursor("ew-resize"));
left.on("mouseenter",()=>setCursor("ew-resize"));



return {
 left,
 right
};


}





function positionWallHandles(item){


if(!item.handles)return;


item.handles.left.position({

x:0,

y:item.rect.height()/2

});


item.handles.right.position({

x:item.rect.width(),

y:item.rect.height()/2

});


}






function syncLengthInput(item){


if(selected!==item)return;


const input=
document.getElementById("editLength");


if(input)
 input.value=item.data.length;


}







// =======================================
// OBJECT LIST
// =======================================


function updateList(){


const list=document.getElementById("objectList");


if(!list)return;


list.innerHTML="";



const visible =
parts.filter(p=>p.type!=="wall");



if(visible.length===0){

list.innerHTML =
'<p class="empty">Inga objekt ännu</p>';

return;

}





visible.forEach(p=>{


const d=p.data;


const el=document.createElement("div");


el.className=
"object-item"+
(p===selected?" selected":"");



el.innerHTML=`

<b>${typeLabel(d.type)}</b><br>

${d.length} × ${d.depth} mm

${d.done?" ✓":""}

`;



el.onclick=()=>selectItem(p);


list.appendChild(el);



});


}






// =======================================
// STAGE SELECTION
// =======================================


stage.on("click tap",(e)=>{


if(
 e.target===stage ||
 e.target===background
){

 selectItem(null);

}


});






// =======================================
// STAGE SELECTION BOX
// =======================================

stage.on("mousedown",(e)=>{

 if(
   e.target!==stage &&
   e.target!==background
 ) return;


 selectionStart = stage.getRelativePointerPosition();


 selectionRect.visible(true);


 selectionRect.position(selectionStart);


 selectionRect.width(0);
 selectionRect.height(0);


});





stage.on("mousemove",()=>{


 if(!selectionStart) return;


 const pos = stage.getRelativePointerPosition();



 selectionRect.setAttrs({

   x:Math.min(
     pos.x,
     selectionStart.x
   ),

   y:Math.min(
     pos.y,
     selectionStart.y
   ),


   width:Math.abs(
     pos.x-selectionStart.x
   ),


   height:Math.abs(
     pos.y-selectionStart.y
   )

 });


 layer.batchDraw();


});





stage.on("mouseup",()=>{


 if(!selectionStart) return;



 const box =
 selectionRect.getClientRect();



 multiSelected=[];



 parts.forEach(p=>{


  if(
   Konva.Util.haveIntersection(
    box,
    p.group.getClientRect()
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

// =======================================
// PROPERTIES PANEL
// =======================================


function renderProperties(item){


const box =
document.getElementById("propertiesContent");


if(!box)return;



if(!item){

box.innerHTML="<p>Markera ett objekt</p>";

return;

}



const d=item.data;

const isWall =
item.type==="wall";



box.innerHTML = `


<h3>${typeLabel(d.type)}</h3>


<label>Längd (mm)</label>

<input 
id="editLength"
type="number"
value="${d.length}"
step="10">



<label>Djup (mm)</label>

<input
id="editDepth"
type="number"
value="${d.depth}"
step="10">



${!isWall ? `


<label>Kantprofil</label>

<select id="edgeSelect">

<option ${d.edgeProfile==="Rak"?"selected":""}>
Rak
</option>

<option ${d.edgeProfile==="Fasad"?"selected":""}>
Fasad
</option>

<option ${d.edgeProfile==="Rund"?"selected":""}>
Rund
</option>

</select>



<div class="edge-buttons">


<button data-edge="top">
↑ Bak
</button>


<button data-edge="bottom">
↓ Fram
</button>


<button data-edge="left">
← Vänster
</button>


<button data-edge="right">
→ Höger
</button>


</div>



<label>
<input 
type="checkbox"
id="doneCheck"
${d.done?"checked":""}>

Klar

</label>


`:""}




<div class="prop-actions">


<button id="rotateBtn">
↻ Rotera
</button>


<button id="deleteBtn">
🗑 Radera
</button>


</div>


`;





document.getElementById("editLength").onchange=e=>{


d.length =
clamp(
parseInt(e.target.value),
MIN_LENGTH_MM,
MAX_LENGTH_MM
);


resizePart(item);


};



document.getElementById("editDepth").onchange=e=>{


d.depth =
clamp(
parseInt(e.target.value),
MIN_DEPTH_MM,
MAX_DEPTH_MM
);



resizePart(item);


};






document.getElementById("rotateBtn").onclick=()=>{


d.rotation =
(d.rotation+90)%360;


item.group.rotation(d.rotation);


layer.draw();


};






document.getElementById("deleteBtn").onclick=()=>{


item.group.destroy();


parts =
parts.filter(p=>p!==item);


selected=null;


updateList();

renderProperties(null);


layer.draw();


};





if(!isWall){


document
.querySelectorAll("[data-edge]")
.forEach(btn=>{


btn.onclick=()=>{


let edge =
btn.dataset.edge;


d.edges[edge]=
!d.edges[edge];


drawEdges(item);


};


});




document.getElementById("doneCheck").onchange=e=>{


d.done=e.target.checked;


updateList();


};



}


}







// =======================================
// BUTTONS
// =======================================


document.getElementById("addCountertop")
.onclick=()=>addPart("countertop");



document.getElementById("addSplash")
.onclick=()=>addPart("splash");



document.getElementById("addWall")
.onclick=()=>addPart("wall");







const clearBtn =
document.getElementById("clearAll");



if(clearBtn){


clearBtn.onclick=()=>{


if(!confirm("Rensa allt?"))
return;



parts.forEach(p=>p.group.destroy());


parts=[];

selected=null;


updateList();

renderProperties(null);


layer.draw();


};


}







// =======================================
// DELETE KEY
// =======================================



window.addEventListener("keydown",e=>{


if(!selected)return;


if(
e.key==="Delete" ||
e.key==="Backspace"
){


item=selected;


item.group.destroy();


parts=
parts.filter(p=>p!==item);


selected=null;


updateList();

renderProperties(null);


layer.draw();


}


});









// =======================================
// SAVE
// =======================================


document.getElementById("saveProject")
.onclick=()=>{


const save =
parts.map(p=>({


data:p.data,


x:p.group.x(),

y:p.group.y(),


rotation:p.group.rotation()


}));



const blob =
new Blob(
[JSON.stringify(save,null,2)],
{type:"application/json"}
);



const a=document.createElement("a");


a.href =
URL.createObjectURL(blob);


a.download="koksskiva.json";


a.click();


};







// =======================================
// LOAD
// =======================================



document.getElementById("loadProject")
.onclick=()=>{


document.getElementById("fileInput").click();


};






document.getElementById("fileInput")
.onchange=e=>{


const file=e.target.files[0];


if(!file)return;



const reader=new FileReader();



reader.onload=()=>{


const data =
JSON.parse(reader.result);



parts.forEach(p=>p.group.destroy());


parts=[];


data.forEach(o=>{


let item =
addPart(o.data.type,o.data);



item.group.x(o.x);

item.group.y(o.y);

item.group.rotation(o.rotation);



});


layer.draw();


};



reader.readAsText(file);


};








// =======================================
// EXPORT IMAGE
// =======================================


document.getElementById("exportImage")
.onclick=()=>{


const uri =
stage.toDataURL({
pixelRatio:2
});



const a=document.createElement("a");


a.href=uri;


a.download="koksskiva.png";


a.click();


};






// =======================================
// RESIZE
// =======================================


window.addEventListener("resize",()=>{


stage.width(
canvasEl.clientWidth
);


stage.height(
canvasEl.clientHeight
);



background.width(stage.width());

background.height(stage.height());



fitCanvas();



});






updateList();

layer.draw();


}
