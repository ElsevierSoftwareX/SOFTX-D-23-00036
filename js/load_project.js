jQuery(document).ready(function() {
    //var pathsad = require("path");
    //console.log(pathsad.resolve(__dirname, './projects/').replace(/\\/g,"/")+ "/" +localStorage.getItem("LoadProject") + "/project_images/");


    print_project_gallery();
    var show_slide = true;
    /* BETA TESTING FOR DIRECTORY FILES */
    function print_project_gallery() {
        jQuery('ul.project_gallery_render li').remove();
        //var get_path_images = './projects/' + localStorage.getItem("LoadProject").replace(" ", "") + '/project_images/';
        //const testFolder = __dirname + '/projects/' + localStorage.getItem("LoadProject").replace(" ", "") + '/project_images/';
        var pathsad = require("path");
        var final_correct_path = pathsad.resolve(__dirname, './projects/').replace(/\\/g,"/")+ "/" +localStorage.getItem("LoadProject") + "/project_images/";
        var fix_location = final_correct_path.split("/resources/app");
        const fs = require('fs');

        if(fix_location[1] == null){
            var final_link = fix_location[0];
        }else{
            var final_link = fix_location[0]+ fix_location[1];
        }

        fs.readdirSync(final_link.replace(" ","")).forEach(file => {

            if (file.indexOf(".jpg") != -1 || file.indexOf(".png") != -1 || file.indexOf(".jpeg") != -1) {
                //console.log(file);
                jQuery('ul.project_gallery_render').append('<li class="nav-item"><div class="gallery_image_Settings_hover"><i class="far fa-eye"></i></div><img src="' + final_link.replace(" ","") + file + '"></li>');
            }

        });

    }

    // check if load proejext exists
    var project_path = localStorage.getItem("LoadProject");

    var get_center = localStorage.getItem("LoadedProjectCenter");
    var clean_center = get_center.split(",");


    // Initialize map
    var map = L.mapbox.map('map').setView([parseFloat(clean_center[1]), parseFloat(clean_center[0])], 17);

    //var map = L.mapbox.map('map').setView([23.736116731514866, 37.97002501526711], 17);




    // Add layers to the map
    L.control.layers({
        'Satellite Map': L.mapbox.tileLayer('bobbysud.map-l4i2m7nd', {
            detectRetina: true
        }).addTo(map),
        'Terrain Map': L.mapbox.tileLayer('bobbysud.i2pfp2lb', {
            detectRetina: true
        })
    }).addTo(map);

    var featureGroup = L.featureGroup().addTo(map);

    var drawControl = new L.Control.Draw({
        edit: {
            featureGroup: featureGroup
        }
    }).addTo(map);

    // Ftiaxnw ton marker mou pou ousiastika einai to pou briskete to drone mou
    var drone_icon = L.icon({
        iconUrl: 'img/our_marker.png',
        /*shadowUrl: 'img/leaf-shadow.png',*/

        iconSize: [50, 73], // size of the icon
        shadowSize: [50, 64], // size of the shadow
        //iconAnchor:   [22, 94], // point of the icon which will correspond to marker's location
        iconAnchor: [25, 70], // point of the icon which will correspond to marker's location
        shadowAnchor: [4, 62], // the same for the shadow
        popupAnchor: [0, -76] // point from which the popup should open relative to the iconAnchor
    });

    const path = require('path');


    /* LISTEN NEW SERVICE  UPLOAD FILE TO PROJECT FILE */
    const express = require('express');
    const multer = require('multer');
    const upload = multer();
    var bodyParser = require("body-parser");
    const fs = require('fs');

    var app = express();
    app.use(express.static(__dirname));

    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());


    app.post('/drone_location', function(req, res) {

        var location = req.body;
         
        var drone_longtitude = location.DataObject.position[0]["longitude"];
        var drone_latitude = location.DataObject.position[0]["latitude"];

        //delete previous mark if exist
        jQuery('.leaflet-marker-pane img').remove();

        // draw new marker [Current] drone location
               var marker = L.marker(
            [drone_longtitude,drone_latitude], {
                title: 'Drone Current Position',
                icon: drone_icon
            }
        ).addTo(map);

        map.panTo(new L.LatLng(drone_longtitude, drone_latitude));

        

        
       res.status(200).send('Drone Location Received');
    });



    app.post('/calculated_path', function(req, res) {
        //console.log(req.body);
        
        
        var path = req.body;
        console.log(path);
        var pointList = [];
        
        for(var points=0; points < path.DataObject.path.waypoints.length; points++){
           
            //var tmp_point = new L.LatLng(path.DataObject.path.waypoints[points]);


            var test= String(path.DataObject.path.waypoints[points]);
            //console.log(test);
            var res_g = test.split("{latitude: ", 3);
            var res_t = test.split(", lognitude :", 3);
            var lon = res_t[1].split(" }",3);
            var lat = res_g[1].split(" ,",3);

            var tmp_point = new L.LatLng($.trim(lon[0]),$.trim(lat[0]));
            pointList.push(tmp_point);
        }
        console.log(pointList);
        var firstpolyline = new L.Polyline(pointList, {
            color: 'red',
            weight: 3,
            opacity: 0.5,
            smoothFactor: 1
        });
        // This is an amazing polyline in order to communicate 
        firstpolyline.addTo(map);

        //console.log(pointList);
        
       res.status(200).send('Path Received');

       jQuery('#pop_up_container').fadeOut();
       jQuery('.button_all_ok').attr('style','display:block;');

       // Exei lifthei to monopati opote to apothikeuw se arxeio ston fakelo tou project

        // register variables in order to send it to json
        var altitude = jQuery('#altitude_show').val().split("m",2);
        var gimbal_pitch = jQuery('input#gimbal_pitch').val().split("°",2);
        var n_speed = jQuery('input#drone_speed').val().split("m/s",2);

        var create_json = '{ "SenderID":"IKHEditor", "DataObject": { "path": { "waypoints": '+JSON.stringify(pointList)+' , "altitude": '+parseFloat(altitude[0])+', "speed": '+parseFloat(n_speed[0])+', "Gimbal Pitch": '+parseFloat(gimbal_pitch[0])+' } } }'; 
        
       // get pathname of project
       var plan_name = jQuery('input#plan_name').val();
       console.log('Trying to create the folder');
       // make dir if does not exist and create file with path included
       fs.mkdir('./projects/' + plan_name + '/paths', function() {
           fs.writeFileSync('./projects/' + plan_name + '/paths/calculated_path.json', JSON.stringify(create_json));
       });

       // Send post with json data to DJI ADAPTOR
       /*
       jQuery.ajax({
            type: "POST",
            url: "http://localhost:5000/",
            // The key needs to match your method's input parameter (case-sensitive).
            data: JSON.stringify(create_json),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function(data){console.log('Received from the server');},
            failure: function(errMsg) {
                console.log(errMsg);
            }
        });       
        */


    });


    // GET POST UPLOAD IMAGE FUNCTION 
    app.post('/post_image/', upload.any(), (req, res) => {
        //console.log('POST /post_image/');
        //console.log('Files: ', req.files);
        if (show_slide) {
            show_slide_message("Gallery Sync Started");
        }
        fs.writeFile('./projects/' + localStorage.getItem("LoadProject").replace(" ", "") + '/project_images/' + req.files[0].originalname, req.files[0].buffer, (err) => {
            if (err) {
                console.log('Error: ', err);
                res.status(500).send('An error occurred: ' + err.message);
            } else {
                res.status(200).send('ok');
                // FS CHECK DIRECTORY IMAGES and recreate thumbnails
                // function gia na sbisw oles tis photo pou uphrxan kai na rendarw tiw kainourgies
                print_project_gallery();

            }
        });
    });




    app.listen(process.env.PORT || 8081);


    // Function pou deixnei slide message gia kapoia wra kai meta to krubei 
    function show_slide_message(message_string) {
        jQuery('.slide_messages ul p').text(message_string);

        if (show_slide = true) {
            show_slide = false;
            jQuery(".slide_messages ul").animate({
                width: 'toggle'
            }, 350);

        }

        //setimout
        setTimeout(function() {

            jQuery(".slide_messages ul").animate({
                width: 'toggle'
            }, 350);

        }, 5000);

        setTimeout(function() {

            show_slide = true;

        }, 10000);




    }


    // Calculate path button trigger
    jQuery('div#calculate_path_planing').click(function() {

        var get_time_now = new Date().toLocaleTimeString('en-GB', { hour: "numeric", minute: "numeric",second: "numeric"});

        var polygon_object = JSON.parse(load_map_project_w_o_render());
        var coordnites = polygon_object["features"][0]["geometry"]["coordinates"];
        //console.log(coordnites[0].length);
        var create_polygon = [];
        for (var f = 0; f < coordnites[0].length; f++) {

            if (f + 1 == coordnites[0].length) {
               //console.log('{"latitude": ' + coordnites[0][f][0] + ', "longitude": ' + coordnites[0][f][1] + '}],');
                create_polygon.push('{"latitude": ' + coordnites[0][f][1] + ', "longitude": ' + coordnites[0][f][0] + '}],');
            } else if (f == 0) {
                //console.log('[{"latitude": ' + coordnites[0][f][0] + ', "longitude": ' + coordnites[0][f][1] + '},');
                create_polygon.push('[{"latitude": ' + coordnites[0][f][1] + ', "longitude": ' + coordnites[0][f][0] + '},');
            } else {
                create_polygon.push('{"latitude": ' + coordnites[0][f][1] + ', "longitude": ' + coordnites[0][f][0] + '},');
                //console.log('{"latitude": ' + coordnites[0][f][0] + ', "longitude": ' + coordnites[0][f][1] + '},');
            }

        }

        // final creation of polygon 
        var final_string = '{ "SenderID":"IKHEditor", "DataObject": { "mission_id": 1, "start_time": "'+get_time_now+'", "area": { "polygon":';
        for (var final_text = 0; final_text < create_polygon.length; final_text++) {
            final_string += create_polygon[final_text];
        }
        final_string += '"scanning_distance": '+jQuery('input#scanning_distance_now').val().replace("m","")+' } } }';
        console.log(final_string);

        // Send to python script the polygon
        var data = ''+ final_string;

        jQuery.ajax({
            type: "POST",
            url: "http://localhost:5000/",
            // The key needs to match your method's input parameter (case-sensitive).
            data: JSON.stringify(data),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function(data){console.log('Received from the server');},
            failure: function(errMsg) {
                console.log(errMsg);
            }
        });

        // show loading pop up
        jQuery('#pop_up_container').fadeIn();
        jQuery('.pop_up_content').prepend('<div class="loader loader--style5" title="4"> <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="24px" height="30px" viewBox="0 0 24 30" style="enable-background:new 0 0 50 50;" xml:space="preserve"> <rect x="0" y="0" width="4" height="10" fill="#333"> <animateTransform attributeType="xml" attributeName="transform" type="translate" values="0 0; 0 20; 0 0" begin="0" dur="0.6s" repeatCount="indefinite" /> </rect> <rect x="10" y="0" width="4" height="10" fill="#333"> <animateTransform attributeType="xml" attributeName="transform" type="translate" values="0 0; 0 20; 0 0" begin="0.2s" dur="0.6s" repeatCount="indefinite" /> </rect> <rect x="20" y="0" width="4" height="10" fill="#333"> <animateTransform attributeType="xml" attributeName="transform" type="translate" values="0 0; 0 20; 0 0" begin="0.4s" dur="0.6s" repeatCount="indefinite" /> </rect> </svg> </div>');
        jQuery('.pop_up_content p').text('Path Calculation Started');
        jQuery('.button_all_ok').attr('style','display:none;');

    });

    // START PATH BUTTON TRIGGER
    jQuery('div#start_scanning').click(function() {

        // SEND POST REQUEST TO DRONE IN ORDER TO START THE EXCECUTION OF PATH


    });


    // function in order to call loaded project settings

    function load_project_settings() {
        var fs = require('fs');

        var contents = fs.readFileSync('./projects/' + project_path.replace(" ", "") + '/proj_settings.json', 'utf8');
        return contents;
    }

    //initialize project map and render it into map
    load_map_project();

    // render again input slider 
    function load_map_project() {
        var fs = require('fs');

        var contents = fs.readFileSync('./projects/' + project_path.replace(" ", "") + '/map_data.geojson', 'utf8');
        L.geoJson(JSON.parse(contents)).addTo(map);
        return contents;
    }


    // return polygon map with out render it on map 
    function load_map_project_w_o_render() {
        var fs = require('fs');

        var contents = fs.readFileSync('./projects/' + project_path.replace(" ", "") + '/map_data.geojson', 'utf8');
        return contents;
    }


    // Load Project // Fill Elements
    var loaded_project = JSON.parse(load_project_settings());
    jQuery('input#plan_name').val(loaded_project.CoFly.Plan_Name);
    jQuery('span#acres_num').text(loaded_project.CoFly.Calculated_Acres);
    jQuery('span#minutes_calc').text(loaded_project.CoFly.Calculated_Minutes);
    jQuery('input.input-range--custom.altitude').val(parseInt(loaded_project.CoFly.Altitude));
    jQuery('input#altitude_show').val(parseInt(loaded_project.CoFly.Altitude) + 'm');
    jQuery('input#direction_show').val(parseInt(loaded_project.CoFly.Rotation) + '°');
    jQuery('input.input-range--custom.direction').val(parseInt(loaded_project.CoFly.Rotation));
    update_viewer_slider_altitude();
    update_viewer_slider_rotation();



    function update_viewer_slider_altitude() {

        var fillColor = "rgba(254,200,64,1)",
            emptyColor = "rgba(238,238,238, 1)";

        var percent = 100 * (document.querySelector('input.altitude').value - document.querySelector('input.altitude').min) / (document.querySelector('input.altitude').max - document.querySelector('input.altitude').min) + '%';
        document.querySelector('input.altitude').style.backgroundImage = `linear-gradient( to right, ${fillColor}, ${fillColor} ${percent}, ${emptyColor} ${percent})`;

    }

    function update_viewer_slider_rotation() {

        var fillColor = "rgba(254,200,64,1)",
            emptyColor = "rgba(238,238,238, 1)";

        var percent = 100 * (document.querySelector('input.direction').value - document.querySelector('input.direction').min) / (document.querySelector('input.direction').max - document.querySelector('input.direction').min) + '%';
        document.querySelector('input.direction').style.backgroundImage = `linear-gradient( to right, ${fillColor}, ${fillColor} ${percent}, ${emptyColor} ${percent})`;

    }

    jQuery('div#exit_button').click(function() {
        window.location = "./index.html";
    });

    jQuery('.button_all_ok').click(function() {

        jQuery('div#pop_up_container').fadeOut();

    });



    // Gallery Image click listener
    
    jQuery(document).on("click", '.nav-item div', function() {

        var get_image_path = jQuery(this).closest('li').find('img').attr('src');
        //console.log(get_image_path);
        if(jQuery('#div#lightbox').css('display') == 'none')
        {
            jQuery('div#lightbox').attr('style','background-image:url("'+get_image_path+'"); display:block;');

        }else{
            jQuery('div#lightbox').css('display','block');
            jQuery('div#lightbox').attr('style','background-image:url("'+get_image_path+'"); display:block;');

        }


    });

    // Close Image Shower Action

    jQuery('.close_image_shower').click(function(){

        jQuery('div#lightbox').fadeOut();

    });






});