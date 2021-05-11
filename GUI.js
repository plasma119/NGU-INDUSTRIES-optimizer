// GUI class
// contains method for buttons and objects
class GUI {
    constructor(engine, canvas) {
        this.id = IDC.get("GUI");
        this.engine = engine;
        this.w = engine.w;
        this.h = engine.h;
        this.bgColor = null;
        this.clearScreen = true;

        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        this.object_list = [];
        this.FPS_counter = null; // put a GUI_counter object here for FPS counting
        this.UPS_counter = null; // put a GUI_counter object here for UPS counting

        var c = new MouseHandler_objectCluster(engine.mouse_handler);
        engine.mouse_handler.put(c);
        this.mouse_handler = c;
        this.key_handler = engine.key_handler;

        this.drawObject_list = [];
        this.drawThreshold = 10; // how many pixel away from screen is considered off-screen

        this.matrix_pop_object = new DrawObject({
            type: 'matrix_pop'
        });
    }

    addObject(o) {
        if (!o.deployState) {
            o.deploy(this);
        }
        else {
            this.object_list.push(o);
        }
    }

    update() {
        if (this.UPS_counter instanceof GUI_counter) {this.UPS_counter.count++;}
        // update objects
        for (var i = 0; i < this.object_list.length; i++) {
            if (this.object_list[i].removeState) {
                this.object_list.splice(i, 1);
                i--;
                continue;
            }
            this.object_list[i].update();
        }

        this.drawObject_list = [];
        // prepare draw instructions from objects
        for (var i = 0; i < this.object_list.length; i++) {
            if (this.object_list[i].removeState) {
                this.object_list.splice(i, 1);
                i--;
                continue;
            }
            if (!this.object_list[i].hideState) {
                this.object_list[i].draw(this);
            }
        }
    }

    render() {
        if (this.FPS_counter instanceof GUI_counter) {this.FPS_counter.count++;}
        this.tx = 0;
        this.ty = 0;
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.transformMatrix_list = [];
        this.nextTransform = null;
        if (this.clearScreen) {
            if (this.bgColor) {
                this.ctx.fillStyle = this.bgColor;
                this.ctx.fillRect(0, 0, this.w, this.h);
            } else {
                this.ctx.clearRect(0, 0, this.w, this.h);
            }
        }
        this.drawObject_list.forEach((o) => this.renderObject(o));
        if (this.lastRenderedLine != "") {
            this.ctx.stroke();
        }
        this.draw_list = [];
        this.drawObject_list = [];
    }

