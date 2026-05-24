# Sincronizacao entre bancos

Esta API permite configurar um banco remetente, opcionalmente um banco destinatario dedicado, mapear tabelas e colunas entre estruturas diferentes e executar a copia completa dos dados para o banco de destino.

As migrations criadas para esse modulo servem apenas para persistir os perfis e os mapeamentos. A importacao dos dados nao roda junto com `php artisan migrate` e nao fica presa ao `docker compose up -d`.

As rotas HTTP desse modulo estao publicas e nao exigem autenticacao por token.

## Fluxo recomendado

1. Criar um perfil de sincronizacao em `POST /api/database-sync/profiles`.
2. Consultar os esquemas dos dois bancos em `GET /api/database-sync/profiles/{profileId}/schema`.
3. Cadastrar os mapeamentos das tabelas em `POST /api/database-sync/profiles/{profileId}/table-mappings`.
3.1. Se preferir, cadastrar todos os mapeamentos de uma vez em `POST /api/database-sync/profiles/{profileId}/table-mappings/bulk`.
4. Executar a sincronizacao manualmente via API em `POST /api/database-sync/profiles/{profileId}/execute` ou via comando Artisan `php artisan database-sync:run {profileId}`.

## Perfil de sincronizacao

Exemplo de payload para criar um perfil usando o banco padrao da aplicacao como destino:

```json
{
  "v_name": "Migracao sistema legado > LocSystem",
  "b_use_default_destination": true,
  "source": {
    "driver": "mysql",
    "host": "10.0.0.20",
    "port": 3306,
    "database": "legacy_db",
    "username": "legacy_user",
    "password": "secret"
  }
}
```

Se quiser apontar para outro banco destinatario, envie `b_use_default_destination` como `false` e preencha `destination`.

## Mapeamento de tabelas

Cada mapeamento define:

- tabela de origem
- tabela de destino
- ordem de sincronizacao
- chave primaria da origem
- chave primaria da tabela destino
- se a chave primaria do destino e auto incremento
- se a tabela destino deve ser limpa antes da carga
- estrategia de conflito no destino
- colunas usadas para detectar conflito quando a estrategia for `skip` ou `upsert`
- lista de colunas mapeadas

Exemplo:

```json
{
  "i_sync_order": 10,
  "v_source_table": "counties",
  "v_destination_table": "counties",
  "v_source_primary_key": "id",
  "v_destination_primary_key": "i_id",
  "b_destination_auto_increment": true,
  "b_truncate_before_sync": true,
  "v_conflict_strategy": "insert",
  "conflict_target_columns": [],
  "column_mappings": [
    {
      "mode": "direct",
      "source_column": "name",
      "destination_column": "v_name"
    }
  ]
}
```

Estrategias disponiveis:

- `insert`: comportamento atual, tenta inserir sempre e falha se houver chave unica duplicada
- `skip`: se encontrar registro existente pelas `conflict_target_columns`, reutiliza o ID existente e segue sem erro
- `upsert`: se encontrar registro existente pelas `conflict_target_columns`, atualiza os demais campos do registro existente

Para o caso de `users`, o formato recomendado e este:

```json
{
  "i_sync_order": 20,
  "v_source_table": "user",
  "v_destination_table": "users",
  "v_source_primary_key": "id",
  "v_destination_primary_key": "i_id",
  "b_destination_auto_increment": true,
  "b_truncate_before_sync": true,
  "v_conflict_strategy": "upsert",
  "conflict_target_columns": ["v_email"],
  "column_mappings": [
    {
      "mode": "direct",
      "source_column": "email",
      "destination_column": "v_email"
    }
  ]
}
```

## Relacionamentos com IDs criptografados

Quando a tabela de origem usa identificadores como `cm9acq0c4325gxqjy31jbyna4` e a tabela de destino usa IDs numericos auto incrementais, o remapeamento precisa ser configurado como `relation`.

Exemplo:

```json
{
  "i_sync_order": 20,
  "v_source_table": "users",
  "v_destination_table": "users",
  "v_source_primary_key": "id",
  "v_destination_primary_key": "i_id",
  "b_destination_auto_increment": true,
  "b_truncate_before_sync": true,
  "column_mappings": [
    {
      "mode": "direct",
      "source_column": "name",
      "destination_column": "v_name"
    },
    {
      "mode": "relation",
      "source_column": "county_id",
      "destination_column": "i_county_id",
      "reference_source_table": "counties"
    }
  ]
}
```

