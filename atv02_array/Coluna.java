package atv02_array;

public class Coluna {
    private String nome;
    private String tipo; // Ex: "INT", "VARCHAR"
    private boolean isPK;
    private boolean isFK;

    public Coluna(String nome, String tipo, boolean isPK, boolean isFK) {
        this.nome = nome;
        this.tipo = tipo;
        this.isPK = isPK;
        this.isFK = isFK;
    }

    public String getNome() { 
        return nome; 
    }
    public String getTipo() { 
        return tipo; 
    }
    public boolean isPK() { 
        return isPK; 
    }
    public boolean isFK() { 
        return isFK; 
    }
}
