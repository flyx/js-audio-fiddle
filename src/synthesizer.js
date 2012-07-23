Synthesizer = function() {
   this.tracks = [];
   this.events = [];
   this.time = 0;
   this.context = new webkitAudioContext();
}

Synthesizer.prototype.process = function(e) {
   for (var i = 0; i < this.tracks.length; i++) {
      this.tracks[i].process(e, i, this.context.sampleRate);
   }
}

Synthesizer.prototype.play = function() {
   var that = this;
   this.node = this.context.createJavaScriptNode(1024, this.tracks.length, this.tracks.length);
   this.node.onaudioprocess = function(e) { that.process(e) };
   this.node.connect(this.context.destination);
   this.timer = setInterval(function() {
      that.step();
   }, 60);
   
}

Synthesizer.prototype.pause = function() {
   clearInterval(this.timer);
   this.node.disconnect();
}

Synthesizer.prototype.reset = function() {
   this.time = 0;
}

Synthesizer.prototype.addInstrument = function(track) {
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

InstrumentInterface = {
   handleEvent : function(event) {
      // abstract method
   }
}

SineInstrument = function(config) {
   var that = this;
   this.frequency = 440;
   this.next_frequency = 440;
   this.amplitude = 0.5;
   this.x = 0;
   this.y = 0;
   this.on = false;
   this.config = config;
}

SineInstrument.prototype = InstrumentInterface;

SineInstrument.prototype.handleEvent = function(event) {
   switch (event.name) {
      case "on":
         this.x = 0;
         this.stop_request = false;
         this.damp = 0;
         this.on = true;
         this.frequency = event.frequency;
         this.next_frequency = event.frequency;
         break;
      case "off":
         this.stop_request = true;
         break;
      case "setFrequency" :
         this.next_frequency = event.frequency;
         if (!this.on) {
            this.frequency = event.frequency;
         }
         break;
      case "setAmplitude" : this.amplitude = event.amplitude; break;
   }
}

SineInstrument.prototype.process = function(e, channel, sampleRate) {
   var data = e.outputBuffer.getChannelData(channel);
   
   for (var i = 0; i < data.length; i++) {
      if (this.config.vibrateEnabled) {
         curFrequency = this.frequency + Math.sin(this.y++ /
               (sampleRate / (2 * Math.PI * this.config.vibrateFrequency))) *
               this.config.vibrateAmp;
      } else {
         curFrequency = this.frequency;
      }
      
      if (this.on) {
      
         if (this.stop_request && this.damp > 0) {
            this.damp -= 0.001;
         } else if (!this.stop_request && this.damp < 1) {
            this.damp += 0.001;
         }
         data[i] = this.amplitude * this.damp * Math.sin(this.x++ /
               (sampleRate / (2 * Math.PI * curFrequency)));
         
         if (this.next_frequency != this.frequency) {
            next_data = this.amplitude * this.damp * Math.sin(this.x / 
                     (sampleRate / (2 * Math.PI * curFrequency)));
            if (data[i] < 0.001 && data[i] > -0.001 && data[i] < next_data) {
               this.frequency = this.next_frequency;
               this.x = 0;
            }
         }
      } else {
         data[i] = 0;
      }
   }
   
   if (this.damp <= 0) {
      this.on = false;
   }
}