# MWA Analytics Dashboard 4.8

Moodle block plugin for teachers to monitor student engagement, participation, activity completion, resource access, grades, alerts, pedagogical interventions, and follow-up outcomes within Moodle.

## Atenção hoje e avisos configuráveis

A Central de Ações reúne avisos prioritários de cada curso em um único card. O professor pode acompanhar alunos sem acesso, entregas aguardando correção, respostas às mensagens e notas abaixo do esperado. Postagens em fóruns avaliáveis também entram como entregas aguardando correção enquanto não houver nota. Os avisos oferecem atalhos para abrir o aluno, corrigir a entrega ou responder à conversa.

Use **Configurar avisos** para ativar ou desativar cada regra e definir o número de dias sem acesso e a nota mínima esperada. As escolhas ficam salvas por professor e por curso.

No card, **Ver aluno** abre diretamente o perfil individual já preenchido.

Na lista completa de avisos, **Ver aluno** preserva a seleção durante a atualização automática do dashboard e usa o identificador do estudante para abrir o perfil individual correto com os dados já carregados.

O card compacto **Avisos** substitui o antigo card de horário de pico e abre a aba **Avisos**, com busca, filtros por situação e tipo, ordenação, avisos resolvidos e acesso às ações. Ele mostra novas mensagens, alunos reativados, entregas aguardando correção e **Viu, mas não entregou**. Este último aviso é criado quando há registro de visualização da atividade pelo aluno, nenhuma entrega ou nota foi registrada e o prazo ou período de disponibilidade já encerrou. Em **Aguardando correção**, entram apenas atividades com avaliação manual, como tarefas, fóruns avaliáveis, workshops, bases de dados e glossários. Questionários, H5P, SCORM e demais atividades com autocorreção não geram esse aviso. Essas regras operacionais são independentes do card **Em acompanhamento**.

O conteúdo do card **Avisos** usa espaçamento compacto entre a descrição e o resumo por tipo, mantendo as informações visualmente agrupadas.

Na aba **Avisos**, os indicadores usam critérios objetivos: **Avisos ativos** reúne tudo que ainda não foi resolvido, **Aguardam ação** conta somente entregas esperando correção e casos “Viu, mas não entregou”, e **Resolvidos** mostra os avisos já finalizados pelo professor. O filtro correspondente segue exatamente a mesma regra.

Os três indicadores de **Avisos** seguem o mesmo componente visual arredondado da Central de Ações, com ícone, número em destaque, descrição e faixa superior colorida exibida ao passar o mouse.

Cada indicador também filtra diretamente a lista correspondente. A opção redundante **Não lidos** foi removida da aba de avisos.

No resumo da Central de Ações, a antiga etiqueta **Urgente** passa a se chamar **Atenção**. O card **Avisos** usa a mesma borda superior de 3 px dos demais cards.

O histórico de avisos é armazenado no banco do Moodle por professor e curso. Entregas aguardando correção são resolvidas automaticamente quando a nota é lançada; “Viu, mas não entregou” é resolvido se uma entrega posterior for registrada; e avisos de mensagem são resolvidos somente quando o professor responde pela conversa integrada do Moodle. Intervenções pedagógicas, mensagens em massa e e-mails não resolvem avisos de conversa. Cada resolução registra data e origem, e a ação manual continua disponível.

Os avisos **Viu, mas não entregou** usam um ícone de olho vermelho para destacar claramente a ausência de entrega após o encerramento da atividade.

Os botões **Corrigir** e **Abrir atividade** possuem as mesmas dimensões e mantêm o rótulo em uma única linha.

Nos avisos de correção, o botão **Corrigir** abre diretamente a página da atividade no Moodle. Avisos de atividades monitoradas exibem o nome da atividade identificada pelo módulo do curso e oferecem o atalho **Abrir atividade**.

O menu **Assistente da turma** fica no grupo de estudantes, logo após **Heatmap de acesso**. O antigo separador exclusivo de IA foi removido para simplificar a navegação.

## Requirements

| Item | Requirement |
| --- | --- |
| Moodle | 4.1 or later |
| PHP | 7.4 or later |
| Plugin type | Block |
| Component | `block_mwa_dashboard` |
| Current release | **4.8** |

## Languages

The plugin includes complete language packs for English (`en`), Brazilian Portuguese (`pt_br`), Spanish (`es`), and Simplified Chinese (`zh_cn`). Moodle selects the interface language from the user's language preference and falls back to English when necessary. The internal AI assistant follows the selected Moodle language, including Simplified Chinese.

## Installation

1. Go to **Site administration → Plugins → Install plugins**.
2. Upload the plugin ZIP file and complete Moodle's validation.
3. Add the **MWA Analytics Dashboard** block to a course.
4. Turn editing on and configure the block.
5. Select **Enable event capture in this course** and save.
6. Open the dashboard from the block.

Course data is refreshed whenever the dashboard is opened. Event capture is disabled by default, including after an upgrade, and must be enabled explicitly in every intended course. Hiding the block does not disable capture; clear the setting or remove the block to stop new collection.

All core dashboard features work without an external AI provider.

## Activity monitoring notifications

Teachers can open an activity in **Activities/Resources** and select **Monitor activity**. The button changes to **Monitoring**, and the subscription remains active even after the dashboard or browser is closed.

For supported graded activities, the same control is available as a bell directly on each activity card. A neutral bell means monitoring is disabled; the highlighted amber bell means it is active. The teacher can enable or disable notifications without opening the detail overlay, and the card and detail controls remain synchronized.

The first version sends a Moodle notification when a student makes a new assignment submission, creates a forum post, or submits a quiz attempt. The alert identifies the student, course, activity, date and includes a direct link to the activity. Activating monitoring is an explicit per-activity opt-in: the plugin creates an internal Moodle notification and also sends an email directly to the address registered for the teacher. Direct delivery avoids depending on an email notification preference that may be disabled and prevents duplicate copies from the generic message processor.

Forum monitoring covers both the first post that creates a discussion and subsequent replies. Assignment monitoring covers final submissions as well as file or online-text submissions saved in activities that do not require the final **Submit assignment** button. Related events generated by the same action are deduplicated before delivery.

Selecting **Monitoring** again disables alerts only for that teacher and activity. Monitoring is individual: different teachers can independently subscribe to the same activity.

## Dashboard areas

O histórico de intervenções possui uma barra de período no padrão do Heatmap, iniciando por **Todas** e seguida pelos atalhos para hoje, 7 ou 30 dias, mês atual e intervalo personalizado. Acompanhamentos concluídos são identificados pelo rótulo compacto **Finalizado**.

### Action Center

Summarises the class, presents the main KPIs, identifies priorities, and provides direct access to students, activities, alerts, and intervention workflows.

The message recipient dropdown uses compact name tags instead of full checkbox rows. Selected tags are green with a check mark, deselected tags remain available in red, and hovering shows the complete name.

### Alerts

Highlights students with no recorded access, viewed-but-not-submitted activities, sudden engagement drops, symbolic access, and reactivation. Alert KPIs share a consistent layout and terminology across the dashboard. Activities and resources marked as untracked are removed from item-based alerts and their counters as soon as tracking changes.

### Moodle Messages

The first integrated messaging version brings Moodle private conversations into the dashboard. The inbox lists only students who have already exchanged at least one message with the teacher, avoiding empty entries for every enrolled student. Teachers can search existing conversations, see unread-message counters, read the latest history, reply through Moodle's own messaging records, open the student's individual profile, and start the existing pedagogical-intervention workflow from the same screen. The conversation list respects the active course group, and unread conversations are refreshed automatically while the dashboard remains open.

The reply composer stays fixed at the bottom of the conversation while the message history scrolls independently, so teachers can always answer directly from the dashboard.

Messages sent by the teacher show a delivery indicator: one check means sent and two checks mean read in Moodle. When Moodle provides the read timestamp, the conversation also shows the localized date and time. Email opening is not treated as a Moodle read receipt.

Read and deleted states use Moodle's official `core_message` action constants, ensuring the unread counter and read receipts follow the same interpretation as Moodle's native messaging interface.

The open conversation refreshes in the background every six seconds and immediately when the browser window regains focus. New replies and read receipts appear without reloading the dashboard, while an unfinished reply remains in the composer during refreshes.

In the reply composer, Enter sends the message and Shift+Enter inserts a new line. Input-method composition is respected to prevent accidental sending while typing languages that use composition.

The academic context panel avoids duplicating the student's profile picture and uses the dashboard's calculated student record to show current grade, latest Moodle access, ungraded activities, and available tracked resources that have not yet been accessed.

The Moodle Messages workspace now includes a recent-presence indicator, the current course name, conversation search, quote reply, copy-message actions, and teacher-specific workflow states. Conversations can be marked **Open**, **Needs follow-up**, **Resolved**, or **Archived**, with filters for unread and each workflow category. Filter labels use compact pill backgrounds with vertically and horizontally centred text, including longer states such as **Needs follow-up**. Archived conversations can be reopened at any time. These organisational states belong only to the current teacher and never delete or modify Moodle's original private conversation.

