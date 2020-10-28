class Player {
  constructor(id, roomName) {
    this.goalX = Math.random() * 500;
    this.goalY = Math.random() * 500;
    this.id = id;
    this.roomName = roomName;
    this.name = "";
    this.isYelling = false;
    this.scale = 1;

    this.rgb = {
      r: Math.random() * 255,
      g: Math.random() * 255,
      b: Math.random() * 255,
    }
  }

}

module.exports = Player;