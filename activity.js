Activity = function(observer) {
  this.observer_ = observer;
  this.observer_.setActivity(this);
};
Activity.prototype.populate = function(node) {
  // All time and distance metadata is held by Lap.
  this.sport_ = node.getAttribute('Sport');
  this.id_ = node.getElementsByTagName('Id')[0].textContent;
  this.laps_ = [];
  for (var i = 0; i < node.childNodes.length; i++) {
    if (node.childNodes[i].tagName === 'Lap') {
      var lap = new Lap(this, this.observer_.createLapObserver());
      lap.populate(node.childNodes[i]);
      this.laps_.push(lap);
    }
  }
};
Activity.prototype.isEmpty = function() {
  return this.laps_.length === 0;
};
// This can't be a general observer method becuase the shift distance is a
// specific property.
Activity.prototype.onChildLapDistanceChanged = function(lap, delta) {
  // Shift all later laps by distance delta. Note that this activity's length
  // is calculated lazily.
  var i = 0;
  for (; i < this.laps_.length; ++i) {
    if (this.laps_[i] === lap) {
      break;
    }
  }
  if (i === this.laps_.length) {
    throw new Error('Failed to find lap!');
  }
  if (i < this.laps_.length - 1) {
    console.log('Activity.onChildLapDistanceChanged(): Shifting laps ' +
        (i + 2) + ' and later by ' + delta + 'm');
  }
  for (++i; i < this.laps_.length; ++i) {
    this.laps_[i].shiftDistances(delta);
  }
};
Activity.prototype.time = function() {
  // We use the laps' recorded times, not their summed times.
  var time = 0;
  for (var i = 0; i < this.laps_.length; ++i) {
    time += this.laps_[i].totalTimeSeconds_;
  }
  return time;
};
Activity.prototype.length = function() {
  // We use the laps' recorded lengths, not their summed lengths.
  var length = 0;
  for (var i = 0; i < this.laps_.length; ++i) {
    length += this.laps_[i].length_;
  }
  return length;
};
Activity.prototype.firstLap = function() {
  if (this.isEmpty()) {
    throw new Error('Can\'t get first lap of empty activity');
  }
  return this.laps_[0];
};
// This may return null.
Activity.prototype.firstNonTimeOnlyLap = function() {
  for (var i = 0; i < this.laps_.length; ++i) {
    if (!this.laps_[i].isTimeOnly()) {
      return this.laps_[i];
    }
  }
  return null;
};
Activity.prototype.lastLap = function() {
  if (this.isEmpty()) {
    throw new Error('Can\'t get last lap of empty activity');
  }
  return this.laps_[this.laps_.length - 1];
};
Activity.prototype.lastNonTimeOnlyLap = function() {
  for (var i = this.laps_.length - 1; i >= 0; --i) {
    if (!this.laps_[i].isTimeOnly()) {
      return this.laps_[i];
    }
  }
  return null;
};
Activity.prototype.isTimeOnly = function() {
  return this.firstNonTimeOnlyLap() === null;
};
Activity.prototype.numTimeOnlyLaps = function() {
  var count = 0;
  for (var i = 0; i < this.laps_.length; ++i) {
    if (this.laps_[i].isTimeOnly()) {
      ++count;
    }
  }
  return count;
};
Activity.prototype.timeFrom = function(other) {
  return this.firstLap().timeFrom(other.lastLap());
};
Activity.prototype.displacementFrom = function(other) {
  if (this.isTimeOnly() || other.isTimeOnly()) {
    throw new Error('Can\'t get displacement from time-only activities');
  }
  return this.firstNonTimeOnlyLap().displacementFrom(other.lastNonTimeOnlyLap());
};
Activity.prototype.startTime = function() {
  if (this.isEmpty()) {
    throw new Error('Can\'t get start time of empty activity');
  }
  return this.firstLap().startTime_;
};
Activity.prototype.endTime = function() {
  if (this.isEmpty()) {
    throw new Error('Can\'t get end time of empty activity');
  }
  return this.lastLap().endTime();
};
Activity.prototype.deltaTime = function() {
  return (new Date(this.endTime()) - new Date(this.startTime())) / 1000;
};
Activity.prototype.removeLap = function(index) {
  console.log('Removing lap ' + (index + 1) + ' of ' + this.laps_.length);
  this.laps_[index].observer_.onRemoved();
  // When removing a lap, we need to shift the distances of all later
  // laps. Note that the length of this activity is calculated lazily. Note
  // also that we don't need to update later activities, as they use an
  // independent distance scale.
  // TODO: Consider shifting the time of all updated laps.
  var delta = -this.laps_[index].length_;
  for (var i = index + 1; i < this.laps_.length; i++) {
    console.log('Shifting lap ' + (i + 1) + ' by ' + delta + 'm');
    this.laps_[i].shiftDistances(delta);
  }
  this.laps_.splice(index, 1);
  this.observer_.onPropertiesChanged(true);
};
Activity.prototype.collapseLapWithPrevious = function(index) {
  if (index === 0 || index >= this.laps_.length) {
    throw new Error('Can not collapse index ' + index);
  }
  // Note that the length of this activity is calculated lazily.
  console.log('Collapsing lap ' + (index + 1) + ' with lap ' + index);
  // Remove time-only tracks at the point of collapsing, provided other tracks
  // exist. There will be at most one at either end.
  // TODO: Do we want to do this? If not, we need to update Lap.checkConsistency().
  var thisLap = this.laps_[index];
  if (thisLap.tracks_.length > 1 && thisLap.firstTrack().isTimeOnly()) {
    thisLap.removeTrack(0);
  }
  var previousLap = this.laps_[index - 1];
  if (previousLap.tracks_.length > 1 && previousLap.lastTrack().isTimeOnly()) {
    previousLap.removeTrack(previousLap.tracks_.length - 1);
  }
  previousLap.totalTimeSeconds_ += thisLap.totalTimeSeconds_;
  previousLap.length_ += thisLap.length_;
  previousLap.maximumSpeed_ = Math.max(thisLap.maximumSpeed_, previousLap.maximumSpeed_);
  previousLap.calories_ += thisLap.calories_;
  // TODO: Add ability to insert delta equal to approx displacement.
  for (var i = 0; i < thisLap.tracks_.length; i++) {
    previousLap.tracks_.push(thisLap.tracks_[i]);
  }
  this.laps_.splice(index, 1);
  // We don't need a full update as our meta-data hasn't changed.
  this.observer_.onPropertiesChanged(false);
};
Activity.prototype.toXml = function() {
  var node = document.createElementNS(null, 'Activity');
  node.setAttribute('Sport', this.sport_);
  node.appendChild(createTextElement('Id', this.id_));
  for (var i = 0; i < this.laps_.length; i++) {
    node.appendChild(this.laps_[i].toXml());
  }
  return node;
};
Activity.prototype.getPositionRanges = function() {
  if (this.isTimeOnly()) {
    throw new Error('Can\'t get position ranges from time-only activity');
  }
  var ranges = [];
  this.laps_.forEach(function(lap) {
    if (!lap.isTimeOnly()) {
      ranges = ranges.concat(lap.getPositionRanges());
    }
  });
  return ranges;
};
