export type Prioridade = 'EMERGENCIA' | 'ALTA' | 'NORMAL';
export type SetorOrbital = 'COMUNICACOES' | 'ENERGIA' | 'NAVEGACAO' | 'SUPORTE_VIDA';

export const SETORES: SetorOrbital[] = ['COMUNICACOES', 'ENERGIA', 'NAVEGACAO', 'SUPORTE_VIDA'];

/**
 * Ticket gerado no Terminal de Solicitação (apenas nave + prioridade).
 * Os demais campos são preenchidos pelo operador na triagem.
 */
export interface Ticket {
    id: string;
    numero: number;
    nomeNave: string;
    prioridade: Prioridade;
    // Preenchidos na triagem
    codigoMissao?: string;
    setor?: SetorOrbital;
    descricao?: string;
    tripulacaoHumana?: boolean;
    operadorResponsavel?: string;
    // Preenchido pelo especialista
    registroAtendimento?: string;
}

export interface DadosTriagem {
    codigoMissao: string;
    setor: SetorOrbital;
    descricao: string;
    tripulacaoHumana: boolean;
}

export interface Estatisticas {
    data: string;
    totalSolicitacoes: number;
    triadosPorPrioridade: Record<Prioridade, number>;
    porOperador: Record<string, number>;
    porEspecialista: Record<SetorOrbital, number>;
    naveMaisChamados: { nome: string; chamados: number } | null;
}
