class WGUI2 {
    constructor(engine, canvas) {
        this.id = IDC.get('WGUI2');
        this.engine = engine;
        this.canvas = canvas;
        this.w = engine.w;
        this.h = engine.h;
        this.clearScreen = true;

        this.bufferSize = 100000; // default buffer size (auto resize if needed)
        this.regl = createREGL({
            canvas: canvas
        });
        
        this.object_list = [];
        this.FPS_counter = null; // put a GUI_counter object here for FPS counting
        this.UPS_counter = null; // put a GUI_counter object here for UPS counting

        // performance record
        this.commandSwitch = 0;
        this.textureSwitch = 0;

        var c = new MouseHandler_objectCluster(engine.mouse_handler);
        engine.mouse_handler.put(c);
        this.mouse_handler = c;
        this.key_handler = engine.key_handler;

        this.textureManager = new DataManager();
        
        this.drawObject_list = [];
        this.drawThreshold = 10;
        this.alpha = 1;

        this.matrix_pop_object = new DrawObject({
            type: 'matrix_pop'
        });
    }

    ini() {
        const regl = this.regl;
        this.prepareBuffers();

        this.gl_drawPoints = regl({
            frag: `
                precision mediump float;

                varying vec4 fragColor;

                void main() {
                    gl_FragColor = fragColor;
                }
            `,
            vert: `
                precision mediump float;

                attribute vec2 vertex;
                attribute vec4 color;

                varying vec4 fragColor;

                uniform float width;
                uniform float stageWidth;
                uniform float stageHeight;

                vec2 normalizeCoords(vec2 vertex) {
                    return vec2(
                        2.0 * ((vertex[0] / stageWidth) - 0.5),
                        -2.0 * ((vertex[1] / stageHeight) - 0.5)
                    );
                }

                void main() {
                    fragColor = color;
                    gl_PointSize = width;
                    gl_Position = vec4(normalizeCoords(vertex), 0.0, 1.0);
                }
            `,

            attributes: {
                vertex: {
                    buffer: regl.prop('vertexBuffer')
                },
                color: {
                    buffer: regl.prop('colorBuffer')
                }
            },

            uniforms: {
                width: regl.prop('width'),
                stageHeight: regl.prop('stageHeight'),
                stageWidth: regl.prop('stageWidth')
            },

            count: regl.prop('count'),
            primitive: 'points',
            
            blend: {
                enable: true,
                func: {
                    srcRGB: 'src alpha',
                    srcAlpha: 'src alpha',
                    dstRGB: 'one minus src alpha',
                    dstAlpha: 'one minus src alpha',
                },
            },
            
            depth: {
                enable: false
            }

        });

        this.gl_drawLines = regl({
            frag: `
                precision mediump float;

                varying vec4 fragColor;

                void main() {
                    gl_FragColor = fragColor;
                }
            `,
            vert: `
                precision mediump float;

                attribute vec2 vertex;
                attribute vec4 color;

                varying vec4 fragColor;

                uniform float width;
                uniform float stageWidth;
                uniform float stageHeight;

                vec2 normalizeCoords(vec2 vertex) {
                    return vec2(
                        2.0 * ((vertex[0] / stageWidth) - 0.5),
                        -2.0 * ((vertex[1] / stageHeight) - 0.5)
                    );
                }

                void main() {
                    fragColor = color;
                    gl_Position = vec4(normalizeCoords(vertex), 0.0, 1.0);
                }
            `,

            attributes: {
                vertex: {
                    buffer: regl.prop('vertexBuffer')
                },
                color: {
                    buffer: regl.prop('colorBuffer')
                }
            },

            uniforms: {
                stageHeight: regl.prop('stageHeight'),
                stageWidth: regl.prop('stageWidth')
            },

            count: regl.prop('count'),
            primitive: 'lines',
            
            blend: {
                enable: true,
                func: {
                    srcRGB: 'src alpha',
                    srcAlpha: 'src alpha',
                    dstRGB: 'one minus src alpha',
                    dstAlpha: 'one minus src alpha',
                },
            },
            
            depth: {
                enable: false
            }

        });

        this.gl_drawSprites = regl({
            frag: `
                precision mediump float;

                uniform sampler2D texture;
                uniform vec2 size;

                varying vec2 uv;
                varying vec2 uscale;
                varying vec2 ushift;

                void main() {
                    gl_FragColor = texture2D(texture, (uv * uscale + ushift) / size);
                }
            `,
            vert: `
                precision mediump float;

                attribute vec2 vertex;
                attribute vec2 position;
                attribute vec2 matrix1;
                attribute vec2 matrix2;
                attribute vec2 scale;
                attribute vec2 shift;

                varying vec2 uv;
                varying vec2 uscale;
                varying vec2 ushift;

                uniform float stageWidth;
                uniform float stageHeight;

                vec2 normalizeCoords(vec2 vertex) {
                    return vec2(
                        2.0 * ((vertex[0] / stageWidth) - 0.5),
                        -2.0 * ((vertex[1] / stageHeight) - 0.5)
                    );
                }

                void main() {
                    uv = vertex;
                    uscale = scale;
                    ushift = shift;
                    gl_Position = vec4(normalizeCoords(mat2(matrix1, matrix2) * vertex + position), 0.0, 1.0);
                }
            `,

            attributes: {
                vertex: {
                    buffer: regl.prop('vertexBuffer')
                },
                position: {
                    buffer: regl.prop('positionBuffer')
                },
                matrix1: {
                    buffer: regl.prop('matrixBuffer1')
                },
                matrix2: {
                    buffer: regl.prop('matrixBuffer2')
                },
                scale: {
                    buffer: regl.prop('scaleBuffer')
                },
                shift: {
                    buffer: regl.prop('shiftBuffer')
                }
            },

            uniforms: {
                texture: regl.prop('texture'),
                size: regl.prop('size'),
                stageHeight: regl.prop('stageHeight'),
                stageWidth: regl.prop('stageWidth')
            },

            count: regl.prop('count'),
            primitive: 'triangle',
            
            blend: {
                enable: true,
                func: {
                    srcRGB: 'src alpha',
                    srcAlpha: 'src alpha',
                    dstRGB: 'one minus src alpha',
                    dstAlpha: 'one minus src alpha',
                },
            },
            
            depth: {
                enable: false
            }

        });

    }

