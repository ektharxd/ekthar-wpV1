const http = require('http');

const callbackHtml = `
<!DOCTYPE html>
<html>
  <body>
    <script>
      // Extract token from URL hash and send to opener
      if (window.opener && window.location.hash) {
        window.opener.postMessage(window.location.hash, '*');
        window.close();
      }
    </script>
    <h2>You may close this window.</h2>
  </body>
</html>
`;

http.createServer((req, res) => {
  if (req.url.startsWith('/callback')) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(callbackHtml);
  } else {
    res.writeHead(404);
    res.end();
  }
}).listen(5174, () => {
  console.log('OAuth callback server running at http://localhost:5174/callback');
});
