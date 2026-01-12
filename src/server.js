/**
 * PAINEL DE RECARGAS 1.0 - Server
 * Servidor Express + WebSocket para automação de Remix Lovable
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

// Serviços
const remixAutomationService = require('./services/remixAutomationService');
const authService = require('./services/authService');

// Configuração
let config = {
    port: 3008,
    headless: false,
    users: [
        { username: 'admin', password: 'admin123', name: 'Administrador' }
    ]
};

// Carregar configuração do arquivo
const configPath = path.join(__dirname, '..', 'config.json');
if (fs.existsSync(configPath)) {
    try {
        const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        config = { ...config, ...fileConfig };
    } catch (error) {
        console.error('[Config] Erro ao carregar config.json:', error.message);
    }
}

// Express App
const app = express();
const server = http.createServer(app);

// WebSocket Server
const wss = new WebSocket.Server({ server });

// Middleware
app.use(express.json());

// Arquivos e rotas públicas (não precisam de autenticação)
const PUBLIC_PATHS = [
    '/login.html',
    '/login',
    '/index.html',
    '/',
    '/api/auth/login',
    '/api/auth/verify',
    '/api/health',
    '/css/styles.css',
    '/js/app.js'
];

// Middleware de autenticação para APIs
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    if (!token) {
        return res.status(401).json({ success: false, error: 'Token não fornecido' });
    }
    
    const user = authService.validateSession(token);
    if (!user) {
        return res.status(401).json({ success: false, error: 'Sessão inválida ou expirada' });
    }
    
    req.user = user;
    next();
}

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, '..', 'public')));

// Rota raiz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Broadcast para todos os clientes WebSocket
function broadcast(type, data) {
    const message = JSON.stringify({ type, data });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Configurar broadcast no serviço de automação
remixAutomationService.setBroadcast(broadcast);

// WebSocket Connection Handler
wss.on('connection', (ws) => {
    console.log('[WS] Cliente conectado');

    ws.on('close', () => {
        console.log('[WS] Cliente desconectado');
    });

    ws.on('error', (error) => {
        console.error('[WS] Erro:', error.message);
    });
});

// ==================== API ROUTES - AUTH ====================

// Login
app.post('/api/auth/login', (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Usuário e senha são obrigatórios' 
            });
        }
        
        const user = authService.validateCredentials(username, password, config.users || []);
        
        if (!user) {
            console.log(`[Auth] Tentativa de login falhou: ${username}`);
            return res.status(401).json({ 
                success: false, 
                error: 'Usuário ou senha inválidos' 
            });
        }
        
        const token = authService.createSession(user);
        console.log(`[Auth] Login bem-sucedido: ${username}`);
        
        res.json({ 
            success: true, 
            token,
            user: { username: user.username, name: user.name }
        });
    } catch (error) {
        console.error('[Auth] Erro no login:', error);
        res.status(500).json({ success: false, error: 'Erro interno' });
    }
});

// Verificar token
app.get('/api/auth/verify', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    if (!token) {
        return res.status(401).json({ success: false, error: 'Token não fornecido' });
    }
    
    const user = authService.validateSession(token);
    
    if (!user) {
        return res.status(401).json({ success: false, error: 'Token inválido' });
    }
    
    res.json({ success: true, user });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    if (token) {
        authService.destroySession(token);
    }
    
    res.json({ success: true, message: 'Logout realizado' });
});

// ==================== API ROUTES - REMIX ====================

// Iniciar automação de remix
app.post('/api/remix/start', authMiddleware, async (req, res) => {
    try {
        const { projectUrl, baseName, remixRepeatCount, headless, email, password } = req.body;

        // Validação obrigatória
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email e senha são obrigatórios' 
            });
        }

        if (!projectUrl) {
            return res.status(400).json({ 
                success: false, 
                error: 'URL do projeto é obrigatória' 
            });
        }

        if (remixAutomationService.isRunning()) {
            return res.status(400).json({ 
                success: false, 
                error: 'Automação já está em execução' 
            });
        }

        // Iniciar em background
        remixAutomationService.start({
            projectUrl,
            baseName: baseName || 'STORE',
            remixRepeatCount: remixRepeatCount || 5,
            headless: headless || false,
            email,
            password
        });

        res.json({ success: true, message: 'Automação de remix iniciada' });
    } catch (error) {
        console.error('[API] Erro ao iniciar remix:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Parar automação de remix
app.post('/api/remix/stop', authMiddleware, (req, res) => {
    try {
        remixAutomationService.stop();
        res.json({ success: true, message: 'Automação parada' });
    } catch (error) {
        console.error('[API] Erro ao parar remix:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Status da automação
app.get('/api/remix/status', authMiddleware, (req, res) => {
    res.json({
        running: remixAutomationService.isRunning()
    });
});

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || config.port || 3008;

server.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('========================================');
    console.log('   PAINEL DE RECARGAS 1.0');
    console.log('   Lovable Remix Automation');
    console.log('========================================');
    console.log(`   🌐 http://localhost:${PORT}`);
    console.log('========================================');
    console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n[Server] Encerrando...');
    remixAutomationService.stop();
    server.close(() => {
        console.log('[Server] Encerrado com sucesso');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n[Server] Encerrando...');
    remixAutomationService.stop();
    server.close(() => {
        console.log('[Server] Encerrado com sucesso');
        process.exit(0);
    });
});
