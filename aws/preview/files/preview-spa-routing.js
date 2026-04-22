function handler(event) {
  var request = event.request;
  var uri = request.uri;
  // Static assets (have file extension) — serve as-is
  if (uri.match(/\.[a-zA-Z0-9]+$/)) {
    return request;
  }
  // SPA route — rewrite to the PR + app's index.html
  // Path format: /pr-{N}/web-app/... or /pr-{N}/admin-app/...
  var match = uri.match(/^\/pr-\d+\/[^\/]+/);
  if (match) {
    request.uri = match[0] + '/index.html';
  }
  return request;
}
