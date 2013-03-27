ActivitiesView = function(map) {
  this.tableDom_ = createDiv('activities wide');
  this.tableDom_.innerHTML = 'No activities yet - load some!';
  this.map_ = map;
};
ActivitiesView.prototype.setActivities = function(activities) {
  this.model_ = activities;
};
ActivitiesView.prototype.onPropertiesChanged = function() {
  this.rebuildTableDom_();
  this.positionMap_();
};
ActivitiesView.prototype.createActivityObserver = function() {
  return new ActivityView(this, this.map_);
};
ActivitiesView.prototype.rebuildTableDom_ = function() {
  this.tableDom_.innerHTML = '';
  var table = document.createElement('table');
  // TODO: Consider providing meta data for set of activities.
  table.appendChild(createTableRow(
      'Num activities : time-only',
      [this.model_.activities_.length, this.model_.numTimeOnlyActivities()]));
  this.tableDom_.appendChild(table);

  for (var i = 0; i < this.model_.activities_.length; i++) {
    // Activity
    var div = createDiv('activity wide');
    div.appendChild(createTextSpan('Activity ' + (i + 1) + ' of ' + this.model_.activities_.length));
    // TODO: Handle there being no activities
    if (this.model_.activities_.length > 1) {
      div.appendChild(createButton(
          'Remove',
          (function(activities, j) {
            return function() { activities.removeActivity(j); };
          })(this.model_, i)));
    }
    div.appendChild(this.model_.activities_[i].observer_.rebuildTableDom_());
    div.addEventListener('mouseover', (function(observer) { return function(event) {
      observer.highlightMapLine_(true);
      // We can't use CSS hover selectors because we don't want bubbling.
      this.classList.add('highlight');
      event.stopPropagation();
    }; })(this.model_.activities_[i].observer_));
    div.addEventListener('mouseout', (function(observer) { return function(event) {
      observer.highlightMapLine_(false);
      // We can't use CSS hover selectors because we don't want bubbling.
      this.classList.remove('highlight');
      event.stopPropagation();
    }; })(this.model_.activities_[i].observer_));
    this.tableDom_.appendChild(div);

    // Deltas between activities
    if (i === this.model_.activities_.length - 1) {
      continue;
    }
    var start = this.model_.activities_[i];
    var end = this.model_.activities_[i + 1];
    var collapser = createDiv('activity wide collapser');
    collapser.appendChild(createButton(
        'Collapse activities ' + (i + 1) + ' and ' + (i + 2),
        (function(activities, j) {
          return function() { activities.collapseActivityWithPrevious(j); };
        })(this.model_, i + 1)));
    var table = document.createElement('table');
    // TODO: Provide time deltas which skip over empty laps.
    // TODO: Would be good not to need to know details of Activity.timeFrom().
    if (!start.isEmpty() && !start.lastLap().isEmpty() && !end.isEmpty()) {
      table.appendChild(createTableRow('Time difference (HH:MM:SS)', [toHourMinSec(end.timeFrom(start))]));
    }
    // TODO: Provide distance deltas which skip over time-only laps.
    if (!start.isTimeOnly() && !end.isTimeOnly()) {
      table.appendChild(createTableRow('Displacement (m)', [end.displacementFrom(start)]));
    }
    collapser.appendChild(table);
    this.tableDom_.appendChild(collapser);
  }
};
ActivitiesView.prototype.getTableDom = function() {
  return this.tableDom_;
};
ActivitiesView.prototype.positionMap_ = function() {
  if (this.map_ === null || this.model_.isTimeOnly()) {
    return;
  }
  // Latitude can wrap, so we handle it differently from longitude.
  var latitudeRanges = [];
  var longitudeRanges = [];
  this.model_.getPositionRanges().forEach(function(x) {
    latitudeRanges.push(x.latitude);
    longitudeRanges.push(x.longitude);
  });
  var range = {minimum: -180, maximum: 180};
  var latitudeRange = getMinimumRangeOfRanges(latitudeRanges, range);
  var longitudeRange = collapseRangeOfRanges(longitudeRanges, range);
  this.map_.fitBounds(new google.maps.LatLngBounds(
      new google.maps.LatLng(latitudeRange.start, longitudeRange.start),
      new google.maps.LatLng(latitudeRange.end, longitudeRange.end)));
};