    renderObject(o) {
        const ctx = this.ctx;
        if (!o.line) {
            this.endLineSegment(ctx);
        }
        if (this.nextTransform && o.type != "matrix_push" && o.type != "matrix_pop") {
            var m = this.nextTransform;
            ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
            this.nextTransform = null;
        }
        const x = o.x + this.tx, y = o.y + this.ty;
        switch (o.type) {
            case "line":
                // x,y,xx,yy,color,width
                this.prepareNextLineSegment(ctx, o);
                ctx.moveTo(x, y);
                ctx.lineTo(o.xx + this.tx, o.yy + this.ty);
                break;
            case "arc_line":
                // x,y,r,a,arc,color,width
                this.prepareNextLineSegment(ctx, o);
                ctx.arc(x, y, o.r, o.a, o.a + o.arc);
                break;
            case "arc_line_closed":
                // x,y,r,a,arc,color,width
                this.prepareNextLineSegment(ctx, o);
                ctx.moveTo(x, y);
                ctx.lineTo(x + o.r * Math.cos(o.a), y + o.r * Math.sin(o.a));
                ctx.arc(x, y, o.r, o.a, o.a + o.arc);
                ctx.lineTo(x, y);
                break;
            case "arc_fill":
                // x,y,r,a,arc,fillColor,width
                o.fillStyle = o.fillColor;
                ctx.beginPath();
                ctx.arc(x, y, o.r, o.a, o.a + o.arc);
                ctx.fill();
                break;
            case "arc_fill_closed":
                // x,y,r,a,arc,fillColor,width
                o.fillStyle = o.fillColor;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + o.r * Math.cos(o.a), y + o.r * Math.sin(o.a));
                ctx.arc(x, y, o.r, o.a, o.a + o.arc);
                ctx.lineTo(x, y);
                ctx.fill();
                break;
            case "rect_line":
                // x,y,w,h,color,width
                ctx.lineWidth = o.width;
                ctx.strokeStyle = o.color;
                ctx.strokeRect(x, y, o.w, o.h);
                break;
            case "rect_fill":
                // x,y,w,h,fillColor
                ctx.fillStyle = o.fillColor;
                ctx.fillRect(x, y, o.w, o.h);
                break;
            case "rect_1":
                // x,y,w,h,color,fillColor,width
                ctx.fillStyle = o.fillColor;
                ctx.fillRect(x, y, o.w, o.h);
                ctx.lineWidth = o.width;
                ctx.strokeStyle = o.color;
                ctx.strokeRect(x, y, o.w, o.h);
                break;
            case "rect_1_text":
                // x,y,w,h,color,fillColor,width,text,size
                ctx.fillStyle = o.fillColor;
                ctx.fillRect(x, y, o.w, o.h);
                ctx.textBaseline = "middle";
                ctx.fillStyle = o.color;
                ctx.textAlign = "center";
                ctx.font = o.size + "px Arial";
                ctx.fillText(o.text, x + o.w / 2, y + o.h / 2);
                ctx.lineWidth = o.width;
                ctx.strokeStyle = o.color;
                ctx.strokeRect(x + o.width / 2, y + o.width / 2, o.w - o.width, o.h - o.width);
                break;
            case "text_line":
                ctx.textBaseline = "middle";
                ctx.fillStyle = o.color;
                ctx.textAlign = "center";
                ctx.font = o.size + "px Arial";
                ctx.fillText(o.text, x, y);
                break;
            case "text_circle":
                break;
            case "font":
                // custom font display
                // x,y,text,size,data=font
                var font = this.engine.fontManager.getFont(o.data);
                if (font) {
                    font.drawLine(this, tx, x, y, o.text, o.size);
                }
                break;
            case "font_circle":
                // custom font display
                // x,y,text,size,r,a,arc,data=font
                var font = this.engine.fontManager.getFont(o.data);
                if (font) {
                    font.drawCircle(this, x, y, o.text, o.size, o.r, o.a, o.arc);
                }
                break;
            case "image":
                // x,y,w,h,sx,sy,sw,sh,data=src
                var img = (typeof o.data == "string" ? this.engine.imageManager.getImage(o.data) : o.data);
                if (img) {
                    if (img instanceof SpriteSheetImage) {
                        var src = this.engine.imageManager.getImage(img.src);
                        if (src) {
                            ctx.drawImage(src, o.sx + img.x, o.sy + img.y, o.sw, o.sh, x, y, o.w, o.h);
                        }
                    } else {
                        ctx.drawImage(img, o.sx, o.sy, o.sw, o.sh, x, y, o.w, o.h);
                    }
                }
                break;
            case "translate":
                // x,y
                this.tx += o.x;
                this.ty += o.y;
                break;
            case "matrix_push":
                // data=matrix
                var Tm = (this.transformMatrix_list.length > 0 ? this.transformMatrix_list[this.transformMatrix_list.length - 1].clone() : new TMatrix());
                this.nextTransform = Tm.multiply(o.data).slice();
                this.transformMatrix_list.push(Tm);
                break;
            case "matrix_pop":
                //[type]
                this.transformMatrix_list.pop();
                if (this.transformMatrix_list.length < 1) {
                    this.nextTransform = [1, 0, 0, 1, 0, 0];
                }
                else {
                    this.nextTransform = this.transformMatrix_list[this.transformMatrix_list.length - 1].matrix.slice();
                }
                break;
            case "alpha":
                // data=alpha
                ctx.globalAlpha = o.data;
                break;
            case "function":
                // data=function(gui,o)
                o.data.call(this, this, o);
                break;
        }
    }

    prepareNextLineSegment(ctx, o) {
        if (this.lastRenderedLine != o.width + o.color) {
            if (this.lastRenderedLine != "") {
                ctx.stroke();
            }
            ctx.lineWidth = o.width;
            ctx.strokeStyle = o.color;
            ctx.beginPath();
            this.lastRenderedLine = o.width + o.color;
        }
    }

    endLineSegment(ctx) {
        if (this.lastRenderedLine != "") {
            this.lastRenderedLine = "";
            ctx.stroke();
        }
    }

    renderCheck(x, y, xx, yy, t = this.drawThreshold) {
        return xx + t > 0 && x - t < this.w && yy + t > 0 && y - t < this.h;
    }

    drawObject(o) {
        this.drawObject_list.push(o);
    }

    clearObjects() {
        this.object_list.forEach(o => o.remove());
    }

    getGUI() {
        return this;
    }
}


