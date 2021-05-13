
//@ts-check

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function downloadTextFile(text, filename) {
    const a = document.createElement('a');
    const type = filename.split(".").pop();
    const url = URL.createObjectURL( new Blob([text], { type:`text/${type === "txt" ? "plain" : type}` }) );
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    a.setAttribute('target', '_blank');
    a.click();
}

function downloadCanvas(canvas, filename){
    const a = document.createElement('a');
    canvas.toBlob(function(blob) {
        const url = URL.createObjectURL(blob);
        a.setAttribute('href', url);
        a.setAttribute('download', filename);
        a.click();
    });
}

function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function() {
            console.log('Async: Copying to clipboard was successful!');
        }, function(err) {
            console.error('Async: Could not copy text: ', err);
        });
        return;
    }
    const a = document.createElement("textarea");
    a.value = text;
    a.focus();
    a.select();
    try {
        const successful = document.execCommand('copy');
        console.log('Fallback: Copying text command was ' + (successful ? 'successful' : 'unsuccessful'));
    } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
    }
}

/**
 * formatted date MM/DD/yyyy
 * @param {Date} date 
 * @param {string} [seperator]
 * @returns {string}
 */
 function getFormattedDate(date, seperator = '/') {
    let year = date.getFullYear();
    let month = (1 + date.getMonth()).toString().padStart(2, '0');
    let day = date.getDate().toString().padStart(2, '0');
    return month + seperator + day + seperator + year;
}


class GUI_input_number extends GUI_frame {
    constructor(param) {
        super(Object.assign({
            size: [150, 50],
            imgData:{},
            fontSize: 16,
            text: "input:",
            increment: 1,
            increment2: 10,
            start: 0,
            callback: function(number) {}
        }, param));
        this.id = IDC.get("GUI_input_number");
    }

    ini() {
        this.drawObject = new DrawObject(Object.assign({
            type: "rect_1_text",
            x: this.x,
            y: this.y,
            w: this.param.size[0] - 50,
            h: this.param.size[1],
            width: 2,
            color: "#00ff00",
            fillColor: "#008800",
            text: "button",
            size: 16
        }, this.param.imgData));

        this.number = this.param.start;

        // build buttons
        let dx = [0, 0, 25, 25];
        let dy = [0, 25, 0, 25];
        let t = ['+', '-', '++', '--'];
        let f = [
            () => {this.number += this.param.increment; this.param.callback(this.number);},
            () => {this.number -= this.param.increment; this.param.callback(this.number);},
            () => {this.number += this.param.increment2; this.param.callback(this.number);},
            () => {this.number -= this.param.increment2; this.param.callback(this.number);}
        ];
        for (let i = 0; i < 4; i++) {
            let b = new GUI_button({size:[25, 25], imgData:{text: t[i]}, onclick: f[i]});
            b.move(dx[i] + this.param.size[0] - 50, dy[i]);
            this.addObject(b);
        }
        super.ini();
    }

    input(n) {
        this.number = n;
        this.param.callback(this.number);
    }

    draw(gui) {
        this.drawObject.text = this.param.text + Math.round(this.number*100)/100;
        gui.drawObject(this.drawObject);
        super.draw(gui);
    }

}

// all coordinates are Grid[y][x]

class GUI_object_NGU_industries extends GUI_frame {
    constructor(param) {
        super(Object.assign({
            NGU: null
        },param));
        this.id = IDC.get("GUI_NGU");
        this.tiles = [];
        this.displayType = 0;
        this.drawTile = false;
        this.lockTile = false;
        this.drawing = false;
        this.webGLmode = true;
    }

