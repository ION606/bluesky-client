// listen for messages from the main thread
self.onmessage = function (event) {
    const data = event.data;

    self.postMessage(document.querySelector('#posts')?.firstChild)

    // send the result back to the main thread
    self.postMessage(result);
};
