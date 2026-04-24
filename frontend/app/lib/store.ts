import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";

import { baseApi } from "@/lib/api/rtk/base-api";

export function createAppStore() {
  return configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(baseApi.middleware),
  });
}

export const store = createAppStore();

export type AppStore = ReturnType<typeof createAppStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

export const useAppDispatch =
  "withTypes" in useDispatch
    ? useDispatch.withTypes<AppDispatch>()
    : (() => useDispatch<AppDispatch>()) as () => AppDispatch;

export const useAppSelector =
  "withTypes" in useSelector
    ? useSelector.withTypes<RootState>()
    : useSelector as unknown as <TSelected>(
        selector: (state: RootState) => TSelected,
      ) => TSelected;
