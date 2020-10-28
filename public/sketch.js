
const socket = io.connect('https://salty-ravine-74849.herokuapp.com/', {query:'roomName='+roomName});
// const socket = io.connect('http://localhost', {query:'roomName='+roomName});

var volumeLevels = {};
window.AudioContext = (window.AudioContext ||
                       window.webkitAudioContext);

var rings = {};
var players = {};
var subrooms = {};
var interrooms = {};

var videoElements = {};
var pinned = false;

var elligableRoom = "";
var enteredRoom = false;
var promptText = "";

const zoomStart = 1000;
var zoomLevel = zoomStart;
var scale = 1;

var isYelling = false;

var hashedEntryPassword = "";
var hashedAdminPassword = "";

var permissionToEnter = false;


document.title = roomName + " | grouproom";

socket.on("heartbeat", players => updatePlayers(players)); //updates

socket.on("disconnected", playerId => removePlayer(playerId));

socket.on('connect', () => {
  console.log("creating self");
  socket.on("token-"+socket.id, accessToken => connectToRoom(accessToken, roomName)); //twilio token
  if(permissionToEnter || hashedEntryPassword == ""){
    askName();
    createVideoDiv({id: socket.id});
    setupPage();
    createNewPlayer({id: socket.id});
  }
});


socket.on("setYell", yellInfo => toggleYell(yellInfo)); //player sound

socket.on("sound", playerId => drawRing(playerId)); //player sound
socket.on("newTrack", trackData => addProjector(trackData)); //adds a projector
socket.on("newPortal", portalData => addPortal(portalData)); //adds a projector
socket.on("newRoom", roomData => addRoom(roomData)); //adds a projector


socket.on("deletePortal", id => deletePortal(id)); //adds a projector
socket.on("deleteRoom", id => deleteRoom(id)); //adds a projector

socket.on("setName", player => setName(player)); //adds a projector

socket.on("entry_password", password => setEntryPassword(password)); //player sound
socket.on("admin_password", password => setAdminPassword(password)); //player sound


var vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
var vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
var vl = Math.sqrt(Math.pow(vw, 2) + Math.pow(vh, 2));

function setEntryPassword(password){
  if(permissionToEnter == true){ return; }

  hashedEntryPassword = password;

  if(hashedEntryPassword == ""){
    permissionToEnter = true;
  }
  else{
    Swal.fire({
      title: 'Enter Password',
      input: 'text',
      inputAttributes: {
        autocapitalize: 'off'
      },
      showCancelButton: true,
      confirmButtonText: 'Enter'
    }).then((result) => {
      if (result.value) {
        var hashedPassword = md5(result.value);
        if(hashedPassword == hashedEntryPassword){
          permissionToEnter = true;
          console.log("creating self after password");
          reconnectToRoom();
          askName();
          createVideoDiv({id: socket.id});
          setupPage();
          createNewPlayer({id: socket.id});
        }
        else{
          location.href = "/";
        }
      }
    });
  }
}

function setAdminPassword(password){
  hashedAdminPassword = password;
  if(hashedAdminPassword != ""){
    $("#claimData").text("Admin Settings");
  }
}

function adminEdit(){
  if(hashedAdminPassword == ""){

    Swal.fire({
      title: 'Set Admin Password',
      input: 'text',
      inputAttributes: {
        autocapitalize: 'off'
      },
      showCancelButton: true,
      confirmButtonText: 'Set'
    }).then((result) => {
      if (result.value) {
        var hashedPassword = md5(result.value);
        socket.emit("setAdminPassword", hashedPassword);
      }
    });

  }
  else{

    Swal.fire({
      title: 'Enter Admin Password',
      input: 'text',
      inputAttributes: {
        autocapitalize: 'off'
      },
      showCancelButton: true,
      confirmButtonText: 'Set'
    }).then((result) => {
      if (result.value) {
        var hashedPassword = md5(result.value);
        if(hashedPassword == hashedAdminPassword){
          openAdminMenu();
        }
      }
    });

  }
}

function openAdminMenu(){
  Swal.fire({
    title: 'Set Entry Password',
    input: 'text',
    inputAttributes: {
      autocapitalize: 'off'
    },
    showCancelButton: true,
    confirmButtonText: 'Set'
  }).then((result) => {
    if (result.value) {
      var hashedPassword = md5(result.value);
      socket.emit("setEntryPassword", hashedPassword);
    }
  });
}


function setName(player){
  addName("remote-media-div-"+player.id, player.name);
}


