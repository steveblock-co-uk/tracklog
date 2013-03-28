// Helpers used by both the app and tests

function createTextElement(type, value) {
  var element = document.createElementNS(null, type);
  element.textContent = value;
  return element;
}

function toNumber(element) {
  return Number(element.textContent).valueOf();
}

// Determines the minimum range which spans a set of values on a wrap-around scale.
// data: An array of at least 2 values, all of which lie in [range.minimum, range.maximum)
// range: The minimum and maximum values of a single span of the wrap-around scale
// returns: The start and end values of the data, potentially modified by
//          wrapping, such that the range of the data is minimised. Both are in
//          [range.minimum, range.maximum) but start may exceed end if the
//          range wraps. The range is in [0, range.maximum - range.minimum).
function getMinimumRangeOfValues(data, range) {
  var delta = range.maximum - range.minimum;
  var sortedData = data.splice(0).sort(function(a, b) { return a - b; });
  var length = sortedData.length;
  var minimumRange = +Infinity;
  var minimumRangeIndex = null;
  for (var i = 0; i < length; i++) {
    if (sortedData[i] < range.minimum || sortedData[i] >= range.maximum) {
      throw new Error('Input data not in range');
    }
    var x = (i === 0 ? sortedData[length - 1] : sortedData[i - 1] + delta) -
        sortedData[i];
    if (x < minimumRange) {
      minimumRange = x;
      minimumRangeIndex = i;
    }
  }
  if (minimumRangeIndex === null) {
    throw new Error('Logic error');
  }
  if (minimumRangeIndex === 0) {
    return {
      start: sortedData[0],
      end: sortedData[length - 1],
    };
  }
  return {
    start: sortedData[minimumRangeIndex],
    end: sortedData[minimumRangeIndex - 1],
  };
}

// As above, but data is a set of ranges, each with start and end properties.
// Ranges are never split. The input data is in [range.minimum, range.maximum)
// and the output is in [range.minimum, range.maximum]. The output range is in
// [0, range.maximum - range.minimum].
function getMinimumRangeOfRanges(data, range) {
  var delta = range.maximum - range.minimum;
  // Unwrap ranges to simplify logic.
  var sortedData = data.splice(0);
  sortedData.forEach(function(x) {
    if (x.start < range.minimum ||
        x.start >= range.maximum ||
        x.end < range.minimum ||
        x.end >= range.maximum) {
      throw new Error('Input data not in range ' + x.start + ' ' + x.end);
    }
    if (x.start > x.end) {
      x.end += delta;
    }
    if (x.start > x.end) {
      throw new Error('Logic error');
    }
  });
  // Overlapping ranges are OK, but we must remove contained ranges as they
  // mess up the algorithm. This ensures that the end points are in the same
  // order as the start points.
  sortedData.sort(function(a, b) {
    // Sort first by start value, then by end value, to simplify the logic
    // below to remove contained ranges.
    return a.start === b.start ? a.end < b.end : a.start - b.start;
  });
  for (var i = 0; i < sortedData.length; i++) {
    while (i + 1 < sortedData.length && sortedData[i].end >= sortedData[i + 1].end) {
      sortedData.splice(i + 1, 1);
    }
  }
  var length = sortedData.length;
  var minimumRange;
  var minimumRangeIndex = null;
  for (var i = 0; i < length; i++) {
    if (i === 0) {
      minimumRange = sortedData[length - 1].end - sortedData[0].start;
      minimumRangeIndex = 0;
      continue;
    }
    // If this range spans range.maximum, we can't shift it. This sets our
    // global minimum and shifting any later ranges will never be an
    // improvement, so we're done.
    if (sortedData[i - 1].end >= range.maximum) {
      break;
    }
    var x = sortedData[i - 1].end + delta - sortedData[i].start;
    if (x < minimumRange) {
      minimumRange = x;
      minimumRangeIndex = i;
    }
  }
  if (minimumRangeIndex === null) {
    throw new Error('Logic error');
  }
  var start = sortedData[minimumRangeIndex].start;
  var end = minimumRangeIndex === 0 ?
      sortedData[length - 1].end :
      sortedData[minimumRangeIndex - 1].end + delta;
  // Note that the minimum range may exceed the input range. In this case, we
  // just return that input range.
  if (end - start > delta) {
    return {start: range.minimum, end: range.maximum};
  }
  // Shift the end point back into the desired range.
  if (end > range.maximum) {
    end -= delta;
  }
  return {start: start, end: end};
}

function collapseRangeOfRanges(data, range) {
  var delta = range.maximum - range.minimum;
  var start = +Infinity;
  var end = -Infinity;
  data.forEach(function(x) {
    if (x.start > x.end) {
      x.end += delta;
    }
    start = Math.min(start, x.start);
    end = Math.max(end, x.end);
  });
  return {start: start, end: end > range.maximum ? end - delta : end};
}
