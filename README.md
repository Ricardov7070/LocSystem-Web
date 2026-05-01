📖 Projeto LocSystem 🔥
Sistema web de gerenciamento de localização e controle de pessoas, voltado para escritórios de assessoria jurídica. Permite:

Autenticação de usuários com controle de sessão (login, logout, redefinição de senha)
Gestão de veículos associados a assessorias jurídicas
Gestão de operadores (localizadores) e seus prepostos
Gestão de assessorias jurídicas e seus usuários de acesso
Incidências (registro e consulta retroativa de ocorrências)
Comarcas onde as assessorias atuam
Carteiras e planos de preços para controle financeiro
Anúncios de veículos e busca por comarca
Sessões, logs e usuários banidos para auditoria e segurança
Dashboard com visão geral do sistema
Em resumo: uma plataforma de backoffice jurídico para rastreamento e controle de pessoas, veículos e operações relacionadas a assessorias jurídicas.

Tecnologias e Ferramentas 💡
PHP: 8.1.34
Laravel: 10.50.2
Composer: 2.9.7
React: 19.2.4
Typescript: 6.0.2
Docker: Para conteinerização e instalação de todas as dependências do projeto
Insomnia: Para testar as rotas da API
Swagger: Para a documentação da API
Sanctum: Para gerar token de autenticação
PHPMailer: Para envio de emails via SMTP
PHPUnit: Para teste unitários das funções do backend
MailHog: Para testes de envio de email
NgRok: Para criação de túnels externos para acesso ao localhost
Mysql: Para criação do banco de dados
Nginx: Para gerenciamento de acesso aos containeres do docker, criação de proxy reverso e também Load-Balanced
Redis: Para armazenamento de dados em cache
Requisitos
Sistema operacional de preferência uma " Distribuição do Linux".
GitHub Instalado.
Docker Instalado.
Configuração do Projeto 🛠️
Clonar o Repositório:

Em um diretório, clone o repositório e entre na pasta do projeto. git clone https://github.com/Ricardov7070/LocSystem-Web.git

Executando os Containeres

Após clonar o projeto, é nescessário renomear ou copiar o arquivo .env.example para .env nos caminhos (".\LocSystem-Web\Api-Backend-LocSystem") e (".\LocSystem-Web\Person-Frontend-LocSystem") e ajustar as variáveis de ambiente conforme necessário, incluindo as configurações para acesso ao banco de dados, para funcionando do serviço de email e para funcionamento correto do "Redis". Caso esteja em um ambiente linux, basta somente rodar o comando abaixo dentro da pasta do projeto:

cp .env.example .env

O projeto se encontra configurado e ambientado para rodar os containeres utilizando a ferramenta do Docker. O sistema está configurado em 3 containeres de aplicação da API para assim a ferramenta conseguir realizar o balanceamento de carga de acesso entre eles. Para inicializar, em um ambiente onde se encontra instalado o docker, você precisará entrar na pasta do projeto (".\LocSystem-Web\Api-Backend-LocSystem") e executar o comando abaixo para subir os containeres já configurados:

docker compose up -d

Reiniciando os Containeres:

Caso haja a nescessidade, você pode reiniciar todos os containeres rodando os comando abaixo:

docker stop $(docker ps -q) --> para parar. docker start $(docker ps -q) --> para iniciar.

Colocando os containeres na rede:

Para adiciona-los na mesma rede no intuito de conectar um container no outro, basta somente rodar os comandos abaixo no terminal:

docker network connect laravel_app nginx-container docker network connect laravel_app laravel-1 docker network connect laravel_app laravel-2 docker network connect laravel_app laravel-3 react-container docker network connect laravel_app redis-container docker network connect laravel_app mysql-container docker network connect laravel_app mailhog-container docker network connect laravel_app ngrok-container

Caso a rede "laravel_app" ainda não exista. Você pode criá-la rodando o comando abaixo antes de adicionar todos os containeres nesta rede:

docker network create laravel_app

Testar as Rotas da API:

É possível acessar o backend atraves de "http://localhost:90/api/" nas rotas abaixo. Utilize o Insomnia para testar as rotas da API individualmente. As rotas principais incluem:

Swagger ✉️
Caso deseje visualizar a documentação das rotas da API, você pode acessar através de "http://localhost:90/api/documentation":

Contribuição 🤲
Contribuições são bem-vindas! Se você encontrar problemas ou tiver sugestões, sinta-se à vontade para abrir uma issue ou enviar um pull request.

Licença 😸
The Laravel framework is open-sourced software licensed under the MIT license.
