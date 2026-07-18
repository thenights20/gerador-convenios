# Gerador de Convênios em PDF

Site estático para GitHub Pages. O comprovante de inscrição do CNPJ emitido pela Receita Federal é lido localmente no navegador; nenhum arquivo ou dado é enviado para servidor. O PDF final utiliza como base uma conversão direta do DOCX oficial enviado e preserva suas seis páginas, incluindo logotipo, cláusulas integrais, rodapé, testemunhas e assinaturas. Os dados substituídos usam os arquivos originais da fonte Times New Roman; os campos originalmente destacados em amarelo são inseridos em negrito e caixa alta.

O preâmbulo usa tamanho 12 e a mesma margem da cláusula seguinte. O endereço eletrônico do representante é inserido entre aspas.

O formulário valida os dígitos do CPF e solicita o órgão expedidor do RG. No endereço, a UF é escrita por extenso com a preposição adequada, como `Estado de São Paulo`, `Estado do Paraná` ou `Estado da Bahia`.

A área de substituição da apresentação inicial cobre integralmente o texto-placeholder do modelo para impedir sobreposição.

O gerador exige o modelo oficial de seis páginas e interrompe a geração caso o navegador carregue uma versão antiga ou incorreta. Os arquivos principais usam identificadores de versão para evitar cache do GitHub Pages.

O campo de complemento é importado quando informado no comprovante e inserido após o número. Valores com asteriscos são tratados como complemento vazio. O tipo de logradouro abreviado como `R` é convertido para `RUA`.

## Publicação rápida

1. Crie um repositório público no GitHub.
2. Envie todos os arquivos deste pacote para a raiz do repositório, incluindo `modelo-convenio.pdf` e as fontes `TIMES.TTF`, `TIMESBD.TTF`, `TIMESI.TTF` e `TIMESBI.TTF`.
3. Abra **Settings → Pages**.
4. Em **Build and deployment**, selecione **Deploy from a branch**.
5. Escolha a branch `main`, pasta `/(root)` e clique em **Save**.

O endereço ficará no formato `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.
