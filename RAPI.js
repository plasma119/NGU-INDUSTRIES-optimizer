// main graphic engine class
// maybe remove layer moving functions?
class RAPI {
	constructor(element, w, h) {
		this.element = element;
		this.w = w;
		this.h = h;
		this.container = addElement(element, "div", "RAPIContainer");
		this.container.setAttribute("style", "width: " + w + "px; height: " + h + "px;");
		this.container.setAttribute("tabindex", 0); // enable element focus for keyboard handler
		this.mouse_handler = new MouseHandler(this.container, this.w);
		this.key_handler = new KeyboardHandler(this.container);
		this.key_handler.ini();
		this.imageManager = new ImageManager();
		this.spriteManager = new SpriteManager(this.imageManager);
		this.fontManager = new FontManager(this.imageManager);
		this.layers = [];
	}

	addLayer(type, z) {
		var canvas = addElement(engine.container, "canvas");
		canvas.width = this.w;
		canvas.height = this.h;
		if (type == "WGUI2") {
			var layer = new WGUI2(this, canvas);
			layer.ini();
		}
		else {
			var layer = new GUI(this, canvas);
		}
		this.putLayer(layer, z);
		return layer;
	}

	update(forceDraw) {
		this.layers.forEach((layer) => layer.update(forceDraw));
	}

	render(forceDraw) {
		this.layers.forEach((layer) => layer.render(forceDraw));
	}

	updateZ() {
		this.layers.forEach((layer, i) => layer.canvas.setAttribute("style", "z-index: " + i));
	}

	findLayerId(id) {
		this.layers.forEach((layer, i) => {
			if (layer.id == id) {
				return i;
			}
		});
		return -1;
	}

	moveLayer(id, z) {
		var layer = this.cutLayer(id); if (layer) {
			this.putLayer(layer, z);
		}
	}

	cutLayer(id) {
		var index = (typeof id == "number" ? id : this.findLayerId(id));
		if (index == -1) {
			return false;
		}
		var layer = this.layers[index];
		delete this.layers[index];
		return layer;
	}

	putLayer(layer, z) {
		if (z && z < this.layers.length - 1) {
			if (this.layers[z]) {
				this.layers.splice(z, 0, layer);
				this.updateZ();
				return;
			}
			else {
				this.layers[z] = layer;
			}
		}
		else {
			this.layers.push(layer);
			z = this.layers.length - 1;
		}
		layer.canvas.setAttribute("style", "z-index: " + z);
	}
}


