// =======================================
// KÖKSSKIVA RITVERKTYG
// APP.JS v4 - DEL 1
// =======================================


window.addEventListener("DOMContentLoaded", () => {


const canvas =
document.getElementById("canvas-container");


const stage =
new Konva.Stage({

    container: "canvas-container",

    width: canvas.clientWidth,

    height: canvas.clientHeight

});



const background =
new Konva.Rect({

    x:0,
    y:0,

    width:stage.width(),

    height:stage.height(),

    fill:"#eef3f8",

    listening:false

});



const grid =
new Konva.Layer();



stage.add(grid);


grid.add(background);



const layer =
new Konva.Layer();


stage.add(layer);




let parts=[];

let selected=null;

let nextId=1;





// =======================================
// BUTTONS
// =======================================


document
.getElementById("addCountertop")
.onclick=()=>addPart("countertop");



document
.getElementById("addSplash")
.onclick=()=>addPart("splash");



document
.getElementById("addWall")
.onclick=()=>addPart("wall");





// =======================================
// CREATE PART
// =======================================


function addPart(type){


let data = {


id:nextId++,

type,


length:
type==="wall"
?
1200
:
2400,


depth:
type==="wall"
?
10
:
620,


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





let group =
new Konva.Group({

x:200,

y:200,

draggable:true

});





let rect =
new Konva.Rect({

width:data.length/3,

height:data.depth/3,


fill:
type==="wall"
?
"#64748b"
:
"#ffffff",


stroke:"#1e293b",

strokeWidth:2,


cornerRadius:0,


draggable:true


});



rect.data=data;






let measure =
new Konva.Text({

fontSize:14,

fill:"#1e293b",

align:"center"

});





group.add(rect);

group.add(measure);




if(type!=="wall"){

updateMeasure(group);

}





group.on("click",()=>{

select(group);

});





group.on("dragmove",()=>{


group.x(
Math.round(group.x()/10)*10
);


group.y(
Math.round(group.y()/10)*10
);


updateMeasure(group);


});






layer.add(group);


parts.push(group);


layer.draw();


updateList();


}









// =======================================
// SELECT
// =======================================


function select(group){


selected=group;



parts.forEach(p=>{


p.getChildren()[0]
.strokeWidth(
p===group ? 4 : 2
);



});



showProperties(group);


layer.draw();


}









// =======================================
// MEASUREMENTS
// =======================================


function updateMeasure(group){



let rect =
group.getChildren()[0];


let text =
group.getChildren()[1];



let d=rect.data;




text.text(
`${d.length} mm\n${d.depth} mm`
);



text.x(
rect.width()/2-45
);



text.y(
-40
);



}









// =======================================
// RESIZE OBJECT
// =======================================


function resizePart(group){


let rect =
group.getChildren()[0];


let d=rect.data;



rect.width(
d.length/3
);


rect.height(
d.depth/3
);



applyCorners(rect);



updateMeasure(group);



layer.draw();



}









// =======================================
// CORNERS
// =======================================


function applyCorners(rect){



let d=rect.data;


let radius=0;



if(
d.corners.tl ||
d.corners.tr ||
d.corners.bl ||
d.corners.br
){

radius=25;

}



rect.cornerRadius(radius);


}








// =======================================
// LIST
// =======================================


function updateList(){


const list =
document.getElementById("objectList");


list.innerHTML="";



parts
.filter(p=>
p.getChildren()[0].data.type!=="wall"
)
.forEach(p=>{


let d=p.getChildren()[0].data;



let item =
document.createElement("div");



item.className="object-item";



item.innerHTML=

`
<b>${d.type==="countertop"
?"Bänkskiva"
:"Stänkskydd"}</b>

<br>

${d.length} x ${d.depth} mm

${d.done?" ✓":""}

`;



item.onclick=()=>select(p);



list.appendChild(item);



});


}








// =======================================
// RESIZE WINDOW
// =======================================


window.addEventListener(
"resize",
()=>{


stage.width(
canvas.clientWidth
);


stage.height(
canvas.clientHeight
);



background.width(
stage.width()
);


background.height(
stage.height()
);



layer.draw();


});



});

// =======================================
// APP.JS v4 - DEL 2
// =======================================



function showProperties(group){


let box =
document.getElementById("propertiesContent");


let rect =
group.getChildren()[0];


let d =
rect.data;



box.innerHTML = `


<h3>
${
d.type==="countertop"
?"Bänkskiva"
:
d.type==="splash"
?"Stänkskydd"
:
"Vägg"
}
</h3>


Längd (mm)

<input id="editLength"
value="${d.length}">


<br><br>


Djup (mm)

<input id="editDepth"
value="${d.depth}">



<br><br>


${d.type!=="wall" ? `


Kantprofil


<select id="edgeSelect">


<option>Rak</option>

<option>Fasad</option>

<option>Rund</option>


</select>



<div id="edgeButtons">


<button data-edge="top">
↑ Topp
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



<br>


Rundade hörn


<br>


<label>
<input type="checkbox" id="tl">
Övre vänster
</label>


<br>


<label>
<input type="checkbox" id="tr">
Övre höger
</label>


<br>


<label>
<input type="checkbox" id="bl">
Nedre vänster
</label>


<br>


<label>
<input type="checkbox" id="br">
Nedre höger
</label>


<br>


<br>

<button id="rotateBtn">
↻ Rotera
</button>


<button id="deleteBtn">
🗑 Radera
</button>


<br><br>


<label>

<input 
type="checkbox"
id="doneCheck"
${d.done?"checked":""}
>

Klar

</label>


`
:
""
}



`;





document
.getElementById("editLength")
.onchange=e=>{


d.length =
parseInt(e.target.value);


resizePart(group);


};




document
.getElementById("editDepth")
.onchange=e=>{


d.depth =
parseInt(e.target.value);


resizePart(group);


};






if(d.type!=="wall"){



document
.getElementById("edgeSelect")
.value=d.edgeProfile;



document
.getElementById("edgeSelect")
.onchange=e=>{


d.edgeProfile =
e.target.value;


drawEdges(group);


};





document
.querySelectorAll("#edgeButtons button")
.forEach(btn=>{


btn.onclick=()=>{


let side =
btn.dataset.edge;



d.edges[side]=
!d.edges[side];



drawEdges(group);


};


});





["tl","tr","bl","br"]
.forEach(c=>{


document
.getElementById(c)
.checked =
d.corners[c];



document
.getElementById(c)
.onchange=e=>{


d.corners[c]=
e.target.checked;


resizePart(group);


};


});






document
.getElementById("rotateBtn")
.onclick=()=>{


d.rotation+=90;


group.rotation(
d.rotation
);



};





document
.getElementById("deleteBtn")
.onclick=()=>{


group.destroy();



parts =
parts.filter(
p=>p!==group
);



selected=null;


updateList();


layer.draw();


};





document
.getElementById("doneCheck")
.onchange=e=>{


d.done=e.target.checked;


updateList();


};



}


}









// =======================================
// EDGE MARKERS
// =======================================


function drawEdges(group){



let old =
group.find(".edgeMarker");



old.destroy();



let rect =
group.getChildren()[0];


let d =
rect.data;



let size=10;



function addArrow(x,y,rot){


group.add(

new Konva.RegularPolygon({

name:"edgeMarker",

x,

y,

sides:3,

radius:size,

rotation:rot,

fill:"#1e293b"

})

);


}



if(d.edges.top){

addArrow(
rect.width()/2,
0,
0
);

}



if(d.edges.bottom){

addArrow(
rect.width()/2,
rect.height(),
180
);

}



if(d.edges.left){

addArrow(
0,
rect.height()/2,
270
);

}



if(d.edges.right){

addArrow(
rect.width(),
rect.height()/2,
90
);

}


layer.draw();


}








// =======================================
// SAVE
// =======================================


document
.getElementById("saveProject")
.onclick=()=>{


let save =
parts.map(p=>{


let d =
p.getChildren()[0].data;



return {

data:d,

x:p.x(),

y:p.y(),

rotation:p.rotation()

};


});



let blob =
new Blob(
[
JSON.stringify(save,null,2)
],
{
type:"application/json"
}
);



let a =
document.createElement("a");



a.href =
URL.createObjectURL(blob);



a.download =
"köksskiva.json";


a.click();



};









// =======================================
// LOAD
// =======================================


document
.getElementById("loadProject")
.onclick=()=>{


document
.getElementById("fileInput")
.click();


};





document
.getElementById("fileInput")
.onchange=e=>{


let file =
e.target.files[0];


if(!file)return;



let reader =
new FileReader();



reader.onload=()=>{


let data =
JSON.parse(reader.result);



data.forEach(item=>{


let old =
item.data;



addPart(old.type);


let obj =
parts[parts.length-1];


obj.x(item.x);

obj.y(item.y);

obj.rotation(
item.rotation
);


obj.getChildren()[0]
.data=old;



resizePart(obj);


});



};



reader.readAsText(file);


};









// =======================================
// EXPORT
// =======================================


document
.getElementById("exportImage")
.onclick=()=>{


let temp =
new Konva.Layer();


temp.add(
background.clone()
);



temp.add(
layer.clone()
);



stage.add(temp);



let img =
stage.toDataURL({

pixelRatio:2

});



temp.destroy();



let a =
document.createElement("a");


a.href=img;


a.download=
"koksskiva.png";


a.click();



};
