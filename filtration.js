(function($){
$(function(){

// TODO: remove all console.logs
// TODO: add end screen
// TODO: allow state of nodes to be saved

var vec3 = {
	ignited: false
	,sT: function(){
		if(typeof Float32Array !== 'undefined') { vec3.sT = Float32Array; }
		else { vec3.sT = Array; }
		vec3.ignited = true;
	}
	,a: function(x, y, z){
		if(vec3.ignited === false) { vec3.sT(); }
		var v = new vec3.sT(3);
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
	,norm: function(v1){
		var x = v1[0], y = v1[1], z = v1[2]
			,len = Math.sqrt(x*x + y*y + z*z);

		if (!len) {
			return vec3.a(0,0,0);
		} else if (len == 1) {
			return vec3.a(x,y,z);
		}

		len = 1 / len;
		return vec3.a(x*len, y*len, z*len);
	}
	,len: function(v1){
		var x = v1[0], y = v1[1], z = v1[2];
		return Math.sqrt(x*x + y*y + z*z);
	}
	,dot: function(v1, v2){
		return v1[0]*v2[0] + v1[1]*v2[1] + v1[2]*v2[2];
	}
	,sc: function(v1, s){
		return vec3.a(v1[0]*s, v1[1]*s, v1[2]*s);
	}
	,cn: function(v1){
		return vec3.a(v1[0], v1[1], v1[2]);
	}
};

function Node(ist){
	var r = R(), t = this;
	t.setRad((30 * r) + 15);
	t.ist = ist;//r > 0.9 ? true : false; // is source of infection
	t.ppos = vec3.a(0,0,0); // previous position
	t.cpos = vec3.a(0,0,0); // current position
	t.acl = vec3.a(0,0,0); // acceleration
	t.cto = []; // connected to
	t.cnes = (99 * R()) + 1; // initially how clean the node is, 1 to 100
	t.tto = []; // transmitting to
	t.pstr = (99 * r) + 1; // strength of each packet ejected, 1 to 100, same percentage as rad
}

Node.prototype = {
	setPos: function(v){
		this.cpos = v;
		this.ppos = vec3.cn(v);
	}
	,setRad: function(rad){
		var t = this;
		t.rad = rad; // radius/bandwidth/gravity, min of 5
		t.rad2 = t.rad*t.rad;
		t.res = MM(R(), t.rad * 0.01); // resistance to becoming clean, min of 0, max of 1
		t.invMass = 1/t.rad;
		t.eji = MM( (35 - t.rad) * 20, 200 );
		t.nej = R() * t.eji; // next ejection in... this.eji - this.nej
	}
	,emitPackets: function(){
		var t = this;
		t.nej++;
		
		if(t.nej >= t.eji){
			t.nej = 0;//this.rad; // reset, more bandwidth == more ejections
		
			if(t.tto.length === 0){ return false; }
			
			// sort... transmit to larger rads first
			t.tto.sort(function(a,b){
				return a.rad - b.rad;
			});
			
			var limit = MF(t.rad / 2)
				,interval = MP*2 / limit
				,length = t.tto.length
				,cval = MF(t.cnes) < cwin ? t.pstr * -1 : t.pstr; // how powerful the packet is
				
			for(var k = 0; k < limit; k++){

				// eject a packet containing a ratio of dirty/clean that mirrors the node's state, rounded up
				var p = new Packet(t, t.tto[k % length], cval);
				
				// give packet initial accel outward from node
				p.acl[0] = MC(interval*1) * 1000;
				p.acl[1] = MS(interval*1) * 1000;
				p.acl[2] = 0;
				
				// give the node a little kick for ejecting...
				t.acl = vec3.add(t.acl, vec3.sc(p.acl, -1*0.1));
				
				var toRad = vec3.a(
					 MC(interval*k) * t.rad
					,MS(interval*k) * t.rad
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

};

function Packet(snode, tnode, cnes){
	var t = this;
	t.rad = 2;
	t.cnes = cnes;
	t.ppos = vec3.cn(snode.ppos);
	t.cpos = vec3.cn(snode.cpos);
	t.acl = vec3.cn(snode.acl);
	t.snode = snode; // the source node, so it does not go towards source 
	t.tnode = tnode; // the target node, HOMING MISSILE ACTION!
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
	
	// draw everything node related...
	for(var i = 0; i < nlist.length; i++){
		var 
			n = nlist[i]
			,frgba = "rgba(" 
				+ MR((100 - n.cnes) * 0.01 * 255) + "," 
				+ MR(n.cnes * 0.01 * 255) + "," 
				+ "0,1)"
			,cpos = convertWorldPointToCanvas(n.cpos)
			,cnes = MF(n.cnes);
		
		if(showtto === true){
			// draw transmit to node lines
			ctx.save();
			ctx.strokeStyle = "rgba(51,153,0,0.5)";
			ctx.beginPath();
			for(var k = 0; k < n.tto.length; k++){
				var t = n.tto[k]
					,tpos = convertWorldPointToCanvas(t.cpos);
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
			,0, MP*2, false);
		ctx.fill();
		ctx.restore();
		
		// draw power stroke
		ctx.save();		
		ctx.strokeStyle = "rgba(204,204,204,0.6)";
		ctx.lineWidth = (MM(MF(n.pstr*n.pstr * 0.005), 4)) * camr;
		ctx.beginPath();
		ctx.arc(
			cpos[0]
			,cpos[1]
			,(n.rad * (1 - (n.cpos[2] / dim[2]))) * camr
			,0, MP*2 * (n.nej/n.eji), false);
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
			,0, MP*2, false);
		ctx.stroke();
		ctx.restore();
		
		// draw cnes value
		ctx.save();
		ctx.fillStyle = "#000000";
		ctx.font = "bold " + MF(14*camr) + "px arial";
		var cnesw = ctx.measureText(cnes);
		ctx.fillText(  
			cnes
			,cpos[0] - (cnesw.width/2)
			,cpos[1] + 4*camr
		);
		ctx.restore();
		
	}
	
	// draw packets!
	ctx.save();
	ctx.fillStyle = "#3399FF";
	ctx.lineWidth = 0;
	for(var p = 0; p < plist.length; p++){
		var pk = plist[p]
			,pkpos = convertWorldPointToCanvas(pk.cpos);
		ctx.beginPath();
		ctx.arc(pkpos[0], pkpos[1]
			,pk.rad * (1 - (pk.cpos[2] / dim[2])), 0, MP*2, false);
		ctx.fill();
	}
	ctx.restore();
}

function resolveNodeCollisions(){
	var friction = 1;
	for(var i = 0; i < nlist.length; i++){
		var n1 = nlist[i];
	
		for(var j = 0; j < nlist.length; j++){
			var n2 = nlist[j];
			if(n1 == n2) { continue; }
			var 
				colVec =  vec3.sub(n1.cpos, n2.cpos)
				,combinedRadius = n1.rad + n2.rad
				,dotCol = vec3.dot(colVec, colVec) // effectively the distance squared
				,radius2 = combinedRadius*combinedRadius;
			
			if(dotCol >= radius2){
				continue;
			}
			
			var invMass = n1.invMass + n2.invMass
				,distance = Math.sqrt(dotCol);
			
			// manually normalize, since we already have the distance
			colVec[0] /= distance;
			colVec[1] /= distance;
			colVec[2] /= distance;
			
			n2.cpos = vec3.sub(n2.cpos, 
				vec3.sc(colVec, distance * n2.invMass));
			n1.cpos = vec3.add(n1.cpos,                  
				vec3.sc(colVec, distance * n1.invMass));
			
			var V0 = vec3.sub(n1.cpos, n1.ppos)
				,V1 = vec3.sub(n2.cpos, n2.ppos)
				,V  = vec3.sub(V0, V1)		
				,Vn = vec3.sc(colVec, vec3.dot(V, colVec))
				,Vt = vec3.sub(V, Vn);
			
			// normalize by mass?
			Vt[0] /= invMass;
			Vt[1] /= invMass;
			Vt[2] /= invMass;
			
			n1.cpos = vec3.sub(n1.cpos, vec3.sc(Vt, friction*n1.invMass) );
			n2.cpos = vec3.add(n2.cpos, vec3.sc(Vt, friction*n2.invMass) );
			
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
	
		// add gravity towards the center
		n1.acl = vec3.add(n1.acl, vec3.sc(vec3.sub(n1.cpos, vec3.a(0,0,0)), -0.1));
	
		// save this for after integration
		var temp = vec3.cn(n1.cpos)
		// compute velocity
		// add scaled acceleration based on delta time to get new velocity
			,vel = vec3.add(
				vec3.sub(n1.cpos, n1.ppos),
				vec3.sc(n1.acl, dt*dt)
			);
		
		// add new velocity to current position
		n1.cpos = vec3.add( vel, n1.cpos );
		
		// FRICTION!!!!
		// 0.001 is good for slowing movement
		// 0.1 is like jello :)
		// add scaled new velocity to previous position
		n1.ppos = vec3.add( vec3.sc(vel, 0.01), temp );
		
		// TODO: possibly add 0.1 friction, with check to see if velocities are 
		// over a certain threshold. if they are under, stop computing peer
		// updating to save CPU.
		
		// reset acceleration
		n1.acl = vec3.a(0,0,0);
		checkBounds(n1);
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
			var d = vec3.sub( o.cpos, n.cpos )
				,len = vec3.len(d);
			
			// normalize d
			d = vec3.sc(d, 1/len);
			
			for(var l = 0; l < nlist.length; l++){
				var q = nlist[l];
				if( n === q || o === q ){ continue; } // don't test against selves
				
				var e = vec3.sub( q.cpos, n.cpos )
					,a = vec3.dot(e, d);
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
}

function goPacketVerlet(dt){
	for(var i = 0; i < plist.length; i++){
		var p = plist[i];
	
		// save this for after integration
		var temp = vec3.cn(p.cpos)
		// attract packets to their targets
			,d = vec3.sc(vec3.norm(vec3.sub(p.tnode.cpos, p.cpos)), p.tnode.rad*100);
		p.acl = vec3.add(p.acl, d);
	
		
		// compute velocity
		// add scaled acceleration based on delta time to get new velocity
		var vel = vec3.add(
				vec3.sub(p.cpos, p.ppos),
				vec3.sc(p.acl, dt*dt)
			);
		
		// add new velocity to current position
		p.cpos = vec3.add( vel, p.cpos );
		
		// FRICTION!!!!
		// 0.001 is good for slowing movement
		// 0.1 is like jello :)
		// add scaled new velocity to previous position
		p.ppos = vec3.add( vec3.sc(vel, 0.1), temp );
		
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
		var p = plist[i]
			,t = p.tnode
			,pton = vec3.sub(p.cpos, t.cpos)
			,dpton = vec3.dot(pton, pton);
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
		
		t.acl = vec3.add(t.acl, vec3.sc(vec3.sub(p.cpos, p.ppos), 10));
		
		pcount += 1; // keep a count!
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

function resizeViewport(e){
	dim = [$W.width(), $W.height(), 1000];
	dimh = vec3.sc(dim, 0.5);
	$cvs.attr({ 
		width: dim[0], 
		height: dim[1]
	});
}

function computeCameraRatio(){
	// get extremes
	var min = vec3.a(9e1000, 9e1000, 0)
		,max = vec3.a(-9e1000, -9e1000, 0)
		,i = 0;
	for(;i < nlist.length; i++){
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
	woff = vec3.sc(vec3.add(max, min), 0.5); // midpoint
	
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
		$cvs.fadeTo(300, 0.2);
		$msg.text("");
		completed[curlvl] = { 
			time: +new Date() - start
			,bus: bused // boosts used
			,ccount: nlist.length + tlist.length // cell count
			,tanti: pcount // total antibodies
			,rsts: resets };
		setTimeout(function(){
			$winstatus.fadeOut(function(){
				waiting = false;
				$cvs.fadeTo(300, 1);
				curlvl++;
				resetCurrentLevel();
			});
		}, 5000);
	}
}

function resetCurrentLevel(){
	nlist = []; tlist = []; plist = []; bused = 0; pcount = 0;
	if(curlvl >= levels.length){
		// say something awesome, and continue to random levels
		generateRandomLevel();
	} else {
		var l = levels[curlvl];
		pool = l.boosts;
		$boosts.text("BOOSTS: " + pool);
		$msg.text("Press the ESC key to stop at any time.");
		$lvlstatus.find("h1").text(l.name);
		$lvlstatus.find("p").text(l.hint);
		$lvlstatus.fadeIn(400);
		setTimeout(function(){
			$lvlstatus.fadeOut(400);
		}, 5000);
		l.init();
		start = +new Date();
	}
}

function generateRandomLevel(){
	nlist = []; tlist = []; plist = []; bused = 0; pcount = 0;
	pool = 5; // 5 boosts
	$msg.text("");
	$boosts.text("BOOSTS: " + pool);
	start = +new Date();
	
	// create a few trackers
	var i = 0, tMax = MF(max / 4), t;
	for(;i < tMax; i++){
		t = new Node(true)
			,sec = vec3.a(
			 MF(dim[0] / (tMax + 1))
			,MF((dim[1] / (tMax + 1)) * R())
			,0);
		t.cpos = vec3.sc(sec, i+1);
		t.ppos = vec3.sc(sec, i+1);
		nlist.push(t);
		tlist.push(t);
	}

	// create a few nodes around the trackers, connect them to the trackers
	var per = MF(max / tMax); // divisions for placing nodes around trackers
	for (i = 0; i < tlist.length; i++) {
		var pInt = (MP * 2) / per;
		t = tlist[i];
		for(var j = 0; j < per; j++){
			var 
				n = new Node(false)
				,dir = vec3.a(
					 MC(pInt*j)
					,MS(pInt*j)
					,t.cpos[2]
				);
			n.cpos = vec3.add(t.cpos, vec3.sc(dir, (t.rad + n.rad) * 1.5));
			n.ppos = vec3.cn(n.cpos);
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
	var now = +new Date()
		,d = 9e200
		,mouse = convertCanvasPointToWorld( vec3.a(e.pageX, e.pageY, 0) )
		,i = 0;
	
	for(; i < nlist.length; i++){
		var n = nlist[i]
			,delta = vec3.len(vec3.sub(mouse, n.cpos));
		if(delta < d && delta <= n.rad*1.5 ) { // mouse within 1.5 radius
			grabbed = nlist[i];
			d = delta;
		}
	}
	
	// test for double click
	if(dbcl && now - dbcl > 90 && now - dbcl < 300){
		reinforceCleanness();
	}
	
	// set last double click time
	dbcl = now;
}

function inGameMouseMove(e){
	var mouse = convertCanvasPointToWorld( vec3.a(e.pageX, e.pageY, 0) );
	if(grabbed !== false){
		grabbed.cpos = mouse;
		grabbed.ppos = mouse; // kill movement
	}
}

function inGameMouseUp(e){
	grabbed = false;
	if(showsta === true){
		triggerFirstLevel();
	}
}

function inGameKeyDown(e){
	if(e.keyCode === 27) { // ESC
		clearInterval(run); 
		$start.hide();
		$winstatus.hide();
		$lvlstatus.hide();
		$boosts.hide();
		$msg.hide();
		
		tallyFinalScore();
		$cvs.fadeTo(300, 0.2);
		$endgame.fadeIn();
	} 
	if(e.keyCode === 68){ // D
		debug = true;
	}
	if(e.keyCode === 32){ // SPACE
		showtto = true;
	}
}

function inGameKeyUp(e){
	if(showsta === true && e.keyCode === 32){
		triggerFirstLevel();
	} else if (showsta === false) {
		if(e.keyCode === 68){
			debug = false;
		}
		if(e.keyCode === 32){ // SPACE
			showtto = false;
		}
		if(e.keyCode === 82){
			resets += 1;
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

function tallyFinalScore(){
	var bus = 0, ccount = 0, time = 0, tanti = 0, rsts = 0, c = completed, i = 0;
	for(; i < c.length; i++){
		bus 	+= c[i].bus;
		ccount 	+= c[i].ccount;
		time 	+= c[i].time;
		tanti 	+= c[i].tanti;
		rsts 	+= c[i].rsts;
	}
	$endgame.find("ul").html(
		"<li>" + completed.length + " rounds completed in " + (time / 1000) + " seconds</li>"
		+ "<li>" + ccount + " cells saved from a horrible, painful death</li>"
		+ "<li>You used " + bus + (bus == 1 ? " boost " : " boosts ") + "of antibiotics</li>"
		+ "<li>You fought with an army of " + tanti + " antibodies</li>"
		+ "<li>You had to retry " + rsts + (rsts == 1 ? " time" : " times" ) + "</li>"
	);
}

/////////////////////////////////////
// Init
/////////////////////////////////////

var 
	D = document
	,$cvs = $("#sta")
	,cvs = $cvs[0]
	,$start = $("#st") // start screen
	,$lvlstatus = $("#ls") // start of round screen
	,$winstatus = $("#ws") // win level screen
	,$endgame = $("#eg") // last screen
	,$boosts = $("#bst") // how many left
	,$msg = $("#msg") // messages to the user
	,$W = $(window)
	,run = 0 // ref for setInterval
	,waiting = false // used for animations
	,dim = [ $W.width(), $W.height(), 1000 ] // dimensions: width, height of canvas
	,wbb = { min: [0,0,0], max: [0,0,0] } // effectively a bounding box for the world
	,wdim = vec3.a(1,1,1) // the size of the world,
	,woff = vec3.a(0,0,0) // the world offset, or the min value of wbb
	,camr = 1 // "camera" ratio
	,ctx = cvs.getContext('2d')
	,R = Math.random // shortcut
	,r = R()
	,max = (30 * r) + 5 // max num of nodes per random game, minimum of 5
	,nlist = [] // node list
	,tlist = [] // tracker list
	,plist = [] // packet list
	,grabbed = false // the currently clicked node
	,pool = 5 // amount of boosts in the players pool
	,bused = 0 // number of boosts used to beat a round
	,start = +new Date() // time the round started
	,pcount = 0 // number of packets used in a round
	,resets = 0 // number of times r is used
	,cwin = 75 // % * 100 that all nodes must be to win the round
	,dbcl = +new Date() // last time a click was detected, for double click
	,debug = false
	,showsta = true // show start screen
	,showtto = false // show transmitting to
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
	,completed = [] // levels the player has completed
	// Math shortcuts
	,MC = Math.cos
	,MS = Math.sin
	,MM = Math.max
	,MF = Math.floor
	,MR = Math.round
	,MP = Math.PI


// set width and height of canvas to match window
resizeViewport();
// do this...
generateRandomLevel();

run = setInterval(function(){

	goNodeVerlet(0.03);
	goPacketVerlet(0.03);
	resolveNodeCollisions();
	resolveNodePacketCollisions();
	updateNodePeers();
	computeCameraRatio();
	if( showsta === false) { checkForWin(); }
	draw();

}, 33);

$(D).bind("mousedown", inGameMouseDown);
$(D).bind("mouseup", inGameMouseUp);
$(D).bind("mousemove", inGameMouseMove);
$(D).bind("keydown", inGameKeyDown);
$(D).bind("keyup", inGameKeyUp);
$W.bind('resize', resizeViewport);
	
}); // end of document.ready
})(jQuery); // end of wrapper