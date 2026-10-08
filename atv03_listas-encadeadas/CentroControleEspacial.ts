import { FilaEncadeada } from './FilaEncadeada.js';
import { PilhaEncadeada } from './PilhaEncadeada.js';
import type { Ticket, Prioridade, SetorOrbital, DadosTriagem, Estatisticas } from './Modelos.js';

export class CentroControleEspacial {
    // Filas de triagem (uma por prioridade)
    private filaEmergencia = new FilaEncadeada<Ticket>();
    private filaAlta = new FilaEncadeada<Ticket>();
    private filaNormal = new FilaEncadeada<Ticket>();

    // Ticket que cada operador chamou e ainda está registrando
    private emTriagem = new Map<string, Ticket>();

    // Uma fila de atendimento por especialista
    private filasEspecialistas: Record<SetorOrbital, FilaEncadeada<Ticket>> = {
        COMUNICACOES: new FilaEncadeada<Ticket>(),
        ENERGIA: new FilaEncadeada<Ticket>(),
        NAVEGACAO: new FilaEncadeada<Ticket>(),
        SUPORTE_VIDA: new FilaEncadeada<Ticket>()
    };

    // Histórico de atendimentos finalizados (pilha: o mais recente fica no topo)
    private historicoEspecialistas: Record<SetorOrbital, PilhaEncadeada<Ticket>> = {
        COMUNICACOES: new PilhaEncadeada<Ticket>(),
        ENERGIA: new PilhaEncadeada<Ticket>(),
        NAVEGACAO: new PilhaEncadeada<Ticket>(),
        SUPORTE_VIDA: new PilhaEncadeada<Ticket>()
    };

    // Estatísticas
    private proximoNumero = 1;
    private totalSolicitacoesDia = 0;
    private triadosPorPrioridade: Record<Prioridade, number> = { EMERGENCIA: 0, ALTA: 0, NORMAL: 0 };
    private contadorOperadores: Record<string, number> = {};
    private contadorEspecialistas: Record<SetorOrbital, number> = { COMUNICACOES: 0, ENERGIA: 0, NAVEGACAO: 0, SUPORTE_VIDA: 0 };
    private historicoChamadosNave: Record<string, number> = {};

    // ---------------- 1. Terminal de Solicitação ----------------

    public criarTicket(nomeNave: string, prioridade: Prioridade): Ticket {
        const numero = this.proximoNumero++;
        const ticket: Ticket = {
            id: `TICK-${String(numero).padStart(3, '0')}`,
            numero,
            nomeNave,
            prioridade
        };

        this.filaDaPrioridade(prioridade).enqueue(ticket);

        this.totalSolicitacoesDia++;
        this.historicoChamadosNave[nomeNave] = (this.historicoChamadosNave[nomeNave] ?? 0) + 1;

        console.log(`[Terminal] Ticket ${ticket.id} gerado para a nave ${nomeNave} (${prioridade}).`);
        return ticket;
    }

    /** Posição (começando em 1) do ticket na fila geral de triagem, ou null se já saiu dela. */
    public posicaoNaFila(ticket: Ticket): number | null {
        const indice = this.obterFilaTriagem().findIndex((t) => t.id === ticket.id);
        return indice === -1 ? null : indice + 1;
    }

    // ---------------- 2. Painel Central de Triagem ----------------

    /** O operador chama o próximo ticket (emergências sempre primeiro). */
    public chamarProximoTicket(nomeOperador: string): Ticket | null {
        // Se o operador já está com um ticket aberto, devolve o mesmo (não puxa outro)
        const jaAberto = this.emTriagem.get(nomeOperador);
        if (jaAberto) return jaAberto;

        let ticket: Ticket | null = null;
        if (!this.filaEmergencia.isEmpty()) {
            ticket = this.filaEmergencia.dequeue();
        } else if (!this.filaAlta.isEmpty()) {
            ticket = this.filaAlta.dequeue();
        } else if (!this.filaNormal.isEmpty()) {
            ticket = this.filaNormal.dequeue();
        }

        if (!ticket) {
            console.log(`[Triagem] Nenhuma solicitação pendente para o operador ${nomeOperador}.`);
            return null;
        }

        ticket.operadorResponsavel = nomeOperador;
        this.emTriagem.set(nomeOperador, ticket);
        console.log(`[Triagem] Operador ${nomeOperador} chamou a nave ${ticket.nomeNave} (${ticket.prioridade}).`);
        return ticket;
    }

