Activities = function(observer) {
  this.activities_ = [];
  this.observer_ = observer;
  this.observer_.setActivities(this);
};
Activities.prototype.addFromXml = function(node) {
  // Children may be Activity or MultiSportSession. For the latter, we
  // just pull out the Activity objects.
  // TODO: Introduce concept of MultiSportSession?
  for (var i = 0; i < node.childNodes.length; i++) {
    var child = node.childNodes[i];
    if (child.tagName === 'Activity') {
      var activity = new Activity(this.observer_.createActivityObserver());
      activity.populate(child);
      this.activities_.push(activity);
    } else if (child.tagName === 'MultiSportSession') {
      for (var j = 0; j < child.childNodes.length; j++) {
        var grandChild = child.childNodes[j];
        if (grandChild.tagName === 'FirstSport' || grandChild.tagName === 'NextSport') {
          // There should only be a single child, of type Activity.
          var greatGrandChild = grandChild.childNodes[0];
          if (greatGrandChild.tagName != 'Activity') {
            throw new Error('Unexpected tag \'' + greatGrandChild.tagName + '\' in \'' + grandChild.tagName + '\'');
          }
          var activity = new Activity(this.observer_.createActivityObserver());
          activity.populate(greatGrandChild);
          this.activities_.push(activity);
        }
      }
    } else if (child.nodeName !== "#text") {
      throw new Error('Unexpected tag \'' + child.tagName + '\' in \'Activities\'');
    }
  }
  this.observer_.onPropertiesChanged();
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
Activities.prototype.removeActivity = function(index) {
  // Removing an activitiy is easy, because the activity has no metadata.
  // The laps from this activity therefore remain independent of the laps
  // from the previous activity and no modification is required.
  console.log('Removing activity ' + (index + 1) + ' of ' + this.activities_.length);
  removeIndex(this.activities_, index);
  this.observer_.onPropertiesChanged();
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
  this.observer_.onPropertiesChanged();
};
Activities.prototype.toXml = function() {
  var node = document.createElementNS(null, 'Activities');
  for (var i = 0; i < this.activities_.length; i++) {
    node.appendChild(this.activities_[i].toXml());
  }
  return node;
};
