# Atalhos Fiscal Web

Versão pública de consulta do Atalhos Fiscal.

O site permite pesquisar e copiar mensagens prontas publicadas pela equipe responsável. A base principal permanece no aplicativo Windows e no servidor interno; este repositório contém somente a cópia destinada à publicação.

## Publicação

A partir da versão 1.4.0 do aplicativo Windows, a atualização do site é **manual**. O app marca alterações pendentes e um computador autorizado pode usar o botão **☁ Atualizar site** para publicar uma nova versão de `data/messages.json`.

A credencial do GitHub não fica no repositório nem na pasta compartilhada do servidor. Nos computadores autorizados, ela é armazenada localmente no Gerenciador de Credenciais do Windows.

A publicação envia somente os campos necessários à versão web: ID, título, categoria, palavras-chave, texto, favorito e data de atualização. Caminhos de rede, nomes de usuários do Windows, backups, histórico e configurações internas não são publicados.

> Atenção: todo conteúdo presente em `data/messages.json` é público. Não inclua dados pessoais, credenciais, informações sigilosas ou caminhos internos da rede.
