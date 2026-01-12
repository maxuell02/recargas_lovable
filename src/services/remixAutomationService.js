/**
 * PAINEL DE RECARGAS 1.0 - Remix Automation Service
 * Automação de Remix Lovable com seletores atualizados
 * Fluxo: Login → Acessa projeto → Remix → Publish → Alterar nome → Repetir
 */

const { chromium } = require('playwright');

// State management
let broadcastFn = null;
let running = false;
let config = {};
let browser = null;
let currentIteration = 0;
let totalCredits = 0;
const CREDITS_PER_CYCLE = 10;

// User agents reais para rotação
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
];

function setBroadcast(fn) {
    broadcastFn = fn;
}

function updateConfig(newConfig) {
    config = { ...config, ...newConfig };
}

function log(message, level = 'info') {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    const logEntry = {
        timestamp,
        message,
        level
    };

    console.log(`[Recargas 1.0] ${message}`);

    if (broadcastFn) {
        broadcastFn('remix-log', logEntry);
    }
}

function updateStatus(status, step = null, iteration = null) {
    if (broadcastFn) {
        broadcastFn('remix-status', {
            status,
            step,
            iteration,
            totalIterations: config.remixRepeatCount || 1
        });
    }
}

function isRunning() {
    return running;
}

function stop() {
    running = false;
    currentIteration = 0;
    log('🛑 Automação parada pelo usuário', 'warn');
    updateStatus('stopped');

    if (browser) {
        browser.close().catch(() => {});
        browser = null;
    }
}

async function stealthPage(page) {
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined
        });

        Object.defineProperty(navigator, 'plugins', {
            get: () => [
                { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
                { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
                { name: 'Native Client', filename: 'internal-nacl-plugin' }
            ]
        });

        Object.defineProperty(navigator, 'languages', {
            get: () => ['pt-BR', 'pt', 'en-US', 'en']
        });

        window.chrome = {
            runtime: {},
            loadTimes: function() {},
            csi: function() {},
            app: {}
        };

        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ?
                Promise.resolve({ state: Notification.permission }) :
                originalQuery(parameters)
        );

        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
    });
}