ActivityView = function(parent, map) {
  this.parent_ = parent;
  this.tableDom_ = createDiv('');
  this.map_ = map;
};
ActivityView.prototype.setActivity = function(activity) {
  this.model_ = activity;
};
ActivityView.prototype.onPropertiesChanged = function(externallyVisible) {
  if (externallyVisible) {
    this.parent_.onPropertiesChanged();
  } else {
    this.rebuildTableDom_();
  }
};
ActivityView.prototype.onRemoved = function() {
  this.clearMapLine_();
};
ActivityView.prototype.createLapObserver = function() {
  return new LapView(this, this.map_);
};
ActivityView.prototype.rebuildTableDom_ = function() {
  this.tableDom_.innerHTML = '';
  this.tableDom_.appendChild(createTextSpan('Sport'));
  var select = document.createElement('select');
  var sports = ['Running', 'Biking', 'Other'];
  for (var i in sports) {
    var sport = document.createElement('option');
    sport.textContent = sports[i];
    sport.value = sports[i];
    sport.selected = sports[i] === this.model_.sport_;
    select.appendChild(sport);
  }
  select.onchange = (function(activity) { return function() {
    activity.sport_ = this.value;
  }; })(this.model_);
  this.tableDom_.appendChild(select);
  this.tableDom_.appendChild(createTextSpan('Id'));
  var id = document.createElement('input');
  id.value = this.model_.id_;
  id.size = 50;
  id.onchange = (function(activity) {
    return function() { activity.id_ = this.value;
  }; })(this.model_);
  this.tableDom_.appendChild(id);
  var table = document.createElement('table');
  // TODO: Would be good not to need to know details of startTime() and endTime().
  if (!this.model_.isEmpty() && !this.model_.lastLap().isEmpty()) {
    table.appendChild(createTableRow('Start : end : delta time', [
      this.model_.startTime(),
      this.model_.endTime(),
      toHourMinSec(this.model_.deltaTime()),
    ]));
  }
  table.appendChild(createTableRow('Elapsed time (HH:MM:SS)', [toHourMinSec(this.model_.time())]));
  table.appendChild(createTableRow('Length (km)', [this.model_.length() / 1000]));
  table.appendChild(createTableRow(
      'Num laps : time-only',
      [this.model_.laps_.length, this.model_.numTimeOnlyLaps()]));
  this.tableDom_.appendChild(table);
  for (var i = 0; i < this.model_.laps_.length; i++) {
    // Lap
    var div = createDiv('lap wide');
    div.appendChild(createTextSpan('Lap ' + (i + 1) + ' of ' + this.model_.laps_.length));
    div.appendChild(createButton(
        'Remove',
        (function(activity, j) {
          return function() { activity.removeLap(j); };
        })(this.model_, i)));
    div.appendChild(this.model_.laps_[i].observer_.rebuildTableDom_());
    div.addEventListener('mouseover', (function(observer) { return function() {
      observer.highlightMapLine_(true);
      // We can't use CSS hover selectors because we don't want bubbling.
      this.classList.add('highlight');
      event.stopPropagation();
    }; })(this.model_.laps_[i].observer_));
    div.addEventListener('mouseout', (function(observer) { return function() {
      observer.highlightMapLine_(false);
      // We can't use CSS hover selectors because we don't want bubbling.
      this.classList.remove('highlight');
      event.stopPropagation();
    }; })(this.model_.laps_[i].observer_));
    this.tableDom_.appendChild(div);

    // Deltas between laps
    if (i === this.model_.laps_.length - 1) {
      continue;
    }
    var start = this.model_.laps_[i];
    var end = this.model_.laps_[i + 1];
    var collapser = createDiv('lap wide collapser');
    collapser.appendChild(createButton(
        'Collapse laps ' + (i + 1) + ' and ' + (i + 2),
        (function(activity, j) {
          return function() { activity.collapseLapWithPrevious(j); };
        })(this.model_, i + 1)));
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
    this.tableDom_.appendChild(collapser);
  }
  return this.tableDom_;
};
ActivityView.prototype.clearMapLine_ = function() {
  for (var i = 0; i < this.model_.laps_.length; i++) {
    this.model_.laps_[i].observer_.clearMapLine_();
  }
};
ActivityView.prototype.highlightMapLine_ = function(highlight) {
  for (var i = 0; i < this.model_.laps_.length; i++) {
    this.model_.laps_[i].observer_.highlightMapLine_(highlight);
  }
};

