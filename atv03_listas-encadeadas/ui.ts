import { CentroControleEspacial } from './CentroControleEspacial.js';
import { SETORES } from './Modelos.js';
import type { SetorOrbital, Prioridade, Ticket } from './Modelos.js';

const centro = new CentroControleEspacial();

const ROTULO_SETOR: Record<SetorOrbital, string> = {
    COMUNICACOES: 'Comunicações',
    ENERGIA: 'Energia',
    NAVEGACAO: 'Navegação',
    SUPORTE_VIDA: 'Suporte à Vida'
};
const ICONE: Record<Prioridade, string> = { EMERGENCIA: '🟥', ALTA: '🟧', NORMAL: '🟩' };
const ROTULO_PRIORIDADE: Record<Prioridade, string> = { EMERGENCIA: 'Emergência', ALTA: 'Alta Prioridade', NORMAL: 'Normal' };

function $<T extends HTMLElement>(id: string): T {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Elemento #${id} não encontrado no HTML`);
    return el as T;
}

/** Cria um elemento usando textContent (evita injetar HTML digitado pelo usuário). */
function criar(tag: string, classe: string, texto = ''): HTMLElement {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    el.textContent = texto;
    return el;
}

// ---- Elementos do DOM ----
const inputNave = $<HTMLInputElement>('nomeNave');
const btnEmergencia = $<HTMLButtonElement>('btnEmergencia');
const btnAlta = $<HTMLButtonElement>('btnAlta');
const btnNormal = $<HTMLButtonElement>('btnNormal');
const infoTerminal = $<HTMLDivElement>('infoTerminal');
const listaEsperaTriagem = $<HTMLDivElement>('listaEsperaTriagem');

const inputOperador = $<HTMLInputElement>('nomeOperador');
const btnChamar = $<HTMLButtonElement>('btnChamarProximo');
const infoTriagem = $<HTMLDivElement>('infoTriagemAtual');
const inputMissao = $<HTMLInputElement>('codigoMissao');
const selectSetor = $<HTMLSelectElement>('setorOrbital');
const inputDescricao = $<HTMLTextAreaElement>('descricaoOcorrencia');
const checkTripulacao = $<HTMLInputElement>('tripulacaoHumana');
const btnRegistrar = $<HTMLButtonElement>('btnRegistrarTriagem');

const selectEspSetor = $<HTMLSelectElement>('setorEspecialista');
const inputRegistro = $<HTMLTextAreaElement>('registroAtendimento');
const btnEspecialista = $<HTMLButtonElement>('btnConcluirEspecialista');
const infoEspecialista = $<HTMLDivElement>('infoEspecialista');
const painelEspecialistas = $<HTMLDivElement>('paineisEspecialistasContainer');

// Operador que está com um ticket aberto (null = nenhum)
let operadorAtivo: string | null = null;

// ---------------- 1. Terminal de Solicitação ----------------
function emitir(prioridade: Prioridade): void {
    const nome = inputNave.value.trim();
    if (!nome) {
        infoTerminal.textContent = 'Informe o nome da nave antes de emitir o ticket.';
        inputNave.focus();
        return;
    }

    const ticket = centro.criarTicket(nome, prioridade);
    const posicao = centro.posicaoNaFila(ticket);

    infoTerminal.textContent =
        `${ticket.id} · Nave ${ticket.nomeNave} · ${ICONE[prioridade]} ${ROTULO_PRIORIDADE[prioridade]} · ` +
        `Posição na fila: ${posicao ?? '-'}º`;

    inputNave.value = '';
    atualizarTudo();
}

btnEmergencia.addEventListener('click', () => emitir('EMERGENCIA'));
btnAlta.addEventListener('click', () => emitir('ALTA'));
btnNormal.addEventListener('click', () => emitir('NORMAL'));

// ---------------- 2. Painel Central de Triagem ----------------
function habilitarRegistro(habilitar: boolean): void {
    inputMissao.disabled = !habilitar;
    selectSetor.disabled = !habilitar;
    inputDescricao.disabled = !habilitar;
    checkTripulacao.disabled = !habilitar;
    btnRegistrar.disabled = !habilitar;
    btnChamar.disabled = habilitar;
    inputOperador.disabled = habilitar; // não troca de operador no meio de um atendimento
}

btnChamar.addEventListener('click', () => {
    const operador = inputOperador.value.trim() || 'Operador Padrão';
    const ticket = centro.chamarProximoTicket(operador);

    if (!ticket) {
        infoTriagem.textContent = 'Nenhum ticket pendente para triagem.';
        return;
    }

    operadorAtivo = operador;
    infoTriagem.textContent =
        `Nave ${ticket.nomeNave} · ${ICONE[ticket.prioridade]} ${ROTULO_PRIORIDADE[ticket.prioridade]} · ` +
        `Operador: ${operador}`;
    habilitarRegistro(true);
    inputMissao.focus();
    atualizarTudo();
});