// Mouse handler class
// todo: fix this mess
function MouseHandler(element,baseWidth) {
	this.data=[];
	if (baseWidth) {this.baseWidth=baseWidth;} // for projecting mouse true coordinate
	this.drag=null; // for drag detection
	this.down=null; // for click detection
	this.deltaY = 0; // for scroll detection
	this.lastDragPos=[0,0];
	this.mz=[0,0,0,0,0];
	this.TMatrix=null;
	this.element=element;
	element.addEventListener("selectstart",(e)=>{e.preventDefault();return false;},false); // prevent text selection on double click
	element.addEventListener("mousedown",(e)=>{
		var s=this.getScale();m=this.mz;m[2]=e.offsetX/s;m[3]=e.offsetY/s;m[4]=1;
		this.handle("mousedown",0,0);
	},false);
	element.addEventListener("mouseup",(e)=>{
		var s=this.getScale(),m=this.mz;m[0]=e.offsetX/s;m[1]=e.offsetY/s;m[4]=0;
		this.handle("mouseup",0,0);
		this.drag=null; // remove drag
	},false);
	element.addEventListener("mousemove",(e)=>{
		var s=this.getScale(),m=this.mz;m[0]=e.offsetX/s;m[1]=e.offsetY/s;
		this.handle("mousemove",0,0);
		if (this.drag) {
			// call drag
			var diff=[m[0]-this.lastDragPos[0],m[1]-this.lastDragPos[1]];
			this.lastDragPos=[m[0],m[1]];
			this.drag.callback(m,diff);
		}
	},false);
	window.addEventListener("wheel", e => {
		this.deltaY = Math.sign(e.deltaY);
		this.handle("mousewheel", 0, 0);
	});
}
MouseHandler.prototype.onmousemove=function(f) {return this.addHandle("mousemove",0,0,0,0,f);}
MouseHandler.prototype.onmousedown=function(x,y,xx,yy,f) {return this.addHandle("mousedown",x,y,xx,yy,f);}
MouseHandler.prototype.onmouseup=function(x,y,xx,yy,f) {return this.addHandle("mouseup",x,y,xx,yy,f);}
MouseHandler.prototype.onclick=function(x,y,xx,yy,f) {return this.addHandle("click",x,y,xx,yy,f);}
MouseHandler.prototype.onhover=function(x,y,xx,yy,f) {return this.addHandle("hover",x,y,xx,yy,f);}
MouseHandler.prototype.ondrag=function(x,y,xx,yy,f) {return this.addHandle("drag",x,y,xx,yy,f);}
MouseHandler.prototype.ondrop=function(x,y,xx,yy,f) {return this.addHandle("drop",x,y,xx,yy,f);}
MouseHandler.prototype.addHandle=function(type,x,y,xx,yy,f) {
	var o=new MouseHandler_object(this,type,x,y,xx,yy,f);
	this.data.push(o);
	return o;
}
MouseHandler.prototype.put=function(o) {this.data.push(o);o.removeState=false;}
MouseHandler.prototype.getScale=function() {return this.baseWidth? this.element.clientWidth/this.baseWidth:(this.element.width? this.element.clientWidth/this.element.width:1);}
MouseHandler.prototype.remove=function(id) {this.data.forEach((o,i)=>{if (o.id==id) {this.data.splice(i,1);return;}});}
MouseHandler.prototype.pointInBox=function(px,py,b,x,y) {
	if (this.TMatrix instanceof TMatrix) {
		let m=this.TMatrix.screenPoint(px,py);
		return m[0]>b.x+x&&m[0]<b.x+x+b.xx&&m[1]>b.y+y&&m[1]<b.y+y+b.yy;
	} else {
		return px>b.x+x&&px<b.x+x+b.xx&&py>b.y+y&&py<b.y+y+b.yy;
	}
}
MouseHandler.prototype.update=function() {
	for (var i=0;i<this.data.length;i++) {
		if (this.data[i].removeState) {this.data.splice(i,1);i--;}
		if (this.data[i].moveTopState) {
			var o=this.data.splice(i,1);i--;
			o.moveTopState=false;
			this.data.push(o);
		}
	}
}
MouseHandler.prototype.handle=function(type,x,y) {
	this.update();
	for (var i=this.data.length-1;i>=0;i--) {if (this.data[i].handle(type,x,y)) {return;}}
}


// MouseHandler object class
function MouseHandler_object(mouse_handler,type,x,y,xx,yy,callback) {
	this.id=IDC.get("MouseHandler_object");
	this.mouse_handler=mouse_handler;
	this.callback=callback;
	this.type=type;
	this.skip=false;
	this.block=true;
	this.removeState=false;
	this.moveTopState=false;
	this.x=x;this.y=y;this.xx=xx;this.yy=yy;
}
MouseHandler_object.prototype.remove=function() {this.removeState=true;}
MouseHandler_object.prototype.moveTop=function() {this.moveTopState=true;}
MouseHandler_object.prototype.move=function(x,y) {this.x+=x;this.y+=y;}
MouseHandler_object.prototype.handle=function(type,x,y) {
	// return true to stop main handler
	if (this.skip) {return false;}
	var m=this.mouse_handler.mz,c=this.mouse_handler.pointInBox.bind(this.mouse_handler);
	switch (type) {
		case "mousedown":
			if (this.type=="mousedown"&&c(m[2],m[3],this,x,y)) {this.callback(m);return this.block;}
			if (this.type=="click"&&c(m[2],m[3],this,x,y)) {this.mouse_handler.down=this;return this.block;}
			if (this.type=="drag"&&c(m[2],m[3],this,x,y)) {this.mouse_handler.drag=this;this.mouse_handler.lastDragPos=[m[2],m[3]];return this.block;} // set drag
		break;
		
		case "mouseup":
			if (this.mouse_handler.drag&&this.mouse_handler.drag.block) {return true;}
			if (this.type=="mouseup"&&c(m[0],m[1],this,x,y)) {this.callback(m);return this.block;}
			if (this.type=="click"&&this==this.mouse_handler.down&&c(m[0],m[1],this,x,y)) {this.mouse_handler.down=null;this.callback(m);return this.block;}
		break;
		
		case "mousemove":
			if (this.type=="mousemove") {this.callback(m);return this.block;}
			if (this.type=="hover"&&c(m[0],m[1],this,x,y)) {this.callback(m);return this.block;}
		break;

		case "mousewheel":
			if (this.type == "mousewheel") {
				this.callback(m, this.mouse_handler.deltaY);
			}
		break;
	}
	return false;
}


