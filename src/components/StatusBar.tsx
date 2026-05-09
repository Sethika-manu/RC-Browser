import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Cpu, MemoryStick, Wifi, Zap } from "lucide-react";

interface Metrics {
  cpu: number;
  ram: number;
  ping: number;
}

export const StatusBar = () => {
  const [metrics, setMetrics] = useState<Metrics>({
    cpu: 0,
    ram: 0,
    ping: 0
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await invoke<Metrics>("get_system_metrics");
        setMetrics(data);
      } catch (err) {
        console.error("Failed to fetch metrics:", err);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-6 bg-background border-t border-border flex items-center justify-between px-3 select-none">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 group cursor-help">
          <Cpu size={12} className="text-accent" />
          <span className="text-[10px] font-mono text-neutral-400">CPU: <span className="text-neutral-200">{metrics.cpu.toFixed(1)}%</span></span>
        </div>
        <div className="flex items-center gap-1.5 group cursor-help">
          <MemoryStick size={12} className="text-emerald-500" />
          <span className="text-[10px] font-mono text-neutral-400">RAM: <span className="text-neutral-200">{metrics.ram}MB</span></span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Wifi size={12} className="text-neutral-500" />
          <span className="text-[10px] font-mono text-neutral-400">ping: <span className="text-neutral-200">{metrics.ping}ms</span></span>
        </div>
        <div className="flex items-center gap-1.5 bg-accent/10 px-2 py-0.5 rounded border border-accent/20">
          <Zap size={10} className="text-accent fill-accent" />
          <span className="text-[10px] font-bold text-accent tracking-tighter">OPTIMIZED</span>
        </div>
      </div>
    </div>
  );
};
