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
            if (tabelas[i].getNome().equalsIgnoreCase(nome.trim())) {
                return tabelas[i];
            }
        }
        return null;
    }

    // Inserção manual de registros
    public boolean inserirRegistro(String nomeTabela, String[] valores) {
        Tabela tabela = buscarTabela(nomeTabela);
        if (tabela == null || valores.length != tabela.getQtdColunas()) {
            return false;
        }

        Registro registro = new Registro(tabela.getQtdColunas());
        for (int i = 0; i < valores.length; i++) {
            registro.setValor(i, valores[i].trim());
        }

        tabela.adicionarRegistro(registro);
        return true;
    }

    // SELECT com filtro WHERE (colunaCondicao = valorCondicao)
    public Object[][] obterResultadoSelectSimples(String nomeTabela, String[] colunasDesejadas, String colunaWhere, String valorWhere) {
        Tabela tabela = buscarTabela(nomeTabela);
        if (tabela == null) return null;

        int[] indicesColunas = obterIndicesColunas(tabela, colunasDesejadas);
        int idxWhere = (colunaWhere != null && !colunaWhere.trim().isEmpty()) 
                        ? tabela.buscarIndiceColuna(colunaWhere) 
                        : -1;

        // 1. Passada de contagem de linhas filtradas
        int linhasFiltradas = 0;
        for (int i = 0; i < tabela.getQtdRegistros(); i++) {
            Registro reg = tabela.getRegistros()[i];
            if (atendeCondicaoWhere(reg, idxWhere, valorWhere)) {
                linhasFiltradas++;
            }
        }

        // 2. Preenchimento da matriz com os resultados filtrados
        Object[][] matrizResultado = new Object[linhasFiltradas][colunasDesejadas.length];
        int linhaMatriz = 0;

        for (int i = 0; i < tabela.getQtdRegistros(); i++) {
            Registro reg = tabela.getRegistros()[i];
            if (atendeCondicaoWhere(reg, idxWhere, valorWhere)) {
                for (int j = 0; j < indicesColunas.length; j++) {
                    int idx = indicesColunas[j];
                    matrizResultado[linhaMatriz][j] = (idx != -1 && idx < reg.getValores().length) 
                                                      ? reg.getValor(idx) 
                                                      : "N/A";
                }
                linhaMatriz++;
            }
        }

        return matrizResultado;
    }

    private boolean atendeCondicaoWhere(Registro reg, int idxWhere, String valorWhere) {
        if (idxWhere == -1) return true; // Sem filtro WHERE
        String valorReg = reg.getValor(idxWhere);
        return valorReg != null && valorReg.equalsIgnoreCase(valorWhere.trim());
    }

    public Object[][] obterResultadoJoin(
            String nomeTabA, String nomeTabB,
            String colJoinA, String colJoinB,
            String[] colunasExibirTabA, String[] colunasExibirTabB) {

        Tabela tabA = buscarTabela(nomeTabA);
        Tabela tabB = buscarTabela(nomeTabB);

        if (tabA == null || tabB == null) return null;

        int idxJoinA = tabA.buscarIndiceColuna(colJoinA);
        int idxJoinB = tabB.buscarIndiceColuna(colJoinB);

        if (idxJoinA == -1 || idxJoinB == -1) return null;

        int[] idxsExibirA = obterIndicesColunas(tabA, colunasExibirTabA);
        int[] idxsExibirB = obterIndicesColunas(tabB, colunasExibirTabB);

        int contadorResultados = 0;
        for (int i = 0; i < tabA.getQtdRegistros(); i++) {
            String valA = tabA.getRegistros()[i].getValor(idxJoinA);
            for (int j = 0; j < tabB.getQtdRegistros(); j++) {
                String valB = tabB.getRegistros()[j].getValor(idxJoinB);
                if (valA != null && valA.equals(valB)) {
                    contadorResultados++;
                }
            }
        }

        int totalColunas = colunasExibirTabA.length + colunasExibirTabB.length;
        Object[][] matrizResultado = new Object[contadorResultados][totalColunas];

        int linhaAtual = 0;
        for (int i = 0; i < tabA.getQtdRegistros(); i++) {
            Registro regA = tabA.getRegistros()[i];
            String valorChaveA = regA.getValor(idxJoinA);

            for (int j = 0; j < tabB.getQtdRegistros(); j++) {
                Registro regB = tabB.getRegistros()[j];
                String valorChaveB = regB.getValor(idxJoinB);

                if (valorChaveA != null && valorChaveA.equals(valorChaveB)) {
                    int colAtual = 0;
                    for (int idx : idxsExibirA) {
                        matrizResultado[linhaAtual][colAtual++] = (idx != -1) ? regA.getValor(idx) : "N/A";
                    }
                    for (int idx : idxsExibirB) {
                        matrizResultado[linhaAtual][colAtual++] = (idx != -1) ? regB.getValor(idx) : "N/A";
                    }
                    linhaAtual++;
                }
            }
        }

        return matrizResultado;
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