class DrawObject {
    constructor(param) {
        Object.assign(this, param);
    }
}
Object.assign(
    DrawObject.prototype, {
        type: '',
        line: false,
        x: 0,
        y: 0,
        w: 0,
        h: 0,
        r: 0,
        a: 0,
        width: 1,
        arc: 0,
        xx: 0,
        yy: 0,
        sx: 0,
        sy: 0,
        sw: 0,
        sh: 0,
        text: '',
        size: 0,
        color: '#000000',
        color2: null,
        fillColor: '#000000',
        data: null
    }
);


// ----------------------------------------GUI objects--------------------------------------------------


// GUI_object class
// this is template
class GUI_object {
    constructor() {
        this.id = IDC.get('GUI_object');
        this.hideState = false;
        this.removeState = false;
        this.deployState = false;
        this.x = 0;
        this.y = 0;
    }

    ini() {}

    update() {}

    draw(gui) {}

    end() {}

    move(x, y) {
        this.x += x;
        this.y += y;
    }

    moveTo(x, y) {
        this.move(x - this.x, y - this.y);
    }

    // default functions:
    deploy(gui, nolink) {
        this.gui = gui.getGUI();
        this.parent = gui;
        this.mouse_handler = gui.mouse_handler;
        this.key_handler = gui.key_handler;
        this.ini();
        this.deployState = true;
        if (!nolink) {
            gui.addObject(this);
        }
    }

    remove() {
        this.end();
        this.removeState = true;
    }

    hide() {
        this.hideState = true;
    }

    show() {
        this.hideState = false;
    }
    
    hideToggle() {
        if (this.hideState) {
            this.show();
        }
        else {
            this.hide();
        }
    }
}


// frame (container)
// apply transformation for contained objects
// sub-objects are auto deployed
class GUI_frame extends GUI_object{
    constructor(param) {
        super();
        this.id = IDC.get("GUI_frame");
        this.object_list = [];
        this.param = Object.assign({
            translate: [0, 0],
            rotate: 0,
            scale: [1, 1]
        }, param);
        this.TMatrix = null;
    }

    ini() {
        const c = new MouseHandler_objectCluster(this.mouse_handler);
        this.mouse_handler.put(c);
        this.mouse_handler = c;
        this.object_list.forEach((o) => o.deploy(this, true));
    }
    
    update() {
        this.updateMatrix();
        for (var i=0;i<this.object_list.length;i++) {
            if (this.object_list[i].removeState) {
                this.object_list.splice(i,1);
                i--;
                continue;
            }
            this.object_list[i].update();
        }
    }

    updateMatrix() {
        const m = new TMatrix();
        m.transform([this.param.translate[0] + this.x, this.param.translate[1] + this.y], this.param.rotate, this.param.scale);
        this.mouse_handler.TMatrix = m;
        this.TMatrix = m;
    }

    draw(gui) {
        gui.drawObject(new DrawObject({type: "matrix_push", data: this.TMatrix}));
        this.drawSub(gui);
        gui.drawObject(gui.matrix_pop_object);
    }

    drawSub(gui) {
        for (var i = 0; i < this.object_list.length; i++) {
            if (this.object_list[i].removeState) {
                this.object_list.splice(i, 1);
                i--;
                continue;
            }
            if (!this.object_list[i].hideState) {this.object_list[i].draw(gui)};
        }
    }

    rotate(a) {
        this.param.rotate += a;
    }

    scale(s, s2) {
        this.param.scale[0] *= s;
        this.param.scale[1] *= (s2 ? s2 : s);
    }