function updatePlayers(serverPlayers) {
  if(enteredRoom){ return; }
  if(permissionToEnter == false){ return; }

  for (let i = 0; i < serverPlayers.length; i++) {
    let playerFromServer = serverPlayers[i];

    if(players[playerFromServer.id] == undefined){ //if player doesn't exist, create it
      createNewPlayer(playerFromServer);
    }
    else{
      updatePosition(playerFromServer);
    }

    if(document.getElementById('remote-media-'+playerFromServer.id) != null){
      players[playerFromServer.id].fillCircle = false;
    }

    updateSoundLevels(playerFromServer.id);
  }
}

function setupPage(){
  document.documentElement.style.height = "100%";
  document.body.style.height = "100%";
}


var minX = 0;
var minY = 0;
var maxX = vw;
var maxY = vh;
//MOVEMENT MANAGEMENT

setInterval(pushMove, 33);
function pushMove(){
  if(pinned){
    socket.emit('move', players[socket.id]); 
  }
}

setInterval(drawOwnVideo, 25);
function drawOwnVideo(){
  if(videoElements[socket.id] && players[socket.id]){
    videoElements[socket.id].style.left = lerp(videoElements[socket.id].offsetLeft, players[socket.id].goalX*scale - minX, 0.09) +"px"
    videoElements[socket.id].style.top = lerp(videoElements[socket.id].offsetTop, players[socket.id].goalY*scale - minY, 0.09) +"px"
  }
}

function askName(){
  if(sessionStorage.getItem("grouproom-name") != undefined){
    socket.emit("setName", sessionStorage.getItem("grouproom-name"));
    return;
  }

  Swal.fire({
    title: 'Set your name',
    input: 'text',
    inputAttributes: {
      autocapitalize: 'off'
    },
    showCancelButton: true,
    confirmButtonText: 'Set'
  }).then((result) => {
    if (result.value) {
      socket.emit("setName", result.value);
      sessionStorage.setItem("grouproom-name", result.value);
      // addName("remote-media-div-"+socket.id, result.value);
    }
  });
}


function updatePosition(player){
  if(player.id == socket.id){ return; }
  players[player.id].goalX = player.goalX; 
  players[player.id].goalY = player.goalY;
  players[player.id].scale = player.scale;
}

var drawInterval;
drawInterval = setInterval(drawVideo, 25);
function drawVideo(){
  for(player in videoElements){
    if(players[player]){ //keep video on top of player
      videoElements[player].style.left = lerp(videoElements[player].offsetLeft, players[player].goalX*scale - minX, 0.09) + "px";
      videoElements[player].style.top = lerp(videoElements[player].offsetTop, players[player].goalY*scale - minY, 0.09) + "px";
    } 
  }
}

function lerp (start, end, amt){
  return (1-amt)*start+amt*end
}



onmousemove = function(e){
  // if(players[socket.id] == undefined){ return; }
  
  if(isSelecting){ 
    x2 = e.clientX; //Update the current position X
    y2 = e.clientY; //Update the current position Y
    reCalc();
    return;
  }

  if(pinned){
    var player = players[socket.id];
    if(player == undefined){ return; }
    player.goalX = (e.clientX+minX)/scale - (120*scale);
    player.goalY = (e.clientY+minY)/scale + (-120*scale);
    players[socket.id] = player;
    drawOwnVideo();
  }
}

function moveX(amount){
  minX += amount;

}

onmouseup = function(e) {
  if(isSelecting){
    div.style.display = "none"; //Hide the div
    if(objectToBuild == 0){
      createProjector(x1, y1, x2, y2);
    }
    else if(objectToBuild == 1){
      createSubroom(x1, y1, x2, y2);
    }
    else if(objectToBuild == 2){
      createPortal(x1, y1, x2, y2);
    }
    else if(objectToBuild == 3){
      createRoom(x1, y1, x2, y2);
    }
  }
  else{
    pinned = false;
  }
}

onmousedown = function(e){
  if(permissionToEnter == false){ return; }

  var buildMenu = document.getElementById("buildInstructions");
  if(buildMenu.style.display != "none"){ 
    if(e.clientX > 175 || e.clientY > 241){
      cancelBuild();
      return;
    }
    else{
      return; 
    }
  }
  if(isSelecting){ 
      div = document.getElementById('buildSelection');
      div.style.display = "block"; //Unhide the div
      x1 = e.clientX; //Set the initial X
      y1 = e.clientY; //Set the initial Y
      console.log(x1, y1);
      reCalc();
  } else{
    if(e.clientX < 262 && e.clientY > (document.body.clientHeight - 100)){ //clicked on controls
      return;
    } 
    pinned = true;
    var player = players[socket.id];
    if(player == undefined){ return; }

    player.goalX = (e.clientX+minX)/scale - (120*scale);
    player.goalY = (e.clientY+minY)/scale + (-120*scale);
    players[socket.id] = player;
    socket.emit('move', players[socket.id]); 

    if(players[socket.id].goalX < minX+50){
      updateBackgroundPosition(-50,0);
    }
    else if(players[socket.id].goalX > (maxX-200)){
      updateBackgroundPosition(50,0);
    }
    else if(players[socket.id].goalY < minY+50){
      updateBackgroundPosition(0,-50);
    }
    else if(players[socket.id].goalY > (maxY-200)){
      updateBackgroundPosition(0,50);
    }


  }
}

