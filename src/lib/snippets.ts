import type { WireRequest } from '../types';
const quote = (s: string) => "'" + s.replaceAll("'", "'\\''") + "'";
export function snippets(wire: WireRequest) {
  const headers = Object.fromEntries(
    Object.entries(wire.headers).map(([k, v]) => [
      k,
      /authorization|api-key/i.test(k)
        ? (k.toLowerCase() === 'authorization' ? 'Bearer ' : '') + '${MODELDOCK_API_KEY}'
        : v,
    ]),
  );
  const json = JSON.stringify(wire.body ?? {}, null, 2);
  return {
    curl: `curl ${quote(wire.url)} \\\n  -X ${wire.method} \\\n${Object.entries(headers)
      .map(
        ([k, v]) =>
          `  -H ${v.includes('${MODELDOCK_API_KEY}') ? '"' + k + ': ' + v + '"' : quote(k + ': ' + v)} \\`,
      )
      .join('\n')}\n  --data ${quote(json)}`,
    python: `import os\nimport json\nimport requests\n\nheaders = json.loads(${JSON.stringify(JSON.stringify(headers))})\nheaders = {k: v.replace("${'${MODELDOCK_API_KEY}'}", os.environ.get("MODELDOCK_API_KEY", "")) for k, v in headers.items()}\npayload = json.loads(${JSON.stringify(json)})\nwith requests.post(${JSON.stringify(wire.url)}, headers=headers, json=payload, stream=True, timeout=120) as response:\n    response.raise_for_status()\n    for line in response.iter_lines():\n        if line:\n            print(line.decode())\n`,
    javascript: `// Node.js 22+; set MODELDOCK_API_KEY in your environment.\nconst headers = ${JSON.stringify(headers, null, 2)};\nfor (const name in headers) {\n  headers[name] = headers[name].replace('${'${MODELDOCK_API_KEY}'}', process.env.MODELDOCK_API_KEY ?? '');\n}\nconst response = await fetch(${JSON.stringify(wire.url)}, {\n  method: '${wire.method}',\n  headers,\n  body: JSON.stringify(${json}),\n  signal: AbortSignal.timeout(120000),\n});\nif (!response.ok) throw new Error(await response.text());\nfor await (const chunk of response.body) {\n  process.stdout.write(chunk);\n}\n`,
  };
}