btnRegistrar.addEventListener('click', () => {
    if (!operadorAtivo) return;

    const codigoMissao = inputMissao.value.trim();
    if (!codigoMissao) {
        infoTriagem.textContent = 'Informe o código da missão para registrar a chamada.';
        inputMissao.focus();
        return;
    }

    const setor = selectSetor.value as SetorOrbital;
    const ticket = centro.registrarTriagem(operadorAtivo, {
        codigoMissao,
        setor,
        descricao: inputDescricao.value.trim() || 'Sem descrição',
        tripulacaoHumana: checkTripulacao.checked
    });

    if (ticket) {
        infoTriagem.textContent =
            `Operador ${operadorAtivo} registrou a nave ${ticket.nomeNave} (${ticket.prioridade}) ` +
            `e encaminhou para ${ROTULO_SETOR[setor]}.`;
    }

    operadorAtivo = null;
    inputMissao.value = '';
    inputDescricao.value = '';
    checkTripulacao.checked = true;
    habilitarRegistro(false);
    atualizarTudo();
});

// ---------------- 3. Painel de Especialistas ----------------
btnEspecialista.addEventListener('click', () => {
    const setor = selectEspSetor.value as SetorOrbital;
    const ticket = centro.concluirAtendimentoEspecialista(setor, inputRegistro.value.trim());

    infoEspecialista.textContent = ticket
        ? `Atendimento finalizado: nave ${ticket.nomeNave} (Missão ${ticket.codigoMissao}).`
        : `Fila de ${ROTULO_SETOR[setor]} vazia. Nenhum atendimento pendente.`;

    inputRegistro.value = '';
    atualizarTudo();
});

// ---------------- Renderização ----------------
function renderFilaTriagem(): void {
    const fila = centro.obterFilaTriagem();
    listaEsperaTriagem.replaceChildren();

    if (fila.length === 0) {
        listaEsperaTriagem.textContent = 'Nenhum ticket pendente na triagem.';
        return;
    }

    fila.forEach((ticket, i) => {
        listaEsperaTriagem.appendChild(
            criar('div', `ticket-tag ${ticket.prioridade}`,
                `${i + 1}º · ${ticket.id} · ${ICONE[ticket.prioridade]} ${ticket.nomeNave}`)
        );
    });
}

function renderEspecialistas(): void {
    const filas = centro.obterFilasEspecialistas();
    painelEspecialistas.replaceChildren();

    for (const setor of SETORES) {
        const fila = filas[setor];
        const historico = centro.obterHistoricoEspecialista(setor);
        const card = criar('div', 'setor-card');
        card.appendChild(criar('div', 'titulo', ROTULO_SETOR[setor].toUpperCase()));

        if (fila.length === 0) {
            card.appendChild(criar('div', 'ticket-tag', 'Sem atendimentos pendentes.'));
        } else {
            fila.forEach((ticket, i) => {
                const linha = criar('div', `ticket-tag ${ticket.prioridade}${i === 0 ? ' chamando' : ''}`,
                    `${i === 0 ? '📣 Chamando: ' : `${i + 1}º · `}${ticket.nomeNave}`);
                linha.appendChild(criar('small', '', `Missão ${ticket.codigoMissao} — ${ticket.descricao}`));
                card.appendChild(linha);
            });
        }

        // Histórico vem de uma pilha: o mais recente aparece primeiro
        if (historico.length > 0) {
            const recentes = historico.slice(0, 3).map((t) => t.nomeNave).join(', ');
            card.appendChild(criar('small', '', `Últimos finalizados: ${recentes}`));
        }

        painelEspecialistas.appendChild(card);
    }
}

function renderEstatisticas(): void {
    const e = centro.obterEstatisticas();
    $('statData').textContent = e.data;
    $('statTotal').textContent = String(e.totalSolicitacoes);
    $('statEmergencia').textContent = String(e.triadosPorPrioridade.EMERGENCIA);
    $('statAlta').textContent = String(e.triadosPorPrioridade.ALTA);
    $('statNormal').textContent = String(e.triadosPorPrioridade.NORMAL);
    $('statTopNave').textContent = e.naveMaisChamados
        ? `${e.naveMaisChamados.nome} (${e.naveMaisChamados.chamados}x)`
        : 'Nenhuma';

    const operadores = Object.entries(e.porOperador).map(([nome, qtd]) => `${nome}: ${qtd}`).join(' | ');
    $('statOperadores').textContent = operadores || '—';

    $('statEspecialistas').textContent = SETORES
        .map((s) => `${ROTULO_SETOR[s]}: ${e.porEspecialista[s]}`)
        .join(' | ');
}

function atualizarTudo(): void {
    renderFilaTriagem();
    renderEspecialistas();
    renderEstatisticas();
}

atualizarTudo();
