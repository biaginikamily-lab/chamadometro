const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const webpush = require('web-push');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORTA = process.env.PORT || 3000;

const VAPID_PUBLIC_KEY = 'BKgID1NWTC_kovQ6NS2j_ibJIoKUp1fiS1qexpwT1nKD0L9-kMLzHymj26cjSHSm2kdFmPTFzZEaf_2QZyr2xZw';
const VAPID_PRIVATE_KEY = '5PykB1WZiXjHfvBBaJrP_oSZVz-R7ZTQRMmsiV1f5ck';

webpush.setVapidDetails(
  'mailto:seuemail@exemplo.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

app.use(express.static('public'));

function getSala(turma) {
  const hoje = new Date().getDay();
  const diasJuntos = [2, 4];
  if (diasJuntos.includes(hoje)) {
    return 'geral';
  }
  return turma;
}

// guarda os "enderecos" de notificacao de cada sala
const inscricoesPorSala = {};

function adicionarInscricao(sala, subscription) {
  if (!inscricoesPorSala[sala]) inscricoesPorSala[sala] = [];
  const jaExiste = inscricoesPorSala[sala].some(s => s.endpoint === subscription.endpoint);
  if (!jaExiste) {
    inscricoesPorSala[sala].push(subscription);
  }
}

function notificarSala(sala) {
  const lista = inscricoesPorSala[sala] || [];
  const payload = JSON.stringify({
    title: 'chamadometro',
    body: 'sinal recebido, corre!!'
  });
  lista.forEach((subscription) => {
    webpush.sendNotification(subscription, payload).catch(err => {
      console.log('inscricao invalida, removendo');
      inscricoesPorSala[sala] = inscricoesPorSala[sala].filter(s => s.endpoint !== subscription.endpoint);
    });
  });
}

io.on('connection', (socket) => {
  console.log('alguem conectou:', socket.id);

  socket.on('entrar', (turma) => {
    if (socket.salaAtual) {
      socket.leave(socket.salaAtual);
    }
    const sala = getSala(turma);
    socket.join(sala);
    socket.turmaAtual = turma;
    socket.salaAtual = sala;
    const diaJunto = sala === 'geral';
    socket.emit('infoSala', { sala, diaJunto });
    console.log(socket.id, 'entrou na turma', turma, '-> sala', sala);
  });

  socket.on('inscreverPush', (subscription) => {
    if (!socket.salaAtual) return;
    adicionarInscricao(socket.salaAtual, subscription);
    console.log('nova inscricao push na sala', socket.salaAtual);
  });

  socket.on('ativarSinal', () => {
    const sala = socket.salaAtual;
    if (!sala) return;
    socket.to(sala).emit('sinalRecebido');
    notificarSala(sala);
  });

  socket.on('cancelarSinal', () => {
    const sala = socket.salaAtual;
    if (!sala) return;
    io.to(sala).emit('sinalCancelado');
  });
});

server.listen(PORTA, () => {
  console.log(`servidor rodando em http://localhost:${PORTA}`);
});