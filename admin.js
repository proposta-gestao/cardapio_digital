/**
         * Estela Panelas - Admin Panel
         */
        const SUPABASE_URL = 'https://ggjggdtcsdtlaynnwrku.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnamdnZHRjc2R0bGF5bm53cmt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NzMyNTMsImV4cCI6MjA5MTE0OTI1M30.a6oSuzqBOTX08ORtCHebcCX3VSrxIaAlSTBPOCY-rv0';
        const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // --- State ---
        let produtos = [];
        let categorias = [];
        let cupons = [];

        // --- DOM ---
        const $toast = document.getElementById('toast');

        function showToast(msg, type = '') {
            $toast.textContent = msg;
            $toast.className = 'toast show' + (type ? ' ' + type : '');
            setTimeout(() => { $toast.className = 'toast'; }, 3000);
        }

        function fecharModal(id) {
            document.getElementById(id).classList.remove('active');
        }

        function abrirModal(id) {
            document.getElementById(id).classList.add('active');
        }

        // --- Auth ---
        document.getElementById('btnLogin').onclick = async () => {
            const btn = document.getElementById('btnLogin');
            const errEl = document.getElementById('loginError');

            try {
                const email = document.getElementById('loginEmail').value.trim();
                const senha = document.getElementById('loginSenha').value;

                if (!email || !senha) {
                    errEl.textContent = 'Preencha todos os campos.';
                    errEl.style.display = 'block';
                    return;
                }

                btn.disabled = true;
                btn.textContent = 'Entrando...';
                errEl.style.display = 'none';

                const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });

                if (error) {
                    errEl.textContent = 'E-mail ou senha incorretos.';
                    errEl.style.display = 'block';
                    btn.disabled = false;
                    btn.textContent = 'Entrar';
                    return;
                }

                // Check if admin
                const { data: adminData, error: adminError } = await sb.from('admin_users').select('id').eq('user_id', data.user.id).single();

                if (adminError || !adminData) {
                    errEl.textContent = 'Você não tem permissão de administrador.';
                    errEl.style.display = 'block';
                    await sb.auth.signOut();
                    btn.disabled = false;
                    btn.textContent = 'Entrar';
                    return;
                }

                await showAdmin();
                
                // Reiniciar o botão visualmente caso deslogue depois
                btn.disabled = false;
                btn.textContent = 'Entrar';
                
            } catch (err) {
                errEl.textContent = 'Erro inesperado: ' + err.message;
                errEl.style.display = 'block';
                btn.disabled = false;
                btn.textContent = 'Entrar';
            }
        };

        document.getElementById('btnLogout').onclick = async () => {
            await sb.auth.signOut();
            document.getElementById('adminLayout').classList.remove('visible');
            document.getElementById('loginScreen').style.display = 'flex';
            document.getElementById('loginSenha').value = '';
        };

        // Check session on load
        async function checkSession() {
            const { data: { session } } = await sb.auth.getSession();
            if (session) {
                const { data: adminData } = await sb.from('admin_users').select('id').eq('user_id', session.user.id).single();
                if (adminData) {
                    showAdmin();
                }
            }
        }
        checkSession();

        sb.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
                document.getElementById('adminLayout').classList.remove('visible');
                document.getElementById('loginScreen').style.display = 'flex';
                document.getElementById('loginSenha').value = '';
            }
        });

        async function showAdmin() {
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('adminLayout').classList.add('visible');
            await carregarTudo();
        }

        // --- Tabs ---
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
            };
        });

        // --- Data Loading ---
        async function carregarTudo() {
            await Promise.all([carregarProdutos(), carregarCategorias(), carregarCupons()]);
            renderStats();
        }

        async function carregarProdutos() {
            const { data, error } = await sb.from('products').select('*, categories(name)').order('created_at', { ascending: false });
            if (error) { showToast('Erro ao carregar produtos', 'error'); return; }
            produtos = data || [];
            renderProdutos();
        }

        async function carregarCategorias() {
            const { data, error } = await sb.from('categories').select('*').order('order_position');
            if (error) { showToast('Erro ao carregar categorias', 'error'); return; }
            categorias = data || [];
            renderCategorias();
            atualizarSelectCategorias();
        }

        async function carregarCupons() {
            const { data, error } = await sb.from('coupons').select('*').order('created_at', { ascending: false });
            if (error) { showToast('Erro ao carregar cupons', 'error'); return; }
            cupons = data || [];
            renderCupons();
        }

        // --- Stats ---
        function renderStats() {
            const totalProdutos = produtos.length;
            const ativos = produtos.filter(p => p.active).length;
            const esgotados = produtos.filter(p => p.stock <= 0).length;
            const totalCats = categorias.length;

            document.getElementById('statsRow').innerHTML = `
                <div class="stat-card"><div class="stat-label">Total de Produtos</div><div class="stat-value">${totalProdutos}</div></div>
                <div class="stat-card"><div class="stat-label">Ativos</div><div class="stat-value" style="color:var(--success)">${ativos}</div></div>
                <div class="stat-card"><div class="stat-label">Esgotados</div><div class="stat-value" style="color:var(--danger)">${esgotados}</div></div>
                <div class="stat-card"><div class="stat-label">Categorias</div><div class="stat-value">${totalCats}</div></div>
            `;
        }

        // --- Render Products ---
        function renderProdutos() {
            const tbody = document.getElementById('produtosBody');
            if (produtos.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:2rem;">Nenhum produto cadastrado.</td></tr>';
                return;
            }

            tbody.innerHTML = produtos.map(p => {
                const stockBadge = p.stock <= 0
                    ? '<span class="badge badge-out">Esgotado</span>'
                    : p.stock <= 5
                        ? `<span class="badge badge-inactive">${p.stock} un.</span>`
                        : `<span style="font-weight:600;">${p.stock} un.</span>`;

                return `
                    <tr>
                        <td><img src="${p.image_url || 'Logo.png'}" alt="${p.name}"></td>
                        <td><strong>${p.name}</strong></td>
                        <td>${p.categories?.name || '—'}</td>
                        <td>R$ ${parseFloat(p.price).toFixed(2)}</td>
                        <td>${stockBadge}</td>
                        <td><span class="badge ${p.active ? 'badge-active' : 'badge-inactive'}">${p.active ? 'Ativo' : 'Inativo'}</span></td>
                        <td>
                            <div class="actions-cell">
                                <button class="btn-sm btn-edit" onclick="editarProduto('${p.id}')">Editar</button>
                                <button class="btn-sm btn-delete" onclick="excluirProduto('${p.id}', '${p.name.replace(/'/g, "\\'")}')">Excluir</button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // --- Render Categories ---
        function renderCategorias() {
            const tbody = document.getElementById('categoriasBody');
            if (categorias.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:2rem;">Nenhuma categoria cadastrada.</td></tr>';
                return;
            }

            tbody.innerHTML = categorias.map(c => `
                <tr>
                    <td><strong>${c.name}</strong></td>
                    <td><code>${c.slug}</code></td>
                    <td>${c.order_position}</td>
                    <td>
                        <div class="actions-cell">
                            <button class="btn-sm btn-edit" onclick="editarCategoria('${c.id}')">Editar</button>
                            <button class="btn-sm btn-delete" onclick="excluirCategoria('${c.id}', '${c.name.replace(/'/g, "\\'")}')">Excluir</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        // --- Render Coupons ---
        function renderCupons() {
            const tbody = document.getElementById('cuponsBody');
            if (cupons.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:2rem;">Nenhum cupom cadastrado.</td></tr>';
                return;
            }

            tbody.innerHTML = cupons.map(c => `
                <tr>
                    <td><strong>${c.code}</strong></td>
                    <td>${c.discount_percent}%</td>
                    <td><span class="badge ${c.active ? 'badge-active' : 'badge-inactive'}">${c.active ? 'Ativo' : 'Inativo'}</span></td>
                    <td>
                        <div class="actions-cell">
                            <button class="btn-sm btn-edit" onclick="editarCupom('${c.id}')">Editar</button>
                            <button class="btn-sm btn-delete" onclick="excluirCupom('${c.id}', '${c.code}')">Excluir</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        function atualizarSelectCategorias() {
            const select = document.getElementById('prodCategoria');
            select.innerHTML = '<option value="">Selecione...</option>';
            categorias.forEach(c => {
                select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
            });
        }

        // =================== PRODUCTS CRUD ===================

        document.getElementById('btnNovoProduto').onclick = () => {
            document.getElementById('modalProdutoTitle').textContent = 'Novo Produto';
            document.getElementById('produtoId').value = '';
            document.getElementById('prodNome').value = '';
            document.getElementById('prodDesc').value = '';
            document.getElementById('prodPreco').value = '';
            document.getElementById('prodEstoque').value = '';
            document.getElementById('prodCategoria').value = '';
            document.getElementById('prodAtivo').value = 'true';
            document.getElementById('prodImagem').value = '';
            abrirModal('modalProduto');
        };

        window.editarProduto = (id) => {
            const p = produtos.find(x => x.id === id);
            if (!p) return;
            document.getElementById('modalProdutoTitle').textContent = 'Editar Produto';
            document.getElementById('produtoId').value = p.id;
            document.getElementById('prodNome').value = p.name;
            document.getElementById('prodDesc').value = p.description || '';
            document.getElementById('prodPreco').value = p.price;
            document.getElementById('prodEstoque').value = p.stock;
            document.getElementById('prodCategoria').value = p.category_id || '';
            document.getElementById('prodAtivo').value = String(p.active);
            document.getElementById('prodImagem').value = p.image_url || '';
            abrirModal('modalProduto');
        };

        document.getElementById('btnSalvarProduto').onclick = async () => {
            const id = document.getElementById('produtoId').value;
            const nome = document.getElementById('prodNome').value.trim();
            const desc = document.getElementById('prodDesc').value.trim();
            const preco = parseFloat(document.getElementById('prodPreco').value);
            const estoque = parseInt(document.getElementById('prodEstoque').value) || 0;
            const catId = document.getElementById('prodCategoria').value || null;
            const ativo = document.getElementById('prodAtivo').value === 'true';
            const imagem = document.getElementById('prodImagem').value.trim();

            if (!nome || isNaN(preco) || preco <= 0) {
                showToast('Preencha nome e preço corretamente.', 'error');
                return;
            }

            const payload = {
                name: nome,
                description: desc,
                price: preco,
                stock: estoque,
                category_id: catId,
                active: ativo,
                image_url: imagem
            };

            let error;
            if (id) {
                ({ error } = await sb.from('products').update(payload).eq('id', id));
            } else {
                ({ error } = await sb.from('products').insert(payload));
            }

            if (error) {
                showToast('Erro ao salvar produto: ' + error.message, 'error');
                return;
            }

            showToast(id ? 'Produto atualizado!' : 'Produto criado!', 'success');
            fecharModal('modalProduto');
            await carregarProdutos();
            renderStats();
        };

        window.excluirProduto = async (id, nome) => {
            if (!confirm(`Excluir "${nome}"? Essa ação não pode ser desfeita.`)) return;
            const { error } = await sb.from('products').delete().eq('id', id);
            if (error) { showToast('Erro ao excluir: ' + error.message, 'error'); return; }
            showToast('Produto excluído!', 'success');
            await carregarProdutos();
            renderStats();
        };

        // =================== CATEGORIES CRUD ===================

        document.getElementById('btnNovaCategoria').onclick = () => {
            document.getElementById('modalCategoriaTitle').textContent = 'Nova Categoria';
            document.getElementById('catId').value = '';
            document.getElementById('catNome').value = '';
            document.getElementById('catSlug').value = '';
            document.getElementById('catOrdem').value = '';
            abrirModal('modalCategoria');
        };

        // Auto-generate slug from name
        document.getElementById('catNome').oninput = () => {
            if (!document.getElementById('catId').value) {
                const nome = document.getElementById('catNome').value;
                document.getElementById('catSlug').value = nome.toLowerCase()
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            }
        };

        window.editarCategoria = (id) => {
            const c = categorias.find(x => x.id === id);
            if (!c) return;
            document.getElementById('modalCategoriaTitle').textContent = 'Editar Categoria';
            document.getElementById('catId').value = c.id;
            document.getElementById('catNome').value = c.name;
            document.getElementById('catSlug').value = c.slug;
            document.getElementById('catOrdem').value = c.order_position;
            abrirModal('modalCategoria');
        };

        document.getElementById('btnSalvarCategoria').onclick = async () => {
            const id = document.getElementById('catId').value;
            const nome = document.getElementById('catNome').value.trim();
            const slug = document.getElementById('catSlug').value.trim();
            const ordem = parseInt(document.getElementById('catOrdem').value) || 0;

            if (!nome || !slug) {
                showToast('Preencha nome e slug.', 'error');
                return;
            }

            const payload = { name: nome, slug: slug, order_position: ordem };

            let error;
            if (id) {
                ({ error } = await sb.from('categories').update(payload).eq('id', id));
            } else {
                ({ error } = await sb.from('categories').insert(payload));
            }

            if (error) {
                showToast('Erro ao salvar categoria: ' + error.message, 'error');
                return;
            }

            showToast(id ? 'Categoria atualizada!' : 'Categoria criada!', 'success');
            fecharModal('modalCategoria');
            await carregarCategorias();
            await carregarProdutos();
            renderStats();
        };

        window.excluirCategoria = async (id, nome) => {
            if (!confirm(`Excluir categoria "${nome}"? Os produtos desta categoria ficarão sem categoria.`)) return;
            const { error } = await sb.from('categories').delete().eq('id', id);
            if (error) { showToast('Erro ao excluir: ' + error.message, 'error'); return; }
            showToast('Categoria excluída!', 'success');
            await carregarCategorias();
            renderStats();
        };

        // =================== COUPONS CRUD ===================

        document.getElementById('btnNovoCupom').onclick = () => {
            document.getElementById('modalCupomTitle').textContent = 'Novo Cupom';
            document.getElementById('cupomId').value = '';
            document.getElementById('cupomCodigo').value = '';
            document.getElementById('cupomDesconto').value = '';
            document.getElementById('cupomAtivo').value = 'true';
            abrirModal('modalCupom');
        };

        window.editarCupom = (id) => {
            const c = cupons.find(x => x.id === id);
            if (!c) return;
            document.getElementById('modalCupomTitle').textContent = 'Editar Cupom';
            document.getElementById('cupomId').value = c.id;
            document.getElementById('cupomCodigo').value = c.code;
            document.getElementById('cupomDesconto').value = c.discount_percent;
            document.getElementById('cupomAtivo').value = String(c.active);
            abrirModal('modalCupom');
        };

        document.getElementById('btnSalvarCupom').onclick = async () => {
            const id = document.getElementById('cupomId').value;
            const codigo = document.getElementById('cupomCodigo').value.trim().toUpperCase();
            const desconto = parseFloat(document.getElementById('cupomDesconto').value);
            const ativo = document.getElementById('cupomAtivo').value === 'true';

            if (!codigo || isNaN(desconto) || desconto <= 0 || desconto > 100) {
                showToast('Preencha código e desconto corretamente (1-100%).', 'error');
                return;
            }

            const payload = { code: codigo, discount_percent: desconto, active: ativo };

            let error;
            if (id) {
                ({ error } = await sb.from('coupons').update(payload).eq('id', id));
            } else {
                ({ error } = await sb.from('coupons').insert(payload));
            }

            if (error) {
                showToast('Erro ao salvar cupom: ' + error.message, 'error');
                return;
            }

            showToast(id ? 'Cupom atualizado!' : 'Cupom criado!', 'success');
            fecharModal('modalCupom');
            await carregarCupons();
        };

        window.excluirCupom = async (id, code) => {
            if (!confirm(`Excluir cupom "${code}"?`)) return;
            const { error } = await sb.from('coupons').delete().eq('id', id);
            if (error) { showToast('Erro ao excluir: ' + error.message, 'error'); return; }
            showToast('Cupom excluído!', 'success');
            await carregarCupons();
        };

        // Enter to login
        document.getElementById('loginSenha').onkeydown = (e) => {
            if (e.key === 'Enter') document.getElementById('btnLogin').click();
        };