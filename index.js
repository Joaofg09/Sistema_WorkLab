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
const caminhoHistorico = path.join(__dirname, './dados/historico.json');
const caminhoHistoricoEquipamentos = path.join(__dirname, './dados/historico_equipamentos.json');


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

  // Etapa de gravação do histórico com logs
  console.log("Salvando no histórico...");

  const novaEntradaHistorico = {
    usuario,
    setor,
    sala,
    inicio,
    fim,
    registrado_em: new Date().toISOString()
  };

  console.log("Nova entrada de histórico:", novaEntradaHistorico);

  let historico = [];

  if (fs.existsSync(caminhoHistorico)) {
    const dadosHistorico = fs.readFileSync(caminhoHistorico, 'utf8');
    historico = JSON.parse(dadosHistorico);
  } else {
    console.log("Arquivo histórico ainda não existe. Será criado.");
  }

  historico.push(novaEntradaHistorico);

  fs.writeFileSync(caminhoHistorico, JSON.stringify(historico, null, 2));
  console.log("Histórico salvo com sucesso.");

  res.json({ success: true });

} catch (err) {
  console.error("Erro ao salvar agendamento ou histórico:", err);
  res.json({ success: false, message: 'Erro ao salvar agendamento ou histórico.' });
}
});

app.get('/historico', (req, res) => {
  fs.readFile(caminhoHistorico, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).send('Erro ao carregar histórico');
    }
    const historico = JSON.parse(data);
    res.json(historico);
  });
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

  if (!equipamentoId || !destinatario || !supervisor || !setor || !equipamento || !inicio || !fim) {
    return res.status(400).json({ success: false, message: 'Dados incompletos para reserva.' });
  }

  let reservas = [];

  try {
    reservas = JSON.parse(fs.readFileSync(caminhoReservas, 'utf8'));
  } catch {
    // arquivo pode não existir, segue com array vazio
  }

  const inicioReq = new Date(inicio).getTime();
  const fimReq = new Date(fim).getTime();

  const conflito = reservas.find(r => {
    const inicioReserva = new Date(r.inicio).getTime();
    const fimReserva = new Date(r.fim).getTime();
    return r.equipamento === equipamento &&
      ((inicioReq >= inicioReserva && inicioReq < fimReserva) || (fimReq > inicioReserva && fimReq <= fimReserva));
  });

  if (conflito) {
    return res.status(409).json({
      success: false,
      message: `Equipamento já reservado entre ${conflito.inicio} e ${conflito.fim}`
    });
  }

  const reduziu = reduzirEquipamento(equipamentoId);
  if (!reduziu) {
    return res.status(500).json({ success: false, message: 'Erro ao reduzir quantidade do equipamento.' });
  }

  reservas.push({ destinatario, supervisor, setor, equipamento, inicio, fim });

  try {
    fs.writeFileSync(caminhoReservas, JSON.stringify(reservas, null, 2));

    const caminhoHistoricoEquipamentos = path.join(__dirname, './dados/historico_equipamentos.json');

    const novaEntradaHistoricoEquipamento = {
      destinatario,
      supervisor,
      setor,
      equipamento,
      inicio,
      fim,
      registrado_em: new Date().toISOString()
    };

    let historicoEquip = [];

    if (fs.existsSync(caminhoHistoricoEquipamentos)) {
      const dadosHistoricoEquip = fs.readFileSync(caminhoHistoricoEquipamentos, 'utf8');
      historicoEquip = JSON.parse(dadosHistoricoEquip);
    }

    historicoEquip.push(novaEntradaHistoricoEquipamento);

    fs.writeFileSync(caminhoHistoricoEquipamentos, JSON.stringify(historicoEquip, null, 2));

    return res.json({ success: true });

  } catch (err) {
    console.error('Erro ao salvar reserva ou histórico:', err);
    return res.status(500).json({ success: false, message: 'Erro ao salvar reserva ou histórico.' });
  }
});



app.get('/historico-equipamentos', (req, res) => {
  const caminhoHistoricoEquipamentos = path.join(__dirname, './dados/historico_equipamentos.json');

  fs.readFile(caminhoHistoricoEquipamentos, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).send('Erro ao carregar histórico de equipamentos');
    }

    const historico = JSON.parse(data);
    res.json(historico);
  });
});


// Inicializa o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
