/**
 * Estela Panelas - Cardápio Digital
 * Integrado com Supabase: produtos, categorias, cupons e configurações dinâmicas
 */

// --- Supabase ---
const SUPABASE_URL = 'https://ggjggdtcsdtlaynnwrku.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnamdnZHRjc2R0bGF5bm53cmt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NzMyNTMsImV4cCI6MjA5MTE0OTI1M30.a6oSuzqBOTX08ORtCHebcCX3VSrxIaAlSTBPOCY-rv0';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Configurações ---
const CONFIG = { telefone: "5531975540280" };

// --- Dados dinâmicos (Supabase) ---
let PRODUTOS = [];
let CATEGORIAS = [];
let CUPONS = [];
let ZONAS_FRETE = [];
let CONFIG_LOJA = null;

// --- Estado da Aplicação ---
let state = {
    carrinho: [],
    produtoSelecionado: null,
    quantidadeAtual: 1,
    descontoAtivo: 0,
    cupomAplicado: null,
    categoriaAtiva: 'todos',
    termoBusca: '',
    tipoEntrega: 'entrega',   // 'entrega' | 'retirada'
    freteAtivo: null          // null = não calculado | 0 = grátis | >0 = valor | -1 = fora da área
};

// --- Seletores DOM ---
const dom = {
    menu: document.getElementById("menu"),
    cart: document.getElementById("cart"),
    cartItems: document.getElementById("cartItems"),
    contador: document.getElementById("contador"),
    total: document.getElementById("total"),
    popup: document.getElementById("popup"),
    backdrop: document.getElementById("backdrop"),
    busca: document.getElementById("busca"),
    categoriesList: document.getElementById("categoriesList"),
    qntText: document.getElementById("qnt"),
    pImg: document.getElementById("pimg"),
    pNome: document.getElementById("pnome"),
    pDesc: document.getElementById("pdesc"),
    pPreco: document.getElementById("ppreco")
};

// =============================================
// CARREGAMENTO DO SUPABASE
// =============================================

async function inicializar() {
    dom.menu.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:3rem;">Carregando cardápio...</p>';
    try {
        await Promise.all([
            carregarCategorias(),
            carregarProdutos(),
            carregarCupons(),
            carregarConfiguracoesPublicas()
        ]);
    } catch (e) {
        dom.menu.innerHTML = '<p style="text-align:center;color:#FF4757;padding:3rem;">Erro ao carregar o cardápio. Tente recarregar a página.</p>';
    }
}

async function carregarCategorias() {
    const { data, error } = await sb
        .from('categories')
        .select('*')
        .order('order_position');
    if (error) throw error;
    CATEGORIAS = data || [];
    renderCategorias();
}

async function carregarProdutos() {
    const { data, error } = await sb
        .from('products')
        .select('*, categories(name, slug)')
        .eq('active', true)
        .or('archived.is.null,archived.eq.false')
        .order('created_at');
    if (error) throw error;
    PRODUTOS = (data || []).map(p => ({
        id: p.id,
        nome: p.name,
        desc: p.description || '',
        preco: parseFloat(p.price),
        img: p.image_url || 'Logo.png',
        stock: p.stock,
        cat: p.categories?.name || '',
        catSlug: p.categories?.slug || ''
    }));
    renderMenu();
}

async function carregarCupons() {
    const { data, error } = await sb
        .from('coupons')
        .select('code, discount_percent')
        .eq('active', true);
    if (error) throw error;
    CUPONS = data || [];
}

async function carregarConfiguracoesPublicas() {
    const [settingsRes, zonesRes] = await Promise.all([
        sb.from('store_settings').select('*').single(),
        sb.from('shipping_zones').select('*').eq('active', true)
    ]);
    if (!settingsRes.error && settingsRes.data) {
        CONFIG_LOJA = settingsRes.data;
    }
    if (!zonesRes.error) {
        ZONAS_FRETE = zonesRes.data || [];
    }
}

// =============================================
// RENDERIZAÇÃO
// =============================================

function renderCategorias() {
    dom.categoriesList.innerHTML = '<button class="cat-btn active" data-cat="todos">Todos</button>';
    CATEGORIAS.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'cat-btn';
        btn.dataset.cat = cat.name;
        btn.textContent = cat.name;
        dom.categoriesList.appendChild(btn);
    });
    vincularFiltros();
}