Quoted replies keep their relationship only inside the teacher dashboard. Moodle sends the student only the new reply text; the quoted message is not repeated in the student's private conversation. The dashboard reconstructs the compact quote locally for the teacher.

The context panel also omits the repeated student identity header. Its individual-profile action now uses the student's Moodle name key and the profile module's existing deferred loader, opening the Student Profile page with the selected learner already populated.

The message composer aligns the reply field and Send action to the same visual height, with matching corner radii, balanced spacing, a clear focus state, and a narrower mobile button.

### Class List

Displays participation, student identity and presence, one consolidated situation, graded-activity progress, content/resource progress, current grade, and total time. Selecting a student opens a screen overlay with KPIs, activity and resource indicators, reports, recommendations, and messaging actions without expanding the table. The list and detail views are responsive at browser zoom levels.

The filter card includes an access-date range on its second row. The range uses each learner's latest recorded Moodle access, works together with participation and search filters, and is reset with the shared Clear filters action. Achievement consolidation and spreadsheet export stay beside the date fields, while bulk messaging remains aligned at the opposite edge.

The class list remains horizontal while space is available; at strong zoom it wraps fields inside each row, without introducing a horizontal scrollbar.

### Student Profile

- Evolution Report actions follow the white-and-green spreadsheet-export style and reserve additional horizontal space for the full translated label.
- Student cards show days without access only in their dedicated KPI, avoiding a duplicate status tag in the identity header.
- Graded-activity legends are state-specific: green means grade released, amber means submitted and awaiting grade, blue means not submitted, and red means overdue without submission. The separate **Resources/Content** legend uses green for accessed, blue for available but not accessed, and grey for hidden, restricted, or not-yet-open items. Grey resources remain visible without being counted as missing access until they become available.
- Evolution Report and Message actions live inside the profile filter card beside a compact Clear filters action, using the shared dashboard button dimensions and visual states; the student header remains focused on identity and recognition.
- The translated **Class highlight** is assigned dynamically to the ten highest-ranked eligible students. Eligibility requires at least 60% of the current or total course grade, no monitored activity that is pending while still open for submission, and no more than one day without access. Engagement breaks equal-grade ties, while the badge does not expose a fixed ranking position.
- The Top 10 highlight stays beside the student identification instead of occupying the status-tag row.

Provides an individual view with presence, last access, active days, grade, engagement, activity and resource progress, recent activity, access timeline, daily journey, calendar, notes, and message history. Engagement uses a single situation and includes its reason icons when the student is in follow-up.

### Activities / Resources

Analyses Moodle course modules using course-module IDs and groups the list by the real topic/section names configured in the course. It separates completion or submission from access coverage, displays deadlines and affected students, and provides a direct action that opens the original Moodle activity in a new browser tab. It supports independent tracked and untracked lists and allows teachers to hide tracked items from the main view without removing them from calculations. The spreadsheet export retains complete activity/resource information.

### Grades

- Grade spreadsheet exports use the singular status **Approved** for each individual student row.
- The grade filter keeps Status, Search, Clear and spreadsheet export together, while bulk messaging remains aligned at the opposite edge of the same desktop row.

Shows approved, in-progress, failed, and no-grade populations, distribution, filters, a per-course approval target (60% by default), and spreadsheet export. Schools can change the target in the Grades tab and all approval indicators are recalculated from the same value. Selecting a student opens a wide academic detail panel with grade KPIs, released and pending grades, each activity's maximum grade, progress, attention items, an approval projection, activity status, and contextual actions. Calculations follow the complete maximum of currently monitored graded activities.

Partial grades remain proportional to the maximum currently available and continue to drive the progress bar and the **Partial grades detected** notice. Approval and failure are deliberately withheld until monitored activities reach the full 100 points. At that point, students at or above the configured target enter **Approved**; students below it enter **Failed** only after all monitored items are graded or an overdue item without submission is counted as zero. The same rules are used by KPIs, cards, charts, student details, filters, and spreadsheet export.

In Class List, any released activity below 60% keeps the low-achievement reason. When every released activity reaches at least 60%, the accumulated evaluated result is checked; 60% or more removes the reason. Open or pending ungraded activities stay outside this follow-up determinant, while expired work without delivery contributes zero. Overdue delivery and seven-day inactivity remain independent.

The Grades detail panel continues to show global progress against the current monitored maximum. Class List separately evaluates released activity grades for follow-up: Rafael's 17/30 keeps the reason, while 18/30 removes it when his other released activity is 10/10; the pending 40-point activity does not block removal.

Final course approval has the highest priority in Class List. Once the monitored maximum reaches 100 points, a learner with at least the configured approval score (60 by default) never receives the below-60% achievement icon, even if an individual activity is below 60%. Overdue delivery and inactivity remain separate determinants.

Student cards in Class List include a **View grades** action. It refreshes grade data, closes the current student card, and opens that learner's Grades detail modal directly over Class List, preserving the teacher's navigation context.

Class List resolves each learner's grade row directly from the latest grade payload and searches for activity metadata regardless of row position, preventing valid grades from being skipped when the intermediate roster object is stale or incomplete.

Saving a new approval target confirms the change once and refreshes the dashboard automatically so every dependent indicator uses the updated value.

### Access Heatmap

Shows access distribution by day and hour with period, student, resource, and visualisation filters, plus access-pattern insights and suggested intervention windows.

### Interventions

Records pedagogical actions with period, reason, teacher, student, and status filters. Reason, status, teacher, search, and the compact Clear action occupy the first filter row. Period shortcuts, spreadsheet export, and bulk messaging occupy the second row, with messaging aligned to the right. Selecting a record opens its complete details in a screen overlay with the message, tracked items, intervention snapshot, follow-up progression, and notes. Academic-difficulty snapshots always retain their four diagnostic KPIs, including zero-value states. Spreadsheet export is also available.

Intervention records remain horizontal while space is available; at strong zoom they wrap fields inside each row without a horizontal scrollbar.

### Follow-up Report

- Reason, teacher, student and Clear occupy the first responsive row. Start date, end date and Export Report occupy the second row, preserving the reference layout as browser zoom changes.
- Every new intervention stores the exact graded activities still pending and the exact resources not yet accessed at send time. The follow-up KPIs then use that historical baseline for every intervention reason, while targeted items remain exclusive to Academic pending and Low participation. Expired activities do not enter the actionable Follow-up total. The Individual Evolution Report keeps their current quantity visible only in its separate **Overdue** indicator, without adding them to Total or Pending. Modules added later do not inflate the result, and existing interventions without item identifiers retain a compatible count-based calculation.

Consolidates intervention and subsequent Moodle evidence in one continuous overview. **Situation** shows total learners and approved learners. Activity and resource KPIs show Total, Pending, and Completed/Accessed. The weekly visualisation uses horizontal proportional bars instead of repeating KPI quantities: engagement shows the current level, grade shows current points against the approval target and the exact points still required, Situation shows approved versus not approved, and item progress shows completed/accessed versus pending. The daily access journey remains after the progress and continuity analysis, while the former intervention trajectory table has been removed. The AI Report closes the page as its analytical conclusion.

### Chat with Class

Optional AI assistant for questions about class priorities, activities, communication, and engagement patterns. Individual identities are pseudonymised before external processing.

## Participation and follow-up

Participation considers content access, completion or submission, grades, active days, and relevant Moodle interaction evidence.

| Range | Situation |
| --- | --- |
| 0% | No recorded access |
| 1%–40% | Beginning the pathway |
| 41%–69% | Progressing |
| 70% or more | Consistent pathway |

Follow-up is presented as one situation and may contain reason indicators for an overdue submission, seven days or more without participation, or partial achievement below the course approval target. Students with no recorded access remain in their own situation instead of appearing simultaneously in follow-up.

## Activity and grade conventions

- Green indicates completed, accessed, or a released grade whose current delivery does not await assessment.
- Amber indicates a valid submission awaiting assessment, including an on-time submission associated with a previously entered zero.
- Blue indicates an available open item that is still pending.
- Red is reserved for an overdue graded activity without submission or grade.
- Grey identifies an item that is visible in the course plan but is hidden, restricted, closed, or not yet open to the learner. A grey graded activity keeps its maximum in the planned course total but does not count as pending or overdue while unavailable. A grey resource remains outside the not-accessed total until it becomes available.
- A numeric zero without submission remains a recorded grade but is identified as not submitted; a valid on-time submission moves the visible activity state to awaiting assessment.
- Singular and plural labels adapt to the displayed KPI count.

## Optional AI configuration

1. Go to **Site administration → Plugins → Blocks → MWA Dashboard settings**.
2. Enable AI features.
3. Select DeepSeek, OpenAI, Google Gemini, Anthropic, OpenRouter, or an institutional provider.
4. Save the credential obtained directly from that provider.
5. Test the connection.

