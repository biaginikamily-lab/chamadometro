const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORTA = 3000;

app.use(express.static('public'));

function getSala(turma) {
  const hoje = new Date().getDay(); // 0=domingo, 2=terca, 4=quinta
  const diasJuntos = [2, 4];
  if (diasJuntos.includes(hoje)) {
    return 'geral';
  }
  return turma;
}

io.on('connection', (socket) => {
  console.log('alguem conectou:', socket.id);

  socket.on('entrar', (turma) => {
    if (socket.salaAtual) {
      socket.leave(socket.salaAtual); // sai da sala antiga antes de entrar na nova
    }
    const sala = getSala(turma);
    socket.join(sala);
    socket.turmaAtual = turma;
    socket.salaAtual = sala;
    const diaJunto = sala === 'geral';
    socket.emit('infoSala', { sala, diaJunto });
    console.log(socket.id, 'entrou na turma', turma, '-> sala', sala);
  });

  socket.on('ativarSinal', () => {
    const sala = socket.salaAtual;
    if (!sala) return;
    socket.to(sala).emit('sinalRecebido');
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