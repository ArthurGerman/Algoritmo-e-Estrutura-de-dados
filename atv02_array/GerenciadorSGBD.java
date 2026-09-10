package atv02_array;

public class GerenciadorSGBD {
    private Tabela[] tabelas;
    private int qtdTabelas;

    public GerenciadorSGBD(int capacidadeInicial) {
        this.tabelas = new Tabela[capacidadeInicial];
        this.qtdTabelas = 0;
    }

    public void adicionarTabela(Tabela tabela) {
        if (qtdTabelas == tabelas.length) {
            Tabela[] novoArray = new Tabela[tabelas.length * 2];
            for (int i = 0; i < tabelas.length; i++) {
                novoArray[i] = tabelas[i];
            }
            tabelas = novoArray;
        }
        tabelas[qtdTabelas++] = tabela;
    }

    public Tabela buscarTabela(String nome) {
        for (int i = 0; i < qtdTabelas; i++) {
            if (tabelas[i].getNome().equalsIgnoreCase(nome)) {
                return tabelas[i];
            }
        }
        return null;
    }

    // Executa SELECT de tabela única
    public void executarSelectSimples(String nomeTabela, String[] colunasDesejadas) {
        Tabela tabela = buscarTabela(nomeTabela);
        if (tabela == null) {
            System.out.println("Erro: Tabela não encontrada.");
            return;
        }

        int[] indicesColunas = obterIndicesColunas(tabela, colunasDesejadas);

        // Imprime Cabeçalho
        for (String col : colunasDesejadas) {
            System.out.print(col + "\t\t");
        }
        System.out.println("\n-------------------------------------------");

        // Imprime Registros
        for (int i = 0; i < tabela.getQtdRegistros(); i++) {
            Registro reg = tabela.getRegistros()[i];
            for (int idx : indicesColunas) {
                if (idx != -1) {
                    System.out.print(reg.getValor(idx) + "\t\t");
                } else {
                    System.out.print("N/A\t\t");
                }
            }
            System.out.println();
        }
    }

    // Executa SELECT com JOIN entre duas tabelas
    public void executarSelectJoin(
            String nomeTabA, String nomeTabB,
            String colJoinA, String colJoinB,
            String[] colunasExibirTabA, String[] colunasExibirTabB) {

        Tabela tabA = buscarTabela(nomeTabA);
        Tabela tabB = buscarTabela(nomeTabB);

        if (tabA == null || tabB == null) {
            System.out.println("Erro: Uma ou ambas as tabelas não foram encontradas.");
            return;
        }

        int idxJoinA = tabA.buscarIndiceColuna(colJoinA);
        int idxJoinB = tabB.buscarIndiceColuna(colJoinB);

        if (idxJoinA == -1 || idxJoinB == -1) {
            System.out.println("Erro: Colunas de JOIN inválidas.");
            return;
        }

        int[] idxsExibirA = obterIndicesColunas(tabA, colunasExibirTabA);
        int[] idxsExibirB = obterIndicesColunas(tabB, colunasExibirTabB);

        // Imprime Cabeçalho
        for (String c : colunasExibirTabA) System.out.print(tabA.getNome() + "." + c + "\t\t");
        for (String c : colunasExibirTabB) System.out.print(tabB.getNome() + "." + c + "\t\t");
        System.out.println("\n------------------------------------------------------------------");

        // Algoritmo de Nested Loop Join usando Arrays
        for (int i = 0; i < tabA.getQtdRegistros(); i++) {
            Registro regA = tabA.getRegistros()[i];
            String valorChaveA = regA.getValor(idxJoinA);

            for (int j = 0; j < tabB.getQtdRegistros(); j++) {
                Registro regB = tabB.getRegistros()[j];
                String valorChaveB = regB.getValor(idxJoinB);

                // Casamento de Chaves
                if (valorChaveA != null && valorChaveA.equals(valorChaveB)) {
                    // Imprime valores da Tabela A
                    for (int idx : idxsExibirA) {
                        System.out.print(regA.getValor(idx) + "\t\t");
                    }
                    // Imprime valores da Tabela B
                    for (int idx : idxsExibirB) {
                        System.out.print(regB.getValor(idx) + "\t\t");
                    }
                    System.out.println();
                }
            }
        }
    }

    private int[] obterIndicesColunas(Tabela tabela, String[] nomesColunas) {
        int[] indices = new int[nomesColunas.length];
        for (int i = 0; i < nomesColunas.length; i++) {
            indices[i] = tabela.buscarIndiceColuna(nomesColunas[i]);
        }
        return indices;
    }

    public Tabela[] getTabelas() { return tabelas; }
    public int getQtdTabelas() { return qtdTabelas; }
}