    /** O operador registra os dados da nave e a redireciona para o especialista. */
    public registrarTriagem(nomeOperador: string, dados: DadosTriagem): Ticket | null {
        const ticket = this.emTriagem.get(nomeOperador);
        if (!ticket) return null;

        ticket.codigoMissao = dados.codigoMissao;
        ticket.setor = dados.setor;
        ticket.descricao = dados.descricao;
        ticket.tripulacaoHumana = dados.tripulacaoHumana;

        this.emTriagem.delete(nomeOperador);
        this.filasEspecialistas[dados.setor].enqueue(ticket);

        this.triadosPorPrioridade[ticket.prioridade]++;
        this.contadorOperadores[nomeOperador] = (this.contadorOperadores[nomeOperador] ?? 0) + 1;

        console.log(`[Triagem] Operador ${nomeOperador} registrou a nave ${ticket.nomeNave}. Redirecionada para ${dados.setor}.`);
        return ticket;
    }

    public obterTicketEmTriagem(nomeOperador: string): Ticket | null {
        return this.emTriagem.get(nomeOperador) ?? null;
    }

    // ---------------- 3. Atendimento Especializado ----------------

    public concluirAtendimentoEspecialista(setor: SetorOrbital, registro?: string): Ticket | null {
        const ticket = this.filasEspecialistas[setor].dequeue();
        if (!ticket) {
            console.log(`[Especialista - ${setor}] Fila vazia. Nenhum atendimento pendente.`);
            return null;
        }

        if (registro) ticket.registroAtendimento = registro;
        this.historicoEspecialistas[setor].push(ticket);
        this.contadorEspecialistas[setor]++;

        console.log(`[Especialista - ${setor}] Atendimento finalizado para a nave ${ticket.nomeNave} (Missão: ${ticket.codigoMissao}).`);
        return ticket;
    }

    // ---------------- Consultas (usadas pela UI) ----------------

    /** Fila de triagem na ordem real de atendimento: emergência, alta, normal. */
    public obterFilaTriagem(): Ticket[] {
        return [
            ...this.filaEmergencia.toArray(),
            ...this.filaAlta.toArray(),
            ...this.filaNormal.toArray()
        ];
    }

    public obterFilasEspecialistas(): Record<SetorOrbital, Ticket[]> {
        return {
            COMUNICACOES: this.filasEspecialistas.COMUNICACOES.toArray(),
            ENERGIA: this.filasEspecialistas.ENERGIA.toArray(),
            NAVEGACAO: this.filasEspecialistas.NAVEGACAO.toArray(),
            SUPORTE_VIDA: this.filasEspecialistas.SUPORTE_VIDA.toArray()
        };
    }

    /** Atendimentos finalizados do setor, do mais recente para o mais antigo (pilha). */
    public obterHistoricoEspecialista(setor: SetorOrbital): Ticket[] {
        return this.historicoEspecialistas[setor].toArray();
    }

    // ---------------- Estatísticas e relatórios ----------------

    public obterEstatisticas(): Estatisticas {
        let naveMaisChamados: Estatisticas['naveMaisChamados'] = null;
        for (const [nome, chamados] of Object.entries(this.historicoChamadosNave)) {
            if (!naveMaisChamados || chamados > naveMaisChamados.chamados) {
                naveMaisChamados = { nome, chamados };
            }
        }

        return {
            data: new Date().toLocaleDateString('pt-BR'),
            totalSolicitacoes: this.totalSolicitacoesDia,
            triadosPorPrioridade: { ...this.triadosPorPrioridade },
            porOperador: { ...this.contadorOperadores },
            porEspecialista: { ...this.contadorEspecialistas },
            naveMaisChamados
        };
    }

    public exibirRelatorios(): void {
        const e = this.obterEstatisticas();
        console.log("\n================ RELATÓRIOS DO CENTRO DE CONTROLE ================");
        console.log(`Data: ${e.data}`);
        console.log(`Número total de solicitações no dia: ${e.totalSolicitacoes}`);
        console.log("Atendimentos por tipo de prioridade:", e.triadosPorPrioridade);
        console.log("Tickets processados por operador técnico:", e.porOperador);
        console.log("Atendimentos finalizados por especialista:", e.porEspecialista);
        if (e.naveMaisChamados) {
            console.log(`Nave com maior número de chamados: ${e.naveMaisChamados.nome} (${e.naveMaisChamados.chamados} chamados)`);
        } else {
            console.log("Nave com maior número de chamados: nenhuma");
        }
        console.log("==================================================================\n");
    }

    // ---------------- Interno ----------------

    private filaDaPrioridade(prioridade: Prioridade): FilaEncadeada<Ticket> {
        if (prioridade === 'EMERGENCIA') return this.filaEmergencia;
        if (prioridade === 'ALTA') return this.filaAlta;
        return this.filaNormal;
    }
}