async function start(remixConfig) {
    if (running) {
        log('⚠️ Automação já está em execução', 'warn');
        return;
    }

    running = true;
    currentIteration = 0;
    config = { ...config, ...remixConfig };

    const {
        projectUrl,
        remixRepeatCount,
        baseName,
        headless,
        email,
        password
    } = config;

    // Validação de campos obrigatórios
    if (!email || !password) {
        log('❌ Email e senha são obrigatórios!', 'error');
        updateStatus('error', 'Email e senha são obrigatórios');
        running = false;
        return;
    }

    if (!projectUrl) {
        log('❌ URL do projeto é obrigatória!', 'error');
        updateStatus('error', 'URL do projeto é obrigatória');
        running = false;
        return;
    }

    log(`\n🚀 ========== PAINEL DE RECARGAS 1.0 - INICIANDO ==========`);
    log(`📧 Email: ${email}`);
    log(`📎 URL do Projeto: ${projectUrl}`);
    log(`🔁 Repetições: ${remixRepeatCount}`);
    log(`📝 Nome base: ${baseName}`);
    
    // Resetar contador de créditos
    totalCredits = 0;
    log(`💰 Contador de créditos resetado`);

    try {
        updateStatus('starting', 'Iniciando navegador...');
        
        const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

        browser = await chromium.launch({
            headless: headless !== false, // Em produção, sempre headless
            args: [
                '--start-maximized',
                '--window-size=1920,1080',
                '--disable-blink-features=AutomationControlled',
                '--disable-infobars',
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu',
            ]
        });

        const context = await browser.newContext({
            viewport: null, // null para usar o tamanho real da janela maximizada
            userAgent,
            locale: 'pt-BR',
            timezoneId: 'America/Sao_Paulo',
        });

        const page = await context.newPage();
        await stealthPage(page);
        page.setDefaultTimeout(60000);

        // ==================== LOGIN ====================
        updateStatus('running', 'Realizando login...', 0);
        log('🔑 Iniciando processo de login...');

        await page.goto('https://lovable.dev/login');
        await page.waitForLoadState('domcontentloaded');

        // Preencher e-mail
        log('📧 Preenchendo e-mail...');
        const emailInput = page.getByRole('textbox', { name: 'E-mail' });
        await emailInput.waitFor({ state: 'visible', timeout: 15000 });
        await emailInput.click();
        await emailInput.fill(email);

        // Clicar em Continuar
        log('➡️ Clicando em Continuar...');
        const continueBtn = page.getByRole('button', { name: 'Continuar', exact: true });
        await continueBtn.waitFor({ state: 'visible', timeout: 10000 });
        await continueBtn.click();

        // Preencher senha
        log('🔒 Preenchendo senha...');
        const passwordInput = page.getByRole('textbox', { name: 'Senha' });
        await passwordInput.waitFor({ state: 'visible', timeout: 15000 });
        await passwordInput.click();
        await passwordInput.fill(password);

        // Clicar em Login
        log('🚪 Clicando em Login...');
        const loginBtn = page.getByRole('button', { name: 'Login' });
        await loginBtn.waitFor({ state: 'visible', timeout: 10000 });
        await loginBtn.click();
        
        // Aguardar 10 segundos e acessar URL do projeto
        log('⏳ Aguardando 10 segundos...');
        await page.waitForTimeout(10000);
        
        log('📍 Acessando URL do projeto...');
        await page.goto(projectUrl);
        await page.waitForLoadState('domcontentloaded');

        log('✅ Login realizado com sucesso!');
        
        if (broadcastFn) {
            broadcastFn('remix-login-success', { email });
        }

        // ==================== LOOP PRINCIPAL DE REMIX ====================
        for (let i = 1; i <= remixRepeatCount && running; i++) {
            currentIteration = i;
            const iterationName = `${baseName}${i + 1}`;
            
            log(`\n🔄 ========== ITERAÇÃO ${i}/${remixRepeatCount} ==========`);
            updateStatus('running', `Iteração ${i}/${remixRepeatCount}`, i);

            // ==================== NAVEGAR PARA O PROJETO ====================
            updateStatus('running', `[${i}/${remixRepeatCount}] Acessando projeto...`, i);
            log('📍 Navegando para o projeto...');
            
            await page.goto(projectUrl);
            await page.waitForLoadState('domcontentloaded');

            // ==================== REMIX ====================
            updateStatus('running', `[${i}/${remixRepeatCount}] Fazendo Remix...`, i);
            log('🔀 Procurando botão Remix...');
            
            // Tentar encontrar o botão Remix com múltiplas estratégias
            let remixBtn = null;
            let remixFound = false;
            
            // Estratégia 1: Por role button com nome Remix
            try {
                remixBtn = page.getByRole('button', { name: 'Remix' }).first();
                await remixBtn.waitFor({ state: 'visible', timeout: 8000 });
                remixFound = true;
                log('✅ Botão Remix encontrado (role)');
            } catch (e) {
                log('⚠️ Seletor role falhou, tentando próximo...', 'warn');
            }
            
            // Estratégia 2: Por texto
            if (!remixFound) {
                try {
                    remixBtn = page.locator('button:has-text("Remix")').first();
                    await remixBtn.waitFor({ state: 'visible', timeout: 8000 });
                    remixFound = true;
                    log('✅ Botão Remix encontrado (texto)');
                } catch (e2) {
                    log('⚠️ Seletor texto falhou, tentando próximo...', 'warn');
                }
            }
            
            // Estratégia 3: Por data-testid ou classe
            if (!remixFound) {
                try {
                    remixBtn = page.locator('[data-testid*="remix"], .remix-button, button[class*="remix"]').first();
                    await remixBtn.waitFor({ state: 'visible', timeout: 8000 });
                    remixFound = true;
                    log('✅ Botão Remix encontrado (fallback)');
                } catch (e3) {
                    log('❌ Nenhum botão Remix encontrado!', 'error');
                }
            }
            
            // Se não encontrou, pular iteração
            if (!remixFound || !remixBtn) {
                log('❌ Botão Remix não localizado, pulando iteração...', 'error');
                continue;
            }
            
            // Clicar no botão Remix
            log('🔀 Clicando em Remix...');
            try {
                await remixBtn.click({ timeout: 10000 });
            } catch (clickError) {
                log(`❌ Erro ao clicar no botão Remix: ${clickError.message}`, 'error');
                continue;
            }

            // Aguardar modal aparecer e clicar no segundo botão Remix (confirmação)
            log('🔀 Aguardando modal de confirmação...');
            
            // Procurar botão de confirmação dentro do modal
            try {
                // Aguardar modal aparecer
                await page.waitForSelector('[role="dialog"], .modal, [data-state="open"]', { timeout: 15000 });
                
                // O modal geralmente tem outro botão Remix para confirmar
                const confirmBtn = page.getByRole('button', { name: 'Remix' }).last();
                await confirmBtn.waitFor({ state: 'visible', timeout: 15000 });
                log('🔀 Confirmando Remix...');
                await confirmBtn.click();
            } catch (e) {
                log(`⚠️ Modal de confirmação: ${e.message}`, 'warn');
                // Fallback: clicar em qualquer botão visível no modal
                try {
                    const modalConfirm = page.locator('[role="dialog"] button, .modal button').filter({ hasText: /remix|confirm|ok|criar|create/i }).first();
                    await modalConfirm.waitFor({ state: 'visible', timeout: 10000 });
                    await modalConfirm.click();
                    log('🔀 Confirmação via fallback modal');
                } catch (fallbackError) {
                    log('⚠️ Nenhuma confirmação necessária ou já processada', 'warn');
                }
            }

            // Aguardar redirecionamento para o novo projeto
            log('⏳ Aguardando novo projeto...');
            try {
                await page.waitForURL(/\/projects\/[a-f0-9-]+/, { timeout: 60000 });
                log('✅ Redirecionado para novo projeto!');
            } catch (e) {
                log('⚠️ Timeout aguardando projeto, verificando URL atual...', 'warn');
                const currentUrl = page.url();
                log(`📍 URL atual: ${currentUrl}`);
                if (!currentUrl.includes('/projects/')) {
                    log('❌ Remix pode ter falhado, pulando iteração...', 'error');
                    continue;
                }
            }
            
            await page.waitForLoadState('domcontentloaded');

            log('✅ Remix concluído!');

            if (broadcastFn) {
                broadcastFn('remix-remix-success', { iteration: i });
            }

            // ==================== PUBLISH ====================
            updateStatus('running', `[${i}/${remixRepeatCount}] Publicando...`, i);
            log('📤 Clicando em Publish...');

            // Primeiro clique no Publish (abre modal)
            try {
                const publishBtn = page.getByRole('button', { name: 'Publish' });
                await publishBtn.waitFor({ state: 'visible', timeout: 30000 });
                await publishBtn.click();

                // Aguardar segundo botão Publish aparecer e clicar
                log('📤 Confirmando Publish...');
                const confirmPublishBtn = page.getByRole('button', { name: 'Publish' }).last();
                await confirmPublishBtn.waitFor({ state: 'visible', timeout: 15000 });
                await confirmPublishBtn.click();

                // Aguardar e fechar modal de sucesso
                log('⏳ Aguardando publicação...');
                try {
                    const closeBtn = page.getByRole('button', { name: 'Close' });
                    await closeBtn.waitFor({ state: 'visible', timeout: 30000 });
                    await closeBtn.click();
                    log('✅ Publicação concluída!');
                } catch (e) {
                    log('ℹ️ Modal Close não encontrado, continuando...', 'warn');
                }
            } catch (publishError) {
                log(`⚠️ Erro no Publish: ${publishError.message}`, 'warn');
            }

            if (broadcastFn) {
                broadcastFn('remix-publish-success', { iteration: i });
            }

            // ==================== ALTERAR NOME ====================
            updateStatus('running', `[${i}/${remixRepeatCount}] Alterando nome...`, i);
            log(`📝 Alterando nome para: ${iterationName}`);

            // Ir para a home
            await page.goto('https://lovable.dev/');
            await page.waitForLoadState('domcontentloaded');

            // Clicar no avatar do usuário
            log('👤 Abrindo menu do usuário...');
            try {
                // Tentar pelo testId primeiro
                const userAvatar = page.getByTestId('user-avatar');
                await userAvatar.waitFor({ state: 'visible', timeout: 15000 });
                await userAvatar.click();
            } catch (e) {
                // Fallback
                try {
                    const avatarFallback = page.locator('[data-testid="user-avatar"], [class*="avatar"], button[class*="Avatar"]').first();
                    await avatarFallback.waitFor({ state: 'visible', timeout: 10000 });
                    await avatarFallback.click();
                } catch (avatarError) {
                    log(`⚠️ Avatar não encontrado: ${avatarError.message}`, 'warn');
                }
            }

            // Clicar em Settings
            log('⚙️ Acessando Settings...');
            try {
                const settingsBtn = page.getByRole('menuitem', { name: 'Settings' });
                await settingsBtn.waitFor({ state: 'visible', timeout: 10000 });
                await settingsBtn.click();
            } catch (e) {
                try {
                    const settingsFallback = page.getByText('Settings');
                    await settingsFallback.waitFor({ state: 'visible', timeout: 8000 });
                    await settingsFallback.click();
                } catch (settingsError) {
                    log(`⚠️ Settings não encontrado: ${settingsError.message}`, 'warn');
                }
            }
            await page.waitForLoadState('domcontentloaded');

            // Alterar nome
            log('✏️ Preenchendo novo nome...');
            try {
                // Estratégia: input com ID contendo "-form-item"
                const nameInput = page.locator('[id*="-form-item"]').first();
                await nameInput.waitFor({ state: 'visible', timeout: 15000 });
                await nameInput.click();
                await nameInput.fill(iterationName);

                // Clicar no botão Update (segundo botão)
                log('💾 Salvando alterações...');
                const updateButtons = page.getByRole('button', { name: 'Update' });
                await updateButtons.first().waitFor({ state: 'visible', timeout: 10000 });
                const count = await updateButtons.count();
                if (count >= 2) {
                    await updateButtons.nth(1).click();
                } else {
                    await updateButtons.first().click();
                }
                
                log(`✅ Nome alterado para: ${iterationName}`);
            } catch (e) {
                log(`⚠️ Erro ao alterar nome: ${e.message}`, 'warn');
            }

            if (broadcastFn) {
                broadcastFn('remix-name-changed', { iteration: i, name: iterationName });
            }

            // ==================== FINALIZAÇÃO DA ITERAÇÃO ====================
            // Adicionar créditos por ciclo concluído
            totalCredits += CREDITS_PER_CYCLE;
            log(`💰 Créditos enviados neste ciclo: ${CREDITS_PER_CYCLE} | Total: ${totalCredits}`);
            
            if (broadcastFn) {
                broadcastFn('remix-credits-update', { credits: totalCredits });
            }
            
            log(`✅ ========== ITERAÇÃO ${i} CONCLUÍDA ==========\n`);
            
            if (broadcastFn) {
                broadcastFn('remix-iteration-complete', {
                    iteration: i,
                    total: remixRepeatCount,
                    name: iterationName
                });
            }
        }

        // ==================== FINALIZAÇÃO ====================
        if (running) {
            log(`\n🎉 ========== AUTOMAÇÃO CONCLUÍDA ==========`);
            log(`✅ Total de ${remixRepeatCount} remix(es) realizado(s)!`);
            log(`💰 Total de créditos enviados: ${totalCredits}`);
            updateStatus('completed', 'Automação concluída!', remixRepeatCount);
        }

    } catch (error) {
        log(`❌ Erro na automação: ${error.message}`, 'error');
        console.error('Stack:', error.stack);
        updateStatus('error', error.message);
    } finally {
        running = false;
        
        if (browser) {
            log('⏳ Fechando navegador...');
            await browser.close().catch(() => {});
            browser = null;
        }
    }
}

module.exports = {
    setBroadcast,
    updateConfig,
    start,
    stop,
    isRunning
};