LapView = function(parent, map) {
  this.parent_ = parent;
  this.map_ = map;
  this.tableDom_ = createDiv('');
};
LapView.prototype.setLap = function(lap) {
  this.model_ = lap;
};
LapView.prototype.onPropertiesChanged = function() {
  this.parent_.onPropertiesChanged();
};
LapView.prototype.onRemoved = function() {
  this.clearMapLine_();
};
LapView.prototype.createTrackObserver = function() {
  return new TrackView(this.map_);
};
LapView.prototype.rebuildTableDom_ = function() {
  this.tableDom_.innerHTML = '';
  var table = document.createElement('table');
  if (!this.model_.isEmpty()) {
    table.appendChild(createTableRow('Start : end : delta time', [
      this.model_.startTime_,
      this.model_.endTime(),
      toHourMinSec(this.model_.deltaTime()),
    ]));
  }
  table.appendChild(createTableRow('Elapsed time : summed (HH:MM:SS)', [
    toHourMinSec(this.model_.totalTimeSeconds_),
    toHourMinSec(this.model_.summedTime()),
  ]));
  if (!this.model_.isTimeOnly()) {
    table.appendChild(createTableRow('Start : end : delta distance (km)', [
      this.model_.startDistance() / 1000,
      this.model_.endDistance() / 1000,
      (this.model_.endDistance() - this.model_.startDistance()) / 1000,
    ]));
  }
  table.appendChild(createTableRow('Length : summed (km)', [
    this.model_.length_ / 1000,
    this.model_.summedLength() / 1000,
  ]));
  table.appendChild(createTableRow('Maximum speed (m/s)', [this.model_.maximumSpeed_]));
  table.appendChild(createTableRow('Calories', [this.model_.calories_]));
  table.appendChild(createTableRow(
      'Num tracks : time-only',
      [this.model_.tracks_.length, this.model_.numTimeOnlyTracks()]));
  this.tableDom_.appendChild(table);
  for (var i = 0; i < this.model_.tracks_.length; i++) {
    // Track
    var div = createDiv('track wide');
    div.appendChild(createTextSpan('Track ' + (i + 1) +' of ' + this.model_.tracks_.length +
        (this.model_.tracks_[i].isTimeOnly() ? ' (time-only)' : '')));
    div.appendChild(createButton(
        'Remove',
        (function(lap, j) {
          return function() { lap.removeTrack(j); };
        })(this.model_, i)));
    div.appendChild(this.model_.tracks_[i].observer_.rebuildTableDom());
    div.addEventListener('mouseover', (function(observer) { return function(event) {
      observer.highlightMapLine_(true);
      // We can't use CSS hover selectors because we don't want bubbling.
      this.classList.add('highlight');
      event.stopPropagation();
    }; })(this.model_.tracks_[i].observer_));
    div.addEventListener('mouseout', (function(observer) { return function(event) {
      observer.highlightMapLine_(false);
      // We can't use CSS hover selectors because we don't want bubbling.
      this.classList.remove('highlight');
      event.stopPropagation();
    }; })(this.model_.tracks_[i].observer_));
    this.tableDom_.appendChild(div);

    // Deltas to next track
    if (i === this.model_.tracks_.length - 1) {
      continue;
    }
    var start = this.model_.tracks_[i];
    var end = this.model_.tracks_[i + 1];
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
    this.tableDom_.appendChild(collapser);
  }
  return this.tableDom_;
};
LapView.prototype.clearMapLine_ = function() {
  for (var i = 0; i < this.model_.tracks_.length; i++) {
    this.model_.tracks_[i].observer_.clearMapLine_();
  }
};
LapView.prototype.highlightMapLine_ = function(highlight) {
  for (var i = 0; i < this.model_.tracks_.length; i++) {
    this.model_.tracks_[i].observer_.highlightMapLine_(highlight);
  }
};

