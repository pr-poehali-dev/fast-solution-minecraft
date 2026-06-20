import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const BG = 'https://cdn.poehali.dev/projects/03f3b2e3-c859-42e0-9f6d-ce708296ae04/files/55856e90-44e0-45f3-b47e-db0b485e340b.jpg';
const AI_URL = 'https://functions.poehali.dev/f75ce9e0-04dc-455f-b2f9-13b6af4bc5c5';

type ResourceType = 'plugin' | 'mod' | 'config';
type FileFormat = 'jar' | 'zip' | 'txt';

interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  format: FileFormat;
  description: string;
  code: string;
  author: string;
  authorAvatar: string;
  date: string;
  downloads: number;
}

interface User {
  name: string;
  avatar: string;
  provider: 'google' | 'telegram';
}

const TYPE_META: Record<ResourceType, { label: string; icon: string; color: string }> = {
  plugin: { label: 'Плагин', icon: 'Puzzle', color: 'text-gold' },
  mod: { label: 'Мод', icon: 'Box', color: 'text-accent' },
  config: { label: 'Конфиг', icon: 'Settings2', color: 'text-gold-soft' },
};

const DEFAULT_CODE: Record<ResourceType, string> = {
  plugin: `name: BystroePlugin
version: 1.0.0
main: ru.bystroe.MainPlugin
api-version: 1.20
commands:
  heal:
    description: Восстановить здоровье
    usage: /heal
permissions:
  bystroe.admin:
    default: op`,
  mod: `// mods.toml — описание мода Forge
modLoader = "javafml"
loaderVersion = "[47,)"
license = "MIT"

[[mods]]
modId = "bystroemod"
version = "1.0.0"
displayName = "Быстрый Мод"
description = "Добавляет новые предметы на сервер"`,
  config: `# config.yml — конфигурация сервера
server-name: "Быстрое Решение"
max-players: 100
difficulty: hard
spawn-protection: 16
pvp: true
motd: "&6Лучший сервер &aMinecraft"
economy:
  start-balance: 500
  currency: "монет"`,
};