    ini() {
        super.ini();
        /** @type {NGU_industries} */
        let NGU = this.param.NGU;
        this.mouse_handler.addHandle('mousedown', 0, 0, 1000, 850, (mz) => {
            let x = Math.floor(mz[0] / 50);
            let y = Math.floor(mz[1] / 50);
            if (NGU.isValidPosition(x, y)) {
                this.drawing = true;
                if (this.lockTile) {
                    this.drawTile = !NGU.lockedTiles[y][x];
                    NGU.lockTile(x, y, this.drawTile);
                } else {
                    this.drawTile = !NGU.layout[y][x];
                    NGU.setLayout(x, y, this.drawTile);
                }
            }
        });
        this.mouse_handler.addHandle('mousemove', 0, 0, 1000, 850, (mz) => {
            if (!this.drawing) return;
            let x = Math.floor(mz[0] / 50);
            let y = Math.floor(mz[1] / 50);
            if (NGU.isValidPosition(x, y)) {
                if (this.lockTile) {
                    NGU.lockTile(x, y, this.drawTile);
                } else {
                    NGU.setLayout(x, y, this.drawTile);
                }
            }
        });
        this.mouse_handler.addHandle('mouseup', 0, 0, 1000, 1000, (mz) => {
            this.drawing = false;
        });
    }

    draw(gui) {
        /** @type {NGU_industries} */
        let NGU = this.param.NGU;
        if (this.tiles.length == 0) {
            for (let i = 0; i < this.param.NGU.w; i++) {
                for (let j = 0; j < this.param.NGU.h; j++) {
                    let p = {
                        type: "image",
                        x: i * 50,
                        y: j * 50,
                        w: 50,
                        h: 50,
                        sx: 0,
                        sy: 0,
                        sw: 50,
                        sh: 50,
                        data: "tile1",
                        i: i,
                        j: j
                    };
                    this.tiles.push(new DrawObject(p));
                }
            }
        }
        if (gui instanceof WGUI2 && this.webGLmode) {
            for (let k = 0; k < this.tiles.length; k++) {
                let o = this.tiles[k];
                o.data = NGU.lockedTiles[o.j][o.i]? "tile3": (NGU.layout[o.j][o.i]? "tile1":"tile2");
                gui.drawObject(o);
            }
            super.draw(gui);
        } else {
            if (!this.webGLmode) {
                for (let k = 0; k < this.tiles.length; k++) {
                    let o = this.tiles[k];
                    o.data = NGU.lockedTiles[o.j][o.i]? "tile3": (NGU.layout[o.j][o.i]? "tile1":"tile2");
                    gui.drawObject(o);
                }
                super.draw(gui);
            }
            for (let i = 0; i < NGU.w; i++) {
                for (let j = 0; j < NGU.h; j++) {
                    let t = NGU.cells[j][i].getYieldText();
                    if (t == '0') continue;
                    gui.drawObject(new DrawObject({
                        type: "rect_fill",
                        x: i * 50,
                        y: j * 50,
                        w: 50,
                        h: 50,
                        fillColor: "#00000044"
                    }));
                    let p, p2, p3;
                    switch (this.displayType) {
                        case 0:
                        default:
                            this.displayType = 0;
                            p = {
                                type: "text_line",
                                x: i * 50 + 25,
                                y: j * 50 + 25,
                                color: "#ffffff",
                                size: 20,
                                text: t,
                            };
                            gui.drawObject(new DrawObject(p));
                        break;

                        case 1:
                            p = {
                                type: "text_line",
                                x: i * 50 + 25,
                                y: j * 50 + 15,
                                color: "#ffffff",
                                size: 20,
                                text: NGU.cells[j][i].getYieldNoCostText()
                            };
                            gui.drawObject(new DrawObject(p));
                            p2 = {
                                type: "text_line",
                                x: i * 50 + 25,
                                y: j * 50 + 35,
                                color: "#ffff88",
                                size: 20,
                                text: NGU.cells[j][i].getCostText()
                            };
                            gui.drawObject(new DrawObject(p2));
                        break;

                        case 2:
                            p = {
                                type: "text_line",
                                x: i * 50 + 25,
                                y: j * 50 + 8,
                                color: "#ddddff",
                                size: 15,
                                text: NGU.cells[j][i].getSpeedText()
                            };
                            gui.drawObject(new DrawObject(p));
                            p2 = {
                                type: "text_line",
                                x: i * 50 + 25,
                                y: j * 50 + 25,
                                color: "#ffbbff",
                                size: 15,
                                text: NGU.cells[j][i].getProductionText()
                            };
                            gui.drawObject(new DrawObject(p2));
                            p3 = {
                                type: "text_line",
                                x: i * 50 + 25,
                                y: j * 50 + 42,
                                color: "#ffff88",
                                size: 15,
                                text: NGU.cells[j][i].getCostText()
                            };
                            gui.drawObject(new DrawObject(p3));
                        break;
                    }
                }
            }
        }
    }
}

