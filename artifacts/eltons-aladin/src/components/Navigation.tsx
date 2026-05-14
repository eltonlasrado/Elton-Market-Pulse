import { Link } from 'wouter';

const Navigation = () => {
  const navItems = [
    { href: '/live', label: 'Live Trading', icon: '🔴' },
    { href: '/', label: 'Dashboard', icon: '📊' },
    { href: '/stock-analyzer', label: 'Stock Analyzer', icon: '🔍' },
    { href: '/option-chain', label: 'Options', icon: '⛓' },
    { href: '/signals', label: 'Signals', icon: '📡' },
    { href: '/ai-bot-llm', label: 'Bot LLM', icon: '🤖' },
    { href: '/bot-portfolio', label: 'Bots', icon: '🎖️' },
    { href: '/ai-brain', label: 'AI Brain', icon: '🧠' },
  ];

  return (
    <nav className="border-b border-[rgba(0,255,180,0.1)] bg-[rgba(0,0,0,0.3)] backdrop-blur-sm">
      <div className="max-w-[1800px] mx-auto px-4 py-2">
        <div className="flex items-center justify-between overflow-x-auto">
          <Link href="/live" className="font-bold text-[10px] gradient-text tracking-wider mr-4 whitespace-nowrap">
            ⚡ ALADIN v5.1 LIVE
          </Link>
          <div className="flex gap-2 overflow-x-auto">
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 text-[8px] font-bold rounded border border-[rgba(0,255,180,0.2)] text-[hsl(180,40%,75%)] hover:border-[rgba(0,255,180,0.5)] hover:text-[hsl(180,100%,50%)] transition-all whitespace-nowrap"
              >
                {item.icon} {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
