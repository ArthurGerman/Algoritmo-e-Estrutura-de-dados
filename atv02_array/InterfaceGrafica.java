package atv02_array;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import javax.swing.table.DefaultTableCellRenderer;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.util.ArrayList;

public class InterfaceGrafica extends JFrame {

    private static final Color FUNDO = new Color(15, 23, 42);
    private static final Color SIDEBAR = new Color(15, 23, 42);
    private static final Color CARD = new Color(30, 41, 59);
    private static final Color CARD_SECUNDARIO = new Color(51, 65, 85);
    private static final Color AZUL = new Color(59, 130, 246);
    private static final Color TEXTO = new Color(241, 245, 249);
    private static final Color TEXTO_SECUNDARIO = new Color(148, 163, 184);
    private static final Color BORDA = new Color(51, 65, 85);

    private GerenciadorSGBD sgbd;
    private JPanel painelConteudo;
    private JLabel tituloPagina;
    private JLabel subtituloPagina;
    private JPanel menuLateral;

    public InterfaceGrafica(GerenciadorSGBD sgbd) {
        this.sgbd = sgbd;
        configurarEstiloAbas();
        configurarJanela();
        criarInterface();
        mostrarDashboard();
    }

    private void configurarEstiloAbas() {
        // Estiliza o JTabbedPane para utilizar o tom de azul vibrante de alto contraste
        UIManager.put("TabbedPane.selected", AZUL);
        UIManager.put("TabbedPane.selectHighlight", AZUL);
        UIManager.put("TabbedPane.tabAreaBackground", FUNDO);
        UIManager.put("TabbedPane.background", CARD_SECUNDARIO);
        UIManager.put("TabbedPane.foreground", TEXTO);
        UIManager.put("TabbedPane.focus", AZUL);
        UIManager.put("TabbedPane.contentBorderInsets", new Insets(1, 0, 0, 0));
    }

    private void configurarJanela() {
        setTitle("Simulador SGBD - Arrays");
        setSize(1200, 750);
        setMinimumSize(new Dimension(1000, 600));
        setLocationRelativeTo(null);
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
    }

    private void criarInterface() {
        JPanel principal = new JPanel(new BorderLayout());
        principal.setBackground(FUNDO);

        criarMenuLateral();
        principal.add(menuLateral, BorderLayout.WEST);

        JPanel areaPrincipal = new JPanel(new BorderLayout());
        areaPrincipal.setBackground(FUNDO);
        areaPrincipal.add(criarCabecalho(), BorderLayout.NORTH);

        painelConteudo = new JPanel(new BorderLayout());
        painelConteudo.setBackground(FUNDO);
        painelConteudo.setBorder(new EmptyBorder(0, 30, 30, 30));

        areaPrincipal.add(painelConteudo, BorderLayout.CENTER);
        principal.add(areaPrincipal, BorderLayout.CENTER);

        add(principal);
    }

    private void criarMenuLateral() {
        menuLateral = new JPanel();
        menuLateral.setPreferredSize(new Dimension(230, 0));
        menuLateral.setBackground(SIDEBAR);
        menuLateral.setBorder(new EmptyBorder(25, 18, 20, 18));
        menuLateral.setLayout(new BoxLayout(menuLateral, BoxLayout.Y_AXIS));

        JLabel logo = new JLabel("▣  SGBD");
        logo.setForeground(TEXTO);
        logo.setFont(new Font("SansSerif", Font.BOLD, 24));
        logo.setBorder(new EmptyBorder(0, 8, 35, 0));
        menuLateral.add(logo);

        adicionarBotaoMenu("⌂   Dashboard", this::mostrarDashboard);
        adicionarBotaoMenu("▣   Tabelas", this::mostrarTabelas);
        adicionarBotaoMenu("✚   Criar Tabela", this::mostrarCriarTabela);
        adicionarBotaoMenu("✎   Inserir Dados", this::mostrarInserirDados);
        adicionarBotaoMenu("⌕   SELECT", this::mostrarSelect);
        adicionarBotaoMenu("⇄   JOIN", this::mostrarJoin);

        menuLateral.add(Box.createVerticalGlue());
        adicionarBotaoMenu("Sobre", this::mostrarSobre);
    }

