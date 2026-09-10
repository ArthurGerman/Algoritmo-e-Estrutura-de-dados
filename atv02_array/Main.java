package atv02_array;

import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        GerenciadorSGBD sgbd = new GerenciadorSGBD(5);
        
        // Carga inicial automática para agilizar os testes
        carregarDadosIniciais(sgbd);

        Scanner scanner = new Scanner(System.in);
        int opcao = -1;

        while (opcao != 0) {
            System.out.println("\n=== SIMULADOR SGBD (SELECT & JOINS) ===");
            System.out.println("1. Listar Tabelas Cadastradas");
            System.out.println("2. Executar SELECT Simples (1 Tabela)");
            System.out.println("3. Executar SELECT com JOIN (2 Tabelas)");
            System.out.println("0. Sair");
            System.out.print("Escolha uma opção: ");
            opcao = scanner.nextInt();
            scanner.nextLine(); // consumir newline

            switch (opcao) {
                case 1:
                    listarTabelas(sgbd);
                    break;
                case 2:
                    menuSelectSimples(sgbd, scanner);
                    break;
                case 3:
                    menuSelectJoin(sgbd, scanner);
                    break;
                case 0:
                    System.out.println("Encerrando o sistema...");
                    break;
                default:
                    System.out.println("Opção inválida!");
            }
        }
        scanner.close();
    }

    private static void carregarDadosIniciais(GerenciadorSGBD sgbd) {
        // Tabela 1: Clientes
        // A estrutura (colunas, PK, FK) continua definida no código, pois é
        // metadado da tabela. Os REGISTROS é que agora vêm de um arquivo .csv.
        Tabela tClientes = new Tabela("Clientes", 3, 3);
        tClientes.adicionarColuna(new Coluna("id", "INT", true, false));
        tClientes.adicionarColuna(new Coluna("nome", "VARCHAR", false, false));
        tClientes.adicionarColuna(new Coluna("cidade", "VARCHAR", false, false));
        CarregadorCSV.carregarRegistros(tClientes, "data/clientes.csv");

        // Tabela 2: Pedidos
        Tabela tPedidos = new Tabela("Pedidos", 3, 4);
        tPedidos.adicionarColuna(new Coluna("id_pedido", "INT", true, false));
        tPedidos.adicionarColuna(new Coluna("cliente_id", "INT", false, true)); // FK para Clientes.id
        tPedidos.adicionarColuna(new Coluna("valor", "DOUBLE", false, false));
        CarregadorCSV.carregarRegistros(tPedidos, "data/pedidos.csv");

        sgbd.adicionarTabela(tClientes);
        sgbd.adicionarTabela(tPedidos);
    }

    private static void listarTabelas(GerenciadorSGBD sgbd) {
        System.out.println("\n--- Tabelas no Banco ---");
        for (int i = 0; i < sgbd.getQtdTabelas(); i++) {
            Tabela t = sgbd.getTabelas()[i];
            System.out.print("- " + t.getNome() + " (Colunas: ");
            for (int j = 0; j < t.getQtdColunas(); j++) {
                System.out.print(t.getColunas()[j].getNome() + " ");
            }
            System.out.println(")");
        }
    }

    private static void menuSelectSimples(GerenciadorSGBD sgbd, Scanner scanner) {
        System.out.print("\nNome da tabela: ");
        String tabela = scanner.nextLine();
        System.out.print("Colunas a retornar (separadas por vírgula, ex: id,nome): ");
        String[] colunas = scanner.nextLine().replace(" ", "").split(",");

        System.out.println("\n--- Resultado da Consulta ---");
        sgbd.executarSelectSimples(tabela, colunas);
    }

    private static void menuSelectJoin(GerenciadorSGBD sgbd, Scanner scanner) {
        System.out.print("\nNome da Tabela A (Ex: Clientes): ");
        String tabA = scanner.nextLine();
        System.out.print("Nome da Tabela B (Ex: Pedidos): ");
        String tabB = scanner.nextLine();

        System.out.print("Coluna de junção na Tabela A (Ex: id): ");
        String colA = scanner.nextLine();
        System.out.print("Coluna de junção na Tabela B (Ex: cliente_id): ");
        String colB = scanner.nextLine();

        System.out.print("Colunas a exibir da Tabela A (separadas por vírgula): ");
        String[] colsExibirA = scanner.nextLine().replace(" ", "").split(",");

        System.out.print("Colunas a exibir da Tabela B (separadas por vírgula): ");
        String[] colsExibirB = scanner.nextLine().replace(" ", "").split(",");

        System.out.println("\n--- Resultado do JOIN ---");
        sgbd.executarSelectJoin(tabA, tabB, colA, colB, colsExibirA, colsExibirB);
    }
}
