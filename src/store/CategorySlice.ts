import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ICategoryState } from "./interfaces/ICategoryState";
import type { ICategory } from "@/interfaces/ICategory";

const initialState: ICategoryState = {
  categories: [],
};


const CategorySlice = createSlice({
    name: "category",
    initialState,
    reducers: {
        setCategories: (state:ICategoryState, action: PayloadAction<ICategory[]>) => {
            state.categories = action.payload
        }
    }
});

export const CategoryActions = CategorySlice.actions;

export default CategorySlice;