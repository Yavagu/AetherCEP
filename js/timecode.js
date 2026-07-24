var AetherCEP = window.AetherCEP || window.BunBunMedia || {};
(function (api) {
  'use strict';
  function parse(value) {
    var text = String(value || '').trim();
    if (!text) return null;
    if (!/^\d+(?::\d{1,2}){0,2}(?:\.\d{1,3})?$/.test(text)) return NaN;
    var parts = text.split(':');
    if (parts.length > 3) return NaN;
    var componentCount = parts.length;
    var seconds = parseFloat(parts.pop());
    var minutes = parts.length ? parseInt(parts.pop(), 10) : 0;
    var hours = parts.length ? parseInt(parts.pop(), 10) : 0;
    if (componentCount === 3 && minutes >= 60) return NaN;
    if (componentCount >= 2 && seconds >= 60) return NaN;
    return hours * 3600 + minutes * 60 + seconds;
  }
  function display(total) {
    if (!isFinite(total)) return 'end';
    var whole = Math.floor(total), hours = Math.floor(whole / 3600);
    var minutes = Math.floor((whole % 3600) / 60), seconds = whole % 60;
    return (hours ? hours + ':' + ('0' + minutes).slice(-2) : minutes) + ':' + ('0' + seconds).slice(-2);
  }
  function filename(total) {
    if (!isFinite(total)) return 'end';
    var whole = Math.floor(total), hours = Math.floor(whole / 3600);
    var minutes = Math.floor((whole % 3600) / 60), seconds = whole % 60;
    return (hours < 10 ? '0' : '') + hours + 'h' + ('0' + minutes).slice(-2) + 'm' + ('0' + seconds).slice(-2) + 's';
  }
  api.timecode = {
    parse: parse,
    range: function (startText, endText, precise) {
      var start = parse(startText), end = parse(endText);
      if (start === null && end === null) return { error: 'Enter a start time, an end time, or both.' };
      if (isNaN(start) || isNaN(end)) return { error: 'Use SS, MM:SS, or HH:MM:SS timestamps (for example 1:23:45).' };
      if (start === null) start = 0;
      if (end === null) end = Infinity;
      if (end <= start) return { error: 'The end timestamp must be later than the start timestamp.' };
      return {
        start: start, end: end, precise: !!precise,
        argument: '*' + start + '-' + (isFinite(end) ? end : 'inf'),
        label: display(start) + '–' + display(end),
        fileTag: filename(start) + '-' + filename(end)
      };
    }
  };
})(AetherCEP);
