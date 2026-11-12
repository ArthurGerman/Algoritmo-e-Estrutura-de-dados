package atv02_array;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;

public class CarregadorCSV {

    // Lê um arquivo .csv e insere cada linha como um Registro na tabela informada.
    // A tabela já precisa ter as colunas cadastradas (adicionarColuna), pois é
    // isso que define quantos valores cada Registro deve ter.
    public static void carregarRegistros(Tabela tabela, String caminhoArquivo) {
        try (BufferedReader leitor = new BufferedReader(new FileReader(caminhoArquivo))) {
            String linha = leitor.readLine(); // primeira linha é o cabeçalho, é descartada

            while ((linha = leitor.readLine()) != null) {
                if (linha.trim().isEmpty()) {
                    continue;
                }

                String[] valoresLinha = linha.split(",");
                Registro registro = new Registro(tabela.getQtdColunas());

                for (int i = 0; i < valoresLinha.length; i++) {
                    registro.setValor(i, valoresLinha[i].trim());
                }

                tabela.adicionarRegistro(registro);
            }
        } catch (IOException e) {
            System.out.println("Erro ao carregar o arquivo '" + caminhoArquivo + "': " + e.getMessage());
        }
    }
}