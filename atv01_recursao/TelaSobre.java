import javax.swing.*;
import java.awt.*;

public class TelaSobre extends JFrame {

    public TelaSobre() {
        setTitle("Sobre");
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setSize(380, 640);
        setLocationRelativeTo(null);
        setResizable(false);

        PainelGradiente painelFundo = new PainelGradiente();
        painelFundo.setLayout(new BorderLayout());
        setContentPane(painelFundo);

        JPanel painelTopo = new JPanel(new BorderLayout());
        painelTopo.setOpaque(false);
        painelTopo.setBorder(BorderFactory.createEmptyBorder(20, 15, 10, 15));

        JButton botaoVoltar = new JButton("< Voltar");
        botaoVoltar.setForeground(Color.WHITE);
        botaoVoltar.setContentAreaFilled(false);
        botaoVoltar.setBorderPainted(false);
        botaoVoltar.setFocusPainted(false);
        botaoVoltar.setFont(new Font("Arial", Font.BOLD, 14));
        botaoVoltar.setCursor(new Cursor(Cursor.HAND_CURSOR));
        botaoVoltar.addActionListener(e -> voltar());

        JLabel titulo = new JLabel("Sobre", SwingConstants.CENTER);
        titulo.setFont(new Font("Arial", Font.BOLD, 22));
        titulo.setForeground(Color.WHITE);

        painelTopo.add(botaoVoltar, BorderLayout.WEST);
        painelTopo.add(titulo, BorderLayout.CENTER);
        add(painelTopo, BorderLayout.NORTH);

        JTextArea textoSobre = new JTextArea();
        textoSobre.setText("Texto sobre o aplicativo.\n\n(Substitua este conteúdo pelo texto definitivo.)");
        textoSobre.setLineWrap(true);
        textoSobre.setWrapStyleWord(true);
        textoSobre.setEditable(false);
        textoSobre.setOpaque(false);
        textoSobre.setForeground(Color.WHITE);
        textoSobre.setFont(new Font("Arial", Font.PLAIN, 15));
        textoSobre.setBorder(BorderFactory.createEmptyBorder(10, 30, 20, 30));

        JScrollPane scroll = new JScrollPane(textoSobre);
        scroll.setOpaque(false);
        scroll.getViewport().setOpaque(false);
        scroll.setBorder(null);
        scroll.getVerticalScrollBar().setUnitIncrement(16);

        add(scroll, BorderLayout.CENTER);
    }

    private void voltar() {
        SwingUtilities.invokeLater(() -> {
            TelaInicial janela = new TelaInicial();
            janela.setVisible(true);
        });
        dispose();
    }
}