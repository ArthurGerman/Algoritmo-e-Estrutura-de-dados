export type Prioridade = 'EMERGENCIA' | 'ALTA' | 'NORMAL';
export type SetorOrbital = 'COMUNICACOES' | 'ENERGIA' | 'NAVEGACAO' | 'SUPORTE_VIDA';

export interface Ticket {
    id: string;
    nomeNave: string;
    codigoMissao: string;
    setor: SetorOrbital;
    descricao: string;
    tripulacaoHumana: boolean;
    prioridade: Prioridade;
    operadorResponsavel?: string;
}