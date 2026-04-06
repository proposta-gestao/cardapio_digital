import { Plus } from "lucide-react";
import type { Product } from "@/data/products";

interface MenuCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

const MenuCard = ({ product, onAdd }: MenuCardProps) => {
  return (
    <article className="group flex bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 border border-border/50">
      <div className="w-28 h-28 sm:w-32 sm:h-32 flex-shrink-0 overflow-hidden">
        <img
          src={product.img}
          alt={product.nome}
          loading="lazy"
          width={128}
          height={128}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>
      <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between min-w-0">
        <div>
          <h3 className="font-heading font-semibold text-foreground text-base leading-tight truncate">
            {product.nome}
          </h3>
          <p className="text-muted-foreground text-xs mt-1 line-clamp-2">
            {product.desc}
          </p>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-primary font-bold text-lg">
            R$ {product.preco.toFixed(2)}
          </span>
          <button
            onClick={() => onAdd(product)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 active:scale-95 transition-all shadow-sm"
            aria-label={`Adicionar ${product.nome} ao pedido`}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Adicionar</span>
          </button>
        </div>
      </div>
    </article>
  );
};

export default MenuCard;