The plugin connects directly from the Moodle server to the configured provider. It applies capability and opt-in checks, data minimisation, field allowlisting, pseudonymisation of individual records, aggregate-only class context where appropriate, and a final filter for email addresses, IP addresses, enrolment identifiers, and submission content. Credentials are not exposed to dashboard JavaScript.

The **Institutional / Local** provider accepts an OpenAI-compatible Chat Completions endpoint and an exact model identifier such as `qwen3:8b`. Authentication can be disabled or sent as a Bearer Token. HTTPS remains mandatory for public destinations; HTTP and local or private addresses are accepted only when the administrator explicitly enables the private-network option. This supports deployments based on Ollama, LocalAI, vLLM, LM Studio, Open WebUI, Msty, and other OpenAI-compatible services reachable from the Moodle server.

### Using the Institutional / Local provider

1. Make the AI service reachable from the Moodle server and enable its OpenAI-compatible Chat Completions API.
2. In Moodle, go to **Site administration → Plugins → Blocks → MWA Dashboard settings**.
3. Enable the optional AI features and select **Institutional / Local** as the provider.
4. Keep **API type** set to **OpenAI-compatible**.
5. Enter the complete Chat Completions endpoint. Examples:
   - Institutional HTTPS service: `https://ai.institution.edu/v1/chat/completions`
   - Ollama on another machine in the private network: `http://192.168.1.50:11434/v1/chat/completions`
   - LocalAI, vLLM, LM Studio, Open WebUI, or Msty: use the OpenAI-compatible `/v1/chat/completions` URL published by that service.
6. Enter the exact model identifier made available by the server, for example `qwen3:8b`, `llama3.2`, or the institution's model name.
7. Choose the authentication method:
   - **None**: for a trusted endpoint that does not require credentials. The plugin does not send an `Authorization` header.
   - **Bearer Token**: for an endpoint that requires `Authorization: Bearer ...`. Save the token in the credential section after saving the provider settings.
8. Enable **Private-network server** only when the service uses HTTP, localhost, a `.local` hostname, or a private-network address. Leave it disabled for public Internet endpoints.
9. Save the settings and select **Test connection**. A successful test confirms that Moodle can reach the endpoint and that the selected model, authentication, and response format are accepted.

The endpoint is accessed by the Moodle server, not by the teacher's browser. Therefore, `http://localhost:11434` refers to the Moodle server itself. When Ollama or another local service runs on a different computer, use an address that the Moodle server can reach and configure the service firewall and listening interface accordingly. Do not expose an unauthenticated local AI endpoint directly to the public Internet.

## Version 4.8 highlights

- O item **Chat com a turma** foi renomeado para **Assistente da turma**.
- As traduções do item de navegação foram atualizadas nos quatro idiomas do plugin.
- Build 2026101484.

## Version 4.7.9 highlights

- Classificação compartilhada entre Central de Ações, Turma e Perfil individual.
- Meta alcançada usa o percentual configurado sobre o máximo total do curso; alta participação exige mais de 70% da nota total e meta alcançada.
- Acompanhamento considera entrega vencida, inatividade e aproveitamento parcial, preservando a meta alcançada.
- Build 2026101483.

## Version 4.7.8 highlights

- O perfil individual pode ser inicializado mesmo sem registros de acesso.
- O seletor de alunos usa o controle nativo, com proteção contra carregamentos duplicados e preservação da seleção após atualizar os dados.
- Corrigida a variável de matrícula no cálculo de entregas vencidas que interrompia a montagem do perfil.
- Os textos da marca usam as strings do Moodle, preservando Moodle / WEB ANALYTICS em todos os idiomas incluídos.
- Build atualizado para `2026101480`, com etapa de atualização do plugin para renovar os caches do Moodle.

## Version 4.7.7 highlights

Version 4.7.7 consolidates the corrected activity-closing rules, individual partial-achievement calculation, stable initial loading, page-level refresh controls, and protected brand presentation.

- Initial dashboard loading again follows the stable 4.7.4 flow: the loading layer remains visible until data is ready, then the Action Center opens directly without revealing another background page.
- A missing delivery is now marked overdue only after the activity's real closing/cutoff time; passing the due date while submissions remain open no longer creates a late-delivery warning.
- Partial achievement is evaluated only after the student has at least one released grade; students with no submission and no received grade are not classified as below the partial target.
- The Moodle Web Analytics logo text remains fixed in the official brand language and is excluded from browser translation.
- The Alerts card now uses the same "viewed, but did not submit" list shown in the activity detail, including activities without a deadline.
- Internal assignment components such as `assignsubmission_file` are no longer shown as course activities.
- Initial loading now reveals the dashboard directly on the Action Center; the notice card counts viewed-without-delivery once per student while the full notice list keeps every affected activity.
- Data-driven pages now include their own refresh button and remain on the same page after updating.
- The Action Center keeps “Return to course” beside the page refresh control.
- Page refresh controls are rendered with safe DOM elements, satisfying Moodle's JavaScript HTML-rendering check.

Activity colors, awaiting-grading detection, overdue follow-up, and viewed-without-submission notices use the original 4.7.2 server-state rules based on Moodle's live `act_current`, grade, deadline, module, user, and activity identifiers.

The server now includes a per-student activity-view timestamp in the grade-state payload. This makes **Viewed but not submitted** independent of browser-side log matching, while a zero grade without a submission remains overdue instead of being treated as completed.

Active **Viewed but not submitted** events are always surfaced as operational notices and use a deadline-specific key so older resolved records cannot hide a new occurrence. A full page load or browser refresh now always opens the Action Center.

Final academic achievement defines the upper KPI bands: a student from the configured target (60% by default) through 70% is classified as **Goal reached**; a student above 70% of the final course score is classified as **High participation**. The engagement percentage alone does not move a student with 60/100 into the higher band.

New Moodle message notices now use the direct wording **“Student name sent a message.”** instead of implying that every incoming message is a reply.

Operational notices that were automatically resolved during a partial refresh are reopened when the condition is detected again. Manually resolved notices remain closed, preventing **Viewed but not submitted** from disappearing because of a transient data load.

- The percentage is calculated as **points earned ÷ maximum points of activities already graded × 100**; it is not calculated against the final 100-point course total.
- When the graded activities total 33 points, the 60% target is 19.8 points. Students with 19.8 points or more remain **In progress**, while students below 19.8 points enter follow-up.
- Students without any submitted or graded activity are evaluated as zero against the current partial target and therefore enter follow-up.
- Activities without any released grade remain outside the partial denominator.

## Version 4.7.4 highlights

Version 4.7.4 corrects the current partial achievement calculation.

- The partial target uses only activities for which grades have already been released to the class. If these activities total 33 points, the 60% target is 19.8 points, independently of the final 100-point course total.
- Students at or above the current target remain **In progress**; students below it are placed in follow-up for partial achievement below 60%.
- A student without any delivered or graded activity is evaluated as zero against the current released target and no longer appears as progressing normally.

## Version 4.7.3 highlights

Version 4.7.3 builds on the operational notices workflow, persistent resolution history, retention follow-up actions, and interface refinements across the Action Center, Class List, Activities, Interventions, and Moodle Messages.

The Portuguese class page title is shortened from **Lista da turma** to **Turma**.

**Moodle Messages** now appears in the top bar immediately before the group selector. In the activity detail, the monitoring control is positioned immediately after the no-access message action.

The top-bar message action and group selector share the same height and vertical alignment without a surrounding container. A subtle divider separates the simple message action from the bordered group selector.

The group selector receives a small optical vertical adjustment on desktop so its label and field align with the Moodle Messages icon and text.

- The compact **Avisos** card summarizes new student messages, submissions awaiting manual grading, returning students, and activities viewed without submission.
- The full **Avisos** area provides active, action-required, and resolved indicators, with consistent colors: blue for messages, amber for grading, green for returning students, and red for viewed-but-not-submitted activities.
- Notice history is stored in Moodle by teacher and course. Grading, later submission, and replies in the integrated Moodle conversation can resolve the corresponding notice automatically, while pedagogical interventions do not count as message replies.
- Only activities requiring manual assessment generate an awaiting-grading notice; automatically graded activities are excluded.
- Activity actions open the corresponding Moodle activity directly, while student actions open the individual profile with the learner already selected.
- The weekly retention curve now opens a detailed summary of active, returning, continuing, and absent students. The **Message** action starts a preselected Moodle communication for students who did not return, using **Other** as the intervention reason.
- The obsolete **Atenção hoje** option was removed from the Class List filter.
- Moodle Messages now keeps its search field and workflow labels fully visible, wrapping filters and adapting the layout to the available dashboard width.
- Card labels, borders, tooltips, status terminology, and action-button dimensions were aligned throughout the dashboard.
- All AMD build artifacts are generated as synchronized, minified production files. The notices interface now renders its card, complete list, and settings dialog through Moodle Mustache templates, and notice-history synchronization preloads existing records to avoid per-item database queries.
- Notice KPIs remain neutral at rest and reveal their colored background, border, number, and top accent strip only on hover, matching the other dashboard indicators. Notice rows keep their colored status dots and icons without a colored side border. The integrated Moodle chat includes an emoji picker that inserts the selected symbol at the cursor position.
- Dashboard logs and grades are loaded through separate, sequential Moodle requests to reduce peak server and database load. If one dataset is temporarily unavailable, the other is still rendered instead of discarding the entire dashboard response.
- The retention detail uses a clearer “Class retention · period” title, a single continuation check mark, and neutral card borders while preserving color in the status labels.