function renderMenu() {
    const filtrados = PRODUTOS.filter(p => {
        const matchBusca = p.nome.toLowerCase().includes(state.termoBusca.toLowerCase());
        const matchCat = state.categoriaAtiva === 'todos' || p.cat === state.categoriaAtiva;
        return matchBusca && matchCat;
    });

    // Ordenar: Disponíveis primeiro, Esgotados depois
    filtrados.sort((a, b) => {
        const aEsgotado = a.stock <= 0;
        const bEsgotado = b.stock <= 0;
        if (aEsgotado && !bEsgotado) return 1;
        if (!aEsgotado && bEsgotado) return -1;
        return 0; // Mantém a ordem original para os demais
    });

    if (filtrados.length === 0) {
        dom.menu.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:3rem;">Nenhum produto encontrado.</p>';
        return;
    }

    dom.menu.innerHTML = filtrados.map(p => {
        const esgotado = p.stock <= 0;
        return `
        <article class="product-card${esgotado ? ' esgotado' : ''}">
            <div class="img-wrapper">
                <img src="${p.img}" alt="${p.nome}" loading="lazy">
                ${esgotado ? '<span class="badge-esgotado">Esgotado</span>' : ''}
            </div>
            <div class="product-info">
                <h3 class="product-name">${p.nome}</h3>
                <div class="product-footer">
                    <span class="product-price">R$ ${p.preco.toFixed(2).replace('.', ',')}</span>
                    <button class="btn-add" onclick="abrirModal('${p.id}')" ${esgotado ? 'disabled' : ''}>
                        ${esgotado ? 'Esgotado' : 'Adicionar'}
                    </button>
                </div>
            </div>
        </article>
        `;
    }).join('');
}

function renderCarrinho() {
    const btnProx = document.getElementById('btnProximaEtapa');

    if (state.carrinho.length === 0) {
        dom.cartItems.innerHTML = '<div class="empty-cart-msg">Seu carrinho está vazio.</div>';
        dom.contador.innerText = "0";
        if (dom.total) dom.total.innerText = "0,00";
        if (btnProx) btnProx.disabled = true;
        renderTotalBreakdown();
        return;
    }

    let subtotal = 0;
    dom.cartItems.innerHTML = state.carrinho.map((item, index) => {
        const itemTotal = item.preco * item.qnt;
        subtotal += itemTotal;
        return `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${item.qnt}x ${item.nome}</h4>
                    <p>${item.obs ? `Obs: ${item.obs}` : ''}</p>
                    <strong>R$ ${itemTotal.toFixed(2).replace('.', ',')}</strong>
                </div>
                <div class="cart-item-actions">
                    <button class="btn-remove" onclick="removerDoCarrinho(${index})" aria-label="Remover item">🗑️</button>
                </div>
            </div>
        `;
    }).join('');

    const totalFinal = subtotal * (1 - state.descontoAtivo);
    if (dom.total) dom.total.innerText = totalFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    dom.contador.innerText = state.carrinho.reduce((acc, curr) => acc + curr.qnt, 0);
    if (btnProx) btnProx.disabled = false;
    renderTotalBreakdown();
}

// =============================================
// WIZARD — ETAPAS DO CHECKOUT
// =============================================

function navegarStep(n) {
    const step1 = document.getElementById('wizardStep1');
    const step2 = document.getElementById('wizardStep2');
    const dot1 = document.getElementById('stepDot1');
    const dot2 = document.getElementById('stepDot2');
    const line = document.getElementById('stepLine');

    if (n === 1) {
        step1.classList.add('active');
        step2.classList.remove('active');
        dot1.className = 'step-dot active';
        dot1.textContent = '1';
        dot2.className = 'step-dot';
        dot2.textContent = '2';
        if (line) line.style.background = 'var(--border-color)';
    } else {
        step1.classList.remove('active');
        step2.classList.add('active');
        dot1.className = 'step-dot done';
        dot1.textContent = '✓';
        dot2.className = 'step-dot active';
        dot2.textContent = '2';
        if (line) line.style.background = 'var(--primary)';
        renderTotalBreakdown();
        // Inicializa o bloco de entrega selecionado
        toggleTipoEntrega(state.tipoEntrega);
    }
}