class GUI_object_NGU_sprite extends GUI_sprite {
    constructor(param) {
        super(param);
        this.id = IDC.get("GUI_NGU_sprite");
        /** @type {NGU_industries_cell} */
        this.cell = null;
    }

    draw(gui) {
        let matrix = null;
        let src = null;
        if (this.cell.object) {
            src = this.cell.object.name;
        } else {
            return;
        }
        let data = gui.engine.imageManager.getImage(src);
        if (data instanceof SpriteSheetImage) {
            this.param.size = [data.width, data.height];
        }

        if (this.drawObject) {
            this.drawObject.data = src;
            this.drawObject.sw = this.param.size[0];
            this.drawObject.sh = this.param.size[1];
        } else {
            this.param.src = src;
            this.drawObject = new DrawObject({
                type: "image",
                x: this.x,
                y: this.y,
                w: 50,
                h: 50,
                sx: this.param.start[0] + this.frameIndex * this.param.size[0],
                sy: this.param.start[1],
                sw: this.param.size[0],
                sh: this.param.size[1],
                data: this.param.src
            });
        }
        if (this.cell.object instanceof NGU_industries_object_Beacon) {
            if (this.cell.object.direction != 'w') {
                matrix = new TMatrix();
                matrix.translate((this.x + 25), (this.y + 25));
                switch(this.cell.object.direction) {
                    case 'd':
                        matrix.rotate(Math.PI/2);
                    break;
                    case 's':
                        matrix.rotate(Math.PI);
                    break;
                    case 'a':
                        matrix.rotate(-Math.PI/2);
                    break;
                }
                matrix.translate(-(this.x + 25), -(this.y + 25));
                gui.drawObject(new DrawObject({
                    type: 'matrix_push',
                    data: matrix
                }));
            }
        }
        super.draw(gui);
        if (matrix) {
            gui.drawObject(gui.matrix_pop_object);
        }
    }
}

class NGU_industries {
    constructor() {
        /** @type {(number|boolean)[][]} */
        this.layout = [];
        /** @type {(number|boolean)[][]} */
        this.lockedTiles = [];
        /** @type {NGU_industries_cell[][]} */
        this.cells = [];
        /** @type {NGU_industries_cell[]} */
        this.cellsFlat = [];
        this.w = 0;
        this.h = 0;
        this.optimizeList = [];
        this.changeStrategy('sum');
        /** @type {GUI_frame} */
        this.GUI_frame = null;
        this.shuffleList = [];
        this.optimizing = false;
        this.maxSpeed = 20;
        this.maxProduction = 20;
        this.minimumCost = 0;
        this.currentYield = 0;
        /** @type {GUI_counter} */
        this.counter;
    }

    /**
     * @param {number[][]} layout 
     */
    initLayout(layout) {
        if (this.GUI_frame) {
            this.GUI_frame.clearObjects();
        }
        this.layout = layout;
        this.lockedTiles = [];
        this.h = 17;
        this.w = 20;
        this.currentYield = 0;
        this.cellsFlat = [];
        for (let j = 0; j < this.h; j++) {
            this.cells[j] = [];
            this.lockedTiles[j] = [];
            for (let i = 0; i < this.w; i++) {
                const cell = new NGU_industries_cell(this, i, j)
                this.cells[j][i] = cell;
                this.cellsFlat[j * this.w + i] = cell;
                this.lockedTiles[j][i] = false;
                if (this.GUI_frame) {
                    const sprite = new GUI_object_NGU_sprite({size:[50, 50]});
                    sprite.moveTo(i*50, j*50);
                    this.GUI_frame.addObject(sprite);
                    cell.GUI_sprite = sprite;
                    sprite.cell = cell;
                }
            }
        }
    }