## Version 4.7.1 highlights

Version 4.7.1 introduces opt-in activity monitoring, a professional Moodle Messages workspace, broader graded-activity detection, and a maintenance pass focused on security, performance, translation, and Moodle coding standards.

- Bulk-message delivery now uses a floating status card that can be closed and, when a failure occurs, expanded to identify the affected student and whether Moodle or e-mail delivery failed.
- The success-card timer now uses the browser API directly, preventing a completed final recipient from being incorrectly reported as a JavaScript delivery error.
- The Action Center now includes live **New messages** and **Awaiting grading** KPIs, aligned with the existing indicators. They open the unread conversation list and the grading workflow directly.
- **Moodle Messages** is now grouped under **Follow-up**, removing the separate Communication section from the sidebar.
- The Action Center KPI row was simplified to five operational indicators; **Total interactions** and **Average per student** were removed from this summary.
- Clicking **Awaiting grading** now opens the class list filtered to students with at least one submitted activity still waiting for a grade.
- **Awaiting grading** is restricted to manually graded activities. Auto-graded quizzes, H5P, SCORM, and similar modules are excluded consistently from the notice card, KPI, and class-list filter.
- The **Correct** action opens the corresponding Moodle activity page, preserving the activity's normal teacher workflow.
- The compact notice card removes the inherited minimum content height so its summary sits directly below the descriptive text.
- The notices summary uses category colours and keeps each label directly beside its dot: blue for messages, amber for grading, green for reactivated students, and purple for viewed-but-not-submitted activities.
- **Viewed but not submitted** identifies students who opened an assessed activity, have no submission or released grade, and reached the activity deadline or availability close date.
- Action Center KPI tooltips now render above the cards without being clipped by the KPI row.
- Selecting the **Other** intervention reason no longer requires hidden situation or objective fields, keeping the form and server validation consistent.

- Teachers can enable monitoring from the activity detail or directly from the bell on supported activity cards.
- Monitoring covers assignment submissions, first forum discussions, forum replies, and submitted quiz attempts.
- Alerts are delivered through Moodle notifications and directly to the teacher's registered email, with a link to the activity.
- Monitoring remains active when the dashboard and browser are closed and is configured independently by each teacher.
- The messaging workspace shows recent online presence, current course, unread counters, read receipts, conversation search, and automatic refresh.
- Conversations can be marked **Open**, **Needs follow-up**, **Resolved**, or **Archived**, with teacher-specific filters and persistent state.
- Messages can be copied or answered with a quote. The student receives only the new reply text; the quoted-message relationship is stored and reconstructed exclusively in the teacher dashboard.
- Search, workflow selector, and archive action use a compact aligned header that preserves the available conversation space.
- The messaging workspace uses three visually separated white cards on a shared light-blue canvas: conversation list, active conversation, and academic context. The context card presents grade, last access, pending activities, and unaccessed resources as compact indicators with clear profile and intervention actions.
- Bulk-message delivery now uses an animated floating status card above the message footer instead of a progress bar hidden at the bottom of the form. It shows the current recipient count, changes to a green confirmation after success, remains visible for partial or failed delivery, and does not change the modal height.
- Selecting **Other** as the intervention reason keeps the message form concise: the additional identified-situation and intervention-objective fields are omitted, leaving the teacher to provide the subject and message directly.
- The conversation list includes only learners who have exchanged Moodle private messages with the teacher. The open conversation refreshes automatically, updates read receipts without reloading the dashboard, preserves unfinished replies, and supports Enter to send and Shift+Enter for a new line.
- Message read actions, quote previews, latest conversations, unread totals, and teacher workflow states are loaded in bulk, removing per-student and per-message database queries from the inbox workflow.
- Database activities now use Moodle's current `data_records` entries as delivery evidence. An existing learner entry without a released grade is shown as **Submitted, awaiting grade**; a graded entry is shown as released, and a deleted entry no longer counts as submitted.
- The Event Distribution chart consolidates assignment subplugins such as `assignsubmission_file` and `assignsubmission_onlinetext` into the single translated **Assignment** category instead of exposing technical component names as duplicate slices.
- Institutional/local AI endpoint and model inputs use constrained Moodle parameter validation. Newly added PHP and AMD sources include the required Moodle GPL boilerplate headers.
- Moodle Messages no longer contains hard-coded interface fallbacks in its JavaScript source; all visible labels come from the four packaged Moodle language sets.
- The release includes database upgrades, privacy metadata, and complete interface strings in Portuguese, English, Spanish, and Simplified Chinese.

## Version 4.7 highlights

Version 4.7 expands the optional AI integration with an **Institutional / Local** provider for services that implement the OpenAI-compatible Chat Completions protocol.

- Administrators can configure a custom OpenAI-compatible endpoint and the exact model identifier exposed by that service, including identifiers containing a colon such as `qwen3:8b`.
- Institutional/local authentication can be set to **None** or **Bearer Token**. When None is selected, the plugin neither requires a credential nor sends an `Authorization` header.
- Public destinations continue to require HTTPS. HTTP, localhost, `.local`, and private-network addresses are accepted only after the administrator explicitly enables **Private-network server**.
- The existing connection test now validates the configured endpoint, model, authentication method, HTTP response, and OpenAI-compatible response structure before the provider is used by dashboard AI features.
- The integration supports deployments based on Ollama, LocalAI, vLLM, LM Studio, Open WebUI, Msty, and other compatible institutional services reachable from the Moodle server.
- Existing institutional installations retain Bearer Token as their default authentication method, preserving the previous secure behaviour after upgrade.
- Configuration labels, descriptions, validation messages, and no-authentication guidance are available in Brazilian Portuguese, English, Spanish, and Simplified Chinese.
- Automated coverage was added for unauthenticated local endpoints, legacy Bearer Token behaviour, model identifiers such as `qwen3:8b`, and the rule that HTTP requires explicit private-network authorisation.

## Version 4.6.9 highlights

Version 4.6.9 protects open work in overlay dialogs and aligns the activity-detail status badge with its learner tags.

- Overlay dialogs no longer close when the user clicks the dimmed page background or presses Escape. Activity details, grade details, student details, intervention records, reports, achievement dialogs, and message composition remain open until the explicit close or cancel control is used, preventing accidental loss of the current context or drafted message.
- In activity details, the count badge for **Viewed but did not submit** now uses the same red state as the corresponding learner tags instead of the previous amber style.
- Production AMD artifacts were regenerated for every dialog affected by the protected-close behaviour.

## Version 4.6.8 highlights

Version 4.6.8 aligns the weekly visual comparisons in the Follow-up Report with the aggregate KPIs shown above them.

- Weekly comparison panels now use a cumulative student base. The latest week therefore contains every monitored learner included in the summary KPIs, rather than only learners whose first intervention was captured during that week.
- Grade average, approval percentage, engagement average, completed graded activities, and accessed resources now use a consistent population in the latest weekly panel and in the summary cards.
- A learner with no access remains in the report population with the applicable zero values. For example, when one of two monitored learners has 60 points and the other has no access, the report shows a 30-point average and 50% approval instead of presenting the approved learner alone as 60 points and 100% approval.
- The weekly sequence remains useful for progression analysis: earlier panels contain the learners monitored up to that period, while the final panel matches the complete selected report scope.
- The production AMD artifact for the Follow-up Report was regenerated after the calculation was corrected.

## Version 4.6.7 highlights

Version 4.6.7 packages the latest validated corrections for multilingual intervention labels, forum delivery state, grade and resource indicators, exports, Class List sorting, and Moodle course-group filtering.

- Activity details distinguish **submitted and graded** students in green, **submitted and awaiting grading** students in yellow, and students who **viewed but did not submit** in red. A multilingual legend explains the three states inside the activity dialog.
- A released zero associated with a current submission counts as graded. A new submission after the latest correction returns to the awaiting-grade state until Moodle records a newer grade.
- Final approval is calculated against the complete configured course maximum. For example, a 60% target in a 110-point course requires 66 points.
- Final approval takes priority over follow-up classification in both the Class List and Student Profile. Approved students do not return to **Follow-up** because of inactivity, pending work, or overdue work.
- Pending and overdue activity markers, unaccessed-resource markers, and informational reason icons remain visible for approved students. Approval changes the follow-up decision but does not hide the learner's academic history.
- The Class List includes a dedicated **Target reached** KPI for approved students whose participation is below 70%.
- **High participation** now identifies students who have both reached the course grade target and achieved a participation score of at least 70%.
- The Student Profile engagement KPI follows the same decision as the Class List, displaying **Target reached** or **High participation** instead of the previous follow-up label for approved learners.
- A compact message bubble appears beside the situation/reason icons whenever the learner has intervention history. The visible row remains uncluttered; hovering shows the number of interventions sent, the latest date, and the latest reason.
- Clicking the intervention bubble opens that learner's intervention history. The bubble refreshes automatically after intervention data finishes loading and also remains available for learners with **Target reached** or **High participation**.
- Brazilian Portuguese, English, Spanish, and Simplified Chinese strings were updated for the new states, legends, KPI labels, and intervention tooltip.
- Production AMD artifacts were regenerated for Activities, Class List, Student Profile, and Interventions.
The detailed functional changes from earlier releases remain separated in their original sections below.

