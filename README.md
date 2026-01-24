
# 🍦 Gelato Flow - Manual de Publicação Profissional

Siga estes passos para ter seu sistema rodando na nuvem com segurança e performance.

## Passo 1: Configurar o Banco de Dados (Firebase)
1. Acesse o [Firebase Console](https://console.firebase.google.com/).
2. Crie um projeto `GelatoFlow`.
3. Ative o **Firestore Database** em modo de teste e selecione sua região.
4. Registre um Web App e copie as credenciais.

## Passo 2: Publicar e Deploy (Vercel)
1. Conecte seu GitHub ao Vercel.
2. Configure as variáveis de ambiente:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `API_KEY` (Sua chave da Gemini API)

## Segurança e CSP (Content Security Policy)
O sistema foi otimizado para evitar erros de `unsafe-eval`. Se você estiver configurando cabeçalhos de segurança manuais (como em um servidor Apache ou Nginx), recomendamos a seguinte política básica para permitir o funcionamento do app e do Firebase:

```text
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://fonts.googleapis.com; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://*;
```

**Nota Técnica**: O build de produção está com `sourcemap: false` para garantir que nenhum código de depuração baseado em `eval()` seja injetado, mantendo o sistema em conformidade com as diretrizes de segurança modernas.

## Otimizações de Performance
- **Lazy Loading**: As telas são carregadas apenas quando acessadas, acelerando o carregamento inicial.
- **Floating Point Support**: Os campos de gramagem agora aceitam valores decimais (usando ponto ou vírgula) com precisão matemática.
- **Erros Amigáveis**: O sistema substituiu alertas genéricos por mensagens de erro explicativas sobre conectividade e sincronização.
