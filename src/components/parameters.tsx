'use client';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import type { Parameters } from '../types';
import { useApp } from '../store/app-store';
export function ParameterControls({
  value,
  onChange,
  format = 'openai',
}: {
  value: Parameters;
  onChange: (p: Parameters) => void;
  format?: string;
}) {
  const { t } = useApp();
  const set = <K extends keyof Parameters>(key: K, v: Parameters[K]) =>
    onChange({ ...value, [key]: v });
  return (
    <div className="param-stack">
      <label className="field">
        <span>System prompt</span>
        <Textarea
          rows={4}
          value={value.system}
          placeholder={t('你是一位严谨、清晰的助手。', 'You are a precise, helpful assistant.')}
          onChange={(e) => set('system', e.target.value)}
        />
      </label>
      <label className="field">
        <span>Max tokens</span>
        <Input
          type="number"
          min={1}
          max={131072}
          value={value.maxTokens}
          onChange={(e) =>
            set('maxTokens', Math.max(1, Math.min(131072, Number(e.target.value) || 1)))
          }
        />
      </label>
      <div className="inline" style={{ justifyContent: 'space-between' }}>
        <span>{t('自定义采样参数', 'Custom sampling')}</span>
        <Switch
          checked={value.customSampling}
          onCheckedChange={(v) => set('customSampling', v)}
          aria-label="Custom sampling"
        />
      </div>
      <p className="muted" style={{ fontSize: 12, margin: 0, lineHeight: 1.7 }}>
        {t(
          '默认使用模型的原生参数。推理模型可在模型设置中关闭采样参数。',
          'Defaults use model-native parameters. Disable sampling for reasoning models in model settings.',
        )}
      </p>
      {(
        [
          { key: 'temperature', label: 'Temperature', max: 2, min: 0, step: 0.1 },
          { key: 'topP', label: 'Top P', max: 1, min: 0.1, step: 0.05 },
          ...(format === 'openai'
            ? [
                { key: 'frequencyPenalty', label: 'Frequency penalty', max: 2, min: -2, step: 0.1 },
                { key: 'presencePenalty', label: 'Presence penalty', max: 2, min: -2, step: 0.1 },
              ]
            : []),
        ] as const
      )
        .filter((x) => format !== 'anthropic' || x.key === 'temperature')
        .map((r) => (
          <div key={r.key}>
            <div className="param-label">
              <span>{r.label}</span>
              <span className="mono muted">{value[r.key as keyof Parameters]}</span>
            </div>
            <Slider
              value={[
                value[r.key as 'temperature' | 'topP' | 'frequencyPenalty' | 'presencePenalty'],
              ]}
              min={r.min}
              max={r.max}
              step={r.step}
              disabled={!value.customSampling}
              onValueChange={(v) => set(r.key as 'temperature', v[0])}
              aria-label={r.label}
            />
          </div>
        ))}
      <div className="inline" style={{ justifyContent: 'space-between' }}>
        <span>Streaming</span>
        <Switch
          checked={value.stream}
          onCheckedChange={(v) => set('stream', v)}
          aria-label="Streaming"
        />
      </div>
      <div className="inline" style={{ justifyContent: 'space-between' }}>
        <span>JSON mode</span>
        <Switch
          checked={value.jsonMode}
          disabled={format === 'anthropic'}
          onCheckedChange={(v) => set('jsonMode', v)}
          aria-label="JSON mode"
        />
      </div>
    </div>
  );
}