## Version 4.6.6 highlights

Version 4.6.6 corrects course-group discovery and keeps the active teaching scope visible:

- The course-group selector remains visible when a teacher has access to exactly one group, making the active scope explicit in separate-groups courses. Courses without groups still omit the selector, and Moodle group permissions continue to determine which options are available.
- Existing Moodle groups can now be used as dashboard filters even when the course-wide group mode is **No groups**. The selector offers All groups plus the existing groups in that mode, while separate-groups courses continue to restrict the list according to the teacher's Moodle permissions and memberships.

## Version 4.6.5 highlights

Version 4.6.5 is a maintenance release that republishes the validated multilingual package with updated Moodle version metadata and documentation. Functional improvements remain documented in their original release sections below.

- Intervention reason labels and the **Pending** legend were audited across English, Brazilian Portuguese, Spanish, and Simplified Chinese. Every language contains the required keys, translated terminology is aligned, and the emergency JavaScript fallback no longer forces Portuguese when the preferred Moodle language cannot be loaded.

## Version 4.6.4 highlights

Version 4.6.4 refines forum delivery detection, exported channel labels, and Class List ordering:

- Forum submission state now follows the learner's assessable contribution instead of every later reply. In regular forums, the learner's own discussion starter is the delivery; in single-discussion and Q&A forums, the direct reply to the main post is the delivery. Comments on classmates' posts remain participation evidence but no longer move an already graded forum back to **Submitted, awaiting grade**.
- Spreadsheet exports translate intervention delivery-channel codes into readable labels. The Channel column now displays **Moodle**, **email**, or **Moodle + email** instead of internal values such as `moodle` and `both`.
- Class List sorting includes **Sort by grade**, ordering the highest current course grade first, resolving ties alphabetically, and keeping learners without a grade at the end.

## Version 4.6.3 highlights

Version 4.6.3 consolidates the multilingual interface, gradebook classification, released-zero and resubmission rules, and planned-item visibility across Grades, Class List, and Student Profile:

- Complete Spanish and Simplified Chinese language packs cover dashboard navigation, dynamic labels, messages, reports, interventions, settings, tooltips, and the language instruction used by the internal AI assistant. Moodle continues to fall back to English when a translated string is unavailable.
- A course module is classified as a graded activity only when its authoritative Moodle grade item has a configured maximum greater than zero. Modules with a zero maximum or without a grade item are treated as Resources/Content, including H5P and forums.
- Whole-forum grades use Moodle's authoritative whole-forum grade item. The plugin keeps a single activity entry, adopts the name and maximum from the gradebook, retrieves the released value even when the visible course name differs, and avoids duplicating the forum and its global grade.
- A submitted activity with a released zero is shown in green as **Grade released (0.0)**, whether the grade was generated automatically or entered by the teacher.
- A submitted activity without a grade remains amber as **Submitted, awaiting grade**.
- A teacher-entered zero without a student submission remains blue while the activity is open and turns red when overdue.
- When a student submits again after the latest recorded correction, the activity returns to amber until Moodle records a newer grade.
- Grade counters follow the same rules as the activity markers, preventing a zero without submission from being counted as released and counting a released zero associated with a submission correctly.
- Class List, Student Profile, and Grades now include a shared help tooltip explaining all six graded-activity states, including not-yet-available items, released zero, zero without submission, overdue work, and resubmission after the latest grading.
- Indicator help tooltips are constrained to the visible viewport and raised above cards and suspended dialogs, preventing their text from being clipped or hidden behind adjacent content.
- Every graded activity with a configured maximum above zero is now visible from the beginning of the course. Hidden, restricted, or not-yet-open items use a grey state, retain their configured maximum in the planned course total, and remain outside pending, overdue, and intervention counts until they become available. Partial released grades continue to accumulate against the complete planned maximum.
- Resources/Content also remain visible from the beginning of the course. Green means accessed, blue means currently available but not accessed, and grey means hidden, restricted, closed, or not yet open. Grey resources are not counted as missing access; if a learner accessed an item before it became unavailable, its historical accessed state remains green.
- Resource tooltips identify the unavailable state and show the scheduled opening date when Moodle provides one. The Student Profile resource legend now documents the grey state explicitly.
- Production AMD artifacts were regenerated for Grades, Class List, and Student Profile.

## Version 4.6.1 highlights

Version 4.6.1 is a maintenance release focused on consistent live states across interventions, follow-up reports, grades, Class List, and Student Profile:

- Interventions pagination preserves the current page and the last valid dataset while Moodle refreshes in the background. Duplicate or late requests no longer replace a populated history with an empty result or unexpectedly return navigation to page 1.
- The course-group dropdown is raised above dashboard cards while open, preventing its options from being hidden behind page content.
- Follow-up Report loading waits for the final valid response before presenting report content, avoiding a temporary no-data or load-error state before the report appears.
- Intervention submissions trigger a fresh reload of the Interventions register, Follow-up Report, Follow-up KPIs, and Individual Evolution Report. Newly sent records no longer remain hidden behind a previously loaded in-memory result.
- Follow-up activity totals contain only actionable tracked items: **Total = Pending + Completed**. Overdue activities are excluded from the Follow-up KPI and its chart. The Individual Evolution Report displays the course overdue quantity only in the dedicated **Overdue** field, without adding it to Total or subtracting it from Pending.
- Resource/content KPIs use **Total, Pending, Accessed**. The approval KPI is renamed **Situation** and uses **Total learners, Approved**.
- Weekly item charts use horizontal proportional bars for completed/accessed versus pending. Engagement uses a 0–100 level bar, grade shows the exact points still required to reach the configured approval target, and Situation shows approved versus not approved.
- Explicitly selected intervention targets remain authoritative. An open pending target is not reclassified as overdue merely because the same learner has a different expired activity.
- Class List and Student Profile use the same activity-state rules and colours: released grade in green, submitted and awaiting assessment in amber, open work without submission in blue, and overdue work without submission in red.
- A teacher-entered zero without a student submission is labelled **Activity not submitted - zero grade released by the teacher**. If a valid submission exists within the activity deadline, including a submission made before or after the zero, the item is shown as **Submitted, awaiting grade**. A late attempt made after the deadline or after closure does not trigger that transition, while an on-time submission remains awaiting assessment if the activity closes later.
- Submission timestamps are read from Moodle's live assignment, quiz, forum, and completion records so zero-grade transitions are based on real delivery evidence rather than the numerical grade alone.
- Grade detail **Points of attention** lists only work without a submission. A valid submission awaiting grading is excluded, while a teacher-entered zero without submission remains an attention item.
- Student Profile uses separate activity and resource legends, including the amber submitted-and-awaiting-grade state and the **Resources/Content** title.
- Production AMD artifacts were regenerated for the updated Grades, Class List, Student Profile, Interventions, and Follow-up modules.

## Version 4.6 highlights

Version 4.6 consolidates the latest class-list and gradebook refinements:

- Opening the Grades area now requests a fresh grade payload from Moodle before rendering. Newly released grades and corrections made in the Moodle gradebook therefore update the student table, totals, indicators and grade distribution without requiring a complete browser-page reload.
- Whole-forum grades are identified through Moodle's official grade-item number instead of text in the forum name. A forum and its whole-forum grade remain a single dashboard activity, while the released value and maximum come from the authoritative whole-forum item.
- Class List graded-activity markers now distinguish submitted work awaiting assessment (yellow) from released grades (green, including zero), work not yet submitted (blue), and overdue work without submission (red). Hover text exposes the exact state and released grade.
- The Class List achievement-ranking action is labelled **Highlighted students**, uses the same title inside its ranking card, and sits immediately to the left of bulk messaging on the second filter row. Both action buttons now share the same size, spacing, and internal text alignment.
- Grade-detail activity cards use the same four operational states as Class List: released grade after delivery in green (including zero), submitted work awaiting a grade in yellow, work not submitted in blue, and overdue work without submission in red.
- The AMD build artifacts for Class List and Grades were regenerated in compact production form, keeping Moodle validation aligned with the source files.

## Version 4.4 highlights

Version 4.4 expands intervention follow-up into an evidence-based learning-evolution workflow. It separates a simple return to Moodle from verified academic progress, introduces compact before-and-after visualisations, aligns tracked-item rules across reports and alerts, and improves direct navigation to students and Moodle activities.

### Release focus

