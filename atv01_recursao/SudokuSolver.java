public class SudokuSolver {

    private final int[][] tabuleiro;

    public SudokuSolver(int[][] tabuleiro) {
        this.tabuleiro = tabuleiro;
    }

    public boolean resolver() {
        return resolver(0, 0);
    }

    /**
     * Recursão avança célula por célula (esquerda->direita, cima->baixo),
     * em vez de re-escanear o tabuleiro inteiro a cada chamada.
     */
    private boolean resolver(int linha, int coluna) {

        if (linha == 9) {
            return true; // percorreu todas as linhas: tabuleiro completo
        }

        int proximaLinha = (coluna == 8) ? linha + 1 : linha;
        int proximaColuna = (coluna == 8) ? 0 : coluna + 1;

        if (tabuleiro[linha][coluna] != 0) {
            return resolver(proximaLinha, proximaColuna);
        }

        for (int numero = 1; numero <= 9; numero++) {
            if (podeColocar(linha, coluna, numero)) {

                tabuleiro[linha][coluna] = numero;

                if (resolver(proximaLinha, proximaColuna)) {
                    return true;
                }

                tabuleiro[linha][coluna] = 0; // backtracking
            }
        }

        return false;
    }

    private boolean podeColocar(int linha, int coluna, int numero) {
        
        for (int c = 0; c < 9; c++) {
            if (tabuleiro[linha][c] == numero) return false;
        }
        for (int l = 0; l < 9; l++) {
            if (tabuleiro[l][coluna] == numero) return false;
        }

        int inicioLinha = (linha / 3) * 3;
        int inicioColuna = (coluna / 3) * 3;

        for (int l = inicioLinha; l < inicioLinha + 3; l++) {
            for (int c = inicioColuna; c < inicioColuna + 3; c++) {
                if (tabuleiro[l][c] == numero) return false;
            }
        }
        return true;
    }

    /** Valida se o tabuleiro inicial não tem conflitos (usado antes de resolver). */
    public static boolean valido(int[][] tabuleiro) {
        for (int linha = 0; linha < 9; linha++) {
            for (int coluna = 0; coluna < 9; coluna++) {
                int valor = tabuleiro[linha][coluna];
                if (valor == 0) continue;

                tabuleiro[linha][coluna] = 0;
                boolean ok = new SudokuSolver(tabuleiro).podeColocar(linha, coluna, valor);
                tabuleiro[linha][coluna] = valor;

                if (!ok) return false;
            }
        }
        return true;
    }

    public int[][] getTabuleiro() {
        int[][] copia = new int[9][9];
        for (int i = 0; i < 9; i++) {
            System.arraycopy(tabuleiro[i], 0, copia[i], 0, 9);
        }
        return copia;
    }
}