function toggleTipoEntrega(tipo) {
    state.tipoEntrega = tipo;

    const cardRetirada = document.getElementById('cardRetirada');
    const cardEntrega = document.getElementById('cardEntrega');
    const blocoRetirada = document.getElementById('blocoRetirada');
    const blocoEntrega = document.getElementById('blocoEntrega');

    if (cardRetirada) cardRetirada.classList.toggle('selected', tipo === 'retirada');
    if (cardEntrega) cardEntrega.classList.toggle('selected', tipo === 'entrega');
    if (blocoRetirada) blocoRetirada.style.display = tipo === 'retirada' ? 'block' : 'none';
    if (blocoEntrega) blocoEntrega.style.display = tipo === 'entrega' ? 'block' : 'none';

    if (tipo === 'retirada') {
        state.freteAtivo = 0;
        const endEl = document.getElementById('enderecoLojaDisplay');
        if (endEl) {
            if (CONFIG_LOJA && (CONFIG_LOJA.address_street || CONFIG_LOJA.store_name)) {
                const parts = [
                    CONFIG_LOJA.store_name ? `<strong>${CONFIG_LOJA.store_name}</strong>` : '',
                    (CONFIG_LOJA.address_street && CONFIG_LOJA.address_number)
                        ? `${CONFIG_LOJA.address_street}, ${CONFIG_LOJA.address_number}`
                        : (CONFIG_LOJA.address_street || ''),
                    CONFIG_LOJA.address_complement || '',
                    CONFIG_LOJA.address_neighborhood
                        ? `${CONFIG_LOJA.address_neighborhood}${CONFIG_LOJA.address_city ? ' — ' + CONFIG_LOJA.address_city : ''}${CONFIG_LOJA.address_state ? '/' + CONFIG_LOJA.address_state : ''}`
                        : '',
                    CONFIG_LOJA.address_zip ? `CEP: ${CONFIG_LOJA.address_zip}` : '',
                    CONFIG_LOJA.address_reference ? `<em>📌 ${CONFIG_LOJA.address_reference}</em>` : ''
                ].filter(Boolean);
                endEl.innerHTML = parts.join('<br>');
            } else {
                endEl.innerHTML = '<span style="color:var(--text-muted);font-style:italic;">Endereço não configurado. Configure no painel admin.</span>';
            }
        }
    } else {
        // Ao voltar para entrega, recalcula o frete se o bairro estiver preenchido
        const bairro = document.getElementById('bairro')?.value;
        if (!bairro) state.freteAtivo = null;
        else state.freteAtivo = calcularFrete(bairro);
    }

    renderTotalBreakdown();
}

// =============================================
// FRETE
// =============================================