- Class List adds a second-row access-date range based on the learner's latest real Moodle access. It combines with the other filters, affects the filtered list and export population, and returns to its empty initial state with Clear filters.
- Class List keeps achievement consolidation and spreadsheet export beside the access dates, with bulk messaging at the far edge of the second row.
- Grades places spreadsheet export directly after Clear filters and keeps bulk messaging at the far right of the same desktop row.
- Interventions moves bulk messaging to the second filter row beside period shortcuts and spreadsheet export, aligned at the right edge.
- Follow-up Report uses the approved two-row filter arrangement: reason, teacher, student and Clear first; dates and PDF export second.
- Follow-up activity and resource KPIs preserve the monitored-item total while moving verified completions or accesses from the pending side to the completed side. Completed graded activities count immediately even when a grade has not yet been released.
- Follow-up status now distinguishes **Awaiting return**, **Returned**, **Partial progress**, and **Full progress**. Course-only access counts as a return; partial and full progress require activity, resource, attempt, completion, or grade evidence according to the intervention type.
- Reasons with selected follow-up items become partial only after at least one tracked activity is completed/graded or a tracked resource is accessed, and full only when all tracked items are resolved. Reasons without selected items use real course-wide evidence after the intervention.
- Follow-up resource KPIs use the same current catalogue as Class List: resources removed from tracking, unavailable resources, future resources, and expired resources are excluded from both the unaccessed and accessed totals.
- Activity and resource KPI balances decrement in real time: each post-intervention completion or access reduces the corresponding Not completed or Not accessed value while increasing the completed or accessed value, without duplication.
- Grade-detail legends use fully coloured pills with concise labels, removing redundant colour names while preserving immediate visual meaning and readable contrast.
- All filled grade-legend pills enforce white label text so global semantic colour utilities cannot reduce their contrast.
- Approval projection treats overdue unsubmitted activities as zero-point opportunities already lost and distributes required points only across still-actionable activities. Its status follows the Grades tab exactly: partial results remain In progress, while Approved or Failed appears only after the same 100-point consolidation rule is satisfied, using the configured 60-point approval target by default.
- Class List gives real Moodle access absolute precedence over grades and administrative events. A teacher-entered grade, including zero, never moves a learner from No recorded access to In progress; the transition starts only after Moodle records the learner's first actual access.
- Last access now prioritises Moodle's authoritative course-access timestamp and falls back to activity logs. Log dates accept one- or two-digit day, month, and hour values, preventing valid records such as `4/08/26` from appearing as an empty last-access value across dashboard views.
- Alert guidance boxes keep the lightbulb fixed to the left of the guidance text with centred vertical alignment, including when the message wraps onto multiple lines.
- Alert guidance uses the same 20-pixel outlined gold lightbulb as the Action Centre cards for consistent visual language.
- Graded activity details include an Average activity grade KPI based only on students who both submitted and received a valid grade, including zero grades. It sits to the right of Coverage, while Deadline moves to the right of No access in the lower KPI row.
- Grade spreadsheet export now reads the filtered performance table in its current on-screen order. Search, status filters, name sorting, grade ordering, and displayed status labels are preserved across the complete filtered result, independently of pagination.
- Grade and intervention XLSX exports now open with automatic filters on every populated column while retaining their frozen header row.
- Class Report and Activities and Resources exports now use native XLSX instead of CSV, with automatic column filters and a frozen header row.
- The message composer is slightly wider and returns its send button to the initial state after completion; its completed progress bar and confirmation indicator are green.
- Opening grades from a Class List student card now overlays only that student dialog, preserving it underneath and suppressing its background tooltips until grades are closed.
- Intervention headers now match the Class List proportions, reason labels are more compact, and the status KPI return-time footer no longer has an internal divider.
- The nested grade detail uses the full student-dialog height and scrolls as one continuous panel, preventing the activity table from being compressed or clipped.
- Intervention table headings now use the same responsive font-size and letter-spacing scale as Class List headings.
- Grade details opened from a student card now expand to their complete content height without an internal scrollbar; limited viewports scroll only the outer student overlay.
- Intervention column headings keep the same final desktop typography as Class List and are no longer reduced by compact zoom rules.
- Nested grade details now compact proportionally on shorter browser viewports so the complete card opens without a scrollbar.
- Nested grade details now clip their footer within rounded lower corners, matching the rest of the student dialog.
- Class List grades are now displayed as prominent, color-coded value chips with a compact points unit.
- The Grades performance list now uses the same compact grade chips, and remaining points are displayed as positive values without a minus sign.
- Grade and remaining-points chips in the performance list were reduced for a quieter fit within their columns.
- Activity average-grade values now turn red below 60% of the activity maximum and green from 60% onward, while the maximum remains neutral.
- Remaining-points chips in Grades now use blue to distinguish them from failed grades; Class List grade chips use the same compact scale as Grades.
- The zero-value footer of the missing-points KPI now uses the singular **Approved** status.
- The overdue-delivery follow-up label now reads **Late delivery** consistently across the class list and alerts.
- The academic-detail KPI uses the singular **Approved** footer whenever no points remain.
- Grade details opened from a Class List card now retain the card's real width at browser zoom, keeping the Progress KPI and grade columns visible.
- Graded activity legends and overdue grade states now use **Late activity** rather than **Expired activity**.
- The **View grades** action in the student card now matches the Evolution Report action's dimensions and visual weight.
- Student-card top actions use one fixed width so their labels cannot make the buttons uneven.
- Evolution Report and View grades now share the same fixed width, 38-pixel height, typography, padding, and corner radius.
- Student-card action sizing is applied directly inside the detached detail modal, preventing the generic 32-pixel button rule from shrinking View grades.
- The Initial Record button is hidden from intervention details while snapshot capture, storage, and follow-up calculations remain unchanged.
- Individual Evolution Reports calculate tracked activity and resource progress from the historical snapshot catalogue, even when no item was attached to the intervention message, and label the baseline as tracked rather than sent items.
- Overdue activities are excluded from the actionable Follow-up activity KPI and remain visible through their dedicated overdue state. In Grades detail, an overdue item without submission remains a valid Point of attention, while submitted work awaiting grading does not.
- Tracked-item summaries now show Pending first with a red dot and Completed second with a green dot, placing each count inside a neutral grey chip.
- The Status KPI footer in intervention details shows the elapsed time from sending to the student's first real return. Pending interventions show the live waiting duration instead.
- When the daily post-intervention journey has no events, it switches to a compact centred empty state instead of reserving the full chart height.
- The evolution report uses three equal overview cards for progress synthesis, seven-day continuity, and student interaction. The former response-time card was removed, continuity uses a compact classification chart, and interaction uses horizontal bars for activities, resources, and attempts.
- Progress over time is presented as compact weekly before-and-after charts for engagement, grade, approval, graded activities, and accessed resources, avoiding an oversized timeline when many interventions exist.
- The **Graded activities** and **Resources/content accessed** KPIs compare items not completed or not accessed at the first intervention with verified progress afterwards. They work even when no item was selected in the intervention message, deduplicate learners, exclude untracked items, and do not add modules created after the intervention to the historical baseline.
- Every student tag generated by a clickable report chart shows only the first name, reveals the complete name on hover, adopts the selected series colour, and opens the preselected Individual Profile.
- Follow-up report legends, result panels, information cards, and chart spacing use a clearer and more compact visual hierarchy.
- Intervention export includes whether follow-up was finalised, and the Status filter can isolate finalised follow-up records.
- Graded activities and attention items in academic detail open the original Moodle activity and expose the complete activity name on hover. Grades below the configured target retain a green released-status label while the number badge and obtained value receive the dedicated attention colour.
- Course achievements are available from Class List and Individual Profile through a clickable medal control. Weekly gold, silver, and bronze recognition can be consolidated into a printable ranking without displaying the former class-highlight badge in Individual Profile.
- Item-based alerts immediately discard activities and resources marked **Do not track** in Activities / Resources. Students with no remaining tracked item leave the corresponding alert and all counters are recalculated.
- Class List and Interventions now use the same fixed-table behaviour as Grades across zoom widths: columns remain inside the card, headings wrap only at natural word boundaries, spacing becomes compact, and long cell content uses ellipsis instead of switching rows into a conflicting card layout.
- Class List keeps its four KPI cards and complete filter/action row aligned during browser zoom, progressively reducing internal typography, spacing, icons, and controls so content remains contained without disruptive wrapping.
- The Class List table no longer retains its former fixed minimum width at browser zoom levels: every column remains within the card while headers, student details, activity/resource markers, status tags, grades, and time values compact proportionally.
- The Interventions register uses the same zoom containment: its compact eight-column list omits the Situation identified column while dates, names, reason and status tags, intervention descriptions, follow-up data, and row actions remain inside the card and compact proportionally.
- Items-per-page menus in Interventions and Activities / Resources, including hidden and untracked lists, open upward as overlays and preserve the current viewport position when focused or selected.
- Activities / Resources retains its established internal column positions and switches to its compact stacked layout only at the existing responsive breakpoint.
- Heatmap and Activities / Resources detail labels, including filtered accesses, students, deadline, closed state, no access, view names, and time-list actions, use Moodle language strings and switch together with the active Portuguese or English language.
- Grades remain **In progress** while the monitored maximum is below 100 points. At 100 points, learners at or above the configured target become **Approved**; learners below it become **Failed** only when every monitored item has a released grade or is overdue without submission and therefore counts as zero.
- A dedicated **Failed** KPI, filter, list status, export status, and chart segment complete the Grades workflow. The chart now compares **Approved, In progress, Failed**.
- Partial-grade colours use the same course-wide maximum and configured target in Grades and Class List: green at or above the current partial target and red below it, without prematurely failing learners who still await assessment.
- Class List student cards open the matching Grades detail card directly and keep their footer actions ordered as **View individual profile**, **View grades**, **Message**, **Evolution report**, and **Close**. Grades detail cards intentionally omit Evolution report.
- Activities and resources are grouped inside darker topic-level background cards, improving separation between Moodle sections while keeping individual item cards visually prominent.
- The six Grades KPIs align on one desktop row and adapt to balanced responsive layouts. Class List, Interventions, filters, cards, and action bars remain contained at browser zoom without horizontal page scrolling.
- Message recipients use removable name tags with full-name hover text; selected tags are green and deselected tags are red.
- Final approval removes only the seven-day inactivity reason. A valid overdue delivery remains an independent follow-up reason, including for an otherwise approved learner; no partial-grade calculation is changed by this priority rule.
- The Action Center **In follow-up** card consumes the exact student set and reason labels calculated by Class List, keeping its count, avatars, bulk message recipients, reason totals, and **View list** result synchronised.

