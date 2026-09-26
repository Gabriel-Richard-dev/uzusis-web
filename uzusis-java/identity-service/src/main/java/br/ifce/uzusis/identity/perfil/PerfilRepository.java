package br.ifce.uzusis.identity.perfil;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface PerfilRepository extends JpaRepository<Perfil, Long> {

    Optional<Perfil> findBySub(String sub);

    /** Dois primeiros acessos simultâneos: o segundo espera o commit do primeiro e não faz nada. */
    @Modifying
    @Query(value = """
            INSERT INTO perfil (sub, email, nome, criado_em)
            VALUES (:sub, lower(:email), :nome, now())
            ON CONFLICT (sub) DO NOTHING
            """, nativeQuery = true)
    void criarSeNaoExistir(String sub, String email, String nome);
}
