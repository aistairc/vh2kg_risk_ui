$(function() {
    const repository = "vh2kg_ieee_access_202204";
    const endpointURL = "http://localhost:7200/repositories/";
    const url = endpointURL + repository;
    const namespaces = {
        "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
        "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
        "hra": "http://example.org/virtualhome2kg/ontology/homeriskactivity/",
        "vh2kg": "http://example.org/virtualhome2kg/ontology/",
        "ex": "http://example.org/virtualhome2kg/instance/"
    };
    var file_map = {};
    var scene = "1";
    var activity_time_map = {};

    var nodes = new vis.DataSet();
    var edges = new vis.DataSet();
    var allNodes = [];
    var allEdges = [];

    /* network confing and main */
    let container = document.getElementById('mynetwork');
    let data = {
        nodes: nodes,
        edges: edges
    };
    let options = {
        edges: {
            smooth: false
        },
        physics: {
            solver: "forceAtlas2Based",
            maxVelocity: 200,
            stabilization: {
                enabled: true,
                iterations: 1000,
                updateInterval: 25
            }
        },
        interaction: {
            hover: true,
            dragNodes: true,
            zoomView: true,
            dragView: true
        }
    };
    var network = new vis.Network(container, data, options);


    /* Function */

    function getActivityTime(video_name) {
        activity_time_map[video_name] = {};
        let sparql = `
        PREFIX : <http://example.org/virtualhome2kg/ontology/>
        PREFIX time: <http://www.w3.org/2006/time#>
        PREFIX ex: <http://example.org/virtualhome2kg/instance/>
        SELECT ?event ?id ?duration WHERE { 
            ex:${video_name.toLowerCase()}_scene${scene} :hasEvent ?event .
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
        PREFIX ex: <http://example.org/virtualhome2kg/instance/>
        SELECT DISTINCT ?risk_factor WHERE {
        ex:${video_name.toLowerCase()}_scene${scene} a hra:RiskActivity ;
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

    function replace_prefix(str) {
        for (ns in namespaces) {
            if (str.includes(namespaces[ns])) {
                str = str.replace(namespaces[ns], ns + ":");
            }
        }
        str = str.replace("_scene" + scene, "");
        return str;
    }

    function showGraph(event) {
        let sparql = `
        PREFIX vh2kg: <http://example.org/virtualhome2kg/instance/>
        SELECT * WHERE {
            ?s ?p ?o .
            FILTER (?s = vh2kg:${event.text().toLowerCase()}_scene${scene})
        }        
        `
        $.getJSON(url, { "query": sparql }, function(data) {
            let bindings = data.results.bindings;
            console.log(bindings);
            for (i = 0; i < bindings.length; i++) {
                let s = bindings[i].s.value;
                let p = bindings[i].p.value;
                let o = bindings[i].o.value;
                let oType = bindings[i].o.type;
                s = replace_prefix(s);
                p = replace_prefix(p);
                o = replace_prefix(o);
                /* create nodes */
                let nodeS = nodes.get(s);
                if (nodeS == undefined) {
                    allNodes.push({ id: s, label: s, shape: "dot", size: 7, color: { border: "#2B7CE9", background: "#D2E5FF" } });
                }
                let nodeO = undefined;
                if (oType == "uri") {
                    nodeO = nodes.get(o);
                } else {
                    nodeO = nodes.get(o + "literal");
                }
                if (nodeO == undefined) {
                    if (oType == "uri") {
                        allNodes.push({ id: o, label: o, shape: "dot", size: 7, color: { border: "#2B7CE9", background: "#D2E5FF" } })
                    } else {
                        if (o != "") { //日本語または英語ラベルがない場合は表示しない
                            allNodes.push({ id: o + "literal", label: o, title: o, shape: "box", color: { background: "rgba(255,255,255,0.7)" } });
                        }
                    }
                }
                if (oType == "uri") {
                    allEdges.push({ from: s, to: o, title: p, arrows: { to: { enabled: true } } });
                } else {
                    allEdges.push({ from: s, to: o + "literal", title: p, arrows: { to: { enabled: true } } });
                }
            }
            console.log(allNodes.length);
            nodes.update(allNodes);
            edges.update(allEdges);

            network.setOptions({ physics: true });
            network.redraw();
            return false;
        });
        return false;
    }

    /* Event handler */

    $(document).on("click", ".risk-factor", function(e) {
        let event = $(this);
        showRiskPart(event);
        showGraph(event);
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