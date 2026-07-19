const CACHE_VERSION = "swl-v10";
const APP_SHELL_CACHE = `app-shell-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;

const APP_SHELL_FILES = [
  "./index.html",
  "./products.html",
  "./product.html",
  "./cart.html",
  "./checkout.html",
  "./confirmation.html",
  "./orders.html",
  "./css/style.css",
  "./css/components.css",
  "./js/firebase.js",
  "./js/cart.js",
  "./js/products.js",
  "./js/checkout.js",
  "./js/auth.js",
  "./js/orders.js",
  "./js/pwa_register.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
  "./screenshots/wide-home.png",
  "./screenshots/mobile-home.png",
];

self.addEventListener("install", (event) => {
  console.log("Service Worker installing...");
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE)
      .then((cache) => {
        console.log("Caching app shell files");
        return cache.addAll(APP_SHELL_FILES).catch((err) => {
          console.warn("Some files failed to cache:", err);
        });
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...");
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        console.log("Cleaning up old caches");
        return Promise.all(
          keys
            .filter(
              (key) =>
                key !== APP_SHELL_CACHE &&
                key !== IMAGE_CACHE &&
                key !== API_CACHE,
            )
            .map((key) => caches.delete(key)),
        );
      })
      .then(() =>
        self.clients.claim().catch((err) => {
          console.warn("clients.claim() skipped:", err.message);
        }),
      ),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== "GET") {
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  if (
    url.pathname.includes("/images/") ||
    url.pathname.includes("/icons/") ||
    url.pathname.includes("/screenshots/") ||
    /\.(png|jpe?g|webp|gif|svg)$/i.test(url.pathname)
  ) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) =>
        cache.match(req).then((cached) => {
          const networkFetch = fetch(req)
            .then((res) => {
              if (res.ok) {
                safeCachePut(IMAGE_CACHE, req, res);
              }
              return res;
            })
            .catch((err) => {
              console.warn("Image fetch failed, using cache:", err);
              return cached || createPlaceholderImage();
            });
          return cached || networkFetch;
        }),
      ),
    );
    return;
  }

  if (
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname === "/"
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const networkFetch = fetch(req)
          .then((res) => {
            if (res.ok) {
              safeCachePut(APP_SHELL_CACHE, req, res);
            }
            return res;
          })
          .catch((err) => {
            console.warn("App shell fetch failed:", err);
            if (cached) return cached;
            if (url.pathname.endsWith(".html") || url.pathname === "/") {
              return caches.match("./index.html");
            }
            return createErrorResponse();
          });
        return cached || networkFetch;
      }),
    );
    return;
  }

  event.respondWith(
    fetchWithRetry(req, 3)
      .then((res) => {
        if (res.ok) {
          safeCachePut(API_CACHE, req, res);
        }
        return res;
      })
      .catch(async (err) => {
        console.warn("API request failed:", err);
        const cached = await caches.match(req);
        return cached || createErrorResponse();
      }),
  );
});

function safeCachePut(cacheName, request, response) {
  const clone = response.clone();
  caches.open(cacheName).then(async (cache) => {
    if (clone.redirected) {
      const body = await clone.blob();
      const cleanResponse = new Response(body, {
        status: clone.status,
        statusText: clone.statusText,
        headers: clone.headers,
      });
      cache.put(request, cleanResponse);
    } else {
      cache.put(request, clone);
    }
  });
}

async function fetchWithRetry(req, retries) {
  try {
    return await fetch(req);
  } catch (err) {
    if (retries > 0) {
      const delay = Math.pow(2, 4 - retries) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(req, retries - 1);
    }
    throw err;
  }
}

function createPlaceholderImage() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <rect width="200" height="200" fill="#e2e1d8"/>
      <text x="100" y="100" font-size="16" text-anchor="middle" 
            dominant-baseline="central" fill="#5e6b63">Image unavailable</text>
    </svg>
  `;
  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml" },
  });
}

function createErrorResponse() {
  return new Response("Network error", {
    status: 503,
    statusText: "Service Unavailable",
  });
}
