Track = function(node) {
  this.trackpoints_ = [];
  // No metadata and all children are type Trackpoint.
  var trackpoints = node.getElementsByTagName('Trackpoint');
  for (var i = 0; i < trackpoints.length; i++) {
    this.trackpoints_.push(new Trackpoint(trackpoints[i]));
  }
  this.checkConsistency();
  this.dom_ = document.createElement('table');
};
Track.prototype.checkConsistency = function() {
  // Tracks must not be emtpy.
  if (this.trackpoints_.length === 0) {
    throw new Error('Track must contain trackpoints');
  }
  // Tracks may have at most one time-only trackpoint at each end.
  for (var i = 1; i < this.trackpoints_.length - 1; ++i) {
    if (this.trackpoints_[i].isTimeOnly_) {
      throw new Error('Only first and last trackpoints may be time-only');
    }
  }
  // The previous code suggested the following rules.
  // TODO: Check this.
/*
  // Time-only tracks may have at most two trackpoints.
  if (this.isTimeOnly() && this.trackpoints_.length > 2) {
    throw new Error('Time-only tracks may have at most two trackpoints');
  }
  // Time-only trackpoints may appear only at the ends, but there may be any
  // number of them.
  var transitions = 0;
  for (var i = 0; i < this.trackpoints_.length; ++i) {
    if (transitions === 0 && !this.trackpoints_[i].isTimeOnly_) {
      transitions = 1;
    } else if (transitions === 1 && this.trackpoints_[i].isTimeOnly_) {
      transitions = 2;
    } else if (transitions === 2 && !this.trackpoints_[i].isTimeOnly_) {
      throw new Error('Time-only trackpoints may appear only at ends');
    }
  }
*/
};
Track.prototype.firstTrackpoint = function() {
  return this.trackpoints_[0];
};
// This could return null.
Track.prototype.firstNonTimeOnlyTrackpoint = function() {
  for (var i = 0; i < this.trackpoints_.length; ++i) {
    if (!this.trackpoints_[i].isTimeOnly_) {
      return this.trackpoints_[i];
    }
  }
  return null;
};
Track.prototype.lastTrackpoint = function() {
  return this.trackpoints_[this.trackpoints_.length - 1];
};
// This could return null.
Track.prototype.lastNonTimeOnlyTrackpoint = function() {
  for (var i = this.trackpoints_.length - 1; i >= 0; --i) {
    if (!this.trackpoints_[i].isTimeOnly_) {
      return this.trackpoints_[i];
    }
  }
  return null;
};
Track.prototype.isTimeOnly = function() {
  return this.firstNonTimeOnlyTrackpoint() === null;
};
Track.prototype.numTimeOnlyTrackpoints = function() {
  var count = 0;
  for (var i = 0; i < this.trackpoints_.length; ++i) {
    if (this.trackpoints_[i].isTimeOnly_) {
      ++count;
    } 
  }
  return count;
};
Track.prototype.rebuildDom = function() {
  this.dom_.innerHTML = '';
  this.dom_.appendChild(createTableRow(
      'Num trackpoints : time-only',
      [this.trackpoints_.length, this.numTimeOnlyTrackpoints()]));
  this.dom_.appendChild(createTableRow(
      'Start : end : elapsed time',
      [
        this.firstTrackpoint().timestamp_,
        this.lastTrackpoint().timestamp_,
        toHourMinSec(this.time()),
      ]));
  if (this.isTimeOnly()) {
    this.dom_.appendChild(createTableRow('No position data', []));
    return;
  }
  var first = this.firstNonTimeOnlyTrackpoint();
  var last = this.lastNonTimeOnlyTrackpoint();
  this.dom_.appendChild(createTableRow(
      'Start : end : delta distance (km)',
      [
        first.distanceMeters_ / 1000,
        last.distanceMeters_ / 1000,
        this.length() / 1000,
      ]));
  this.dom_.appendChild(createTableRow(
      'Start : end altitude (m)',
      [first.altitudeMeters_, last.altitudeMeters_]));
  this.dom_.appendChild(createTableRow(
      'Start : end latitude (deg)',
      [first.latitudeDegrees_, last.latitudeDegrees_]));
  this.dom_.appendChild(createTableRow(
      'Start : end longitude (deg)',
      [first.longitudeDegrees_, last.longitudeDegrees_]));
};
Track.prototype.shiftDistances = function(delta) {
  if (delta === 0) {
    return;
  }
  for (var i = 0; i < this.trackpoints_.length; i++) {
    var trackpoint = this.trackpoints_[i];
    if (!trackpoint.isTimeOnly_) {
      trackpoint.distanceMeters_ += delta;
    }
  }
};
Track.prototype.length = function() {
  if (this.isTimeOnly()) {
    throw new Error('Can\'t get length of time-only track');
  }
  return this.lastNonTimeOnlyTrackpoint().distanceFrom(
      this.firstNonTimeOnlyTrackpoint());
};
Track.prototype.time = function() {
  return this.lastTrackpoint().timeFrom(this.firstTrackpoint());
};
Track.prototype.distanceFrom = function(other) {
  if (this.isTimeOnly() || other.isTimeOnly()) {
    throw new Error('Can\'t get distance from time-only tracks');
  }
  return this.firstNonTimeOnlyTrackpoint().distanceFrom(
    other.lastNonTimeOnlyTrackpoint());
};
Track.prototype.timeFrom = function(other) {
  return this.firstTrackpoint().timeFrom(other.lastTrackpoint());
};
Track.prototype.displacementFrom = function(other) {
  if (this.isTimeOnly() || other.isTimeOnly()) {
    throw new Error('Can\'t get displacement from time-only tracks');
  }
  return this.firstNonTimeOnlyTrackpoint().displacementFrom(
      other.lastNonTimeOnlyTrackpoint());
};
Track.prototype.toXml = function() {
  var node = document.createElementNS(null, 'Track');
  for (var i = 0; i < this.trackpoints_.length; i++) {
    node.appendChild(this.trackpoints_[i].toXml());
  }
  return node;
};

