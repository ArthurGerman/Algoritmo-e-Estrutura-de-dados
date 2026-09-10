package atv02_array;

public class Tabela {
    private String nome;
    private Coluna[] colunas;
    private Registro[] registros;
    private int qtdColunas;
    private int qtdRegistros;

    public Tabela(String nome, int capacidadeInicialColunas, int capacidadeInicialRegistros) {
        this.nome = nome;
        this.colunas = new Coluna[capacidadeInicialColunas];
        this.registros = new Registro[capacidadeInicialRegistros];
        this.qtdColunas = 0;
        this.qtdRegistros = 0;
    }

    public void adicionarColuna(Coluna coluna) {
        if (qtdColunas == colunas.length) {
            redimensionarColunas();
        }
        colunas[qtdColunas++] = coluna;
    }

    public void adicionarRegistro(Registro registro) {
        if (qtdRegistros == registros.length) {
            redimensionarRegistros();
        }
        registros[qtdRegistros++] = registro;
    }

    private void redimensionarColunas() {
        Coluna[] novoArray = new Coluna[colunas.length * 2];
        for (int i = 0; i < colunas.length; i++) {
            novoArray[i] = colunas[i];
        }
        colunas = novoArray;
    }

    private void redimensionarRegistros() {
        Registro[] novoArray = new Registro[registros.length * 2];
        for (int i = 0; i < registros.length; i++) {
            novoArray[i] = registros[i];
        }
        registros = novoArray;
    }

    public int buscarIndiceColuna(String nomeColuna) {
        for (int i = 0; i < qtdColunas; i++) {
            if (colunas[i].getNome().equalsIgnoreCase(nomeColuna)) {
                return i;
            }
        }
        return -1;
    }

    // Getters
    public String getNome() { 
        return nome; 
    }
    public Coluna[] getColunas() { 
        return colunas; 
    }
    public Registro[] getRegistros() { 
        return registros; 
    }
    public int getQtdColunas() { 
        return qtdColunas; 
    }
    public int getQtdRegistros() { 
        return qtdRegistros; 
    }
}
