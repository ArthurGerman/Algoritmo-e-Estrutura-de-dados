import { CentroControleEspacial } from './CentroControleEspacial';

const centro = new CentroControleEspacial();

// 1. Simulando entradas no Terminal de Solicitação
centro.criarTicket("USS Discovery", "MIS-01", "COMUNICACOES", "Falha no canal quântico", true, "ALTA");
centro.criarTicket("Apollo 14", "MIS-02", "SUPORTE_VIDA", "Queda de oxigênio no setor 4", true, "EMERGENCIA");
centro.criarTicket("Voyager X", "MIS-03", "NAVEGACAO", "Consulta de rota estelar", false, "NORMAL");

console.log("\n--- INICIANDO A TRIAGEM ---");
// Operador Carlos atende (deve puxar a EMERGÊNCIA primeiro)
centro.processarProximaTriagem("Carlos");
// Operador Carlos atende novamente (puxa a ALTA)
centro.processarProximaTriagem("Carlos");
// Operadora Ana atende (puxa a NORMAL)
centro.processarProximaTriagem("Ana");

console.log("\n--- ATENDIMENTO DOS ESPECIALISTAS ---");
centro.concluirAtendimentoEspecialista("SUPORTE_VIDA");
centro.concluirAtendimentoEspecialista("COMUNICACOES");

// 4. Exibir Relatórios Finais exigidos pela disciplina
centro.exibirRelatorios();