import type { IOption } from "@/interfaces/IProduct";
import type { ICartItem, ICartState } from "./interfaces/ICartState";
import type { ICheckout } from "@/interfaces/ICheckout";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

const initialState: ICartState = {
  cartitems: [],
  totalquantity: 0,
  totalprice: 0,
  checkoutdata: {
    phone: "",
    email: "",
    whatsapp: "",
    address: "",
    city: "",
    pincode: "",
    paymentMethod: "cod",
  },
};

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

const CartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    loadCart: (state, action: PayloadAction<ICartState>) => {
      state.cartitems = action.payload.cartitems;
      state.totalquantity = action.payload.totalquantity;
      state.totalprice = action.payload.totalprice;
      state.checkoutdata = action.payload.checkoutdata;
    },

    addItem: (state: ICartState, action: PayloadAction<ICartItem>) => {
      const { product, selectedOptions, quantity } = action.payload;

      // Calculate selected option prices
      const selectedOptionPrices = Object.values(selectedOptions || {})
        .filter((opt): opt is IOption => opt !== null)
        .reduce((sum, option) => sum + (option.price || 0), 0);

      // Total item price
      const totalItemPrice = (selectedOptionPrices) * quantity;

  // console.log(state)

      state.cartitems = state.cartitems || [];

      const existingItem = state.cartitems?.find(
        (item) =>
          item.product.id === product.id &&
          areOptionsEqual(item.selectedOptions, selectedOptions)
      );

      if (existingItem) {
        existingItem.quantity += quantity;
        existingItem.totalPrice = formatPrice(existingItem.totalPrice + totalItemPrice);
      } else {
        state.cartitems?.push({
          product,
          selectedOptions,
          quantity,
          totalPrice: formatPrice(totalItemPrice),
        });
      }

      state.totalquantity += quantity;
      state.totalprice = formatPrice(state.totalprice + totalItemPrice);
    },

    removeItem: (
      state: ICartState,
      action: PayloadAction<{
        productId: number;
        selectedOptions: { [variantName: string]: IOption };
      }>
    ) => {
      const index = state.cartitems.findIndex(
        (item) =>
          item.product.id === action.payload.productId &&
          areOptionsEqual(item.selectedOptions, action.payload.selectedOptions)
      );

      if (index !== -1) {
        const item = state.cartitems[index];
        state.totalquantity -= item.quantity;
        state.totalprice = formatPrice(state.totalprice - item.totalPrice);
        state.cartitems.splice(index, 1);
      }
    },

    increaseQuantity: (
      state: ICartState,
      action: PayloadAction<{
        productId: number;
        selectedOptions: { [variantName: string]: IOption };
      }>
    ) => {
      const item = state.cartitems.find(
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
        state.totalquantity += 1;
        state.totalprice = formatPrice(state.totalprice + totalItemPrice);
      }
    },

    decreaseQuantity: (
      state: ICartState,
      action: PayloadAction<{
        productId: number;
        selectedOptions: { [variantName: string]: IOption };
      }>
    ) => {
      const item = state.cartitems.find(
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
        state.totalquantity -= 1;
        state.totalprice = formatPrice(state.totalprice - totalItemPrice);
      }
    },

    clearCart: (state: ICartState) => {
      state.cartitems = [];
      state.totalquantity = 0;
      state.totalprice = 0;
    },

    setCheckoutData: (state: ICartState, action: PayloadAction<ICheckout>) => {
      state.checkoutdata = action.payload;
    },
  },
});

export const CartActions = CartSlice.actions;
export default CartSlice;
