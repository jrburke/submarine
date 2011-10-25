/*jslint strict: false, indent: 2, nomen: false */
/*global define: false, console: false */

define(function () {

  /**
   * Handles sending a responseData object to the client. Does
   * the JSON stringify work, and also transfers over the defer ID
   * so the client can match the response with the request.
   */
  return function clientSend(client, requestData, responseData) {

    if (requestData._deferId) {
      responseData._deferId = requestData._deferId;
    }

    console.log("CLIENT SEND: " + JSON.stringify(responseData));

    client.emit('clientMessage', JSON.stringify(responseData));
  };

});
