export enum OrderStatus {
  Pending = 'Pending',
  Confirmed = 'Confirmed',
  Processing = 'Processing',
  Shipped = 'Shipped',
  Delivered = 'Delivered',
  Cancelled = 'Cancelled',
  Returned = 'Returned',
}

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ICartState } from "./interfaces/ICartState";
import type { ICheckout } from "@/interfaces/ICheckout";
import type { IOption } from "@/interfaces/IProduct";

export interface IOrder extends ICartState {
  id: string;            // unique order id
  created_at: string;     // timestamp
  status?: OrderStatus;
}

export interface IOrderState {
  orders: IOrder[];
  showOrder: IOrder | null;
}

const initialState: IOrderState = {
  orders: [],
  showOrder: null,
};

const OrdersSlice = createSlice({
  name: "orders",
  initialState,
  reducers: {
    loadOrders: (state, action: PayloadAction<IOrder[]>) => {
      state.orders = action.payload;
    },
    showOrderDetail: (state, action: PayloadAction<IOrder | null>) => {
      state.showOrder = action.payload;
    },
     removeItem: (
          state,
          action: PayloadAction<{
            productId: number;
            selectedOptions: { [variantName: string]: IOption };
          }>
        ) => {
          const index = state.showOrder?.cartitems.findIndex(
            (item) =>
              item.product.id === action.payload.productId &&
              areOptionsEqual(item.selectedOptions, action.payload.selectedOptions)
          );
          if (typeof index === 'number' && index >= 0 && state.showOrder) {
            const item = state.showOrder.cartitems[index];
            state.showOrder.totalquantity -= item.quantity;
            state.showOrder.totalprice = formatPrice(state.showOrder.totalprice - item.totalPrice);
            state.showOrder.cartitems.splice(index, 1);
          }
        },
    
        increaseQuantity: (
          state,
          action: PayloadAction<{
            productId: number;
            selectedOptions: { [variantName: string]: IOption };
          }>
        ) => {
          const item = state.showOrder?.cartitems.find(
            (item) =>
              item.product.id === action.payload.productId &&
              areOptionsEqual(item.selectedOptions, action.payload.selectedOptions)
          );
    
          if (item) {
            // Calculate selected option prices for updated item
            const selectedOptionPrices = Object.values(item.selectedOptions || {})
              .filter((opt): opt is IOption => opt !== null)
              .reduce((sum, option) => sum + (option.price || 0), 0);
    
            const totalItemPrice = (selectedOptionPrices);
    
            item.quantity += 1;
            item.totalPrice = formatPrice(item.totalPrice + totalItemPrice);

            if(state.showOrder) {
              state.showOrder.totalquantity += 1;
              state.showOrder.totalprice = formatPrice(state.showOrder.totalprice + totalItemPrice);
            }
            
          }
        },
    
        decreaseQuantity: (
          state,
          action: PayloadAction<{
            productId: number;
            selectedOptions: { [variantName: string]: IOption };
          }>
        ) => {
          const item = state.showOrder?.cartitems.find(
            (item) =>
              item.product.id === action.payload.productId &&
              areOptionsEqual(item.selectedOptions, action.payload.selectedOptions)
          );
    
          if (item && item.quantity > 1) {
            // Calculate selected option prices for updated item
            const selectedOptionPrices = Object.values(item.selectedOptions || {})
              .filter((opt): opt is IOption => opt !== null)
              .reduce((sum, option) => sum + (option.price || 0), 0);
    
            const totalItemPrice = (selectedOptionPrices);
    
            item.quantity -= 1;
            item.totalPrice = formatPrice(item.totalPrice - totalItemPrice);

            if(state.showOrder) {
              state.showOrder.totalquantity -= 1;
              state.showOrder.totalprice = formatPrice(state.showOrder.totalprice - totalItemPrice);
            }
          }
        },
        updateCheckoutData: (
          state,
          action: PayloadAction<ICheckout>
        ) => {

            if(state.showOrder) {
              state.showOrder.checkoutdata = action.payload;
            }
        },   
    
        clearCart: (state) => {
          if(state.showOrder) {
          state.showOrder.cartitems = [];
          state.showOrder.totalquantity = 0;
          state.showOrder.totalprice = 0;
          }
        }

  },
});

export const OrdersActions = OrdersSlice.actions;
export default OrdersSlice;

const formatPrice = (price: number) => parseFloat(price.toFixed(2));

const areOptionsEqual = (
  options1: { [variantName: string]: IOption },
  options2: { [variantName: string]: IOption }
) => {
  const keys1 = Object.keys(options1 || {});
  const keys2 = Object.keys(options2 || {});
  if (keys1.length !== keys2.length) return false;

  return keys1.every(
    (key) => options2[key] && options1[key]?.id === options2[key]?.id
  );
};


