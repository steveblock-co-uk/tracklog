// Tools for testing

// json format ...
// [
//   {
//     laps: [
//       {
//         startTime: <startTimeString>,
//         time: <timeSeconds>,
//         length: <lengthMetres>,
//         maxSpeed: <maxSpeedMetresPerSecond>,
//         calories: <calories>,
//         tracks: [
//           {
//             trackpoints: [
//               {
//                 timestamp: <timestampString>,
//                 distance: <distanceMetres>,
//                 latitude: <latitudeDegrees>,
//                 longitude: <longitudeDegrees>,
//               },
//               <trackpoints>
//             ],
//           },
//           <tracks>
//         ],
//       },
//       <laps>
//     ],
//   },
//   <activities>
// ]

// Hacks
// TODO: Fix this
ActivitiesView.prototype.onPropertiesChanged = function() {};
ActivityView.prototype.onPropertiesChanged = function() {};

// Stub for testing
// TODO: Fix this
function createDiv(className) {
  return document.createElement('div');
}

function createXml(json) {
  var activities = document.createElementNS(null, 'Activities');
  for (var i = 0; i < json.length; ++i) {
    var a = json[i];
    var activity = document.createElementNS(null, 'Activity');
    activity.setAttribute('Sport', "dummy");
    activity.appendChild(createTextElement('Id', 'dummy'));
    for (var j = 0; j < a.laps.length; ++j) {
      var l = a.laps[j];
      var lap = document.createElementNS(null, 'Lap');
      lap.setAttribute('StartTime', l.startTime);
      lap.appendChild(createTextElement('TotalTimeSeconds', l.time));
      lap.appendChild(createTextElement('DistanceMeters', l.length));
      lap.appendChild(createTextElement('MaximumSpeed', l.maxSpeed));
      lap.appendChild(createTextElement('Calories', l.calories));
      for (var k = 0; k < l.tracks.length; ++k) {
        var t = l.tracks[k];
        var track = document.createElementNS(null, 'Track');
        for (var m = 0; m < t.trackpoints.length; ++m) {
          var p = t.trackpoints[m];
          var trackpoint = document.createElementNS(null, 'Trackpoint');
          trackpoint.appendChild(createTextElement('Time', p.timestamp));
          if (p.latitude !== undefined) {
            var position = document.createElementNS(null, 'Position');
            position.appendChild(createTextElement('LatitudeDegrees', p.latitude));
            position.appendChild(createTextElement('LongitudeDegrees', p.longitude));
            trackpoint.appendChild(position);
            trackpoint.appendChild(createTextElement('AltitudeMeters', 999));
            trackpoint.appendChild(createTextElement('DistanceMeters', p.distance));
          }
          track.appendChild(trackpoint);
        }
        lap.appendChild(track);
      }
      activity.appendChild(lap);
    }
    activities.appendChild(activity);
  }
  return activities;
}

// Works for JSON objects of objects, arrays and primitives only.
function clone(original) {
  if (original instanceof Array) {
    var copy = [];
    for (var i = 0; i < original.length; ++i) {
      copy.push(clone(original[i]));
    }
    return copy;
  } else if (typeof original === "object") {
    var copy = {};
    for (var i in original) {
      copy[i] = clone(original[i]);
    }
    return copy;
  }
  return original;
}

// TODO: Merge these with check()
function pass(description) {
  var div = document.createElement('div');
  div.innerText = description;
  document.body.appendChild(div);
}

function fail(description) {
  var div = document.createElement('div');
  div.className = "fail";
  div.innerText = description;
  document.body.appendChild(div);
}

function check(actual, expected, description) {
  var div = document.createElement('div');
  div.innerText = description;
  if (expected !== actual) {
    div.className = "fail";
    div.innerText += ': Expected ...';
    var e = document.createElement('div');
    e.innerText = expected;
    div.appendChild(e);
    div.appendChild(document.createTextNode('but got ...'));
    var a = document.createElement('div');
    a.innerText = actual;
    div.appendChild(a);
  }
  document.body.appendChild(div);
}

function toString(xml) {
  return (new XMLSerializer).serializeToString(xml);
}

function checkXml(actual, expected, description) {
  check(toString(actual), toString(expected), description);
}

function createActivities(xml) {
  var activities = new Activities(new ActivitiesView(null));
  activities.addFromXml(xml);
  return activities;
}

function checkUnchanged(xml) {
  checkXml(createActivities(xml).toXml(), xml);
}
