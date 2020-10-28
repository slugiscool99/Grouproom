var roomG;
var publishedTracks = {};
var unattatchedTracks = {};
var muted = false;

var tokenG;
var roomNameG;

function reconnectToRoom(){
  if(tokenG == undefined){
    return;
  }
  connectToRoom(tokenG, roomNameG);
}

function connectToRoom(token, roomName){
  if(roomG != undefined){ return; }

  tokenG = token;
  roomNameG = roomName;
  if(permissionToEnter == false){ return; }
  
  console.log(`Twilio connecting to ${roomName} with token ${token}`);

  navigator.mediaDevices.getUserMedia({
      audio: {
        sampleSize: 8,
        echoCancellation: true,
        autoGainControl: true,
        noiseSuppression: true
      },
      video: true
    }).then(function(mediaStream){ 

    Twilio.Video.connect(token, { 
      name : roomName,
      tracks: mediaStream.getTracks()
    }).then(room => {
      console.log(`Successfully joined a Room: ${room}`);

      roomG = room;

      addLocalVideoTrack(room);
      addRoomParticipantTracks(room);

      room.on('participantConnected', participant => {
        console.log(`A remote Participant connected: ${participant}`);
        addNewParticipantTracks(participant);
      });

      room.on('trackPublished', trackPublished);
      room.on('trackUnpublished', trackUnpublished);

    }, error => {
      console.error(`Unable to connect to Room: ${error.message}`);
      alert(`There was an error connecting to the Metaspace: ${error.message}`)
    });
  });
}



function addNewParticipantTracks(participant) {
  console.log("new participant " + participant)
  let publications = Array.from(participant.tracks.keys());
  publications.forEach(publication => {
    tryToAttachTrack(publication, participant.sid);
  });
}

function addRoomParticipantTracks(room){
  console.log("adding participants");

  let participants = Array.from(room.participants.keys());
  participants.forEach(participantIndex => {
    var participant = room.participants.get(participantIndex);
    let publications = Array.from(participant.tracks.keys());

    publications.forEach(publication => {
      tryToAttachTrack(publication, participantIndex);
    });

  });
}

function tryToAttachTrack(publicationIndex, participantIndex){
  var publication = roomG.participants.get(participantIndex).tracks.get(publicationIndex);

  if(publication.isSubscribed){
    console.log("subscribed, attaching");
    attachTrack(publication.track, roomG.participants.get(participantIndex)); 
  }
  else{
    console.log("trying in .5 secs");
    setTimeout(function(){ tryToAttachTrack(publicationIndex, participantIndex);}, 500);
  }
}

function addLocalVideoTrack(room){
  var dataTrack = room.localParticipant.videoTracks.values().next().value.track.attach();
  dataTrack.style.transform = 'scale(-1, 1)';
  dataTrack.style.clipPath = "circle(60px at center)";


  var type = "media";
  if(room.localParticipant.videoTracks.values().next().value.track.kind == "audio"){
    type = "audio";
  }
  else{
    dataTrack.style.height = "120px";
  }
  dataTrack.id = 'remote-'+type+'-'+socket.id;
  dataTrack.className = "mediaTrack";

  document.getElementById('remote-media-div-'+socket.id).appendChild(dataTrack);  
}


//receiving screenshare
function trackPublished(publication, participant) {
  console.log(`RemoteParticipant ${participant.sid} published Track ${publication.trackSid}`);
  var name = publication.trackName;
  publishedTracks[name] = publication;
}

//attach track
function attachTrack(track, participant){
  if(publishedTracks[track.name] != undefined){
    attachScreenshareTrack(track);
    return;
  }

  var dataTrack = track.attach();
  dataTrack.style.transform = 'scale(-1, 1)';
  dataTrack.style.clipPath = "circle(60px at center)";

  var type = "media";
  if(track.kind == "audio"){
    type = "audio";
  }
  else{
    dataTrack.style.height = "120px";
  }

  dataTrack.id = 'remote-'+type+'-'+participant.identity;

  if(document.getElementById('remote-media-div-'+participant.identity) != null){
    document.getElementById('remote-media-div-'+participant.identity).appendChild(dataTrack);
    addName("remote-media-div-"+participant.identity, players[participant.identity].name);
  }
  else{
    console.log("adding to unattatchedTracks");
    unattatchedTracks[participant.identity] = dataTrack;
  } 
}

//remove screenshare
function trackUnpublished(publication, participant) {
  console.log(`RemoteParticipant ${participant.sid} unpublished Track ${publication.trackSid}`);
  var name = publication.trackName;
  delete publishedTracks[name];
  removeScreenshareTrack(name);
}





function toggleSound(){
  if(muted){
    roomG.localParticipant.audioTracks.forEach((publication) => { 
        publication.track.enable(); 
    });

    muted = false;
    $("#muted-indicator").css('display', 'none');
    $("#unmuted-indicator").css('display', 'inline-block');
    videoElements[socket.id].style.filter = "grayscale(0%)";
  }
  else{
    roomG.localParticipant.audioTracks.forEach((publication) => { 
        publication.track.disable(); 
    });
        muted = true;
    $("#muted-indicator").css('display', 'inline-block');
    $("#unmuted-indicator").css('display', 'none');
    videoElements[socket.id].style.filter = "grayscale(100%)";
  }
}

function addName(id, name){
  $("#"+id).append("<br><div style='position:absolute;bottom:40px;color:white;'>"+name+"</div>");
}