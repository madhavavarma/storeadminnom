import type { IOption, IProduct } from "@/interfaces/IProduct";
import { OrderStatus } from "../OrdersSlice";
import type { ICheckout } from "@/interfaces/ICheckout";

export interface ICartItem {
  product: IProduct;
  selectedOptions: { [variantName: string]: IOption };
  quantity: number;
  totalPrice: number;
}

export interface ICartState {
  cartitems: ICartItem[];
  totalquantity: number;
  totalprice: number;
  checkoutdata?: ICheckout;
  status?: OrderStatus; // e.g., 'pending', 'completed'
}
  
  
  