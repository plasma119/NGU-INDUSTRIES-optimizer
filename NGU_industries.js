
//@ts-check

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// all coordinates are Grid[y][x]

class GUI_object_NGU_industries extends GUI_frame {
    constructor(param) {
        super(Object.assign({
            NGU: null
        },param));
        this.id = IDC.get("GUI_NGU");
    }

    draw(gui) {
        /** @type {NGU_industries} */
        let NGU = this.param.NGU;
        for (let i = 0; i < NGU.w; i++) {
            for (let j = 0; j < NGU.h; j++) {
                let p = {
                    type: "rect_1",
                    x: i * 50,
                    y: j * 50,
                    w: 50,
                    h: 50,
                    width: 1,
                    color: NGU.layout[j][i]? "#00ff00":"#ff0000",
                    fillColor: NGU.layout[j][i]? "#008800":"#880000",
                    size: 10,
                    text: NGU.cells[j][i].getText(),
                };
                gui.drawObject(new DrawObject(p));
            }
        }
        super.draw(gui);
        for (let i = 0; i < NGU.w; i++) {
            for (let j = 0; j < NGU.h; j++) {
                let p = {
                    type: "rect_1_text",
                    x: i * 50,
                    y: j * 50,
                    w: 50,
                    h: 50,
                    width: 1,
                    color: "#ffffff",
                    fillColor: "#00000000",
                    size: 20,
                    text: NGU.cells[j][i].getText(),
                };
                gui.drawObject(new DrawObject(p));
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
        /** @type {number[][]} */
        this.layout = [];
        /** @type {NGU_industries_cell[][]} */
        this.cells = [];
        this.cellsFlat = [];
        this.w = 0;
        this.h = 0;
        this.optimizeList = [];
        this.getYield = this.yieldStrategySum;
        /** @type {GUI_frame} */
        this.GUI_frame = null;
        this.shuffleList = [];
        this.optimizing = false;
    }

    /**
     * @param {number[][]} layout 
     */
    initLayout(layout) {
        if (this.GUI_frame) {
            this.GUI_frame.clearObjects();
        }
        this.layout = layout;
        this.h = 16;
        this.w = 20;
        this.cellsFlat = [];
        this.shuffleList = [];
        for (let j = 0; j < this.h; j++) {
            this.cells[j] = [];
            for (let i = 0; i < this.w; i++) {
                const cell = new NGU_industries_cell(this, i, j)
                this.cells[j][i] = cell;
                let k = j * this.h + i;
                this.shuffleList[k] = k;
                this.cellsFlat[k] = cell;
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

    async optimize(callback) {
        if (this.optimizing) return;
        this.optimizing = true;
        for (let i = 0; i < 10000; i++) {
            if (!this.optimizing) return this.getYield();
            callback(await this.optimizeLoop());
        }
        this.optimizing = false;
        return this.getYield();
    }

    optimizeLoop() {
        return new Promise((resolve) => {
            setTimeout(() => {
                const alpha = 0.5;
                let best_yield = this.getYield();
                let arr = this.export();

                for (let i = 0; i < this.w; i++) {
                    for (let j = 0; j < this.h; j++) {
                        if (Math.random() < alpha) this.put(i, j, this.optimizeList[Math.floor(this.optimizeList.length * Math.random())]);
                    }
                }

                let p_y = this.getYield();
                let p = this.optimizeOnce();
                for (let k = 0; k < 5; k++) {
                    if (p > p_y) {
                        p_y = p;
                        p = this.optimizeOnce();
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
        let list = this.shuffleList.slice();
        shuffleArray(list);
        for (let k = 0; k < list.length; k++) {
            let i = list[k] % this.w;
            let j = Math.floor(list[k] / this.w);
            if (this.layout[j][i]) this.optimizeCell(i, j);
        }
        return this.getYield();
    }

    optimizeCell(x, y) {
        let t = this.cells[y][x];
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

    getYield() {
        // default to use yieldStrategySum
        return 0;
    }

    yieldStrategySum() {
        let total = 0;
        for (let k = 0; k < this.cellsFlat.length; k++) {
            total += this.cellsFlat[k].getYield();
        }
        return total;
    }

    yieldStrategyMax() {
        let max = 0;
        for (let k = 0; k < this.cellsFlat.length; k++) {
            let y = this.cellsFlat[k].getYield();
            if (y > max) max = y;
        }
        return max;
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

    getText() {
        return `${Math.round(this.getYield()*10)/10}`;
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
        // add max speed check later
        return this.speed;
    }

    getProduction() {
        return this.production;
    }

    getCost() {
        return this.cost;
    }

    getYield() {
        if (this.object) return this.object.output * this.getSpeed() * this.production / this.cost;
        return 0;
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
    init(NGU, x, y) {

    }

    /**
     * @param {NGU_industries} NGU 
     * @param {number} x 
     * @param {number} y 
     */
    delete(NGU, x, y) {

    }
}

class NGU_industries_object_Lab extends NGU_industries_object {
    constructor() {
        super();
        this.name = 'crappy_iron_cog'; // too lazy to get texture for lab
        this.output = 1.0;
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
                        this.maskY = [-2, -2, -3, -1, -2, -3, -4, -5, -2, -3, -2];
                    break;
                    case 'a':
                        this.maskX = [-2, -2, -3, -1, -2, -3, -4, -5, -2, -3, -2];
                        this.maskY = [-2, -1, -1, 0, 0, 0, 0, 0, 1, 1, 2];
                    break;
                    case 's':
                        this.maskX = [-2, -1, -1, 0, 0, 0, 0, 0, 1, 1, 2];
                        this.maskY = [2, 2, 3, 1, 2, 3, 4, 5, 2, 3, 2];
                    break;
                    case 'd':
                        this.maskX = [2, 2, 3, 1, 2, 3, 4, 5, 2, 3, 2];
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
                NGU.cells[sy][sx].addSpeed(this.speedEffect);
                NGU.cells[sy][sx].addProduction(this.productionEffect);
                NGU.cells[sy][sx].addCost(this.costEffect);
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
                NGU.cells[sy][sx].addSpeed(-this.speedEffect);
                NGU.cells[sy][sx].addProduction(-this.productionEffect);
                NGU.cells[sy][sx].addCost(-this.costEffect);
            }
        }
    }
}

