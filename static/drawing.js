const icon_radius = 30;
            const selectionRect = new Konva.Rect({
              stroke: 'red',
              visible: true,
              listening: false
            });

function draw_router(layer, x, y, node){

    if (node.UiElement !== undefined){
        return node.UiElement;
    }else{
        let group = new Konva.Group({
            x: x,
            y: y,
            width: icon_radius,
            height: icon_radius,
            stroke: 'black',
            strokeWidth: 1,
            draggable: true,
        });

        let hexagon = new Konva.RegularPolygon({
            x: 0,
            y: 0,
            sides: 6,
            radius: icon_radius,
            fill: 'rgba(0, 120, 255, 1)',
            stroke: 'rgba(0, 120, 255, 1)',
            strokeWidth: 2,
            draggable: false
          });

        let text = new Konva.Text({
            text: node.ExtendedAddress,
            x: -70,
            y: icon_radius,
            fontSize: 15,
            width: 140,
            fill: 'black',
            align: 'center',
            verticalAlign: 'middle'
        });
        let text2 = new Konva.Text({
            text: node.RouterId,
            x: -70,
            y: -7,
            width: 140,
            fontSize: 15,
            fill: 'black',
            align: 'center',
        });

        if (node.Label !== undefined){
            let text3 = new Konva.Text({
                text: node.Label,
                x: -70,
                y: -icon_radius-15,
                width: 140,
                fontSize: 15,
                fill: 'black',
                align: 'center',
            });
            group.add(text3);
        }


        group.on('click', () => {
           $('#router_id').val(node.RouterId);
           $('#extended_address').val(node.ExtendedAddress);
           $('#x_pos').val(group.getAttr('x'));
           $('#y_pos').val(group.getAttr('y'));
           $('#label').val(node.Label === undefined ? '' : node.Label);
           $('#node_id').val(node.RouterId);
        });

        group.on('dragmove', function(e){
           draw_links();
        });

        group.add(hexagon);
        group.add(text);
        group.add(text2);
        layer.add(group);
        return group;
    }

}

function draw_leader(layer, x, y){
    let hexagon = new Konva.RegularPolygon({
        x: x,
        y: y,
        sides: 6,
        radius: icon_radius,
        fill: 'rgba(255, 80, 120, 1)',
        stroke: 'rgba(255, 80, 120, 1)',
        strokeWidth: 2,
        draggable: true
      });

    layer.add(hexagon);
    return hexagon;
}

function draw_child(layer, x, y){
    let circle = new Konva.Circle({
        x: x,
        y: y,
        radius: icon_radius,
        stroke: 'black',
        strokeWidth: 2,
        draggable: true
    });
    layer.add(circle);
    return circle;
}

function draw_background(layer, w, h){
    let rect = new Konva.Rect({
        x: 0,
        y: 0,
        width: w,
        height: h,
        fill: 'rgba(0, 0, 0, .1)',
        stroke: 'black',
        strokeWidth: 4
    });
    layer.add(rect);
}

let nodes_layer;

function draw_base(){
    // first we need to create a stage
    let stage = new Konva.Stage({
      container: 'canvans_container',   // id of container <div>
      width: 1024,
      height: 500
    });

    // then create layer
    nodes_layer = new Konva.Layer({clearBeforeDraw: true});
    nodes_layer.add(selectionRect);
    let bg_layer = new Konva.Layer({clearBeforeDraw: true});
    draw_background(bg_layer, 1024, 500);


    // add the layer to the stage
    stage.add(bg_layer, nodes_layer);
    //stage.add(nodes);


    let tr = new Konva.Transformer();

/*
    let x1, y1, x2, y2;

    stage.on('mousemove touchmove', (e) => {
        // do nothing if we didn't start selection
        if (!selectionRectangle.visible()) {
          return;
        }
        e.evt.preventDefault();
        x2 = stage.getPointerPosition().x;
        y2 = stage.getPointerPosition().y;

        selectionRectangle.setAttrs({
          x: Math.min(x1, x2),
          y: Math.min(y1, y2),
          width: Math.abs(x2 - x1),
          height: Math.abs(y2 - y1),
        });
    });
*/

    // clicks should select/deselect shapes
    stage.on('click tap', function (e) {
        // if click on empty area - remove all selections
        if (e.target === stage) {
            tr.nodes([]);
            return;
        }

        // do we pressed shift or ctrl?
        const metaPressed = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
        const isSelected = tr.nodes().indexOf(e.target) >= 0;

        if (!metaPressed && !isSelected) {
            // if no key pressed and the node is not selected
            // select just one
            tr.nodes([e.target]);
        } else if (metaPressed && isSelected) {
            // if we pressed keys and node was selected
            // we need to remove it from selection:
            const nodes = tr.nodes().slice(); // use slice to have new copy of array
            // remove node from array
            nodes.splice(nodes.indexOf(e.target), 1);
            tr.nodes(nodes);
        } else if (metaPressed && !isSelected) {
            // add the node into selection
            const nodes = tr.nodes().concat([e.target]);
            tr.nodes(nodes);
        }
    });

    // draw the image

}

