Activity = function(node) {
  this.sport_ = node.getAttribute('Sport');
  this.id_ = node.getElementsByTagName('Id')[0].textContent;
  this.laps_ = [];
  for (var i = 0; i < node.childNodes.length; i++) {
    if (node.childNodes[i].tagName == 'Lap') {
      // For now, skip laps with no GPS data (ie no tracks)
      // TODO: Consider handling them.
      var lap = new Lap(this, node.childNodes[i]);
      if (lap.tracks_.length > 0) {
        lap.rebuildDom()
        this.laps_.push(lap);
      } else {
        console.log('Skipping empty lap with start time ' + lap.startTime_);
      }
    }
  }
  this.dom_ = createDiv('');
};
Activity.prototype.shiftDistanceOfAllLaterLaps = function(lap, distance) {
  // TODO: Make this neater
  var i = 0;
  for (; i < this.laps_.length; ++i) {
    if (this.laps_[i] == lap) {
      break;
    }
  }
  if (i == this.laps_.length) {
    throw new Error('Failed to find lap!');
  }
  ++i;
  console.log('Activity.shiftDistanceOfAllLaterLaps(): Shifting laps ' +
              (i + 1) + ' and later by ' + distance + 'm');
  for (; i < this.laps_.length; ++i) {
    this.laps_[i].shiftDistances(distance);
  }
}
Activity.prototype.distance = function() {
  var distance = 0;
  for (var i = 0; i < this.laps_.length; ++i) {
    distance += this.laps_[i].distanceMeters_;
  }
  return distance;
}
Activity.prototype.firstLap = function() {
  return this.laps_[0];
}
Activity.prototype.lastLap = function() {
  return this.laps_[this.laps_.length - 1];
}
Activity.prototype.rebuildDom = function() {
  this.dom_.innerHTML = '';
  this.dom_.appendChild(createTextSpan('Sport'));
  var sport = document.createElement('input');
  sport.value = this.sport_;
  sport.onchange = (function(activity) { return function() { activity.sport_ = this.value; }; })(this);
  this.dom_.appendChild(sport);
  this.dom_.appendChild(createTextSpan('Id'));
  var id = document.createElement('input');
  id.value = this.id_;
  id.size = 50;
  id.onchange = (function(activity) { return function() { activity.id_ = this.value; }; })(this);
  this.dom_.appendChild(id);
  for (var i = 0; i < this.laps_.length; i++) {
    // Lap
    var div = createDiv('lap wide');
    div.appendChild(createTextSpan('Lap ' + (i + 1) + ' of ' + this.laps_.length));
    if (this.laps_.length > 1) {
      div.appendChild(createButton(
          'Remove',
          (function(me, j) { return function() { me.removeLap(j); }; })(this, i)));
    }
    this.laps_[i].rebuildDom();
    div.appendChild(this.laps_[i].dom_);
    this.dom_.appendChild(div);
    // Collapser
    if (i == this.laps_.length - 1) {
      continue;
    }
    var start = this.laps_[i];
    var end = this.laps_[i + 1];
    var time = timeDifferenceSeconds(start.lastTrack().lastTrackpoint(),
                                     end.firstTrack().firstTrackpoint());
    var displacement = estimateDisplacementMeters(
        start.lastNonTimeOnlyTrack().lastNonTimeOnlyTrackpoint(),
        end.firstNonTimeOnlyTrack().firstNonTimeOnlyTrackpoint());
    var collapser = createDiv('lap wide collapser');
    collapser.appendChild(createButton('Collapse laps ' + (i + 1) + ' and ' + (i + 2), (function(me, j) { return function() { me.collapseLapWithPrevious(j); }; })(this, i + 1)));
    var table = document.createElement('table');
    table.appendChild(createTableRow('Time difference (HH:MM:SS)', [toHourMinSec(time)]));
    table.appendChild(createTableRow('Approximate displacement (m)', [displacement]));
    collapser.appendChild(table);
    this.dom_.appendChild(collapser);
  }
};
Activity.prototype.removeLap = function(index) {
  console.log('Removing lap ' + index);
  // When removing a lap, we need to shift the distances of all later
  // laps and update the time and distance for the lap.
  var distance = this.laps_[index].distanceMeters_;
  for (var i = index + 1; i < this.laps_.length; i++) {
    console.log('Shifting lap ' + (i + 1) + ' by ' + distance);
    this.laps_[i].shiftDistances(distance);
  }
  removeIndex(this.laps_, index);
  this.rebuildDom();
};
Activity.prototype.collapseLapWithPrevious = function(index) {
  if (index == 0 || index >= this.laps_.length) {
    throw new Error('Can not collapse index ' + index);
  }
  console.log('Collapsing lap ' + (index + 1) + ' with lap ' + index);
  // Remove time-only tracks at the point of collapsing.
  var thisLap = this.laps_[index];
  if (thisLap.firstTrack().isTimeOnly()) {
    thisLap.removeTrack(0);
  }
  var previousLap = this.laps_[index - 1];
  if (previousLap.lastTrack().isTimeOnly()) {
    previousLap.removeTrack(previousLap.tracks_.length - 1);
  }
  // TODO: Add ability to insert distance equal to approx displacement.
  for (var i = 0; i < thisLap.tracks_.length; i++) {
    previousLap.tracks_.push(thisLap.tracks_[i]);
  }
  // Note this will magically fix inconsistencies in the metadata of the
  // merged lap.
  previousLap.updateMetadata();
  // TODO: max speed should be part of updateMetadata.
  previousLap.maximumSpeed_ = Math.max(thisLap.maximumSpeed_, previousLap.maximumSpeed_);
  // Calories can't be calculated from the tracks, so we do it manually here.
  previousLap.calories_ += thisLap.calories_;
  removeIndex(this.laps_, index);
  this.rebuildDom();
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
