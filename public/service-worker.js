const CACHE_NAME = "hospital-cache-v2";
const DYNAMIC_CACHE = "hospital-dynamic-cache-v1";

const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/offline.html", 
];

// SW
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Cache abierto");
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});


self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cache) => cache !== CACHE_NAME && cache !== DYNAMIC_CACHE)
          .map((cache) => caches.delete(cache))
      );
    })
  );
  console.log("Service Worker activado");
});


function saveToIndexedDB(request, response) {
  const openRequest = indexedDB.open("hospitalDB", 1);

  openRequest.onupgradeneeded = (e) => {
    const db = e.target.result;
    if (!db.objectStoreNames.contains("dynamicData")) {
      db.createObjectStore("dynamicData", { keyPath: "url" });
    }
  };

  openRequest.onsuccess = (e) => {
    const db = e.target.result;
    const transaction = db.transaction("dynamicData", "readwrite");
    const store = transaction.objectStore("dynamicData");
    store.put({ url: request.url, data: response });
  };

  openRequest.onerror = (e) => {
    console.error("Error al abrir IndexedDB", e);
  };
}


self.addEventListener("fetch", (event) => {

  if (event.request.url.includes("/api/")) { 
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          saveToIndexedDB(event.request, response.clone());
          return caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
        .catch(() => {
      
          return indexedDB.open("hospitalDB", 1).onsuccess = (e) => {
            const db = e.target.result;
            const transaction = db.transaction("dynamicData", "readonly");
            const store = transaction.objectStore("dynamicData");

            return store.get(event.request.url).then((cachedData) => {
              if (cachedData) {
                return new Response(JSON.stringify(cachedData.data), {
                  headers: { "Content-Type": "application/json" },
                });
              }
              return caches.match("/offline.html"); 
            });
          };
        })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return (
          cachedResponse ||
          fetch(event.request).then((response) => {
            return caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, response.clone());
              return response;
            });
          })
        );
      })
    );
  }
});
