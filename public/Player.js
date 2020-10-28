class Player {
  constructor(player) {
    this.goalX = player.goalX || 0;
    this.goalY = player.goalY || 0;
    this.id = player.id;
    this.rgb = player.rgb;
    this.name = player.name || "";
    this.fillCircle = true;
    this.isYelling = false;
    this.scale = 1;
  }
}