function normalizar(str) {
    return (str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function calcularFrete(bairro) {
    if (!bairro || ZONAS_FRETE.length === 0) return null;
    const bairroNorm = normalizar(bairro);
    const zona = ZONAS_FRETE.find(z => {
        const bairros = z.neighborhoods.split(',').map(b => normalizar(b));
        return bairros.includes(bairroNorm);
    });
    return zona ? parseFloat(zona.delivery_fee) : null;
}

// =============================================
// TOTAL BREAKDOWN
// =============================================

function renderTotalBreakdown() {
    const subtotal = state.carrinho.reduce((acc, p) => acc + (p.preco * p.qnt), 0);
    const desconto = subtotal * state.descontoAtivo;
    const fmt = (v) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

    // Atualiza infos resumidas da etapa 1
    if (dom.total) {
        dom.total.innerText = (subtotal - desconto).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    }
    const step1Breakdown = document.getElementById('step1Breakdown');
    if (step1Breakdown) {
        if (desconto > 0) {
            step1Breakdown.style.display = 'block';
            document.getElementById('step1TotalOriginal').textContent = fmt(subtotal);
            document.getElementById('step1Desconto').textContent = `- ${fmt(desconto)}`;
            document.getElementById('step1CupomLabel').textContent = `Desconto (${state.cupomAplicado}):`;
        } else {
            step1Breakdown.style.display = 'none';
        }
    }

    const els = {
        sub:       document.getElementById('breakdownSubtotal'),
        descRow:   document.getElementById('rowDesconto'),
        desc:      document.getElementById('breakdownDesconto'),
        freteRow:  document.getElementById('rowFrete'),
        frete:     document.getElementById('breakdownFrete'),
        tot:       document.getElementById('breakdownTotal'),
    };
    if (!els.sub) return; // etapa 2 não visível ainda

    const fmt = (v) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

    els.sub.textContent = fmt(subtotal);

    // Linha de desconto
    if (desconto > 0) {
        els.desc.textContent = `- ${fmt(desconto)}`;
        els.desc.style.color = 'var(--success)';
        els.descRow.style.display = 'flex';
    } else {
        els.descRow.style.display = 'none';
    }

    // Linha de frete
    let freteValorFinal = 0;
    if (state.tipoEntrega === 'entrega') {
        els.freteRow.style.display = 'flex';
        if (state.freteAtivo === null) {
            els.frete.textContent = '—';
            els.frete.style.color = 'var(--text-muted)';
        } else if (state.freteAtivo === 0) {
            els.frete.textContent = 'Grátis';
            els.frete.style.color = 'var(--success)';
            freteValorFinal = 0;
        } else {
            freteValorFinal = state.freteAtivo;
            els.frete.textContent = fmt(state.freteAtivo);
            els.frete.style.color = 'var(--text-main)';
        }
    } else {
        // Retirada — não exibe linha de frete (conforme solicitado)
        els.freteRow.style.display = 'none';
        freteValorFinal = 0;
    }

    els.tot.textContent = fmt(subtotal - desconto + freteValorFinal);
}

// =============================================
// CEP — AUTOCOMPLETE DEBOUNCED (sem botão)
// =============================================

let _cepTimer = null;

function onCepInput(e) {
    // Formata enquanto digita: 00000-000
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5, 8);
    e.target.value = v;

    const digits = v.replace(/\D/g, '');
    clearTimeout(_cepTimer);

    const status = document.getElementById('cepStatus');
    const errorEl = document.getElementById('cepError');

    if (digits.length === 8) {
        if (status) status.textContent = '⏳';
        if (errorEl) errorEl.style.display = 'none';
        _cepTimer = setTimeout(buscarCepAuto, 600);
    } else {
        if (status) status.textContent = '';
        // Oculta campos de endereço se CEP incompleto
        const endFields = document.getElementById('enderecoFields');
        const freteInfo = document.getElementById('freteInfo');
        if (endFields) endFields.style.display = 'none';
        if (freteInfo) freteInfo.style.display = 'none';
        state.freteAtivo = null;
        renderTotalBreakdown();
    }
}

async function buscarCepAuto() {
    const cepEl = document.getElementById('cep');
    const status = document.getElementById('cepStatus');
    const errorEl = document.getElementById('cepError');
    const endFields = document.getElementById('enderecoFields');
    const freteInfo = document.getElementById('freteInfo');
    const freteInfoText = document.getElementById('freteInfoText');

    const cep = cepEl?.value.replace(/\D/g, '');
    if (!cep || cep.length !== 8) return;

    if (status) status.textContent = '⏳';
    if (errorEl) errorEl.style.display = 'none';

    try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();

        if (data.erro) {
            if (status) status.textContent = '❌';
            if (errorEl) { errorEl.textContent = 'CEP não encontrado.'; errorEl.style.display = 'block'; }
            if (endFields) endFields.style.display = 'none';
            if (freteInfo) freteInfo.style.display = 'none';
            state.freteAtivo = null;
        } else {
            if (status) status.textContent = '✅';

            // Preenche campos de endereço
            const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
            set('endereco', data.logradouro);
            set('bairro', data.bairro);
            set('cidade', data.localidade);
            set('estado', data.uf);

            if (endFields) endFields.style.display = 'block';

            // Foco no campo número
            setTimeout(() => document.getElementById('numero')?.focus(), 100);

            // Calcula frete pelo bairro
            const frete = calcularFrete(data.bairro);
            state.freteAtivo = frete;

            // Exibe resultado do frete
            if (freteInfo && freteInfoText) {
                freteInfo.style.display = 'block';
                if (frete === null) {
                    freteInfo.className = 'frete-info frete-erro';
                    freteInfoText.textContent = `⚠️ ${data.bairro} está fora da área de entrega.`;
                } else if (frete === 0) {
                    freteInfo.className = 'frete-info frete-ok';
                    freteInfoText.textContent = `✅ Entrega grátis para ${data.bairro}!`;
                } else {
                    freteInfo.className = 'frete-info frete-ok';
                    freteInfoText.textContent = `🚗 Frete para ${data.bairro}: R$ ${frete.toFixed(2).replace('.', ',')}`;
                }
            }
        }
    } catch {
        if (status) status.textContent = '❌';
        if (errorEl) { errorEl.textContent = 'Erro ao buscar CEP. Tente novamente.'; errorEl.style.display = 'block'; }
        state.freteAtivo = null;
    }

    renderTotalBreakdown();
}

