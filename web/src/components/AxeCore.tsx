"use client";

import React, { useEffect } from "react";

export function AxeCore() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      Promise.all([
        import("@axe-core/react"),
        import("react-dom")
      ]).then(([axe, ReactDOM]) => {
        axe.default(React, ReactDOM, 1000);
      });
    }
  }, []);

  return null;
}