    prepareBuffers() {
        this.vertexBuffer = this.regl.buffer({
            length: this.bufferSize * 2,
            type: 'float',
            usage: 'dynamic'
        });

        this.positionBuffer = this.regl.buffer({
            length: this.bufferSize * 2,
            type: 'float',
            usage: 'dynamic'
        });

        this.colorBuffer = this.regl.buffer({
            length: this.bufferSize * 4,
            type: 'float',
            usage: 'dynamic'
        });
        
        this.matrixBuffer1 = this.regl.buffer({
            length: this.bufferSize * 2,
            type: 'float',
            usage: 'dynamic'
        });

        this.matrixBuffer2 = this.regl.buffer({
            length: this.bufferSize * 2,
            type: 'float',
            usage: 'dynamic'
        });

        this.scaleBuffer = this.regl.buffer({
            length: this.bufferSize * 2,
            type: 'float',
            usage: 'dynamic'
        });

        this.shiftBuffer = this.regl.buffer({
            length: this.bufferSize * 2,
            type: 'float',
            usage: 'dynamic'
        });
    }

    addObject(o) {
        if (!o.deployState) {
            o.deploy(this);
        } else {
            this.object_list.push(o);
        }
    }

    update() {
        if (this.UPS_counter instanceof GUI_counter) {this.UPS_counter.count++;}
        for (var i = 0; i < this.object_list.length; i++) {
            if (this.object_list[i].removeState) {
                this.object_list.splice(i, 1);
                i--;
                continue;
            }
            this.object_list[i].update();
        }

        this.drawObject_list = [];
        for (var i = 0; i < this.object_list.length; i++) {
            if (this.object_list[i].removeState) {
                this.object_list.splice(i, 1);
                i--;
                continue;
            }
            if (!this.object_list[i].hideState) {this.object_list[i].draw(this);}
        }
    }

    render() {
        if (this.FPS_counter instanceof GUI_counter) {this.FPS_counter.count++;}
        if (this.clearScreen) {
            this.regl.clear({
                color: [0, 0, 0, 0],
                depth: 1
            });
        }
        this.tx = 0;
        this.ty = 0;
        this.transformMatrix_list = [];
        this.currentTransform = new TMatrix();
        this.lastCommand = '';
        this.lastDrawObject = null;
        this.vertexArray = [];
        this.positionArray = [];
        this.vertexCount = 0;
        this.colorArray = [];
        this.matrixArray1 = [];
        this.matrixArray2 = [];
        this.scaleArray = [];
        this.shiftArray = [];
        this.texture = null;
        this.commandSwitch = 0;
        this.textureSwitch = 0;
        this.drawObject_list.forEach(o => this.renderObject(o));
        this.checkCommand('end');
        this.drawObject_list = [];
    }