// =============================================
// AÇÕES DO CARRINHO
// =============================================

window.abrirModal = (id) => {
    const produto = PRODUTOS.find(p => p.id === id);
    if (!produto || produto.stock <= 0) return;
    state.produtoSelecionado = produto;
    state.quantidadeAtual = 1;

    dom.pImg.src = produto.img;
    dom.pNome.innerText = produto.nome;
    dom.pDesc.innerText = produto.desc;
    dom.pPreco.innerText = produto.preco.toFixed(2).replace('.', ',');
    dom.qntText.innerText = state.quantidadeAtual;
    atualizarSubtotalModal();
    
    document.getElementById("obs").value = "";
    document.getElementById("confirmar").style.display = "block";
    document.getElementById("postAddActions").style.display = "none";

    toggleModal(true);
};

function atualizarSubtotalModal() {
    if (!state.produtoSelecionado) return;
    const sub = state.produtoSelecionado.preco * state.quantidadeAtual;
    document.getElementById('psubtotal').innerText = sub.toFixed(2).replace('.', ',');
}

function toggleModal(show) {
    dom.popup.classList.toggle('active', show);
    dom.backdrop.classList.toggle('active', show);
}

window.removerDoCarrinho = (index) => {
    state.carrinho.splice(index, 1);
    renderCarrinho();
};

// =============================================
// EVENT LISTENERS
// =============================================

// Quantidade no Modal
document.getElementById("mais").onclick = () => {
    const maxQty = state.produtoSelecionado?.stock || 0;
    if (state.quantidadeAtual < maxQty) {
        state.quantidadeAtual++;
        dom.qntText.innerText = state.quantidadeAtual;
        atualizarSubtotalModal();
    } else {
        alert("Quantidade máxima em estoque atingida!");
    }
};

document.getElementById("menos").onclick = () => {
    if (state.quantidadeAtual > 1) {
        state.quantidadeAtual--;
        dom.qntText.innerText = state.quantidadeAtual;
        atualizarSubtotalModal();
    }
};

// Adicionar ao Carrinho
document.getElementById("confirmar").onclick = () => {
    const obs = document.getElementById("obs").value;
    state.carrinho.push({ ...state.produtoSelecionado, qnt: state.quantidadeAtual, obs });
    renderCarrinho();
    document.getElementById("confirmar").style.display = "none";
    document.getElementById("postAddActions").style.display = "flex";
};

document.getElementById("btnContinuar").onclick = () => toggleModal(false);
document.getElementById("btnIrCarrinho").onclick = () => { toggleModal(false); toggleCart(true); };

// Filtros de Categoria
function vincularFiltros() {
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.categoriaAtiva = btn.dataset.cat;
            renderMenu();
        };
    });
}

// Busca
dom.busca.onkeyup = (e) => {
    state.termoBusca = e.target.value;
    renderMenu();
};

// Cupom
document.getElementById("btnCupom").onclick = async () => {
    const codigo = document.getElementById("cupom").value.trim().toUpperCase();
    if (!codigo) return;

    const cupom = CUPONS.find(c => c.code === codigo);
    if (cupom) {
        state.descontoAtivo = parseFloat(cupom.discount_percent) / 100;
        state.cupomAplicado = codigo;
        alert(`✅ Cupom ${codigo} aplicado! ${cupom.discount_percent}% de desconto.`);
        renderCarrinho();
    } else {
        alert("❌ Cupom inválido ou expirado.");
    }
};

// CEP — debounced autocomplete
document.getElementById("cep").oninput = onCepInput;

// Tipo de Entrega — radio buttons
document.querySelectorAll('input[name="tipoEntrega"]').forEach(radio => {
    radio.onchange = () => toggleTipoEntrega(radio.value);
});

// Wizard — Navegação
document.getElementById("btnProximaEtapa").onclick = () => {
    if (state.carrinho.length === 0) return;
    navegarStep(2);
};

document.getElementById("btnVoltarEtapa").onclick = () => navegarStep(1);

