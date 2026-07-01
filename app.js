window.addEventListener("DOMContentLoaded", () => {


const stage = new Konva.Stage({

container:"canvas-container",

width:800,

height:600

});


const layer = new Konva.Layer();

stage.add(layer);



document
.getElementById("addCountertop")
.onclick = () => {


let rect = new Konva.Rect({

x:100,
y:100,

width:300,
height:100,

fill:"#fff",

stroke:"#1e293b",

strokeWidth:2,

draggable:true

});


layer.add(rect);

layer.draw();


};



document
.getElementById("addSplash")
.onclick = () => {

alert("Stänkskydd fungerar");

};



document
.getElementById("addWall")
.onclick = () => {

alert("Vägg fungerar");

};



});
