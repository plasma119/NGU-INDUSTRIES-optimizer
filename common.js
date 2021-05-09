function clone(obj) {function CloneFactory() {};CloneFactory.prototype=obj;return new CloneFactory();}
function inherit(child,parent) {
	child.prototype=clone(parent.prototype);
	child.prototype.constructor=child;
	child.prototype.superproto=parent.prototype;
	return child;
}

function clamp(val, min, max) {
	return Math.min(Math.max(min, val), max);
}

// fancy timeout using promise
function wait(ms) {
	return new Promise((resolve)=>setTimeout(resolve,ms));
}

// linear Interpolation
function interpolation(start, end, array, progress) {
	if (!Array.isArray(array)) { return start * (1 - array) + end * array; }
	if (array.length < 2) { return start * (1 - array[0]) + end * array[0]; }
	const x = (progress % 1) * (array.length - 1);
	const i = Math.floor(x);
	const p = array[i] * (1 - x + i) + array[i + 1] * (x - i);
	return start * (1 - p) + end * p;
}

function arcToLineSegment(x, y, r, a, arc) {
	const length = (arc * r * 2);
	const num = Math.ceil(length / 25);
	const step = arc / num;
	const arcEnd = a + arc;
	const lines = [];
	for (var t = 0; t <= arcEnd; t += step) {
		lines.push([
			x + r * Math.cos(t),
			y + r * Math.sin(t)
		]);
	}
	return lines;
}

// make element fullscreen
function fullsc(o) {var D=document;if(D.fullscreenElement||D.webkitFullscreenElement||D.mozFullScreenElement||D.msFullScreenElement){D.exitFullscreen?D.exitFullscreen():D.mozCancelFullScreen?D.mozCancelFullScreen():D.webkitExitFullscreen?D.webkitExitFullscreen():D.msExitFullscreen?D.msExitFullscreen():""}else{o.requestFullscreen?o.requestFullscreen():o.mozRequestFullScreen?o.mozRequestFullScreen():o.webkitRequestFullscreen?o.webkitRequestFullscreen():o.msRequestFullscreen?o.msRequestFullscreen():""}}

function addElement(target,type,className,id) {
	var element=(type instanceof HTMLElement? type:document.createElement(type));
	if (typeof(className)=="string") {element.className=(element.className==""? "":element.className+" ")+className;};
	if (id==0||id) {element.id=id};
	if (target instanceof HTMLElement) {target.appendChild(element)};
	return element;
}
function putElement(target,element,attribute,html) {
	var b=addElement(target,element);
	if (html) {b.innerHTML=html;}
	attribute.forEach((a)=>b.setAttribute(a[0],a[1]));
	return b;
}

// ID controller
// to give unique id to each caller
const IDC = {
	get: function (group) {
		if (typeof group == "string") {
			if (!this.data[group]) { this.data[group] = 1; }
			return group + "_" + this.data[group]++;
		} else {
			return this.next++;
		}
	},
	data: {},
	next: 1
}


// HiddenCanvasObject class
class HiddenCanvasObject {
	constructor(w, h) {
		this.canvas = document.createElement("canvas");
		this.id = IDC.get("HiddenCanvas");
		this.canvas.width = w;
		this.canvas.height = h;
		this.ctx = this.canvas.getContext('2d');
	}

	remove() {
		this.canvas.remove();
	}
}


// Vector2D class
function Vector2D(x = 0,y = 0) {if (Array.isArray(x)) {this.x=x[0];this.y=x[1];} else {this.x=x; this.y=y;}}
Vector2D.prototype.copy=function() {return new Vector2D([this.x,this.y]);}
Vector2D.prototype.put=function(v) {this.x=v.x;this.y=v.y;}
Vector2D.prototype.putArr=function(arr) {this.x=arr.x;this.y=arr.y;}
Vector2D.prototype.add=function(v) {return new Vector2D([this.x+v.x,this.y+v.y]);}
Vector2D.prototype.addArr=function(arr) {return new Vector2D([this.x+arr[0],this.y+arr[1]]);}
Vector2D.prototype.subtract=function(v) {return new Vector2D([this.x-v.x,this.y-v.y]);}
Vector2D.prototype.subtractArr=function(arr) {return new Vector2D([this.x-arr[0],this.y-arr[1]]);}
Vector2D.prototype.multiply=function(m) {return new Vector2D([this.x*m,this.y*m]);}
Vector2D.prototype.rotate=function(a) {var c=Math.cos(a),s=Math.sin(a);return new Vector2D([this.x*c-this.y*s,this.x*s+this.y*c]);}

