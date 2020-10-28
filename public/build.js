var div, x1 = 0, y1 = 0, x2, y2;
var objectToBuild;
var defaultUrl = null;
//Building starters
function buildProjector(){
	document.getElementById("buildInstructions").style.display = "none";
	document.body.style.cursor = "crosshair";
	isSelecting = true;
	div = document.getElementById('buildSelection');
	objectToBuild = 0;
}

function buildSubroom(){
	document.getElementById("buildInstructions").style.display = "none";
	document.body.style.cursor = "crosshair";
	isSelecting = true;
	div = document.getElementById('buildSelection');
	objectToBuild = 1;
}

function buildPortal(url = null){
	defaultUrl = url;
	document.getElementById("buildInstructions").style.display = "none";
	document.body.style.cursor = "crosshair";
	isSelecting = true;
	div = document.getElementById('buildSelection');
	objectToBuild = 2;
}


function buildWhiteboard(){
	var url = 'https://whiteboardfox.com/diagramName';
}


function cancelBuild(){
	isSelecting = false;
	defaultUrl = null;
	document.body.style.cursor = "default";
	document.getElementById("buildInstructions").style.display = "none";
}

//Selection helpers
function reCalc() { //This will restyle the div
	if(x2 == undefined || y2 == undefined){ return; }
    var x3 = Math.min(x1,x2); //Smaller X
    var x4 = Math.max(x1,x2); //Larger X
    var y3 = Math.min(y1,y2); //Smaller Y
    var y4 = Math.max(y1,y2); //Larger Y
    div.style.left = x3 + 'px';
    div.style.top = y3 + 'px';
    div.style.width = x4 - x3 + 'px';
    div.style.height = y4 - y3 + 'px';
}

function createSubroom(){
	isSelecting = false;
	defaultUrl = null;
	document.body.style.cursor = "default";

	var id = Object.keys(subrooms).length;

	const roomData = {
		roomName: "Room",
		roomId: id,
		x1: (x1 + minX)/scale,
		y1: (y1 + minY)/scale,
		x2: (x2 + minX)/scale,
		y2: (y2 + minY)/scale
	}

	socket.emit("newRoom", roomData);
}



function deleteElement(id){
	$("#"+id).remove();
	var elementType = id.split("-")[0];
	var elementId = id.split("-")[1];
	if(elementType == "room"){
		socket.emit("deleteRoom", elementId);
	}
	else if(elementType == "portal"){
		socket.emit("deletePortal", elementId);
	}
	else if(elementType == "interroom"){
		socket.emit("deleteInterRoom", elementId);
	}
}

function deletePortal(id){
	$("#portal-"+id).remove();
}

function deleteRoom(id){
	$("#room-"+id).remove();
	delete subrooms[id];
}


function addDeleteButton(data, id, type){
	var deleteButton = document.createElement("button");
	deleteButton.className = "closeButton";
	deleteButton.innerHTML = "X";

	deleteButton.style.left = "0px";
	deleteButton.style.top = "0px";
	document.getElementById(type+"-"+id).appendChild(deleteButton);

	deleteButton.onmousedown = function(){ console.log("deleting..."); deleteElement(type+"-"+id); event.stopPropagation();}
}


function addRoom(roomData){
	console.log("new room");
	if(document.getElementById("room-"+roomData.roomId) != undefined) { return; }

	subrooms[roomData.roomId] = []; 
	var roomDiv = document.createElement("div");
	roomDiv.style.position = "absolute";
	roomDiv.style.width = (roomData.x2 - roomData.x1) + "px";
	roomDiv.style.height = (roomData.y2 - roomData.y1) + "px";
	roomDiv.style.left = roomData.x1 - minX + "px";
	roomDiv.style.top = roomData.y1 - minY + "px";
	roomDiv.style.borderRadius = "8px";
	roomDiv.style.background = "#353535";
	roomDiv.style.color = "white";
	roomDiv.style.zIndex = "0";
	roomDiv.style.padding = "16px"
	roomDiv.style.overflow = "hidden"
	// roomDiv.onclick = function(){ enterRoom(roomData.roomId);  };
	roomDiv.addEventListener('click',function(e){
	  enterRoom(roomData.roomId);
	  console.log('event on parent!')
	},true);

	roomDiv.className = "static-block";
	roomDiv.classList.add("indicate-hover");
	roomDiv.classList.add("subroom");
	roomDiv.id = "room-"+roomData.roomId;

	document.body.appendChild(roomDiv);


	var portalFrame = document.createElement("iframe");
	portalFrame.src = "https://grouproom.io/"+roomName+"/"+roomData.roomId;
	portalFrame.style.height = "100%";
	portalFrame.style.width = "100%";
	portalFrame.style.border = "none";
	portalFrame.id = "portal-frame-"+roomData.roomId;
	portalFrame.style.pointerEvents = "none";
	document.getElementById("room-"+roomData.roomId).appendChild(portalFrame);

	// addDeleteButton(roomData, roomData.roomId, "room");
}

