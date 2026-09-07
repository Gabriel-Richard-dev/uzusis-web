-- Um database por serviço, num único servidor. A regra da spec é "um database
-- por serviço" — nenhum serviço alcança a tabela do outro, que é o ponto —
-- e não "um contêiner de Postgres por serviço", que multiplicaria por cinco a
-- memória de uma máquina de desenvolvimento sem isolar nada a mais.
--
-- Em produção, separar por instância é o próximo passo natural: a mudança é
-- de DB_URL, não de código.

-- O Keycloak também guarda o estado dele aqui, no próprio database.
CREATE DATABASE keycloak;

CREATE USER catalog       WITH PASSWORD 'catalog'       REPLICATION;
CREATE USER orders        WITH PASSWORD 'orders'        REPLICATION;
CREATE USER payments      WITH PASSWORD 'payments'      REPLICATION;
CREATE USER notifications WITH PASSWORD 'notifications' REPLICATION;
CREATE USER identity      WITH PASSWORD 'identity';

CREATE DATABASE catalog       OWNER catalog;
CREATE DATABASE orders        OWNER orders;
CREATE DATABASE payments      OWNER payments;
CREATE DATABASE notifications OWNER notifications;
CREATE DATABASE identity      OWNER identity;

-- REPLICATION nos usuários acima é o que o Debezium precisa para ler o WAL.
-- O identity não publica evento, então não recebe a permissão: menos
-- privilégio, menos superfície.