// Enviar Pedido via WhatsApp
document.getElementById("btnEnviar").onclick = async () => {
    const btn = document.getElementById("btnEnviar");
    if (state.carrinho.length === 0) return alert("Seu carrinho está vazio!");

    const nomeCliente = document.getElementById("clienteNome")?.value.trim() || '';
    const telefoneCliente = document.getElementById("clienteTelefone")?.value.trim() || '';

    if (!nomeCliente) return alert("Por favor, informe seu nome completo.");
    if (!telefoneCliente) return alert("Por favor, informe seu telefone/WhatsApp.");

    const tipoEntrega = state.tipoEntrega;
    let camposEndereco = null;
    let freteValor = 0;

    if (tipoEntrega === 'entrega') {
        const cep = document.getElementById("cep").value;
        const logradouro = document.getElementById("endereco").value;
        const numero = document.getElementById("numero").value;
        const complemento = document.getElementById("complemento").value || '';
        const bairro = document.getElementById("bairro").value;
        const cidade = document.getElementById("cidade").value;
        const estado = document.getElementById("estado").value;

        if (!cep || !logradouro || !numero) {
            return alert("Por favor, preencha o endereço completo (CEP, Logradouro e Número).");
        }
        if (state.freteAtivo === null) {
            return alert("⚠️ O bairro informado está fora da área de entrega. Escolha 'Retirada' ou verifique o CEP.");
        }

        camposEndereco = { cep, logradouro, numero, complemento, bairro, cidade, estado };
        freteValor = state.freteAtivo || 0;
    }

    btn.disabled = true;
    btn.innerHTML = `<span>Aguarde um momento...</span>`;

    try {
        // Validação de Estoque em Tempo Real
        const productIds = state.carrinho.map(p => p.id);
        const { data: freshStock, error: stockErr } = await sb
            .from('products')
            .select('id, name, stock')
            .in('id', productIds);
            
        if (stockErr) throw stockErr;

        let outOfStockItem = null;
        for (const itemCart of state.carrinho) {
            const dbItem = freshStock.find(p => p.id === itemCart.id);
            if (!dbItem || dbItem.stock < itemCart.qnt) {
                outOfStockItem = dbItem ? dbItem.name : itemCart.nome;
                break;
            }
        }

        if (outOfStockItem) {
            btn.disabled = false;
            btn.innerHTML = `<span>Enviar Pedido via WhatsApp</span><span class="wa-icon">📱</span>`;
            alert(`O produto ${outOfStockItem} é tão delicioso que esgotou (ou não tem a quantidade solicitada) =) \nVeja as outras opções que são tão gostosas quanto ele!`);
            toggleCart(false);
            carregarProdutos(); // Recarrega vitrine para atualizar estoque/esgotados
            return;
        }
        const subtotal = state.carrinho.reduce((acc, p) => acc + (p.preco * p.qnt), 0);
        const desconto = subtotal * state.descontoAtivo;
        const totalFinal = subtotal - desconto + freteValor;

        // 1. Salvar cliente na tabela clientes (fire and forget)
        const clientePayload = {
            nome: nomeCliente,
            celular: telefoneCliente,
            cep: camposEndereco?.cep || null,
            endereco: camposEndereco
                ? `${camposEndereco.logradouro}, ${camposEndereco.numero}${camposEndereco.complemento ? ', ' + camposEndereco.complemento : ''} — ${camposEndereco.bairro}, ${camposEndereco.cidade}/${camposEndereco.estado}`
                : null
        };
        sb.from('clientes').insert(clientePayload).then(({ error }) => {
            if (error) console.warn('Aviso: não foi possível salvar cliente:', error.message);
        });

        function generateUUID() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
        const orderId = window.crypto && crypto.randomUUID ? crypto.randomUUID() : generateUUID();

        // 2. Salvar Pedido no Supabase
        const orderPayload = {
            id: orderId,
            customer_name: nomeCliente,
            customer_phone: telefoneCliente,
            customer_address: camposEndereco || { tipo: 'retirada' },
            subtotal,
            discount: state.descontoAtivo * 100,
            total: totalFinal,
            status: 'pendente',
            delivery_type: tipoEntrega,
            shipping_fee: freteValor
        };

        // Sem usar .select() ou .single() para não exigir permissão de RLS de SELECT na tabela orders
        const { error: orderError } = await sb.from('orders').insert(orderPayload);
        if (orderError) throw orderError;

        // 3. Salvar Itens do Pedido
        const itemsPayload = state.carrinho.map(p => ({
            order_id: orderId,
            product_id: p.id,
            product_name: p.nome,
            quantity: p.qnt,
            unit_price: p.preco,
            total_price: p.preco * p.qnt,
            observations: p.obs || null
        }));
        const { error: itemsError } = await sb.from('order_items').insert(itemsPayload);
        if (itemsError) throw itemsError;

        // 4. Baixa Automática de Estoque
        // Observação: a lógica do estoque agora roda atomicamente via banco de dados usando um Trigger (Postgres).

        // 5. Montar mensagem WhatsApp
        const fmtBRL = (v) => `R$ ${v.toFixed(2).replace('.', ',')}`;
        let msg = `*📦 NOVO PEDIDO — Estela Panelas*%0A%0A`;
        msg += `*👤 Cliente:* ${nomeCliente}%0A`;
        msg += `*📱 Telefone:* ${telefoneCliente}%0A%0A`;

        if (tipoEntrega === 'retirada') {
            msg += `*🏠 Tipo:* Retirada no Local%0A%0A`;
        } else {
            msg += `*🚗 Tipo:* Entrega%0A`;
            msg += `*📍 Endereço:*%0A`;
            msg += `${camposEndereco.logradouro}, ${camposEndereco.numero}%0A`;
            if (camposEndereco.complemento) msg += `Comp: ${camposEndereco.complemento}%0A`;
            msg += `${camposEndereco.bairro} — ${camposEndereco.cidade}/${camposEndereco.estado}%0A`;
            msg += `CEP: ${camposEndereco.cep}%0A%0A`;
        }

        msg += `*🛒 Itens:*%0A`;
        state.carrinho.forEach(p => {
            msg += `✅ *${p.qnt}x ${p.nome}* — ${fmtBRL(p.preco * p.qnt)}%0A`;
            if (p.obs) msg += `_Obs: ${p.obs}_%0A`;
        });
        msg += `%0A`;
        msg += `*💵 Subtotal:* ${fmtBRL(subtotal)}%0A`;
        if (desconto > 0) msg += `*🎟️ Desconto (${state.cupomAplicado}):* -${fmtBRL(desconto)}%0A`;
        if (tipoEntrega === 'entrega') msg += `*🚚 Frete:* ${freteValor === 0 ? 'Grátis' : fmtBRL(freteValor)}%0A`;
        msg += `*💰 TOTAL: ${fmtBRL(totalFinal)}*`;

        // Exibir tela de sucesso e em 1 segundo mandar pro WhatsApp
        const overlay = document.getElementById('orderSuccessOverlay');
        if (overlay) overlay.style.display = 'flex';

        setTimeout(() => {
            window.open(`https://wa.me/${CONFIG.telefone}?text=${msg}`);
            // Limpar carrinho e fechar após o envio para o WhatsApp
            if (overlay) overlay.style.display = 'none';
            state.carrinho = [];
            renderCarrinho();
            toggleCart(false);
            carregarProdutos(); // Atualiza painel para espelhar estoque real localmente
            btn.disabled = false;
            btn.innerHTML = `<span>Enviar Pedido via WhatsApp</span><span class="wa-icon">📱</span>`;
        }, 1800);

    } catch (err) {
        console.error("Erro ao processar pedido:", err);
        alert("Houve um problema ao registrar o pedido. Se persistir, contate: " + CONFIG.telefone);
        btn.disabled = false;
        btn.innerHTML = `<span>Enviar Pedido via WhatsApp</span><span class="wa-icon">📱</span>`;
    }
};

// UI Controls
const toggleCart = (show) => {
    dom.cart.classList.toggle('open', show);
    dom.backdrop.classList.toggle('active', show);
    dom.cart.setAttribute('aria-hidden', String(!show));
    if (show) navegarStep(1); // Sempre abre na etapa 1
};

document.getElementById("btnCart").onclick = () => toggleCart(true);
document.getElementById("closeCart").onclick = () => toggleCart(false);
document.getElementById("closeModal").onclick = () => toggleModal(false);
dom.backdrop.onclick = () => { toggleCart(false); toggleModal(false); };

// =============================================
// INICIALIZAR
// =============================================
inicializar();