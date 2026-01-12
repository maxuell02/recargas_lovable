# 💰 Painel de Recargas 1.0

Painel de automação para Lovable.dev que realiza ciclos de Remix → Publish → Renomear automaticamente.

## 🔐 Sistema de Login

O painel agora possui um sistema de autenticação para proteger o acesso.

### Credenciais Padrão
- **Usuário**: `admin`
- **Senha**: `admin123`

### Configurar Usuários
Edite o arquivo `config.json` para adicionar ou modificar usuários:

```json
{
  "users": [
    { "username": "admin", "password": "admin123", "name": "Administrador" },
    { "username": "usuario2", "password": "senha456", "name": "Outro Usuário" }
  ]
}
```

## 🚀 Funcionalidades

- **Sistema de login** com sessões seguras
- **Login automático** no Lovable.dev
- **Remix** de projetos com confirmação automática
- **Publish** automático após cada remix
- **Renomear** projetos com incremento automático (STORE2, STORE3, etc.)
- **Contador de créditos** (10 créditos por ciclo)
- **Logs em tempo real** via WebSocket
- **Interface moderna** e responsiva

## 📋 Requisitos

- Node.js 18 ou superior
- Microsoft Edge instalado (usado para automação)
- Conta no Lovable.dev

## 🔧 Instalação

1. Abra a pasta do projeto no terminal
2. Instale as dependências:

```bash
npm install
```

3. Instale os navegadores do Playwright:

```bash
npx playwright install
```

## ▶️ Como usar

### Opção 1: Arquivo .bat (Windows)
Dê duplo clique no arquivo `INICIAR PAINEL.bat`

### Opção 2: Terminal
```bash
npm start
```

O painel será aberto automaticamente em: **http://localhost:3008**

## 📝 Configuração

1. **E-mail e Senha**: Credenciais da sua conta Lovable.dev
2. **URL do Projeto**: Link do projeto que será remixado
3. **Nome Base**: Nome que será usado + incremento (ex: STORE → STORE2, STORE3...)
4. **Repetições**: Quantas vezes o ciclo será executado

## 💰 Créditos

Cada ciclo completo (Remix + Publish + Renomear) consome **10 créditos**.

## ⚙️ Configuração Avançada

Edite o arquivo `config.json`:

```json
{
  "port": 3008,
  "headless": false,
  "defaultRepeatCount": 5,
  "defaultBaseName": "STORE",
  "users": [
    { "username": "admin", "password": "admin123", "name": "Administrador" }
  ]
}
```

## 📁 Estrutura do Projeto

```
Painel de Recargas 1.0/
├── package.json              # Dependências
├── config.json               # Configuração + Usuários
├── INICIAR PAINEL.bat        # Inicialização Windows
├── README.md                 # Este arquivo
├── src/
│   ├── server.js             # Servidor Express + WebSocket + Auth
│   └── services/
│       ├── authService.js    # Serviço de autenticação
│       └── remixAutomationService.js  # Automação Playwright
└── public/
    ├── index.html            # Interface principal (protegida)
    ├── login.html            # Página de login
    ├── css/
    │   └── styles.css        # Estilos
    └── js/
        └── app.js            # Frontend JavaScript
```

## 🛠️ Tecnologias

- **Backend**: Node.js, Express, WebSocket
- **Automação**: Playwright (Microsoft Edge)
- **Frontend**: HTML5, CSS3, JavaScript Vanilla

## ⚠️ Avisos

- Não feche o navegador durante a automação
- A automação usa delays aleatórios para parecer mais natural
- Certifique-se de ter créditos suficientes na conta

---

**Versão**: 1.0.0  
**Porta padrão**: 3008