function createPortal(){
	isSelecting = false;

	document.body.style.cursor = "default";

	if(defaultUrl == null){
		Swal.fire({
		  title: 'Enter a URL',
		  input: 'text',
		  inputAttributes: {
		    autocapitalize: 'off'
		  },
		  showCancelButton: true,
		  confirmButtonText: 'Build'
		}).then((result) => {
		  if (result.value) {
		    var url = result.value;

		    if(url == undefined){ return; }
		    if(url == ""){ return; }
		    if(!url.includes("http")){
		    	url = "https://"+url;
		    }

		    if(url.includes("youtube.com")){
		    	url = url.split("watch?v=")[1].split("&")[0];
		    	url = "https://www.youtube.com/embed/" + url;
		    }
		    else if(url.includes("youtu.be")){
		    	url = url.split(".be/")[1].split("?")[0];
		    	url = "https://www.youtube.com/embed/" + url;
		    }
		    else if(url.includes("docs.google.com") || url.includes("sheets.google.com") || url.includes("jamboard.google.com") || url.includes("slides.google.com")){
		    	console.log("continueing");
		    }
		    else{
		    	alert("Please enter a valid URL");
		    	return;
		    }
		    const portalData = {
		    	url: url,
		    	x1: (x1 + minX)/scale,
		    	y1: (y1 + minY)/scale,
		    	x2: (x2 + minX)/scale,
		    	y2: (y2 + minY)/scale
		    }
		    socket.emit("newPortal", portalData);
		  }
		});
	}
	else{
		const portalData = {
			url: defaultUrl,
			x1: (x1 + minX)/scale,
			y1: (y1 + minY)/scale,
			x2: (x2 + minX)/scale,
			y2: (y2 + minY)/scale
		}
		socket.emit("newPortal", portalData);
		defaultUrl = null;
	}
	
}

function addPortal(portalData){
	console.log("adding a portal");
	console.log(portalData);
	if(document.getElementById("portal-"+portalData.portalId) != undefined) { return; }
	var portalDiv = document.createElement("div");
	portalDiv.style.position = "absolute";
	portalDiv.style.width = (portalData.x2 - portalData.x1) + "px";
	portalDiv.style.height = (portalData.y2 - portalData.y1) + "px";
	portalDiv.style.left = portalData.x1 + "px";
	portalDiv.style.top = portalData.y1 + "px";
	portalDiv.style.background = "white";
	portalDiv.style.zIndex = "5";
	portalDiv.className = "static-block";
	portalDiv.classList.add("subroom");
	portalDiv.id = "portal-"+portalData.portalId;
	portalDiv.style.border = "none";
	portalDiv.style.borderRadius = "8px";


	document.body.appendChild(portalDiv);

	var portalFrame = document.createElement("iframe");
	portalFrame.src = portalData.url;
	portalFrame.style.height = "100%";
	portalFrame.style.width = "100%";
	portalFrame.style.border = "none";
	portalFrame.id = "portal-frame-"+portalData.portalId;


	document.getElementById("portal-"+portalData.portalId).appendChild(portalFrame);

	addDeleteButton(portalData, portalData.portalId, "portal");

}




//Screenshare creation
async function createProjector(x1, y1, x2, y2){
	const stream = await navigator.mediaDevices.getDisplayMedia();
	const screenTrack = new Twilio.Video.LocalVideoTrack(stream.getTracks()[0]);	
	roomG.localParticipant.publishTrack(screenTrack);
	isSelecting = false;
	// stream.oninactive = () => {
	// 	unpublishTrack()
	// }
	addLocalScreenshareTrack(screenTrack, x1, y1, x2, y2);
	notifyOtherOfNewTrack(screenTrack.name, x1, y1, x2, y2);
}

function notifyOtherOfNewTrack(trackName, x1, y1, x2, y2){
	const trackData = {
		trackName: trackName,
		x1: x1/scale,
		y1: y1/scale,
		x2: x2/scale,
		y2: y2/scale
	};
	socket.emit("newTrack", trackData);
}

//Screenshare event recieved, called by socket. Positions the div correctly
function addProjector(trackData){
	console.log("adding a projector");
	makeScreenshareDivIfNotExists(trackData.trackName);
	var videoDiv = document.getElementById('screenshare-div-'+trackData.trackName);
	videoDiv.style.width = (trackData.x2 - trackData.x1) + "px";
	videoDiv.style.height = (trackData.y2 - trackData.y1) + "px";
	videoDiv.style.left = trackData.x1 + "px";
	videoDiv.style.top = trackData.y1 + "px";
	videoDiv.style.zIndex = 80;
}

//Screenshare track subscribed, called by twilio. Adds the video
function attachScreenshareTrack(track){
	makeScreenshareDivIfNotExists(track.name);
	var dataTrack = track.attach();
	dataTrack.style.width = "100%";
	dataTrack.style.height = "100%";
	document.getElementById('screenshare-div-'+track.name).appendChild(dataTrack);
}

function makeScreenshareDivIfNotExists(name){
	if(document.getElementById('screenshare-div-'+name) == undefined){
		var videoDiv = document.createElement("div");
		videoDiv.style.position = "absolute";
		videoDiv.style.width = "1px";
		videoDiv.style.height = "1px";
		videoDiv.style.left = "0px";
		videoDiv.style.top = "0px";
		videoDiv.style.zIndex = 80;
		videoDiv.id = 'screenshare-div-'+name;
		videoDiv.className = "static-block";
		document.body.appendChild(videoDiv);
	}
}

function addLocalScreenshareTrack(screenTrack, x1, y1, x2, y2){
	makeScreenshareDivIfNotExists(screenTrack.name);
	var dataTrack = screenTrack.attach();
	dataTrack.style.width = "100%";
	dataTrack.style.height = "100%";
	document.getElementById('screenshare-div-'+screenTrack.name).appendChild(dataTrack);
}

function removeScreenshareTrack(screenTrackName){
	var element = document.getElementById('screenshare-div-'+screenTrackName);
	element.parentNode.removeChild(element);
}
