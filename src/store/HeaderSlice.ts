export interface HeaderState {
  theme: "light" | "dark";
  user: { name: string };
}

const initialState: HeaderState = {
  theme: "light",
  user: { name: "Admin" },
};

import { createSlice } from "@reduxjs/toolkit";

const headerSlice = createSlice({
  name: "header",
  initialState,
  reducers: {
    toggleTheme(state) {
      state.theme = state.theme === "light" ? "dark" : "light";
    },
    setUser(state, action) {
      state.user = action.payload;
    },
  },
});

export const { toggleTheme, setUser } = headerSlice.actions;
export default headerSlice.reducer;
