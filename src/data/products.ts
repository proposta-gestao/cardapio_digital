import produto1 from "@/assets/produto1.jpg";
import produto2 from "@/assets/produto2.jpg";
import produto3 from "@/assets/produto3.jpg";

export interface Product {
  id: number;
  nome: string;
  preco: number;
  desc: string;
  cat: string;
  img: string;
}

export interface CartItem {
  product: Product;
  quantidade: number;
  observacao: string;
}

export const WHATSAPP_PHONE = "5531975540280";

export const CATEGORIES = ["Todos", "Massas", "Bolos", "Sobremesas"] as const;

export const COUPONS: Record<string, number> = {
  ESTELA10: 0.1,
  ESTELA20: 0.2,
  ESTELA30: 0.3,
};

export const products: Product[] = [
  {
    id: 1,
    nome: "Lasanha",
    preco: 30,
    desc: "Lasanha artesanal gratinada com queijo derretido e molho especial da casa",
    cat: "Massas",
    img: produto1,
  },
  {
    id: 2,
    nome: "Bolo Chocolate Morango",
    preco: 20,
    desc: "Bolo de chocolate com morangos frescos selecionados e cobertura cremosa",
    cat: "Bolos",
    img: produto2,
  },
  {
    id: 3,
    nome: "Bolo Ferrero",
    preco: 25,
    desc: "Chocolate com creme de avelã especial e bombons Ferrero Rocher",
    cat: "Sobremesas",
    img: produto3,
  },
];
