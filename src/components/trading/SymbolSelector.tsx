'use client';
import { useState } from 'react';
import { Search, X, CheckSquare, Square, ChevronRight } from 'lucide-react';
import { useTradingStore } from '@/store/trading-store';

interface SymbolSelectorProps {
  onClose: () => void;
}

export default function SymbolSelector({ onClose }: SymbolSelectorProps) {
  const { symbols, selectedSymbols, toggleSymbol } = useTradingStore();
  const [search, setSearch] = useState('');
  const [activeMarket, setActiveMarket] = useState<string | null>(null);

  const markets = Array.from(new Set(symbols.map(s => s.market_display_name))).sort();

  const filtered = symbols.filter(s => {
    const matchSearch = !search ||
      s.display_name.toLowerCase().includes(search.toLowerCase()) ||
      s.symbol.toLowerCase().includes(search.toLowerCase());
    const matchMarket = !activeMarket || s.market_display_name === activeMarket;
    return matchSearch && matchMarket && !s.is_trading_suspended;
  });

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#e8f0fe' }}>Select Markets</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: '#8098b8' }}>{selectedSymbols.length}/6 selected</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8098b8' }}>
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={14} color="#3d5270" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search symbols…"
          style={{
            width: '100%', padding: '9px 12px 9px 34px',
            background: '#0f1520', border: '1px solid #1e2d45',
            borderRadius: 8, color: '#e8f0fe', fontSize: 13, outline: 'none',
          }}
        />
      </div>

      {/* Market filter chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        <button
          onClick={() => setActiveMarket(null)}
          style={{
            padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600,
            background: !activeMarket ? '#00c2ff22' : '#131a27',
            border: `1px solid ${!activeMarket ? '#00c2ff55' : '#1e2d45'}`,
            color: !activeMarket ? '#00c2ff' : '#8098b8',
            cursor: 'pointer',
          }}
        >All</button>
        {markets.slice(0, 8).map(m => (
          <button
            key={m}
            onClick={() => setActiveMarket(m === activeMarket ? null : m)}
            style={{
              padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600,
              background: activeMarket === m ? '#00c2ff22' : '#131a27',
              border: `1px solid ${activeMarket === m ? '#00c2ff55' : '#1e2d45'}`,
              color: activeMarket === m ? '#00c2ff' : '#8098b8',
              cursor: 'pointer',
            }}
          >{m}</button>
        ))}
      </div>

      {/* Symbol list */}
      <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {filtered.slice(0, 60).map(sym => {
          const selected = selectedSymbols.includes(sym.symbol);
          const canSelect = selected || selectedSymbols.length < 6;

          return (
            <button
              key={sym.symbol}
              onClick={() => canSelect && toggleSymbol(sym.symbol)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8,
                background: selected ? '#00c2ff0a' : 'transparent',
                border: `1px solid ${selected ? '#00c2ff33' : 'transparent'}`,
                cursor: canSelect ? 'pointer' : 'not-allowed',
                opacity: !canSelect && !selected ? 0.4 : 1,
                textAlign: 'left', width: '100%',
              }}
            >
              <span style={{ color: selected ? '#00c2ff' : '#3d5270', flexShrink: 0 }}>
                {selected ? <CheckSquare size={15} /> : <Square size={15} />}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#e8f0fe' }}>{sym.display_name}</p>
                <p style={{ margin: 0, fontSize: 10, color: '#3d5270', fontFamily: 'JetBrains Mono, monospace' }}>{sym.symbol}</p>
              </div>
              <span style={{ fontSize: 10, color: '#3d5270' }}>{sym.market_display_name}</span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#3d5270', fontSize: 13 }}>
            No symbols found
          </div>
        )}
      </div>
    </div>
  );
}
