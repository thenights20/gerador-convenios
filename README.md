# Gerador de Convênios em PDF

Site estático para GitHub Pages. O comprovante de inscrição do CNPJ emitido pela Receita Federal é lido localmente no navegador; nenhum arquivo ou dado é enviado para servidor. O PDF final utiliza como base uma conversão direta do DOCX oficial enviado e preserva suas seis páginas, incluindo logotipo, cláusulas integrais, rodapé, testemunhas e assinaturas.

O campo de complemento é importado quando informado no comprovante e inserido após o número. Valores com asteriscos são tratados como complemento vazio. O tipo de logradouro abreviado como `R` é convertido para `RUA`.

## Publicação rápida

1. Crie um repositório público no GitHub.
2. Envie todos os arquivos deste pacote para a raiz do repositório, incluindo `modelo-convenio.pdf`, `DejaVuSerif.ttf`, `DejaVuSerif-Bold.ttf` e `FONT-LICENSE.txt`.
3. Abra **Settings → Pages**.
4. Em **Build and deployment**, selecione **Deploy from a branch**.
5. Escolha a branch `main`, pasta `/(root)` e clique em **Save**.

O endereço ficará no formato `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.