    setLayout(x, y, g) {
        this.layout[y][x] = g;
        this.cells[y][x].delete();
    }

    lockTile(x, y, g) {
        this.lockedTiles[y][x] = g;
    }

    // just make the json file smaller
    prepareExport() {
        for (let j = 0; j < this.h; j++) {
            for (let i = 0; i < this.w; i++) {
                this.layout[j][i] = this.layout[j][i]? 1:0;
                this.lockedTiles[j][i] = this.lockedTiles[j][i]? 1:0;
            }
        }
    }

    /**
     * @param {number} x 
     * @param {number} y 
     * @param {NGU_industries_object} object 
     */
    put(x, y, object) {
        if (!this.layout[y][x]) return;
        this.cells[y][x].put(object);
    }

    /**
     * @param {number} x 
     * @param {number} y 
     */
    delete(x, y) {
        this.cells[y][x].delete();
    }

    /**
     * @param {number} x 
     * @param {number} y 
     */
    isValidPosition(x, y) {
        return x >= 0 && y >= 0 && x < this.w && y < this.h;
    }

    reload() {
        const arr = this.export();
        for (let k = 0; k < this.cellsFlat.length; k++) {
            this.cellsFlat[k].init();
        }
        this.import(arr);
        this.currentYield = this.getYield();
    }

    async optimize(callback) {
        if (this.optimizing) return;
        this.optimizing = true;
        for (let i = 0; i < 10000; i++) {
            this.shuffleList = [];
            let index = 0;
            for (let i = 0; i < this.w; i++) {
                for (let j = 0; j < this.h; j++) {
                    if (!this.layout[j][i] || this.lockedTiles[j][i]) continue;
                    this.shuffleList[index++] = j * this.w + i;
                }
            }
            if (i % 50 == 0) {
                this.reload();
            }
            if (!this.optimizing) return this.getYield();
            callback(await this.optimizeLoop(0.5 / (1 + Math.sqrt(i % 200))));
        }
        this.optimizing = false;
        return this.getYield();
    }

    optimizeLoop(alpha = 0.5) {
        return new Promise((resolve) => {
            setTimeout(() => {
                let best_yield = this.getYield(true);
                let arr = this.export();

                for (let k = 0; k < this.shuffleList.length; k++) {
                    const i = this.shuffleList[k] % this.w;
                    const j = Math.floor(this.shuffleList[k] / this.w);
                    if (Math.random() < alpha) this.put(i, j, this.optimizeList[Math.floor(this.optimizeList.length * Math.random())]);
                }

                let p_y = this.getYield();
                let p = this.optimizeOnce();
                for (let k = 0; k < 20; k++) {
                    if (p > p_y) {
                        p_y = p;
                        p = this.optimizeOnce();
                    } else {
                        break;
                    }
                }

                if (p < best_yield) {
                    this.import(arr); // reset
                } else {
                    best_yield = p;
                }

                resolve(best_yield);
            }, 0);
        });
    }

    optimizeOnce() {
        const list = this.shuffleList.slice();
        shuffleArray(list);
        for (let k = 0; k < list.length; k++) {
            const i = list[k] % this.w;
            const j = Math.floor(list[k] / this.w);
            if (this.layout[j][i]) this.optimizeCell(i, j);
        }
        return this.getYield();
    }

    optimizeCell(x, y) {
        const t = this.cells[y][x];
        let before = this.getYield();
        let beforeO = t.object;
        let after = 0;
        let afterO = beforeO;
        this.optimizeList.forEach(o => {
            this.put(x, y, o);
            after = this.getYield();
            if (after > before) {
                before = after
                afterO = o;
            }
        });
        this.put(x, y, afterO);
    }

