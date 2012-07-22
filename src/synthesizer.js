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

SineTrack = function(context,channel) {
   var that = this;
   this.context = context;
   this.node = this.context.createJavaScriptNode(256, 10, 10);
   this.node.onaudioprocess = function(e) { that.process(e) };
   this.channel = channel;
   this.frequency = 440;
   this.next_frequency = 440;
   this.amplitude = 1;
   this.sample_rate = this.context.sampleRate;
   this.x = 0;
   this.on = false;
}

SineTrack.prototype = TrackInterface;

SineTrack.prototype.handleEvent = function(event) {
   switch (event.name) {
      case "on": this.x = 0; this.stop_request = false; this.start(); break;
      case "off":
         this.stop_request = true;
         break;
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
   var data = e.outputBuffer.getChannelData(this.channel);
   var stopping = false;
   for (var i = 0; i < data.length; ++i) {
      if (stopping) {
         data[i] = 0;
      } else {
         data[i] = this.amplitude * Math.sin(this.x++ /
               (this.sample_rate / (2 * Math.PI * this.frequency)));
      }
      if (this.next_frequency != this.frequency || this.stop_request) {
         next_data = this.amplitude * Math.sin(
               this.x / (this.sample_rate / (2 * Math.PI * this.frequency)));
         if (this.next_frequency != this.frequency) {
            if (data[i] < 0.001 && data[i] > -0.001 && data[i] < next_data) {
               this.frequency = this.next_frequency;
               this.x = 0;
            }
         }
         
         if (this.stop_request) {
            // xor
            if ((next_data < 0) ? (data[i] >= 0) : (data[i] < 0)) {
               stopping = true;
            }
         }
      }
   }
   if (stopping) {
      this.pause();
   }
}

SineTrack.prototype.reset = function(e) {
   this.pause();
}