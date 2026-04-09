self.addEventListener('push', function(event) {
    const options = {
        body: event.data.text(),
        icon: 'logo.png',
        badge: 'logo.png'
    };
    event.waitUntil(self.registration.showNotification('ProcrastiNever', options));
});
