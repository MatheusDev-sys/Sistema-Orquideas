# MathFlower - Gestão de Orquídeas

Aplicativo PWA mobile-first para controle rápido de orquídeas em floriculturas.

## Stack
- **Frontend:** Vite + React + TypeScript
- **UI:** TailwindCSS + Lucide Icons + Motion
- **Backend:** Supabase (Auth, Database, Storage)
- **PWA:** Vite PWA Plugin

## Configuração do Supabase

### 1. Criar Tabelas e RPC
Execute o conteúdo do arquivo `supabase_setup.sql` no Editor SQL do seu projeto Supabase.

### 2. Criar Bucket de Fotos
1. Vá em **Storage** no painel do Supabase.
2. Crie um novo bucket chamado `orchid_photos`.
3. Defina o bucket como **Público** (opcional, mas facilita o acesso às URLs).
4. Adicione as seguintes políticas de segurança (Policies):
   - **INSERT:** Permitir para usuários autenticados.
   - **SELECT:** Permitir para usuários autenticados.
   - **DELETE:** Permitir apenas para administradores (ou via RPC).

### 3. Configurar Administrador
Para tornar um usuário administrador:
1. Vá na tabela `profiles` no Editor de Dados.
2. Encontre o usuário desejado e marque a coluna `is_admin` como `true`.

### 4. Variáveis de Ambiente
Renomeie `.env.example` para `.env` e preencha as chaves:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Como rodar localmente
1. `npm install`
2. `npm run dev`

## Como fazer Deploy (GitHub Pages)
1. Certifique-se de que o `base` no `vite.config.ts` está correto se não for a raiz.
2. `npm run build`
3. O conteúdo da pasta `dist` deve ser enviado para o branch `gh-pages`.

## Notas de Uso
- O sistema é otimizado para celulares (iPhone/Android).
- Use o botão "Adicionar à Tela Inicial" no navegador do celular para uma experiência de App nativo.
- O botão "Encerrar Evento" no painel Admin limpa todos os dados para uma nova campanha.
