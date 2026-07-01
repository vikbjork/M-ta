window.addEventListener("DOMContentLoaded", () => {


const container =
document.getElementById("canvas-container");


const stage =
new Konva.Stage({

container:"canvas-container",

width:container.clientWidth,

height:container.clientHeight

});


const layer =
new Konva.Layer();


stage.add(layer);



let objects=[];

let selected=null;

let counter=1;



// ---------------------
// GRID SNAP
// ---------------------

function snap(value){

return Math.round(value / 10) * 10;

}




stage.on("click", e=>{

if(e.target === stage){

selected=null;

layer.draw();

}

});





// ---------------------
// BUTTONS
// ---------------------


document
.getElementById("addCountertop")
.onclick=()=>createPart("Bänkskiva");


document
.getElementById("addSplash")
.onclick=()=>createPart("Stänkskydd");


document
.getElementById("addWall")
.onclick=()=>createPart("Vägg");






// ---------------------
// CREATE
// ---------------------


function createPart(type){


let data={


id:counter++,

type,


length:
type==="Vägg"
?1200
:2400,


depth:
type==="Vägg"
?10
:620,


edgeProfile:"Rak",


edgeSides:{

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


rotation:0,


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





let measures =
new Konva.Group();


let edges =
new Konva.Group();


let topText =
new Konva.Text({

fontSize:14,

fill:"#1e293b"

});


let sideText =
new Konva.Text({

fontSize:14,

fill:"#1e293b"

});





measures.add(topText);

measures.add(sideText);





group.add(rect);

group.add(measures);


group.add(edges);


applyCorners(rect);


updateMeasures(group);


updateEdges(group);

}





group.on("click",()=>select(group));





group.on("dragmove",()=>{


group.x(
snap(group.x())
);


group.y(
snap(group.y())
);



updateMeasures(group);


});





layer.add(group);


objects.push(group);


layer.draw();


updateList();


}







// ---------------------
// CORNERS + EDGE
// ---------------------


function applyCorners(rect){


let c=rect.data.corners;


let radius=0;


if(
c.tl ||
c.tr ||
c.bl ||
c.br
){

radius=25;

}


rect.cornerRadius(radius);



if(rect.data.type==="Vägg"){

rect.cornerRadius(0);

}


}










// ---------------------
// MEASUREMENTS
// ---------------------


function updateMeasures(group){



let rect =
group.getChildren()[0];


let measure =
group.getChildren()[1];


let texts =
measure.getChildren();



texts[0].text(
rect.data.length+" mm"
);


texts[0].x(
rect.width()/2-40
);


texts[0].y(-25);





texts[1].text(
rect.data.depth+" mm"
);



texts[1].x(
rect.width()+15
);


texts[1].y(
rect.height()/2
);



}









// ---------------------
// SELECT
// ---------------------


function select(group){


selected=group;


objects.forEach(o=>{


o.getChildren()[0]
.strokeWidth(
o===group ? 4:2
);


});



showProperties(group);


layer.draw();

}








// ---------------------
// LIST
// ---------------------


function updateList(){


let list =
document.getElementById("objectList");


list.innerHTML="";



objects.forEach(o=>{


let d=o.getChildren()[0].data;



let item =
document.createElement("div");


item.style.background="#fff";

item.style.padding="8px";

item.style.marginBottom="6px";

item.style.borderRadius="8px";



item.innerHTML=

`
<b>${d.type}</b>

<br>

${d.length} x ${d.depth}

${d.done ? " ✓":""}

`;



item.onclick=()=>select(o);


list.appendChild(item);



});


}








// ---------------------
// PROPERTIES
// ---------------------


function showProperties(group){


let rect =
group.getChildren()[0];


let d=rect.data;



let box =
document.getElementById("propertiesContent");



box.innerHTML=

`

<b>${d.type}</b>

<br><br>


Längd

<input id="length"
value="${d.length}">


<br><br>


Djup

<input id="depth"
value="${d.depth}">



<br><br>


Kantprofil

<select id="profile">

<option>Rak</option>
<option>Fasad</option>
<option>Rund R10</option>

</select>


<br><br>


Kanter:

<br>

<input type="checkbox" id="top">
Överkant


<br>

<input type="checkbox" id="bottom">
Framkant


<br>

<input type="checkbox" id="left">
Vänster


<br>

<input type="checkbox" id="right">
Höger


<br><br>


Hörn:

<br>

<input type="checkbox" id="tl">
Övre vänster


<br>

<input type="checkbox" id="tr">
Övre höger


<br>

<input type="checkbox" id="bl">
Nedre vänster


<br>

<input type="checkbox" id="br">
Nedre höger


<br><br>


<button id="rotate">
Rotera 90°
</button>


`;





document.getElementById("length")
.onchange=e=>{

d.length=parseInt(e.target.value);

refresh(group);

};



document.getElementById("depth")
.onchange=e=>{

d.depth=parseInt(e.target.value);

refresh(group);

};





document.getElementById("profile")
.onchange=e=>{


d.edgeProfile=e.target.value;


if(e.target.value==="Rund R10"){

d.corners={
tl:true,
tr:true,
bl:true,
br:true
};

}


refresh(group);


};






["top","bottom","left","right"]
.forEach(side=>{


document.getElementById(side)
.onchange=e=>{


d.edgeSides[side]=e.target.checked;


layer.draw();


};


});





["tl","tr","bl","br"]
.forEach(c=>{


document.getElementById(c)
.onchange=e=>{


d.corners[c]=e.target.checked;


refresh(group);


};


});






document.getElementById("rotate")
.onclick=()=>{


d.rotation+=90;


group.rotation(d.rotation);


updateMeasures(group);


layer.draw();


};



}







function refresh(group){


let rect =
group.getChildren()[0];


rect.width(
rect.data.length/3
);


rect.height(
rect.data.depth/3
);



applyCorners(rect);


updateMeasures(group);


layer.draw();


updateList();


}





function updateEdges(group){

let edgeGroup =
group.getChildren()[3];

if(!edgeGroup){
    return;
}

let rect =
group.getChildren()[0];


let rect =
group.getChildren()[0];


let edgeGroup =
group.getChildren()[2];


edgeGroup.destroyChildren();



let d =
rect.data;



let size=12;




function triangle(x,y,rotation){


return new Konva.RegularPolygon({

x:x,

y:y,

sides:3,

radius:size,

rotation:rotation,

fill:"#1e293b"

});


}




if(d.edgeSides.top){

edgeGroup.add(
triangle(
rect.width()/2,
0,
0
));

}



if(d.edgeSides.bottom){


edgeGroup.add(
triangle(
rect.width()/2,
rect.height(),
180
));


}




if(d.edgeSides.left){


edgeGroup.add(
triangle(
0,
rect.height()/2,
270
));


}



if(d.edgeSides.right){


edgeGroup.add(
triangle(
rect.width(),
rect.height()/2,
90
));


}



}


window.onresize=()=>{

stage.width(container.clientWidth);

stage.height(container.clientHeight);

};



});