    private void adicionarBotaoMenu(String texto, Runnable acao) {
        JButton botao = new JButton(texto);
        botao.setAlignmentX(Component.LEFT_ALIGNMENT);
        botao.setMaximumSize(new Dimension(Integer.MAX_VALUE, 48));
        botao.setHorizontalAlignment(SwingConstants.LEFT);
        botao.setForeground(TEXTO_SECUNDARIO);
        botao.setBackground(SIDEBAR);
        botao.setBorder(new EmptyBorder(0, 12, 0, 0));
        botao.setFocusPainted(false);
        botao.setFont(new Font("SansSerif", Font.PLAIN, 14));
        botao.setCursor(new Cursor(Cursor.HAND_CURSOR));

        botao.addMouseListener(new MouseAdapter() {
            @Override
            public void mouseEntered(MouseEvent e) {
                botao.setBackground(CARD);
                botao.setForeground(TEXTO);
            }

            @Override
            public void mouseExited(MouseEvent e) {
                botao.setBackground(SIDEBAR);
                botao.setForeground(TEXTO_SECUNDARIO);
            }
        });

        botao.addActionListener(e -> acao.run());
        menuLateral.add(botao);
        menuLateral.add(Box.createVerticalStrut(5));
    }

    private JPanel criarCabecalho() {
        JPanel painel = new JPanel(new BorderLayout());
        painel.setBackground(FUNDO);
        painel.setBorder(new EmptyBorder(28, 30, 20, 30));

        tituloPagina = new JLabel("Dashboard");
        tituloPagina.setForeground(TEXTO);
        tituloPagina.setFont(new Font("SansSerif", Font.BOLD, 28));

        subtituloPagina = new JLabel("Simulador de operações relacionais");
        subtituloPagina.setForeground(TEXTO_SECUNDARIO);
        subtituloPagina.setFont(new Font("SansSerif", Font.PLAIN, 13));

        JPanel textos = new JPanel();
        textos.setBackground(FUNDO);
        textos.setLayout(new BoxLayout(textos, BoxLayout.Y_AXIS));
        textos.add(tituloPagina);
        textos.add(Box.createVerticalStrut(5));
        textos.add(subtituloPagina);

        painel.add(textos, BorderLayout.WEST);
        return painel;
    }

    // ==============================
    // DASHBOARD & TABELAS
    // ==============================

    private void mostrarDashboard() {
        atualizarCabecalho("Dashboard", "Visão geral do seu banco de dados");
        painelConteudo.removeAll();

        JPanel conteudo = new JPanel();
        conteudo.setBackground(FUNDO);
        conteudo.setLayout(new BoxLayout(conteudo, BoxLayout.Y_AXIS));

        JPanel cards = new JPanel(new GridLayout(1, 3, 15, 15));
        cards.setBackground(FUNDO);

        int totalTabelas = sgbd.getQtdTabelas();
        int totalRegistros = 0;
        for (int i = 0; i < totalTabelas; i++) {
            totalRegistros += sgbd.getTabelas()[i].getQtdRegistros();
        }

        cards.add(criarCard("Tabelas", String.valueOf(totalTabelas), "Estruturas cadastradas"));
        cards.add(criarCard("Registros", String.valueOf(totalRegistros), "Dados carregados"));
        cards.add(criarCard("Operações", "CREATE / INSERT / SELECT / JOIN", "Operações disponíveis"));

        conteudo.add(cards);
        conteudo.add(Box.createVerticalStrut(25));

        JLabel titulo = new JLabel("Tabelas disponíveis (Clique para inspecionar)");
        titulo.setForeground(TEXTO);
        titulo.setFont(new Font("SansSerif", Font.BOLD, 19));
        conteudo.add(titulo);
        conteudo.add(Box.createVerticalStrut(12));

        JPanel lista = new JPanel();
        lista.setBackground(CARD);
        lista.setLayout(new BoxLayout(lista, BoxLayout.Y_AXIS));
        lista.setBorder(new EmptyBorder(15, 20, 15, 20));

        for (int i = 0; i < totalTabelas; i++) {
            Tabela t = sgbd.getTabelas()[i];
            JPanel item = criarItemTabela(t);
            item.setCursor(new Cursor(Cursor.HAND_CURSOR));
            item.addMouseListener(new MouseAdapter() {
                @Override
                public void mouseClicked(MouseEvent e) {
                    mostrarTabelaEspecifica(t.getNome());
                }
                @Override
                public void mouseEntered(MouseEvent e) {
                    item.setBackground(CARD);
                }
                @Override
                public void mouseExited(MouseEvent e) {
                    item.setBackground(CARD_SECUNDARIO);
                }
            });
            lista.add(item);
            if (i < totalTabelas - 1) lista.add(Box.createVerticalStrut(8));
        }

        JScrollPane scroll = criarScrollPaneFormatado(lista);
        conteudo.add(scroll);

        painelConteudo.add(conteudo, BorderLayout.CENTER);
        atualizarTela();
    }

    private void mostrarTabelas() {
        if (sgbd.getQtdTabelas() > 0) {
            mostrarTabelaEspecifica(sgbd.getTabelas()[0].getNome());
        } else {
            atualizarCabecalho("Tabelas", "Nenhuma tabela cadastrada");
            painelConteudo.removeAll();
            atualizarTela();
        }
    }

