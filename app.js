window.addEventListener("DOMContentLoaded", () => {

const container = document.getElementById("canvas-container");

const stage = new Konva.Stage({
    container: "canvas-container",
    width: container.clientWidth,
    height: container.clientHeight
});

const layer = new Konva.Layer();
stage.add(layer);


let items = [];
let selected = null;
let counter = 1;


// ---------------------------
// BUTTONS
// ---------------------------

document.getElementById("addCountertop")
.onclick = () => createItem("Bänkskiva");


document.getElementById("addSplash")
.onclick = () => createItem("Stänkskydd");


document.getElementById("addWall")
.onclick = () => createItem("Vägg");



document.getElementById("exportImage")
.onclick = () => {

    const a = document.createElement("a");

    a.download="skiss.png";

    a.href =
    stage.toDataURL({
        pixelRatio:2
    });

    a.click();

};




// ---------------------------
// CREATE
// ---------------------------


function createItem(type){


let data = {

id: counter++,

type:type,

length: type==="Vägg" ? 1200 : 2400,

depth: type==="Vägg" ? 10 : 620,

edge:"Rak",

corners:{
tl:false,
tr:false,
bl:false,
br:false
},

edges:{
top:false,
bottom:false,
left:false,
right:false
},

done:false,

rotation:0

};



let group = new Konva.Group({

x:200,

y:150,

draggable:true

});



let rect = new Konva.Rect({

width:data.length/3,

height:data.depth/3,

fill:
type==="Vägg"
?
"#94a3b8"
:
"#ffffff",

stroke:"#1e293b",

strokeWidth:2,

cornerRadius:0

});


rect.data=data;




let measure = new Konva.Text({

fontSize:14,

fill:"#1e293b",

x:0,

y:-25,

text:""

});




group.add(rect);
group.add(measure);



group.on("click",()=>select(group));


group.on("dragmove",()=>{

    updateMeasure(group);

});



layer.add(group);

items.push(group);


updateShape(group);

updateList();

layer.draw();

}





// ---------------------------
// SELECT
// ---------------------------


function select(group){

selected=group;

items.forEach(i=>{

i.getChildren()[0]
.strokeWidth(
i===group ? 4 : 2
);

});


showProperties(group);

layer.draw();

}





// ---------------------------
// SHAPE
// ---------------------------


function updateShape(group){


let rect =
group.getChildren()[0];


let d=rect.data;



rect.width(d.length/3);

rect.height(d.depth/3);



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



updateMeasure(group);

}





// ---------------------------
// MEASURE
// ---------------------------


function updateMeasure(group){


let rect =
group.getChildren()[0];


let text =
group.getChildren()[1];


text.text(
`${rect.data.length} x ${rect.data.depth} mm`
);


text.x(
rect.width()/2-50
);


}





// ---------------------------
// LIST
// ---------------------------


function updateList(){


const list =
document.getElementById("objectList");


list.innerHTML="";



items.forEach(item=>{


let d=item.getChildren()[0].data;



let div=document.createElement("div");


div.style.padding="8px";

div.style.marginBottom="5px";

div.style.background="#fff";

div.style.borderRadius="8px";


div.innerHTML =
`
<b>${d.type}</b>
<br>
${d.length} x ${d.depth}
${d.done ? " ✓":""}
`;



div.onclick=()=>select(item);


list.appendChild(div);



});

}





// ---------------------------
// PANEL
// ---------------------------


function showProperties(group){


let rect =
group.getChildren()[0];


let d=rect.data;


let box =
document.getElementById("propertiesContent");



box.innerHTML = `


<b>${d.type}</b>

<br><br>


Längd

<input id="len" value="${d.length}">


<br><br>


Djup

<input id="dep" value="${d.depth}">


<br><br>


Kantprofil

<select id="edge">

<option>Rak</option>
<option>Fasad</option>
<option>Rund</option>

</select>


<br><br>


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


<br><br>


<button id="rotate">
Rotera 90°
</button>


<br><br>


<label>
<input type="checkbox" id="done">
Klar
</label>

`;



document.getElementById("len").onchange=e=>{

d.length=parseInt(e.target.value);

updateShape(group);

};


document.getElementById("dep").onchange=e=>{

d.depth=parseInt(e.target.value);

updateShape(group);

};



["tl","tr","bl","br"]
.forEach(c=>{


document.getElementById(c)
.onchange=e=>{


d.corners[c]=e.target.checked;

updateShape(group);

};


});




document.getElementById("rotate")
.onclick=()=>{


d.rotation+=90;

group.rotation(
d.rotation
);


};




document.getElementById("done")
.onchange=e=>{


d.done=e.target.checked;

updateList();

};



}



// ---------------------------
// SAVE / LOAD
// ---------------------------


document.getElementById("saveProject")
.onclick=()=>{


let save = items.map(g=>({

data:g.getChildren()[0].data,

x:g.x(),

y:g.y(),

rotation:g.rotation()

}));


let blob =
new Blob(
[
JSON.stringify(save)
],
{
type:"application/json"
});


let a=document.createElement("a");

a.href=URL.createObjectURL(blob);

a.download="projekt.json";

a.click();

};




// ---------------------------
// RESIZE
// ---------------------------


window.addEventListener("resize",()=>{


stage.width(container.clientWidth);

stage.height(container.clientHeight);

stage.draw();

});



});