TrackView = function(map) {
  // We need to cache the polyline, rather than just the path, so we can unset
  // the map property to remove it from the map.
  this.polyline_ = null;
  if (map !== null) {
    this.polyline_ = new google.maps.Polyline({
      map: map,
      clickable: false,
    });
    this.highlightMapLine_(false);
  }
};
TrackView.prototype.setTrack = function(track) {
  this.model_ = track;
};
TrackView.prototype.onRouteChanged = function() {
  this.updateMapLine_();
};
TrackView.prototype.onRemoved = function() {
  this.clearMapLine_();
};
TrackView.prototype.rebuildTableDom = function() {
  // The table DOM can be a local here, as it's never updated, always replaced.
  var tableDom = document.createElement('table');
  tableDom.innerHTML = '';
  tableDom.appendChild(createTableRow(
      'Num trackpoints : time-only',
      [this.model_.trackpoints_.length, this.model_.numTimeOnlyTrackpoints()]));
  tableDom.appendChild(createTableRow(
      'Start : end : elapsed time',
      [
        this.model_.firstTrackpoint().timestamp_,
        this.model_.lastTrackpoint().timestamp_,
        toHourMinSec(this.model_.time()),
      ]));
  if (this.model_.isTimeOnly()) {
    tableDom.appendChild(createTableRow('No position data', []));
    return tableDom;
  }
  var first = this.model_.firstNonTimeOnlyTrackpoint();
  var last = this.model_.lastNonTimeOnlyTrackpoint();
  tableDom.appendChild(createTableRow(
      'Start : end : delta distance (km)',
      [
        first.distanceMeters_ / 1000,
        last.distanceMeters_ / 1000,
        this.model_.length() / 1000,
      ]));
  tableDom.appendChild(createTableRow(
      'Start : end altitude (m)',
      [first.altitudeMeters_, last.altitudeMeters_]));
  tableDom.appendChild(createTableRow(
      'Start : end latitude (deg)',
      [first.latitudeDegrees_, last.latitudeDegrees_]));
  tableDom.appendChild(createTableRow(
      'Start : end longitude (deg)',
      [first.longitudeDegrees_, last.longitudeDegrees_]));
  return tableDom;
};
TrackView.prototype.updateMapLine_ = function() {
  if (this.polyline_ === null) {
    return;
  }
  // TODO: Modify the path, rather than resetting it?
  var path = [];
  for (var i = 0; i < this.model_.trackpoints_.length; i++) {
    var trackpoint = this.model_.trackpoints_[i];
    if (!trackpoint.isTimeOnly_) {
      path.push(new google.maps.LatLng(
          trackpoint.latitudeDegrees_, trackpoint.longitudeDegrees_));
    }
  }
  this.polyline_.setPath(path);
};
TrackView.prototype.clearMapLine_ = function() {
  this.polyline_.setMap(null);
};
TrackView.prototype.highlightMapLine_ = function(highlight) {
  if (this.polyline_ !== null) {
    this.polyline_.setOptions({strokeWeight: highlight ? 5 : 2});
  }
};
