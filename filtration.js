(function(){

var vec3 = {
	ignited: false
	,setType: function(){
		if(typeof Float32Array !== 'undefined') { vec3.setType = Float32Array; }
		else { vec3.setType = Array; }
		vec3.ignited = true;
	}
	,a: function(x, y, z){
		if(vec3.ignited === false) { vec3.setType(); }
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
};

// r is a random between 0 and 1
function Node(ist){
	var r = Math.random();
	this.ist = ist;//r > 0.9 ? true : false; // is source of infection
	this.rad = (30 * r) + 5; // radius/bandwidth/gravity, min of 5
	this.rad2 = this.rad*this.rad;
	this.res = this.ist ? 99 : (100 * r) + 10; // resistance to becoming clean, min of 10
	this.ppos = vec3.a(0,0,0); // previous position
	this.cpos = vec3.a(0,0,0); // current position
	this.acl = vec3.a(0,0,0); // acceleration
	// TODO: make a tracker's mass... massive
	this.invMass = this.ist ? 1/9000 : 1/this.rad;
	this.cto = []; // connected to
	this.dnes = 50; // how dirty the node is 
	this.cnes = 50; // how clean the node is 
	this.tto = []; // transmitting to
}

Node.prototype = {
	BB: function(){
		return;
	}
	,emitPackets: function(){
		// emit packets based on bandwidth... maybe new var
	}
	,aabb: function(){
		var t = this;
		var max = vec3.a(-9000,-9000,-9000);
		var min = vec3.a(9000,9000,9000);

		for(var j = 0; j < t.cto.length; j++){
			var n = t.cto[j];
			max[0] = Math.max( max[0], n.cpos[0] );
			max[1] = Math.max( max[1], n.cpos[1] );
			max[2] = Math.max( max[2], n.cpos[2] );

			min[0] = Math.min( min[0], n.cpos[0] );
			min[1] = Math.min( min[1], n.cpos[1] );
			min[2] = Math.min( min[2], n.cpos[2] );

			// TODO: base this on the cpos + radius, and make it a sphere, not a box
			// Could we just "know" based on the node with the largest radius?
		}
		return {min: min, max: max};
	}
	,bsRad: function(){
		var bnode,
			brad = 0;
		for(var j = 0; j < this.cto.length; j++){
			var n = this.cto[j];
			if(n.rad > brad && n.ist === false){
				brad = n.rad;
				bnode = n;
			}
		}
		var d = vec3.length( vec3.sub(this.cpos, bnode.cpos) );
		return d + brad;
	}
	,findPeers: function(nlist){
		// sort nlist by distance from this
		var self = this;
		nlist.sort(function(a,b){
			var la = vec3.length(vec3.sub(self.cpos, a.cpos));
			var lb = vec3.length(vec3.sub(self.cpos, b.cpos));
			if(la > lb) { return -1; }
			else if(la < lb) { return 1; }
			else if(la == lb) { return 0; }
		});
		
		this.tto = [];
		var inc = 0.0174532925 * 4; // == 4 degree
		var rayCount = 90;
		var l = 1280 * 2; // just to be doubly sure
		var p0 = this.cpos;
		var i, j;
		for(i = 0; i < rayCount; i++){
			var d = vec3.a( Math.cos(i*inc), Math.sin(i*inc), 0 );
			var hit = false;
			for(j = 0; j < nlist.length; j++){
				if(hit === true) { continue; } // if we've already found a hit, stop using this ray
				var n = nlist[j];
				if(this == n) { continue; }
				var e = vec3.sub( n.cpos, this.cpos );
				var a = vec3.dot(e, d);
				var sqArg = (n.rad*n.rad) - vec3.dot(e, e) + (a*a);
				if(sqArg < 0) { continue; } // the ray and sphere do not intersect
				var t = a - Math.sqrt( sqArg ); // the t value of the ray when the intersection occurs
				hit = true;
				this.tto.push(n);
			}
			
		}
		
		// remove dups from tto
		var unique = [];
		for(i = 0; i < this.tto.length; i++){
			var found = false;
			for(j = 0; j < unique.length; j++){
				if( this.tto[i] == unique[j] ){
					found = true;
				}
			}
			if(found === false){
				unique.push(this.tto[i]);
			}
		}
		
		this.tto = unique;
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
		
		// z-sorting!
		nlist.sort(function(a,b){return a.cpos[2] - b.cpos[2];});
		
		ctx.fillStyle = "#000000";
		ctx.fillRect(0, 0, dim[0], dim[1]);
		
		var n;
		for(var i = 0; i < nlist.length; i++){
			n = nlist[i];
			
			var frgba = "rgba(" + Math.floor(n.dnes * 255) 
				+ "," + (n.ist ? 255 : 0) 
				+ ",0,1)";
			
			//ctx.shadowOffsetX = 0;
			//ctx.shadowOffsetY = 0;
			//ctx.shadowBlur = 10;
			//ctx.shadowColor = "rgba(0," + Math.floor(n.dnes * 255) + ",0,1)";
			
			// draw nodes
			ctx.fillStyle = frgba;
			ctx.strokeStyle = "#CCCCCC";
			ctx.lineWidth = 5;
			ctx.beginPath();
			ctx.arc(n.cpos[0], n.cpos[1], n.rad * (1 - (n.cpos[2] / dim[2])), 0, Math.PI*2, false);
			ctx.stroke();
			ctx.fill();
			ctx.lineWidth = 1;
			
			// draw dnes and cnes
			ctx.fillStyle = "#FFFFFF";
			ctx.fillText(n.cnes + "/" + n.dnes, n.cpos[0]+n.rad+5, n.cpos[1]+n.rad+5);
			
			// draw constraints
			//if(n.cto.length > 0){
			//	ctx.beginPath();
			//	for(var j = 0; j < n.cto.length; j++){		
			//		ctx.moveTo(n.cpos[0], n.cpos[1]);
			//		//ctx.lineTo(n.cto[j].cpos[0], n.cto[j].cpos[1]);
			//		ctx.quadraticCurveTo(
			//			 ((n.cpos[0] + n.cto[j].cpos[0]) / 2) + 30
			//			,((n.cpos[1] + n.cto[j].cpos[1]) / 2) + 30
			//			,n.cto[j].cpos[0]
			//			,n.cto[j].cpos[1]
			//			);
			//	}
			//	ctx.stroke();
			//}
			
			// draw tracker-system bounding sphere
			//if(n.ist === true){
			//	ctx.strokeStyle = "#FFFFFF";
			//	ctx.beginPath();
			//	ctx.arc(n.cpos[0], n.cpos[1], n.bsRad(), 0, Math.PI*2, false);
			//	ctx.stroke();
			//}
			
			// draw transmit to node lines
			ctx.strokeStyle = "#339900";
			ctx.beginPath();
			for(var k = 0; k < n.tto.length; k++){
				var t = n.tto[k];
				ctx.moveTo(n.cpos[0], n.cpos[1]);
				ctx.lineTo(t.cpos[0], t.cpos[1]);
			}
			ctx.stroke();
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
				if(n.ist === true) { continue; }
				var restLength = n.ist ? (n.res + (n.rad + t.rad)) * 2 : ((n.rad + t.rad)) * 4;
				var restLength2 = restLength*restLength;
				var invMass = n.invMass + t.invMass;
				if( invMass < 0.00001 ) { continue; }
				
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
				if(n1 == n2) { continue; }
				var colVec =  vec3.sub(n1.cpos, n2.cpos); //n1.getCollisionDepth(n2)
				var combinedRadius = n1.rad + n2.rad;
				var dotCol = vec3.dot(colVec, colVec); // effectively the distance squared
				var radius2 = combinedRadius*combinedRadius;
				
				if(dotCol >= radius2){
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
				
				//I'm not sure if this actually works, but it seems like it
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
		//node.cpos[0] = Math.max( 0 + node.rad, Math.min(node.cpos[0], dim[0] - node.rad) );
		//node.cpos[1] = Math.max( 0 + node.rad, Math.min(node.cpos[1], dim[1] - node.rad) );
		//node.cpos[2] = Math.max( 0 + node.rad, Math.min(node.cpos[2], dim[2] - node.rad) );
		//
		//node.ppos[0] = Math.max( 0 + node.rad, Math.min(node.ppos[0], dim[0] - node.rad) );
		//node.ppos[1] = Math.max( 0 + node.rad, Math.min(node.ppos[1], dim[1] - node.rad) );
		//node.ppos[2] = Math.max( 0 + node.rad, Math.min(node.ppos[2], dim[2] - node.rad) );
		
		node.cpos[2] = 0; // uncomment this to disable 3D
		node.ppos[2] = 0; // uncomment this to disable 3D
	}
	
	function goVerlet(dt){
		for(var i = 0; i < nlist.length; i++){
			var n1 = nlist[i];
			if(n1.ist) { continue; } // trackers are fixed...
		
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
	}
	
	function updateNodePeers(){
		for(var i = 0; i < nlist.length; i++){
			nlist[i].findPeers(nlist);
		}
	}
	
	/////////////////////////////////////
	// Init
	/////////////////////////////////////
	
	// create a few trackers
	var tMax = Math.floor(max / 4);
	for(var i = 0; i < tMax; i++){
		var t = new Node(true);
		// TODO: make the placement more evenly distributed
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
		if(i !== 0){
			t.cto.push( tlist[i-1] );
		}
	}
	
	// run this so that bounding spheres are accurate
	resolveConstraints();
	resolveConstraints();
	
	// update placement of trackers based on their nodes so all are onscreen
	for (var i = 0; i < tlist.length; i++) {
		var t = tlist[i];
		var r = t.bsRad();
		t.cpos[0] = Math.max( 0 + r, Math.min(t.cpos[0], dim[0] - r) );
		t.cpos[1] = Math.max( 0 + r, Math.min(t.cpos[1], dim[1] - r) );
		//t.cpos[2] = Math.max( 0 + r, Math.min(t.cpos[2], dim[2] - r) );
		                                                          
		t.ppos[0] = Math.max( 0 + r, Math.min(t.ppos[0], dim[0] - r) );
		t.ppos[1] = Math.max( 0 + r, Math.min(t.ppos[1], dim[1] - r) );
		//t.ppos[2] = Math.max( 0 + r, Math.min(t.ppos[2], dim[2] - r) );
	}
	
	// make a few node-to-node connections
	//for(var i = tMax; i < nlist.length; i += tMax){
	//	var n = nlist[i];
	//	if(n.ist == true) continue;
	//	n.cto.push(nlist[i-tMax]);
	//}
	
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
		if(grabbed !== false){
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
		, updateNodePeers: updateNodePeers
	};
}

var S = new Stage("stage");
var run = setInterval(function(){
	S.goVerlet(0.03);
	S.resolveNodeCollisions();
	S.resolveConstraints();
	S.updateNodePeers();
	S.draw();
	
}, 16);

document.addEventListener("keydown", function(e){ 
	if(e.keyCode == 27) { 
		clearInterval(run); 
		console.log("execution stopped"); 
	} 
}, false);

})();