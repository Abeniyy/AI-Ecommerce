export async function fetchProducts() {
  const res = await fetch('/api/products');
  return await res.json();
}