    end() {
        this.clearObjects();
        this.mouse_handler.remove();
    }

    addObject(o) {
        if (this.deployState && !o.deployState) {
            o.deploy(this, true);
        }
        this.object_list.push(o);
    }

    clearObjects() {
        this.object_list.forEach(o => o.remove());
    }

    getGUI() {
        return this.gui.getGUI();
    }
}


// panel (container)
// inherit from GUI_frame
class GUI_panel extends GUI_frame {
    constructor(param) {
        super(Object.assign({
            size: [100, 100],
            imgData: {},
            movable: false // todo: fix this
        }, param));
        this.id = IDC.get("GUI_panel");
    }

    ini() {
        this.drawObject = new DrawObject(Object.assign({
            type: "rect_1",
            x: -this.param.size[0] / 2,
            y: -this.param.size[1] / 2,
            w: this.param.size[0],
            h: this.param.size[1],
            width: 2,
            color: "#00ff00",
            fillColor: "#008800"
        }, this.param.imgData));

        this.param.translate[0] += this.param.size[0] / 2;
        this.param.translate[1] += this.param.size[1] / 2;

        var c = new MouseHandler_objectCluster(this.mouse_handler);
        this.mouse_handler.put(c);
        this.mouse_handler = c;
        this.mouse_handler.move(-this.param.size[0] / 2, -this.param.size[1] / 2);
        this.mouse_object = this.mouse_handler.addHandle("drag", 0, 0, this.param.size[0], this.param.size[1], (mz, drag) => { this.move(drag[0], drag[1]);});

        this.object_list.forEach(o => o.deploy(this, true));
    }

    drawSub(gui) {
        this.drawPanel(gui);
        gui.drawObject(new DrawObject({type: "translate", x: -this.param.size[0] / 2, y: -this.param.size[1] / 2}));
        super.drawSub(gui);
        gui.drawObject(new DrawObject({type: "translate", x: this.param.size[0] / 2, y: this.param.size[1] / 2}));
    }

    drawPanel(gui) {
        gui.drawObject(this.drawObject);
    }
}


// window (container)
// WIP
// inherit from GUI_frame
class GUI_window extends GUI_frame {
    constructor(param) {
        super(Object.assign({
            size: [100, 100],
            padding: 10,
            imgData: {},
            movable: false // todo: fix this
        }, param));
        this.id = IDC.get("GUI_window");
    }

    ini() {
        this.drawObject = new DrawObject(Object.assign({
            type: "rect_1",
            x: -this.param.size[0] / 2,
            y: -this.param.size[1] / 2,
            w: this.param.size[0],
            h: this.param.size[1],
            width: 2,
            color: "#00ff00",
            fillColor: "#008800"
        }, this.param.imgData));

        this.param.translate[0] += this.param.size[0] / 2;
        this.param.translate[1] += this.param.size[1] / 2;

        var c = new MouseHandler_objectCluster(this.mouse_handler);
        this.mouse_handler.put(c);
        this.mouse_handler = c;
        this.mouse_handler.move(-this.param.size[0] / 2, -this.param.size[1] / 2);
        this.mouse_object = this.mouse_handler.addHandle("drag", 0, 0, this.param.size[0], this.param.size[1], (mz, drag) => { this.move(drag[0], drag[1]);});

        this.object_list.forEach(o => o.deploy(this, true));
    }

    drawSub(gui) {
        this.drawPanel(gui);
        gui.drawObject(new DrawObject({type: "translate", x: -this.param.size[0] / 2, y: -this.param.size[1] / 2}));
        super.drawSub(gui);
        gui.drawObject(new DrawObject({type: "translate", x: this.param.size[0] / 2, y: this.param.size[1] / 2}));
    }

    drawPanel(gui) {
        gui.drawObject(this.drawObject);
    }
}


// button
class GUI_button extends GUI_object {
    constructor(param) {
        super();
        this.id=IDC.get("GUI_button");
        this.param=Object.assign({
            size:[100,50], // hit detection size
            imgData:{},
            onclick:function(button,mz) {}
        },param);
    }

