# Uzusis

Angular 16 (nginx) + .NET 8 + MySQL + MinIO, tudo orquestrado por Docker Compose.

## Subir

```bash
cp .env.example .env   # preencha as senhas e a JWT_KEY
docker compose up -d --build
```

- Loja e admin: http://localhost:8080
- Console do MinIO: http://localhost:9001

A API aplica as migrations, cria o bucket e — se `ADMIN_EMAIL`/`ADMIN_PASSWORD`
estiverem preenchidos no `.env` — cria o admin inicial. Em branco, nenhum admin
é criado.

Para popular a loja com produtos de exemplo:

```bash
./seed-dev.sh
```

Atenção: interromper um `docker compose up` no meio (Ctrl+C) recria os
containers e, neste ambiente, leva junto os volumes. Para atualizar um serviço
só, prefira `docker compose build <servico> && docker compose up -d <servico>`.

## Desenvolvimento do front

```bash
docker compose up -d db minio api   # dependências
cd uzusis-front && npm start        # proxy.conf.json aponta /api e /storage para os containers
```

## Configuração

Nada de host, senha ou chave no código: tudo vem do `.env` via Compose
(`ConnectionStrings__DefaultConnection`, `JwtSettings__Key`, `Minio__*`,
`EmailConfiguration__*`). O front usa caminhos relativos (`/api`, `/storage`)
que o nginx encaminha.
