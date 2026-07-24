var AetherCEP = window.AetherCEP || window.BunBunMedia || {};
(function (api) {
  'use strict';
  function parts(value) {
    var match = String(value || '').trim().replace(/^v/i, '').match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
    return match ? [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)] : null;
  }
  api.versioning = {
    compare: function (left, right) {
      var a = parts(left), b = parts(right), i;
      if (!a || !b) return null;
      for (i = 0; i < 3; i += 1) {
        if (a[i] > b[i]) return 1;
        if (a[i] < b[i]) return -1;
      }
      return 0;
    },
    valid: function (value) { return !!parts(value); }
  };
})(AetherCEP);