// scalar result
Vector2D.prototype.length=function() {return Math.sqrt(this.x*this.x+this.y*this.y);}
Vector2D.prototype.lengthSquare=function() {return this.x*this.x+this.y*this.y;}
Vector2D.prototype.dot=function(v) {return this.x*v.x+this.y*v.y;}
Vector2D.prototype.dotArr=function(arr) {return this.x*arr[0]+this.y*arr[1];}
Vector2D.prototype.scalarProjection=function(v) {return this.dot(v)/v.length();} // u proj onto v

// vector result
Vector2D.prototype.unitVector=function() {return this.multiply(1/this.length());}
Vector2D.prototype.normal=function() {return new Vector2D([-this.y,this.x]);}
Vector2D.prototype.projection=function(v) {return v.multiply(this.dot(v)/v.dot(v));} // u proj onto v
Vector2D.prototype.rejection=function(v) {return this.projection(v).add(this);}

// other result
Vector2D.prototype.toAngle=function() {return Math.atan2(this.y,this.x);}
Vector2D.prototype.toString=function() {return "x:"+Math.round(this.x*100)/100+" y:"+Math.round(this.y*100)/100;}
Vector2D.prototype.toArray=function() {return [this.x,this.y];}

Vector2D.prototype.angleBetween=function(v) {return Math.acos(this.dot(v)/(this.length()*v.length()));}


// Line2D class
function Line2D(v0,v1) {
	// L(t)=v0+t*v1,t:0-1
	this.v0=v0;
	this.v1=v1;
}
Line2D.prototype.intersect=function(l2) {
	// check if two line intersect or not
	var d=this.v1.x*l2.v1.y-this.v1.y*l2.v1.x;
	if (d==0) {return false;} // parallel
	d=1/d;
	var s=d*((l2.v0.x-this.v0.x)*l2.v1.y-(l2.v0.y-this.v0.y)*l2.v1.x);
	var t=d*((l2.v0.x-this.v0.x)*this.v1.y-(l2.v0.y-this.v0.y)*this.v1.x);
	if (s>0&&s<1&&t>0&&t<1) {return this.v0.add(this.v1.multiply(t)).toArray();} // return intersection point
	return false;
}
Line2D.prototype.toArray=function() {
	return [this.v0.x,this.v0.y,this.v0.x+this.v1.x,this.v0.y+this.v1.y];
}


// 2D transform matrix class
function TMatrix(m) {
	this.matrix=m||[1,0,0,1,0,0];
}
TMatrix.prototype.multiply=function(mat) {
	if (mat instanceof TMatrix) {mat=mat.matrix;}
	const m=this.matrix;
	const m0=m[0]*mat[0]+m[2]*mat[1];
	const m1=m[1]*mat[0]+m[3]*mat[1];
	const m2=m[0]*mat[2]+m[2]*mat[3];
	const m3=m[1]*mat[2]+m[3]*mat[3];
	const m4=m[0]*mat[4]+m[2]*mat[5]+m[4];
	const m5=m[1]*mat[4]+m[3]*mat[5]+m[5];
	this.matrix=[m0,m1,m2,m3,m4,m5];
	return this.matrix;
}
TMatrix.prototype.screenPoint=function(transformedX,transformedY) {
	// invert
	let m=this.matrix,d=1/(m[0]*m[3]-m[1]*m[2]);
	im=[ m[3]*d, -m[1]*d, -m[2]*d, m[0]*d, d*(m[2]*m[5]-m[3]*m[4]), d*(m[1]*m[4]-m[0]*m[5]) ];
	// point
	return([transformedX*im[0]+transformedY*im[2]+im[4],transformedX*im[1]+transformedY*im[3]+im[5]]);
}
TMatrix.prototype.transformedPoint=function(screenX,screenY) {let m=this.matrix;return([screenX*m[0]+screenY*m[2]+m[4],screenX*m[1]+screenY*m[3]+m[5]]);}
TMatrix.prototype.transform=function(translate,rotate,scale) {
	translate=translate||[0,0];rotate=rotate||0;
	let sx,sy;
	if (Array.isArray(scale)) {sx=scale[0],sy=scale[1]} else {scale=scale||1;sx=scale;sy=scale;}
	let xx=Math.cos(rotate),xy=Math.sin(rotate);
	this.matrix=[xx*sx,xy,-xy,xx*sy,translate[0],translate[1]];
	return this.matrix;
}
TMatrix.prototype.translate=function(x,y) {return this.multiply([1,0,0,1,x,y]);};
TMatrix.prototype.rotate=function(rAngle) {let c=Math.cos(rAngle),s=Math.sin(rAngle);return this.multiply([c,s,-s,c,0,0]);};
TMatrix.prototype.scale=function(x,y) {return this.multiply([x,0,0,y,0,0]);};
TMatrix.prototype.skew=function(radianX,radianY) {return this.multiply([1,Math.tan(radianY),Math.tan(radianX),1,0,0]);};
TMatrix.prototype.reset=function() {this.matrix=[1,0,0,1,0,0];return this.matrix;}
TMatrix.prototype.clone=function() {return new TMatrix(this.matrix.slice());}
TMatrix.prototype.toString=function() {return "["+this.matrix.toString()+"]";}


