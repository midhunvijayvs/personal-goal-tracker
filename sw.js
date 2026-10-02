// Minimal service worker: caches the app shell so Personal Assistant opens instantly
// (and still opens, just without fresh data) even with a flaky connection.
// Your actual goal data lives in Google Drive, not in this cache.

var CACHE_NAME = "personal-assistant-shell-v2";
var SHELL_FILES = [
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(SHELL_FILES);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(
        names.filter(function(n){ return n !== CACHE_NAME; })
             .map(function(n){ return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function(event){
  var url = event.request.url;
  // Never intercept Google sign-in / Drive API calls — those must always hit the network.
  if(url.indexOf("google") !== -1 || url.indexOf("googleapis") !== -1 || url.indexOf("gstatic") !== -1){
    return;
  }
  event.respondWith(
    caches.match(event.request).then(function(cached){
      var network = fetch(event.request).then(function(resp){
        if(resp && resp.ok){
          caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, resp.clone()); });
        }
        return resp;
      }).catch(function(){ return cached; });
      return cached || network;
    })
  );
});
