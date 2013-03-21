Activities = function() {
  this.activities_ = [];
  this.dom_ = createDiv('activities wide');
  this.dom_.innerHTML = 'No activities yet - load some!';
};
Activities.prototype.addFromXml = function(node) {
  // Children may be Activity or MultiSportSession. For the latter, we
  // just pull out the Activity objects.
  // TODO: Introduce concept of MultiSportSession?
  for (var i = 0; i < node.childNodes.length; i++) {
    var child = node.childNodes[i];
    if (child.tagName === 'Activity') {
      this.activities_.push(new Activity(this, child));
    } else if (child.tagName === 'MultiSportSession') {
      for (var j = 0; j < child.childNodes.length; j++) {
        var grandChild = child.childNodes[j];
        if (grandChild.tagName === 'FirstSport' || grandChild.tagName === 'NextSport') {
          // There should only be a single child, of type Activity.
          var greatGrandChild = grandChild.childNodes[0];
          if (greatGrandChild.tagName != 'Activity') {
            throw new Error('Unexpected tag \'' + greatGrandChild.tagName + '\' in \'' + grandChild.tagName + '\'');
          }
          this.activities_.push(new Activity(this, greatGrandChild));
        }
      }
    } else if (child.nodeName !== "#text") {
      throw new Error('Unexpected tag \'' + child.tagName + '\' in \'Activities\'');
    }
  }
  // This builds the entire DOM tree.
  this.rebuildDom();
};
Activities.prototype.numTimeOnlyActivities = function() {
  var count = 0;
  for (var i = 0; i < this.activities_.length; ++i) {
    if (this.activities_[i].isTimeOnly()) {
      ++count;
    }
  }
  return count;
};
Activities.prototype.rebuildDom = function() {
  this.dom_.innerHTML = '';
  var table = document.createElement('table');
  // TODO: Consider providing meta data for set of activities.
  table.appendChild(createTableRow(
      'Num activities : time-only',
      [this.activities_.length, this.numTimeOnlyActivities()]));
  this.dom_.appendChild(table);

  for (var i = 0; i < this.activities_.length; i++) {
    // Activity
    var div = createDiv('activity wide');
    div.appendChild(createTextSpan('Activity ' + (i + 1) + ' of ' + this.activities_.length));
    // TODO: Handle there being no activities
    if (this.activities_.length > 1) {
      div.appendChild(createButton(
          'Remove',
          (function(me, j) { return function() { me.removeActivity(j); }; })(this, i)));
    }
    this.activities_[i].rebuildDom();
    div.appendChild(this.activities_[i].dom_);
    this.dom_.appendChild(div);

    // Deltas between activities
    if (i === this.activities_.length - 1) {
      continue;
    }
    var start = this.activities_[i];
    var end = this.activities_[i + 1];
    var collapser = createDiv('activity wide collapser');
    collapser.appendChild(createButton('Collapse activities ' + (i + 1) + ' and ' + (i + 2), (function(me, j) { return function() { me.collapseActivityWithPrevious(j); }; })(this, i + 1)));
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
    this.dom_.appendChild(collapser);
  }
};
Activities.prototype.removeActivity = function(index) {
  // Removing an activitiy is easy, because the activity has no metadata.
  // The laps from this activity therefore remain independent of the laps
  // from the previous activity and no modification is required.
  console.log('Removing activity ' + (index + 1) + ' of ' + this.activities_.length);
  removeIndex(this.activities_, index);
  this.rebuildDom();
};
Activities.prototype.collapseActivityWithPrevious = function(index) {
  if (index === 0 || index >= this.activities_.length) {
    throw new Error('Can not collapse index ' + index);
  }
  console.log('Collapsing activity ' + (index + 1) + ' with activity ' + index);
  var thisActivity = this.activities_[index];
  var previousActivity = this.activities_[index - 1];
  // Need to cache this before we start adding laps.
  var distance = previousActivity.length();
  for (var i = 0; i < thisActivity.laps_.length; i++) {
    var lap = thisActivity.laps_[i];
    // Update distances for each added lap.
    // TODO: Add ability to insert distance equal to approx displacement.
    lap.shiftDistances(distance);
    previousActivity.laps_.push(lap);
  }
  removeIndex(this.activities_, index);
  this.rebuildDom();
};
Activities.prototype.onChildActivityChanged = function() {
  this.rebuildDom();
};
Activities.prototype.toXml = function() {
  var node = document.createElementNS(null, 'Activities');
  for (var i = 0; i < this.activities_.length; i++) {
    node.appendChild(this.activities_[i].toXml());
  }
  return node;
};
