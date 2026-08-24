import javax.swing.*;
import java.awt.*;

public class SudokuGUI extends JFrame {

    private final JTextField[][] campos = new JTextField[9][9];

    private final int[][] exemplo = {
            {5, 3, 0, 0, 7, 0, 0, 0, 0},
            {6, 0, 0, 1, 9, 5, 0, 0, 0},
            {0, 9, 8, 0, 0, 0, 0, 6, 0},

            {8, 0, 0, 0, 6, 0, 0, 0, 3},
            {4, 0, 0, 8, 0, 3, 0, 0, 1},
            {7, 0, 0, 0, 2, 0, 0, 0, 6},

            {0, 6, 0, 0, 0, 0, 2, 8, 0},
            {0, 0, 0, 4, 1, 9, 0, 0, 5},
            {0, 0, 0, 0, 8, 0, 0, 7, 9}
    };

    public SudokuGUI() {

        setTitle("Sudoku - Recursividade e Backtracking");
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setLayout(new BorderLayout());

        JPanel painelTabuleiro = new JPanel(new GridLayout(9, 9));

        for (int linha = 0; linha < 9; linha++) {
            for (int coluna = 0; coluna < 9; coluna++) {

                JTextField campo = new JTextField();
                campo.setHorizontalAlignment(JTextField.CENTER);
                campo.setFont(new Font("Arial", Font.BOLD, 22));

                campos[linha][coluna] = campo;

                painelTabuleiro.add(campo);
            }
        }

        JPanel painelBotoes = new JPanel();

        JButton carregar = new JButton("Carregar exemplo");
        JButton resolver = new JButton("Resolver");
        JButton limpar = new JButton("Limpar");
        JButton novoJogo = new JButton("Novo jogo");

        carregar.addActionListener(e -> carregarExemplo());
        resolver.addActionListener(e -> resolverSudoku());
        limpar.addActionListener(e -> limparTabuleiro());
        novoJogo.addActionListener(e -> carregarNovoJogo());

        painelBotoes.add(carregar);
        painelBotoes.add(resolver);
        painelBotoes.add(limpar);
        painelBotoes.add(novoJogo);

        add(painelTabuleiro, BorderLayout.CENTER);
        add(painelBotoes, BorderLayout.SOUTH);

        setSize(600, 650);
        setLocationRelativeTo(null);

        carregarExemplo();
    }

    private void carregarExemplo() {

        for (int linha = 0; linha < 9; linha++) {
            for (int coluna = 0; coluna < 9; coluna++) {

                if (exemplo[linha][coluna] == 0) {
                    campos[linha][coluna].setText("");
                } else {
                    campos[linha][coluna]
                            .setText(String.valueOf(exemplo[linha][coluna]));
                }
            }
        }
    }

    private void limparTabuleiro() {

        for (int linha = 0; linha < 9; linha++) {
            for (int coluna = 0; coluna < 9; coluna++) {
                campos[linha][coluna].setText("");
            }
        }
    }

    private void resolverSudoku() {

        int[][] tabuleiro = lerTabuleiro();

        if (tabuleiro == null) {
            JOptionPane.showMessageDialog(this,
                    "Digite apenas números de 1 a 9.", "Erro", JOptionPane.ERROR_MESSAGE);
            return;
        }

        if (!SudokuSolver.valido(tabuleiro)) {
            JOptionPane.showMessageDialog(this,
                    "O tabuleiro contém números repetidos na mesma linha, coluna ou bloco.",
                    "Tabuleiro inválido", JOptionPane.ERROR_MESSAGE);
            return;
        }

        SudokuSolver solver = new SudokuSolver(tabuleiro);

        long inicio = System.nanoTime();

        boolean resolvido = solver.resolver();

        long fim = System.nanoTime();

        if (resolvido) {

            mostrarTabuleiro(solver.getTabuleiro());

            double tempo = (fim - inicio) / 1_000_000.0;

            JOptionPane.showMessageDialog(
                    this,
                    String.format(
                            "Sudoku resolvido!\nTempo: %.3f ms",
                            tempo
                    ),
                    "Sucesso",
                    JOptionPane.INFORMATION_MESSAGE
            );

        } else {

            JOptionPane.showMessageDialog(
                    this,
                    "Não foi possível encontrar uma solução.",
                    "Sudoku",
                    JOptionPane.WARNING_MESSAGE
            );
        }
    }

    private int[][] lerTabuleiro() {

        int[][] tabuleiro = new int[9][9];

        try {

            for (int linha = 0; linha < 9; linha++) {
                for (int coluna = 0; coluna < 9; coluna++) {

                    String texto = campos[linha][coluna].getText().trim();

                    if (texto.isEmpty()) {
                        tabuleiro[linha][coluna] = 0;
                    } else {

                        int numero = Integer.parseInt(texto);

                        if (numero < 1 || numero > 9) {
                            return null;
                        }

                        tabuleiro[linha][coluna] = numero;
                    }
                }
            }

        } catch (NumberFormatException e) {
            return null;
        }

        return tabuleiro;
    }

    private void mostrarTabuleiro(int[][] tabuleiro) {

        for (int linha = 0; linha < 9; linha++) {
            for (int coluna = 0; coluna < 9; coluna++) {
                int valor = tabuleiro[linha][coluna];
                campos[linha][coluna].setText(valor == 0 ? "" : String.valueOf(valor));
            }
        }
    }

    private void carregarNovoJogo() {
        int[][] jogo = new SudokuGenerator().gerar(32); // ~32 células visíveis
        mostrarTabuleiro(jogo);
    }
}