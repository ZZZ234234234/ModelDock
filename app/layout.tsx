import type { Metadata } from 'next';
import './globals.css';
import { AppRoot } from '../src/components/app-shell';
export const metadata: Metadata = {
  title: 'ModelDock — One dashboard for every AI model.',
  description: '统一管理、调用、测试和对比 AI 大模型 API。Local-first, open source.',
  icons: { icon: '/favicon.svg' },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <AppRoot>{children}</AppRoot>
      </body>
    </html>
  );
}
