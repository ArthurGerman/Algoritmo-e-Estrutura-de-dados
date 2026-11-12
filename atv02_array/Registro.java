package atv02_array;

public class Registro {
    private String[] valores;

    public Registro(int quantidadeColunas) {
        this.valores = new String[quantidadeColunas];
    }

    public void setValor(int indiceColuna, String valor) {
        this.valores[indiceColuna] = valor;
    }

    public String getValor(int indiceColuna) {
        return this.valores[indiceColuna];
    }

    public String[] getValores() {
        return valores;
    }
}
