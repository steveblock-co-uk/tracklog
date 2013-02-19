      Lap = function(parentActivity, node) {
        this.parentActivity_ = parentActivity;
        // Metadata
        this.startTime_ = node.getAttribute('StartTime');
        this.totalTimeSeconds_ = Number(node.getElementsByTagName('TotalTimeSeconds')[0].textContent).valueOf();
        this.distanceMeters_ = Number(node.getElementsByTagName('DistanceMeters')[0].textContent).valueOf();
        this.maximumSpeed_ = Number(node.getElementsByTagName('MaximumSpeed')[0].textContent).valueOf();
        this.calories_ = Number(node.getElementsByTagName('Calories')[0].textContent).valueOf();
        this.tracks_ = [];
        for (var i = 0; i < node.childNodes.length; i++) {
          if (node.childNodes[i].tagName == 'Track') {
            this.tracks_.push(new Track(node.childNodes[i]));
          }
        }
        this.dom_ = createDiv('');
      };
      Lap.prototype.firstTrack = function() {
        if (this.tracks_.length < 1) {
          throw new Error('Laps must contain at least one track.');
        }
        return this.tracks_[0];
      }
      // This can never return null.
      Lap.prototype.firstNonTimeOnlyTrack = function() {
        if (!this.tracks_[0].isTimeOnly()) {
          return this.tracks_[0];
        }
        if (this.tracks_.length == 1) {
          throw new Error('Lap must contain a non-time-only track');
        }
        if (!this.tracks_[1].isTimeOnly()) {
          return this.tracks_[1];
        }
        throw new Error('Multiple time-only tracks found at start of lap');
      }
      Lap.prototype.lastTrack = function() {
        return this.tracks_[this.tracks_.length - 1];
      }
      // This can never return null.
      Lap.prototype.lastNonTimeOnlyTrack = function() {
        var length = this.tracks_.length;
        if (!this.tracks_[length - 1].isTimeOnly()) {
          return this.tracks_[length - 1];
        }
        if (length == 1) {
          throw new Error('Lap must contain a non-time-only track');
        }
        if (!this.tracks_[length - 2].isTimeOnly()) {
          return this.tracks_[length - 2];
        }
        throw new Error('Multiple time-only tracks found at start of lap');
      }
      Lap.prototype.numTimeOnlyTracks = function() {
        var count = 0;
        for (var i = 0; i < this.tracks_.length; ++i) {
          if (this.tracks_[i].isTimeOnly()) {
            ++count;
          } 
        }
        return count;
      }
      Lap.prototype.rebuildDom = function() {
        this.dom_.innerHTML = '';
        var table = document.createElement('table');
        table.appendChild(createTableRow('Start time', [this.startTime_]));
        table.appendChild(createTableRow('Total time (HH:MM:SS)', [toHourMinSec(this.totalTimeSeconds_)]));
        table.appendChild(createTableRow('Distance (m)', [this.distanceMeters_]));
        table.appendChild(createTableRow('Maximum speed (m/s)', [this.maximumSpeed_]));
        table.appendChild(createTableRow('Calories', [this.calories_]));
        this.dom_.appendChild(table);
        for (var i = 0; i < this.tracks_.length; i++) {
          // Track
          var div = createDiv('track wide');
          div.appendChild(createTextSpan('Track ' + (i + 1) +' of ' + this.tracks_.length +
              (this.tracks_[i].isTimeOnly() ? ' (time-only)' : '')));
          // Always allow removal of time-only tracks. Only allow removal of
          // non-time-only tracks when there are other non-time-only tracks.
          // This means that if we start with non-time-only tracks, there will
          // always be at least one track remaining, at least one of which will
          // be non-time-only.
          if (this.tracks_[i].isTimeOnly() || this.tracks_.length - this.numTimeOnlyTracks() > 1) {
            div.appendChild(createButton(
                'Remove',
                (function(me, j) { return function() { me.removeTrack(j); }; })(this, i)));
          }
          this.tracks_[i].rebuildDom();
          div.appendChild(this.tracks_[i].dom_);
          this.dom_.appendChild(div);
          // Collapser
          if (i == this.tracks_.length - 1) {
            continue;
          }
          var start = this.tracks_[i];
          var end = this.tracks_[i + 1];
          var time = timeDifferenceSeconds(start.lastTrackpoint(),
                                           end.firstTrackpoint());
          var collapser = createDiv('track wide collapser');
          // No need to be able to collapse tracks, as viewer ignores them anyway.
          var table = document.createElement('table');
          table.appendChild(createTableRow('Time difference (HH:MM:SS)', [toHourMinSec(time)]));
          if (!start.isTimeOnly() && !end.isTimeOnly()) {
            var displacement = estimateDisplacementMeters(
                start.lastNonTimeOnlyTrackpoint(),
                end.firstNonTimeOnlyTrackpoint());
            table.appendChild(createTableRow('Approximate displacement (m)', [displacement]));
          }
          collapser.appendChild(table);
          this.dom_.appendChild(collapser);
        }
      };
      Lap.prototype.removeTrack = function(index) {
        console.log('Removing track ' + index);
        var track = this.tracks_[index];
        // When removing a track, we need to shift the distances of all later
        // tracks and update the time and distance for the lap.
        if (!track.isTimeOnly()) {
          var distance = track.firstNonTimeOnlyTrackpoint().distanceMeters_ -
              track.lastNonTimeOnlyTrackpoint().distanceMeters_;
          for (var i = index + 1; i < this.tracks_.length; i++) {
            console.log('Shifting track ' + (i + 1) + ' by ' + distance);
            this.tracks_[i].shiftDistances(distance);
          }
          // We also need to update all later laps by shifting their distance!
          this.parentActivity_.shiftDistanceOfAllLaterLaps(this, distance);
        }
        removeIndex(this.tracks_, index);
        this.updateMetadata();
        // TODO: Make an estimate of how to update calories?
        this.rebuildDom();
      };
      Lap.prototype.shiftDistances = function(delta) {
        if (delta == 0) {
          return;
        }
        console.log('Lap.shiftDistances(): Shifting by ' + delta + 'm');
        for (var i = 0; i < this.tracks_.length; i++) {
          this.tracks_[i].shiftDistances(delta);
        }
      }
      // Updates the start time, time and distance metadata from the tracks.
      // TODO: Calculate maximum speed
      Lap.prototype.updateMetadata = function() {
        this.startTime_ = this.firstTrack().firstTrackpoint().time_;
        this.totalTimeSeconds_ = this.calculateTotalTime();
        this.distanceMeters_ = this.calculateDistance();
      }
      Lap.prototype.calculateTotalTime = function() {
        var res = 0;
        for (var i = 0; i < this.tracks_.length; i++) {
          res += timeDifferenceSeconds(this.tracks_[i].firstTrackpoint(),
                                       this.tracks_[i].lastTrackpoint());
        }
        return res;
      }
      Lap.prototype.calculateDistance = function() {
        // This will be correct even if the first track does not start at
        // distance zero.
        return this.lastNonTimeOnlyTrack().lastNonTimeOnlyTrackpoint().distanceMeters_ -
            this.firstNonTimeOnlyTrack().firstNonTimeOnlyTrackpoint().distanceMeters_;
      };
      Lap.prototype.toXml = function() {
        var node = document.createElementNS(null, 'Lap');
        node.setAttribute('StartTime', this.startTime_);
        node.appendChild(createTextElement('TotalTimeSeconds', this.totalTimeSeconds_));
        node.appendChild(createTextElement('DistanceMeters', this.distanceMeters_));
        node.appendChild(createTextElement('MaximumSpeed', this.maximumSpeed_));
        node.appendChild(createTextElement('Calories', this.calories_));
        for (var i = 0; i < this.tracks_.length; i++) {
          node.appendChild(this.tracks_[i].toXml());
        }
        return node;
      };
