import { useState } from "react";
import { X, Trash2, MessageCircle, Tag } from "lucide-react";
import type { CartItem } from "@/data/products";
import { COUPONS, WHATSAPP_PHONE } from "@/data/products";

interface CartPanelProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onRemoveItem: (index: number) => void;
}

const CartPanel = ({ isOpen, onClose, items, onRemoveItem }: CartPanelProps) => {
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState("");

  const subtotal = items.reduce(
    (sum, item) => sum + item.product.preco * item.quantidade,
    0
  );
  const discountAmount = subtotal * discount;
  const total = subtotal - discountAmount;

  const handleApplyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    if (COUPONS[code] !== undefined) {
      setDiscount(COUPONS[code]);
      setCouponMessage(`Cupom aplicado! ${COUPONS[code] * 100}% de desconto`);
    } else {
      setDiscount(0);
      setCouponMessage("Cupom inválido");
    }
  };

  const handleSendWhatsApp = () => {
    if (items.length === 0) return;

    const lines = items.map(
      (item) =>
        `${item.quantidade}x ${item.product.nome}${item.observacao ? ` (${item.observacao})` : ""}`
    );
    const message = encodeURIComponent(
      `*Pedido Estela Panelas* 🍲\n\n${lines.join("\n")}\n\n${
        discount > 0 ? `Desconto: -R$ ${discountAmount.toFixed(2)}\n` : ""
      }*Total: R$ ${total.toFixed(2)}*`
    );
    window.open(`https://wa.me/${WHATSAPP_PHONE}?text=${message}`, "_blank");
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-[hsl(var(--overlay))] animate-fade-in"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-card shadow-2xl transition-transform duration-350 ease-out flex flex-col ${
          isOpen ? "translate-x-0 animate-slide-in-right" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Carrinho de compras"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-heading font-bold text-xl text-foreground">Seu Pedido</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors"
            aria-label="Fechar carrinho"
          >
            <X className="w-4 h-4 text-foreground" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {items.length === 0 ? (
            <p className="text-muted-foreground text-center py-10 text-sm">
              Seu carrinho está vazio
            </p>
          ) : (
            items.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl animate-fade-in"
              >
                <img
                  src={item.product.img}
                  alt={item.product.nome}
                  className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                  loading="lazy"
                  width={56}
                  height={56}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">
                    {item.quantidade}x {item.product.nome}
                  </p>
                  {item.observacao && (
                    <p className="text-muted-foreground text-xs mt-0.5 truncate">
                      {item.observacao}
                    </p>
                  )}
                  <p className="text-primary font-semibold text-sm mt-1">
                    R$ {(item.product.preco * item.quantidade).toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={() => onRemoveItem(index)}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  aria-label={`Remover ${item.product.nome}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-4 space-y-3">
          {/* Coupon */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cupom de desconto"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-muted border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
                aria-label="Código do cupom de desconto"
              />
            </div>
            <button
              onClick={handleApplyCoupon}
              className="px-4 py-2 bg-secondary text-secondary-foreground text-sm font-medium rounded-lg hover:bg-secondary/80 transition-colors"
            >
              Aplicar
            </button>
          </div>
          {couponMessage && (
            <p
              className={`text-xs font-medium ${
                discount > 0 ? "text-green-600" : "text-destructive"
              }`}
            >
              {couponMessage}
            </p>
          )}

          {/* Total */}
          {discount > 0 && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Desconto ({discount * 100}%)</span>
              <span>-R$ {discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="font-heading font-bold text-lg text-foreground">Total</span>
            <span className="font-heading font-bold text-xl text-primary">
              R$ {total.toFixed(2)}
            </span>
          </div>

          <button
            onClick={handleSendWhatsApp}
            disabled={items.length === 0}
            className="w-full py-3.5 rounded-xl bg-green-600 text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:bg-green-700 active:scale-[0.98] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MessageCircle className="w-5 h-5" />
            Enviar Pedido via WhatsApp
          </button>
        </div>
      </aside>
    </>
  );
};

export default CartPanel;
