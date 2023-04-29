const icon_radius = 30;

function draw_router(layer, x, y){
    let hexagon = new Konva.RegularPolygon({
        x: x,
        y: y,
        sides: 6,
        radius: icon_radius,
        fill: 'rgba(0, 120, 255, 1)',
        stroke: 'rgba(0, 120, 255, 1)',
        strokeWidth: 2,
        draggable: true
      });

    layer.add(hexagon);
    return hexagon;
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

function draw_base(){
    // first we need to create a stage
    let stage = new Konva.Stage({
      container: 'canvans_container',   // id of container <div>
      width: 1024,
      height: 500
    });

    // then create layer
    let nodes = new Konva.Layer({clearBeforeDraw: true});
    let bg_layer = new Konva.Layer({clearBeforeDraw: true});
    draw_background(bg_layer, 1024, 500);


    l = draw_leader(nodes, 50, 30);
    r = draw_router(nodes, 100, 30);
    c = draw_child(nodes, 150, 30);

    // add the layer to the stage
    stage.add(bg_layer, nodes);
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
    layer.draw();
}

