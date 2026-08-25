import javax.swing.*;
import java.awt.*;

public class SudokuGUI extends JFrame {

    private final JTextField[][] campos = new JTextField[9][9];
    private final boolean[][] numerosFixos = new boolean[9][9];
    private final JComboBox<String> seletorDificuldade;

    private static final Color COR_FUNDO = new Color(112, 42, 84);
    private static final Color COR_CELULA = new Color(255, 248, 251);
    private static final Color COR_GRADE = new Color(112, 42, 84);

    public SudokuGUI() {

        setTitle("Sudoku - Recursividade e Backtracking");
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setLayout(new BorderLayout());

        PainelGradiente painelFundo = new PainelGradiente();
        painelFundo.setLayout(new BorderLayout(0, 12));
        painelFundo.setBorder(BorderFactory.createEmptyBorder(18, 18, 18, 18));
        setContentPane(painelFundo);

        JPanel painelTopo = new JPanel(new BorderLayout());
        painelTopo.setOpaque(false);

        JLabel titulo = new JLabel("SUDOKU");
        titulo.setFont(new Font("Arial", Font.BOLD, 25));
        titulo.setForeground(Color.WHITE);

        JLabel legenda = new JLabel("Recursividade e backtracking");
        legenda.setFont(new Font("Arial", Font.PLAIN, 13));
        legenda.setForeground(new Color(255, 225, 238));

        JPanel painelTitulos = new JPanel();
        painelTitulos.setOpaque(false);
        painelTitulos.setLayout(new BoxLayout(painelTitulos, BoxLayout.Y_AXIS));
        painelTitulos.add(titulo);
        painelTitulos.add(legenda);

        JButton voltar = new JButton("< Voltar");
        voltar.setForeground(Color.WHITE);
        voltar.setContentAreaFilled(false);
        voltar.setBorderPainted(false);
        voltar.setFocusPainted(false);
        voltar.setFont(new Font("Arial", Font.BOLD, 13));
        voltar.setCursor(new Cursor(Cursor.HAND_CURSOR));
        voltar.addActionListener(e -> voltarInicio());

        painelTopo.add(painelTitulos, BorderLayout.WEST);
        painelTopo.add(voltar, BorderLayout.EAST);

        JPanel painelTabuleiro = new JPanel(new GridLayout(9, 9, 2, 2));
        painelTabuleiro.setBackground(COR_GRADE);
        painelTabuleiro.setBorder(BorderFactory.createLineBorder(COR_GRADE, 3));

        for (int linha = 0; linha < 9; linha++) {
            for (int coluna = 0; coluna < 9; coluna++) {

                JTextField campo = new JTextField();
                campo.setHorizontalAlignment(JTextField.CENTER);
                campo.setFont(new Font("Arial", Font.BOLD, 20));
                campo.setForeground(COR_FUNDO);
                campo.setBackground(COR_CELULA);
                campo.setCaretColor(COR_FUNDO);
                campo.setBorder(BorderFactory.createEmptyBorder());

                campos[linha][coluna] = campo;

                painelTabuleiro.add(campo);
            }
        }

        JPanel painelControles = new JPanel();
        painelControles.setOpaque(false);
        painelControles.setLayout(new BoxLayout(painelControles, BoxLayout.Y_AXIS));

        JPanel painelDificuldade = new JPanel(new FlowLayout(FlowLayout.CENTER, 8, 0));
        painelDificuldade.setOpaque(false);

        JLabel labelDificuldade = new JLabel("Dificuldade:");
        labelDificuldade.setForeground(Color.WHITE);
        labelDificuldade.setFont(new Font("Arial", Font.BOLD, 14));

        seletorDificuldade = new JComboBox<>(new String[]{"Fácil", "Médio", "Difícil"});
        seletorDificuldade.setSelectedItem("Médio");
        seletorDificuldade.setFont(new Font("Arial", Font.PLAIN, 14));
        seletorDificuldade.setPreferredSize(new Dimension(120, 30));

        painelDificuldade.add(labelDificuldade);
        painelDificuldade.add(seletorDificuldade);
        painelControles.add(painelDificuldade);

        JPanel painelBotoes = new JPanel(new FlowLayout(FlowLayout.CENTER, 8, 10));
        painelBotoes.setOpaque(false);

        // Substring do botão EXEMPLO trocado por VERIFICAR
        BotaoArredondado verificar = new BotaoArredondado("VERIFICAR", new Color(38, 166, 154));
        BotaoArredondado resolver = new BotaoArredondado("RESOLVER", new Color(233, 30, 99));
        BotaoArredondado limpar = new BotaoArredondado("LIMPAR", new Color(125, 78, 105));
        BotaoArredondado novoJogo = new BotaoArredondado("NOVO JOGO", new Color(38, 166, 154));

        Dimension tamanhoBotao = new Dimension(145, 42);
        verificar.setPreferredSize(tamanhoBotao);
        resolver.setPreferredSize(tamanhoBotao);
        limpar.setPreferredSize(tamanhoBotao);
        novoJogo.setPreferredSize(tamanhoBotao);

        verificar.addActionListener(e -> verificarJogadas());
        resolver.addActionListener(e -> resolverSudoku());
        limpar.addActionListener(e -> limparTabuleiro());
        novoJogo.addActionListener(e -> carregarNovoJogo());

        painelBotoes.add(verificar);
        painelBotoes.add(resolver);
        painelBotoes.add(limpar);
        painelBotoes.add(novoJogo);
        painelControles.add(painelBotoes);

        add(painelTopo, BorderLayout.NORTH);
        add(painelTabuleiro, BorderLayout.CENTER);
        add(painelControles, BorderLayout.SOUTH);

        setSize(600, 720);
        setLocationRelativeTo(null);

        // Gera automaticamente um novo jogo ao abrir a tela
        carregarNovoJogo();
    }