// fetch and parse JSON file using promise
function fetchJSON(url) {
	return new Promise(resolve =>
		fetch(url)
			.then(res => res.text())
			.then(text => {
				try {
					resolve(JSON.parse(text));
				} catch (e) {
					console.log(e);
					resolve({});
				}
			})
	);
}


// Data Manager class
class DataManager {
	constructor() {
		this.data = {};
	}

	addData(name, data) {
		this.data[name] = data;
	}

	putData(name, data) {
		this.data[name] = data;
	}

	getData(name) {
		return this.data[name];
	}

	loadURL(url) {
		return new Promise(resolve => {
			fetchJSON(url)
				.then(json => {
					Object.assign(this.data, json);
					resolve(this.data);
				});
		});
	}
}


// SpriteSheetManager class
// inject SpriteSheetImage into imageManager
class SpriteSheetManager extends DataManager {
    constructor() {
        super();
    }

    createSpriteSheetImage(o, meta) {
        var img = new SpriteSheetImage(
            o.filename,
            o.frame.x,
            o.frame.y,
            o.frame.w,
            o.frame.h,
			meta.image
        );
		this.putData(o.filename, img);
    }

	loadObject(o, meta) {
		Object.keys(o).forEach(k => this.createSpriteSheetImage(o[k], meta));
	}

	loadURL(url) {
		return new Promise((resolve) => {
			fetchJSON(url)
				.then(json => {
					this.loadObject(json["frames"], json["meta"]);
					resolve(this.data);
				});
		});
	}
}

class SpriteSheetImage {
    constructor(name, x, y, w, h, src) {
        this.name = name;
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
		this.src = src;
    }
}

// ImageManager class
class ImageManager extends DataManager {
	constructor() {
		super();
		this.spriteSheetManager = new SpriteSheetManager;
	}

	getImage(name) {
		return this.getData(name);
	}

	loadImage(name, url, json) {
		if (Array.isArray(name)) {
			url = name[1];
			json = name[2];
			name = name[0];
		}
		if (json) {
			return new Promise(resolve => {
				this.spriteSheetManager.loadURL(json)
				.then(() => {
					this.loadImage(url, url);
				})
				.then(() => {
					resolve();
				});
			});
		}
		if (this.spriteSheetManager.getData(url)) {
			return new Promise(resolve => {
				this.data[name] = this.spriteSheetManager.getData(url);
				resolve({
					name: name,
					img: this.data[name],
					status: "ok"
				});
			});
		}
		return new Promise((resolve) => {
			const img = new Image();
			this.data[name] = img;
			img.onload = () => {
				resolve({
					name: name,
					img: img,
					status: "ok"
				});
			};
			img.onerror = () => {
				resolve({
					name: name,
					img: img,
					status: "error"
				});
			};
			img.src = url;
		});
	}

	loadArray(arr) {
		return Promise.all(arr.map(this.loadImage.bind(this)));
	}

	loadURL(url) {
		return new Promise((resolve) => {
			fetchJSON(url)
				.then(json => {
					this.loadArray(json["image"]);
					resolve(this.data);
				});
		});
	}
}


// SpriteManager class
class SpriteManager extends DataManager {
	constructor(imageManager) {
		super();
		this.imageManager = imageManager;
	}

	createSpriteData(name, src, param = {}) {
		param.src = src;
		this.data[name] = param;
	}

	getSpriteData(name) {
		return this.data[name];
	}