### Unified interface

- KPI titles use consistent black typography while icons, values, trends, and status accents retain their semantic colours.
- Filters use the same custom dropdown behaviour, visual hierarchy, spacing, and sentence-case labels.
- Message channel selectors use filled selected states, stronger borders, check marks, hover feedback, and accessible pressed-state attributes so teachers can immediately distinguish Moodle and email selections.
- Message recipient dropdowns replace long checkbox rows with compact name tags. Selected recipients are green with a check mark, deselected recipients are red, clicking toggles selection, and hovering exposes the complete name.
- Cards, legends, pagination, page-size controls, action buttons, and close controls follow one shared visual pattern.
- Grade, intervention, and student detail cards place their primary actions in a consistent bottom bar. Profile and message actions share the blue style and dimensions, while Evolution Report retains its green identity and Initial Record uses a purple variant at the same size.
- Detail-card action bars are pinned to the visible bottom edge of each modal, keeping the ordered actions aligned even when the card content scrolls.
- The layout uses the available screen width and remains usable at common browser zoom levels and responsive breakpoints.
- Class List and Intervention records remain horizontal while sufficient space exists, never create horizontal page scrollbars, and switch to labelled internal blocks only at strong zoom so content stays inside each card.
- Class pagination, chat counters, intervention table headings, and Teacher Feedback controls now use Moodle language strings throughout and switch automatically between Portuguese and English with the active Moodle language.
- The dashboard logo returns to the Action Center, scrolls to the top, and refreshes current Moodle data.
- The dashboard package includes and displays the original Moodle Web Analytics PNG logo supplied for the project, preventing a broken image in the header.
- The Action Center greeting automatically includes the current course name, and the return-to-course action is positioned at the right side of the header.

### Student navigation and Class List

- Existing installations now synchronise dashboard viewing, AI access, and intervention permissions for Moodle's standard non-editing teacher role, allowing these teachers to open the block and load course data normally.
- In courses using separate groups, a non-editing teacher who has not yet been assigned to a group can open the dashboard without an invalid-parameter failure; the dashboard safely returns an empty student scope until a Moodle group is assigned.
- Each learner has one situation: no recorded access, beginning the pathway, progressing, in follow-up, or consistent pathway.
- Student detail cards show the no-recorded-access situation only once, while retaining distinct risk indicators without duplicate labels.
- The **Situation / Reasons** column centralises the learner's current situation and any applicable follow-up indicators with consistent alignment.
- Follow-up reasons identify overdue delivery, prolonged inactivity, and partial achievement below the course approval target without creating duplicate situations.
- The legend distinguishes **Activities/resources** from **Follow-up reasons**, making the meaning of colours and indicators explicit.
- Selecting a learner opens a suspended detail card with avatar, identity, access, active days, interactions, grade, activities, resources, AI recommendation, messaging, and close actions.
- Student detail cards and Individual Profiles include an **Interventions received** KPI with the total registered and the number still in follow-up. When records exist, selecting it opens the Interventions list already filtered by that learner; a zero-value KPI remains inactive.
- Student and activity AI generation buttons stay inside the recommendation panel, aligned on the right on desktop and full width on small screens. After a result is generated, the action remains at the upper right instead of floating halfway down long responses, and both actions share the same icon, height, width, colour, and spacing.
- **View individual profile** closes the card, opens Student Profile, and preselects the correct learner.
- Student Profile search remains editable after a match, supports Backspace/Delete and clear, and does not reopen old suggestions after navigation.
- The Evolution Report action appears only for learners with a registered intervention.
- Evolution Report actions use the same white-and-green visual treatment as spreadsheet export, with additional internal spacing for the complete translated label.
- Class List pagination includes an items-per-page selector and spreadsheet export; the selector remains visible above the lower pagination bar when opened.
- The Grades performance list allows teachers to order the currently filtered student names from A–Z or Z–A directly from the **Student** column header.
- Clearing the Grades filters also restores the default list order, with the highest grade first and learners without a grade at the end.

### Activities and resources

- Spreadsheet export now lives inside the activity filter card and shares the dashboard's standard action height, icon sizing, border radius, typography, and compact desktop width, expanding only on mobile.
- Class List spreadsheet export now lives inside its filter card; both list exports use a fixed compact desktop action width and responsive mobile width.
- The approval distribution chart uses circular color markers in its legend instead of horizontal swatches.
- All dashboard clear-filter actions share the same compact 118 px desktop size and soft red warning treatment, while remaining full-width on mobile.
- Filter rows now keep selectors, search, and the compact clear action grouped at the left, reserve the free middle area as visual breathing room, and isolate spreadsheet export at the right. Intervention export remains inside its filter card.
- Page navigation resets the dashboard content scroll position before and after rendering, so Chat with the class and Alerts always open at the top instead of inheriting a previous tab's vertical position.
- Heatmap, Individual Profile, Grades, and Follow-up retain the safe shared filter styling without forced high-specificity layout overrides.
- Buttons only are safely standardised across Heatmap, Individual Profile, Grades, and Follow-up: 36 px height, 8 px radius, 118 px clear/primary actions, and 158 px report/export actions on desktop, with consistent red, green, and blue roles.
- The Heatmap filter follows the approved two-row arrangement: Student, Resource, Event type, Search, and Clear on the first row; period shortcuts and custom dates on the second row.
- The Grades filter follows the approved two-level layout and exact desktop spacing, with status/search/clear grouped at the left and spreadsheet export isolated at the right. Clearing any dashboard filter now also synchronises the visible custom-dropdown label with its restored default value.
- Interventions keeps period, reason, status, teacher, search, clear, and spreadsheet export on one desktop row, with only the space before export allowed to expand.
- Message dialogs opened from an activity detail card appear above the card without closing it, preserving the teacher's context after sending or cancelling.

- The AI area in activity detail cards follows the same visual pattern as the student card recommendation area, including guidance, loading state, result typography, action button, and responsive spacing.
- Activities and resources are grouped by the real Moodle topic or section names, preserving the organisation teachers configured in the course.
- Each Moodle topic is presented as a separate background card containing its heading and related activities or resources, making section boundaries easier to scan.
- Topic containers use a slightly darker neutral background to increase contrast with the individual activity and resource cards inside them.
- Suspended details separate completion rate, access coverage, deadline, delivered or posted students, viewed-but-not-submitted students, and students without access.
- **Open activity in Moodle** opens the original course activity or resource in a new browser tab.
- Deadline content is vertically centred and distinguishes finalised, open, finalises today, and no-deadline states.
- Compact accordions use sentence case, close when selected again, and reveal affected learners without expanding the main list.
- Thin progress bars and compact status labels avoid oversized visual elements.
- Tracked and untracked items remain separate; hidden tracked items can be restored without changing calculations.
- Spreadsheet export includes the complete tracked analysis and preserves accented Portuguese text.

### Grades

