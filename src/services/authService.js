/**
 * PAINEL DE RECARGAS 1.0 - Auth Service
 * Serviço de autenticação com sessões
 */

const crypto = require('crypto');

// Armazenamento de sessões em memória
const sessions = new Map();

// Tempo de expiração da sessão (24 horas)
const SESSION_EXPIRY = 24 * 60 * 60 * 1000;

/**
 * Gera um token de sessão único
 */
function generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash de senha usando SHA-256
 */
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Valida credenciais do usuário
 */
function validateCredentials(username, password, users) {
    const user = users.find(u => u.username === username);
    if (!user) return null;
    
    // Suporta senha em texto plano ou hash
    const passwordMatch = user.password === password || 
                          user.password === hashPassword(password);
    
    if (passwordMatch) {
        return {
            username: user.username,
            name: user.name || user.username
        };
    }
    
    return null;
}

/**
 * Cria uma nova sessão
 */
function createSession(user) {
    const token = generateSessionToken();
    const session = {
        user,
        createdAt: Date.now(),
        expiresAt: Date.now() + SESSION_EXPIRY
    };
    
    sessions.set(token, session);
    return token;
}

/**
 * Valida um token de sessão
 */
function validateSession(token) {
    if (!token) return null;
    
    const session = sessions.get(token);
    if (!session) return null;
    
    // Verifica expiração
    if (Date.now() > session.expiresAt) {
        sessions.delete(token);
        return null;
    }
    
    return session.user;
}

/**
 * Remove uma sessão (logout)
 */
function destroySession(token) {
    return sessions.delete(token);
}

/**
 * Limpa sessões expiradas
 */
function cleanupExpiredSessions() {
    const now = Date.now();
    for (const [token, session] of sessions.entries()) {
        if (now > session.expiresAt) {
            sessions.delete(token);
        }
    }
}

// Limpar sessões expiradas a cada hora
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

module.exports = {
    generateSessionToken,
    hashPassword,
    validateCredentials,
    createSession,
    validateSession,
    destroySession
};