	putSpriteData(name, param) {
		this.data[name] = param;
	}

	createSprite(name) {
		const p = (this.data[name] ? this.data[name] : {});
		if (!p.size && p.src) {
			if (typeof p.src == "string") {
				const img = this.imageManager.getImage(p.src);
				if (img) {
					p.size = [img.width, img.height];
				} else {
					p.size = [0, 0];
				}
			} else {
				p.size = [p.src.width, p.src.height];
			}
		}
		return new GUI_sprite(p);
	}

	loadArray(arr) {
		arr.forEach(a => this.createSpriteData(a[0], a[1], a[2]));
	}

	loadURL(url) {
		return new Promise((resolve) => {
			fetchJSON(url)
				.then(json => {
					this.loadArray(json["sprite"]);
					resolve(this.data);
				});
		});
	}
}


// FontManager class
class FontManager extends DataManager {
	constructor(imageManager) {
		super();
		this.imageManager = imageManager;
	}

	getFont(name) {
		return this.data[name];
	}

	loadFont(name, src, size) {
		this.data[name] = new Font(src, size);
	}

	loadArray(arr) {
		arr.forEach(a => this.loadFont(a[0], a[1], a[2]));
	}

	loadURL(url) {
		return new Promise((resolve) => {
			fetchJSON(url)
				.then(json => {
					this.loadArray(json["font"]);
					resolve(this.data);
				});
		});
	}
}


// Font class
// 10 characters per row, a-z,0-9
// case-insensitive!
class Font {
	constructor(src, size) {
		this.src = src;
		this.size = size;
		this.drawObject = new DrawObject({
			type: "image",
			sw: this.size,
			sh: this.size,
			data: this.src
		});
	}
	
	drawLine(gui, x, y, string, size) {
		for (var i = 0; i < string.length; i++) {
			this.drawCharacter(gui, x + size * i, y, string.charAt(i), size);
		}
	}

	drawCircle(gui, x, y, string, size, radius, angle, arc) {
		const r = arc / string.length;
		const matrix = new TMatrix([1, 0, 0, 1, x, y]);
		const matrixPush = new DrawObject({
			type: "matrix_push",
			data: matrix
		});
		for (var i = 0; i < string.length; i++) {
			matrix.rotate(i == 0? angle: r);
			gui.renderObject(matrixPush);
			this.drawCharacter(gui, 0, -radius, string.charAt(i), size);
			gui.renderObject(gui.matrix_pop_object);
		}
	}

	drawCharacter(gui, x, y, character, size) {
		var n = this.getN(character);
		if (n > -1) {
			this.drawObject.sx = (n % 10) * this.size;
			this.drawObject.sy = Math.floor(n / 10) * this.size;
			this.drawObject.x = x - size / 2;
			this.drawObject.y = y - size / 2;
			this.drawObject.w = size;
			this.drawObject.h = size;
			gui.renderObject(this.drawObject);
		}
	}

	getN(c) {
		var n = c.charCodeAt(0);
		if (n > 47 && n < 58) {
			n -= 18; // 0-9
		} else if (n > 64 && n < 91) {
			n -= 65; //A-Z
		} else if (n > 96 && n < 123) {
			n -= 97; //a-z
		} else {
			n = -1;
		}
		return n;
	}
}







// https://stackoverflow.com/questions/41946007/efficient-and-well-explained-implementation-of-a-quadtree-for-2d-collision-det

// QuadTree class
class QuadTree {
	constructor(x, y, width, height, max_depth = 5) {
		this.x = x;
		this.y = y;
		this.w = width;
		this.h = height;
		this.max_depth = max_depth;
		this.root = new QuadTreeNode(x, y, width, height, 0);
	}

	insert(AABB, element) {
		this.root.insert(AABB, element, this.max_depth);
	}

	query(AABB) {
		return this.root.query(AABB, []);
	}

	getLeaves() {
		return this.root.getLeaves([]);
	}

	draw(gui) {
		this.root.draw(gui);
	}
}

class QuadTreeNode {
	constructor(x, y, w, h, depth) {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
		this.depth = depth;
		this.leaves = null;
		this.elements = [];
		this.AABBs = [];
	}

	insert(AABB, element, max_depth) {
		if (max_depth > 6) {
			throw("what");
		}
		if ((this.elements && this.elements.length < 2) || this.depth >= max_depth) {
			this.elements.push(element);
			this.AABBs.push(AABB);
		} else {
			if (this.elements) {
				// subdivide
				this.subdivide();
				this.elements.forEach((e, i) => this.insertToLeaves(this.AABBs[i], e, max_depth), this);
				this.elements = null;
				this.AABBs = null;
			}
			this.insertToLeaves(AABB, element, max_depth);
		}
	}

