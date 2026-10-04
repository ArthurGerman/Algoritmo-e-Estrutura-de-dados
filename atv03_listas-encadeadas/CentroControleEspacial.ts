import { FilaEncadeada } from './FilaEncadeada';
import { Ticket, Prioridade, SetorOrbital } from './Modelos';

export class CentroControleEspacial {
    private filaEmergencia = new FilaEncadeada<Ticket>();
    private filaAlta = new FilaEncadeada<Ticket>();
    private filaNormal = new FilaEncadeada<Ticket>();

    private filasEspecialistas: Record<SetorOrbital, FilaEncadeada<Ticket>> = {
        COMUNICACOES: new FilaEncadeada<Ticket>(),
        ENERGIA: new FilaEncadeada<Ticket>(),
        NAVEGACAO: new FilaEncadeada<Ticket>(),
        SUPORTE_VIDA: new FilaEncadeada<Ticket>()
    };

    private totalSolicitacoesDia = 0;
    private contadorPrioridades: Record<Prioridade, number> = { EMERGENCIA: 0, ALTA: 0, NORMAL: 0 };
    private contadorOperadores: Record<string, number> = {};
    private contadorEspecialistas: Record<SetorOrbital, number> = { COMUNICACOES: 0, ENERGIA: 0, NAVEGACAO: 0, SUPORTE_VIDA: 0 };
    private historicoChamadosNave: Record<string, number> = {};

    public criarTicket(nomeNave: string, codigoMissao: string, setor: SetorOrbital, descricao: string, tripulacao: boolean, prioridade: Prioridade): void {
        const ticket: Ticket = {
            id: `TICK-${Math.floor(Math.random() * 90000) + 10000}`,
            nomeNave,
            codigoMissao,
            setor,
            descricao,
            tripulacaoHumana: tripulacao,
            prioridade
        };

        if (prioridade === 'EMERGENCIA') {
            this.filaEmergencia.enqueue(ticket);
        } else if (prioridade === 'ALTA') {
            this.filaAlta.enqueue(ticket);
        } else {
            this.filaNormal.enqueue(ticket);
        }

        this.totalSolicitacoesDia++;
        this.contadorPrioridades[prioridade]++;
        this.historicoChamadosNave[nomeNave] = (this.historicoChamadosNave[nomeNave] || 0) + 1;

        console.log(`[Terminal] Ticket ${ticket.id} gerado para a nave ${nomeNave} (${prioridade}).`);
    }

    public processarProximaTriagem(nomeOperador: string): void {
        let ticket: Ticket | null = null;

        // Regra de prioridade: Emergências sempre primeiro[cite: 1]
        if (!this.filaEmergencia.isEmpty()) {
            ticket = this.filaEmergencia.dequeue();
        } else if (!this.filaAlta.isEmpty()) {
            ticket = this.filaAlta.dequeue();
        } else if (!this.filaNormal.isEmpty()) {
            ticket = this.filaNormal.dequeue();
        }

        if (!ticket) {
            console.log(`[Triagem] Nenhuma solicitação pendente para o operador ${nomeOperador}.`);
            return;
        }

        ticket.operadorResponsavel = nomeOperador;
        this.contadorOperadores[nomeOperador] = (this.contadorOperadores[nomeOperador] || 0) + 1;
        this.filasEspecialistas[ticket.setor].enqueue(ticket);

        console.log(`[Triagem] Operador ${nomeOperador} atendeu a nave ${ticket.nomeNave}. Redirecionada para o setor ${ticket.setor}.`);
    }

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
    
    public concluirAtendimentoEspecialista(setor: SetorOrbital): void {
        const fila = this.filasEspecialistas[setor];
        if (fila.isEmpty()) {
            console.log(`[Especialista - ${setor}] Fila vazia. Nenhum atendimento pendente.`);
            return;
        }

        const ticketAtendido = fila.dequeue();
        if (ticketAtendido) {
            this.contadorEspecialistas[setor]++;
            console.log(`[Especialista - ${setor}] Atendimento finalizado para a nave ${ticketAtendido.nomeNave} (Missão: ${ticketAtendido.codigoMissao}).`);
        }
    }

    public exibirRelatorios(): void {
        console.log("\n================ RELATÓRIOS DO CENTRO DE CONTROLE ================");
        console.log(`Número total de solicitações no dia: ${this.totalSolicitacoesDia}`);
        console.log("Atendimentos por tipo de prioridade:", this.contadorPrioridades);
        console.log("Tickets processados por operador técnico:", this.contadorOperadores);
        console.log("Atendimentos finalizados por especialista:", this.contadorEspecialistas);

        let naveMaisChamados = "";
        let maxChamados = 0;
        for (const [nave, qtd] of Object.entries(this.historicoChamadosNave)) {
            if (qtd > maxChamados) {
                maxChamados = qtd;
                naveMaisChamados = nave;
            }
        }
        console.log(`Nave com maior número de chamados: ${naveMaisChamados} (${maxChamados} chamados)`);
        console.log("==================================================================-\n");
    }
}