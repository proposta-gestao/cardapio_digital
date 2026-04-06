import { Search, ShoppingCart } from "lucide-react";

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  cartCount: number;
  onCartOpen: () => void;
}

const SearchBar = ({ searchTerm, onSearchChange, cartCount, onCartOpen }: SearchBarProps) => {
  return (
    <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="search"
          placeholder="Buscar prato..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-full bg-muted border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
          aria-label="Buscar prato no cardápio"
        />
      </div>
      <button
        onClick={onCartOpen}
        className="relative flex items-center justify-center w-11 h-11 rounded-full bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-all active:scale-95"
        aria-label={`Abrir carrinho com ${cartCount} itens`}
      >
        <ShoppingCart className="w-5 h-5" />
        {cartCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center animate-fade-in">
            {cartCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default SearchBar;
