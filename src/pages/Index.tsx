import { useState, useMemo } from "react";
import HeroBanner from "@/components/menu/HeroBanner";
import SearchBar from "@/components/menu/SearchBar";
import CategoryFilter from "@/components/menu/CategoryFilter";
import MenuCard from "@/components/menu/MenuCard";
import ProductPopup from "@/components/menu/ProductPopup";
import CartPanel from "@/components/menu/CartPanel";
import { products, type Product, type CartItem } from "@/data/products";

const Index = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategory === "Todos" || p.cat === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, activeCategory]);

  const handleAddToCart = (quantidade: number, observacao: string) => {
    if (!selectedProduct) return;
    setCartItems((prev) => [
      ...prev,
      { product: selectedProduct, quantidade, observacao },
    ]);
    setSelectedProduct(null);
  };

  const handleRemoveFromCart = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-background">
      <HeroBanner />
      <SearchBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        cartCount={cartItems.length}
        onCartOpen={() => setIsCartOpen(true)}
      />
      <CategoryFilter
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      <main className="px-4 pb-8 space-y-3 max-w-2xl mx-auto">
        {filteredProducts.length === 0 ? (
          <p className="text-center text-muted-foreground py-12 text-sm">
            Nenhum prato encontrado 😕
          </p>
        ) : (
          filteredProducts.map((product) => (
            <MenuCard
              key={product.id}
              product={product}
              onAdd={setSelectedProduct}
            />
          ))
        )}
      </main>

      {selectedProduct && (
        <ProductPopup
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onConfirm={handleAddToCart}
        />
      )}

      <CartPanel
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onRemoveItem={handleRemoveFromCart}
      />
    </div>
  );
};

export default Index;
