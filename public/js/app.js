/**
 * Painel de Recargas 1.0 - Lovable Automation
 * Frontend Application
 */

class RecargasPanel {
    constructor() {
        this.ws = null;
        this.repeatCount = 5;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.isRunning = false;
        this.completedIterations = 0;
        this.totalCredits = 0;
        this.authToken = localStorage.getItem('auth_token');
        
        // Verificar autenticação
        if (!this.authToken) {
            window.location.href = '/login.html';
            return;
        }
        
        this.init();
    }

    // Método para fazer requisições autenticadas
    async fetchWithAuth(url, options = {}) {
        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${this.authToken}`
        };
        
        const response = await fetch(url, { ...options, headers });
        
        // Se não autorizado, redirecionar para login
        if (response.status === 401) {
            localStorage.removeItem('auth_token');
            window.location.href = '/login.html';
            throw new Error('Sessão expirada');
        }
        
        return response;
    }

    init() {
        this.bindElements();
        this.bindEvents();
        this.loadSavedFields(); // Carregar campos salvos
        this.connectWebSocket();
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);
        this.updateCounterDisplay();
    }

    // ==================== ELEMENT BINDING ====================
    bindElements() {
        // Config inputs
        this.projectUrlInput = document.getElementById('projectUrl');
        this.baseNameInput = document.getElementById('baseName');
        this.headlessModeCheckbox = document.getElementById('headlessMode');
        this.remixEmailInput = document.getElementById('remixEmail');
        this.remixPasswordInput = document.getElementById('remixPassword');

        // Save buttons
        this.saveEmailBtn = document.getElementById('saveEmailBtn');
        this.savePasswordBtn = document.getElementById('savePasswordBtn');
        this.saveUrlBtn = document.getElementById('saveUrlBtn');
        this.saveBaseNameBtn = document.getElementById('saveBaseNameBtn');

        // Field status elements
        this.emailStatus = document.getElementById('emailStatus');
        this.passwordStatus = document.getElementById('passwordStatus');
        this.urlStatus = document.getElementById('urlStatus');
        this.baseNameStatus = document.getElementById('baseNameStatus');

        // Error messages
        this.emailError = document.getElementById('emailError');
        this.passwordError = document.getElementById('passwordError');
        this.urlError = document.getElementById('urlError');

        // Counter
        this.repeatCountDisplay = document.getElementById('repeatCountDisplay');
        this.decreaseBtn = document.getElementById('decreaseBtn');
        this.increaseBtn = document.getElementById('increaseBtn');
        this.presetBtns = document.querySelectorAll('.preset-btn');

        // Action buttons
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');

        // Stats
        this.statTarget = document.getElementById('statTarget');
        this.statCompleted = document.getElementById('statCompleted');
        this.statCredits = document.getElementById('statCredits');
        this.statStatus = document.getElementById('statStatus');

        // Progress
        this.progressCounter = document.getElementById('progressCounter');
        this.progressBar = document.getElementById('progressBar');
        this.statusIndicator = document.getElementById('statusIndicator');
        this.currentStep = document.getElementById('currentStep');
        this.iterationsList = document.getElementById('iterationsList');

        // Log
        this.logContainer = document.getElementById('logContainer');
        this.clearLogBtn = document.getElementById('clearLogBtn');

        // Connection
        this.connectionStatus = document.getElementById('connectionStatus');

        // Footer
        this.footerTime = document.getElementById('footerTime');

        // Auth elements
        this.logoutBtn = document.getElementById('logoutBtn');
    }

    // ==================== EVENT BINDING ====================
    bindEvents() {
        // Counter controls
        this.decreaseBtn.addEventListener('click', () => this.adjustCount(-1));
        this.increaseBtn.addEventListener('click', () => this.adjustCount(1));

        // Preset buttons
        this.presetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.repeatCount = parseInt(btn.dataset.value);
                this.updateCounterDisplay();
            });
        });

        // Action buttons
        this.startBtn.addEventListener('click', () => this.startAutomation());
        this.stopBtn.addEventListener('click', () => this.stopAutomation());

        // Clear log
        this.clearLogBtn.addEventListener('click', () => this.clearLog());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp') {
                this.adjustCount(1);
            } else if (e.key === 'ArrowDown') {
                this.adjustCount(-1);
            }
        });

        // Clear error on input
        this.remixEmailInput.addEventListener('input', () => this.clearFieldError('email'));
        this.remixPasswordInput.addEventListener('input', () => this.clearFieldError('password'));
        this.projectUrlInput.addEventListener('input', () => this.clearFieldError('url'));

        // Save individual fields
        this.saveEmailBtn.addEventListener('click', () => this.saveField('email'));
        this.savePasswordBtn.addEventListener('click', () => this.saveField('password'));
        this.saveUrlBtn.addEventListener('click', () => this.saveField('url'));
        this.saveBaseNameBtn.addEventListener('click', () => this.saveField('baseName'));

        // Logout
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', () => this.logout());
        }
    }

    // ==================== LOGOUT ====================
    async logout() {
        try {
            await this.fetchWithAuth('/api/auth/logout', { method: 'POST' });
        } catch (e) {
            // Ignorar erros
        } finally {
            localStorage.removeItem('auth_token');
            window.location.href = '/login.html';
        }
    }

    // ==================== SAVE/LOAD FIELDS ====================
    saveField(fieldName) {
        const storageKey = `recargas_${fieldName}`;
        let value = '';
        let btn = null;
        let statusEl = null;

        switch (fieldName) {
            case 'email':
                value = this.remixEmailInput.value.trim();
                btn = this.saveEmailBtn;
                statusEl = this.emailStatus;
                break;
            case 'password':
                value = this.remixPasswordInput.value;
                btn = this.savePasswordBtn;
                statusEl = this.passwordStatus;
                break;
            case 'url':
                value = this.projectUrlInput.value.trim();
                btn = this.saveUrlBtn;
                statusEl = this.urlStatus;
                break;
            case 'baseName':
                value = this.baseNameInput.value.trim();
                btn = this.saveBaseNameBtn;
                statusEl = this.baseNameStatus;
                break;
        }

        if (value) {
            localStorage.setItem(storageKey, value);
            
            // Visual feedback
            btn.classList.add('saved');
            btn.textContent = '✓';
            statusEl.textContent = '✓ Salvo';
            statusEl.classList.add('saved');

            setTimeout(() => {
                btn.classList.remove('saved');
                btn.textContent = '💾';
            }, 2000);
        } else {
            // Remove if empty
            localStorage.removeItem(storageKey);
            statusEl.textContent = '';
            statusEl.classList.remove('saved');
        }
    }

    loadSavedFields() {
        // Load email
        const savedEmail = localStorage.getItem('recargas_email');
        if (savedEmail) {
            this.remixEmailInput.value = savedEmail;
            this.emailStatus.textContent = '✓ Salvo';
            this.emailStatus.classList.add('saved');
        }

        // Load password
        const savedPassword = localStorage.getItem('recargas_password');
        if (savedPassword) {
            this.remixPasswordInput.value = savedPassword;
            this.passwordStatus.textContent = '✓ Salvo';
            this.passwordStatus.classList.add('saved');
        }

        // Load URL
        const savedUrl = localStorage.getItem('recargas_url');
        if (savedUrl) {
            this.projectUrlInput.value = savedUrl;
            this.urlStatus.textContent = '✓ Salvo';
            this.urlStatus.classList.add('saved');
        }

        // Load base name
        const savedBaseName = localStorage.getItem('recargas_baseName');
        if (savedBaseName) {
            this.baseNameInput.value = savedBaseName;
            this.baseNameStatus.textContent = '✓ Salvo';
            this.baseNameStatus.classList.add('saved');
        }
    }

    // ==================== VALIDATION ====================
    validateFields() {
        let isValid = true;

        // Validate email
        const email = this.remixEmailInput.value.trim();
        if (!email) {
            this.showFieldError('email', 'E-mail é obrigatório');
            isValid = false;
        } else if (!this.isValidEmail(email)) {
            this.showFieldError('email', 'E-mail inválido');
            isValid = false;
        }

        // Validate password
        const password = this.remixPasswordInput.value;
        if (!password) {
            this.showFieldError('password', 'Senha é obrigatória');
            isValid = false;
        }

        // Validate URL
        const projectUrl = this.projectUrlInput.value.trim();
        if (!projectUrl) {
            this.showFieldError('url', 'URL do projeto é obrigatória');
            isValid = false;
        } else if (!projectUrl.includes('lovable.dev')) {
            this.showFieldError('url', 'URL deve ser do lovable.dev');
            isValid = false;
        }

        return isValid;
    }

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    showFieldError(field, message) {
        const input = field === 'email' ? this.remixEmailInput :
                      field === 'password' ? this.remixPasswordInput :
                      this.projectUrlInput;
        const errorEl = field === 'email' ? this.emailError :
                        field === 'password' ? this.passwordError :
                        this.urlError;
        
        input.classList.add('field-error');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.classList.add('visible');
        }
    }

    clearFieldError(field) {
        const input = field === 'email' ? this.remixEmailInput :
                      field === 'password' ? this.remixPasswordInput :
                      this.projectUrlInput;
        const errorEl = field === 'email' ? this.emailError :
                        field === 'password' ? this.passwordError :
                        this.urlError;
        
        input.classList.remove('field-error');
        if (errorEl) {
            errorEl.classList.remove('visible');
        }
    }

    clearAllErrors() {
        this.clearFieldError('email');
        this.clearFieldError('password');
        this.clearFieldError('url');
    }

    // ==================== COUNTER ====================
    adjustCount(delta) {
        this.repeatCount = Math.max(1, Math.min(1000, this.repeatCount + delta));
        this.updateCounterDisplay();
    }

    updateCounterDisplay() {
        this.repeatCountDisplay.textContent = this.repeatCount;
        this.statTarget.textContent = this.repeatCount;
        this.progressCounter.textContent = `${this.completedIterations} / ${this.repeatCount}`;
        
        // Disable decrease if at minimum
        this.decreaseBtn.disabled = this.repeatCount <= 1;
    }

    // ==================== WEBSOCKET ====================
    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('[WS] Conectado');
            this.reconnectAttempts = 0;
            this.setConnectionStatus('connected', 'Conectado');
        };

        this.ws.onclose = () => {
            console.log('[WS] Desconectado');
            this.setConnectionStatus('disconnected', 'Desconectado');
            this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
            console.error('[WS] Erro:', error);
        };

        this.ws.onmessage = (event) => {
            const { type, data } = JSON.parse(event.data);
            this.handleMessage(type, data);
        };
    }

    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.setConnectionStatus('disconnected', 'Falha na conexão');
            return;
        }

        this.reconnectAttempts++;
        this.setConnectionStatus('', `Reconectando (${this.reconnectAttempts})...`);
        
        setTimeout(() => this.connectWebSocket(), 2000);
    }

    setConnectionStatus(status, text) {
        this.connectionStatus.className = `connection-status ${status}`;
        this.connectionStatus.querySelector('.status-text').textContent = text;
    }

    // ==================== MESSAGE HANDLING ====================
    handleMessage(type, data) {
        switch (type) {
            case 'remix-log':
                this.addLog(data);
                break;

            case 'remix-status':
                this.updateStatus(data);
                break;

            case 'remix-iteration-complete':
                this.onIterationComplete(data);
                break;

            case 'remix-started':
                this.onAutomationStarted();
                break;

            case 'remix-stopped':
                this.onAutomationStopped();
                break;

            case 'remix-login-success':
                this.addLog({ timestamp: new Date().toLocaleTimeString('pt-BR'), message: `✅ Login realizado: ${data.email}`, level: 'success' });
                break;

            case 'remix-remix-success':
                this.addLog({ timestamp: new Date().toLocaleTimeString('pt-BR'), message: `🔀 Remix #${data.iteration} concluído`, level: 'success' });
                break;

            case 'remix-publish-success':
                this.addLog({ timestamp: new Date().toLocaleTimeString('pt-BR'), message: `📤 Publish #${data.iteration} concluído`, level: 'success' });
                break;

            case 'remix-name-changed':
                this.addLog({ timestamp: new Date().toLocaleTimeString('pt-BR'), message: `📝 Nome alterado para: ${data.name}`, level: 'success' });
                break;

            case 'remix-credits-update':
                this.updateCredits(data.credits);
                break;
        }
    }

    // ==================== AUTOMATION ====================
    async startAutomation() {
        // Validate fields first
        if (!this.validateFields()) {
            return;
        }

        const projectUrl = this.projectUrlInput.value.trim();
        const baseName = this.baseNameInput.value.trim() || 'STORE';
        const remixEmail = this.remixEmailInput.value.trim();
        const remixPassword = this.remixPasswordInput.value;

        try {
            const response = await this.fetchWithAuth('/api/remix/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectUrl,
                    baseName,
                    remixRepeatCount: this.repeatCount,
                    headless: this.headlessModeCheckbox.checked,
                    email: remixEmail,
                    password: remixPassword
                })
            });
            

            const result = await response.json();

            if (response.ok) {
                this.onAutomationStarted();
                this.clearAllErrors();
            } else {
                alert(result.error || 'Erro ao iniciar automação');
            }
        } catch (err) {
            console.error('Erro:', err);
            alert('Erro ao conectar com o servidor');
        }
    }

    async stopAutomation() {
        try {
            await this.fetchWithAuth('/api/remix/stop', { method: 'POST' });
            this.onAutomationStopped();
        } catch (err) {
            console.error('Erro ao parar:', err);
        }
    }

    onAutomationStarted() {
        this.isRunning = true;
        this.completedIterations = 0;
        this.totalCredits = 0;
        this.statCredits.textContent = '0';
        this.startBtn.disabled = true;
        this.stopBtn.disabled = false;
        this.statStatus.textContent = 'Executando';
        this.statStatus.style.color = 'var(--info)';
        this.statusIndicator.className = 'status-indicator running';
        this.iterationsList.innerHTML = '';
        this.updateProgress();
    }

    onAutomationStopped() {
        this.isRunning = false;
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.statStatus.textContent = 'Parado';
        this.statStatus.style.color = 'var(--warning)';
        this.statusIndicator.className = 'status-indicator';
    }

    updateStatus(data) {
        const { status, step, iteration, totalIterations } = data;

        this.currentStep.textContent = step || status;

        if (status === 'completed') {
            this.statStatus.textContent = 'Concluído!';
            this.statStatus.style.color = 'var(--success)';
            this.statusIndicator.className = 'status-indicator completed';
            this.startBtn.disabled = false;
            this.stopBtn.disabled = true;
            this.isRunning = false;
        } else if (status === 'error') {
            this.statStatus.textContent = 'Erro';
            this.statStatus.style.color = 'var(--error)';
            this.statusIndicator.className = 'status-indicator error';
            this.startBtn.disabled = false;
            this.stopBtn.disabled = true;
            this.isRunning = false;
        } else if (status === 'running') {
            this.statStatus.textContent = `Iteração ${iteration}/${totalIterations}`;
            this.statStatus.style.color = 'var(--info)';
        }
    }

    onIterationComplete(data) {
        this.completedIterations = data.iteration;
        this.statCompleted.textContent = this.completedIterations;
        this.updateProgress();

        // Add to iterations list
        const item = document.createElement('div');
        item.className = 'iteration-item completed';
        item.innerHTML = `
            <span class="iteration-number">#${data.iteration}</span>
            <span class="iteration-name">${data.name}</span>
            <span class="iteration-status">✅</span>
        `;
        this.iterationsList.insertBefore(item, this.iterationsList.firstChild);
    }

    updateProgress() {
        const progress = this.repeatCount > 0 
            ? (this.completedIterations / this.repeatCount) * 100 
            : 0;
        
        this.progressBar.style.width = `${progress}%`;
        this.progressCounter.textContent = `${this.completedIterations} / ${this.repeatCount}`;
    }

    updateCredits(credits) {
        this.totalCredits = credits;
        this.statCredits.textContent = credits;
        this.addLog({ 
            timestamp: new Date().toLocaleTimeString('pt-BR'), 
            message: `💰 Créditos enviados: ${credits}`, 
            level: 'info' 
        });
    }

    // ==================== LOG ====================
    addLog(data) {
        const entry = document.createElement('div');
        entry.className = `log-entry ${data.level}`;
        entry.innerHTML = `
            <span class="log-time">${data.timestamp}</span>
            <span class="log-message">${data.message}</span>
        `;

        this.logContainer.appendChild(entry);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;

        // Limit log entries
        while (this.logContainer.children.length > 200) {
            this.logContainer.removeChild(this.logContainer.firstChild);
        }
    }

    clearLog() {
        this.logContainer.innerHTML = `
            <div class="log-entry info">
                <span class="log-time">${new Date().toLocaleTimeString('pt-BR')}</span>
                <span class="log-message">Log limpo</span>
            </div>
        `;
    }

    // ==================== TIME ====================
    updateTime() {
        const now = new Date();
        const time = now.toLocaleTimeString('pt-BR');
        const date = now.toLocaleDateString('pt-BR');
        this.footerTime.textContent = `${date} ${time}`;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.recargasPanel = new RecargasPanel();
});
