const { log } = require('console');
const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

const caminhoArquivo = path.join(__dirname, './dados/agendamentos.json');
const caminhoEquipamentos = path.join(__dirname, './dados/equipamentos.json');
const caminhoUsuarios = path.join(__dirname, './dados/usuarios.json');
const caminhoReservas = path.join(__dirname, './dados/reservas.json');

// Rota de login
app.post('/login', (req, res) => {
  const { email, senha } = req.body;
  const dados = fs.readFileSync(caminhoUsuarios, { encoding: 'utf8' });
  const usuarios = JSON.parse(dados);
  const user = usuarios.find(u => u.email === email && u.senha === senha);
  console.log(email, senha)
  if (user) {
    res.json({
      success: true,
      usuario: user,
      setor: user.setor,
      tipoUsuario: user.tipoUsuario
    });
  } else {
    res.json({ success: false, message: 'Usuário ou senha inválidos' });
  }
});

// Rota de agendamento de sala
app.post('/agendar', (req, res) => {
  const { usuario, tipoUsuario, setor, sala, inicio, fim } = req.body;

  if (tipoUsuario !== 'supervisor') {
    return res.json({ success: false, message: 'Apenas supervisores podem agendar salas.' });
  }

  const novoAgendamento = { usuario, setor, sala, inicio, fim };
  let agendamentos = [];

  try {
    const dados = fs.readFileSync(caminhoArquivo);
    agendamentos = JSON.parse(dados);
  } catch (err) {
    console.error('Erro ao ler agendamentos:', err);
  }

  const conflito = agendamentos.find(ag =>
    ag.sala === sala &&
    ((inicio >= ag.inicio && inicio < ag.fim) || (fim > ag.inicio && fim <= ag.fim))
  );

  if (conflito) {
    return res.json({
      success: false,
      message: `Já existe um agendamento para a sala ${sala} nesse horário.`
    });
  }

  agendamentos.push(novoAgendamento);

  try {
    fs.writeFileSync(caminhoArquivo, JSON.stringify(agendamentos, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: 'Erro ao salvar agendamento.' });
  }
});

// Rota para listar agendamentos
app.get('/agendamentos', (req, res) => {
  try {
    const dados = fs.readFileSync(caminhoArquivo);
    const agendamentos = JSON.parse(dados);
    res.json(agendamentos);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao carregar agendamentos.' });
  }
});

// Exclusão de agendamento
app.delete('/excluir/:index', (req, res) => {
  const index = parseInt(req.params.index);
  const { setor } = req.body;

  try {
    const dados = fs.readFileSync(caminhoArquivo);
    const agendamentos = JSON.parse(dados);

    if (index >= 0 && index < agendamentos.length) {
      const agendamento = agendamentos[index];

      if (agendamento.setor !== setor) {
        return res.status(403).json({
          success: false,
          message: 'Você só pode excluir agendamentos do seu setor.'
        });
      }

      agendamentos.splice(index, 1);
      fs.writeFileSync(caminhoArquivo, JSON.stringify(agendamentos, null, 2));
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, message: 'Índice inválido' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erro ao excluir agendamento' });
  }
});

// Rota para adicionar equipamento
app.post('/equipamento', (req, res) => {
  const { nome, descricao, quantidade } = req.body;
  let equipamentos = [];

  try {
    const dados = fs.readFileSync(caminhoEquipamentos);
    equipamentos = JSON.parse(dados);
  } catch (err) {
    console.error('Erro ao ler equipamentos:', err);
  }
  id = uuidv4();
  equipamentos.push({ id, nome, descricao, quantidade });

  try {
    fs.writeFileSync(caminhoEquipamentos, JSON.stringify(equipamentos, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: 'Erro ao adicionar equipamento.' });
  }
});

// Rota para listar equipamentos
app.get('/equipamento', (req, res) => {
  try {
    const dados = fs.readFileSync(caminhoEquipamentos);
    const equipamentos = JSON.parse(dados);
    res.json(equipamentos);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao carregar equipamentos.' });
  }
});

// Rota para cadastrar usuários
app.post('/usuario', (req, res) => {
  const { usuario, email, senha, setor, tipoUsuario } = req.body;
  let usuarios = [];

  try {
    const dados = fs.readFileSync(caminhoUsuarios);
    usuarios = JSON.parse(dados);
  } catch (err) {
    console.error('Erro ao ler usuários:', err);
  }

  usuarios.push({ usuario, email, senha, setor, tipoUsuario });

  try {
    fs.writeFileSync(caminhoUsuarios, JSON.stringify(usuarios, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: 'Erro ao criar usuário.' });
  }
});

// Rota para listar todos os usuários
app.get('/usuarios', (req, res) => {
  try {
    const dados = fs.readFileSync(caminhoUsuarios, 'utf8');
    const usuarios = JSON.parse(dados);
    res.json(usuarios);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao carregar usuários.' });
  }
});

// Reduz a quantidade de equipamento quando uma reserva é feita
function reduzirEquipamento(id) {
  try {
    const equipamentos = JSON.parse(fs.readFileSync(caminhoEquipamentos, 'utf8'));
    const index = equipamentos.findIndex(eq => eq.id === id);

    if (index === -1) return false;

    equipamentos[index].quantidade -= 1;
    if (equipamentos[index].quantidade < 0) equipamentos[index].quantidade = 0;

    fs.writeFileSync(caminhoEquipamentos, JSON.stringify(equipamentos, null, 2));
    return true;
  } catch (err) {
    console.error('Erro ao reduzir quantidade:', err);
    return false;
  } 
}

// Rota para reservar equipamento
app.post('/reservar-equipamento', (req, res) => {
  const { equipamentoId, destinatario, supervisor, setor, equipamento, inicio, fim } = req.body;

  let reservas = [];
  try {
    reservas = JSON.parse(fs.readFileSync(caminhoReservas, 'utf8'));
  } catch (err) {
    console.error('Erro ao ler reservas:', err);
  }

  const conflito = reservas.find(r =>
    r.equipamento === equipamento &&
    ((inicio >= r.inicio && inicio < r.fim) || (fim > r.inicio && fim <= r.fim))
  );

  if (conflito) {
    return res.json({
      success: false,
      message: `Equipamento já reservado entre ${conflito.inicio} e ${conflito.fim}`
    });
  }

  reservas.push({ destinatario, supervisor , setor, equipamento, inicio, fim });
  const reduziu = reduzirEquipamento(equipamentoId);

  if (!reduziu) {
    return res.json({ success: false, message: 'Erro ao reduzir quantidade do equipamento.' });
  }

  try {
    fs.writeFileSync(caminhoReservas, JSON.stringify(reservas, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erro ao salvar reserva.' });
  }
});

// Inicializa o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
