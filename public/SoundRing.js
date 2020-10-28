class SoundRing {
  constructor(x,y) {
    this.x = x;
    this.y = y;
    this.diameter = 0;
  }

  draw() {
    strokeWeight(1);
    stroke(200-(this.diameter/2));
    noFill();
    circle(this.x+60, this.y+60, this.diameter);
    this.diameter += (3-(this.diameter/100));
  }

}