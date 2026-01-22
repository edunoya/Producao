
# 🍦 Gelato Flow - Manual de Publicação

Siga estes passos para ter seu sistema rodando na nuvem com dados sincronizados em todos os dispositivos.

## Passo 1: Configurar o Banco de Dados (Firebase) - GRATIS
1. Acesse o [Firebase Console](https://console.firebase.google.com/).
2. Clique em "Adicionar Projeto" e dê o nome de `GelatoFlow`.
3. No menu lateral, vá em **Build > Firestore Database** e clique em "Criar banco de dados".
4. Selecione "Iniciar em modo de teste" (para facilitar o setup inicial) e escolha um local de servidor (ex: `southamerica-east1`).
5. Clique no ícone de engrenagem (Configurações do Projeto) e, em "Seus aplicativos", clique no ícone `</>` (Web).
6. Registre o app e copie as chaves do objeto `firebaseConfig`.

## Passo 2: Publicar no GitHub
1. Crie uma conta no [GitHub](https://github.com/).
2. Crie um novo repositório chamado `gelato-flow`.
3. Suba seus arquivos para lá.

## Passo 3: Deploy no Vercel
1. Acesse o [Vercel](https://vercel.com/) e conecte sua conta do GitHub.
2. Clique em "Add New > Project" e importe o repositório `gelato-flow`.
3. **IMPORTANTE**: Antes de clicar em "Deploy", abra a seção **Environment Variables** e adicione as seguintes variáveis (usando as chaves que você copiou do Firebase no Passo 1):
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `API_KEY` (Sua chave da Gemini API para os insights)
4. Clique em **Deploy**.

## Como usar em vários dispositivos
- O Vercel te dará um link (ex: `gelato-flow.vercel.app`).
- Acesse esse link em qualquer celular ou PC.
- No celular, use a opção "Adicionar à tela de início" do navegador para instalar como App (PWA).
- Os dados salvos em um aparelho aparecerão automaticamente no outro em segundos!
