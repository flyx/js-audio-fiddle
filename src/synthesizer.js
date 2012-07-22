Synthesizer = function() {
   this.tracks = [];
   this.events = [];
   this.time = 0;
}

Synthesizer.prototype.play = function() {
   var that = this;
   this.timer = setInterval(function() {
      that.step();
   }, 60);
   
}

Synthesizer.prototype.pause = function() {
   clearInterval(this.timer);
}

Synthesizer.prototype.reset = function() {
   for (var i = 0; i < this.tracks.length; i++) {
      this.tracks[i].reset();
   }
   this.x = 0;
}

Synthesizer.prototype.addTrack = function(track) {
   this.tracks.push(track);
   return this.tracks.length - 1;
}

Synthesizer.prototype.step = function() {
   if (this.events[this.time] !== undefined) {
      for (var i = 0; i < this.events[this.time].length; i++) {
         this.tracks[this.events[this.time][i].track].handleEvent(
            this.events[this.time][i].event
         );
      }
   }
   this.time++;
}

Synthesizer.prototype.addEvent = function(time, track, synthEvent) {
   if (this.events[time] === undefined) {
      this.events[time] = [];
   }
   this.events[time].push({track : track, event : synthEvent});
}

TrackInterface = {
   handleEvent : function(event) {
      // abstract method
   },
   start : function() {
      if (!this.on) {
         this.node.connect(this.context.destination);
         this.on = true;
      }
   },
   pause : function() {
      if (this.on) {
         this.node.disconnect();
         this.on = false;
      }
   },
   reset : function() {
      // abstract method
   }
}

SineTrack = function() {
   var that = this;
   this.context = new webkitAudioContext();
   this.node = this.context.createJavaScriptNode(256, 1, 1);
   this.node.onaudioprocess = function(e) { that.process(e) };
   
   this.frequency = 440;
   this.next_frequency = 440;
   this.amplitude = 1;
   this.sample_rate = 44100;
   this.x = 0;
   this.on = false;
}

SineTrack.prototype = TrackInterface;

SineTrack.prototype.handleEvent = function(event) {
   switch (event.name) {
      case "on": this.x = 0; this.start(); break;
      case "off": this.pause(); break;
      case "setFrequency" :
         this.next_frequency = event.frequency;
         if (!this.on) {
            this.frequency = event.frequency;
         }
         break;
      case "setAmplitude" : this.amplitude = event.amplitude;
   }
}

SineTrack.prototype.process = function(e) {
   var data = e.outputBuffer.getChannelData(0);
   for (var i = 0; i < data.length; ++i) {
      data[i] = this.amplitude * Math.sin(this.x++ /
            (this.sample_rate / (2 * Math.PI * this.frequency)));
      
      if (this.next_frequency != this.frequency) {
         next_data = this.amplitude * Math.sin(
               this.x / (this.sample_rate / (2 * Math.PI * this.frequency)));
         if (data[i] < 0.001 && data[i] > -0.001 && data[i] < next_data) {
            this.frequency = this.next_frequency;
            this.x = 0;
         }
      }
   }
}

SineTrack.prototype.reset = function(e) {
   this.pause();
}