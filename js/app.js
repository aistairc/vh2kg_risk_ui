$(function() {
    var file_map = {};
    var repository = "vh2kg_ieee_access_202204";
    var endpointURL = "http://localhost:7200/repositories/";
    var url = endpointURL + repository;
    var scene = "1";
    var activity_time_map = {};

    /* Function */

    function getActivityTime(video_name) {
        activity_time_map[video_name] = {};
        let sparql = `
        PREFIX : <http://example.org/virtualhome2kg/ontology/>
        PREFIX time: <http://www.w3.org/2006/time#>
        PREFIX vh2kg: <http://example.org/virtualhome2kg/instance/>
        SELECT ?event ?id ?duration WHERE { 
            vh2kg:${video_name.toLowerCase()}_scene${scene} :hasEvent ?event .
            ?event :time ?time ;
                   :eventNumber ?id .
            ?time time:numericDuration ?duration .
        } order by asc(?id)`;
        $.getJSON(url, { "query": sparql }, function(data) {
            let bindings = data.results.bindings;
            let total_time = 0;
            for (i = 0; i < bindings.length; i++) {
                let event = bindings[i].event.value;
                let duration = parseFloat(bindings[i].duration.value);
                duration = duration / 1.2686;
                let id = bindings[i].id.value;
                event = event.replace("http://example.org/virtualhome2kg/instance/", "");
                event = event.replace("_scene" + scene, "");
                activity_time_map[video_name][event] = [total_time, duration];
                total_time += duration;
            }
            return false;
        });
        return false;
    }

    function getRiskFactor(video_name) {
        let sparql = `
        PREFIX hra: <http://example.org/virtualhome2kg/ontology/homeriskactivity/>
        PREFIX vh2kg: <http://example.org/virtualhome2kg/instance/>
        SELECT DISTINCT ?risk_factor WHERE {
        vh2kg:${video_name.toLowerCase()}_scene${scene} a hra:RiskActivity ;
    	    hra:riskFactor ?risk_factor .
        }`;
        $.getJSON(url, { "query": sparql }, function(data) {
            let bindings = data.results.bindings;
            let risk_factors = [];
            $("#factor").empty();
            for (i = 0; i < bindings.length; i++) {
                let rf = bindings[i].risk_factor.value;
                rf = rf.replace("http://example.org/virtualhome2kg/instance/", "")
                rf = rf.replace("_scene" + scene, "");
                risk_factors.push(rf);
                let li = $("<li></li>");
                li.addClass("list-group-item");
                li.addClass("risk-factor");
                li.attr("video-name", video_name);
                li.text(rf);
                $("#factor").append(li);
            }
            return false;
        });
        return false;
    }

    function highlight(risk_list) {
        for (var risk_activity of risk_list) {
            let risk_elem = $("#" + risk_activity);
            risk_elem.css("background-color", "#FFFF00");
            risk_elem.attr("risk", true);
        }
        return false;
    }

    function riskSearch() {
        let sparql = `
        PREFIX hra: <http://example.org/virtualhome2kg/ontology/homeriskactivity/>
        SELECT DISTINCT ?s WHERE {
            ?s a hra:RiskActivity .
        }`;
        let url = endpointURL + repository + "?query=" + encodeURI(sparql);
        $.getJSON(url, function(data) {
            let bindings = data.results.bindings;
            let risk_list = [];
            for (i = 0; i < bindings.length; i++) {
                let s = bindings[i].s.value;
                s = s.replace("http://example.org/virtualhome2kg/instance/", "")
                s = s.replace("_scene" + scene, "")
                risk_list.push(s);
            }
            highlight(risk_list);
            return false;
        });
        return false;
    }

    function loadFiles(ev) {
        for (let i = 0; i < ev.target.files.length; i++) {
            let file = ev.target.files[i];

            let relativePath = file.webkitRelativePath;

            let fileReader = new FileReader();
            fileReader.onload = (function(theFile) {
                return function(e) {
                    let video_name = theFile.name.replace("1.mp4", "");
                    file_map[video_name] = URL.createObjectURL(theFile);
                    let li = document.createElement("li");
                    li.classList.add("list-group-item");
                    li.classList.add("videolist");
                    li.id = video_name.toLowerCase();
                    li.innerText = video_name;
                    document.getElementById("list").append(li);
                };
            })(file);

            fileReader.readAsDataURL(file);
        }
        return false;
    }

    function showRiskPart(event) {
        let event_text = event.text();
        let video_name = event.attr("video-name");
        let start_time = activity_time_map[video_name][event_text][0];
        let duration = activity_time_map[video_name][event_text][1];
        let video = $("#video");
        video[0].currentTime = start_time;
        video[0].duration = duration;
        video.off("timeupdate");
        video.on("timeupdate", function(e) {
            let current_time = parseFloat($(this)[0].currentTime);
            if (current_time >= start_time + duration) {
                $(this)[0].pause();
                $(this)[0].currentTime = start_time;
                $(this)[0].play();
            }
        })
        video.attr("start-time", start_time);
        // video.attr("end-time", end_time);
        return false;
    }

    function showVideo(video) {
        $("#factor").empty();
        let video_name = video.text();
        let blobURL = file_map[video_name];;
        if (video.attr("risk")) {
            if (!(video_name in activity_time_map)) {
                getActivityTime(video_name);
            }
            getRiskFactor(video_name);
        }
        $("#view").html("<video id='video' src='" + blobURL + "' type='video/mp4' video-name=" + video_name + " controls>Sorry, your browser doesn't support embedded videos.</video>");
        return false;
    }

    function stopVideo(video) {
        let start_time = video.attr("start-time");
        let end_time = video.attr("end-time");
        console.log(start_time);
        let current_time = video.get(0).currentTime;
        if (end_time <= current_time) {
            video.pause();
            video.get(0).currentTime = start_time;
        }
        return false;
    }

    /* Event handler */

    $(document).on("click", ".risk-factor", function(e) {
        let event = $(this);
        showRiskPart(event);
        return false;
    });

    $(document).on("click", ".videolist", function(e) {
        let video = $(this);
        showVideo(video);
        return false;
    });

    $(document).on("change", "#file", function(ev) {
        loadFiles(ev);
        return false;
    });

    $(document).on("click", "#run", function(e) {
        riskSearch();
        return false;
    });

});