    getYield(recalculate) {
        // default to use yieldStrategySum
        return this.currentYield;
    }

    getYieldUpdate(before, after) {
        return this.currentYield;
    }

    changeStrategy(name) {
        switch(name) {
            case 'sum':
                this.getYield = this.yieldStrategySum;
                this.getYieldUpdate = this.yieldStrategySumUpdate;
            break;
            case 'max':
                this.getYield = this.yieldStrategyMax;
                this.getYieldUpdate = this.yieldStrategyMaxUpdate;
            break;
        }
    }

    yieldStrategySum(recalculate) {
        if (!recalculate) return this.currentYield;
        let total = 0;
        for (let k = 0; k < this.cellsFlat.length; k++) {
            total += this.cellsFlat[k].getYield();
        }
        this.currentYield = total;
        return total;
    }

    // called per tile change
    yieldStrategySumUpdate(before, after) {
        this.currentYield += after - before;
        return this.currentYield;
    }

    yieldStrategyMax(recalculate) {
        let max = 0;
        for (let k = 0; k < this.cellsFlat.length; k++) {
            let y = this.cellsFlat[k].getYield();
            if (y > max) max = y;
        }
        this.currentYield = max;
        return max;
    }

    // called per tile change
    // nope, to implement this I need all current scores for all tiles
    // it is fast enough already if you do prod. beacon only
    yieldStrategyMaxUpdate(before, after) {
        return this.currentYield;
    }

    export() {
        // for now
        let arr = [];
        for (let i = 0; i < this.w; i++) {
            for (let j = 0; j < this.h; j++) {
                arr.push(this.cells[j][i].object);
            }
        }
        return arr;
    }

    import(arr) {
        let n = 0;
        for (let i = 0; i < this.w; i++) {
            for (let j = 0; j < this.h; j++) {
                this.put(i, j, arr[n++]);
            }
        }
    }
}

class NGU_industries_cell {
    /**
     * @param {NGU_industries} NGU
     * @param {number} x 
     * @param {number} y 
     */
    constructor(NGU, x, y) {
        this.NGU = NGU;
        this.x = x;
        this.y = y;

        /** @type {NGU_industries_object} */
        this.object = null;
        this.speed = 1;
        this.production = 1;
        this.cost = 1;

        /** @type {GUI_sprite} */
        this.GUI_sprite = null;
    }

    init() {
        this.object = null;
        this.speed = 1;
        this.production = 1;
        this.cost = 1;
    }

    /**
     * @param {NGU_industries_object} object 
     */
    put(object) {
        if (this.object) this.delete();
        if (!object) return;
        this.object = object;
        this.object.init(this.NGU, this.x, this.y);
    }

    delete() {
        if (this.object) this.object.delete(this.NGU, this.x, this.y);
        this.object = null;
    }

    /**
     * @param {number} n 
     */
    addSpeed(n) {
        this.speed += n;
    }

    /**
     * @param {number} n 
     */
    addProduction(n) {
        this.production += n;
    }

    /**
     * @param {number} n
     */
    addCost(n) {
        if (n == 0) return;
        if (n > 0) {
            this.cost *= n;
        } else {
            this.cost /= -n;
        }
    }

    getSpeed() {
        return this.speed;
    }

    getSpeedText() {
        return `${Math.round(this.getSpeed()*100)/100}`;
    }

    getProduction() {
        return this.production;
    }

    getProductionText() {
        return `${Math.round(this.getProduction()*100)/100}`;
    }

    getCost() {
        return this.cost;
    }

    getCostText() {
        return `${Math.round(this.getCost()*100)/100}`;
    }

    getYield() {
        if (!this.object) return 0;
        const s = this.speed > this.NGU.maxSpeed - 0.001? this.NGU.maxSpeed * 1.1: this.speed;
        const p = this.production > this.NGU.maxProduction - 0.001? this.NGU.maxProduction * 1.1: this.production;
        const c = this.cost > this.NGU.minimumCost + 0.001? this.cost: this.NGU.minimumCost * 0.9;
        return this.object.output * s * p / c;
    }

