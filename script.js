// Configuração do Firebase (você precisa criar uma conta gratuita)
const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "seu-projeto.firebaseapp.com",
    databaseURL: "https://seu-projeto.firebaseio.com",
    projectId: "seu-projeto",
    storageBucket: "seu-projeto.appspot.com",
    messagingSenderId: "123456789",
    appId: "seu-app-id"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let salaAtual = null;
let userType = null;

// Funções de Navegação
function mostrarTela(telaId) {
    document.querySelectorAll('.tela').forEach(tela => {
        tela.style.display = 'none';
    });
    document.getElementById(telaId).style.display = 'block';
}

function mostrarCriarSala() {
    document.getElementById('criarSala').style.display = 'block';
}

// Criar Sala (Professor)
function criarSala() {
    const nomeSala = document.getElementById('nomeSala').value;
    if (!nomeSala) {
        alert('Digite um nome para a atividade');
        return;
    }

    const codigoSala = Math.random().toString(36).substr(2, 6).toUpperCase();
    
    salaAtual = {
        codigo: codigoSala,
        nome: nomeSala,
        status: 'aguardando',
        palavras: {}
    };

    // Salvar no Firebase
    database.ref('salas/' + codigoSala).set(salaAtual);

    // Atualizar interface professor
    document.getElementById('nomeSalaProfessor').textContent = nomeSala;
    document.getElementById('codigoSalaProfessor').textContent = codigoSala;
    
    mostrarTela('telaProfessor');
    userType = 'professor';

    // Ouvir mudanças na sala
    monitorarSala(codigoSala);
}

// Entrar na Sala (Aluno)
function entrarSala() {
    const codigo = document.getElementById('codigoAcesso').value.toUpperCase();
    const nomeAluno = document.getElementById('nomeAluno').value;

    if (!codigo || !nomeAluno) {
        alert('Preencha todos os campos');
        return;
    }

    database.ref('salas/' + codigo).once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                salaAtual = snapshot.val();
                salaAtual.codigo = codigo;
                
                document.getElementById('nomeSalaAluno').textContent = salaAtual.nome;
                mostrarTela('telaAluno');
                userType = 'aluno';

                monitorarSala(codigo);
            } else {
                alert('Sala não encontrada!');
            }
        });
}

// Monitorar mudanças na sala
function monitorarSala(codigo) {
    database.ref('salas/' + codigo).on('value', snapshot => {
        if (snapshot.exists()) {
            const sala = snapshot.val();
            
            if (userType === 'professor') {
                atualizarWordCloud(sala.palavras);
                atualizarEstatisticas(sala.palavras);
            } else if (userType === 'aluno') {
                atualizarInterfaceAluno(sala);
            }
        }
    });
}

// Controles do Professor
function iniciarAtividade() {
    database.ref('salas/' + salaAtual.codigo).update({
        status: 'ativa'
    });
}

function pausarAtividade() {
    database.ref('salas/' + salaAtual.codigo).update({
        status: 'pausada'
    });
}

function reiniciarAtividade() {
    if (confirm('Reiniciar apagará todas as palavras. Continuar?')) {
        database.ref('salas/' + salaAtual.codigo).update({
            palavras: {},
            status: 'aguardando'
        });
    }
}

// Envio de Palavras (Aluno)
function enviarPalavra() {
    const palavra = document.getElementById('palavraInput').value.trim();
    
    if (!palavra) {
        alert('Digite uma palavra');
        return;
    }

    if (salaAtual.status !== 'ativa') {
        alert('A atividade não está aberta para envio');
        return;
    }

    const palavraFormatada = palavra.toLowerCase();
    const palavraRef = database.ref('salas/' + salaAtual.codigo + '/palavras/' + palavraFormatada);

    palavraRef.transaction(current => (current || 0) + 1)
        .then(() => {
            document.getElementById('statusEnvio').textContent = '✅ Palavra enviada!';
            document.getElementById('palavraInput').value = '';
            setTimeout(() => {
                document.getElementById('statusEnvio').textContent = '';
            }, 2000);
        });
}

// Atualizar Interface do Aluno
function atualizarInterfaceAluno(sala) {
    const aguardando = document.getElementById('aguardando');
    const areaParticipacao = document.getElementById('areaParticipacao');
    const visualizacao = document.getElementById('visualizacao');

    if (sala.status === 'ativa') {
        aguardando.style.display = 'none';
        areaParticipacao.style.display = 'block';
        visualizacao.style.display = 'block';
        atualizarWordCloudVisualizacao(sala.palavras);
    } else {
        aguardando.style.display = 'block';
        areaParticipacao.style.display = 'none';
        visualizacao.style.display = 'none';
    }
}

// Atualizar Word Cloud
function atualizarWordCloud(palavras) {
    const lista = Object.entries(palavras || {}).map(([text, size]) => [text, size * 10]);
    
    WordCloud(document.getElementById('wordcloud'), {
        list: lista,
        gridSize: 10,
        weightFactor: 2,
        backgroundColor: '#ffffff',
        color: () => {
            const colors = ['#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8', '#6f42c1'];
            return colors[Math.floor(Math.random() * colors.length)];
        }
    });
}

function atualizarWordCloudVisualizacao(palavras) {
    const lista = Object.entries(palavras || {}).map(([text, size]) => [text, size * 10]);
    
    WordCloud(document.getElementById('visualizacao'), {
        list: lista,
        gridSize: 10,
        weightFactor: 2,
        backgroundColor: '#ffffff'
    });
}

// Estatísticas
function atualizarEstatisticas(palavras) {
    const total = Object.values(palavras || {}).reduce((sum, count) => sum + count, 0);
    const unique = Object.keys(palavras || {}).length;
    
    document.getElementById('estatisticas').innerHTML = `
        <h3>Estatísticas</h3>
        <p>Total de palavras: <strong>${total}</strong></p>
        <p>Palavras únicas: <strong>${unique}</strong></p>
        <p>Top palavras:</p>
        ${Object.entries(palavras || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([word, count]) => 
                `<span class="palavra-item">${word} (${count})</span>`
            ).join('')}
    `;
}

// Inicialização
mostrarTela('telaInicial');
