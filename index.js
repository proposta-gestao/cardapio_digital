/**
         * Estela Panelas - Cardápio Digital
         * Integrado com Supabase: produtos, categorias e cupons dinâmicos
         */

        // --- Supabase ---
        const SUPABASE_URL = 'https://ggjggdtcsdtlaynnwrku.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnamdnZHRjc2R0bGF5bm53cmt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NzMyNTMsImV4cCI6MjA5MTE0OTI1M30.a6oSuzqBOTX08ORtCHebcCX3VSrxIaAlSTBPOCY-rv0';
        const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // --- Configurações ---
        const CONFIG = { telefone: "5531975540280" };

        // --- Dados dinâmicos (vindos do Supabase) ---
        let PRODUTOS = [];
        let CATEGORIAS = [];
        let CUPONS = [];

        // --- Estado da Aplicação ---
        let state = {
            carrinho: [],
            produtoSelecionado: null,
            quantidadeAtual: 1,
            descontoAtivo: 0,
            cupomAplicado: null,
            categoriaAtiva: 'todos',
            termoBusca: ''
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
                await Promise.all([carregarCategorias(), carregarProdutos(), carregarCupons()]);
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

        // =============================================
        // RENDERIZAÇÃO
        // =============================================

        function renderCategorias() {
            // Mantém o botão "Todos" e adiciona as categorias dinamicamente
            dom.categoriesList.innerHTML = '<button class="cat-btn active" data-cat="todos">Todos</button>';
            CATEGORIAS.forEach(cat => {
                const btn = document.createElement('button');
                btn.className = 'cat-btn';
                btn.dataset.cat = cat.name;
                btn.textContent = cat.name;
                dom.categoriesList.appendChild(btn);
            });
            // Re-vincular eventos de clique
            vincularFiltros();
        }

        function renderMenu() {
            const filtrados = PRODUTOS.filter(p => {
                const matchBusca = p.nome.toLowerCase().includes(state.termoBusca.toLowerCase());
                const matchCat = state.categoriaAtiva === 'todos' || p.cat === state.categoriaAtiva;
                return matchBusca && matchCat;
            });

            if (filtrados.length === 0) {
                dom.menu.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:3rem;">Nenhum produto encontrado.</p>';
                return;
            }

            dom.menu.innerHTML = filtrados.map(p => {
                const esgotado = p.stock <= 0;
                return `
                <article class="product-card${esgotado ? ' esgotado' : ''}">
                    <div style="position:relative;">
                        <img src="${p.img}" alt="${p.nome}" loading="lazy">
                        ${esgotado ? '<span class="badge-esgotado">Esgotado</span>' : ''}
                    </div>
                    <div class="product-info">
                        <h3 class="product-name">${p.nome}</h3>
                        <div class="product-footer">
                            <span class="product-price">R$ ${p.preco.toFixed(2)}</span>
                            <button class="btn-add" onclick="abrirModal('${p.id}')" ${esgotado ? 'disabled' : ''}>
                                ${esgotado ? 'Esgotado' : 'Adicionar'}
                            </button>
                        </div>
                    </div>
                </article>
            `}).join('');
        }

        function renderCarrinho() {
            if (state.carrinho.length === 0) {
                dom.cartItems.innerHTML = '<div class="empty-cart-msg">Seu carrinho está vazio.</div>';
                dom.contador.innerText = "0";
                dom.total.innerText = "0,00";
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
                            <strong>R$ ${itemTotal.toFixed(2)}</strong>
                        </div>
                        <div class="cart-item-actions">
                            <button class="btn-remove" onclick="removerDoCarrinho(${index})" aria-label="Remover item">🗑️</button>
                        </div>
                    </div>
                `;
            }).join('');

            const totalFinal = subtotal * (1 - state.descontoAtivo);
            dom.total.innerText = totalFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
            dom.contador.innerText = state.carrinho.reduce((acc, curr) => acc + curr.qnt, 0);
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
            dom.pPreco.innerText = produto.preco.toFixed(2);
            dom.qntText.innerText = state.quantidadeAtual;
            document.getElementById("obs").value = "";
            document.getElementById("confirmar").style.display = "block";
            document.getElementById("postAddActions").style.display = "none";

            toggleModal(true);
        };

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
            const maxQty = state.produtoSelecionado?.stock || 99;
            if (state.quantidadeAtual < maxQty) {
                state.quantidadeAtual++;
                dom.qntText.innerText = state.quantidadeAtual;
            }
        };

        document.getElementById("menos").onclick = () => {
            if (state.quantidadeAtual > 1) {
                state.quantidadeAtual--;
                dom.qntText.innerText = state.quantidadeAtual;
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

        // Cupom — valida no Supabase
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

        // CEP via ViaCEP
        async function buscarCep() {
            const cep = document.getElementById("cep").value.replace(/\D/g, '');
            const errorEl = document.getElementById("cepError");
            if (cep.length !== 8) {
                errorEl.innerText = "CEP inválido. Digite 8 números.";
                errorEl.style.display = "block";
                return;
            }
            errorEl.style.display = "none";
            const btn = document.getElementById("btnBuscaCep");
            btn.innerText = "Buscando...";
            btn.disabled = true;
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const data = await response.json();
                if (data.erro) {
                    errorEl.innerText = "CEP não encontrado.";
                    errorEl.style.display = "block";
                } else {
                    document.getElementById("endereco").value = data.logradouro;
                    document.getElementById("bairro").value = data.bairro;
                    document.getElementById("cidade").value = data.localidade;
                    document.getElementById("estado").value = data.uf;
                    document.getElementById("numero").focus();
                }
            } catch {
                errorEl.innerText = "Erro ao buscar CEP. Tente novamente.";
                errorEl.style.display = "block";
            } finally {
                btn.innerText = "Buscar";
                btn.disabled = false;
            }
        }

        document.getElementById("btnBuscaCep").onclick = buscarCep;
        document.getElementById("cep").onblur = buscarCep;
        document.getElementById("cep").oninput = (e) => {
            let v = e.target.value.replace(/\D/g, '');
            if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5, 8);
            e.target.value = v;
        };

        // WhatsApp
        document.getElementById("btnEnviar").onclick = () => {
            if (state.carrinho.length === 0) return alert("Seu carrinho está vazio!");
            const camposEndereco = {
                cep: document.getElementById("cep").value,
                logradouro: document.getElementById("endereco").value,
                numero: document.getElementById("numero").value,
                bairro: document.getElementById("bairro").value,
                cidade: document.getElementById("cidade").value
            };
            if (!camposEndereco.cep || !camposEndereco.logradouro || !camposEndereco.numero) {
                return alert("Por favor, preencha o endereço completo (CEP, Logradouro e Número).");
            }

            let msg = `*📦 NOVO PEDIDO - Estela Panelas*%0A%0A`;
            msg += `*📍 Endereço de Entrega:*%0A`;
            msg += `${camposEndereco.logradouro}, ${camposEndereco.numero}%0A`;
            if (document.getElementById("complemento").value) msg += `Comp: ${document.getElementById("complemento").value}%0A`;
            msg += `${camposEndereco.bairro} - ${camposEndereco.cidade}/${document.getElementById("estado").value}%0A`;
            msg += `CEP: ${camposEndereco.cep}%0A%0A`;
            msg += `*🛒 Itens do Pedido:*%0A`;
            state.carrinho.forEach(p => {
                msg += `✅ *${p.qnt}x ${p.nome}*%0A`;
                if (p.obs) msg += `_Obs: ${p.obs}_%0A`;
                msg += `Subtotal: R$ ${(p.preco * p.qnt).toFixed(2)}%0A%0A`;
            });
            if (state.descontoAtivo > 0) {
                msg += `*🎟️ Cupom ${state.cupomAplicado}:* -${(state.descontoAtivo * 100).toFixed(0)}%%0A`;
            }
            msg += `*💰 TOTAL: R$ ${dom.total.innerText}*`;
            window.open(`https://wa.me/${CONFIG.telefone}?text=${msg}`);
        };

        // UI Controls
        const toggleCart = (show) => {
            dom.cart.classList.toggle('open', show);
            dom.backdrop.classList.toggle('active', show);
        };

        document.getElementById("btnCart").onclick = () => toggleCart(true);
        document.getElementById("closeCart").onclick = () => toggleCart(false);
        document.getElementById("closeModal").onclick = () => toggleModal(false);
        dom.backdrop.onclick = () => { toggleCart(false); toggleModal(false); };

        // =============================================
        // INICIALIZAR
        // =============================================
        inicializar();