Regra importante:

- a tabela referenciada precisa ter sido cadastrada no mesmo perfil
- a tabela referenciada precisa informar `v_source_primary_key`
- a tabela referenciada precisa possuir `i_sync_order` menor que a tabela dependente

## Rotas disponiveis

- `GET /api/database-sync/profiles`
- `GET /api/database-sync/profiles/{profileId}`
- `POST /api/database-sync/profiles`
- `PUT /api/database-sync/profiles/{profileId}`
- `DELETE /api/database-sync/profiles/{profileId}`
- `GET /api/database-sync/profiles/{profileId}/schema`
- `GET /api/database-sync/profiles/{profileId}/table-mappings`
- `POST /api/database-sync/profiles/{profileId}/table-mappings`
- `POST /api/database-sync/profiles/{profileId}/table-mappings/bulk`
- `PUT /api/database-sync/table-mappings/{mappingId}`
- `DELETE /api/database-sync/table-mappings/{mappingId}`
- `GET /api/database-sync/profiles/{profileId}/status`
- `POST /api/database-sync/profiles/{profileId}/execute`

## Fluxo no Postman

Para fazer tudo em poucas chamadas no Postman, use este fluxo:

1. `POST /api/database-sync/profiles`
2. `POST /api/database-sync/profiles/{profileId}/table-mappings/bulk`
3. `POST /api/database-sync/profiles/{profileId}/execute`
4. `GET /api/database-sync/profiles/{profileId}/status`

Enquanto a importacao estiver rodando, deixe a requisicao de status em outra aba e clique em `Send` para acompanhar o andamento por tabela.

Nao dispare `POST /execute` de novo enquanto o status ainda estiver `running`. Se uma segunda execucao tentar limpar tabelas que a primeira ainda esta usando, o MySQL pode retornar erro de lock wait timeout.

O endpoint `POST /execute` pode demorar bastante para responder em importacoes grandes. O acompanhamento real deve ser feito pelo endpoint de status em outra aba do Postman.

Enquanto o status estiver `running`, os registros podem ainda nao aparecer no banco destinatario. Isso acontece porque a escrita segue dentro de transacao e o commit so acontece ao final da sincronizacao.

Exemplo de payload para o cadastro em lote:

```json
{
  "replace_existing": true,
  "table_mappings": [
    {
      "i_sync_order": 10,
      "v_source_table": "pricing_plan",
      "v_destination_table": "pricing_plans",
      "v_source_primary_key": "id",
      "v_destination_primary_key": "i_id",
      "b_destination_auto_increment": true,
      "b_truncate_before_sync": true,
      "column_mappings": [
        {
          "mode": "direct",
          "source_column": "name",
          "destination_column": "v_name"
        }
      ]
    },
    {
      "i_sync_order": 20,
      "v_source_table": "user",
      "v_destination_table": "users",
      "v_source_primary_key": "id",
      "v_destination_primary_key": "i_id",
      "b_destination_auto_increment": true,
      "b_truncate_before_sync": true,
      "column_mappings": [
        {
          "mode": "direct",
          "source_column": "name",
          "destination_column": "v_name"
        }
      ]
    }
  ]
}
```

Se `replace_existing` for `true`, todos os mapeamentos atuais do perfil serao removidos antes de salvar o novo lote.

## Execucao manual quantas vezes quiser

Depois que as migrations do modulo forem aplicadas uma vez para criar as tabelas de configuracao, a carga pode ser executada manualmente sempre que voce quiser.

Pelo backend da aplicacao:

```bash
php artisan database-sync:run 1
```

Pelo Docker deste projeto:

```bash
docker compose exec -T -w /var/www/laravel laravel-1 php artisan database-sync:run 1
```

Troque `1` pelo ID real do perfil salvo em `database_sync_profiles`.

Esse comando:

- le a configuracao do perfil salvo
- conecta no banco remetente e no destinatario
- limpa as tabelas de destino configuradas
- copia os dados novamente
- remonta os relacionamentos usando o mapa entre ID criptografado da origem e ID numerico do destino

Voce pode executar o mesmo comando quantas vezes quiser.

## Observacoes

- A execucao limpa primeiro as tabelas de destino marcadas com `b_truncate_before_sync`.
- A escrita no destino acontece dentro de transacao.
- As senhas das conexoes ficam criptografadas na base da aplicacao.
- O endpoint de schema serve para o front listar tabelas e colunas antes de montar os mapeamentos.