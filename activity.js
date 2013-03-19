Activity = function(parentActivities) {
  this.parentActivities_ = parentActivities;
};
Activity.prototype.populate = function(node) {
  // All time and distance metadata is held by Lap.
  this.sport_ = node.getAttribute('Sport');
  this.id_ = node.getElementsByTagName('Id')[0].textContent;
  this.laps_ = [];
  for (var i = 0; i < node.childNodes.length; i++) {
    if (node.childNodes[i].tagName === 'Lap') {
      var lap = new Lap(this);
      lap.populate(node.childNodes[i]);
      this.laps_.push(lap);
    }
  }
  this.dom_ = createDiv('');
};
Activity.prototype.isEmpty = function() {
  return this.laps_.length === 0;
}
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
  console.log('Activity.onChildLapDistanceChanged(): Shifting laps ' +
              (i + 2) + ' and later by ' + delta + 'm');
  for (++i; i < this.laps_.length; ++i) {
    this.laps_[i].shiftDistances(delta);
  }
};
Activity.prototype.onChildLapChanged = function() {
  // This will call rebuildDom() on us.
  this.parentActivities_.onChildActivityChanged();
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
Activity.prototype.rebuildDom = function() {
  this.dom_.innerHTML = '';
  this.dom_.appendChild(createTextSpan('Sport'));
  var select = document.createElement('select');
  var sports = ['Running', 'Biking', 'Other'];
  for (var i in sports) {
    var sport = document.createElement('option');
    sport.textContent = sports[i];
    sport.value = sports[i];
    sport.selected = sports[i] === this.sport_;
    select.appendChild(sport);
  }
  select.onchange = (function(activity) { return function() {
    activity.sport_ = this.value;
  }; })(this);
  this.dom_.appendChild(select);
  this.dom_.appendChild(createTextSpan('Id'));
  var id = document.createElement('input');
  id.value = this.id_;
  id.size = 50;
  id.onchange = (function(activity) { return function() { activity.id_ = this.value; }; })(this);
  this.dom_.appendChild(id);
  var table = document.createElement('table');
  // TODO: Would be good not to need to know details of startTime() and endTime().
  if (!this.isEmpty() && !this.lastLap().isEmpty()) {
    table.appendChild(createTableRow('Start : end : delta time', [
      this.startTime(),
      this.endTime(),
      toHourMinSec(this.deltaTime()),
    ]));
  }
  table.appendChild(createTableRow('Elapsed time (HH:MM:SS)', [toHourMinSec(this.time())]));
  table.appendChild(createTableRow('Length (km)', [this.length() / 1000]));
  table.appendChild(createTableRow(
      'Num laps : time-only',
      [this.laps_.length, this.numTimeOnlyLaps()]));
  this.dom_.appendChild(table);
  for (var i = 0; i < this.laps_.length; i++) {
    // Lap
    var div = createDiv('lap wide');
    div.appendChild(createTextSpan('Lap ' + (i + 1) + ' of ' + this.laps_.length));
    div.appendChild(createButton(
        'Remove',
        (function(me, j) { return function() { me.removeLap(j); }; })(this, i)));
    this.laps_[i].rebuildDom();
    div.appendChild(this.laps_[i].dom_);
    this.dom_.appendChild(div);

    // Deltas between laps
    if (i === this.laps_.length - 1) {
      continue;
    }
    var start = this.laps_[i];
    var end = this.laps_[i + 1];
    var collapser = createDiv('lap wide collapser');
    collapser.appendChild(createButton('Collapse laps ' + (i + 1) + ' and ' + (i + 2), (function(me, j) { return function() { me.collapseLapWithPrevious(j); }; })(this, i + 1)));
    var table = document.createElement('table');
    if (!start.isEmpty() && !end.isEmpty()) {
      table.appendChild(createTableRow('Time difference (HH:MM:SS)', [toHourMinSec(end.timeFrom(start))]));
    }
    // TODO: Provide distance deltas which skip over time-only laps.
    if (!start.isTimeOnly() && !end.isTimeOnly()) {
      table.appendChild(createTableRow('Distance difference (m)', [end.distanceFrom(start)]));
      table.appendChild(createTableRow('Displacement (m)', [end.displacementFrom(start)]));
    }
    collapser.appendChild(table);
    this.dom_.appendChild(collapser);
  }
};
Activity.prototype.removeLap = function(index) {
  console.log('Removing lap ' + (index + 1) + ' of ' + this.laps_.length);
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
  removeIndex(this.laps_, index);
  this.parentActivities_.onChildActivityChanged();
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
  removeIndex(this.laps_, index);
  this.rebuildDom();
  // There's no need to notify our parent, as our meta-data shouldn't have changed.
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
