self.addEventListener('push', function(event) {
  const dados = event.data ? event.data.json() : { title: 'chamadometro', body: 'sinal recebido' };
  event.waitUntil(
    self.registration.showNotification(dados.title, {
      body: dados.body,
      vibrate: [200, 100, 200]
    })
  );
});