    getYieldText() {
        return `${Math.round(this.getYield()*10)/10}`;
    }

    getYieldNoCost() {
        if (this.object) return this.object.output * this.getSpeed() * this.production;
        return 0;
    }

    getYieldNoCostText() {
        return `${Math.round(this.getYieldNoCost()*10)/10}`;
    }

    export() {
        if (!this.object) return null;
        if (this.object instanceof NGU_industries_object_Lab) {
            return {type: 'lab'};
        } else if (this.object instanceof NGU_industries_object_Beacon) {
            return {
                type: 'beacon',
                beaconType: this.object.type,
                shape: this.object.shape,
                direction: this.object.direction
            };
        }
        return null;
    }

    exportcsv() {
        const data = {
            type: 'null',
            base: 0,
            speed: this.speed,
            production: this.production,
            cost: this.cost,
            score: this.getYield()
        };
        if (!this.object) return data;
        if (this.object instanceof NGU_industries_object_Lab) {
            data.type = 'building';
            data.base = this.object.output;
        } else if (this.object instanceof NGU_industries_object_Beacon) {
            data.type = `beacon-${this.object.shape}-${this.object.type}-${this.object.direction}`
        }
        return data;
    }

    import(data) {
        if (!data) {this.delete(); return;}
        let object;
        switch (data.type) {
            case 'lab':
                object = new NGU_industries_object_Lab();
            break;
            case 'beacon':
                object = new NGU_industries_object_Beacon(data.shape, data.beaconType, data.direction);
            break;
            default:
                console.log(`Invalid building type: ${data.type}`);
                this.delete();
                return;
        }
        this.put(object);
    }
}

class NGU_industries_object {
    constructor() {
        this.name = 'null';
        this.output = 0;
    }

    /**
     * @param {NGU_industries} NGU 
     * @param {number} x 
     * @param {number} y 
     */
    init(NGU, x, y) {}

    /**
     * @param {NGU_industries} NGU 
     * @param {number} x 
     * @param {number} y 
     */
    delete(NGU, x, y) {}

}

class NGU_industries_object_Lab extends NGU_industries_object {
    constructor() {
        super();
        this.name = 'crappy_iron_cog'; // too lazy to get texture for lab
        this.output = 1.0;
    }

    init(NGU, x, y) {
        NGU.getYieldUpdate(0, NGU.cells[y][x].getYield());
    }

    delete(NGU, x, y) {
        NGU.getYieldUpdate(NGU.cells[y][x].getYield(), 0);
    }
}

