(function(){
$(function(){
	
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

function Node(ist){
	var r = Math.random();
	this.setRad((30 * r) + 15);
	this.ist = ist;//r > 0.9 ? true : false; // is source of infection
	this.ppos = vec3.a(0,0,0); // previous position
	this.cpos = vec3.a(0,0,0); // current position
	this.acl = vec3.a(0,0,0); // acceleration
	this.cto = []; // connected to
	this.cnes = (99 * Math.random()) + 1; // initially how clean the node is, 1 to 100
	this.tto = []; // transmitting to
	this.pstr = (99 * r) + 1; // strength of each packet ejected, 1 to 100, same percentage as rad
}

Node.prototype = {
	setPos: function(v){
		this.cpos = v;
		this.ppos = vec3.clone(v);
	}
	,setRad: function(rad){
		this.rad = rad; // radius/bandwidth/gravity, min of 5
		this.rad2 = this.rad*this.rad;
		this.res = Math.max(Math.random(), this.rad * 0.01); // resistance to becoming clean, min of 0, max of 1
		this.invMass = 1/this.rad;
		this.eji = Math.max( (35 - this.rad) * 20, 200 );
		this.nej = Math.random() * this.eji; // next ejection in... this.eji - this.nej
	}
	,emitPackets: function(){
		
		this.nej++;
		
		
		if(this.nej >= this.eji){
			this.nej = 0;//this.rad; // reset, more bandwidth == more ejections
		
			if(this.tto.length === 0){ return false; }
			
			// sort... transmit to larger rads first
			this.tto.sort(function(a,b){
				return a.rad - b.rad;
			});
			
			var limit = Math.floor(this.rad / 2)
				,interval = Math.PI*2 / limit
				,length = this.tto.length
				,cval = Math.floor(this.cnes) < cwin ? this.pstr * -1 : this.pstr; // how powerful the packet is
				
			for(var k = 0; k < limit; k++){

				// eject a packet containing a ratio of dirty/clean that mirrors the node's state, rounded up
				var p = new Packet(this, this.tto[k % length], cval);
				
				// give packet initial accel outward from node
				p.acl[0] = Math.cos(interval*1) * 1000;
				p.acl[1] = Math.sin(interval*1) * 1000;
				p.acl[2] = 0;
				
				// give the node a little kick for ejecting...
				this.acl = vec3.add(this.acl, vec3.scale(p.acl, -1*0.1));
				
				var toRad = vec3.a(
					 Math.cos(interval*k) * this.rad
					,Math.sin(interval*k) * this.rad
					,0);
				
				p.cpos = vec3.add( 
					p.cpos
					,toRad);
				
				p.ppos = vec3.add( 
					p.ppos
					,toRad);
					
				plist.push(p);
			}
		}
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

};

function Packet(snode, tnode, cnes){
	this.rad = 2;
	//this.dnes = dnes;
	this.cnes = cnes;
	this.ppos = vec3.clone(snode.ppos);
	this.cpos = vec3.clone(snode.cpos);
	this.acl = vec3.clone(snode.acl);
	this.snode = snode; // the source node, so it does not go towards source 
	this.tnode = tnode; // the target node, HOMING MISSILE ACTION!
}

function draw(){
	
	// clear everything
	ctx.fillStyle = "#000000";
	ctx.fillRect(0, 0, dim[0], dim[1]);
	
	if(showsta === true){
		ctx.globalAlpha = 0.1;
	} else {
		ctx.globalAlpha = ctx.globalAlpha < 1 ? ctx.globalAlpha + 0.01 : 1;
	}
	
	if(debug === true){
		
		// draw world aabb
		var tl = convertWorldPointToCanvas(wbb.min);
		var wh = vec3.scale(wdim, camr);
		var br = convertWorldPointToCanvas(wbb.max);
		ctx.save();
		ctx.lineWidth = 1;
		ctx.strokeStyle = "#CCCCCC";
		ctx.strokeRect( tl[0], tl[1], wh[0], wh[1] )
		ctx.beginPath();
		ctx.arc(br[0], br[1], 10, 0, Math.PI*2, false);
		ctx.fill();
		ctx.beginPath();
		ctx.arc(tl[0], tl[1], 10, 0, Math.PI*2, false);
		ctx.fill();
		ctx.restore();
		
		// draw the origin so we know where the f*** we are
		ctx.save();
		ctx.fillStyle = "#FFFFFF";
		var origin = convertWorldPointToCanvas(vec3.a(0,0,0));
		ctx.beginPath();
		ctx.arc( origin[0], origin[1], 5, 0, Math.PI*2, false );
		ctx.fill();
		ctx.restore();
		
		// FPS Meter
		ctx.save();
		ctx.fillStyle = "#FFFFFF";
		ctx.fillText( MM(60)[0], 100, 20 );
		ctx.restore();
	}
	
	// z-sorting?!
	nlist.sort(function(a,b){return a.cpos[2] - b.cpos[2];});
	
	// draw everything node related...
	for(var i = 0; i < nlist.length; i++){
		var 
			n = nlist[i]
			,frgba = "rgba(" 
				+ Math.round((100 - n.cnes) * 0.01 * 255) + "," 
				+ Math.round(n.cnes * 0.01 * 255) + "," 
				+ "0,1)"
			,cpos = convertWorldPointToCanvas(n.cpos)
			//,grad = ctx.createRadialGradient(
			//	cpos[0], cpos[1], 10 * camr,
			//	cpos[0], cpos[1], n.rad * camr)
			,cnes = Math.floor(n.cnes);
		
		//grad.addColorStop(0, "#FFFFFF");
		//grad.addColorStop(1, frgba);
		
		//ctx.shadowOffsetX = 0;
		//ctx.shadowOffsetY = 0;
		//ctx.shadowBlur = 10;
		//ctx.shadowColor = "rgba(0," + Math.floor(n.dnes * 255) + ",0,1)";
		
		if(showtto === true){
			// draw transmit to node lines
			ctx.save();
			ctx.strokeStyle = "rgba(51,153,0,0.5)";
			ctx.beginPath();
			for(var k = 0; k < n.tto.length; k++){
				var t = n.tto[k];
				var tpos = convertWorldPointToCanvas(t.cpos);
				//if(t.ist == false) { continue; }
				ctx.moveTo(cpos[0], cpos[1]);
				ctx.lineTo(tpos[0], tpos[1]);
			}
			ctx.stroke();
			ctx.restore();
		}
		
		// draw nodes
		ctx.save();
		ctx.fillStyle = frgba;
		ctx.beginPath();
		ctx.arc(
			cpos[0]
			,cpos[1]
			,(n.rad * (1 - (n.cpos[2] / dim[2]))) * camr
			,0, Math.PI*2, false);
		ctx.fill();
		ctx.restore();
		
		// draw power stroke
		ctx.save();		
		ctx.strokeStyle = "rgba(204,204,204,0.6)";
		ctx.lineWidth = (Math.max(Math.floor(n.pstr*n.pstr * 0.005), 4)) * camr;
		ctx.beginPath();
		ctx.arc(
			cpos[0]
			,cpos[1]
			,(n.rad * (1 - (n.cpos[2] / dim[2]))) * camr
			,0, Math.PI*2 * (n.nej/n.eji), false);
		ctx.stroke();
		ctx.restore();
		
		// draw resistance
		ctx.save();
		ctx.strokeStyle = "#CCCCCC";
		ctx.beginPath();
		ctx.arc(
			cpos[0]
			,cpos[1]
			,(n.res * 100 * (1 - (n.cpos[2] / dim[2]))) * camr
			,0, Math.PI*2, false);
		ctx.stroke();
		ctx.restore();
		
		// draw cnes value
		ctx.save();
		ctx.fillStyle = "#000000";
		ctx.font = "bold " + Math.floor(14*camr) + "px arial";
		var cnesw = ctx.measureText(cnes)
		ctx.fillText(  
			cnes
			,cpos[0] - (cnesw.width/2)
			,cpos[1] + 4*camr
		);
		ctx.restore();
		
	}
	
	// draw packets!
	ctx.fillStyle = "#3399FF";
	ctx.lineWidth = 0;
	for(var p = 0; p < plist.length; p++){
		var pk = plist[p];
		var pkpos = convertWorldPointToCanvas(pk.cpos);
		ctx.beginPath();
		ctx.arc(pkpos[0], pkpos[1]
			,pk.rad * (1 - (pk.cpos[2] / dim[2])), 0, Math.PI*2, false);
		ctx.fill();
	}	
	ctx.lineWidth = 1;
	
	if(showbst === true){
		ctx.save();
		ctx.font = "bold 32px Helvetica, Arial, sans-serif";
		var btext = "BOOSTERS Remaining: " + pool;
		var btextsize = ctx.measureText(btext).width;
		ctx.fillText( btext, (dim[0] - btextsize - 10), (dim[1] - 10));
		ctx.restore();
	}
	
	if(showwin === true){
		ctx.save();
		ctx.font = "bold 52px 'Trebuchet MS', Helvetica, Arial, sans-serif";
		ctx.fillText( 'WIN', 10, 70);
		ctx.font = "bold 28px 'Georgia', Helvetica, Arial, sans-serif";
		ctx.fillText( "You purified the infection! Onto the next in 5 seconds...", 10, 100);
		ctx.restore();
	}
}

function resolveConstraints(){
	for(var i = 0; i < tlist.length; i++){
		var t = tlist[i];
		
		for(var j = 0; j < t.cto.length; j++){
			var n = t.cto[j];
			if(n.ist === true) { continue; }
			var restLength = (n.rad + t.rad) * 2 + (50 * n.res);
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
	var friction = 1;
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
			
			var invMass = n1.invMass + n2.invMass;
			var distance = Math.sqrt(dotCol);
			
			// manually normalize, since we already have the distance
			colVec[0] /= distance;
			colVec[1] /= distance;
			colVec[2] /= distance;
			
			n2.cpos = vec3.sub(n2.cpos, 
				vec3.scale(colVec, distance * n2.invMass));
			n1.cpos = vec3.add(n1.cpos,                  
				vec3.scale(colVec, distance * n1.invMass));
			
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
	node.cpos[2] = 0; // uncomment this to disable 3D
	node.ppos[2] = 0; // uncomment this to disable 3D
}

function goNodeVerlet(dt){
	for(var i = 0; i < nlist.length; i++){
		var n1 = nlist[i];
		n1.emitPackets();
		//if(n1.ist) { continue; } // trackers are fixed...
	
		// add gravity temporarily
		//n1.acl = vec3.add(n1.acl, vec3.a(0, 0, -100));
		n1.acl = vec3.add(n1.acl, vec3.scale(vec3.sub(n1.cpos, vec3.a(0,0,0)), -0.1));
	
		// save this for after integration
		var temp = vec3.clone(n1.cpos);
		
		// compute velocity
		// add scaled acceleration based on delta time to get new velocity
		var vel = vec3.add(
			vec3.sub(n1.cpos, n1.ppos),
			vec3.scale(n1.acl, dt*dt)
		);
		
		// add new velocity to current position
		n1.cpos = vec3.add( vel, n1.cpos );
		
		// FRICTION!!!!
		// 0.001 is good for slowing movement
		// 0.1 is like jello :)
		// add scaled new velocity to previous position
		n1.ppos = vec3.add( vec3.scale(vel, 0.01), temp );
		
		// TODO: possibly add 0.1 friction, with check to see if velocities are 
		// over a certain threshold. if they are under, stop computing peer
		// updating to save CPU.
		
		// reset acceleration
		n1.acl = vec3.a(0,0,0);
		
		checkBounds(n1);
	}
}

function updateGrid(){
	var 
		rows = Math.floor(wdim[1] / div)
		,cols = Math.floor(wdim[0] / div)
		,i = 0, j = 0;
	
	grid = []; // blank it out
	
	// init grid arrays
	for(i = 0; i <= cols; i++){
		grid[i] = [];
		for(j = 0; j <= rows; j++){
			grid[i][j] = [];
		}
	}

	// this assumes radius is not larger than 2*div
	for(i = 0; i < nlist.length; i++){

		var 
			n = nlist[i],
			col = Math.floor(n.cpos[0] / div),
			row = Math.floor(n.cpos[1] / div),
			T  = Math.floor( (n.cpos[1] - n.rad) / div),
			B  = Math.floor( (n.cpos[1] + n.rad) / div),
			L  = Math.floor( (n.cpos[0] - n.rad) / div),
			R  = Math.floor( (n.cpos[0] + n.rad) / div);
		
		// add node to cell its center is in (base)	
		if(col >= 0 && col < cols && row >= 0 && row < rows){ grid[col][row].push(n); }
		
		// Top cell, Bottom cell, Left cell, Right cell				
		if( T !== row && T >= 0 && T < rows && col < cols && col >= 0){ grid[col][T].push(n); }
		if( B !== row && B >= 0 && B < rows && col < cols && col >= 0){ grid[col][B].push(n); }
		if( L !== col && L >= 0 && L < cols && row < rows && row >= 0){ grid[L][row].push(n); }
		if( R !== row && R >= 0 && R < cols && row < rows && row >= 0){ grid[R][row].push(n); }
		
		// Top Right cell, Bottom Right cell, Top Left cell, Bottom Left cell
		if( R !== col && T !== row && R < cols && T < rows && R >= 0 && T >= 0 ){ grid[R][T].push(n); }
		if( R !== col && B !== row && R < cols && B < rows && R >= 0 && B >= 0 ){ grid[R][B].push(n); }
		if( L !== col && T !== row && L < cols && T < rows && L >= 0 && T >= 0 ){ grid[L][T].push(n); }
		if( L !== col && B !== row && L < cols && B < rows && L >= 0 && B >= 0 ){ grid[L][B].push(n); }
	}
}

function updateNodePeers(){
	var 
		 pairs = []
		,found = false
		,totalChecks = 0
		,clear = true;
	
	for(var i = 0; i < nlist.length; i++){
		var n = nlist[i];
		n.tto = [];
		
		for(var j = 0; j < nlist.length; j++){
			var o = nlist[j];
			if( n === o ){ continue; } // don't test against self
			for(var k = 0; k < pairs.length; k++){
				var p = pairs[k];
				if((p[0] === n && p[1] === o) || (p[0] === o && p[1] === n)){
					// also add to tto if [2] is true
					found = true;
				}
				
				if( p[0] === o && p[1] === n && p[2] === true ) {
					n.tto.push(o);
				}
			}
			if(found === true){
				found = false;
				continue; // we must have already tested this pair
			}
			
			// we have a pair we haven't tested yet
			// draw a ray, test every node but these two for intersection
			
			clear = true;
			var d = vec3.sub( o.cpos, n.cpos );
			var len = vec3.length(d);
			
			// normalize d
			d = vec3.scale(d, 1/len);
			
			for(var l = 0; l < nlist.length; l++){
				var q = nlist[l];
				if( n === q || o === q ){ continue; } // don't test against selves
				
				var e = vec3.sub( q.cpos, n.cpos );
				var a = vec3.dot(e, d);
				if(a < 0) { continue; } // ray points away from the sphere
				var sqArg = (q.rad*q.rad) - vec3.dot(e, e) + (a*a);
				totalChecks++;
				if(sqArg < 0) { // the ray and sphere do not intersect
					continue; 
				} 
				else { 
					clear = false;
					break; // stop looping, since the line of sight is blocked
				}
			}
			if(clear === true){
				// TODO: make the node references mutual
				// check both arrays for dupes?
				n.tto.push(o);
				//o.tto.push(n);
				
				// add pair to list to prevent double checks
				pairs.push([n, o, true]); // node, node, hasLineOfSight?
			} else {
				// add pair to list to prevent double checks
				pairs.push([n, o, false]); // node, node, hasLineOfSight?
			}
		}
	}
	
	//console.log(totalChecks);
}

function goPacketVerlet(dt){
	for(var i = 0; i < plist.length; i++){
		var p = plist[i];
	
		// attract packets to their targets
		var d = vec3.scale(vec3.normalize(vec3.sub(p.tnode.cpos, p.cpos)), p.tnode.rad*100);
		p.acl = vec3.add(p.acl, d);
	
		// save this for after integration
		var temp = vec3.clone(p.cpos);
		
		// compute velocity
		// add scaled acceleration based on delta time to get new velocity
		var vel = vec3.add(
			vec3.sub(p.cpos, p.ppos),
			vec3.scale(p.acl, dt*dt)
		);
		
		// add new velocity to current position
		p.cpos = vec3.add( vel, p.cpos );
		
		// FRICTION!!!!
		// 0.001 is good for slowing movement
		// 0.1 is like jello :)
		// add scaled new velocity to previous position
		p.ppos = vec3.add( vec3.scale(vel, 0.1), temp );
		
		// TODO: possibly add 0.1 friction, with check to see if velocities are 
		// over a certain threshold. if they are under, stop computing peer
		// updating to save CPU.
		
		// reset acceleration
		p.acl = vec3.a(0,0,0);
		
		checkBounds(p);
	}
}

function resolveNodePacketCollisions(){
	// packets that haven't hit their targets yet
	var marks = [];
	
	for(var i = 0; i < plist.length; i++){
		var p = plist[i];
		var t = p.tnode;
	
		var pton = vec3.sub(p.cpos, t.cpos);
		var dpton = vec3.dot(pton, pton);
		if( dpton >= (p.rad+t.rad)*(p.rad+t.rad) ){
			// no collision
			marks.push(p);
			continue;
		}
		
		// collision! add cnes value to node
		t.cnes += (p.cnes * (1 - t.res));
		
		// keep cnes within limits...
		t.cnes = t.cnes <= 0 ? 0 : t.cnes;
		//t.cnes = t.cnes >= 100 ? 100 : t.cnes;
		
		t.acl = vec3.add(t.acl, vec3.scale(vec3.sub(p.cpos, p.ppos), 10));
	}

	plist = marks;
}

function reinforceCleanness(){
	if(grabbed !== false && pool >= 1){
		grabbed.cnes += 75;
		pool -= 1;
		bused += 1;
		$boosts.text("BOOSTS: " + pool);
	}
	if(pool <= 0){
		// show "push r to restart the level"
		$msg.text("Boosts depleted. Press 'r' to restart this level, unless... you're awesome?");
	}
}

function round2dec(n){
	return Math.round(n*100+((n*1000)%10>4?1:0))/100;
}

function resizeViewport(e){
	dim = [$w.width(), $w.height(), 1000];
	dimh = vec3.scale(dim, 0.5);
	$cvs.attr({ 
		width: dim[0], 
		height: dim[1]
	});
}

function computeCameraRatio(){
	// get extremes
	var min = vec3.a(9e1000, 9e1000, 0);
	var max = vec3.a(-9e1000, -9e1000, 0)
	for(var i = 0; i < nlist.length; i++){
		var n = nlist[i];
		// min xy
		if(n.cpos[0] - (n.rad*4) < min[0]) min[0] = n.cpos[0] - (n.rad*4);
		if(n.cpos[1] - (n.rad*4) < min[1]) min[1] = n.cpos[1] - (n.rad*4);
		
		// max xy
		if(n.cpos[0] + (n.rad*4) > max[0]) max[0] = n.cpos[0] + (n.rad*4);
		if(n.cpos[1] + (n.rad*4) > max[1]) max[1] = n.cpos[1] + (n.rad*4);
	}
	
	// set world bounding box
	wbb.min = min;
	wbb.max = max;
	wdim = vec3.sub(max, min); // convert to absolute dimensions
	woff = vec3.scale(vec3.add(max, min), 0.5); // midpoint
	
	// viewport / world
	camr = Math.abs(Math.min( dim[0] / wdim[0], dim[1] / wdim[1]));
}

function convertWorldPointToCanvas(v3){
	return vec3.a(
		((v3[0] - woff[0]) * camr) + dimh[0],
		((v3[1] - woff[1]) * camr) + dimh[1],
		0//((v3[2] - woff[2]) * camr) + dimh[2]
	);
}

function convertCanvasPointToWorld(v3){
	return vec3.a(
		(v3[0] / camr) + woff[0] - (dimh[0] / camr),
		(v3[1] / camr) + woff[1] - (dimh[1] / camr),
		0//(v3[2] / camr) + woff[2] - (dimh[2] / camr) 
	);
}

function checkForWin(){
	var green = true;
	for(var i = 0; i < nlist.length; i++){		
		if(nlist[i].cnes < cwin){
			green = false;
		}
	}
	if(green === true && waiting === false){
		waiting = true;
		// do something about winning!
		$winstatus.fadeIn();
		completed[curlvl] = { time: +new Date() - start, boostsused: bused };
		setTimeout(function(){
			$winstatus.fadeOut(function(){
				waiting = false;
				curlvl++;
				resetCurrentLevel();
			});
		}, 5000);
	}
}

function resetCurrentLevel(){
	nlist = []; tlist = []; plist = []; bused = 0;
	if(curlvl >= levels.length){
		// say something awesome, and continue to random levels
		console.log("ENDGAME");
		generateRandomLevel();
	} else {
		var l = levels[curlvl];
		pool = l.boosts;
		$boosts.text("BOOSTS: " + pool);
		$msg.text("");
		$lvlstatus.find("h1").text(l.name);
		$lvlstatus.find("p").text(l.hint);
		$lvlstatus.fadeIn(400);
		console.log("lvl fade in");
		setTimeout(function(){
			$lvlstatus.fadeOut(400);
			console.log("lvl fade out");
		}, 5000);
		l.init();
		start = +new Date();
	}
}

function generateRandomLevel(){
	nlist = []; tlist = []; plist = []; bused = 0;
	pool = 5; // 5 boosts
	$msg.text("");
	$boosts.text("BOOSTS: " + pool);
	start = +new Date();
	
	// create a few trackers
	var tMax = Math.floor(max / 4);
	for(var i = 0; i < tMax; i++){
		var t = new Node(true);
		var sec = vec3.a(
			 Math.floor(dim[0] / (tMax + 1))
			,Math.floor((dim[1] / (tMax + 1)) * Math.random())
			,0);
		t.cpos = vec3.scale(sec, i+1);
		t.ppos = vec3.scale(sec, i+1);
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
}

function inGameMouseDown(e){
	var now = +new Date();
	var d = 9e200;
	var mouse = convertCanvasPointToWorld( vec3.a(e.pageX, e.pageY, 0) );
	console.log(e, mouse);
	
	for(var i = 0; i < nlist.length; i++){
		var n = nlist[i];
		var delta = vec3.length(vec3.sub(mouse, n.cpos));
		if(delta < d && delta <= n.rad*1.5 ) { // mouse within 1.5 radius
			grabbed = nlist[i];
			d = delta;
		}
	}
	console.log(grabbed);
	//console.log(grabbed, convertWorldPointToCanvas(grabbed.cpos), camr);
	
	// test for double click
	if(dbcl && now - dbcl > 120 && now - dbcl < 300){
		reinforceCleanness();
		console.log("DOUBLE CLICK: CLEANESS REINFORCED!");
	}
	
	// set last double click time
	dbcl = now;
	//console.log(dbcl);
}

function inGameMouseMove(e){
	var mouse = convertCanvasPointToWorld( vec3.a(e.pageX, e.pageY, 0) );
	if(grabbed !== false){
		grabbed.cpos = mouse;
		grabbed.ppos = mouse; // kill movement
		console.log("MOVING", mouse);
	}
}

function inGameMouseUp(e){
	grabbed = false;
	if(showsta === true){
		triggerFirstLevel()
	}
}

function inGameKeyDown(e){
	if(e.keyCode == 27) { // ESC
		clearInterval(run); 
		console.log("execution stopped", completed); 
	} 
	if(e.keyCode == 68){ // D
		debug = true;
	}
	if(e.keyCode == 32){ // SPACE
		showtto = true;
	}
}

function inGameKeyUp(e){
	console.log(e.keyCode);
	if(showsta === true && e.keyCode === 32){
		triggerFirstLevel()
	} else if (showsta === false) {
		if(e.keyCode == 68){
			debug = false;
		}
		if(e.keyCode == 32){ // SPACE
			showtto = false;
		}
		if(e.keyCode == 82){
			resetCurrentLevel();
		}
	}
}

function triggerFirstLevel(){
	showsta = false;
	$start.fadeOut(function(){
		curlvl = 0;
		resetCurrentLevel();
	});
	
}

/////////////////////////////////////
// Init
/////////////////////////////////////

var 
	 cvs = document.getElementById("stage")
	,$cvs = $(cvs)
	,$start = $("#start") // start screen
	,$lvlstatus = $("#lvlstatus") // start of round screen
	,$winstatus = $("#winstatus") // win level screen
	,$boosts = $("#boosts") // how many left
	,$msg = $("#msg") // messages to the user
	,$w = $(window)
	,run = 0 // ref for setInterval
	,waiting = false // used for animations
	,dim = [ $w.width(), $w.height(), 1000 ] // dimensions: width, height of canvas
	,wbb = { min: [0,0,0], max: [0,0,0] } // effectively a bounding box for the world
	,wdim = vec3.a(1,1,1) // the size of the world,
	,woff = vec3.a(0,0,0) // the world offset, or the min value of wbb
	,camr = 1 // "camera" ratio
	,ctx = cvs.getContext('2d')
	,r = Math.random()
	,max = (10 * r) + 5 // max num of nodes per random game, minimum of 5
	,rwm = 0 // max radius per row, for init
	,nlist = [] // node list
	,tlist = [] // tracker list
	,plist = [] // packet list
	,grabbed = false // the currently clicked node
	,pool = 5 // amount of boosts in the players pool
	,bused = 0 // number of boosts used to beat a round
	,start = +new Date() // time the round started
	,cwin = 75 // % * 100 that all nodes must be to win the round
	,dbcl = +new Date() // last time a click was detected, for double click
	,ipos = [0,0,0] // initial position of a node when it was clicked
	,debug = false
	,showsta = true // show start screen
	,showtto = false // show transmitting to
	,showbst = false // show booster count
	//,showrst = false // show restart note
	//,showlvlt = false // show start level text
	,showwin = false // show win state
	,curlvl = 0 // current round
	,levels = [
		{ 	name: "Wait for it..."
			,hint: "One may be larger, but timing is more important."
			,boosts: 1
			,init: function(){
				var n1 = new Node(false), n2 = new Node(false);
				n1.setRad(50);
				n1.setPos(vec3.a(0,0,0));
				n1.res = 0.01; n1.cnes = 0; n1.pstr = 2;
				n1.eji = 100; n1.nej = 75;
				
				n2.setRad(15);
				n2.setPos(vec3.a(-200, 90, 0));
				n2.res = 0.9; n2.cnes = 10; n2.pstr = 90;
				n2.nej = 0; 
				
				nlist = [n1, n2];
			}
		}
	]
	,completed = []; // levels the player has completed


// set width and height of canvas to match window
resizeViewport();
generateRandomLevel();

run = setInterval(function(){

	goNodeVerlet(0.03);
	goPacketVerlet(0.03);
	//updateGrid();
	resolveNodeCollisions();
	//resolveConstraints();
	resolveNodePacketCollisions();
	updateNodePeers();
	computeCameraRatio();
	if( showsta === false) { checkForWin(); }
	draw();

}, 33);

$(document).bind("mousedown", inGameMouseDown);
$(document).bind("mouseup", inGameMouseUp);
$(document).bind("mousemove", inGameMouseMove);
$(document).bind("keydown", inGameKeyDown);
$(document).bind("keyup", inGameKeyUp);
$(window).bind('resize', resizeViewport);
	
}); // end of document.ready
})(); // end of wrapper