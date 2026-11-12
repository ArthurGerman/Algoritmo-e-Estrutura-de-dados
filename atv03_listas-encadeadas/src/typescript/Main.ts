import { CentroControleEspacial } from './CentroControleEspacial.js';

const centro = new CentroControleEspacial();

// 1. Terminal de Solicitação: a nave só informa o nome e a prioridade
centro.criarTicket("USS Discovery", "ALTA");
centro.criarTicket("Apollo 14", "EMERGENCIA");
centro.criarTicket("Voyager X", "NORMAL");

console.log("\n--- INICIANDO A TRIAGEM ---");
// Carlos chama (deve vir a EMERGÊNCIA) e registra os dados
centro.chamarProximoTicket("Carlos");
centro.registrarTriagem("Carlos", { codigoMissao: "MIS-02", setor: "SUPORTE_VIDA", descricao: "Queda de oxigênio no setor 4", tripulacaoHumana: true });

// Carlos chama de novo (vem a ALTA)
centro.chamarProximoTicket("Carlos");
centro.registrarTriagem("Carlos", { codigoMissao: "MIS-01", setor: "COMUNICACOES", descricao: "Falha no canal quântico", tripulacaoHumana: true });

// Ana chama (vem a NORMAL)
centro.chamarProximoTicket("Ana");
centro.registrarTriagem("Ana", { codigoMissao: "MIS-03", setor: "NAVEGACAO", descricao: "Consulta de rota estelar", tripulacaoHumana: false });

console.log("\n--- ATENDIMENTO DOS ESPECIALISTAS ---");
centro.concluirAtendimentoEspecialista("SUPORTE_VIDA", "Suprimento de oxigênio restabelecido");
centro.concluirAtendimentoEspecialista("COMUNICACOES");

// Relatórios finais
centro.exibirRelatorios();
