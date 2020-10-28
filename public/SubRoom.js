class SubRoom {
  constructor(x, y, d) {
    this.x = x;
    this.y = y;
    this.goalD = d;
    this.currentD = 0;
  }

  draw() {
    stroke(0);
    strokeWeight(4);
    fill(40);
    if(this.currentD < this.goalD){
    	this.currentD+=10;
    }
    circle(this.x, this.y, this.currentD);
    stroke(255);
    strokeWeight(1);
  }

}