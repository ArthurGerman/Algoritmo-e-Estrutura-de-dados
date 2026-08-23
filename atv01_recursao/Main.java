import javax.swing.SwingUtilities;

public class Main {

    public static void main(String[] args) {

        SwingUtilities.invokeLater(() -> {
            SudokuGUI janela = new SudokuGUI();
            janela.setVisible(true);
        });
    }
}