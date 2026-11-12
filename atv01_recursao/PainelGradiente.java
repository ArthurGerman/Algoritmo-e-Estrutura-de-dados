import javax.swing.*;
import java.awt.*;

public class PainelGradiente extends JPanel {

    private final Color corInicial;
    private final Color corFinal;

    public PainelGradiente() {
        this(new Color(112, 42, 84), new Color(198, 60, 112));
    }

    public PainelGradiente(Color corInicial, Color corFinal) {
        this.corInicial = corInicial;
        this.corFinal = corFinal;
        setOpaque(false);
    }

    @Override
    protected void paintComponent(Graphics g) {
        super.paintComponent(g);
        Graphics2D g2 = (Graphics2D) g;
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

        GradientPaint gradiente = new GradientPaint(
                0, 0, corInicial,
                getWidth(), getHeight(), corFinal
        );

        g2.setPaint(gradiente);
        g2.fillRect(0, 0, getWidth(), getHeight());
    }
}