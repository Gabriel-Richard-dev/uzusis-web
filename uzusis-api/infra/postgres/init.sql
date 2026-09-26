-- Um database por serviço, num único servidor. A regra da spec é "um database
-- por serviço" — nenhum serviço alcança a tabela do outro, que é o ponto —
-- e não "um contêiner de Postgres por serviço", que multiplicaria por cinco a
-- memória de uma máquina de desenvolvimento sem isolar nada a mais.
--
-- Em produção, separar por instância é o próximo passo natural: a mudança é
-- de DB_URL, não de código.

-- O Keycloak também guarda o estado dele aqui, no próprio database.
CREATE DATABASE keycloak;

-- Senhas do ambiente do contêiner (*_DB_PASSWORD no compose; padrão = nome do database).
\getenv catalog_senha       CATALOG_DB_PASSWORD
\getenv orders_senha        ORDERS_DB_PASSWORD
\getenv payments_senha      PAYMENTS_DB_PASSWORD
\getenv notifications_senha NOTIFICATIONS_DB_PASSWORD
\getenv identity_senha      IDENTITY_DB_PASSWORD

CREATE USER catalog       WITH PASSWORD :'catalog_senha'       REPLICATION;
CREATE USER orders        WITH PASSWORD :'orders_senha'        REPLICATION;
CREATE USER payments      WITH PASSWORD :'payments_senha'      REPLICATION;
CREATE USER notifications WITH PASSWORD :'notifications_senha';
CREATE USER identity      WITH PASSWORD :'identity_senha';

CREATE DATABASE catalog       OWNER catalog;
CREATE DATABASE orders        OWNER orders;
CREATE DATABASE payments      OWNER payments;
CREATE DATABASE notifications OWNER notifications;
CREATE DATABASE identity      OWNER identity;

-- REPLICATION é o que o Debezium precisa para ler o WAL. Só catalog, orders e
-- payments publicam evento (outbox); notification e identity não recebem a
-- permissão: menos privilégio, menos superfície.
--
-- Os padrões das senhas são de dev (o Postgres não é publicado). Em produção,
-- defina as *_DB_PASSWORD antes do primeiro boot: este arquivo só roda com o volume vazio.