// MouseHandler object cluster class
function MouseHandler_objectCluster(mouse_handler,x,y) {
	this.id=IDC.get("MouseHandler_objectCluster");
	this.mouse_handler=mouse_handler.mouse_handler? mouse_handler.mouse_handler:mouse_handler;
	this.data=[];
	this.removeState=false;
	this.moveTopState=false;
	this.TMatrix=null;
	this.x=x||0,this.y=y||0;
}
inherit(MouseHandler_objectCluster,MouseHandler_object);
MouseHandler_objectCluster.prototype.remove=function() {this.removeState=true;}
MouseHandler_objectCluster.prototype.moveTop=function() {this.moveTopState=true;}
MouseHandler_objectCluster.prototype.move=function(x,y) {this.x+=x;this.y+=y;}
MouseHandler_objectCluster.prototype.update=function() {
	for (var i=0;i<this.data.length;i++) {
		if (this.data[i].removeState) {this.data.splice(i,1);i--;}
		if (this.data[i].moveTopState) {
			var o=this.data.splice(i,1);i--;
			o.moveTopState=false;
			this.data.push(o);
		}
	}
}
MouseHandler_objectCluster.prototype.handle=function(type,x,y) {
	this.update();
	if (this.TMatrix) {var tm=this.mouse_handler.TMatrix;this.mouse_handler.TMatrix=this.TMatrix;}
	for (var i=this.data.length-1;i>=0;i--) {
		if (this.data[i].handle(type,x+this.x,y+this.y)) {
			if (this.TMatrix) {this.mouse_handler.TMatrix=tm;};
			return true;
		}
	}
	if (this.TMatrix) {this.mouse_handler.TMatrix=tm;}
	return false;
}
MouseHandler_objectCluster.prototype.put=function(o) {this.data.push(o);o.removeState=false;}
MouseHandler_objectCluster.prototype.addHandle=function(type,x,y,xx,yy,f) {
	var o=new MouseHandler_object(this.mouse_handler,type,x,y,xx,yy,f);
	this.data.push(o);
	return o;
}



// Keyboard handler class
// keyCode for keydown/up refer to keyboard not ASCII code
// keyCode for keypress refer to ASCII code
function KeyboardHandler(element) {
	this.element=element;
	this.key=[];
	this.ASCII=[];
	this.data=[[]];
}
KeyboardHandler.prototype.ini=function() {
	this.element.addEventListener("keydown",(e)=>this.handler(e,"keydown"),false);
	this.element.addEventListener("keypress",(e)=>this.handler(e,"keypress"),false);
	this.element.addEventListener("keyup",(e)=>this.handler(e,"keyup"),false);
}
KeyboardHandler.prototype.handler=function(e,type) {
	//console.log(type,e.key,e.keyCode);
	var ASCII;
	if (type=="keypress") {ASCII=e.keyCode;} else {ASCII=e.key.length>1? 0:e.key.charCodeAt(0);}
	if (type=="keyup") {this.ASCII[ASCII]=false;this.key[e.keyCode]=false;} else {this.ASCII[ASCII]=true;this.key[e.keyCode]=true;}
	this.data[0].forEach(function(a) {if (a[1]===type) {a[2](e);}});
	if (Array.isArray(this.data[e.keyCode])) {
		this.data[e.keyCode].forEach(function(a) {if (a[1]===type) {a[2](e);}});
	}
}
KeyboardHandler.prototype.onkeypress=function(k,f) {return this.add(k,"keypress",f);}
KeyboardHandler.prototype.onkeydown=function(k,f) {return this.add(k,"keydown",f);}
KeyboardHandler.prototype.onkeyup=function(k,f) {return this.add(k,"keyup",f);}
KeyboardHandler.prototype.add=function(k,type,f) {
	var id=IDC.get("KeyboardHandler")+"_key_"+k;
	if (!Array.isArray(this.data[k])) {this.data[k]=[];};
	this.data[k].push([id,type,f]);
	return id;
}
KeyboardHandler.prototype.remove=function(id) {
	var tokens=id.split("_");
	for (var i=0;i<this.data[k].length;i++) {
		if (this.data[k][i][0]===id) {this.data[k].splice(i,1);return;}
	}
}
KeyboardHandler.prototype.keypressed=function(keyCode) {
	return this.key[keyCode];
}
KeyboardHandler.prototype.ASCIIpressed=function(ascii) {
	return this.ASCII[ascii];
}

