import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: productStock } = await api.get<Stock>(`/stock/${productId}`)

      if (productStock.amount <= 1) {
        toast.error('Quantidade solicitada fora de estoque');
      }
      
      let existingProduct = cart.find(product => product.id === productId)

      if(existingProduct){
        const total = existingProduct.amount + 1;
        
        if (total > productStock.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }
      }

      let newCart: Product[] = []

      if (!existingProduct) {
        const { data } = await api.get<Omit<Product, 'amount'>>(`/products/${productId}`)

        existingProduct = {
          ...data,
          amount: 1
        }

        newCart = ([...cart, existingProduct]);
        setCart(newCart);
      } else {
        newCart = cart.map(product => product.id === productId ? {
        ...product,
        amount: product.amount + 1
      }
      :  product )

        setCart(newCart)
      }
      
      localStorage.setItem(`@RocketShoes:cart`, JSON.stringify(newCart))

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find(product => product.id === productId)

      if (!product) {
        return toast.error('Erro na remoção do produto');
      }

      const newCart = cart.filter(product => product.id !== productId)

      localStorage.setItem(`@RocketShoes:cart`, JSON.stringify(newCart))

      setCart(newCart)
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        return toast.error('Quantidade inválida')
      }

      const selectedProduct = cart.find((product) => product.id === productId);
      
      const { data: productStock } = await api.get<Stock>(`/stock/${productId}`)

      if (selectedProduct) {
        
        const total = selectedProduct.amount + 1;
    
        if (total > productStock.amount) {
          return toast.error('Quantidade solicitada fora de estoque');
        }
      }

      if (productStock.amount <= 1) {
        return toast.error('Quantidade solicitada fora de estoque');
      }

      const newCart = cart.map(product => product.id === productId ? {
        ...product,
        amount,
      } : product
      )

      localStorage.setItem(`@RocketShoes:cart`, JSON.stringify(newCart))

      setCart(newCart)
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