- Save approval target and Export spreadsheet use the dashboard's shared action sizing and interaction pattern while retaining their blue primary and green export semantics.
- The six Grades KPIs share one aligned desktop row and change to balanced three-, two-, and one-column layouts at responsive breakpoints.
- Failed and no-grade KPIs now use distinct icons. Grade distribution uses a compact horizontal range chart with semantic colours, rounded bars, direct counts, and percentages in the tooltip.
- Approved, in-progress, and no-grade learners share one unified, paginated performance list controlled by KPI filters.
- Once monitored activities reach 100 points, learners below the configured target move from **In progress** to **Failed** only after every monitored activity is resolved by a released grade or by an overdue activity without submission, which counts as zero. Open activities and submitted work awaiting a grade keep learners **In progress**.
- The suspended academic card contains current grade, approval target, missing points, released grades, progress, attention items, approval projection, and every graded activity.
- The approval target is configurable per course in the Grades tab, starts at 60%, and recalculates all dependent dashboard indicators after saving.
- The graded-activity table displays **Activity**, **Released grade**, and **Maximum grade** as three clearly separated and aligned columns; the released status and obtained value remain together in the same column.
- Each graded activity shows its Moodle maximum alongside the released value, making the difference between obtained and available points visible.
- The progress bar is integrated into the Progress KPI and respects the actual monitored maximum.
- A learner's grade is shown in green as soon as it reaches the current partial target, while the status remains **In progress** until the monitored maximum reaches 100 points.
- Class List grade colours use the same course-wide partial maximum and configured target displayed in Grades; pending submissions do not lower the visual target for an individual learner.
- Activity topics use a white content area while retaining the existing section header colour. Activity states use solid light green, yellow, red, and grey backgrounds instead of gradients.
- Activity topics start expanded and provide a Moodle-style control in the header to collapse or expand each section independently.
- Collapsed activity topics are remembered per course in the current browser and retain their state after the page is refreshed.
- Topic persistence uses the stable Moodle section number. The former overdue-pending KPI is now **Finished activities** and counts tracked activities whose deadline has ended.
- Finished activities display the completed/total relationship (for example, **1 of 4 activities**). Collapsed topics use the real browser storage with a cookie fallback so the state survives refreshes.
- The Finished activities numerator, denominator, and click-through filter include only activities present in the Moodle gradebook.
- Intervention details place the **Initial record** button in the right side of the intervention header strip, matching the historical-record reference layout.
- Class List student detail headers omit email and behavioural chips, keeping the student identity area compact.
- Class List now derives weekly course achievements: gold for weekly highlight, silver for weekly evolution, and bronze for consistency. Student cards show only the accumulated conquest count; clicking it opens medal totals, explanations, and weekly history. Evolution report and Grades actions sit at the top right, while Profile and Message remain in the footer.
- The Evolution report action is shown only for students with interventions, and the top-right Evolution report and Grades buttons use matching dimensions.
- Achievement medal legends use compact pill labels arranged side by side, wrapping cleanly on narrow screens.
- The achievement modal removes its duplicate student name from the title. Class List adds a **Consolidate medals** action beside spreadsheet export, producing a colour printable/PDF ranking weighted as gold 3 points, silver 2, and bronze 1, with medal-based tie-breakers.
- Consolidate achievements sits immediately left of spreadsheet export and opens an in-dashboard report card instead of a new tab. The card supports colour-preserving print/PDF output in landscape format.
- The individual profile replaces the interaction tag with a clickable course-achievements button that opens the student's accumulated medal history; interaction data remains available to internal engagement calculations.
- The individual profile no longer displays the class-highlight badge. Its evolution-report action is shown only for students with recorded interventions and opens the corresponding intervention evolution report.
- Every graded-activity row and attention item in the student grade detail links to its Moodle activity when course-module metadata is available; hovering exposes the complete activity name while the layout keeps long labels truncated.
- For activities below the configured approval target, only the activity number badge and grade value turn purple. The row remains neutral, the released-status label stays green, and the legend displays the live configured percentage.
- The shared dashboard facade now exposes the teacher-feedback module and a bound browser scroll function, allowing the individual-profile evolution report to open normally without the `scrollTo is not a function` error.
- Intervention status distinguishes a simple Moodle/course return from learning progress. Tracked-item reasons become partial after return and full when every item is completed; untracked reasons remain returned after course-only access, become partial after activity/resource interaction, and full after a verified course-grade increase.
- Clicking a point in the intervention-progress chart now presents each matching student name as an individual green confirmation tag, wrapping cleanly across lines instead of showing a comma-separated sentence.
- All clickable follow-up report details now share the same student-tag presentation, including progress points, reason bars, journey points, continuity rows, funnel stages, interaction indicators, and donut segments.
- Student tags display only the first name, reveal the full name on hover, and open the corresponding preselected individual profile when clicked.
- A numeric zero remains a released grade; empty values remain pending or without grade.
- Grade, student, and intervention detail cards keep their action buttons aligned in the lower footer area.
- Grade detail cards keep only **View individual profile**, **Message**, and **Close** in the lower action row; Evolution report is not shown there.
- The Class List student card keeps its actions in the bottom footer in this order: **View individual profile**, **View grades**, **Message**, **Evolution report**, and **Close**.
- In intervention cards, the lower actions follow **View individual profile**, **Initial record**, and **Message**.

### Interventions and follow-up

- Intervention records open in suspended cards with student, teacher, reason, status, message, tracked items, historical snapshot, and teacher notes.
- Intervention reasons use the same wording in message selection, intervention cards, and historical snapshots: **No access recorded**, **Low participation**, **Academic pending work**, **Academic difficulty**, and **Other**.
- Academic-difficulty snapshots align their evaluation KPIs on one row and show the latest assessment as obtained points over the assessment maximum when Moodle provides both values.
- Academic-difficulty snapshots always retain **Latest assessment result**, **Assessments below the reference**, **Attempts made**, and **Completed graded activities**, including when every value is zero or the learner has no recorded access.
- **View individual profile**, **Initial record**, and **Message** share the same lower footer row and button sizing.
- Delete is directly available where applicable; obsolete ellipsis menus and duplicate message actions were removed.
- Filters cover period, reason, status, teacher, and learner using the shared dropdown design.
- Follow-up and intervention-reason KPI titles share the same font, size, weight, and colour rules.

### Alerts, Heatmap, and Action Center

- Alert KPIs evenly fill the row and begin with **No recorded access**.
- Alert, Class List, Intervention, Heatmap, and Follow-up KPI titles use the same black typography.
- Heatmap KPI labels use sentence case: **Peak hour**, **Filtered accesses**, and **Total logs**.
- Action Center cards link directly to the relevant filtered learner or activity population.
- The urgent card describes enrolled students who have not yet recorded Moodle access.

### Optional AI and privacy

- Core analytics work without an AI provider.
- Individual data sent externally is pseudonymised and filtered server-side.
- Returned aliases are restored to the real Moodle display name, so recommendations and suggested messages do not expose labels such as `Student-009` to teachers.
- Alias restoration also recognises shortened three-digit forms such as `009` that an AI provider may return in tables or lists; these are converted back to the corresponding Moodle names locally.
- The class chat follows the available browser height, keeping its header and composer visible while messages and conversation history scroll independently when necessary.
- Chat height is recalculated after tab activation and layout transitions, so returning to or opening the Class Chat does not leave the composer cut off.
- Comparative AI responses are displayed as native styled tables with real headers, rows and columns; Markdown table syntax and blockquote markers are converted before the content appears to teachers.
- The Follow-up AI report uses larger section headings, highlighted section dividers, comfortable paragraph spacing, structured list cards, and a constrained reading width so long analyses remain easy to scan.
- Before generation, the Follow-up AI report uses the same compact recommendation box pattern as student and activity cards, with guidance, animated dots, and the generation action inside the panel.
- AI report section headings are normalised with an uppercase initial letter even when the provider returns them in lowercase.
- Every AI surface uses the same safe output cleaner. Student recommendations, activity suggestions, individual and bulk generated messages, and follow-up reports remove Markdown headings, emphasis, code fences, links, quotes, and table separators before display or insertion into a message field.
- A failed recommendation can be retried without leaving the learner card locked.
- Class-level requests use aggregate context where appropriate, and restricted assessment content remains inside Moodle.
- AI class rosters and individual calculations are restricted to users explicitly assigned the standard Moodle **student** role in the course. Teachers, tutors, managers, and administrators are excluded from learner lists and engagement totals before pseudonymisation.

### Recognition rule

- **Class highlight** eligibility requires a current or total grade of at least 60%, no monitored pending activity that is currently open for submission, and no more than one day without access.
- Up to ten eligible learners are ranked by grade, then engagement, then name. The public badge remains dynamic and does not display a fixed ranking number.

### Exports and compatibility

- Class List and Grades support multi-student selection with a live Message counter and page-level select-all control. Class List participation filters also expose overdue delivery, inactivity of seven days or more, and partial performance below the configured approval target.

- Spreadsheet export is available for Class List, Grades, Interventions, and Activities / Resources.
- Moodle 4.1 or later and PHP 7.4 or later are supported.
- Plugin component: `block_mwa_dashboard`.
- Moodle's native `core/chartjs` module is used; no bundled Chart.js vendor directory is included.
- Suspended Class List and Intervention shells use Moodle Mustache templates.
- User-facing strings use Moodle's language system, and production AMD files are compiled from matching source modules.

## Author

**Bruno Porto**  
Professor and Researcher — IFES/CEFOR  
Espírito Santo, Brazil — 2026