Trackpoint = function(node) {
  // We call this timestamp to avoid confusion with Lap.totalTimeSeconds_.
  this.timestamp_ = node.getElementsByTagName('Time')[0].textContent;
  if (node.getElementsByTagName('Position').length === 0) {
    this.isTimeOnly_ = true;
    return;
  }
  this.isTimeOnly_ = false;
  var position = node.getElementsByTagName('Position')[0];
  this.latitudeDegrees_ =
      toNumber(position.getElementsByTagName('LatitudeDegrees')[0]);
  this.longitudeDegrees_ =
      toNumber(position.getElementsByTagName('LongitudeDegrees')[0]);
  this.altitudeMeters_ =
      toNumber(node.getElementsByTagName('AltitudeMeters')[0]);
  this.distanceMeters_ =
      toNumber(node.getElementsByTagName('DistanceMeters')[0]);
};
Trackpoint.prototype.distanceFrom = function(other) {
  if (this.isTimeOnly_ || other.isTimeOnly_) {
    throw new Error('Can\'t get distance from time-only trackpoints');
  }
  return this.distanceMeters_ - other.distanceMeters_;
};
Trackpoint.prototype.timeFrom = function(other) {
  return (new Date(this.timestamp_) - new Date(other.timestamp_)) / 1000;
};
// Estimates the displacement based on the lat/lng, not the distanceMeters_ field.
Trackpoint.prototype.displacementFrom = function(other) {
  if (this.isTimeOnly_ || other.isTimeOnly_) {
    throw new Error('Can\'t get displacement from time-only trackpoints');
  }
  var deltaLatitude = (this.latitudeDegrees_ - other.latitudeDegrees_);
  var scaleFactor = Math.sin((this.latitudeDegrees_ + other.latitudeDegrees_) / 2 * Math.PI / 180);
  var deltaLongitude = (this.longitudeDegrees_ - other.longitudeDegrees_) * scaleFactor;
  return Math.pow(Math.pow(deltaLatitude, 2) + Math.pow(deltaLongitude, 2), 0.5) * 60 * 1852;
};
Trackpoint.prototype.toXml = function() {
  var node = document.createElementNS(null, 'Trackpoint');
  node.appendChild(createTextElement('Time', this.timestamp_));
  if (!this.isTimeOnly_) {
    var position = document.createElementNS(null, 'Position');
    position.appendChild(createTextElement('LatitudeDegrees', this.latitudeDegrees_));
    position.appendChild(createTextElement('LongitudeDegrees', this.longitudeDegrees_));
    node.appendChild(position);
    node.appendChild(createTextElement('AltitudeMeters', this.altitudeMeters_));
    node.appendChild(createTextElement('DistanceMeters', this.distanceMeters_));
  }
  return node;
};
