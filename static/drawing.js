const icon_radius = 20;
let nodes_layer;
const screen_width = 1024;
const screen_height = 500;
let leader_ext_addr = '';
const text_color = 'rgba(255,255,255,1)';
const background_color = 'rgba(0, 0 ,0, 1)'

const selectionRect = new Konva.Rect({
  stroke: 'red',
  visible: true,
  listening: false
});

function draw_router(layer, x, y, node){
    color = (node.ExtendedAddress == leader_ext_addr) ? 'rgba(255,120,10,1)' : 'rgba(0, 120, 255, 1)';


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
            fill: color,
            draggable: false
          });

        let text = new Konva.Text({
            text: node.ExtendedAddress,
            x: -70,
            y: icon_radius,
            fontSize: 15,
            width: 140,
            fill: text_color,
            align: 'center',
            verticalAlign: 'middle',
            draggable: false,
            visible: false
        });
        let text2 = new Konva.Text({
            text: node.RouterId,
            x: -70,
            y: -7,
            width: 140,
            fontSize: 15,
            fill: text_color,
            align: 'center',
            draggable: false
        });

        if (node.Label !== undefined){
            let text3 = new Konva.Text({
                text: node.Label,
                x: -70,
                y: -icon_radius-15,
                width: 140,
                fontSize: 15,
                fill: text_color,
                align: 'center',
                draggable: false
            });
            group.add(text3);
        }

        group.on('mouseenter', () => {
           text.visible(true);
           $('#router_id').val(node.RouterId);
           $('#extended_address').val(node.ExtendedAddress);
           $('#x_pos').val(group.getAttr('x'));
           $('#y_pos').val(group.getAttr('y'));
           $('#label').val(node.Label === undefined ? '' : node.Label);
           $('#node_id').val(node.RouterId);
        });
        group.on('mouseleave', () => {
           text.visible(false);
        });


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
        fill: background_color,
    });
    layer.add(rect);
}


function draw_base(){
    // first we need to create a stage
    let stage = new Konva.Stage({
      container: 'canvans_container',   // id of container <div>
      width: screen_width,
      height: screen_height
    });

    // then create layer
    nodes_layer = new Konva.Layer({clearBeforeDraw: true});
    nodes_layer.add(selectionRect);
    let bg_layer = new Konva.Layer({clearBeforeDraw: true});
    draw_background(bg_layer, screen_width, screen_height);


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
/*
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
*/
    // draw the image

}

let nodes = {};
let links = {};

function create_nodes(data){
    for (let [key, value] of Object.entries(data)){
        let node = (nodes[value.router_id] === undefined) ? {} : nodes[value.router_id];
        if (value.leader_data.LeaderRouterId == value.router_id)
            leader_ext_addr = value.extended_address;
        value.ipv6 = key;
        let routes = [];
        for (let [router_id, route] of Object.entries(value.route_data)){
            if (route.LinkQualityIn === 0 && route.LinkQualityOut === 0)
                continue;

            if (route.RouteCost > 4)
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
        node.Type = 'Router';
        node.x_pos = parseFloat(value.x_pos);
        node.y_pos = parseFloat(value.y_pos);

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
            links[r_hash] = (links[r_hash] === undefined) ? {} : links[r_hash];
            links[r_hash].SourceId = node_value.RouterId;
            links[r_hash].DestinationId = route_value.DestRouter;
            links[r_hash].LQI = Math.round ((route_value.LQI + route_value.LQO) / 2);
            links[r_hash].LQI_I = route_value.LQI;
            links[r_hash].LQI_O = route_value.LQO;

        }
    }
}

function shape_center(shape){
    const box = shape.getClientRect();
    return [box.x + box.width / 2, box.y + box.height / 2];
}

function LQI_to_color(LQI){
    let color;
    switch (LQI){
        case 0: color = [0, 0, 0, 0]; break;
        case 1: color = [255, 100, 100, 0]; break;
        case 2: color = [255, 255, 100, 0]; break;
        case 3: color = [100, 255, 100, 0]; break;
    }
    color[3] = 0.3333 * LQI;
    return color;
}

function get_radiuses(boxes){
    let radiuses = [];
    for (let [box_id, box] of Object.entries(boxes)){
        radiuses.push(Math.sqrt(box.width*box.width + box.height*box.height));
    }
    return radiuses;
}

class Line{
    constructor(points){
        this.x1 = points[0];
        this.y1 = points[1];
        this.x2 = points[2];
        this.y2 = points[3];
    }

    get m(){
        return (this.y2 - this.y1) / (this.x2 - this.x1);
    }

    get q(){
        return this.y1 - this.m * this.x1;
    }
}

class Circle {
    constructor(center, radius) {
        this.x0 = center[0];
        this.x1 = center[1];
        this.radius = radius;
    }
}

function calculate_boundry_for_lines(points, nodes){
    let radius = icon_radius + 15;

    let line1 = new Line(points);

    let angle1 = -Math.atan(line1.m);
    let angle2 = Math.atan(line1.m);

    let s1 = Math.abs(Math.sin(angle1) * radius);
    let c1 = Math.abs(Math.cos(angle1) * radius);


    let s2 = Math.abs(Math.sin(angle2) * radius);
    let c2 = Math.abs(Math.cos(angle2) * radius);

    let x1 = (line1.x1 > line1.x2) ? line1.x1 - c1 : line1.x1 + c1;
    let x2 = (line1.x1 > line1.x2) ? line1.x2 + c2 : line1.x2 - c2;
    let y1 = (line1.y1 > line1.y2) ? line1.y1 - s1 : line1.y1 + s1;
    let y2 = (line1.y1 > line1.y2) ? line1.y2 + s2 : line1.y2 - s2;

    return [x1, y1, x2, y2];
}

function draw_link(link){
    if(nodes[link.SourceId] === undefined || nodes[link.DestinationId] === undefined)
        return;

    let color = LQI_to_color(link.LQI);

    points = shape_center(nodes[link.SourceId].UiElement);
    points = points.concat(shape_center(nodes[link.DestinationId].UiElement));
    points = calculate_boundry_for_lines(points, [nodes[link.SourceId].UiElement, nodes[link.DestinationId].UiElement]);

    let text1 = new Konva.Text({
        text: '1',
            x: points[0],
            y: points[1],
            fontSize: 15,
            fill: `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`,
            draggable: false
    });
    let text2 = new Konva.Text({
        text: '2',
            x: points[2],
            y: points[3],
            fontSize: 15,
            fill: `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`,
            draggable: false
    });

    //nodes_layer.add(text1);
    //nodes_layer.add(text2);

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

function draw_childs(node){
    for (let[child_id, child] of Object.entries(node.Children)){
        draw_child(nodes_layer, 100, 100);
    }

}

function populate_diagram(data){
    create_nodes_and_links(data);

    console.log(nodes);
    console.log(links);

    x = 50;
    y = 100;

    for(let [node_id, node] of Object.entries(nodes)){
        if(node.x_pos === undefined || node.x_pos === null || isNaN(node.x_pos))
            node.x_pos = x;
        if(node.y_pos === undefined || node.y_pos === null || isNaN(node.y_pos))
            node.y_pos = y;

        node.UiElement = draw_router(nodes_layer, node.x_pos, node.y_pos, node);

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
    node.x_pos = $('#x_pos').val();
    node.y_pos = $('#y_pos').val();
    node.Label = $('#label').val();
    $.post(`/update_node/${node.RouterId}`, {json: JSON.stringify(node)});
}