const SEED: Resource[] = [
  {
    id: '1', name: 'AutoBackup', type: 'plugin', format: 'jar',
    description: 'Автоматический бэкап мира каждые 30 минут.',
    code: DEFAULT_CODE.plugin, author: 'Steve_Mc', authorAvatar: '🟢',
    date: '18.06.2026', downloads: 1242,
  },
  {
    id: '2', name: 'GoldShop', type: 'mod', format: 'zip',
    description: 'Мод с экономикой и магазином на золотых монетах.',
    code: DEFAULT_CODE.mod, author: 'AlexGold', authorAvatar: '🟡',
    date: '17.06.2026', downloads: 873,
  },
  {
    id: '3', name: 'HardCore Config', type: 'config', format: 'txt',
    description: 'Конфиг сложного выживания для PvP-сервера.',
    code: DEFAULT_CODE.config, author: 'B1ackYT', authorAvatar: '⭐',
    date: '19.06.2026', downloads: 2031,
  },
];

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [resources, setResources] = useState<Resource[]>(SEED);
  const [authOpen, setAuthOpen] = useState(false);

  const [name, setName] = useState('');
  const [type, setType] = useState<ResourceType>('plugin');
  const [format, setFormat] = useState<FileFormat>('jar');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState(DEFAULT_CODE.plugin);

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState<'generate' | 'improve' | null>(null);
  const [aiError, setAiError] = useState('');

  const askAi = async (mode: 'generate' | 'improve') => {
    setAiError('');
    if (mode === 'generate' && !aiPrompt.trim()) {
      setAiError('Опиши, какой ресурс нужен');
      return;
    }
    setAiLoading(mode);
    try {
      const resp = await fetch(AI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, type, format, prompt: aiPrompt, code }),
      });
      const data = await resp.json();
      if (data.code) setCode(data.code);
      else setAiError(data.error || 'Не удалось получить ответ ИИ');
    } catch {
      setAiError('Ошибка соединения с ИИ');
    } finally {
      setAiLoading(null);
    }
  };

  useEffect(() => {
    const u = localStorage.getItem('br_user');
    const r = localStorage.getItem('br_resources');
    if (u) setUser(JSON.parse(u));
    if (r) setResources(JSON.parse(r));
  }, []);

  useEffect(() => {
    localStorage.setItem('br_resources', JSON.stringify(resources));
  }, [resources]);

  const login = (provider: 'google' | 'telegram') => {
    const u: User = {
      name: provider === 'google' ? 'Игрок Google' : 'Игрок Telegram',
      avatar: provider === 'google' ? '🔴' : '🔵',
      provider,
    };
    setUser(u);
    localStorage.setItem('br_user', JSON.stringify(u));
    setAuthOpen(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('br_user');
  };

  const chooseType = (t: ResourceType) => {
    setType(t);
    setCode(DEFAULT_CODE[t]);
    setFormat(t === 'config' ? 'txt' : t === 'mod' ? 'zip' : 'jar');
  };

  const publish = () => {
    if (!user) { setAuthOpen(true); return; }
    if (!name.trim()) return;
    const res: Resource = {
      id: Date.now().toString(),
      name: name.trim(), type, format, description: description.trim() || 'Без описания',
      code, author: user.name, authorAvatar: user.avatar,
      date: new Date().toLocaleDateString('ru-RU'), downloads: 0,
    };
    setResources([res, ...resources]);
    setName(''); setDescription('');
  };

  const download = (res: Resource) => {
    const blob = new Blob([res.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${res.name.replace(/\s+/g, '_')}.${res.format}`;
    a.click();
    URL.revokeObjectURL(url);
    setResources(resources.map(r => r.id === res.id ? { ...r, downloads: r.downloads + 1 } : r));
  };

  return (
    <div className="min-h-screen relative font-body">
      <div className="fixed inset-0 -z-10">
        <img src={BG} alt="" className="w-full h-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/85 to-background" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 backdrop-blur-md bg-background/70">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-gradient-to-br from-gold to-accent flex items-center justify-center pixel-border">
              <Icon name="Pickaxe" size={22} className="text-background" />
            </div>
            <div className="leading-tight">
              <div className="font-display font-bold text-lg tracking-wide text-gradient-gold uppercase">Быстрое Решение</div>
              <div className="text-[11px] text-muted-foreground font-mono">minecraft · plugins & mods</div>
            </div>
          </div>
          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden sm:flex items-center gap-2 text-sm">
                <span className="text-lg">{user.avatar}</span>{user.name}
              </span>
              <Button variant="outline" size="sm" onClick={logout}>
                <Icon name="LogOut" size={16} className="mr-1" />Выйти
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => setAuthOpen(true)} className="font-display uppercase tracking-wide">
              <Icon name="LogIn" size={16} className="mr-1" />Войти
            </Button>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="container py-16 md:py-24 text-center animate-fade-in">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold/40 bg-gold/10 text-gold text-xs font-mono mb-6">
          <span className="w-2 h-2 rounded-full bg-accent animate-blink" />
          Сервер онлайн · {resources.length} ресурсов
        </div>
        <h1 className="font-display font-bold uppercase text-5xl md:text-7xl tracking-tight leading-none mb-6">
          Создавай <span className="text-gradient-gold">плагины</span>,<br />
          моды и <span className="text-accent">конфиги</span>
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto text-lg mb-8">
          Конструктор ресурсов для Minecraft-сервера. Пиши код в мини-консоли и скачивай в форматах .jar, .zip и .txt.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <a href="#create">
            <Button size="lg" className="font-display uppercase tracking-wide animate-glow">
              <Icon name="Hammer" size={18} className="mr-2" />Создать ресурс
            </Button>
          </a>
          <a href="#catalog">
            <Button size="lg" variant="outline" className="font-display uppercase tracking-wide">
              <Icon name="LayoutGrid" size={18} className="mr-2" />Каталог
            </Button>
          </a>
        </div>
      </section>

      {/* Create + Console */}
      <section id="create" className="container pb-20">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="rounded-xl border border-border bg-card/80 backdrop-blur p-6 space-y-5">
            <h2 className="font-display uppercase text-2xl tracking-wide flex items-center gap-2">
              <Icon name="Wand2" size={22} className="text-gold" />Новый ресурс
            </h2>

            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(TYPE_META) as ResourceType[]).map(t => (
                <button key={t} onClick={() => chooseType(t)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-lg border transition-all ${
                    type === t ? 'border-gold bg-gold/10' : 'border-border bg-secondary/40 hover:border-gold/50'
                  }`}>
                  <Icon name={TYPE_META[t].icon} size={20} className={TYPE_META[t].color} />
                  <span className="text-xs font-medium">{TYPE_META[t].label}</span>
                </button>
              ))}
            </div>

            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">НАЗВАНИЕ</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Например, AutoBackup" />
            </div>

            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">ОПИСАНИЕ</label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Что делает ресурс?" rows={2} />
            </div>

            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">ФОРМАТ ФАЙЛА</label>
              <div className="flex gap-2">
                {(['jar', 'zip', 'txt'] as FileFormat[]).map(f => (
                  <button key={f} onClick={() => setFormat(f)}
                    className={`flex-1 py-2 rounded-lg border font-mono text-sm transition-all ${
                      format === f ? 'border-accent bg-accent/15 text-accent' : 'border-border bg-secondary/40 hover:border-accent/50'
                    }`}>.{f}</button>
                ))}
              </div>
            </div>

            <Button onClick={publish} className="w-full font-display uppercase tracking-wide" size="lg">
              <Icon name="Upload" size={18} className="mr-2" />Опубликовать
            </Button>
          </div>

          {/* Mini console + AI */}
          <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-gold/40 bg-gradient-to-br from-gold/10 to-accent/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold to-accent flex items-center justify-center">
                <Icon name="Sparkles" size={16} className="text-background" />
              </div>
              <div className="leading-tight">
                <div className="font-display uppercase tracking-wide text-sm">ИИ-ассистент</div>
                <div className="text-[11px] text-muted-foreground">создаст или улучшит код за тебя</div>
              </div>
            </div>
            <Textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} rows={2}
              placeholder="Например: плагин, который выдаёт золото за вход на сервер"
              className="bg-background/60 resize-none text-sm" />
            {aiError && <p className="text-xs text-destructive font-mono">{aiError}</p>}
            <div className="flex gap-2">
              <Button onClick={() => askAi('generate')} disabled={aiLoading !== null}
                className="flex-1 font-display uppercase tracking-wide" size="sm">
                <Icon name={aiLoading === 'generate' ? 'Loader2' : 'Wand2'} size={16}
                  className={`mr-1.5 ${aiLoading === 'generate' ? 'animate-spin' : ''}`} />
                {aiLoading === 'generate' ? 'Генерирую...' : 'Сгенерировать'}
              </Button>
              <Button onClick={() => askAi('improve')} disabled={aiLoading !== null} variant="outline"
                className="flex-1 font-display uppercase tracking-wide border-accent/50" size="sm">
                <Icon name={aiLoading === 'improve' ? 'Loader2' : 'TrendingUp'} size={16}
                  className={`mr-1.5 ${aiLoading === 'improve' ? 'animate-spin' : ''}`} />
                {aiLoading === 'improve' ? 'Улучшаю...' : 'Улучшить код'}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-[hsl(150_35%_5%)] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-secondary/40">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-destructive/80" />
                <span className="w-3 h-3 rounded-full bg-gold/80" />
                <span className="w-3 h-3 rounded-full bg-accent/80" />
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                {name || 'untitled'}.{format}
              </span>
              <Icon name="TerminalSquare" size={16} className="text-gold" />
            </div>
            <Textarea value={code} onChange={e => setCode(e.target.value)} spellCheck={false}
              className="flex-1 min-h-[340px] rounded-none border-0 bg-transparent font-mono text-sm text-accent/90 resize-none focus-visible:ring-0 scrollbar-thin leading-relaxed" />
            <div className="px-4 py-2 border-t border-border bg-secondary/30 font-mono text-[11px] text-muted-foreground flex items-center justify-between">
              <span>{code.split('\n').length} строк · {code.length} символов</span>
              <span className="text-accent flex items-center gap-1">
                <Icon name="Check" size={12} />синтаксис ок<span className="animate-blink">_</span>
              </span>
            </div>
          </div>
          </div>
        </div>
      </section>

      {/* Catalog */}
      <section id="catalog" className="container pb-20">
        <h2 className="font-display uppercase text-3xl tracking-wide mb-6 flex items-center gap-2">
          <Icon name="Boxes" size={26} className="text-gold" />Каталог ресурсов
        </h2>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {resources.map(res => {
            const meta = TYPE_META[res.type];
            return (
              <div key={res.id} className="rounded-xl border border-border bg-card/80 backdrop-blur p-5 flex flex-col hover:border-gold/50 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                      <Icon name={meta.icon} size={20} className={meta.color} />
                    </div>
                    <div>
                      <div className="font-display text-lg leading-tight">{res.name}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">{meta.label} · .{res.format}</div>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                    <Icon name="Download" size={12} />{res.downloads}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground flex-1 mb-4">{res.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs flex items-center gap-1.5">
                    <span>{res.authorAvatar}</span>{res.author}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => download(res)} className="font-mono">
                    <Icon name="Download" size={14} className="mr-1" />.{res.format}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Contributors */}
      <section className="container pb-20">
        <div className="rounded-xl border border-border bg-card/80 backdrop-blur p-6">
          <h2 className="font-display uppercase text-2xl tracking-wide mb-5 flex items-center gap-2">
            <Icon name="Users" size={22} className="text-gold" />Уже добавили свои плагины
          </h2>
          <div className="flex flex-wrap gap-3">
            {Array.from(new Map(resources.map(r => [r.author, r])).values()).map(r => (
              <div key={r.author} className="flex items-center gap-2 px-3 py-2 rounded-full border border-border bg-secondary/40">
                <span className="text-lg">{r.authorAvatar}</span>
                <span className="text-sm font-medium">{r.author}</span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {resources.filter(x => x.author === r.author).length} шт.
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-background/80 backdrop-blur">
        <div className="container py-10 text-center space-y-5">
          <a href="https://likee.video/@B1ackYT" target="_blank" rel="noreferrer">
            <Button size="lg" className="font-display uppercase tracking-wide animate-glow bg-gradient-to-r from-gold to-accent text-background hover:opacity-90">
              <Icon name="Heart" size={18} className="mr-2" />Подпишись на меня в Likee · @B1ackYT
            </Button>
          </a>
          <p className="text-xs text-muted-foreground font-mono">
            Быстрое Решение © 2026 · плагины, моды и конфиги для Minecraft
          </p>
        </div>
      </footer>

      {/* Auth modal */}
      {authOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setAuthOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-7 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 mx-auto rounded-xl bg-gradient-to-br from-gold to-accent flex items-center justify-center mb-4">
              <Icon name="ShieldCheck" size={28} className="text-background" />
            </div>
            <h3 className="font-display uppercase text-2xl tracking-wide mb-1">Вход</h3>
            <p className="text-sm text-muted-foreground mb-6">Авторизуйся, чтобы публиковать ресурсы</p>
            <div className="space-y-3">
              <Button onClick={() => login('google')} variant="outline" size="lg" className="w-full">
                <Icon name="Mail" size={18} className="mr-2 text-destructive" />Войти через Google
              </Button>
              <Button onClick={() => login('telegram')} variant="outline" size="lg" className="w-full">
                <Icon name="Send" size={18} className="mr-2 text-accent" />Войти через Telegram
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;