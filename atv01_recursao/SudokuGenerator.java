import java.util.*;

public class SudokuGenerator {

    private final int[][] tabuleiro = new int[9][9];
    private final Random random = new Random();

    /**
     * Gera um novo jogo aleatório.
     * @param celulasVisiveis quantas células ficam preenchidas (ex.: 30 a 40)
     */
    public int[][] gerar(int celulasVisiveis) {
        preencherCompleto(0, 0);
        int[][] puzzle = copiar(tabuleiro);
        removerCelulas(puzzle, 81 - celulasVisiveis);
        return puzzle;
    }

    /** Preenche um Sudoku 100% resolvido usando backtracking com números embaralhados. */
    private boolean preencherCompleto(int linha, int coluna) {
        if (linha == 9) return true;

        int proximaLinha = (coluna == 8) ? linha + 1 : linha;
        int proximaColuna = (coluna == 8) ? 0 : coluna + 1;

        for (int numero : numerosEmbaralhados()) {
            if (podeColocar(tabuleiro, linha, coluna, numero)) {
                tabuleiro[linha][coluna] = numero;

                if (preencherCompleto(proximaLinha, proximaColuna)) {
                    return true;
                }
                tabuleiro[linha][coluna] = 0;
            }
        }
        return false;
    }

    private List<Integer> numerosEmbaralhados() {
        List<Integer> numeros = new ArrayList<>();
        for (int i = 1; i <= 9; i++) numeros.add(i);
        Collections.shuffle(numeros, random);
        return numeros;
    }

    private boolean podeColocar(int[][] t, int linha, int coluna, int numero) {
        for (int c = 0; c < 9; c++) if (t[linha][c] == numero) return false;
        for (int l = 0; l < 9; l++) if (t[l][coluna] == numero) return false;

        int il = (linha / 3) * 3, ic = (coluna / 3) * 3;
        for (int l = il; l < il + 3; l++)
            for (int c = ic; c < ic + 3; c++)
                if (t[l][c] == numero) return false;

        return true;
    }

    private void removerCelulas(int[][] puzzle, int quantidadeRemover) {
        int removidas = 0;
        while (removidas < quantidadeRemover) {
            int linha = random.nextInt(9);
            int coluna = random.nextInt(9);
            if (puzzle[linha][coluna] != 0) {
                puzzle[linha][coluna] = 0;
                removidas++;
            }
        }
    }

    private int[][] copiar(int[][] origem) {
        int[][] copia = new int[9][9];
        for (int i = 0; i < 9; i++) System.arraycopy(origem[i], 0, copia[i], 0, 9);
        return copia;
    }
}