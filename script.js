// Elementos DOM
const catalogContainer = document.getElementById('catalog-container');
const filtersContainer = document.getElementById('filters-container');
const searchInput = document.getElementById('search-input');
const quizContainer = document.getElementById('quiz-container');
const quizContent = document.getElementById('quiz-content');
const quizTitle = document.getElementById('quiz-title');
const quizProgress = document.getElementById('quiz-progress');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const submitBtn = document.getElementById('submit-btn');
const closeQuiz = document.getElementById('close-quiz');
const letreiro = document.querySelector('.warning-demo');
const wrapper = document.querySelector('.demo-warning');

// Estado da aplicação
let currentFilter = 'all';
let currentSearch = '';
let currentQuiz = null;
let currentQuestionIndex = 0;
let userAnswers = {};
let livros = [];
let quizzes = {};

function getQtdPerguntas(quizId) {
    if (!quizzes[quizId] || !quizzes[quizId].perguntas) {
        return 0;
    }
    return quizzes[quizId].perguntas.length;
}

// Função para carregar dados remotos
async function loadExternalData() {
    try {
        // Exibir estado de carregamento
        catalogContainer.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Carregando catálogo...</span>
            </div>
        `;

        // Carregar ambos simultaneamente
        const [livrosResponse, quizzesResponse] = await Promise.all([
            fetch('https://raw.githubusercontent.com/arthuru1722/reto-lib/main/livros.js?z='),
            fetch('https://raw.githubusercontent.com/arthuru1722/reto-lib/main/quizzes.js?z=')
        ]);

        if (!livrosResponse.ok) throw new Error('Falha ao carregar livros');
        if (!quizzesResponse.ok) throw new Error('Falha ao carregar quizzes');

        const livrosText = await livrosResponse.text();
        const quizzesText = await quizzesResponse.text();

        // Converter texto em objetos JavaScript
        livros = (new Function(`${livrosText}; return livros;`))();
        quizzes = (new Function(`${quizzesText}; return quizzes;`))();

        // Inicializar a aplicação
        initApp();
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        catalogContainer.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erro ao carregar dados</h3>
                <p>${error.message}</p>
                <button onclick="location.reload()">Tentar novamente</button>
            </div>
        `;
    }
}

// Inicializar a aplicação após carregar dados
function initApp() {
    // Extrair todas as categorias únicas
    const allCategories = ['all'];
    livros.forEach(livro => {
        livro.categorias.forEach(categoria => {
            if (!allCategories.includes(categoria)) {
                allCategories.push(categoria);
            }
        });
    });

    // Gerar botões de filtro
    filtersContainer.innerHTML = '';
    allCategories.forEach(categoria => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        if (categoria === 'all') btn.classList.add('active');
        btn.dataset.filter = categoria;
        btn.textContent = categoria === 'all' ? 'Todos' : categoria;
        filtersContainer.appendChild(btn);
    });

    // Renderizar catálogo
    renderCatalog();
}

// Renderizar catálogo
function renderCatalog() {
    catalogContainer.innerHTML = '';
    
    if (!livros || livros.length === 0) {
        catalogContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-book-open"></i>
                <h3>Nenhum livro carregado</h3>
                <p>Os dados ainda não foram carregados. Aguarde.</p>
            </div>
        `;
        return;
    }
    
    const filteredLivros = livros.filter(livro => {
        const filterMatch = currentFilter === 'all' || 
                            livro.categorias.includes(currentFilter);
        
        const searchMatch = livro.titulo.toLowerCase().includes(currentSearch.toLowerCase()) || 
                            livro.autor.toLowerCase().includes(currentSearch.toLowerCase());
        
        return filterMatch && searchMatch;
    });
    
    if (filteredLivros.length === 0) {
        catalogContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-book-open"></i>
                <h3>Nenhum livro encontrado</h3>
                <p>Tente alterar seus filtros ou termos de pesquisa</p>
            </div>
        `;
        return;
    }
    
    filteredLivros.forEach(livro => {
        const qtdRealPerguntas = getQtdPerguntas(livro.quizUrl);
        
        const categoriasHTML = livro.categorias.map(categoria => 
            `<span class="book-category">${categoria}</span>`
        ).join('');
        
        const bookCard = document.createElement('div');
        bookCard.className = 'book-card';
        bookCard.dataset.id = livro.id;
        
        bookCard.innerHTML = `
            <div class="book-cover">
                <img src="${livro.capa}" alt="${livro.titulo}">
            </div>
            <div class="book-info">
                <h3 class="book-title">${livro.titulo}</h3>
                <p class="book-author">${livro.autor}</p>
                <div class="book-categories">
                    ${categoriasHTML}
                </div>
                <div class="book-meta">
                    <div>
                        <i class="fas fa-calendar"></i>
                        <span>${livro.dataLancamento}</span>
                    </div>
                    <div>
                        <i class="fas fa-question-circle"></i>
                        <span>${qtdRealPerguntas} perguntas</span>
                    </div>
                </div>
                <div class="book-meta">
                    <div>
                        <i class="fas fa-book"></i>
                        <span>${livro.paginas} páginas</span>
                    </div>
                    <div>
                        <i class="fas fa-clock"></i>
                        <span>${livro.tempoLeitura} horas</span>
                    </div>
                </div>
            </div>
        `;
        
        bookCard.addEventListener('click', () => openQuiz(livro.quizUrl));
        catalogContainer.appendChild(bookCard);
    });
}

