// Configuração do Firebase - SUAS CREDENCIAIS
const firebaseConfig = {
    apiKey: "AIzaSyBTe5Sxo_vXHXx_IpdExwtTPEcyXHowOXw",
    authDomain: "nuvemdamiao-efdb8.firebaseapp.com",
    databaseURL: "https://nuvemdamiao-efdb8-default-rtdb.firebaseio.com",
    projectId: "nuvemdamiao-efdb8",
    storageBucket: "nuvemdamiao-efdb8.firebasestorage.app",
    messagingSenderId: "607211096362",
    appId: "1:607211096362:web:813abafa5ea5a1f874b653"
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
        })
        .catch(error => {
            console.error('Erro ao acessar sala:', error);
            alert('Erro ao conectar com o servidor');
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
        })
        .catch(error => {
            console.error('Erro ao enviar palavra:', error);
            alert('Erro ao enviar palavra');
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
    
    const canvas = document.getElementById('wordcloud');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    WordCloud(canvas, {
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
    
    const canvas = document.getElementById('visualizacao');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    WordCloud(canvas, {
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

// Teste de conexão com Firebase
function testarConexao() {
    const testRef = database.ref('teste');
    testRef.set({
        mensagem: 'Conexão estabelecida em: ' + new Date().toLocaleString(),
        status: 'sucesso'
    }).then(() => {
        console.log('✅ Firebase conectado com sucesso!');
        testRef.remove(); // Limpar teste
    }).catch(error => {
        console.error('❌ Erro no Firebase:', error);
        alert('Erro de conexão com o Firebase. Verifique o console.');
    });
}

// Inicialização
mostrarTela('telaInicial');

// Executar teste quando a página carregar
window.addEventListener('load', testarConexao);

// Recarregar word cloud quando redimensionar a janela
window.addEventListener('resize', () => {
    if (salaAtual && userType === 'professor') {
        atualizarWordCloud(salaAtual.palavras);
    } else if (salaAtual && userType === 'aluno') {
        atualizarWordCloudVisualizacao(salaAtual.palavras);
    }
});