let nodes = {};
let links = {};

function create_nodes(data){
    for (let [key, value] of Object.entries(data)){
        let node = (nodes[value.router_id] === undefined) ? {} : nodes[value.router_id];
        value.ipv6 = key;
        let routes = [];
        for (let [router_id, route] of Object.entries(value.route_data)){
            if (route.LinkQualityIn === 0 && route.LinkQualityOut === 0)
                continue;

            if (parseInt(router_id) === value.router_id)
                continue;

            routes.push({
               DestRouter: router_id,
               LQI: route.LinkQualityIn,
               LQO: route.LinkQualityOut
            });
        }

        node.ExtendedAddress = value.extended_address;
        node.RouterId= value.router_id;
        node.RLOC16= value.rloc16;
        node.Routes= routes;
        node.Children= value.children;
        node.Label = value.label;

        nodes[node.RouterId] = node;
    }
}

function hash_link(source_id, destination_id){
    if (source_id > destination_id)
        [source_id, destination_id] = [destination_id, source_id];

    return `${source_id}_${destination_id}`;
    //return CryptoJS.MD5(`${source_id}_${destination_id}`).toString();
}

function create_nodes_and_links(data){
    console.log(data);
    create_nodes(data);
    for (let [node_id, node_value] of Object.entries(nodes)){
        for (let [route_id, route_value] of Object.entries(node_value.Routes)){
            let r_hash = hash_link(node_value.RouterId, parseInt(route_value.DestRouter));
            links[r_hash] = {
                SourceId: node_value.RouterId,
                DestinationId: route_value.DestRouter,
                LQI: Math.min(route_value.LQI, route_value.LQO)
            };
        }
    }
}

function shape_center(shape){
    const box = shape.getClientRect();
    return [box.x + box.width / 2, box.y + box.height / 2];
}

function draw_link(link){
    let color;
    if (link.LQI == 0)
        color = [0, 0, 0, 1];
    else if(link.LQI == 1)
        color = [255, 0, 0, 1];
    else if(link.LQI == 2)
        color = [255, 255, 0, 1];
    else if(link.LQI == 3)
        color = [0, 255, 0, 1];

    points = shape_center(nodes[link.SourceId].UiElement);
    points = points.concat(shape_center(nodes[link.DestinationId].UiElement));

    if (link.UiElement !== undefined){
        link.UiElement.points(points);
        link.UiElement.stroke(`rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`);
    }else{
        let line = new Konva.Line({
            stroke: `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`,
            strokeWidth: 1,
            points: points
        })
        link.UiElement = line;
        nodes_layer.add(line);
    }




}

function draw_links(){
    for(let [link_id, link] of Object.entries((links))){
        draw_link(link);
    }
}

function populate_diagram(data){
    create_nodes_and_links(data);

    console.log(nodes);
    console.log(links);

    x = 50;
    y = 100;

    for(let [node_id, node] of Object.entries(nodes)){

        node.UiElement = draw_router(nodes_layer, x, y, node);
        x += 100;
        if (x > 450){
            x = 100;
            y += 100;
        }
    }
    draw_links();
}

function save_properties(){
    let node = nodes[$('#router_id').val()];
    //node.UiElement.setAttr('x', $('#x_pos').val());
    //node.UiElement.setAttr('y', $('#y_pos').val());
    node.Label = $('#label').val();
    $.post(`/update_node/${node.RouterId}`, {json: JSON.stringify(node)});
}