//Imports
const socket = require('socket.io');
const express = require("express");
const uniqid = require('uniqid');
const path = require('path');
const md5 = require('md5');


const AccessToken = require('twilio').jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;
const { connect, createLocalTracks, LocalVideoTrack } = require('twilio-video');

let Player = require("./Player");

//Configure Express
const app = express();
let server = app.listen(process.env.PORT || 80);
app.use(express.static("public"));

const indexPath = path.join(__dirname, '../public/room.html')
const homePath = path.join(__dirname, '../public/index.html')
const subroomPath = path.join(__dirname, '../public/subroom.html')

//Define twilio api keys
let TWILIO_ACCOUNT_SID = "<empty>";
let TWILIO_API_KEY = "<empty>";
let TWILIO_API_SECRET = "<empty>";

var activeRooms = [];

console.log('The server is running');

//EXPRESS
app.get("/", function(req, res) {
  res.sendFile(homePath);
});


app.get("/:roomName", function(req, res) {
	let roomName = req.params.roomName;
  activeRooms.push(roomName);
  res.sendFile(indexPath);
});

app.get("/:roomName/:subroomName", function(req, res) {
  // let roomName = req.params.roomName;
  // let subroomName = req.params.subroom;
  // activeRooms.push(roomName);
  res.sendFile(subroomPath);
});



//SOCKET
let io = socket(server);
let players = {};


// setInterval(updateGame, 30);

io.sockets.on("connection", socket => {

    //MAIN ROOM
    const roomName = socket.handshake.query.roomName;
    if(roomName == ""){ return; }
    if(players[roomName] == undefined){
      players[roomName] = {};
      players[roomName]["tracks"] = [];
      players[roomName]["blocks"] = [];
      players[roomName]["rooms"] = [];
      players[roomName]["entry_password"] = "";
      players[roomName]["admin_password"] = "";
    }
    players[roomName][socket.id] = new Player(socket.id, roomName);

    socket.join(roomName);

    console.log(`New connection ${socket.id} in room ${roomName}`);
    io.sockets.in(roomName).emit("heartbeat", Object.values(players[roomName]));
    for(var track in players[roomName]["tracks"]){
      io.sockets.in(roomName).emit("newTrack", players[roomName]["tracks"][track]);
    }
    for(var block in players[roomName]["blocks"]){
      var obj = players[roomName]["blocks"][block];
      obj.portalId = block;
      console.log(block);
      io.sockets.in(roomName).emit("newPortal", obj);
    }
    for(var room in players[roomName]["rooms"]){
      io.sockets.in(roomName).emit("newRoom", players[roomName]["rooms"][room]);
    }

    io.sockets.in(roomName).emit("entry_password", players[roomName]["entry_password"]);
    io.sockets.in(roomName).emit("admin_password", players[roomName]["admin_password"]);

    socket.on("setAdminPassword", hashedPassword => {
      players[roomName]["admin_password"] = hashedPassword;
      io.sockets.in(roomName).emit("admin_password", players[roomName]["admin_password"]);
    });

    socket.on("setEntryPassword", hashedPassword => {
      players[roomName]["entry_password"] = hashedPassword;
    });

    socket.on("disconnect", () => {
      console.log(`${socket.id} disconnected from room ${roomName}`);
      socket.in(roomName).emit("disconnected", socket.id);
      delete players[roomName][socket.id];
      removeRoomIfNonActive(roomName);
    });

    socket.on("move", player => {
      if(player && players[roomName] && players[roomName][player.id]){
        players[roomName][player.id].goalX = player.goalX;
        players[roomName][player.id].goalY = player.goalY;
        players[roomName][player.id].scale = player.scale;
        io.sockets.in(roomName).emit("heartbeat", Object.values(players[roomName]));
      }
    });

    socket.on("setYell", yellInfo =>{
      io.sockets.in(roomName).emit("setYell", yellInfo);
    });

    socket.on("newTrack", trackData =>{
      io.sockets.in(roomName).emit("newTrack", trackData);
      players[roomName]["tracks"].push(trackData);
    });

    socket.on("newPortal", portalData =>{
      var obj = portalData;
      obj.portalId = players[roomName]["blocks"].length || 0;
      console.log(obj);
      players[roomName]["blocks"].push(portalData);
      io.sockets.in(roomName).emit("newPortal", obj);
    });

    socket.on("newRoom", roomData =>{
      io.sockets.in(roomName).emit("newRoom", roomData);
      players[roomName]["rooms"].push(roomData);
    });

    socket.on("deletePortal", portalId =>{
      players[roomName]["blocks"].splice(portalId, 1)
      io.sockets.in(roomName).emit("deletePortal", portalId);
    });

    socket.on("deleteRoom", roomId =>{
      players[roomName]["rooms"].splice(roomId, 1)
      io.sockets.in(roomName).emit("deleteRoom", roomId);
    });


    socket.on("setName", name =>{
      players[roomName][socket.id].name = name;
      io.sockets.in(roomName).emit("setName", players[roomName][socket.id]);
    });


    socket.on("tokenRequest", roomName =>{
      let accessToken = makeAccessToken(socket.id, roomName)
      io.sockets.in(roomName).emit("token-"+socket.id, accessToken);
    })

    socket.on("sound", playerId =>{
      io.sockets.in(roomName).emit("sound", playerId);
    });
  

});


io.sockets.on("disconnect", () => {
  console.log("SERVER RESET");
  players = {};
  activeRooms = [];
});

//Helper functions
//TODO: Move these to another file

function removeRoomIfNonActive(roomName){
	const playersStillActive = players[roomName];
	if(playersStillActive.length == 0){
		const index = activeRooms.indexOf(roomName);
		activeRooms = activeRooms.splice(index, 1);
	}
}

function updateGame() {
	activeRooms.forEach(function(room){
    if(players[room]){
      var roomPlayers = Object.values(players[room]);
      io.sockets.in(room).emit("heartbeat", roomPlayers);
    }
	});
}

function makeAccessToken(playerId, roomName){
	const token = new AccessToken(TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET);
	token.identity = playerId;

	const videoGrant = new VideoGrant({
	    room: roomName
	});

	token.addGrant(videoGrant);

	return token.toJwt();
}