function updateBackgroundPosition(x,y){
  if(drawInterval == -1){ return; }
  minX +=x;
  maxX += x;
  minY += y;
  maxY += y;
  clearInterval(drawInterval);
  drawInterval = -1;

  $('#backgroundGrid').animate({
    'background-position-x': -minX+'px',
    'background-position-y': -minY+'px'
  }, 200, 'linear');
  $(".static-block").each(function(element){
    $(this).animate({
      "left":this.offsetLeft-x,
      "top": this.offsetTop-y
    }, 200, 'linear');
  });

  for(var player in videoElements){
    if(player != socket.id){
      $(videoElements[player]).animate({
        "left": players[player].goalX-minX + "px",
        "top":  players[player].goalY-minY  + "px",
      }, 200, 'linear');
    }
  }

  setTimeout(function(){
    drawInterval = setInterval(drawVideo, 25);
  }, 200)
}

oncontextmenu = function(e){
  startBuild();
  e.preventDefault();
  return false;
}

onresize = function(e){
  var vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
  var vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
  var vl = Math.sqrt(Math.pow(vw, 2) + Math.pow(vh, 2));
  maxX = minX + vw;
  maxY = minY + vh;
}


function startBuild(){
  pinned = false;
  document.body.style.cursor = "default";
  document.getElementById("buildInstructions").style.display = "block";
}
// onwheel = function(e) {
//   const currentScale = zoomLevel / zoomStart;

//   zoomLevel -= e.deltaY;
//   if(zoomLevel < 0){
//     zoomLevel = 0;
//   }
//   else if(zoomLevel > 4000){
//     zoomLevel = 4000;
//   }
//   updateZoom(zoomLevel, currentScale);
// }



// function updateZoom(zoomLevel, currentScale){
//   scale = zoomLevel / zoomStart;

//   const percentageFromLeft = (players[socket.id].goalX - minX)/(vw);
//   const percentageFromTop = (players[socket.id].goalY - minY)/(vh);

//   const needsToMove = vw*(scale-currentScale);

//   minX += needsToMove*percentageFromLeft
//   minY += needsToMove*percentageFromTop


//   for(var video in videoElements){
//     var containerDiv = document.getElementById("remote-media-div-"+video);
//     var videoDiv = document.getElementById("remote-media-"+video);

//     if(videoDiv == null){ continue; }

//     videoDiv.style.height = 120*scale + "px";
//     containerDiv.style.width = 120*scale + "px";
//     containerDiv.style.height = 120*scale + "px";
//     videoDiv.style.clipPath = "circle(" + 60*scale +"px at center)";

//     drawVideo(video);
//   }

//   // var player = players[socket.id];
//   // player.goalX = (player.goalX+minX)/scale - (60 - 60*scale);
//   // player.goalY = (player.goalY+minY)/scale + (60 - 60*scale);
//   // players[socket.id] = player;
//   drawOwnVideo();
// }


function enterRoom(roomId){
  console.log("enter " + roomId);
  location.href = location.href + "/" + roomId;
}

//SOUND MANAGEMENT

function updateSoundLevels(playerId){
  if(videoElements[playerId] == undefined){return;}

  if(players[socket.id] != undefined && socket.id != playerId){

    const currentPlayerX = players[socket.id].goalX;
    const currentPlayerY = players[socket.id].goalY;
    const distX = players[playerId].goalX - currentPlayerX;
    const distY = players[playerId].goalY - currentPlayerY;
    const distanceBetweenPlayers = Math.sqrt(Math.pow(distX, 2) + Math.pow(distY, 2));


    var volume = (-8)*(((distanceBetweenPlayers-200)/vl))+0.7;

    if(players[playerId].isYelling == true){
      volume = 1;
    }
    // if(players[socket.id].isYelling == true){
    //   volume = 1;
    // }

    if(volume < .12){ volume = 0; }
    if(volume > 1){ volume = 1; }

    var grayscale = (1-volume) + 0.1;

    if(videoElements[playerId]){ //keep video on top of player
      videoElements[playerId].style.filter = "grayscale("+(grayscale*100)+"%)";
    }

    // rtc.remoteStreams[playerId].setAudioVolume(Math.floor(volume*100));

    var audioElement = document.getElementById("remote-audio-"+playerId);
    if(audioElement != null){
      audioElement.volume = volume;
    }
  }
}


