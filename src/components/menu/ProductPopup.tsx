import { useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import type { Product } from "@/data/products";

interface ProductPopupProps {
  product: Product;
  onClose: () => void;
  onConfirm: (quantidade: number, observacao: string) => void;
}

const ProductPopup = ({ product, onClose, onConfirm }: ProductPopupProps) => {
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState("");

  const handleConfirm = () => {
    onConfirm(quantidade, observacao);
    setQuantidade(1);
    setObservacao("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[hsl(var(--overlay))] animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhes de ${product.nome}`}
    >
      <div
        className="bg-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <img
            src={product.img}
            alt={product.nome}
            className="w-full h-48 object-cover"
            width={384}
            height={192}
          />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors"
            aria-label="Fechar"
          >
            <X className="w-4 h-4 text-foreground" />
          </button>
        </div>

        <div className="p-5">
          <h3 className="font-heading font-bold text-xl text-foreground">{product.nome}</h3>
          <p className="text-muted-foreground text-sm mt-1">{product.desc}</p>
          <p className="text-primary font-bold text-xl mt-3">
            R$ {product.preco.toFixed(2)}
          </p>

          <div className="flex items-center justify-center gap-5 mt-5">
            <button
              onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/70 active:scale-95 transition-all"
              aria-label="Diminuir quantidade"
            >
              <Minus className="w-4 h-4 text-foreground" />
            </button>
            <span className="text-2xl font-bold text-foreground w-8 text-center" aria-live="polite">
              {quantidade}
            </span>
            <button
              onClick={() => setQuantidade((q) => q + 1)}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/70 active:scale-95 transition-all"
              aria-label="Aumentar quantidade"
            >
              <Plus className="w-4 h-4 text-foreground" />
            </button>
          </div>

          <input
            type="text"
            placeholder="Alguma observação? (opcional)"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            className="w-full mt-4 px-4 py-2.5 rounded-lg bg-muted border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
            aria-label="Observação do pedido"
          />

          <button
            onClick={handleConfirm}
            className="w-full mt-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 active:scale-[0.98] transition-all shadow-md"
          >
            Adicionar • R$ {(product.preco * quantidade).toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductPopup;