class NGU_industries_object_Beacon extends NGU_industries_object {
    /**
     * @param {string} shape 
     * @param {string} type 
     */
    constructor(shape, type, direction = 'w') {
        super();
        this.name = 'beacon_proto';
        let effect = 0;
        this.speedEffect = 0;
        this.productionEffect = 0;
        this.costEffect = 0;
        switch(shape) {
            case 'knight':
                this.name = 'KB';
                this.maskX = [-1, 1, 2, 2, 1, -1, -2, -2];
                this.maskY = [-2, -2, -1, 1, 2, 2, 1, -1];
            break;

            case 'arrow':
                this.name = 'AB';
                switch (direction) {
                    case 'w':
                        this.maskX = [-2, -1, -1, 0, 0, 0, 0, 0, 1, 1, 2];
                        this.maskY = [-3, -3, -4, -1, -2, -3, -4, -5, -3, -4, -3];
                    break;
                    case 'a':
                        this.maskX = [-3, -3, -4, -1, -2, -3, -4, -5, -3, -4, -3];
                        this.maskY = [-2, -1, -1, 0, 0, 0, 0, 0, 1, 1, 2];
                    break;
                    case 's':
                        this.maskX = [-2, -1, -1, 0, 0, 0, 0, 0, 1, 1, 2];
                        this.maskY = [3, 3, 4, 1, 2, 3, 4, 5, 3, 4, 3];
                    break;
                    case 'd':
                        this.maskX = [3, 3, 4, 1, 2, 3, 4, 5, 3, 4, 3];
                        this.maskY = [-2, -1, -1, 0, 0, 0, 0, 0, 1, 1, 2];
                    break;
                }
            break;

            case 'wall':
                this.name = 'WB';
                switch (direction) {
                    case 'w':
                    case 's':
                        this.maskX = [-1, -2, -3, -4, -5, -6, 1, 2, 3, 4, 5, 6];
                        this.maskY = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                    break;
                    case 'a':
                    case 'd':
                        this.maskX = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                        this.maskY = [-1, -2, -3, -4, -5, -6, 1, 2, 3, 4, 5, 6];
                    break;
                }
            break;

            case 'donut':
                this.name = 'DB';
                this.maskX = [-2, -1, 0, 1, 2, 2, 2, 2, 2, 1, 0, -1, -2, -2, -2, -2];
                this.maskY = [2, 2, 2, 2, 2, 1, 0, -1, -2, -2, -2, -2, -2, -1, 0, 1];
            break;

            default:
                shape = 'box';
            case 'box':
                this.name = 'BB';
                this.maskX = [-1, 0, 1, 1, 1, 0, -1, -1];
                this.maskY = [-1, -1, -1, 0, 1, 1, 1, 0];
            break;
        }
        switch(type) {
            case 'production':
                this.name += 'P';
                switch (shape) {
                    case 'box': effect = 0.3; break;
                    case 'knight': effect = 0.35; break;
                    case 'wall': effect = 0.27; break;
                    case 'donut': effect = 0.26; break;
                    case 'arrow': effect = 0.22; break;
                }
                this.productionEffect = effect;
            break;

            case 'cost':
                this.name += 'C';
                switch (shape) {
                    case 'box': effect = 0.15; break;
                    case 'knight': effect = 0.13; break;
                    case 'wall': effect = 0.09; break;
                    case 'donut': effect = 0.08; break;
                    case 'arrow': effect = 0.07; break;
                }
                effect = 1 - effect;
                this.costEffect = effect;
            break;

            default:
                type = 'speed';
            case 'speed':
                this.name += 'S';
                switch (shape) {
                    case 'box': effect = 0.4; break;
                    case 'knight': effect = 0.35; break;
                    case 'wall': effect = 0.27; break;
                    case 'donut': effect = 0.23; break;
                    case 'arrow': effect = 0.26; break;
                }
                this.speedEffect = effect;
            break;
        }
        this.shape = shape;
        this.type = type;
        this.direction = direction;
    }

    /**
     * @param {NGU_industries} NGU 
     * @param {number} x 
     * @param {number} y 
     */
    init(NGU, x, y) {
        let sx, sy;
        for (let i = 0; i < this.maskX.length; i++) {
            sx = x + this.maskX[i];
            sy = y + this.maskY[i];
            if (NGU.isValidPosition(sx, sy)) {
                const cell = NGU.cells[sy][sx];
                const before = cell.getYield();
                cell.addSpeed(this.speedEffect);
                cell.addProduction(this.productionEffect);
                cell.addCost(this.costEffect);
                const after = cell.getYield();
                NGU.getYieldUpdate(before, after);
            }
        }
    }

    /**
     * @param {NGU_industries} NGU 
     * @param {number} x 
     * @param {number} y 
     */
    delete(NGU, x, y) {
        let sx, sy;
        for (let i = 0; i < this.maskX.length; i++) {
            sx = x + this.maskX[i];
            sy = y + this.maskY[i];
            if (NGU.isValidPosition(sx, sy)) {
                const cell = NGU.cells[sy][sx];
                const before = cell.getYield();
                cell.addSpeed(-this.speedEffect);
                cell.addProduction(-this.productionEffect);
                cell.addCost(-this.costEffect);
                const after = cell.getYield();
                NGU.getYieldUpdate(before, after);
            }
        }
    }
}