    private void mostrarTabelaEspecifica(String nomeTabela) {
        atualizarCabecalho("Tabela: " + nomeTabela, "Estrutura de colunas e registros salvos");
        painelConteudo.removeAll();

        Tabela tabela = sgbd.buscarTabela(nomeTabela);
        if (tabela == null) return;

        JTabbedPane abas = new JTabbedPane();
        abas.setBackground(FUNDO);
        abas.setForeground(TEXTO);

        for (int i = 0; i < sgbd.getQtdTabelas(); i++) {
            Tabela t = sgbd.getTabelas()[i];
            abas.addTab(t.getNome(), criarPainelTabelaComDetalhes(t));
            if (t.getNome().equalsIgnoreCase(nomeTabela)) {
                abas.setSelectedIndex(i);
            }
        }

        abas.addChangeListener(e -> {
            int idx = abas.getSelectedIndex();
            if (idx >= 0) {
                String nomeAbaAtiva = abas.getTitleAt(idx);
                atualizarCabecalho("Tabela: " + nomeAbaAtiva, "Estrutura de colunas e registros salvos");
            }
        });

        painelConteudo.add(abas, BorderLayout.CENTER);
        atualizarTela();
    }

    // ==============================
    // CRIAR TABELA (CREATE TABLE)
    // ==============================

    private void mostrarCriarTabela() {
        atualizarCabecalho("Criar Tabela", "Defina uma nova estrutura relacional");
        painelConteudo.removeAll();

        JPanel formulario = criarPainelFormulario();
        GridBagConstraints gbc = criarConstraints();

        adicionarLabel(formulario, gbc, "Nome da Tabela", 0);
        JTextField txtNomeTabela = criarCampoTexto();
        txtNomeTabela.setPreferredSize(new Dimension(280, 32));
        adicionarComponente(formulario, gbc, txtNomeTabela, 0);

        JPanel painelColunas = new JPanel();
        painelColunas.setBackground(CARD);
        painelColunas.setLayout(new BoxLayout(painelColunas, BoxLayout.Y_AXIS));

        ArrayList<JPanel> linhasColunas = new ArrayList<>();

        Runnable adicionarLinhaColuna = () -> {
            JPanel linha = new JPanel(new FlowLayout(FlowLayout.LEFT, 10, 5));
            linha.setBackground(CARD);

            JTextField txtNome = criarCampoTexto();
            txtNome.setPreferredSize(new Dimension(140, 30));

            JComboBox<String> comboTipo = new JComboBox<>(new String[]{"INT", "VARCHAR", "DOUBLE", "BOOLEAN"});
            comboTipo.setBackground(CARD_SECUNDARIO);
            comboTipo.setForeground(TEXTO);

            JCheckBox chkPK = new JCheckBox("PK");
            chkPK.setBackground(CARD);
            chkPK.setForeground(TEXTO);

            JCheckBox chkFK = new JCheckBox("FK");
            chkFK.setBackground(CARD);
            chkFK.setForeground(TEXTO);

            JLabel lblNome = new JLabel("Coluna:");
            lblNome.setForeground(TEXTO);

            linha.add(lblNome);
            linha.add(txtNome);
            linha.add(comboTipo);
            linha.add(chkPK);
            linha.add(chkFK);

            linhasColunas.add(linha);
            painelColunas.add(linha);
            painelColunas.revalidate();
            painelColunas.repaint();
        };

        adicionarLinhaColuna.run();
        adicionarLinhaColuna.run();

        gbc.gridx = 0;
        gbc.gridy = 1;
        gbc.gridwidth = 2;
        formulario.add(painelColunas, gbc);

        JPanel painelBotoes = new JPanel(new FlowLayout(FlowLayout.LEFT, 10, 0));
        painelBotoes.setBackground(CARD);

        JButton btnAddColuna = new JButton("+ Adicionar Coluna");
        btnAddColuna.setBackground(CARD_SECUNDARIO);
        btnAddColuna.setForeground(TEXTO);
        btnAddColuna.setFocusPainted(false);
        btnAddColuna.addActionListener(e -> adicionarLinhaColuna.run());

        JButton btnSalvarTabela = criarBotaoPrimario("💾 Criar Tabela");
        btnSalvarTabela.addActionListener(e -> {
            String nomeTabela = txtNomeTabela.getText().trim();
            if (nomeTabela.isEmpty()) {
                JOptionPane.showMessageDialog(this, "Informe o nome da tabela.", "Aviso", JOptionPane.WARNING_MESSAGE);
                return;
            }

            Tabela novaTabela = new Tabela(nomeTabela, linhasColunas.size(), 5);

            for (JPanel p : linhasColunas) {
                Component[] comps = p.getComponents();
                String colNome = ((JTextField) comps[1]).getText().trim();
                String colTipo = (String) ((JComboBox<?>) comps[2]).getSelectedItem();
                boolean isPK = ((JCheckBox) comps[3]).isSelected();
                boolean isFK = ((JCheckBox) comps[4]).isSelected();

                if (!colNome.isEmpty()) {
                    novaTabela.adicionarColuna(new Coluna(colNome, colTipo, isPK, isFK));
                }
            }

            if (novaTabela.getQtdColunas() == 0) {
                JOptionPane.showMessageDialog(this, "Adicione ao menos uma coluna com nome válido.", "Aviso", JOptionPane.WARNING_MESSAGE);
                return;
            }

            sgbd.adicionarTabela(novaTabela);
            JOptionPane.showMessageDialog(this, "Tabela '" + nomeTabela + "' criada com sucesso!", "Sucesso", JOptionPane.INFORMATION_MESSAGE);
            mostrarDashboard();
        });

        painelBotoes.add(btnAddColuna);
        painelBotoes.add(btnSalvarTabela);

        gbc.gridy = 2;
        formulario.add(painelBotoes, gbc);

        painelConteudo.add(formulario, BorderLayout.NORTH);
        atualizarTela();
    }

