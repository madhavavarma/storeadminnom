import type { IOrderState } from "../OrdersSlice";
import type { ICartState } from "./ICartState";
import type { ICategoryState } from "./ICategoryState";
import type { IProductState } from "./IProductState";

export interface IState {
    Cart: ICartState,
    Products: IProductState,
    Categories: ICategoryState,
    Orders: IOrderState
}