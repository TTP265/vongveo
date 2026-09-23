import { createContext, useEffect, useMemo, useState } from 'react';

export const CartContext = createContext(null);
const STORAGE_KEY = 'vongveo_cart';

const loadCart = () => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
        return [];
    }
};

export const CartProvider = ({ children }) => {
    const [items, setItems] = useState(loadCart);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }, [items]);

    const addToCart = (product, rentDays = 1) => {
        setItems((current) => {
            const existing = current.find((item) => item.id === product.id);
            if (existing) {
                return current.map((item) => item.id === product.id
                    ? { ...item, quantity: item.quantity + 1, rentDays: product.type === 'Cho thuê' ? rentDays : 0 }
                    : item);
            }
            return [...current, {
                id: product.id,
                name: product.name,
                type: product.type,
                price: Number(product.price),
                image_url: product.image_url,
                quantity: 1,
                rentDays: product.type === 'Cho thuê' ? rentDays : 0,
            }];
        });
    };

    const updateItem = (id, changes) => setItems((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item));
    const removeItem = (id) => setItems((current) => current.filter((item) => item.id !== id));
    const removeItems = (ids) => {
        const idsToRemove = new Set(ids);
        setItems((current) => current.filter((item) => !idsToRemove.has(item.id)));
    };
    const clearCart = () => setItems([]);
    const itemCount = items.reduce((total, item) => total + item.quantity, 0);

    const value = useMemo(() => ({ items, itemCount, addToCart, updateItem, removeItem, removeItems, clearCart }), [items, itemCount]);
    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
