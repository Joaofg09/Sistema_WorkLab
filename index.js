const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

/* const usuarios = [
  { usuario: 'joao', senha: '123', setor: 'TI', tipoUsuario: 'supervisor' },
  { usuario: 'maria', senha: 'abc', setor: 'RH', tipoUsuario: 'funcionario' },
  { usuario: 'jana', senha: '456', setor: 'Marketing', tipoUsuario: 'supervisor' },
  { usuario: 'paulo', senha: 'xyz', setor: 'Financeiro', tipoUsuario: 'funcionario' }
];*/

/* const equipamentos = [
  {
    nome: 'Notebook',
    descricao: 'Notebook Thinkpad',
    quantidade: 20
  },
  {
    nome: 'Projetor',
    descricao: 'Mini Projetor portátil',
    quantidade: 5
  },
  {
    nome: 'Teclado',
    descricao: 'Teclado Multilaser',
    quantidade: 20
  },
]
*/
const caminhoArquivo = path.join(__dirname, 'agendamentos.json');
const caminhoEquipamentos = path.join(__dirname, 'equipamentos.json');
const caminhoUsuarios = path.join(__dirname, 'usuarios.json');

// Rota de login
app.post('/login', (req, res) => {
  const { usuario, senha } = req.body;
  
  const dados = fs.readFileSync(caminhoUsuarios, {encoding: 'utf8'});
  let usuarios = JSON.parse(dados)

  const user = usuarios.find(u => u.usuario === usuario && u.senha === senha);

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

// Rota de agendamento com verificação de conflito
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

  const conflito = agendamentos.find(ag => {
    return (
      ag.sala === sala &&
      ((inicio >= ag.inicio && inicio < ag.fim) || (fim > ag.inicio && fim <= ag.fim))
    );
  });

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

      // Verifica se o setor do agendamento bate com o do supervisor
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

// Rota para os equipamentos

app.post('/equipamento', (req, res) => {
  const {nome, descricao , quantidade} = req.body;

  let equipamentos = [];

  try {
    const dados = fs.readFileSync(caminhoEquipamentos);
    equipamentos = JSON.parse(dados);
  } catch (err) {
    console.error('Erro ao ler equipamentos:', err);
  }
  
  equipamentos.push({nome, descricao, quantidade});
  
  try {
    fs.writeFileSync(caminhoEquipamentos, JSON.stringify(equipamentos, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: 'Erro ao adicionar equipamento.' });
  }  

})

app.get('/equipamento', (req, res) => {
    try {
    const dados = fs.readFileSync(caminhoEquipamentos);
    const equipamentos = JSON.parse(dados);
    res.json(equipamentos);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao carregar equipamentos.' });
  }
})


// Rota para os usuarios

app.post('/usuario', (req, res) => {
  const {usuario, email , senha, setor, tipoUsuario} = req.body;
  
  let usuarios = [];

  try {
    const dados = fs.readFileSync(caminhoUsuarios);
    usuarios = JSON.parse(dados);
  } catch (err) {
    console.error('Erro ao ler usuarios:', err);
  }
  
  usuarios.push({usuario, email, senha, setor, tipoUsuario});
  
  try {
    fs.writeFileSync(caminhoUsuarios, JSON.stringify(usuarios, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: 'Erro ao criar usuarios.' });
  }  
})

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