    // ==============================
    // INSERÇÃO DE DADOS
    // ==============================

    private void mostrarInserirDados() {
        atualizarCabecalho("Inserir Dados", "Adicione um novo registro à tabela selecionada");
        painelConteudo.removeAll();

        if (sgbd.getQtdTabelas() == 0) {
            JOptionPane.showMessageDialog(this, "Nenhuma tabela cadastrada. Crie uma tabela primeiro.", "Aviso", JOptionPane.WARNING_MESSAGE);
            return;
        }

        JPanel containerGeral = new JPanel();
        containerGeral.setBackground(CARD);
        containerGeral.setLayout(new BoxLayout(containerGeral, BoxLayout.Y_AXIS));
        containerGeral.setBorder(new EmptyBorder(20, 20, 20, 20));

        // MODIFICAÇÃO 1: Linha do combo box com alinhamento perfeito com as labels dinâmicas
        JPanel linhaCombo = new JPanel(new FlowLayout(FlowLayout.LEFT, 5, 5));
        linhaCombo.setBackground(CARD);

        JLabel lblSelecione = new JLabel("Selecione a Tabela:");
        lblSelecione.setForeground(TEXTO);
        lblSelecione.setFont(new Font("SansSerif", Font.BOLD, 13));
        lblSelecione.setPreferredSize(new Dimension(160, 25));

        JComboBox<String> comboTabelas = criarComboTabelas();
        comboTabelas.setPreferredSize(new Dimension(280, 30));

        linhaCombo.add(lblSelecione);
        linhaCombo.add(comboTabelas);
        containerGeral.add(linhaCombo);
        containerGeral.add(Box.createVerticalStrut(10));

        JPanel painelCamposDinamicos = new JPanel();
        painelCamposDinamicos.setBackground(CARD);
        painelCamposDinamicos.setLayout(new BoxLayout(painelCamposDinamicos, BoxLayout.Y_AXIS));

        Runnable atualizarCampos = () -> {
            painelCamposDinamicos.removeAll();
            String nomeTabela = (String) comboTabelas.getSelectedItem();
            Tabela tabela = sgbd.buscarTabela(nomeTabela);

            if (tabela != null) {
                for (int i = 0; i < tabela.getQtdColunas(); i++) {
                    Coluna col = tabela.getColunas()[i];
                    JPanel linha = new JPanel(new FlowLayout(FlowLayout.LEFT, 5, 5));
                    linha.setBackground(CARD);

                    JLabel lbl = new JLabel(col.getNome() + " (" + col.getTipo() + "): ");
                    lbl.setForeground(TEXTO);
                    lbl.setFont(new Font("SansSerif", Font.BOLD, 13));
                    lbl.setPreferredSize(new Dimension(160, 25));

                    JTextField txt = criarCampoTexto();
                    txt.setPreferredSize(new Dimension(280, 30));

                    linha.add(lbl);
                    linha.add(txt);
                    painelCamposDinamicos.add(linha);
                }
            }
            painelCamposDinamicos.revalidate();
            painelCamposDinamicos.repaint();
        };

        comboTabelas.addActionListener(e -> atualizarCampos.run());
        atualizarCampos.run();

        containerGeral.add(painelCamposDinamicos);
        containerGeral.add(Box.createVerticalStrut(15));

        JPanel linhaBotao = new JPanel(new FlowLayout(FlowLayout.LEFT, 5, 5));
        linhaBotao.setBackground(CARD);

        JButton btnSalvar = criarBotaoPrimario("✚  Salvar Registro");
        linhaBotao.add(btnSalvar);
        containerGeral.add(linhaBotao);

        btnSalvar.addActionListener(e -> {
            String nomeTabela = (String) comboTabelas.getSelectedItem();
            Tabela tabela = sgbd.buscarTabela(nomeTabela);

            if (tabela == null) return;

            String[] valores = new String[tabela.getQtdColunas()];
            Component[] comps = painelCamposDinamicos.getComponents();
            int idx = 0;

            for (Component comp : comps) {
                if (comp instanceof JPanel) {
                    for (Component sub : ((JPanel) comp).getComponents()) {
                        if (sub instanceof JTextField) {
                            valores[idx++] = ((JTextField) sub).getText();
                        }
                    }
                }
            }

            boolean sucesso = sgbd.inserirRegistro(nomeTabela, valores);
            if (sucesso) {
                JOptionPane.showMessageDialog(this, "Registro inserido com sucesso!", "Sucesso", JOptionPane.INFORMATION_MESSAGE);
                mostrarInserirDados();
            } else {
                JOptionPane.showMessageDialog(this, "Erro ao inserir registro.", "Erro", JOptionPane.ERROR_MESSAGE);
            }
        });

        painelConteudo.add(containerGeral, BorderLayout.NORTH);
        atualizarTela();
    }