	insertToLeaves(AABB, element, max_depth) {
		this.leaves.forEach(l => {
			if ((l.x + l.w > AABB[0] && l.x < AABB[1]) && (l.y + l.h > AABB[2] && l.y < AABB[3])) {l.insert(AABB, element, max_depth);}
		});
	}

	subdivide() {
		this.leaves = [];
		const new_w = this.w / 2;
		const new_h = this.h / 2;
		this.leaves.push(new QuadTreeNode(this.x, this.y, new_w, new_h, this.depth + 1));
		this.leaves.push(new QuadTreeNode(this.x + new_w, this.y, new_w, new_h, this.depth + 1));
		this.leaves.push(new QuadTreeNode(this.x, this.y + new_h, new_w, new_h, this.depth + 1));
		this.leaves.push(new QuadTreeNode(this.x + new_w, this.y + new_h, new_w, new_h, this.depth + 1));
	}

	query(AABB, list) {
		if (this.leaves) {
			this.leaves.forEach(l => {
				if ((l.x + l.w > AABB[0] && l.x < AABB[1]) && (l.y + l.h > AABB[2] && l.y < AABB[3])) {l.query(AABB, list);}
			});
		} else if (this.elements.length > 0) {
			this.elements.forEach(e => list.push(e));
		}
		return list;
	}

	getLeaves(list) {
		if (this.leaves) {
			this.leaves.forEach(l => l.getLeaves(list));
		} else if (this.elements.length > 0) {
			list.push(this.elements);
		}
		return list;
	}

	draw(gui) {
		if (!this.drawObject) {
			this.drawObject = new DrawObject({
				type: "rect_line",
				color: "#008888"
			});
			this.drawObject.x = this.x;
			this.drawObject.y = this.y;
			this.drawObject.w = this.w;
			this.drawObject.h = this.h;
			gui.drawObject(this.drawObject);
		}
		if (this.leaves) {
			this.leaves.forEach(l => l.draw(gui));
		}
	}
}


// WorkerManager class
class WorkerManager {
	constructor() {
		this.workers = [];
		this.workQueue = [];
	}
	
	createWorker(url, messageHandler) {
		var w = new WorkerObject(url, messageHandler, this);
		this.workers.push(w);
		return w;
	}

	send(id, header, data, transferObject) {
		var worker = this.getWorker(id);
		if (worker) {
			worker.send(header, data, transferObject);
		}
	}

	work(data, transferObject) {
		for (var i = 0; i < this.workers.length; i++) {
			if (!this.workers[i].workStatus) {
				this.workers[i].work(data, transferObject);
				return true;
			}
		}
		this.workQueue.push([data, transferObject]);
		return false;
	}

	getWork() {
		if (this.workQueue.length > 0) {
			return this.workQueue.splice(0, 1)[0];
		}
		return false;
	}

	getWorker(id) {
		this.workers.forEach(w => {if (w.id === id) {return w;}});
	}
}

// WorkerObject class
class WorkerObject {
	constructor(url, messageHandler, workerManager) {
		this.id = IDC.get("workerObject");
		this.worker = new Worker(url);
		this.userHandler = messageHandler;
		this.worker.onmessage = this.messageHandler.bind(this);
		this.worker.onerror = this.errorHandler.bind(this);
		this.url = url;
		this.workStatus = false;
		this.workerManager = workerManager;
	}

	send(header, data, transferObject) {
		if (header === "work") {
			this.workStatus = true;
		}
		this.worker.postMessage({header, data}, transferObject);
	}

	work(data, transferObject) {
		this.send("work", data, transferObject);
	}

	terminate() {
		this.worker.terminate();
	}

	messageHandler(e) {
		const header = e.data.header;
		const data = e.data.data;
		switch(header) {
			case "console":
				console.log(data);
			break;

			case "done":
				this.workStatus = false;
				if (this.workerManager) {
					var work = this.workerManager.getWork();
					if (work) {
						this.work(work[0], work[1]);
					}
				}
			break;
		}
		if (this.userHandler) {
			this.userHandler.call(this, header, data);
		}
	}

	errorHandler(e) {
		console.log(e);
	}
	
}