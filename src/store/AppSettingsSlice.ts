import type { IAppSettings } from "@/interfaces/IAppSettings";
import { createSlice,type PayloadAction } from "@reduxjs/toolkit";

interface IAppSettingsState extends IAppSettings {}

const initialState: IAppSettingsState = {
  logoUrl: undefined,
  branding: {
    siteTitle: undefined,
    welcomeText: undefined,
    tagline: undefined,
    menu: {
      home: undefined,
      products: undefined,
      about: undefined,
    },
    nav: {
      contact: undefined,
      faq: undefined,
    },
  slides: undefined,
    features: undefined,
  homeCarousels: undefined,
  },
};

const AppSettingsSlice = createSlice({
  name: "appSettings",
  initialState,
  reducers: {
    setAppSettings: (state: IAppSettingsState, action: PayloadAction<IAppSettings>) => {
      state.logoUrl = action.payload.logoUrl;
      if (action.payload.branding) {
        // Merge top-level branding fields and nested nav/menu if present
        state.branding = { ...state.branding, ...action.payload.branding };
      }
    },
  },
});

export const AppSettingsActions = AppSettingsSlice.actions;

export default AppSettingsSlice;
