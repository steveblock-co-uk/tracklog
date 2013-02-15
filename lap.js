Lap = function(parentActivity, node) {
  this.parentActivity_ = parentActivity;
  // Metadata
  this.startTime_ = node.getAttribute('StartTime');
  this.totalTimeSeconds_ = Number(node.getElementsByTagName('TotalTimeSeconds')[0].textContent).valueOf();
  // We call this length to avoid confusion with Trackpoint.distanceMeters_.
  this.length_ = Number(node.getElementsByTagName('DistanceMeters')[0].textContent).valueOf();
  this.maximumSpeed_ = Number(node.getElementsByTagName('MaximumSpeed')[0].textContent).valueOf();
  this.calories_ = Number(node.getElementsByTagName('Calories')[0].textContent).valueOf();
  this.tracks_ = [];
  for (var i = 0; i < node.childNodes.length; i++) {
    if (node.childNodes[i].tagName === 'Track') {
      this.tracks_.push(new Track(node.childNodes[i]));
    }
  }
  this.checkConsistency();
  this.dom_ = createDiv('');
};
Lap.prototype.checkConsistency = function() {
  // May have no tracks, but only first and last tracks may be time-only.
  for (var i = 1; i < this.tracks_.length - 1; ++i) {
    if (this.tracks_[i].isTimeOnly()) {
      throw new Error('Only first and last tracks may be time-only');
    }
  }
};
Lap.prototype.firstTrack = function() {
  if (this.tracks_.length === 0) {
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
  if (this.tracks_.length === 0) {
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
Lap.prototype.rebuildDom = function() {
  this.dom_.innerHTML = '';
  var table = document.createElement('table');
  table.appendChild(createTableRow('Start time', [this.startTime_]));
  table.appendChild(createTableRow('Total time / summed (HH:MM:SS)', [
    toHourMinSec(this.totalTimeSeconds_),
    toHourMinSec(this.summedTime()),
  ]));
  table.appendChild(createTableRow('Length / summed (km)', [
    this.length_ / 1000,
    this.summedLength() / 1000,
  ]));
  table.appendChild(createTableRow('Maximum speed (m/s)', [this.maximumSpeed_]));
  table.appendChild(createTableRow('Calories', [this.calories_]));
  table.appendChild(createTableRow(
      'Num tracks / time-only',
      [this.tracks_.length, this.numTimeOnlyTracks()]));
  this.dom_.appendChild(table);
  for (var i = 0; i < this.tracks_.length; i++) {
    // Track
    var div = createDiv('track wide');
    div.appendChild(createTextSpan('Track ' + (i + 1) +' of ' + this.tracks_.length +
        (this.tracks_[i].isTimeOnly() ? ' (time-only)' : '')));
    div.appendChild(createButton(
        'Remove',
        (function(me, j) { return function() { me.removeTrack(j); }; })(this, i)));
    this.tracks_[i].rebuildDom();
    div.appendChild(this.tracks_[i].dom_);
    this.dom_.appendChild(div);

    // Deltas to next track
    if (i === this.tracks_.length - 1) {
      continue;
    }
    var start = this.tracks_[i];
    var end = this.tracks_[i + 1];
    var collapser = createDiv('track wide collapser');
    // No need to be able to collapse tracks, as viewer ignores them anyway.
    var table = document.createElement('table');
    table.appendChild(createTableRow('Time difference (HH:MM:SS)', [toHourMinSec(end.timeFrom(start))]));
    // TODO: Provide distance deltas which skip over time-only tracks.
    if (!start.isTimeOnly() && !end.isTimeOnly()) {
      table.appendChild(createTableRow('Distance difference (m)', [end.distanceFrom(start)]));
      table.appendChild(createTableRow('Displacement (m)', [end.displacementFrom(start)]));
    }
    collapser.appendChild(table);
    this.dom_.appendChild(collapser);
  }
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

  // We must make this call after updating all of our internal state, as our
  // parent activity will make use of it.
  this.parentActivity_.onChildLapChanged();
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
