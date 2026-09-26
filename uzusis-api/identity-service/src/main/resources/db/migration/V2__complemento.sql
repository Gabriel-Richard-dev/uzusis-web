ALTER TABLE perfil ADD COLUMN complemento VARCHAR(100);

-- O dono do e-mail é o Keycloak. Uma cópia antiga aqui (e-mail trocado lá)
-- não pode barrar o perfil de outra pessoa com 500: o índice deixa de ser único.
DROP INDEX idx_perfil_email;
CREATE INDEX idx_perfil_email ON perfil (email);
