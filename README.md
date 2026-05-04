# 📖 LocSystem — Gestão e Backoffice Jurídico

![Laravel](https://img.shields.io/badge/Laravel-10-FF2D20?style=for-the-badge&logo=laravel)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![Docker](https://img.shields.io/badge/Docker-Container-2496ED?style=for-the-badge&logo=docker)
![Nginx](https://img.shields.io/badge/Nginx-Load--Balancing-009639?style=for-the-badge&logo=nginx)

O **LocSystem** é uma plataforma robusta de backoffice voltada para escritórios de assessoria jurídica. O sistema centraliza o controle de localização de pessoas, gestão de veículos e operações de campo, oferecendo alta disponibilidade através de balanceamento de carga e auditoria completa.

---

## 🚀 Funcionalidades Principais

- **🔒 Segurança & Acesso:** Autenticação via Sanctum, controle de sessão, redefinição de senha e gestão de usuários banidos.
- **🚗 Gestão de Veículos:** Controle de frotas associadas a assessorias e sistema de anúncios por comarca.
- **👥 Operações de Campo:** Gerenciamento de operadores (localizadores), prepostos e usuários de acesso.
- **📍 Logística Jurídica:** Cadastro de comarcas e registro retroativo de ocorrências (Incidências).
- **💰 Financeiro:** Gestão de carteiras e planos de preços para controle de faturamento.
- **📊 Inteligência:** Dashboard administrativo com visão geral e logs de auditoria.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologias |
| :--- | :--- |
| **Backend** | PHP 8.1, Laravel 10, Sanctum (Auth), PHPMailer |
| **Frontend** | React 19, TypeScript 6 |
| **Infra/DevOps** | Docker, Nginx (Proxy Reverso & Load Balancing), NgRok |
| **Banco & Cache** | MySQL 8, Redis |
| **Testes/Docs** | Swagger (OpenAPI), MailHog (SMTP Test), PHPUnit |

---

## 📦 Arquitetura de Infraestrutura

O projeto utiliza **Alta Disponibilidade**. O Nginx atua como um Proxy Reverso distribuindo o tráfego entre **3 containers** da API Laravel, garantindo estabilidade sob carga.

---

## 🔧 Configuração do Ambiente

### 1. Requisitos
- Sistema Operacional Linux (preferencial).
- Docker e Docker Compose instalados.
- Git.

### 2. Clonagem e Variáveis de Ambiente
```bash
git clone (https://github.com/Ricardov7070/LocSystem-Web.git)
cd LocSystem-Web

### 3 Executando os Containers

Após clonar o projeto, é nescessário renomear ou copiar o arquivo .env.example para .env nos caminhos (".\LocSystem-Web\Api-Backend-LocSystem") e (".\LocSystem-Web\Person-Frontend-LocSystem") no intuido de ajustar as variáveis de ambiente conforme necessário, incluindo as configurações para acesso ao banco de dados, para funcionando do serviço de email e para funcionamento correto do "Redis". Caso esteja em um ambiente linux, basta somente rodar o comando abaixo dentro da pasta do projeto:

cp .env.example .env

### 4. Inicialização dos Containers

Dentro da pasta da API (.\LocSystem-Web\Api-Backend-LocSystem), execute:
docker compose up -d

### 5. Configuração da Rede Docker

Para que os serviços se comuniquem corretamente, execute os comandos abaixo para conectar os containers à rede laravel_app:

## 🖥️ Criar a rede se não existir

docker network create laravel_app

## 🛜 Conectar os serviços

docker network connect laravel_app nginx-container
docker network connect laravel_app laravel-1
docker network connect laravel_app laravel-2
docker network connect laravel_app laravel-3
docker network connect laravel_app react-container
docker network connect laravel_app redis-container
docker network connect laravel_app mysql-container
docker network connect laravel_app mailhog-container
docker network connect laravel_app ngrok-container

## 📑 Documentação e Acesso

- API Base URL: http://localhost:90/api/
- Documentação Swagger: http://localhost:90/api/documentation
- Frontend: http://localhost:5174 (conforme configuração do container React)
- MailHog (Testes de E-mail): Interface para captura de e-mails em ambiente de desenvolvimento.

## 🔒 Usuário Administrador Principal

- User: admin@admin.com
- Password: Admin@237605*#

## 🤝 Contribuição

- Faça um Fork do projeto.
- Crie uma Branch para sua feature (git checkout -b feature/MinhaFeature).
- Dê um Commit nas alterações (git commit -m 'Add: Minha nova feature').
- Envie um Pull Request
