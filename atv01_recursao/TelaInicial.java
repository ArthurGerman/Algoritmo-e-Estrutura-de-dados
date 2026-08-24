import javax.swing.*;
import java.awt.*;

public class TelaInicial extends JFrame {

    public TelaInicial() {
        setTitle("Sudoku");
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setSize(380, 640);
        setLocationRelativeTo(null);
        setResizable(false);

        PainelGradiente painelFundo = new PainelGradiente();
        painelFundo.setLayout(new GridBagLayout());
        setContentPane(painelFundo);

        GridBagConstraints gbc = new GridBagConstraints();
        gbc.gridx = 0;

        JLabel titulo = new JLabel("SUDOKU");
        titulo.setFont(new Font("Arial", Font.BOLD, 36));
        titulo.setForeground(Color.WHITE);

        gbc.gridy = 0;
        gbc.insets = new Insets(0, 0, 90, 0);
        painelFundo.add(titulo, gbc);

        BotaoArredondado botaoStart = new BotaoArredondado("START GAME", new Color(233, 30, 99));
        botaoStart.addActionListener(e -> abrirJogo());

        BotaoArredondado botaoSobre = new BotaoArredondado("SOBRE", new Color(38, 166, 154));
        botaoSobre.addActionListener(e -> abrirSobre());

        gbc.gridy = 1;
        gbc.insets = new Insets(0, 0, 18, 0);
        painelFundo.add(botaoStart, gbc);

        gbc.gridy = 2;
        gbc.insets = new Insets(0, 0, 0, 0);
        painelFundo.add(botaoSobre, gbc);
    }

    private void abrirJogo() {
        SwingUtilities.invokeLater(() -> {
            SudokuGUI janela = new SudokuGUI();
            janela.setVisible(true);
        });
        dispose();
    }

    private void abrirSobre() {
        SwingUtilities.invokeLater(() -> {
            TelaSobre janela = new TelaSobre();
            janela.setVisible(true);
        });
        dispose();
    }
}