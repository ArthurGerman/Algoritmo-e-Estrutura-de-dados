import javax.swing.*;
import java.awt.*;
import java.awt.geom.RoundRectangle2D;

public class BotaoArredondado extends JButton {

    private final Color corFundo;

    public BotaoArredondado(String texto, Color corFundo) {
        super(texto);
        this.corFundo = corFundo;

        setFont(new Font("Arial", Font.BOLD, 15));
        setForeground(Color.WHITE);
        setFocusPainted(false);
        setContentAreaFilled(false);
        setBorderPainted(false);
        setOpaque(false);
        setPreferredSize(new Dimension(230, 50));
        setCursor(new Cursor(Cursor.HAND_CURSOR));
    }

    @Override
    protected void paintComponent(Graphics g) {
        Graphics2D g2 = (Graphics2D) g.create();
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

        Color cor = getModel().isPressed() ? corFundo.darker() : corFundo;
        if (getModel().isRollover() && !getModel().isPressed()) cor = corFundo.brighter();

        g2.setColor(cor);
        g2.fill(new RoundRectangle2D.Float(0, 0, getWidth(), getHeight(), 28, 28));

        g2.dispose();
        super.paintComponent(g);
    }
}