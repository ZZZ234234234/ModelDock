import Link from 'next/link';
export default function NotFound() {
  return (
    <main style={{ padding: 50 }}>
      <h1>404 · 页面不存在 / Page not found</h1>
      <Link href="/">返回 ModelDock / Back to ModelDock</Link>
    </main>
  );
}
