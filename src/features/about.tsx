'use client';
import { Layers, GitBranch, ArrowUpRight } from 'lucide-react';
import { useApp } from '../store/app-store';
import { PageTitle, Panel, Button } from '../components/ui';
export function About() {
  const { t } = useApp();
  return (
    <main className="page-body">
      <PageTitle title={t('关于 ModelDock', 'About ModelDock')} />
      <Panel>
        <div className="about-hero">
          <div className="brand">
            <span className="brand-mark" style={{ width: 48, height: 48 }}>
              <Layers size={28} />
            </span>
            ModelDock
          </div>
          <p style={{ fontSize: 18 }}>One dashboard for every AI model.</p>
          <span className="badge green">v1.0.0</span>
          <p>
            {t(
              'ModelDock 是一个开源 AI 模型控制中心，让开发者在一个工作台中连接、测试、对比和监测多个大模型服务商。默认中文，数据保存在本机。',
              'ModelDock is an open-source AI model control center that lets developers connect, test, compare and monitor multiple LLM providers from one interface.',
            )}
          </p>
          <Button asChild variant="outline">
            <a href="https://github.com/ZZZ234234234" target="_blank" rel="noopener noreferrer">
              <GitBranch size={16} />
              {t('作者 GitHub', 'Author on GitHub')}
              <ArrowUpRight size={14} />
            </a>
          </Button>
        </div>
      </Panel>
      <div className="settings-grid" style={{ marginTop: 22 }}>
        <Panel title={t('项目信息', 'Project details')}>
          <div className="panel-content">
            {[
              ['License', 'MIT'],
              ['Author', t('爱吃孜然芥末 · 周嘉豪', '爱吃孜然芥末 · Zhou Jiahao')],
              ['GitHub', 'ZZZ234234234'],
              ['Built with', 'AI-assisted development'],
            ].map(([k, v]) => (
              <div className="setting-row" key={k}>
                <span className="muted">{k}</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title={t('技术栈', 'Technology stack')}>
          <div className="panel-content">
            {[
              ['UI', 'React 19 · TypeScript · Tailwind CSS 4'],
              ['Components', 'shadcn/ui · Lucide · Recharts'],
              ['Runtime', 'Vinext · Next.js App Router API'],
              ['Storage', 'IndexedDB · Web Crypto AES-GCM'],
              ['Providers', 'OpenAI · Anthropic · Gemini adapters'],
            ].map(([k, v]) => (
              <div className="setting-row" key={k}>
                <span className="muted">{k}</span>
                <span style={{ fontSize: 13, textAlign: 'right' }}>{v}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <p className="footer-note">
        {t(
          '独立开源项目，与所列服务商无隶属关系。',
          'An independent open-source project, unaffiliated with the listed providers.',
        )}
      </p>
    </main>
  );
}