    // ==============================
    // CONSULTA SELECT COM WHERE
    // ==============================

    private void mostrarSelect() {
        atualizarCabecalho("SELECT", "Consulte dados com filtro WHERE opcional");
        painelConteudo.removeAll();

        JPanel painel = criarPainelFormulario();
        GridBagConstraints gbc = criarConstraints();

        adicionarLabel(painel, gbc, "Tabela", 0);
        JComboBox<String> comboTabela = criarComboTabelas();
        comboTabela.setPreferredSize(new Dimension(280, 32));
        adicionarComponente(painel, gbc, comboTabela, 0);

        adicionarLabel(painel, gbc, "Colunas a Exibir", 1);
        JTextField campoColunas = criarCampoTexto();
        campoColunas.setPreferredSize(new Dimension(280, 32));
        campoColunas.setToolTipText("Ex: id,nome,cidade");
        adicionarComponente(painel, gbc, campoColunas, 1);

        adicionarLabel(painel, gbc, "WHERE (Coluna)", 2);
        JTextField campoWhereColuna = criarCampoTexto();
        campoWhereColuna.setPreferredSize(new Dimension(280, 32));
        campoWhereColuna.setToolTipText("Opcional. Ex: cidade");
        adicionarComponente(painel, gbc, campoWhereColuna, 2);

        adicionarLabel(painel, gbc, "WHERE (= Valor)", 3);
        JTextField campoWhereValor = criarCampoTexto();
        campoWhereValor.setPreferredSize(new Dimension(280, 32));
        campoWhereValor.setToolTipText("Opcional. Ex: São Paulo");
        adicionarComponente(painel, gbc, campoWhereValor, 3);

        JButton executar = criarBotaoPrimario("▶  Executar SELECT");
        gbc.gridy = 4;
        gbc.gridx = 1;
        painel.add(executar, gbc);

        JPanel containerResultado = new JPanel(new BorderLayout());
        containerResultado.setBackground(FUNDO);

        executar.addActionListener(e -> {
            String tabela = (String) comboTabela.getSelectedItem();
            String textoColunas = campoColunas.getText().replace(" ", "");
            String colWhere = campoWhereColuna.getText().trim();
            String valWhere = campoWhereValor.getText().trim();

            if (textoColunas.isEmpty()) {
                JOptionPane.showMessageDialog(this, "Informe as colunas.", "SELECT", JOptionPane.WARNING_MESSAGE);
                return;
            }

            String[] colunas = textoColunas.split(",");
            Object[][] dados = sgbd.obterResultadoSelectSimples(tabela, colunas, colWhere, valWhere);

            if (dados == null) {
                JOptionPane.showMessageDialog(this, "Tabela ou colunas inválidas.", "Erro", JOptionPane.ERROR_MESSAGE);
                return;
            }

            JTable tabelaResultado = criarTabelaVisual(dados, colunas);
            containerResultado.removeAll();

            JPanel cardTab = new JPanel(new BorderLayout());
            cardTab.setBackground(CARD);
            cardTab.setBorder(new EmptyBorder(15, 15, 15, 15));
            cardTab.add(criarScrollPaneFormatado(tabelaResultado));

            containerResultado.add(cardTab, BorderLayout.CENTER);
            containerResultado.revalidate();
            containerResultado.repaint();
        });

        JPanel container = new JPanel(new BorderLayout(0, 15));
        container.setBackground(FUNDO);
        container.add(painel, BorderLayout.NORTH);
        container.add(containerResultado, BorderLayout.CENTER);

        painelConteudo.add(container, BorderLayout.CENTER);
        atualizarTela();
    }

