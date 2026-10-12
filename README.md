# Atrilhaconcurso

CENTRAL DE ESTUDOS — CONCURSOS POLICIAIS



Crie um aplicativo web completo, funcional e mobile-first para gestão de estudos para concursos públicos, começando por Polícia Federal (Agente) e PRF (Policial Rodoviário Federal), mas permitindo adicionar qualquer outro concurso futuramente sem alterar o código.



O objetivo é acompanhar horas líquidas, conteúdos dos editais, questões, desempenho, revisões e evolução. O aplicativo não substitui cursos ou bancos de questões: será meu painel pessoal de controle. Priorize simplicidade, rapidez, confiabilidade e mínimo preenchimento manual.



1. VISUAL E NAVEGAÇÃO



Interface minimalista, fundo branco, detalhes verdes discretos, cartões simples, tipografia legível e excelente experiência no celular.



Quatro abas fixas:



- Início: resumo e próxima ação.

- Estudar: cronômetro e registros.

- Edital: concursos, disciplinas e tópicos.

- Evolução: estatísticas e gráficos.



Configurações, conta e backup ficam em menu secundário.



2. TELA INICIAL



Mostrar horas líquidas hoje e na semana, metas diária e semanal, questões resolvidas, taxa de acerto, acertos e erros, progresso dos editais, próxima atividade e revisões prioritárias. Incluir botão destacado Iniciar estudo.



Utilizar apenas dados reais. Quando não houver registros, mostrar orientações para começar, nunca números fictícios.



3. CRONÔMETRO



Permitir iniciar, pausar, retomar e finalizar sessões vinculadas a um concurso, disciplina e tópico opcional. Oferecer também a opção de conteúdo compartilhado entre concursos.



Calcular tempo líquido descontando pausas. Persistir sessões ativas, restaurá-las após fechar ou atualizar a página, impedir sessões simultâneas duplicadas e salvar o histórico no banco de dados.



Ao finalizar, permitir registrar opcionalmente questões resolvidas, acertos, erros, itens em branco e observações. O usuário poderá corrigir ou excluir registros, com recálculo dos indicadores.



Nunca contar o mesmo minuto duas vezes, inclusive em conteúdos compartilhados.



4. EDITAIS DINÂMICOS



Cadastrar inicialmente PF — Agente e PRF — Policial Rodoviário Federal, usando conteúdos programáticos oficiais verificáveis. Identificar fonte, ano e situação de verificação. Não apresentar edital antigo como vigente nem inventar disciplinas, tópicos, pesos ou regras.



O sistema deve permitir cadastrar qualquer concurso, órgão, cargo, banca, ano e situação do edital, sem alterar o código. Permitir criar edital do zero, duplicar estruturas para edição, adicionar e reorganizar disciplinas, tópicos e subtópicos, definir cargas horárias e arquivar concursos sem apagar o histórico.



Todos os gráficos, filtros, registros, metas e relatórios devem funcionar com qualquer concurso cadastrado.



Organizar os conteúdos em concurso → disciplina → tópico → subtópico. Cada tópico terá status (não iniciado, em andamento, concluído ou revisar), carga horária estimada, tempo investido, questões resolvidas, taxa de acerto e última sessão.



Permitir vincular conteúdos realmente equivalentes entre concursos, mediante confirmação do usuário. Uma sessão compartilhada atualiza os editais vinculados, mas contabiliza o tempo total apenas uma vez. Conteúdos semelhantes, porém diferentes, permanecem separados.



Separar rigorosamente:



1. Carga horária estimada.

2. Tempo líquido estudado.

3. Progresso ou domínio real.



Tempo investido não representa automaticamente percentual de domínio.



5. QUESTÕES E SIMULADOS — PRIORIDADE



Permitir registrar blocos de questões por concurso, disciplina, tópico opcional e data, informando total, acertos, erros e itens em branco, sem precisar cadastrar cada questão individualmente.



Calcular:



- Questões resolvidas e respondidas.

- Taxa de acerto entre respondidas.

- Percentual de acertos sobre o total.

- Acertos, erros e brancos por disciplina e tópico.

- Evolução por período e concurso.



Validar os registros: acertos + erros + brancos = total. Evitar divisão por zero e recalcular estatísticas após alterações.



Criar registro de simulados e provas anteriores com data, concurso, total de itens, acertos, erros, brancos, regra de pontuação e pontuação líquida, quando aplicável.



Permitir configurar regras por concurso ou simulado, inclusive o sistema Cebraspe, sem presumir que todos os concursos usam a mesma fórmula. Diferenciar taxa de acerto, percentual sobre o total, pontuação líquida e critérios eliminatórios. Não inventar notas de corte nem prever aprovação.



6. METAS, REVISÕES E EVOLUÇÃO



Metas diária e semanal de horas e meta opcional de questões, todas configuráveis. Não impor metas arbitrárias. Alterações de metas não podem modificar o histórico anterior.



A tela Evolução deve apresentar gráficos simples de horas versus metas, questões resolvidas, taxa de acerto por disciplina, desempenho em simulados e carga estimada versus tempo investido. Incluir filtros por concurso, disciplina e período.



Permitir marcar tópicos para revisão. Gerar resumo semanal com planejadovs realizado, desempenho, pendências e sugestões de prioridade justificadas pelos dados reais.



7. LOGIN, PERSISTÊNCIA E SEGURANÇA



Implementar login Google com Supabase Auth e banco PostgreSQL no Supabase, usando integração compatível com o projeto.



Criar estrutura persistente para usuários, concursos, editais, tópicos, sessões, pausas, questões, simulados, metas e revisões. Aplicar RLS para isolar os dados de cada usuário. Não usar dados fictícios como registros reais nem armazenamento local como banco principal.



Disponibilizar exportação JSON e CSV e restauração de JSON com validação, confirmação e prevenção de duplicidades. Não apagar dados silenciosamente. Os registros devem continuar disponíveis após logout, atualização e troca de dispositivo.



Se credenciais ou configurações externas forem necessárias, informar exatamente o que falta. Nunca declarar integração concluída sem funcionamento real.



8. ENTREGA



Entregar todas as funcionalidades acima integradas, com interface responsiva e dados persistentes. Não criar apenas protótipo visual, botões decorativos ou módulos simulados.



Validar especialmente: login, cronômetro e pausas, persistência, cálculo de questões, regras de simulados, conteúdos compartilhados, cadastro de novos concursos, gráficos e backup.



Manter o aplicativo enxuto, sem recursos fora do escopo. Não desperdiçar espaço com páginas institucionais, gamificação excessiva, redes sociais ou funções que não ajudem diretamente nos estudos.



Se algum conteúdo oficial não puder ser confirmado, sinalizar como pendente de verificação em vez de inventá-lo. Priorizar a integridade dos dados, o funcionamento real e a facilidade de uso.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://atrilhaconcurso.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9ccd44c2-cef8-4f64-8e84-9d3d8ab1cf77).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
