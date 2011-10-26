/*jslint strict: false, indent: 2 */
/*global define: false, console: false */

define(function (require) {

  return {
    multiBulkToStringArray: function (data) {
      return data.map(function (item) {
        return item.toString();
      });
    },

    multiBulkToJsonArray: function (data) {
      return data.map(function (item) {
        return JSON.parse(item.toString());
      });
    }
  };
});
