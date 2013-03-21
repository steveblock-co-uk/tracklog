Lap = function(parentActivity, observer) {
  this.parentActivity_ = parentActivity;
  this.observer_ = observer;
  this.observer_.setLap(this);
};
Lap.prototype.populate = function(node) {
  // Lap holds all time and distance metadata.
  this.startTime_ = node.getAttribute('StartTime');
  this.totalTimeSeconds_ = Number(node.getElementsByTagName('TotalTimeSeconds')[0].textContent).valueOf();
  // We call this length to avoid confusion with Trackpoint.distanceMeters_.
  this.length_ = Number(node.getElementsByTagName('DistanceMeters')[0].textContent).valueOf();
  this.maximumSpeed_ = Number(node.getElementsByTagName('MaximumSpeed')[0].textContent).valueOf();
  this.calories_ = Number(node.getElementsByTagName('Calories')[0].textContent).valueOf();
  this.tracks_ = [];
  for (var i = 0; i < node.childNodes.length; i++) {
    if (node.childNodes[i].tagName === 'Track') {
      var track = new Track(this.observer_.createTrackObserver());
      track.populate(node.childNodes[i]);
      this.tracks_.push(track);
    }
  }
  this.checkConsistency();
};
Lap.prototype.checkConsistency = function() {
  // May have no tracks, but only first and last tracks may be time-only.
  for (var i = 1; i < this.tracks_.length - 1; ++i) {
    if (this.tracks_[i].isTimeOnly()) {
      throw new Error('Only first and last tracks may be time-only');
    }
  }
};
Lap.prototype.isEmpty = function() {
  return this.tracks_.length === 0;
}
Lap.prototype.firstTrack = function() {
  if (this.isEmpty()) {
    throw new Error('Can\'t get first track of empty lap');
  }
  return this.tracks_[0];
};
// This may return null.
Lap.prototype.firstNonTimeOnlyTrack = function() {
  for (var i = 0; i < this.tracks_.length; ++i) {
    if (!this.tracks_[i].isTimeOnly()) {
      return this.tracks_[i];
    }
  }
  return null;
};
Lap.prototype.lastTrack = function() {
  if (this.isEmpty()) {
    throw new Error('Can\'t get last track of empty lap');
  }
  return this.tracks_[this.tracks_.length - 1];
};
// This may return null.
Lap.prototype.lastNonTimeOnlyTrack = function() {
  for (var i = this.tracks_.length - 1; i >= 0; --i) {
    if (!this.tracks_[i].isTimeOnly()) {
      return this.tracks_[i];
    }
  }
  return null;
};
Lap.prototype.isTimeOnly = function() {
  return this.firstNonTimeOnlyTrack() === null;
};
Lap.prototype.numTimeOnlyTracks = function() {
  var count = 0;
  for (var i = 0; i < this.tracks_.length; ++i) {
    if (this.tracks_[i].isTimeOnly()) {
      ++count;
    } 
  }
  return count;
};
Lap.prototype.summedTime = function() {
  var time = 0;
  for (var i = 0; i < this.tracks_.length; ++i) {
    time += this.tracks_[i].time();
  }
  return time;
};
Lap.prototype.summedLength = function() {
  var length = 0;
  for (var i = 0; i < this.tracks_.length; ++i) {
    if (!this.tracks_[i].isTimeOnly()) {
      length += this.tracks_[i].length();
    }
  }
  return length;
};
Lap.prototype.distanceFrom = function(other) {
  if (this.isTimeOnly() || other.isTimeOnly()) {
    throw new Error('Can\'t get distance from time-only laps');
  }
  return this.firstNonTimeOnlyTrack().distanceFrom(
      other.lastNonTimeOnlyTrack());
};
Lap.prototype.timeFrom = function(other) {
  // We use this.startTime_, rather than other's first trackpoint time.
  return (new Date(this.startTime_) -
    new Date(other.lastTrack().lastTrackpoint().timestamp_)) / 1000;
};
Lap.prototype.displacementFrom = function(other) {
  if (this.isTimeOnly() || other.isTimeOnly()) {
    throw new Error('Can\'t get displacement from time-only laps');
  }
  return this.firstNonTimeOnlyTrack().displacementFrom(
      other.lastNonTimeOnlyTrack());
};
Lap.prototype.endTime = function() {
  if (this.isEmpty()) {
    throw new Error('Can\'t get end time of empty lap');
  }
  return this.lastTrack().lastTrackpoint().timestamp_;
};
Lap.prototype.deltaTime = function() {
  if (this.isEmpty()) {
    throw new Error('Can\'t get delta time of empty lap');
  }
  // We use this.startTime_, rather than the first trackpoint time.
  return (new Date(this.endTime()) - new Date(this.startTime_)) / 1000;
};
Lap.prototype.startDistance = function() {
  if (this.isTimeOnly()) {
    throw new Error('Can\'t get start distance for time-only lap');
  }
  return this.firstNonTimeOnlyTrack().firstNonTimeOnlyTrackpoint().distanceMeters_;
};
Lap.prototype.endDistance = function() {
  if (this.isTimeOnly()) {
    throw new Error('Can\'t get end distance for time-only lap');
  }
  return this.lastNonTimeOnlyTrack().lastNonTimeOnlyTrackpoint().distanceMeters_;
};
Lap.prototype.removeTrack = function(index) {
  console.log('Removing track ' + (index + 1) + ' of ' + this.tracks_.length);
  var track = this.tracks_[index];
  // When removing a track, we need to shift the distances of all later
  // tracks in this lap, update the time and length of this lap, and update
  // the distances of all later laps in this activity.
  // TODO: Consider shifting time of all updated tracks and laps.
  if (!track.isTimeOnly()) {
    var delta = -track.length();
    for (var i = index + 1; i < this.tracks_.length; i++) {
      console.log(
          'Shifting track ' + (i + 1) + ' by delta ' + delta);
      this.tracks_[i].shiftDistances(delta);
    }
    this.length_ += delta;
    this.parentActivity_.onChildLapDistanceChanged(this, delta);
  }
  this.totalTimeSeconds_ -= track.time();

  removeIndex(this.tracks_, index);
  // TODO: Make an estimate of how to update calories?

  track.observer_.onRemoved();

  // We must make this call after updating all of our internal state, as our
  // parent activity will make use of it.
  this.observer_.onPropertiesChanged();
};
Lap.prototype.shiftDistances = function(delta) {
  if (delta === 0) {
    return;
  }
  console.log('Lap.shiftDistances(): Shifting by ' + delta + 'm');
  for (var i = 0; i < this.tracks_.length; i++) {
    this.tracks_[i].shiftDistances(delta);
  }
};
Lap.prototype.toXml = function() {
  var node = document.createElementNS(null, 'Lap');
  node.setAttribute('StartTime', this.startTime_);
  node.appendChild(createTextElement('TotalTimeSeconds', this.totalTimeSeconds_));
  node.appendChild(createTextElement('DistanceMeters', this.length_));
  node.appendChild(createTextElement('MaximumSpeed', this.maximumSpeed_));
  node.appendChild(createTextElement('Calories', this.calories_));
  for (var i = 0; i < this.tracks_.length; i++) {
    node.appendChild(this.tracks_[i].toXml());
  }
  return node;
};
