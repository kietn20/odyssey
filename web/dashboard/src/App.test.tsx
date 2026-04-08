import React from "react";
import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders mission control header", () => {
	render(<App />);
	const headerElement = screen.getByText(/Odyssey Mission Control/i);
	expect(headerElement).toBeInTheDocument();
});
