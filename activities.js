Activities = function(node) {
  this.activities_ = [];
  this.dom_ = createDiv('activities wide');
  this.dom_.innerHTML = 'No activities yet - load some!';
};
// This is only reqquired because we currently allow empty laps
// TODO: Remove this.
Activities.prototype.maybeAddActivity_ = function(node) {
  var activity = new Activity(node);
  if (activity.laps_.length > 0) {
    this.activities_.push(activity);
  } else {
    console.log('Skipping empty activity at start time ' + activity.startTime_);
  }
};
Activities.prototype.addFromXml = function(node) {
  // Children may be Activity or MultiSportSession. For the latter, we
  // just pull out the Activity objects.
  // TODO: Introduce concept of MultiSportSession?
  for (var i = 0; i < node.childNodes.length; i++) {
    var child = node.childNodes[i];
    if (child.tagName == 'Activity') {
      this.maybeAddActivity_(child);
    } else if (child.tagName == 'MultiSportSession') {
      for (var j = 0; j < child.childNodes.length; j++) {
        var grandChild = child.childNodes[j];
        if (grandChild.tagName == 'FirstSport' || grandChild.tagName == 'NextSport') {
          // There should only be a single child, of type Activity.
          var greatGrandChild = grandChild.childNodes[0];
          if (greatGrandChild.tagName != 'Activity') {
            throw new Error('Unexpected tag \'' + greatGrandChild.tagName + '\' in \'' + grandChild.tagName + '\'');
          }
          this.maybeAddActivity_(greatGrandChild);
        }
      }
    } else if (child.nodeName !== "#text") {
      throw new Error('Unexpected tag \'' + child.tagName + '\' in \'Activities\'');
    }
  }
  this.rebuildDom();
};
Activities.prototype.rebuildDom = function() {
  this.dom_.innerHTML = '';
  for (var i = 0; i < this.activities_.length; i++) {
    // Activity
    var div = createDiv('activity wide');
    div.appendChild(createTextSpan('Activity ' + (i + 1) + ' of ' + this.activities_.length));
    if (this.activities_.length > 1) {
      div.appendChild(createButton(
          'Remove',
          (function(me, j) { return function() { me.removeActivity(j); }; })(this, i)));
    }
    this.activities_[i].rebuildDom();
    div.appendChild(this.activities_[i].dom_);
    this.dom_.appendChild(div);
    // Collapser
    if (i == this.activities_.length - 1) {
      continue;
    }
    var start = this.activities_[i].lastLap();
    var end = this.activities_[i + 1].firstLap();
    var time = timeDifferenceSeconds(start.lastTrack().lastTrackpoint(),
                                     end.firstTrack().firstTrackpoint());
    var displacement = estimateDisplacementMeters(
        start.lastNonTimeOnlyTrack().lastNonTimeOnlyTrackpoint(),
        end.firstNonTimeOnlyTrack().firstNonTimeOnlyTrackpoint());
    var collapser = createDiv('activity wide collapser');
    collapser.appendChild(createButton('Collapse activities ' + (i + 1) + ' and ' + (i + 2), (function(me, j) { return function() { me.collapseActivityWithPrevious(j); }; })(this, i + 1)));
    var table = document.createElement('table');
    table.appendChild(createTableRow('Time difference (HH:MM:SS)', [toHourMinSec(time)]));
    table.appendChild(createTableRow('Approximate displacement (m)', [displacement]));
    collapser.appendChild(table);
    this.dom_.appendChild(collapser);
  }
};
Activities.prototype.removeActivity = function(index) {
  // Removing an activitiy is easy, because the activity has no metadata.
  // The laps from this activity therefore remain independent of the laps
  // from the previous activity and no modification is required.
  console.log('Removing activity ' + index);
  removeIndex(this.activities_, index);
  this.rebuildDom();
};
Activities.prototype.collapseActivityWithPrevious = function(index) {
  if (index == 0 || index >= this.activities_.length) {
    throw new Error('Can not collapse index ' + index);
  }
  console.log('Collapsing activity ' + (index + 1) + ' with activity ' + index);
  var thisActivity = this.activities_[index];
  var previousActivity = this.activities_[index - 1];
  // Need to cache this before we start adding laps.
  var distance = previousActivity.distance();
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
Activities.prototype.toXml = function() {
  var node = document.createElementNS(null, 'Activities');
  for (var i = 0; i < this.activities_.length; i++) {
    node.appendChild(this.activities_[i].toXml());
  }
  return node;
};
