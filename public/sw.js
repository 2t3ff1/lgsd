self.addEventListener("push", (event) => {
  let data = { title: "LGSD", body: "Du hast eine neue Benachrichtigung.", url: "/dashboard" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // ignore malformed payloads
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      data: { url: data.url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientsArr) => {
      const existing = clientsArr.find((c) => c.url.includes(url));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
