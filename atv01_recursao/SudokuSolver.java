public class SudokuSolver {

    private final int[][] tabuleiro;

    public SudokuSolver(int[][] tabuleiro) {
        this.tabuleiro = tabuleiro;
    }

    /**
     * Resolve o Sudoku utilizando backtracking recursivo.
     *
     * @return true se encontrou uma solução, false caso contrário.
     */
    public boolean resolver() {
        for (int linha = 0; linha < 9; linha++) {
            for (int coluna = 0; coluna < 9; coluna++) {

                // Procura uma célula vazia
                if (tabuleiro[linha][coluna] == 0) {

                    // Tenta colocar os números de 1 a 9
                    for (int numero = 1; numero <= 9; numero++) {

                        if (podeColocar(linha, coluna, numero)) {

                            tabuleiro[linha][coluna] = numero;

                            // CHAMADA RECURSIVA
                            if (resolver()) {
                                return true;
                            }

                            // Backtracking:
                            // desfaz a tentativa
                            tabuleiro[linha][coluna] = 0;
                        }
                    }

                    // Nenhum número funcionou
                    return false;
                }
            }
        }

        // Não existem mais células vazias
        return true;
    }

    /**
     * Verifica se um número pode ser colocado em determinada posição.
     */
    private boolean podeColocar(int linha, int coluna, int numero) {

        // Verifica linha
        for (int c = 0; c < 9; c++) {
            if (tabuleiro[linha][c] == numero) {
                return false;
            }
        }

        // Verifica coluna
        for (int l = 0; l < 9; l++) {
            if (tabuleiro[l][coluna] == numero) {
                return false;
            }
        }

        // Verifica bloco 3x3
        int inicioLinha = (linha / 3) * 3;
        int inicioColuna = (coluna / 3) * 3;

        for (int l = inicioLinha; l < inicioLinha + 3; l++) {
            for (int c = inicioColuna; c < inicioColuna + 3; c++) {
                if (tabuleiro[l][c] == numero) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Retorna uma cópia do tabuleiro.
     */
    public int[][] getTabuleiro() {
        int[][] copia = new int[9][9];

        for (int i = 0; i < 9; i++) {
            System.arraycopy(tabuleiro[i], 0, copia[i], 0, 9);
        }

        return copia;
    }
}