    // ==============================
    // CONSULTA JOIN
    // ==============================

    private void mostrarJoin() {
        atualizarCabecalho("JOIN", "Combine registros através de chaves");
        painelConteudo.removeAll();

        JPanel formulario = criarPainelFormulario();
        GridBagConstraints gbc = criarConstraints();

        JComboBox<String> tabelaA = criarComboTabelas();
        JComboBox<String> tabelaB = criarComboTabelas();
        JTextField colunaA = criarCampoTexto();
        JTextField colunaB = criarCampoTexto();
        JTextField camposA = criarCampoTexto();
        JTextField camposB = criarCampoTexto();

        Dimension tamPadrao = new Dimension(280, 32);
        tabelaA.setPreferredSize(tamPadrao);
        tabelaB.setPreferredSize(tamPadrao);
        colunaA.setPreferredSize(tamPadrao);
        colunaB.setPreferredSize(tamPadrao);
        camposA.setPreferredSize(tamPadrao);
        camposB.setPreferredSize(tamPadrao);

        int linha = 0;
        adicionarLabel(formulario, gbc, "Tabela A", linha);
        adicionarComponente(formulario, gbc, tabelaA, linha++);

        adicionarLabel(formulario, gbc, "Tabela B", linha);
        adicionarComponente(formulario, gbc, tabelaB, linha++);

        adicionarLabel(formulario, gbc, "Coluna JOIN A", linha);
        adicionarComponente(formulario, gbc, colunaA, linha++);

        adicionarLabel(formulario, gbc, "Coluna JOIN B", linha);
        adicionarComponente(formulario, gbc, colunaB, linha++);

        adicionarLabel(formulario, gbc, "Campos Tabela A", linha);
        adicionarComponente(formulario, gbc, camposA, linha++);

        adicionarLabel(formulario, gbc, "Campos Tabela B", linha);
        adicionarComponente(formulario, gbc, camposB, linha++);

        JButton executar = criarBotaoPrimario("⇄  Executar JOIN");
        gbc.gridy = linha;
        gbc.gridx = 1;
        formulario.add(executar, gbc);

        JPanel containerResultado = new JPanel(new BorderLayout());
        containerResultado.setBackground(FUNDO);

        executar.addActionListener(e -> {
            String nomeA = (String) tabelaA.getSelectedItem();
            String nomeB = (String) tabelaB.getSelectedItem();
            String joinA = colunaA.getText().trim();
            String joinB = colunaB.getText().trim();

            String[] listaA = camposA.getText().replace(" ", "").split(",");
            String[] listaB = camposB.getText().replace(" ", "").split(",");

            if (joinA.isEmpty() || joinB.isEmpty()) {
                JOptionPane.showMessageDialog(this, "Informe as colunas de JOIN.", "JOIN", JOptionPane.WARNING_MESSAGE);
                return;
            }

            Object[][] dados = sgbd.obterResultadoJoin(nomeA, nomeB, joinA, joinB, listaA, listaB);

            if (dados == null) {
                JOptionPane.showMessageDialog(this, "Não foi possível executar o JOIN.", "Erro", JOptionPane.ERROR_MESSAGE);
                return;
            }

            String[] cabecalho = new String[listaA.length + listaB.length];
            int indice = 0;
            for (String c : listaA) cabecalho[indice++] = nomeA + "." + c;
            for (String c : listaB) cabecalho[indice++] = nomeB + "." + c;

            JTable tabelaResultado = criarTabelaVisual(dados, cabecalho);
            containerResultado.removeAll();

            JPanel cardTab = new JPanel(new BorderLayout());
            cardTab.setBackground(CARD);
            cardTab.setBorder(new EmptyBorder(15, 15, 15, 15));
            cardTab.add(criarScrollPaneFormatado(tabelaResultado));

            containerResultado.add(cardTab, BorderLayout.CENTER);
            containerResultado.revalidate();
            containerResultado.repaint();
        });

        JPanel container = new JPanel(new BorderLayout(0, 15));
        container.setBackground(FUNDO);
        container.add(formulario, BorderLayout.NORTH);
        container.add(containerResultado, BorderLayout.CENTER);

        painelConteudo.add(container, BorderLayout.CENTER);
        atualizarTela();
    }