    private void limparTabuleiro() {
        for (int linha = 0; linha < 9; linha++) {
            for (int coluna = 0; coluna < 9; coluna++) {
                if (numerosFixos[linha][coluna]) {
                    continue;
                }
                campos[linha][coluna].setText("");
            }
        }
    }

    private void verificarJogadas() {
        int[][] tabuleiro = lerTabuleiro();

        if (tabuleiro == null) {
            JOptionPane.showMessageDialog(this,
                    "Por favor, digite apenas números válidos entre 1 e 9.", 
                    "Entrada Inválida", JOptionPane.ERROR_MESSAGE);
            return;
        }

        // 1. Checa por duplicações diretas na linha, coluna ou bloco 3x3
        for (int l = 0; l < 9; l++) {
            for (int c = 0; c < 9; c++) {
                int valor = tabuleiro[l][c];
                if (valor == 0) continue;

                tabuleiro[l][c] = 0;
                boolean invalido = !podeColocarAuxiliar(tabuleiro, l, c, valor);
                tabuleiro[l][c] = valor;

                if (invalido) {
                    JOptionPane.showMessageDialog(this,
                            String.format("Conflito encontrado! O número %d na Linha %d, Coluna %d repete na mesma linha, coluna ou bloco 3x3.", 
                                    valor, l + 1, c + 1),
                            "Regra do Sudoku Violada", JOptionPane.WARNING_MESSAGE);
                    return;
                }
            }
        }

        // 2. Testa se o tabuleiro atual pode ser resolvido
        SudokuSolver solver = new SudokuSolver(tabuleiro);
        if (!solver.resolver()) {
            JOptionPane.showMessageDialog(this,
                    "Algum número digitado está incorreto e impede a solução do jogo.",
                    "Número Errado", JOptionPane.ERROR_MESSAGE);
            return;
        }

        // 3. Checa se o tabuleiro está completamente preenchido
        boolean preenchido = true;
        for (int l = 0; l < 9; l++) {
            for (int c = 0; c < 9; c++) {
                if (tabuleiro[l][c] == 0) {
                    preenchido = false;
                    break;
                }
            }
        }

        if (preenchido) {
            JOptionPane.showMessageDialog(this,
                    "Parabéns! Você completou o Sudoku corretamente!",
                    "Vitória!", JOptionPane.INFORMATION_MESSAGE);
        } else {
            JOptionPane.showMessageDialog(this,
                    "Tudo certo até agora! Todos os números inseridos estão corretos.",
                    "Progresso Válido", JOptionPane.INFORMATION_MESSAGE);
        }
    }

    private boolean podeColocarAuxiliar(int[][] t, int linha, int coluna, int numero) {
        for (int c = 0; c < 9; c++) if (t[linha][c] == numero) return false;
        for (int l = 0; l < 9; l++) if (t[l][coluna] == numero) return false;

        int il = (linha / 3) * 3, ic = (coluna / 3) * 3;
        for (int l = il; l < il + 3; l++)
            for (int c = ic; c < ic + 3; c++)
                if (t[l][c] == numero) return false;

        return true;
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
                campos[linha][coluna].setEditable(false);
            }
        }
    }

    private void carregarNovoJogo() {
        int celulasVisiveis = switch (seletorDificuldade.getSelectedItem().toString()) {
            case "Fácil" -> 45;
            case "Difícil" -> 25;
            default -> 32;
        };

        int[][] jogo = new SudokuGenerator().gerar(celulasVisiveis);
        carregarTabuleiro(jogo, true);
    }

    private void carregarTabuleiro(int[][] tabuleiro, boolean marcarNumerosFixos) {
        for (int linha = 0; linha < 9; linha++) {
            for (int coluna = 0; coluna < 9; coluna++) {
                int valor = tabuleiro[linha][coluna];

                if (marcarNumerosFixos) {
                    boolean ehFixo = valor != 0;
                    numerosFixos[linha][coluna] = ehFixo;
                    campos[linha][coluna].setEditable(!ehFixo);
                }

                campos[linha][coluna].setText(valor == 0 ? "" : String.valueOf(valor));
            }
        }
    }

    private void voltarInicio() {
        SwingUtilities.invokeLater(() -> {
            TelaInicial janela = new TelaInicial();
            janela.setVisible(true);
        });
        dispose();
    }
}