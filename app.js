// =====================================
// KÖKSSKIVA RITVERKTYG
// APP.JS
// =====================================


window.addEventListener("DOMContentLoaded", () => {


    const container = document.getElementById("canvas-container");


    const stage = new Konva.Stage({

        container: container,

        width: container.clientWidth,

        height: container.clientHeight

    });


    const layer = new Konva.Layer();

    stage.add(layer);



    let objects = [];

    let idCounter = 1;



    const addCountertop =
        document.getElementById("addCountertop");

    const addSplash =
        document.getElementById("addSplash");

    const addWall =
        document.getElementById("addWall");



    addCountertop.onclick = () => {
        createPart("Bänkskiva");
    };


    addSplash.onclick = () => {
        createPart("Stänkskydd");
    };


    addWall.onclick = () => {
        createPart("Vägg");
    };





    function createPart(type){


        let width = 300;
        let height = 100;



        if(type === "Bänkskiva"){

            width = 500;
            height = 130;

        }


        if(type === "Stänkskydd"){

            width = 500;
            height = 60;

        }


        if(type === "Vägg"){

            width = 400;
            height = 10;

        }



        const rect = new Konva.Rect({

            x:200,

            y:150,

            width:width,

            height:height,

            fill:
            type==="Vägg"
            ?
            "#94a3b8"
            :
            "#ffffff",


            stroke:"#1e293b",

            strokeWidth:2,

            draggable:true,

            cornerRadius:6

        });



        rect.data = {

            id:idCounter++,

            type:type,

            width:width,

            height:height,

            edge:"",
            
            roundedCorners:[],

            done:false

        };




        rect.on("click",()=>{

            showInfo(rect);

        });



        layer.add(rect);

        layer.draw();



        objects.push(rect);


        updateList();


    }







    function updateList(){


        const list =
        document.getElementById("objectList");


        list.innerHTML="";



        objects.forEach(obj=>{


            const div =
            document.createElement("div");


            div.style.background="#fff";

            div.style.padding="8px";

            div.style.marginBottom="6px";

            div.style.borderRadius="8px";


            div.innerHTML =
            `
            ${obj.data.type}
            #${obj.data.id}
            <br>
            ${obj.data.width} x ${obj.data.height}
            `;



            list.appendChild(div);



        });


    }






    function showInfo(obj){


        const box =
        document.getElementById("propertiesContent");


        box.innerHTML =
        `

        <b>${obj.data.type}</b>

        <br><br>

        Längd:
        <input value="${obj.data.width}">


        <br><br>


        Mått:
        ${obj.data.width} x ${obj.data.height}


        <br><br>


        Kantprofil:
        <input placeholder="t.ex Rak">


        <br><br>


        Rundade hörn:
        <br>

        □ Övre vänster
        <br>
        □ Övre höger
        <br>
        □ Nedre vänster
        <br>
        □ Nedre höger


        `;


    }






    window.addEventListener("resize",()=>{


        stage.width(container.clientWidth);

        stage.height(container.clientHeight);

        stage.draw();


    });



});