    private void mostrarSobre() {
        atualizarCabecalho("Sobre", "Informações sobre a aplicação");
        painelConteudo.removeAll();

        JPanel painel = new JPanel();
        painel.setBackground(CARD);
        painel.setBorder(new EmptyBorder(25, 25, 25, 25));
        painel.setLayout(new BoxLayout(painel, BoxLayout.Y_AXIS));

        JLabel titulo = new JLabel("Simulador de SGBD Relacional");
        titulo.setForeground(TEXTO);
        titulo.setFont(new Font("SansSerif", Font.BOLD, 20));

        JLabel info = new JLabel("<html><br>Atividade Avaliativa II - Estrutura de Dados (Arrays)<br>"
                + "Desenvolvido em Java com Swing, suporte a CSV, vetor dinâmico, inserção manual, filtro WHERE e criação de tabelas.</html>");
        info.setForeground(TEXTO_SECUNDARIO);
        info.setFont(new Font("SansSerif", Font.PLAIN, 14));

        painel.add(titulo);
        painel.add(info);

        painelConteudo.add(painel, BorderLayout.NORTH);
        atualizarTela();
    }

    // ==============================
    // AUXILIARES DE UI & COMPONENTES
    // ==============================

    private JTextField criarCampoTexto() {
        JTextField txt = new JTextField();
        txt.setBackground(CARD_SECUNDARIO);
        txt.setForeground(TEXTO);
        txt.setCaretColor(TEXTO);
        txt.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createLineBorder(BORDA, 1),
                BorderFactory.createEmptyBorder(5, 8, 5, 8)
        ));
        return txt;
    }

    private void atualizarCabecalho(String titulo, String subtitulo) {
        tituloPagina.setText(titulo);
        subtituloPagina.setText(subtitulo);
    }

    private void atualizarTela() {
        painelConteudo.revalidate();
        painelConteudo.repaint();
    }

    private JPanel criarPainelFormulario() {
        JPanel painel = new JPanel(new GridBagLayout());
        painel.setBackground(CARD);
        painel.setBorder(new EmptyBorder(20, 20, 20, 20));
        return painel;
    }

    private GridBagConstraints criarConstraints() {
        GridBagConstraints gbc = new GridBagConstraints();
        gbc.insets = new Insets(6, 6, 6, 6);
        gbc.fill = GridBagConstraints.NONE;
        gbc.anchor = GridBagConstraints.WEST;
        return gbc;
    }

    private void adicionarLabel(JPanel painel, GridBagConstraints gbc, String texto, int linha) {
        gbc.gridx = 0;
        gbc.gridy = linha;
        gbc.weightx = 0.0;
        JLabel label = new JLabel(texto);
        label.setForeground(TEXTO);
        label.setFont(new Font("SansSerif", Font.BOLD, 13));
        painel.add(label, gbc);
    }

    private void adicionarComponente(JPanel painel, GridBagConstraints gbc, JComponent comp, int linha) {
        gbc.gridx = 1;
        gbc.gridy = linha;
        gbc.weightx = 1.0;
        painel.add(comp, gbc);
    }

    private JComboBox<String> criarComboTabelas() {
        JComboBox<String> combo = new JComboBox<>();
        combo.setBackground(CARD_SECUNDARIO);
        combo.setForeground(TEXTO);
        for (int i = 0; i < sgbd.getQtdTabelas(); i++) {
            combo.addItem(sgbd.getTabelas()[i].getNome());
        }
        return combo;
    }

    private JButton criarBotaoPrimario(String texto) {
        JButton btn = new JButton(texto);
        btn.setFont(new Font("SansSerif", Font.BOLD, 13));
        btn.setBackground(AZUL);
        btn.setForeground(TEXTO);
        btn.setFocusPainted(false);
        btn.setCursor(new Cursor(Cursor.HAND_CURSOR));
        btn.setBorder(new EmptyBorder(10, 18, 10, 18));
        return btn;
    }

    private JPanel criarCard(String titulo, String valor, String descricao) {
        JPanel card = new JPanel();
        card.setBackground(CARD);
        card.setBorder(new EmptyBorder(20, 22, 20, 22));
        card.setLayout(new BoxLayout(card, BoxLayout.Y_AXIS));

        JLabel t = new JLabel(titulo);
        t.setForeground(TEXTO_SECUNDARIO);
        t.setFont(new Font("SansSerif", Font.PLAIN, 13));

        JLabel v = new JLabel(valor);
        v.setForeground(TEXTO);
        v.setFont(new Font("SansSerif", Font.BOLD, 28));

        JLabel d = new JLabel(descricao);
        d.setForeground(TEXTO_SECUNDARIO);
        d.setFont(new Font("SansSerif", Font.PLAIN, 11));

        card.add(t);
        card.add(Box.createVerticalStrut(8));
        card.add(v);
        card.add(Box.createVerticalStrut(5));
        card.add(d);
        return card;
    }

    private JPanel criarItemTabela(Tabela tabela) {
        JPanel item = new JPanel(new BorderLayout());
        item.setBackground(CARD_SECUNDARIO);
        item.setBorder(new EmptyBorder(12, 15, 12, 15));

        JLabel nome = new JLabel("▣  " + tabela.getNome());
        nome.setForeground(TEXTO);
        nome.setFont(new Font("SansSerif", Font.BOLD, 14));

        JLabel info = new JLabel(tabela.getQtdColunas() + " colunas  •  " + tabela.getQtdRegistros() + " registros");
        info.setForeground(TEXTO_SECUNDARIO);

        item.add(nome, BorderLayout.WEST);
        item.add(info, BorderLayout.EAST);
        return item;
    }

    private JPanel criarPainelTabelaComDetalhes(Tabela tabela) {
        JPanel painelDivisao = new JPanel(new GridBagLayout());
        painelDivisao.setBackground(FUNDO);

        GridBagConstraints gbc = new GridBagConstraints();
        gbc.fill = GridBagConstraints.BOTH;
        gbc.weightx = 1.0;
        gbc.insets = new Insets(0, 0, 10, 0);

        JPanel pEstrutura = new JPanel(new BorderLayout());
        pEstrutura.setBackground(CARD);
        pEstrutura.setBorder(BorderFactory.createTitledBorder(
                BorderFactory.createLineBorder(BORDA), " Estrutura de Colunas ", 0, 0,
                new Font("SansSerif", Font.BOLD, 12), TEXTO
        ));

        String[] colsEstrutura = {"Nome da Coluna", "Tipo de Dado", "Chave Primária (PK)", "Chave Estrangeira (FK)"};
        Object[][] dadosEstrutura = new Object[tabela.getQtdColunas()][4];

        for (int i = 0; i < tabela.getQtdColunas(); i++) {
            Coluna col = tabela.getColunas()[i];
            dadosEstrutura[i][0] = col.getNome();
            dadosEstrutura[i][1] = col.getTipo();
            dadosEstrutura[i][2] = col.isPK() ? "Sim" : "Não";
            dadosEstrutura[i][3] = col.isFK() ? "Sim" : "Não";
        }
        pEstrutura.add(criarScrollPaneFormatado(criarTabelaVisual(dadosEstrutura, colsEstrutura)));

        gbc.gridx = 0;
        gbc.gridy = 0;
        gbc.weighty = 0.3;
        painelDivisao.add(pEstrutura, gbc);

        JPanel pRegistros = new JPanel(new BorderLayout());
        pRegistros.setBackground(CARD);
        pRegistros.setBorder(BorderFactory.createTitledBorder(
                BorderFactory.createLineBorder(BORDA), " Registros Armazenados (" + tabela.getQtdRegistros() + ") ", 0, 0,
                new Font("SansSerif", Font.BOLD, 12), TEXTO
        ));

        String[] nomesColunas = new String[tabela.getQtdColunas()];
        for (int i = 0; i < tabela.getQtdColunas(); i++) {
            nomesColunas[i] = tabela.getColunas()[i].getNome();
        }

        Object[][] dadosRegistros = new Object[tabela.getQtdRegistros()][tabela.getQtdColunas()];
        for (int i = 0; i < tabela.getQtdRegistros(); i++) {
            Registro reg = tabela.getRegistros()[i];
            for (int j = 0; j < tabela.getQtdColunas(); j++) {
                dadosRegistros[i][j] = reg.getValor(j);
            }
        }
        pRegistros.add(criarScrollPaneFormatado(criarTabelaVisual(dadosRegistros, nomesColunas)));

        gbc.gridy = 1;
        gbc.weighty = 0.7;
        gbc.insets = new Insets(0, 0, 0, 0);
        painelDivisao.add(pRegistros, gbc);

        return painelDivisao;
    }

    private JScrollPane criarScrollPaneFormatado(Component comp) {
        JScrollPane scroll = new JScrollPane(comp);
        scroll.setBorder(BorderFactory.createLineBorder(BORDA, 1));
        scroll.getViewport().setBackground(CARD);
        return scroll;
    }

    private JTable criarTabelaVisual(Object[][] dados, String[] colunas) {
        DefaultTableModel model = new DefaultTableModel(dados, colunas) {
            @Override
            public boolean isCellEditable(int row, int column) {
                return false;
            }
        };

        JTable table = new JTable(model);
        table.setRowHeight(28);
        table.setBackground(CARD);
        table.setForeground(TEXTO);
        table.setGridColor(BORDA);
        table.getTableHeader().setBackground(CARD_SECUNDARIO);
        table.getTableHeader().setForeground(TEXTO);
        table.getTableHeader().setFont(new Font("SansSerif", Font.BOLD, 12));

        table.setFillsViewportHeight(true);

        DefaultTableCellRenderer center = new DefaultTableCellRenderer();
        center.setHorizontalAlignment(JLabel.CENTER);
        table.setDefaultRenderer(Object.class, center);

        return table;
    }
}