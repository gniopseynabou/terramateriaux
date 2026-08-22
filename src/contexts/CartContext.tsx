import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import type { Tables } from "@/integrations/supabase/types";

type DbProduct = Tables<"products">;

export interface CartItem {
  product: DbProduct;
  quantity: number;
  isGros: boolean;
}

export interface CustomerInfo {
  nom: string;
  tel: string;
  email: string;
  adresse: string;
  region: string;
  ville: string;
  quartier: string;
  repere: string;
  commentaire: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: DbProduct, quantity: number, isGros: boolean) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  isInCart: (productId: string) => boolean;
  totalItems: number;
  subtotal: number;
  deliveryFee: number;
  setDeliveryFee: (fee: number) => void;
  deliveryMethod: "livraison" | "retrait";
  setDeliveryMethod: (m: "livraison" | "retrait") => void;
  customer: CustomerInfo;
  setCustomer: (a: CustomerInfo) => void;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const emptyCustomer: CustomerInfo = {
  nom: "", tel: "", email: "", adresse: "", region: "", ville: "", quartier: "", repere: "", commentaire: "",
};

const STORAGE_KEY = "tmi-cart-v1";

interface PersistedCart {
  items: CartItem[];
  deliveryMethod: "livraison" | "retrait";
  deliveryFee: number;
  customer: CustomerInfo;
}

const loadCart = (): PersistedCart | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedCart;
  } catch {
    return null;
  }
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const persisted = typeof window !== "undefined" ? loadCart() : null;

  const [items, setItems] = useState<CartItem[]>(persisted?.items ?? []);
  const [deliveryMethod, setDeliveryMethod] = useState<"livraison" | "retrait">(
    persisted?.deliveryMethod ?? "livraison"
  );
  const [deliveryFee, setDeliveryFee] = useState(persisted?.deliveryFee ?? 0);
  const [customer, setCustomer] = useState<CustomerInfo>({ ...emptyCustomer, ...(persisted?.customer ?? {}) });

  useEffect(() => {
    const payload: PersistedCart = { items, deliveryMethod, deliveryFee, customer };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* storage unavailable - cart stays in memory */
    }
  }, [items, deliveryMethod, deliveryFee, customer]);

  const addItem = useCallback((product: DbProduct, quantity: number, isGros: boolean) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        // never duplicate a product line - only bump the quantity
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + quantity, isGros } : i
        );
      }
      return [...prev, { product, quantity, isGros }];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.product.id !== productId)
        : prev.map((i) => (i.product.id === productId ? { ...i, quantity } : i))
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setDeliveryFee(0);
    setCustomer(emptyCustomer);
    setDeliveryMethod("livraison");
  }, []);

  const isInCart = useCallback(
    (productId: string) => items.some((i) => i.product.id === productId),
    [items]
  );

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce(
    (s, i) => s + (i.isGros ? i.product.price_gros : i.product.price_fcfa) * i.quantity,
    0
  );
  const effectiveFee = deliveryMethod === "retrait" ? 0 : deliveryFee;
  const total = subtotal + effectiveFee;

  return (
    <CartContext.Provider
      value={{
        items, addItem, removeItem, updateQuantity, clearCart, isInCart,
        totalItems, subtotal,
        deliveryFee: effectiveFee, setDeliveryFee,
        deliveryMethod, setDeliveryMethod,
        customer, setCustomer,
        total,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};