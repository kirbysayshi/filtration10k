(function(){

function Stage(id){
	var 
		 cvs = document.getElementById(id)
		,dim = [ cvs.width, cvs.height, 1000 ] // dimensions: width, height of canvas
		,ctx = cvs.getContext('2d')
		,r = Math.random()
		,max = (20 * r) + 5 // max num of nodes per game, minimum of 5
		,rwm = 0 // max radius per row, for init
		
		,nlist = [] // node list
		,tlist = []; // tracker list
	
	function draw(){
		
		ctx.fillStyle = "#000000";
		ctx.fillRect(0, 0, dim[0], dim[1]);
		
		var n = {};
		for(var i = 0; i < nlist.length; i++){
			n = nlist[i];
			
			var frgba = "rgba(" + Math.floor(n.dnes * 255) 
				+ "," + (n.ist ? 255 : 0) 
				+ ",0,1)";
			
			//ctx.shadowOffsetX = 0;
			//ctx.shadowOffsetY = 0;
			//ctx.shadowBlur = 10;
			//ctx.shadowColor = "rgba(0," + Math.floor(n.dnes * 255) + ",0,1)";
			
			ctx.fillStyle = frgba;
			ctx.strokeStyle = "#CCCCCC";
			ctx.beginPath();
			ctx.arc(n.cpos[0], n.cpos[1], n.rad * (1 - (n.cpos[2] / dim[2])), 0, Math.PI*2, false);
			ctx.fill();
			
			if(n.cto.length > 0){
				ctx.beginPath();
				for(var j = 0; j < n.cto.length; j++){		
					ctx.moveTo(n.cpos[0], n.cpos[1]);
					//ctx.lineTo(n.cto[j].cpos[0], n.cto[j].cpos[1]);
					ctx.quadraticCurveTo(
						 ((n.cpos[0] + n.cto[j].cpos[0]) / 2) + 30
						,((n.cpos[1] + n.cto[j].cpos[1]) / 2) + 30
						,n.cto[j].cpos[0]
						,n.cto[j].cpos[1]
						);
				}
				ctx.stroke();
			}
		}
		
		ctx.fillStyle = "#FFFFFF";
		ctx.fillText( MM(60)[0], 100, 20 );
		//console.log(MM(60)[0]);
	}
	
	function resolveConstraints(){
		for(var i = 0; i < tlist.length; i++){
			var t = tlist[i];
			
			for(var j = 0; j < t.cto.length; j++){
				var n = t.cto[j];
				var restLength = n.ist ? (n.res + (n.rad + t.rad)) * 2 : ((n.rad + t.rad)) * 1.5;
				var restLength2 = restLength*restLength;
				var invMass = n.invMass + t.invMass;
				if( invMass < 0.00001 ) continue;
				
				var delta  = vec3.sub(n.cpos, t.cpos);
				var delta2 = vec3.dot(delta, delta);
				var diff = restLength2/(delta2 + restLength2)-0.5;
				diff *= -2;
				
				delta = vec3.scale(delta, diff/invMass);
				t.cpos = vec3.add(t.cpos, vec3.scale(delta, t.invMass));
				n.cpos = vec3.sub(n.cpos, vec3.scale(delta, n.invMass));
			}
		}
	}
	
	function resolveNodeCollisions(){
		var friction = 0.5;
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
			
				console.log("collision");
				if(n1 == grabbed || n2 == grabbed){
					console.log(grabbed);
				}
				
				var invMass = n1.invMass + n2.invMass;
				var distance = Math.sqrt(dotCol);
				
				//colVec = vec3.normalize(colVec);
				// manually normalize, since we already have the distance
				colVec[0] /= distance;
				colVec[1] /= distance;
				colVec[2] /= distance;
				
				n2.cpos = vec3.sub(n2.cpos, 
					vec3.scale(colVec, distance * n2.invMass));
				n1.cpos = vec3.add(n1.cpos,
					vec3.scale(colVec, distance * n1.invMass));
				
				// I'm not sure if this actually works, but it seems like it
				n2.ppos = vec3.sub(n2.ppos, 
					vec3.scale(colVec, distance * n2.invMass * (friction)));
				n1.ppos = vec3.add(n1.ppos,                     
					vec3.scale(colVec, distance * n1.invMass * (friction)));
				
				var V0 = vec3.sub(n1.cpos, n1.ppos);
				var V1 = vec3.sub(n2.cpos, n2.ppos);
				var V  = vec3.sub(V0, V1);
							
				var Vn = vec3.scale(colVec, vec3.dot(V, colVec));
				var Vt = vec3.sub(V, Vn);
				
				// normalize by mass?
				Vt[0] /= invMass;
				Vt[1] /= invMass;
				Vt[2] /= invMass;
				
				n1.cpos = vec3.sub(n1.cpos, vec3.scale(Vt, friction*n1.invMass) );
				n2.cpos = vec3.add(n2.cpos, vec3.scale(Vt, friction*n2.invMass) );
				
				return true;
			}
		
		}
	}
	
	function checkBounds(node){
		node.cpos[0] = Math.max( 0 + node.rad, Math.min(node.cpos[0], dim[0] - node.rad) );
		node.cpos[1] = Math.max( 0 + node.rad, Math.min(node.cpos[1], dim[1] - node.rad) );
		node.cpos[2] = Math.max( 0 + node.rad, Math.min(node.cpos[2], dim[2] - node.rad) );
		
		node.ppos[0] = Math.max( 0 + node.rad, Math.min(node.ppos[0], dim[0] - node.rad) );
		node.ppos[1] = Math.max( 0 + node.rad, Math.min(node.ppos[1], dim[1] - node.rad) );
		node.ppos[2] = Math.max( 0 + node.rad, Math.min(node.ppos[2], dim[2] - node.rad) );
		
		node.cpos[2] = 0; // uncomment this to disable 3D
		node.ppos[2] = 0; // uncomment this to disable 3D
	}
	
	function goVerlet(dt){
		for(var i = 0; i < nlist.length; i++){
			var n1 = nlist[i];
		
			// add gravity temporarily
			n1.acl = vec3.add(n1.acl, vec3.a(0, 0, -100));
		
			var temp = vec3.clone(n1.cpos);
			n1.cpos = vec3.add(
				vec3.add(
					vec3.sub(n1.cpos, n1.ppos),
					vec3.scale(n1.acl, dt*dt)
				), n1.cpos);
			
			n1.ppos = temp;
			n1.acl = vec3.a(0,0,0);
			checkBounds(n1);
		}
		// z-sorting!
		nlist.sort(function(a,b){return a.cpos[2] - b.cpos[2];});
	}
	
	/////////////////////////////////////
	// Init
	/////////////////////////////////////
	
	// create a few trackers
	var tMax = Math.floor(max / 4);
	for(var i = 0; i < tMax; i++){
		var t = new Node(true);
		var div = vec3.a(
			 Math.floor(dim[0] / (tMax + 1))
			,Math.floor((dim[1] / (tMax + 1)) * Math.random())
			,0);
		t.cpos = vec3.scale(div, i+1);
		t.ppos = vec3.scale(div, i+1);
		nlist.push(t);
		tlist.push(t);
	}
	
	// create a few nodes around the trackers, connect them to the trackers
	var per = Math.floor(max / tMax); // divisions for placing nodes around trackers
	for (var i = 0; i < tlist.length; i++) {
		var t = tlist[i];
		var pInt = (Math.PI * 2) / per;
		for(var j = 0; j < per; j++){
			var n = new Node(false);
			var dir = vec3.a(
				 Math.cos(pInt*j)
				,Math.sin(pInt*j)
				,t.cpos[2]
			);
			n.cpos = vec3.add(t.cpos, vec3.scale(dir, (t.rad + n.rad) * 1.5));
			n.ppos = vec3.clone(n.cpos);
			nlist.push(n);
			t.cto.push(n);
			n.cto.push(t);
		}
		
		// connect the trackers in series
		if(i != 0){
			t.cto.push( tlist[i-1] );
		}
	}
	
	// make a few node-to-node connections
	for(var i = tMax; i < nlist.length; i += tMax){
		var n = nlist[i];
		if(n.ist == true) continue;
		n.cto.push(nlist[i-tMax]);
	}
	
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
			grabbed.cpos[2] = 0;
			
			// kill movement
			grabbed.ppos[0] = e.clientX;
			grabbed.ppos[1] = e.clientY;
			grabbed.ppos[2] = 0;
		}
	}, false);
	
	return { 
		draw: draw
		, nlist: nlist
		, goVerlet: goVerlet
		, resolveNodeCollisions: resolveNodeCollisions 
		, resolveConstraints: resolveConstraints
	}
}

// r is a random between 0 and 1
function Node(ist){
	var r = Math.random();
	this.ist = ist;//r > 0.9 ? true : false; // is source of infection
	this.rad = (50 * r) + 10; // radius/bandwidth/gravity, min of 10
	this.rad2 = this.rad*this.rad;
	this.res = this.ist ? 99 : (100 * r) + 10; // resistance to becoming clean, min of 10
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

function Packet(snode, tnode, dnes){
	this.rad = 2;
	this.dnes = dnes;
	this.ppos = [];
	this.cpos = [];
	this.snode = snode; // the source node, so it does not go towards source 
	this.tnode = tnode; // the target node, HOMING MISSILE ACTION!
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
	S.resolveConstraints();
	S.draw();
	
}, 16);

document.addEventListener("keydown", function(e){ 
	if(e.keyCode == 27) { 
		clearInterval(run); 
		console.log("execution stopped"); 
	} 
}, false);

})()