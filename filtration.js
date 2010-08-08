(function(){

function Stage(id){
	var 
		 cvs = document.getElementById(id)
		,dim = [ cvs.width, cvs.height, 0 ] // dimensions: width, height of canvas
		,ctx = cvs.getContext('2d')
		,r = Math.random()
		,max = 100 * r // max num of nodes per game
		,rwm = 0 // max radius per row, for init
		
		,nlist = []; // node list
	
	function draw(){
		
		ctx.fillStyle = "#000000";
		ctx.fillRect(0, 0, dim[0], dim[1]);
		
		var n = {};
		for(var i = 0; i < nlist.length; i++){
			n = nlist[i];
			
			var rgba = "rgba(" + Math.floor(n.dnes * 255) + ",0,0,1)";
			
			//ctx.shadowOffsetX = 0;
			//ctx.shadowOffsetY = 0;
			//ctx.shadowBlur = 10;
			//ctx.shadowColor = "rgba(0," + Math.floor(n.dnes * 255) + ",0,1)";
			
			ctx.fillStyle = rgba;
			ctx.beginPath();
			ctx.arc(n.cpos[0], n.cpos[1], n.rad, 0, Math.PI*2, false);
			ctx.fill();
		}
		ctx.fillStyle = "#FFFFFF";
		ctx.fillText( MM(60)[0], 100, 20 );
		//console.log(MM(60)[0]);
	}
	
	function resolveNodeCollisions(){
		for(var i = 0; i < nlist.length; i++){
			var n1 = nlist[i];
		
			for(var j = 0; j < nlist.length; j++){
				var n2 = nlist[j];
				if(n1 == n2) continue;
				var colVec =  vec3.sub(n1.cpos, n2.cpos); //n1.getCollisionDepth(n2)
				var combinedRadius = n1.rad + n2.rad;
				var dotCol = vec3.dot(colVec, colVec); // effectively the distance squared
				var radius2 = combinedRadius*combinedRadius;
				
				if(dotCol > radius2){
					continue;
				}
			
				var distance = Math.sqrt(dotCol);
				var distDiff = combinedRadius - distance;
				var distForEachCircle = distDiff / 2; // this can't be right
				var response = vec3.a(
					colVec[0]/distance*distForEachCircle,
					colVec[1]/distance*distForEachCircle,
					colVec[2] );
					
				n1.cpos = vec3.add(n1.cpos, response);
				n2.cpos = vec3.sub(n2.cpos, response);
				
				return true;
			}
		
		}
	}
	
	function checkBounds(node){
		node.cpos[0] = Math.max( 0 + node.rad, Math.min(node.cpos[0], dim[0] - node.rad) );
		node.cpos[1] = Math.max( 0 + node.rad, Math.min(node.cpos[1], dim[1] - node.rad) );
		node.cpos[2] = Math.max( 0 + node.rad, Math.min(node.cpos[1], dim[2] - node.rad) );
	}
	
	function goVerlet(dt){
		for(var i = 0; i < nlist.length; i++){
			var n1 = nlist[i];
		
			// add gravity temporarily
			//n1.acl = vec3.add(n1.acl, vec3.a(0, 100, 0));
		
			var temp = vec3.clone(n1.cpos);
			n1.cpos = vec3.add(
				vec3.add(
					vec3.sub(n1.cpos, n1.ppos),
					vec3.scale(n1.acl, dt*dt)
				), n1.cpos);
			
			n1.ppos = temp;
			n1.acl = vec3.a(0,0,0);
			//checkBounds(n1);
		}
		
	}
	
	/////////////////////////////////////
	// Init
	/////////////////////////////////////
	for(var i = 0; i < max; i++){
		var  rx = Math.random()
			,ry = Math.random()
			,n = new Node();
		rx *= dim[0]; // get random width
		ry *= dim[1]; // get random height
		
		// make sure we're contained within the stage
		rx = rx > dim[0] - n.rad ? rx -= n.rad : rx;
		rx = rx < n.rad ? rx += n.rad : rx;
		ry = ry > dim[1] - n.rad ? ry -= n.rad : ry;
		ry = ry < n.rad ? ry += n.rad : ry;
		
		n.cpos = vec3.a(rx, ry, 0);
		n.ppos = vec3.a(rx, ry, 0);
		n.acl = vec3.a(0, 0, 0);
		nlist.push(n);
	}
	
	var n1 = new Node();
	n1.cpos = vec3.a(400, 100, 0);
	n1.ppos = vec3.a(400, 100, 0);
	nlist.push(n1);
	
	var n2 = new Node();
	n2.cpos = vec3.a(100, 100, 0);
	n2.ppos = vec3.a(100, 100, 0);
	nlist.push(n2);
	
	var grabbed = false;
	
	cvs.addEventListener("mousedown", function(e){
		var d = 999999999;
		var mouse = vec3.a( e.clientX, e.clientY, 0 );
		console.log(e, mouse);
		for(var i = 0; i < nlist.length; i++){
			var delta = vec3.length(vec3.sub(mouse, nlist[i].cpos));
			if(delta < d) {
				grabbed = nlist[i];
				d = delta;
			}
		}
	}, false);
	
	cvs.addEventListener("mouseup", function(e){
		grabbed = false;
	}, false);
	
	cvs.addEventListener("mousemove", function(e){
		if(grabbed != false){
			grabbed.cpos[0] = e.clientX;
			grabbed.cpos[1] = e.clientY;
			
			// kill movement
			grabbed.ppos[0] = e.clientX;
			grabbed.ppos[1] = e.clientY;
		}
	}, false);
	
	return { 
		draw: draw
		, nlist: nlist
		, goVerlet: goVerlet
		, resolveNodeCollisions: resolveNodeCollisions 
	}
}

// r is a random between 0 and 1
function Node(){
	var r = Math.random();
	this.ist = r > 0.9 ? true : false; // is source of infection
	this.rad = 30 * r; // radius/bandwidth/gravity
	this.rad2 = this.rad*this.rad;
	this.res = this.ist ? 99 : 100 * r; // resistance to becoming clean
	this.ppos = vec3.a(0,0,0); // previous position
	this.cpos = vec3.a(0,0,0); // current position
	this.acl = vec3.a(0,0,0); // acceleration
	this.invMass = 1/this.rad;
	this.cto = []; // connected to
	this.dnes = 1; // how dirty the node is (between 0 and 1)
}

Node.prototype = {
	BB: function(){
		return;
	}
	,emitPackets: function(){
		// emit packets based on bandwidth... maybe new var
	}

};

function Packet(node, dnes){
	this.rad = 2;
	this.dnes = dnes;
	this.ppos = [];
	this.cpos = [];
	this.pnode = node; // the parent node, so it does not go towards source 
}

var vec3 = {
	ignited: false
	,setType: function(){
		if(typeof Float32Array !== 'undefined') vec3.setType = Float32Array;
		else vec3.setType = Array;
		vec3.ignited = true;
	}
	,a: function(x, y, z){
		if(vec3.ignited == false) vec3.setType();
		var v = new vec3.setType(3);
		v[0] = x;
		v[1] = y;
		v[2] = z;
		return v;//vec3.a(x, y, z);
	}
	,add: function(v1, v2){
		return vec3.a( v1[0]+v2[0], v1[1]+v2[1], v1[2]+v2[2] );
	}
	,sub: function(v1, v2){
		return vec3.a( v1[0]-v2[0], v1[1]-v2[1], v1[2]-v2[2] );
	}
	,normalize: function(v1){
		var x = v1[0], y = v1[1], z = v1[2];
		var len = Math.sqrt(x*x + y*y + z*z);

		if (!len) {
			return vec3.a(0,0,0);
		} else if (len == 1) {
			return vec3.a(x,y,z);
		}

		len = 1 / len;
		return vec3.a(x*len, y*len, z*len);
	}
	,length: function(v1){
		var x = v1[0], y = v1[1], z = v1[2];
		return Math.sqrt(x*x + y*y + z*z);
	}
	,dot: function(v1, v2){
		return v1[0]*v2[0] + v1[1]*v2[1] + v1[2]*v2[2];
	}
	,scale: function(v1, s){
		return vec3.a(v1[0]*s, v1[1]*s, v1[2]*s);
	}
	,clone: function(v1){
		return vec3.a(v1[0], v1[1], v1[2]);
	}
}

var S = new Stage("stage");
var run = setInterval(function(){
	S.goVerlet(0.03);
	S.resolveNodeCollisions();
	S.draw();
	
}, 16);

document.addEventListener("keydown", function(e){ 
	if(e.keyCode == 27) { 
		clearInterval(run); 
		console.log("execution stopped"); 
	} 
}, false);

})()