// Abrir questionário
function openQuiz(quizId) {
    if (!quizzes || Object.keys(quizzes).length === 0) {
        alert('Dados ainda não carregados. Tente novamente em alguns instantes.');
        return;
    }
    
    if (!quizzes[quizId]) {
        alert('Questionário ainda não disponível para este livro.');
        return;
    }
    
    currentQuiz = quizzes[quizId];
    currentQuestionIndex = 0;
    userAnswers = {};
    
    const livro = livros.find(l => l.quizUrl === quizId);
    quizTitle.textContent = `Questionário: ${livro.titulo}`;
    
    renderQuestion();
    quizContainer.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Renderizar pergunta atual
function renderQuestion() {
    quizContent.innerHTML = '';
    
    const question = currentQuiz.perguntas[currentQuestionIndex];
    if (!question) return;
    
    const questionEl = document.createElement('div');
    questionEl.className = 'question';
    
    questionEl.innerHTML = `
        <h4 class="question-text">${currentQuestionIndex + 1}. ${question.pergunta}</h4>
        <div class="options" id="options-container"></div>
    `;
    
    quizContent.appendChild(questionEl);
    
    const optionsContainer = document.getElementById('options-container');
    question.opcoes.forEach((opcao, index) => {
        const optionEl = document.createElement('div');
        optionEl.className = 'option';
        if (userAnswers[question.id] === index) {
            optionEl.classList.add('selected');
        }
        optionEl.textContent = opcao;
        optionEl.dataset.index = index;
        
        optionEl.addEventListener('click', () => {
            document.querySelectorAll('.option').forEach(opt => {
                opt.classList.remove('selected');
            });
            
            optionEl.classList.add('selected');
            userAnswers[question.id] = index;
        });
        
        optionsContainer.appendChild(optionEl);
    });
    
    // Atualizar progresso
    quizProgress.textContent = `Pergunta ${currentQuestionIndex + 1} de ${currentQuiz.perguntas.length}`;
    
    // Atualizar botões
    prevBtn.style.display = currentQuestionIndex > 0 ? 'block' : 'none';
    nextBtn.style.display = currentQuestionIndex < currentQuiz.perguntas.length - 1 ? 'block' : 'none';
    submitBtn.style.display = currentQuestionIndex === currentQuiz.perguntas.length - 1 ? 'block' : 'none';
}

// Navegar entre perguntas
function navigateQuestion(direction) {
    if (direction === 'prev' && currentQuestionIndex > 0) {
        currentQuestionIndex--;
    } else if (direction === 'next' && currentQuestionIndex < currentQuiz.perguntas.length - 1) {
        currentQuestionIndex++;
    }
    
    renderQuestion();
}

// Submeter questionário
function submitQuiz() {
    // Calcular pontuação
    let score = 0;
    currentQuiz.perguntas.forEach(pergunta => {
        if (userAnswers[pergunta.id] === pergunta.respostaCorreta) {
            score++;
        }
    });
    
    const percentage = Math.round((score / currentQuiz.perguntas.length) * 100);
    
    // Exibir resultados
    quizContent.innerHTML = `
        <div class="results">
            <h3 class="results-title">Resultado do Questionário</h3>
            <p>Você respondeu ${currentQuiz.perguntas.length} perguntas sobre o livro</p>
            <div class="score">${percentage}%</div>
            <p class="score-text">${score} de ${currentQuiz.perguntas.length} respostas corretas</p>
            <button class="restart-btn" id="restart-btn">Refazer Questionário</button>
        </div>
    `;
    
    // Ocultar botões de navegação
    prevBtn.style.display = 'none';
    nextBtn.style.display = 'none';
    submitBtn.style.display = 'none';
    
    // Adicionar evento ao botão de refazer
    document.getElementById('restart-btn').addEventListener('click', () => {
        currentQuestionIndex = 0;
        userAnswers = {};
        renderQuestion();
    });
}

// Fechar questionário
function closeQuizModal() {
    quizContainer.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Event Listeners
filtersContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');
        
        currentFilter = e.target.dataset.filter;
        renderCatalog();
    }
});

searchInput.addEventListener('input', () => {
    currentSearch = searchInput.value;
    renderCatalog();
});

prevBtn.addEventListener('click', () => navigateQuestion('prev'));
nextBtn.addEventListener('click', () => navigateQuestion('next'));
submitBtn.addEventListener('click', submitQuiz);
closeQuiz.addEventListener('click', closeQuizModal);
quizContainer.addEventListener('click', (e) => {
    if (e.target === quizContainer) closeQuizModal();
});

if (letreiro.scrollWidth > wrapper.clientWidth) {
  letreiro.style.animationPlayState = 'running';
}

// Inicializar carregando dados remotos
loadExternalData();