      Track = function(node) {
        this.trackpoints_ = [];
        // No metadata and all children are type Trackpoint
        var trackpoints = node.getElementsByTagName('Trackpoint');
        for (var i = 0; i < trackpoints.length; i++) {
          this.trackpoints_.push(new Trackpoint(trackpoints[i]));
        }
        if (this.trackpoints_.length == 0) {
          throw new Error('No viable trackpoints found');
        }
        this.dom_ = document.createElement('table');
        this.rebuildDom();
      };
      Track.prototype.firstTrackpoint = function() {
        if (this.trackpoints_.length < 1) {
          throw new Error('Tracks must contain at least one trackpoint.');
        }
        return this.trackpoints_[0];
      }
      // This could return null.
      Track.prototype.firstNonTimeOnlyTrackpoint = function() {
        var length = this.trackpoints_.length;
        for (var i = 0; i < length; ++i) {
          if (!this.trackpoints_[i].isTimeOnly_) {
            return this.trackpoints_[i];
          }
        }
        if (length <= MAX_CONSECUTIVE_TIME_ONLY_TRACKPOINTS) {
          return null;
        }
        console.log(this.trackpoints_[0]);
        throw new Error('Multiple time-only trackpoints found at start of track: ' +
                        this.trackpoints_[0].time_);
      }
      Track.prototype.lastTrackpoint = function() {
        return this.trackpoints_[this.trackpoints_.length - 1];
      }
      // This could return null.
      Track.prototype.lastNonTimeOnlyTrackpoint = function() {
        var length = this.trackpoints_.length;
        for (var i = length - 1; i >= 0; --i) {
          if (!this.trackpoints_[i].isTimeOnly_) {
            return this.trackpoints_[i];
          }
        }
        if (length <= MAX_CONSECUTIVE_TIME_ONLY_TRACKPOINTS) {
          return null;
        }
        throw new Error('Multiple time-only trackpoints found at end of track: ' +
                        this.trackpoints_[length - 1].time_);
      }
      Track.prototype.isTimeOnly = function() {
        return this.firstNonTimeOnlyTrackpoint() == null;
      }
      Track.prototype.numTimeOnlyTrackpoints = function() {
        var count = 0;
        for (var i = 0; i < this.trackpoints_.length; ++i) {
          if (this.trackpoints_[i].isTimeOnly_) {
            ++count;
          } 
        }
        return count;
      }
      Track.prototype.rebuildDom = function() {
        this.dom_.innerHTML = '';
        var first = this.firstNonTimeOnlyTrackpoint();
        var last = this.lastNonTimeOnlyTrackpoint();
        this.dom_.appendChild(createTableRow(
            'Num trackpoints',
            [this.trackpoints_.length, '(' + this.numTimeOnlyTrackpoints() + ' time-only)']));
        this.dom_.appendChild(createTableRow(
            'Start/End time',
            [this.firstTrackpoint().time_, this.lastTrackpoint().time_]));
        if (this.isTimeOnly()) {
          this.dom_.appendChild(createTableRow('No position data', []));
          return;
        }
        this.dom_.appendChild(createTableRow(
            'Start/End distance (km)',
            [first.distanceMeters_ / 1000, last.distanceMeters_ / 1000]));
        this.dom_.appendChild(createTableRow(
            'Start/End altitude (m)',
            [first.altitudeMeters_, last.altitudeMeters_]));
        this.dom_.appendChild(createTableRow(
            'Start/End latitude (deg)',
            [first.latitudeDegrees_, last.latitudeDegrees_]));
        this.dom_.appendChild(createTableRow(
            'Start/End longitude (deg)',
            [first.longitudeDegrees_, last.longitudeDegrees_]));
      };
      Track.prototype.shiftDistances = function(delta) {
        if (delta == 0) {
          return;
        }
        for (var i = 0; i < this.trackpoints_.length; i++) {
          var trackpoint = this.trackpoints_[i];
          if (!trackpoint.isTimeOnly_) {
            trackpoint.distanceMeters_ += delta;
          }
        }
      }
      Track.prototype.toXml = function() {
        var node = document.createElementNS(null, 'Track');
        for (var i = 0; i < this.trackpoints_.length; i++) {
          node.appendChild(this.trackpoints_[i].toXml());
        }
        return node;
      };

      Trackpoint = function(node) {
        this.time_ = node.getElementsByTagName('Time')[0].textContent;
        if (node.getElementsByTagName('Position').length === 0) {
          this.isTimeOnly_ = true;
          return;
        }
        this.isTimeOnly_ = false;
        var position = node.getElementsByTagName('Position')[0];
        this.latitudeDegrees_ = Number(position.getElementsByTagName('LatitudeDegrees')[0].textContent).valueOf();
        this.longitudeDegrees_ = Number(position.getElementsByTagName('LongitudeDegrees')[0].textContent).valueOf();
        this.altitudeMeters_ = Number(node.getElementsByTagName('AltitudeMeters')[0].textContent).valueOf();
        this.distanceMeters_ = Number(node.getElementsByTagName('DistanceMeters')[0].textContent).valueOf();
      };
      Trackpoint.prototype.toXml = function() {
        var node = document.createElementNS(null, 'Trackpoint');
        node.appendChild(createTextElement('Time', this.time_));
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