//NEW PLAYER CREATION

function createNewPlayer(player){
  if(player.id == null){ return; }
  var newPlayer = new Player(player);
  players[player.id] = newPlayer;
  if(player.id != socket.id){
    console.log("Creating new player");
    createVideoDiv(newPlayer);
  }
}

function createVideoDiv(player){
  if(player.id == undefined){return;}
  if(document.getElementById('remote-media-div-'+player.id) != undefined){ return; }
  var videoDiv = document.createElement("div");
  videoDiv.style.position = "absolute";
  videoDiv.style.width = "240px";
  videoDiv.style.height = "240px";
  videoDiv.style.top = player.goalX+"px";
  videoDiv.style.left = player.goalY+"px";
  videoDiv.style.zIndex = '2';
  videoDiv.style.display = "flex";
  videoDiv.style.alignItems = "center";
  videoDiv.style.justifyContent = "center";
  videoDiv.id = 'remote-media-div-'+player.id;
  videoDiv.style.pointerEvents = "none";
  document.body.appendChild(videoDiv);

  videoElements[player.id] = videoDiv;

  if(unattatchedTracks[player.id] != undefined){
    document.getElementById('remote-media-div-'+player.id).appendChild(unattatchedTracks[player.id]);
    addName("remote-media-div-"+player.id, players[player.id].name);
  }

  if(player.id == socket.id){
    socket.emit('tokenRequest', roomName);
  }
}

function toggleSelfYell(){
  isYelling = !isYelling;
  if(isYelling){
    $("#shout-indicator").css("display", "inline-block");
    $("#speak-indicator").css("display", "none");
  }
  else{
    $("#shout-indicator").css("display", "none");
    $("#speak-indicator").css("display", "inline-block");
  }
  socket.emit('setYell', {playerId: socket.id, isYelling: isYelling});
}

function toggleYell(yellInfo){
  players[yellInfo.playerId].isYelling = yellInfo.isYelling;
  const remoteMediaDivId = '#remote-media-div-'+yellInfo.playerId;

  if(yellInfo.isYelling){
    const yellIndicator = "<div id='yellIndicator' style='top:50px;right:50px;position:absolute;'><img src='assets/images/megaphone.png' style='width:36px;height:36px;' /></div>"
    $(remoteMediaDivId).append(yellIndicator);
  }
  else{
    $(remoteMediaDivId + " #yellIndicator").remove();
  }
}


function updateText(){
  var text = "pin";
  document.body.style.cursor = "default";
  if(pinned){
    text = "unpin";
    document.body.style.cursor = "none";
  }
  document.getElementById("pinAction").innerHTML = text;
}


//Mic levels monitor
navigator.getUserMedia = navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia;
if (navigator.getUserMedia) {
  navigator.getUserMedia({
      audio: true
    },
    function(stream) {
      audioContext = new AudioContext();
      analyser = audioContext.createAnalyser();
      microphone = audioContext.createMediaStreamSource(stream);
      javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);

      analyser.smoothingTimeConstant = 0.8;
      analyser.fftSize = 1024;

      microphone.connect(analyser);
      analyser.connect(javascriptNode);
      javascriptNode.connect(audioContext.destination);

      javascriptNode.onaudioprocess = function() {
          var array = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(array);
          var values = 0;

          var length = array.length;
          for (var i = 0; i < length; i++) {
            values += (array[i]);
          }

          var average = values / length;
          if(average > 30){
            socket.emit('sound', socket.id); 
          }

        } // end fn stream
    },
    function(err) {
      console.log("The following error occured: " + err.name)
    });
} else {
  console.log("getUserMedia not supported");
}


function drawRing(playerId){

  if(players[playerId] == undefined){ return; }
  if(muted && playerId == socket.id){ return; }
  if(players[playerId].isYelling){ return; }
 
  var ringDiv = document.getElementById('remote-media-div-'+playerId);
  if(ringDiv == undefined || ringDiv.classList.contains("playerDiv")){ return; }
  ringDiv.classList.add("playerDiv");
  setTimeout(function(){
    if(ringDiv){
      ringDiv.classList.remove("playerDiv");
    }
  }, 2500);
}


//HELPERS

function playerExists(playerFromServer) {
  for (let i = 0; i < players.length; i++) {
    if (players[playerFromServer.id] != undefined) {
      return true;
    }
  }
  return false;
}

function removePlayer(playerId) {
  console.log(playerId);
  if(document.getElementById('remote-media-div-'+playerId) != undefined) {
    document.getElementById('remote-media-div-'+playerId).remove();
  }
  delete players[playerId];
  delete videoElements[playerId];
}


function clamp(current, goal, incremenet){
  if(current < goal){
    return current += incremenet;
  }
  else{
    return goal;
  }
}
