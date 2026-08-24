import javax.swing.SwingUtilities;

public class Main {

    public static void main(String[] args) {

        SwingUtilities.invokeLater(() -> {
            TelaInicial janela = new TelaInicial();
            janela.setVisible(true);
        });
    }
}