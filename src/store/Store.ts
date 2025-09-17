import { configureStore } from "@reduxjs/toolkit";
import CartSlice from "./CartSlice";
import ProductSlice from "./ProductSlice";
import CategorySlice from "./CategorySlice";
import AppSettingsSlice from "./AppSettingsSlice";
import OrdersSlice from "./OrdersSlice";
import HeaderSlice from "./HeaderSlice";

export const store = configureStore({
  reducer: {
    Cart: CartSlice.reducer,
    Products: ProductSlice.reducer,
    Categories: CategorySlice.reducer,
    AppSettings: AppSettingsSlice.reducer,
  Orders: OrdersSlice.reducer,
  header: HeaderSlice
  },
});

// Define RootState and AppDispatch types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