    renderObject(o) {
        const x = o.x + this.tx
        const y = o.y + this.ty;
        this.lastDrawObject = o;
        switch(o.type) {
            case "point":
                // x, y, color, width
                this.checkCommand('gl_drawPoints');
                var v1 = this.currentTransform.transformedPoint(x, y);
                this.vertexArray.push([v1[0], v1[1]]);
                this.vertexCount += 1;
                this.colorArray.push(this.colorConvert(o.color));
            break;
            
            case "line":
                // !! ignore width for now
                // x,y,xx,yy,color,width
                this.checkCommand('gl_drawLines');
                var c = this.colorConvert(o.color);
                var c2 = o.color2? this.colorConvert(o.color2) : c;
                this.renderLine(x, y, o.xx + this.tx, o.yy + this.ty, c, c2);
            break;
            
            case "arc_line":
                // x,y,r,a,arc,color,width
                this.checkCommand('gl_drawLines');
                var lines = arcToLineSegment(x, y, o.r, o.a, o.arc);
                var c = this.colorConvert(o.color);
                for (var i = 0; i < lines.length - 1; i++) {
                    this.renderLine(lines[i][0], lines[i][1], lines[i + 1][0], lines[i + 1][1], c, c);
                }
                this.renderLine(lines[lines.length - 1][0], lines[lines.length - 1][1], lines[0][0], lines[0][1], c, c);
            break;
            
            case "arc_line_closed":
                // x,y,r,a,arc,color,width
                this.checkCommand('gl_drawLines');
                var lines = arcToLineSegment(x, y, o.r, o.a, o.arc);
                var c = this.colorConvert(o.color);
                this.renderLine(x, y, lines[0][0], lines[0][1], c, c);
                for (var i = 0; i < lines.length - 1; i++) {
                    this.renderLine(lines[i][0], lines[i][1], lines[i + 1][0], lines[i + 1][1], c, c);
                }
                this.renderLine(lines[lines.length - 1][0], lines[lines.length - 1][1], x, y, c, c);
            break;
            
            case "arc_fill":
            // x,y,r,a,arc,fillColor,width
            // o.fillStyle=o.fillColor;
            //ctx.beginPath();
            //ctx.arc(x,y,o.r,o.a,o.a+o.arc);
            //ctx.fill();
            break;
            
            case "arc_fill_closed":
            // x,y,r,a,arc,fillColor,width
            /*
            o.fillStyle=o.fillColor;
            ctx.beginPath();
            ctx.moveTo(x,y);
            ctx.lineTo(x+o.r*Math.cos(o.a),y+o.r*Math.sin(o.a));
            ctx.arc(x,y,o.r,o.a,o.a+o.arc);
            ctx.lineTo(x,y);
            ctx.fill();
            */
            break;
            
            case "rect_line":
                // x,y,w,h,color,width
                this.checkCommand('gl_drawLines');
                var c = this.colorConvert(o.color);
                this.renderLine(x, y, x + o.w, y, c, c);
                this.renderLine(x, y, x, y + o.h, c, c);
                this.renderLine(x + o.w, y, x + o.w, y + o.h, c, c);
                this.renderLine(x, y + o.h, x + o.w, y + o.h, c, c);
            break;
            
            case "rect_fill":
            // x,y,w,h,fillColor
            //ctx.fillStyle=o.fillColor;ctx.fillRect(x,y,o.w,o.h);
            break;
            
            case "rect_1":
            // x,y,w,h,color,fillColor,width
            //ctx.fillStyle=o.fillColor;ctx.fillRect(x,y,o.w,o.h);
            //ctx.lineWidth=o.width;ctx.strokeStyle=o.color;ctx.strokeRect(x,y,o.w,o.h);
            break;
            
            case "rect_1_text":
            // x,y,w,h,color,fillColor,width,text,size
            //ctx.fillStyle=o.fillColor;ctx.fillRect(x,y,o.w,o.h);
            //ctx.textBaseline="middle";ctx.fillStyle=o.color;ctx.textAlign="center";ctx.font=o.size+"px Arial";ctx.fillText(o.text,x+o.w/2,y+o.h/2);
            //ctx.lineWidth=o.width;ctx.strokeStyle=o.color;ctx.strokeRect(x+o.width/2,y+o.width/2,o.w-o.width,o.h-o.width);
            break;
            
            case "text_line":
            break;
            
            case "text_circle":
            break;
            
            case "font":
                // custom font display
                // x,y,text,size,data=font
                var font = this.engine.fontManager.getFont(o.data);
                if (font) {
                    font.drawLine(gui, x, y, o.text, o.size);
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
                var texture = this.getTexture(o.data);
                var m = this.currentTransform.clone();
                var arr = m.matrix;
                if (texture.src instanceof SpriteSheetImage) {
                    var scale = [o.sw, o.sh];
                    var shift = [o.sx + texture.src.x, o.sy + texture.src.y];
                } else {
                    var scale = [o.sw, o.sh];
                    var shift = [o.sx, o.sy];
                }
                var vshift = m.transformedPoint(x, y);
                m.scale(o.w, o.h);
                // vertex data decode finished
                // we can check actual draw area now
                //if (!this.shapeCheck(this.shapeTransform(this.shape.square, m, vshift))) break;

                this.checkTextureCommand(texture);
                this.checkCommand('gl_drawSprites');
                var arr = m.matrix;
                var mat1 = [arr[0], arr[1]];
                var mat2 = [arr[2], arr[3]];
                for (var i = 0; i < this.shape.square.length; i++) {
                    this.positionArray.push(vshift);
                    this.matrixArray1.push(mat1);
                    this.matrixArray2.push(mat2);
                    this.scaleArray.push(scale);
                    this.shiftArray.push(shift);
                }
                this.vertexArray.push(this.shape.square);
                this.vertexCount += this.shape.square.length;
            break;
            
            case "translate":
                // x,y
                this.tx += o.x;
                this.ty += o.y;
            break;
            
            case "matrix_push":
                // data=matrix
                var Tm = (this.transformMatrix_list.length > 0 ? this.transformMatrix_list[this.transformMatrix_list.length - 1].clone() : new TMatrix());
                Tm.multiply(o.data);
                this.transformMatrix_list.push(Tm);
                this.currentTransform = Tm.clone();
            break;
            
            case "matrix_pop":
                //[type]
                this.transformMatrix_list.pop();
                if (this.transformMatrix_list.length<1) {
                    this.currentTransform = new TMatrix();
                } else {
                    this.currentTransform = this.transformMatrix_list[this.transformMatrix_list.length-1].clone();
                }
            break;
            
            case "alpha":
                // data=alpha
                this.alpha = o.data;
            break;
            
            case "function":
                // data=function(o)
                o.data.call(this, this, o);
            break;
        }
    }

    renderLine(x, y, xx, yy, c, c2) {
        var v1 = this.currentTransform.transformedPoint(x, y);
        var v2 = this.currentTransform.transformedPoint(xx, yy);
        this.vertexArray.push([v1[0], v1[1], v2[0], v2[1]]);
        this.vertexCount += 2;
        this.colorArray.push([c, c2]);
    }

    colorConvert(string) {
        if (typeof string != "string") {return string;}
        var hex = parseInt(string.slice(1), 16);
        return [(hex >> 16) / 0xFF, ((hex >> 8) & 0xFF) / 0xFF, (hex & 0xFF) / 0xFF, this.alpha];
    }

    checkCommand(c) {
        if (c == this.lastCommand) {
            return;
        }
        // finish command chain
        const o = this.lastDrawObject;
        if (this.vertexCount * 4 > this.bufferSize) {
            this.bufferSize = this.vertexCount * 4;
            this.prepareBuffers();
        }
        this.commandSwitch++;
        switch(this.lastCommand) {
            case "gl_drawPoints":
                this.vertexBuffer.subdata(this.vertexArray);
                this.colorBuffer.subdata(this.colorArray);
                this.gl_drawPoints({
                    vertexBuffer: this.vertexBuffer,
                    count: this.vertexCount,
                    colorBuffer:  this.colorBuffer,
                    width: o.width,
                    stageWidth: this.w,
                    stageHeight: this.h
                });
                this.vertexArray = [];
                this.vertexCount = 0;
                this.colorArray = [];
            break;

            case "gl_drawLines":
                this.vertexBuffer.subdata(this.vertexArray);
                this.colorBuffer.subdata(this.colorArray);
                this.gl_drawLines({
                    vertexBuffer: this.vertexBuffer,
                    count: this.vertexCount,
                    colorBuffer:  this.colorBuffer,
                    stageWidth: this.w,
                    stageHeight: this.h
                });
                this.vertexArray = [];
                this.vertexCount = 0;
                this.colorArray = [];
            break;

            case "gl_drawSprites":
                this.vertexBuffer.subdata(this.vertexArray);
                this.positionBuffer.subdata(this.positionArray);
                this.matrixBuffer1.subdata(this.matrixArray1);
                this.matrixBuffer2.subdata(this.matrixArray2);
                this.scaleBuffer.subdata(this.scaleArray);
                this.shiftBuffer.subdata(this.shiftArray);
                var textureInfo = this.texture.src instanceof SpriteSheetImage? this.engine.imageManager.getImage(this.texture.src.src):this.texture.src;
                this.gl_drawSprites({
                    vertexBuffer: this.vertexBuffer,
                    positionBuffer: this.positionBuffer,
                    count: this.vertexCount,
                    matrixBuffer1:  this.matrixBuffer1,
                    matrixBuffer2:  this.matrixBuffer2,
                    scaleBuffer:  this.scaleBuffer,
                    shiftBuffer:  this.shiftBuffer,
                    texture: this.texture.texture,
                    size: [textureInfo.width, textureInfo.height],
                    stageWidth: this.w,
                    stageHeight: this.h
                });
                this.vertexArray = [];
                this.positionArray = [];
                this.vertexCount = 0;
                this.matrixArray1 = [];
                this.matrixArray2 = [];
                this.scaleArray = [];
                this.shiftArray = [];
            break;
        }
        this.lastCommand = c;
    }

    checkTextureCommand(texture) {
        if (this.texture != null) {
            if (texture == this.texture) return;
            var s1 = texture instanceof ReglTexture? texture.src.src: texture.src;
            var s2 = this.texture instanceof ReglTexture? this.texture.src.src: this.texture.src;
            if (s1 == s2) return;
        }
        this.textureSwitch++;
        this.checkCommand("end");
        this.texture = texture;
    }

    getTexture(data) {
        var texture;
        if (typeof data == "string") {
            // src image filename
            // try to get cache data
            texture = this.textureManager.getData(data);
            if (!texture) {
                // get src image
                var img = this.engine.imageManager.getImage(data);
                if (!img) {
                    // cannot find src image
                    return new ReglTexture(new Image(), this.regl);
                } else if (img instanceof SpriteSheetImage) {
                    // get actual src image from spritesheet
                    var src = this.engine.imageManager.getImage(img.src);
                    if (src) {
                        // override actual src image
                        texture = new ReglTexture(img, this.regl, {data:src});
                        this.textureManager.addData(data, texture);
                    }
                } else {
                    texture = new ReglTexture(img, this.regl);
                    this.textureManager.addData(data, texture);
                }
            }
        } else if (!data instanceof ReglTexture) {
            // assume image or canvas
            texture = new ReglTexture(data, this.regl);
        }
        return texture;
    }

    shapeCheck(vertex) {
        // return true if the shape is inside viewport
        for (var i = 0; i < vertex.length; i++) {
            if (this.renderCheck(vertex[i][0], vertex[i][1], vertex[i][0], vertex[i][1])) return true;
        }
        return false;
    }

    shapeTransform(shapeArr, matrix, shift = [0, 0]) {
        // return actual vertex data used inside webgl
        // need to fix this
        var vertex = [];
        for (var i = 0; i < shapeArr.length; i++) {
            vertex[i] = matrix.transformedPoint((shapeArr[i][0] - 0.5) * 2, (shapeArr[i][1] - 0.5) * 2);
            vertex[i][0] += shift[0] - this.w / 2;
            vertex[i][1] += shift[1] - this.h / 2;
        }
        return vertex;
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
WGUI2.prototype.shape = {
    square: [
        [0, 0],
        [0, 1],
        [1, 0],
        [1, 0],
        [0, 1],
        [1, 1]
    ]
};


class ReglTexture {
    constructor(src, regl, param = {}) {
        this.src = src;
        this.texture = regl.texture(Object.assign({
            data: src,
            min: 'linear',
            mag: 'linear'
        }, param));
    }
}