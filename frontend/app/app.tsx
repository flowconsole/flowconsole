import { Toaster } from "sonner";

import { ProductRouter } from "./product/router";

export function App() {
  return (
    <>
      <ProductRouter />
      <Toaster />
    </>
  );
}