    ini() {
        this.drawObject = new DrawObject(Object.assign({
            type: "rect_1_text",
            x: this.x,
            y: this.y,
            w: this.param.size[0],
            h: this.param.size[1],
            width: 2,
            color: "#00ff00",
            fillColor: "#008800",
            text: "button",
            size: 16
        }, this.param.imgData));

        this.callback = mz => this.param.onclick.call(this, mz);
        this.mouse_object = this.mouse_handler.addHandle("click", this.x, this.y, this.param.size[0], this.param.size[1], this.callback);
    }

    draw(gui) {
        gui.drawObject(this.drawObject);
    }

    move(x, y) {
        this.x += x; this.y += y;
        if (this.drawObject) {this.drawObject.x += x; this.drawObject.y += y;}
        if (this.mouse_object) {this.mouse_object.move(x, y);}
    }

    end() {
        this.mouse_object.remove();
    }
}


// counter
class GUI_counter extends GUI_object {
    constructor(param) {
        super();
        this.id = IDC.get("GUI_counter");
        this.param = Object.assign({
            size: [50, 25],
            fontSize: 13,
            text: "count:",
            interval: 0 // milisecond before clearing count, 0 for never
        }, param);
    }

    ini() {
        this.drawObject = new DrawObject({
            type: "rect_1_text",
            x: this.x,
            y: this.y,
            w: this.param.size[0],
            h: this.param.size[1],
            width: 2,
            color: "#00ff00",
            fillColor: "#008800",
            size: this.param.fontSize
        });

        this.count = 0; this.lastCount = 0;
        if (this.param.interval > 0) {
            this.counter = setInterval(() => {this.lastCount = this.count; this.count = 0;}, this.param.interval);
        }
    }

    draw(gui) {
        this.drawObject.text = this.param.text + Math.round((this.param.interval > 0? this.lastCount: this.count)*100)/100;
        gui.drawObject(this.drawObject);
    }

    move(x, y) {
        this.x += x; this.y += y;
        if (this.drawObject) {this.drawObject.x += x; this.drawObject.y += y;}
    }

    end() {
        if (this.counter) {window.clearInterval(this.counter);}
    }
}


// sprite
class GUI_sprite extends GUI_object {
    constructor(param) {
        super();
        this.id = IDC.get("GUI_sprite");
        this.param = Object.assign({
            size: [1, 1], // size of each frame
            start: [0, 0], // starting position in the sprite sheet
            src: null, // frames are stacked horizontally from left to right
            ticksPerFrame: 1, // how many ticks per sprite frame (or array to specify ticks for each frame)
            numberOfFrames: 1,
            loop: true,
            freeze: false
        }, param);
    }

    ini() {
        this.frameIndex=0;
        this.drawObject=null;
        this.tick=0;
        this.freeze=this.param.freeze;
    }

    update() {
        if (this.param.numberOfFrames <= 1 || this.freeze) {return;}
        this.tick++;
        if (this.tick >= (Array.isArray(this.param.ticksPerFrame) ? this.param.ticksPerFrame[this.frameIndex] : this.param.ticksPerFrame)) {
            this.tick = 0;
            this.frameIndex++;
            if (this.frameIndex > this.param.numberOfFrames - 1) {
                if (this.param.loop) {
                    this.frameIndex = 0;
                } else {
                    this.freeze = true;
                }
            }
        }
    }

    draw(gui) {
        if (this.param.src) {
            if (!this.drawObject) {
                this.drawObject = new DrawObject({
                    type: "image",
                    x: this.x,
                    y: this.y,
                    w: this.param.size[0],
                    h: this.param.size[1],
                    sx: this.param.start[0] + this.frameIndex * this.param.size[0],
                    sy: this.param.start[1],
                    sw: this.param.size[0],
                    sh: this.param.size[1],
                    data: this.param.src
                });
            } else {
                this.drawObject.x = this.x;
                this.drawObject.y = this.y;
                this.drawObject.sx = this.param.start[0] + this.frameIndex * this.param.size[0];
            }
            gui.drawObject(this.drawObject);
        }
    }

    getSize() {
        return [this.param.size[0], this.param.size[1]];
    }
}


// ----------------------------------------GUI objects--------------------------------------------------
