$(function() {
    const repository = "vh2kg_ieee_access_202204";
    const endpointURL = "http://localhost:7200/repositories/";
    const url = endpointURL + repository;
    const namespaces = {
        "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
        "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
        "hra": "http://example.org/virtualhome2kg/ontology/homeriskactivity/",
        "an": "http://example.org/virtualhome2kg/ontology/action/",
        "vh2kg": "http://example.org/virtualhome2kg/ontology/",
        "ex": "http://example.org/virtualhome2kg/instance/",
        "ho": "http://www.owl-ontologies.com/VirtualHome.owl#",
        "time": "http://www.w3.org/2006/time#",
        "owl": "http://www.w3.org/2002/07/owl#"
    };
    var file_map = {};
    var scene = "1";
    var activity_time_map = {};

    var nodes = new vis.DataSet();
    var edges = new vis.DataSet();
    var allNodes = [];
    var allEdges = [];
    var opened = [];

    /* network confing and main */
    let container = document.getElementById('mynetwork');
    let data = {
        nodes: nodes,
        edges: edges
    };
    let options = {
        "edges": {
            "smooth": {
                "roundness": 0.2,
                "type": 'dynamic'
            }
        },
        "physics": {
            "solver": "forceAtlas2Based",
            "maxVelocity": 200,
            "stabilization": {
                "enabled": true,
                "iterations": 1000,
                "updateInterval": 25
            }
        },
        "interaction": {
            "hover": true,
            "dragNodes": true,
            "zoomView": true,
            "dragView": true
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

    function clear() {
        allNodes = [];
        allEdges = [];
        nodes.clear();
        edges.clear();
        network.redraw();
    }

    function showGraph(event) {
        clear();
        let sparql = `
        PREFIX ex: <http://example.org/virtualhome2kg/instance/>
        SELECT * WHERE {
            ?s ?p ?o .
            FILTER (?s = ex:${event.text().toLowerCase()}_scene${scene})
        }        
        `
        $.getJSON(url, { "query": sparql, "infer": false }, function(data) {
            let bindings = data.results.bindings;
            for (i = 0; i < bindings.length; i++) {
                let s = bindings[i].s.value;
                let p = bindings[i].p.value;
                let o = bindings[i].o.value;
                let oType = bindings[i].o.type;
                s_label = replace_prefix(s);
                p_label = replace_prefix(p);
                o_label = replace_prefix(o);
                /* create nodes */
                let nodeS = nodes.get(s);
                if (nodeS == undefined) {
                    allNodes.push({ id: s, label: s_label, size: 7, color: { border: "#2B7CE9", background: "#D2E5FF" } });
                }
                let nodeO = undefined;
                if (oType == "uri") {
                    nodeO = nodes.get(o);
                } else {
                    nodeO = nodes.get(o + "literal");
                }
                if (nodeO == undefined) {
                    if (oType == "uri") {
                        allNodes.push({ id: o, label: o_label, size: 7, color: { border: "#2B7CE9", background: "#D2E5FF" } })
                    } else {
                        if (o != "") { //日本語または英語ラベルがない場合は表示しない
                            allNodes.push({ id: o + "literal", label: o_label, title: o, shape: "box", color: { background: "rgba(255,255,255,0.7)" } });
                        }
                    }
                }
                /* create edges */
                if (oType == "uri") {
                    if (p_label == "hra:riskFactor") {
                        allEdges.push({ id: (s + p_label + o), from: s, to: o, label: p_label, background: { enabled: true, color: "#ff0000", size: 8 }, arrows: { to: { enabled: true } } });
                    } else {
                        allEdges.push({ id: (s + p_label + o), from: s, to: o, label: p_label, arrows: { to: { enabled: true } } });
                    }
                } else {
                    allEdges.push({ id: (s + p_label + o), from: s, to: o + "literal", label: p_label, arrows: { to: { enabled: true } } });
                }
            }
            nodes.update(allNodes);
            edges.update(allEdges);

            network.setOptions({ physics: true });
            network.redraw();
            return false;
        });
        return false;
    }

    function expand(selectNodeId) {
        let sparql = `
        PREFIX ex: <http://example.org/virtualhome2kg/instance/>
        SELECT DISTINCT * WHERE {
            {<${selectNodeId}> ?p ?o .} 
            UNION {?s ?p2 <${selectNodeId}> .}
        }
        `;
        if (opened.includes(selectNodeId)) {
            // delete edge
            let index = opened.indexOf(selectNodeId);
            opened.splice(index, 1);
            let items = edges.get({
                filter: function(item) {
                    return item.from.includes(selectNodeId);
                }
            });
            edges.remove(items);
            items = edges.get({
                filter: function(item) {
                    return item.to.includes(selectNodeId);
                }
            });
            edges.remove(items);
            let i = 0;
            allEdges = allEdges.filter((item) => item.from != selectNodeId);
            allEdges = allEdges.filter((item) => item.to != selectNodeId);
            return false;
        } else {
            opened.push(selectNodeId);
        }
        opened.push(selectNodeId);
        $.getJSON(url, { "query": sparql, "infer": false }, function(data) {
            let bindings = data.results.bindings;
            for (var i = 0; i < bindings.length; i++) {
                if (bindings[i].p) {
                    //展開ノードが持つプロパティについて
                    let o = bindings[i].o.value;
                    let oType = bindings[i].o.type;
                    let o_label = replace_prefix(o);
                    let nodeO = undefined;
                    let p = bindings[i].p.value;
                    let p_label = replace_prefix(p);
                    if (oType == "uri") {
                        nodeO = nodes.get(o);
                    } else {
                        nodeO = nodes.get(o + "literal");
                    }
                    if (nodeO == undefined) {
                        if (oType == "uri") {
                            allNodes.push({ id: o, label: o_label, size: 7, color: { border: "#2B7CE9", background: "#D2E5FF" } })
                        } else {
                            if (o != "") { //日本語または英語ラベルがない場合は表示しない
                                allNodes.push({ id: o + "literal", label: o_label, title: o, shape: "box", color: { background: "rgba(255,255,255,0.7)" } });
                            }
                        }
                    }
                    if (oType == "uri") {
                        allEdges.push({ id: (selectNodeId + p_label + o), from: selectNodeId, to: o, label: p_label, arrows: { to: { enabled: true } } });
                    } else {
                        allEdges.push({ id: (selectNodeId + p_label + o + "literal"), from: selectNodeId, to: o + "literal", label: p_label, arrows: { to: { enabled: true } } });
                    }
                } else {
                    //展開ノードの被リンク
                    let s = bindings[i].s.value;
                    s_label = replace_prefix(s);
                    let nodeS = undefined;
                    let p2 = bindings[i].p2.value;
                    p2_label = replace_prefix(p2);
                    nodeS = nodes.get(s);
                    if (nodeS == undefined) {
                        allNodes.push({ id: s, label: s_label, size: 7, color: { border: "#2B7CE9", background: "#D2E5FF" } })
                    }
                    if (edges.get(s + p2_label + selectNodeId) == null) {
                        allEdges.push({ id: (s + p2_label + selectNodeId), from: s, to: selectNodeId, label: p2_label, arrows: { to: { enabled: true } } });
                    }
                }
                nodes.update(allNodes);
                edges.update(allEdges);

                network.setOptions({ physics: true });
            }
        });
    }

    function edge_highlight(update_edge_list) {
        let update_list = [];
        for (edge_dic of update_edge_list) {
            edge_id = edge_dic.s + edge_dic.p + edge_dic.o;
            let edge = edges.get(edge_id)
            if (edge == null) {
                // create edge
                edges.add({ from: edge_dic.s, to: edge_dic.o, label: edge_dic.p, background: { enabled: true, color: "#ff0000", size: 8 }, arrows: { to: { enabled: true } } });
            } else {
                edge["background"] = { enabled: true, color: "#ff0000", size: 8 };
                console.log(edge);
                update_list.push(edge);
            }
        }
        edges.update(update_list);
    }

    function explain(event) {
        let sparql = `
        PREFIX ex: <http://example.org/virtualhome2kg/instance/>
        PREFIX vh2kg: <http://example.org/virtualhome2kg/instance/>
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX : <http://example.org/virtualhome2kg/ontology/>
        PREFIX x3do: <https://www.web3d.org/specifications/X3dOntology4.0#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX hra: <http://example.org/virtualhome2kg/ontology/homeriskactivity/>
        SELECT * WHERE {
            ?s  a ?type ;
                :action ?action ;
                :agent ?agent ;
                :mainObject ?object ;
                :situationBeforeEvent ?situation .
            ?type rdfs:subClassOf hra:RiskEvent ;
                rdfs:label ?riskLabel .
            ?object :height ?oh .
            ?agent :height ?ah .
            ?oh rdf:value ?ohv ;
                :unit ?ohunit .
            ?ah rdf:value ?ahv .
            ?state :isStateOf ?object ;
                   :partOf ?situation ;
                   :bbox ?shape .
            ?shape x3do:bboxCenter ?c1.
                   ?c1 rdf:first ?cx ;
                         rdf:rest ?c2 .
                   ?c2 rdf:first ?cy ;
                          rdf:rest ?c3 .
                   ?c3 rdf:first ?cz .
            filter (?s = vh2kg:${event.text()}_scene${scene})
        } limit 1
        `;
        $.getJSON(url, { "query": sparql, "infer": false }, function(data) {
            let bindings = data.results.bindings;
            let s = bindings[0].s.value;
            let riskType = bindings[0].type.value;
            let riskType_label = bindings[0].riskLabel.value;
            let action = bindings[0].action.value;
            let action_label = replace_prefix(action);
            let object = bindings[0].object.value;
            let object_label = replace_prefix(object);
            let oh = bindings[0].oh.value;
            let oh_label = replace_prefix(oh);
            let ohv = bindings[0].ohv.value;
            let ohunit = bindings[0].ohunit.value;
            let ohunit_label = replace_prefix(ohunit);
            let state = bindings[0].state.value;
            let state_label = replace_prefix(state);
            let shape = bindings[0].shape.value;
            let shape_label = replace_prefix(shape);
            let cx = bindings[0].cx.value;
            let cy = bindings[0].cy.value;
            let cz = bindings[0].cz.value;

            let update_edge_list = [];
            // action
            update_edge_list.push({ "s": s, "p": "vh2kg:action", "o": action });
            // object
            update_edge_list.push({ "s": s, "p": "vh2kg:mainObject", "o": object });
            // // height
            nodes.add({ id: oh, label: oh_label, size: 7, color: { border: "#2B7CE9", background: "#D2E5FF" } });
            update_edge_list.push({ "s": s, "p": "vh2kg:height", "o": oh });
            // // unit
            nodes.add({ id: ohunit, label: ohunit_label, size: 7, color: { border: "#2B7CE9", background: "#D2E5FF" } });
            edges.add({ from: oh, to: ohunit, label: ohunit_label, arrows: { to: { enabled: true } } });
            // height value
            nodes.add({ id: oh + "literal", label: ohv, shape: "box", color: { background: "rgba(255,255,255,0.7)" } });
            update_edge_list.push({ "s": oh, "p": "rdf:value", "o": oh + "literal" });
            // state
            nodes.add({ id: state, label: state_label, size: 7, color: { border: "#2B7CE9", background: "#D2E5FF" } });
            update_edge_list.push({ "s": state, "p": "vh2kg:isStateOf", "o": object });
            // shape
            nodes.add({ id: shape, label: shape_label, size: 7, color: { border: "#2B7CE9", background: "#D2E5FF" } });
            update_edge_list.push({ "s": state, "p": "vh2kg:bbox", "o": shape });
            // x y z
            nodes.add({ id: shape + "literal", label: "(" + cx + ", " + cy + ", " + cz + ")", shape: "box", color: { background: "rgba(255,255,255,0.7)" } });
            update_edge_list.push({ "s": shape, "p": "vh2kg:bboxCenter", "o": shape + "literal" });
            edge_highlight(update_edge_list);
            $("#risk-type-of-event").html("(Risk type: <b>" + riskType_label + "</b>)");
            return false;
        });
    }

    /* Event handler */

    network.on("doubleClick", function(params) {
        network.setOptions({ physics: false });
        let selectNodeId = params.nodes[0];
        //ダブルクリックされたオブジェクトがリテラルでないノード
        if (selectNodeId != undefined && selectNodeId.includes("literal") == false) {
            expand(selectNodeId);
        }
    });

    $(document).on("click", ".risk-factor", function(e) {
        let event = $(this);
        showRiskPart(event);
        $.when(showGraph(event)).done(explain(event));
        return false;
    });

    $(document).on("click", ".videolist", function(e) {
        let video = $(this);
        showVideo(video);
        showGraph(video);
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