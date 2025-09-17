import type { IProduct } from "@/interfaces/IProduct";

export interface IProductState {
    products: IProduct[],
    productDetail: IProduct | null
}