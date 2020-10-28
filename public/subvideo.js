// rtc object
var muted = false;

var rtc = {
  client: null,
  joined: false,
  published: false,
  localStream: null,
  remoteStreams: [],
  params: {},
  spectating: false
};

// Options for joining a channel
var option = {
  appID: "98e9df832af14eb8b9ea07b97b0f850a",
  channel: roomName,
  uid: null,  //OK to be null
  token: null //OK to be null
};

var streams = 1;


const socket = io.connect('https://salty-ravine-74849.herokuapp.com/', {query:'subroomName='+roomName+'&name='+sessionStorage.getItem("grouproom-name")});
// const socket = io.connect('http://localhost', {query:'subroomName='+roomName+'&name='+sessionStorage.getItem("grouproom-name")});

function inIframe () {
    try {
        return window.self !== window.top;
    } catch (e) {
        return true;
    }
}

function startVideo(){
  initializeRTC();
}


function initializeRTC(){
  if(rtc.spectating){
    rtc.client = AgoraRTC.createClient({mode: 'live', codec: 'vp8'}); 
    rtc.client.setClientRole('audience', function() {
      console.log('Client role set to audience');
    }, function(e) {
      console.log('setClientRole failed', e);
    });
  }
  else{
    rtc.client = AgoraRTC.createClient({mode: "rtc", codec: "h264"});
  }

  rtc.client.init(option.appID, function () {
    console.log("Initialized Agora SDK");
    joinChannel(option.channel);
    listenForRemoteStreams();
    }, (err) => {
    console.error(err);
  });

}

function joinChannel(){
  rtc.client.join(option.token, option.channel, option.uid, function (uid) {
      console.log("join channel: " + option.channel + " success, uid: " + uid);
      rtc.params.uid = uid;
      rtc.joined = true;
      if(!rtc.spectating){
        createStream();
      }
    }, function(err) {
      console.error("client join failed", err);
  });
}

function createStream() {
  rtc.localStream = AgoraRTC.createStream({
    streamID: rtc.params.uid,
    audio: true,
    video: true,
    screen: false,
  });

  rtc.localStream.init(function () {
    console.log("init local stream success");
    option.uid = rtc.params.uid;
    createLocalVideoDiv(option.uid);
    publishStream();
    rtc.localStream.play("remote-media-"+option.uid);
  }, function (err) {
    console.error("init local stream failed ", err);
  });
}


function publishStream(){
  console.log("publishing...");
  rtc.client.publish(rtc.localStream, function (err) {
    console.log("publish failed");
    console.error(err);
    return;
  });
  rtc.published = true;
}


function listenForRemoteStreams(){
  console.log("listening...");

  //enter
  rtc.client.on("stream-added", function (evt) {  
    console.log("stream-added");
    var remoteStream = evt.stream;
    var id = remoteStream.getId();
    if (id !== rtc.params.uid) {
      rtc.client.subscribe(remoteStream, function (err) {
        console.log("stream subscribe failed", err);
      });
    }
    console.log("stream-added remote-uid: ", id);
  });


  rtc.client.on("stream-subscribed", function (evt) {
    console.log("stream-subscribed");
    var remoteStream = evt.stream;
    if(rtc.spectating){
      remoteStream.setAudioVolume(0);
    }

    var id = remoteStream.getId();
    // Add a view for the remote stream.
    createRemoteVideoDiv(id);
    // Play the remote stream.
    streams += 1;
    updateSizing(streams);
    remoteStream.play("remote-media-" + id);
    console.log("stream-subscribed remote-uid: ", id);
  });


  //leave
  rtc.client.on("stream-removed", function (evt) {
    var remoteStream = evt.stream;
    var id = remoteStream.getId();

    if (remoteStream) {
      remoteStream.stop();
      console.log(evt.uid + " left from this channel");
    }
    streams -= 1;
    updateSizing(streams);
    document.getElementById("remote-media-" + id).remove();
    console.log("stream-removed remote-uid: ", id);
  });

  rtc.client.on("peer-leave", function (evt) {
    var remoteStream = evt.stream;
    var id = remoteStream.getId();
    if (remoteStream) {
      remoteStream.stop();
      console.log(evt.uid + " left from this channel");
    }
    streams -= 1;
    updateSizing(streams);
    document.getElementById("remote-media-" + id).remove();
    console.log("peer-leave remote-uid: ", id);
  });

}

function toggleSound(){
  if(muted){
    rtc.localStream.unmuteAudio();
    muted = false;
    $("#mute-indicator").attr('src', '/assets/images/sound.png');
  }
  else{
    rtc.localStream.muteAudio();
    muted = true;
    $("#mute-indicator").attr('src', '/assets/images/mute.png');
  }
}

function createLocalVideoDiv(id){
  var videoDiv = document.createElement("div");
  // videoDiv.style.height = "120px";
  // videoDiv.style.width = "120px";
  // videoDiv.style.clipPath = "circle(60px at center)";
  videoDiv.id = 'remote-media-'+id;
  videoDiv.className = "remote-media-container";
  if(document.getElementById('remote-media-'+id) == undefined){
    document.getElementById("remote-media").appendChild(videoDiv);
  }
}

function createRemoteVideoDiv(id){
  var videoDiv = document.createElement("div");
  // videoDiv.style.height = "120px";
  // videoDiv.style.width = "120px";
  // videoDiv.style.clipPath = "circle(60px at center)";
  videoDiv.style.transform = 'scale(-1, 1)';
  videoDiv.id = 'remote-media-'+id;
  videoDiv.className = "remote-media-container";
  if(document.getElementById('remote-media-'+id) == undefined){
    document.getElementById("remote-media").appendChild(videoDiv);
  }
}

function updateSizing(streams){
  console.log("update sizing");

  if(streams < 4){
    $("#remote-media").css("grid-template-columns", "repeat(auto-fit, minmax(33vw,1fr))");
  }
  else if(streams == 4){
    $("#remote-media").css("grid-template-columns", "repeat(auto-fit, minmax(50vw,1fr))");
  }
  else if(streams > 4){
    $("#remote-media").css("grid-template-columns", "repeat(auto-fit, minmax(33vw,1fr))");
  }
  else if(streams > 6){
    $("#remote-media").css("grid-template-columns", "repeat(auto-fit, minmax(25vw,1fr))");
  }
  else if(streams > 9){
    $("#remote-media").css("grid-template-columns", "repeat(auto-fit, minmax(20vw,1fr))");
  }
}

function toggleProjector(){
  
}
