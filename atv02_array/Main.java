package atv02_array;

import javax.swing.SwingUtilities;

public class Main {
    public static void main(String[] args) {
        GerenciadorSGBD sgbd = new GerenciadorSGBD(5);
        
        // Carga dos arquivos CSV
        carregarDadosIniciais(sgbd);

        // Inicializa a nova Interface Grafica
        SwingUtilities.invokeLater(() -> {
            InterfaceGrafica gui = new InterfaceGrafica(sgbd);
            gui.setVisible(true);
        });
    }

    private static void carregarDadosIniciais(GerenciadorSGBD sgbd) {
        // Tabela 1: Clientes
        Tabela tClientes = new Tabela("Clientes", 3, 3);
        tClientes.adicionarColuna(new Coluna("id", "INT", true, false));
        tClientes.adicionarColuna(new Coluna("nome", "VARCHAR", false, false));
        tClientes.adicionarColuna(new Coluna("cidade", "VARCHAR", false, false));
        CarregadorCSV.carregarRegistros(tClientes, "data/clientes.csv");

        // Tabela 2: Pedidos
        Tabela tPedidos = new Tabela("Pedidos", 3, 4);
        tPedidos.adicionarColuna(new Coluna("id_pedido", "INT", true, false));
        tPedidos.adicionarColuna(new Coluna("cliente_id", "INT", false, true));
        tPedidos.adicionarColuna(new Coluna("valor", "DOUBLE", false, false));
        CarregadorCSV.carregarRegistros(tPedidos, "data/pedidos.csv");

        sgbd.adicionarTabela(tClientes);
        sgbd.adicionarTabela(tPedidos);
    }
}