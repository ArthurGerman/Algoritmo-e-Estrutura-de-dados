import { CentroControleEspacial } from './CentroControleEspacial';
import { SetorOrbital, Prioridade } from './Modelos';

const centro = new CentroControleEspacial();

// Elementos do DOM
const inputNave = document.getElementById('nomeNave') as HTMLInputElement;
const inputMissao = document.getElementById('codigoMissao') as HTMLInputElement;
const selectSetor = document.getElementById('setorOrbital') as HTMLSelectElement;
const selectPrioridade = document.getElementById('prioridadeTicket') as HTMLSelectElement;
const inputDescricao = document.getElementById('descricaoOcorrencia') as HTMLTextAreaElement;
const checkTripulacao = document.getElementById('tripulacaoHumana') as HTMLInputElement;

const btnEmitir = document.getElementById('btnEmitirTicket') as HTMLButtonElement;
const btnTriagem = document.getElementById('btnProcessarTriagem') as HTMLButtonElement;
const inputOperador = document.getElementById('nomeOperador') as HTMLInputElement;
const infoTriagem = document.getElementById('infoTriagemAtual') as HTMLDivElement;
const listaEsperaTriagem = document.getElementById('listaEsperaTriagem') as HTMLDivElement;

const selectEspSetor = document.getElementById('setorEspecialista') as HTMLSelectElement;
const btnEspecialista = document.getElementById('btnConcluirEspecialista') as HTMLButtonElement;
const painelEspecialistasContainer = document.getElementById('paineisEspecialistasContainer') as HTMLDivElement;

// Estatísticas Globais no Rodapé
const statTotal = document.getElementById('statTotal') as HTMLElement;
const statEmergencia = document.getElementById('statEmergencia') as HTMLElement;
const statTopNave = document.getElementById('statTopNave') as HTMLElement;

let totalEmergenciasCount = 0;
let totalGeralCount = 0;
const historicoNavesUI: Record<string, number> = {};

// 1. Emitir Ticket
btnEmitir.addEventListener('click', () => {
    const nome = inputNave.value.trim() || "Nave Desconhecida";
    const missao = inputMissao.value.trim() || "MIS-GEN";
    const setor = selectSetor.value as SetorOrbital;
    const prioridade = selectPrioridade.value as Prioridade;
    const desc = inputDescricao.value.trim() || "Sem descrição";
    const tripulacao = checkTripulacao.checked;

    centro.criarTicket(nome, missao, setor, desc, tripulacao, prioridade);

    totalGeralCount++;
    if (prioridade === 'EMERGENCIA') totalEmergenciasCount++;
    historicoNavesUI[nome] = (historicoNavesUI[nome] || 0) + 1;

    atualizarEstatisticasUI();
    atualizarFilaEsperaVisual();

    inputNave.value = '';
    inputMissao.value = '';
    inputDescricao.value = '';
});

// 2. Processar Triagem
btnTriagem.addEventListener('click', () => {
    const operador = inputOperador.value.trim() || "Operador Padrão";

    centro.processarProximaTriagem(operador);

    const filaAtual = centro.obterFilaTriagem();

    if (filaAtual.length === 0) {
        infoTriagem.innerHTML = `<span style="color: var(--accent-cyan)">Operador **${operador}** não há tickets pendentes para triagem.</span>`;
    } else {
        const proximoTicket = filaAtual[0];

        if (!proximoTicket) {
            infoTriagem.innerHTML = `<span style="color: var(--accent-cyan)">Operador **${operador}** não há tickets pendentes para triagem.</span>`;
        } else {
            infoTriagem.innerHTML = `<span style="color: var(--accent-cyan)">Operador **${operador}** priorizou a nave **${proximoTicket.nomeNave}** (${proximoTicket.prioridade}) e encaminhou para **${proximoTicket.setor}**.</span>`;
        }
    }

    atualizarFilaEsperaVisual();
    atualizarEspecialistasVisual();
});

// 3. Concluir Especialista
btnEspecialista.addEventListener('click', () => {
    const setorEscolhido = selectEspSetor.value as SetorOrbital;
    centro.concluirAtendimentoEspecialista(setorEscolhido);

    atualizarEspecialistasVisual();
});

function adicionarTagFilaEspera(nome: string, prioridade: string) {
    if (listaEsperaTriagem.innerText.includes("Nenhum ticket pendente")) {
        listaEsperaTriagem.innerHTML = '';
    }
    const tag = document.createElement('div');
    tag.className = `ticket-tag ${prioridade}`;
    tag.innerText = `[${prioridade}] Nave: ${nome} entrou na fila encadeada.`;
    listaEsperaTriagem.appendChild(tag);
}

function atualizarFilaEsperaVisual() {
    const filaTriagem = centro.obterFilaTriagem();
    listaEsperaTriagem.innerHTML = '';

    if (filaTriagem.length === 0) {
        listaEsperaTriagem.innerHTML = "Nenhum ticket pendente na triagem.";
        return;
    }

    for (const ticket of filaTriagem) {
        const tag = document.createElement('div');
        tag.className = `ticket-tag ${ticket.prioridade}`;
        tag.innerText = `[${ticket.prioridade}] Nave: ${ticket.nomeNave} • Missão: ${ticket.codigoMissao} • Setor: ${ticket.setor}`;
        listaEsperaTriagem.appendChild(tag);
    }
}

function atualizarEspecialistasVisual() {
    const filas = centro.obterFilasEspecialistas();
    const setores: SetorOrbital[] = ['COMUNICACOES', 'ENERGIA', 'NAVEGACAO', 'SUPORTE_VIDA'];

    painelEspecialistasContainer.innerHTML = '';

    for (const setor of setores) {
        const fila = filas[setor];
        const linha = document.createElement('div');
        linha.className = 'ticket-tag';

        if (fila.length === 0) {
            linha.innerText = `${setor}: sem atendimentos pendentes.`;
        } else {
            const nomes = fila.map((ticket) => `${ticket.nomeNave} (${ticket.prioridade})`).join(' | ');
            linha.innerText = `${setor}: ${nomes}`;
        }

        painelEspecialistasContainer.appendChild(linha);
    }
}

function atualizarEstatisticasUI() {
    statTotal.innerText = totalGeralCount.toString();
    statEmergencia.innerText = totalEmergenciasCount.toString();

    let topNave = "Nenhuma";
    let max = 0;
    for (const [nave, qtd] of Object.entries(historicoNavesUI)) {
        if (qtd > max) {
            max = qtd;
            topNave = `${nave} (${qtd}x)`;
        }
    }
    statTopNave.innerText = topNave;
}