// Cleanup script for registerSW.js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for (var i = 0; i < registrations.length; i++) {
      registrations[i].unregister();
    }
  }).catch(function() {});
}
if ('caches' in window) {
  caches.keys().then(function(keys) {
    for (var i = 0; i < keys.length; i++) {
      caches.delete(keys[i]);
    }
  }).catch(function() {});
}
