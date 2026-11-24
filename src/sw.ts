/// <reference lib="webworker" />
// Service Worker：離線快取（PWA）＋好時段推播
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst } from "workbox-strategies";

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// 照片（縮圖與原圖）存在手機快取裡：看過一次之後，再打開就直接用，不用重新下載
registerRoute(({ url }) => url.pathname.startsWith("/api/photos/"), new CacheFirst({ cacheName: "fish-photos" }));

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data: { title?: string; body?: string; url?: string } = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { body: event.data?.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title ?? "🦑 釣況紀錄", {
      body: data.body ?? "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "good-window", // 同一種通知只留最新一則
      data: { url: data.url ?? "/" },
    }),
  );
});

// 點通知：已經開著就切過去，沒有就開新視窗
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string })?.url ?? "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if ("focus" in c) return c.focus();
      return self.clients.openWindow(url);
    }),
  );
});
