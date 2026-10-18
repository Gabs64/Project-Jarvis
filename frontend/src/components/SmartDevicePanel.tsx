import React, { useState, useEffect } from 'react';
import { Home, Lightbulb, Thermometer, Video, Power, Sliders, RefreshCw } from 'lucide-react';

interface DeviceItem {
  id: string;
  name: string;
  type: string;
  state: string;
  room: string;
  brightness?: number;
  temperature?: number;
  target_temperature?: number;
}

export const SmartDevicePanel: React.FC = () => {
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [integration, setIntegration] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/devices');
      const data = await res.json();
      setDevices(data.devices || []);
      setIntegration(data.integration || 'Local Smart Hub');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleToggle = async (deviceId: string, currentState: string) => {
    const nextState = currentState === 'on' ? 'off' : 'on';
    try {
      await fetch('/api/devices/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId, action: nextState })
      });
      fetchDevices();
    } catch (e) {
      console.error(e);
    }
  };

  const handleBrightnessChange = async (deviceId: string, val: number) => {
    try {
      await fetch('/api/devices/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId, action: 'on', brightness: val })
      });
      fetchDevices();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20">
        <div>
          <div className="flex items-center gap-2">
            <Home className="w-5 h-5 text-cyan-400" />
            <h2 className="hud-font font-bold text-lg text-cyan-200">
              SMART ENVIRONMENT & IOT HUB
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Active Adapter: <span className="text-cyan-300 font-semibold">{integration}</span>
          </p>
        </div>

        <button
          onClick={fetchDevices}
          className="btn-jarvis text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          SCAN NETWORK
        </button>
      </div>

      {/* Devices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {devices.map((dev) => (
          <div
            key={dev.id}
            className={`p-5 rounded-xl border transition-all shadow-lg ${
              dev.state === 'on' || dev.state === 'streaming'
                ? 'bg-[#0E1724]/90 border-cyan-500/40 shadow-[0_0_20px_rgba(92,200,255,0.1)]'
                : 'bg-[#090D14]/90 border-slate-800 opacity-80'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${
                  dev.state === 'on' || dev.state === 'streaming'
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                    : 'bg-slate-800 text-slate-500'
                }`}>
                  {dev.type === 'light' && <Lightbulb className="w-4 h-4" />}
                  {dev.type === 'climate' && <Thermometer className="w-4 h-4" />}
                  {dev.type === 'camera' && <Video className="w-4 h-4" />}
                  {dev.type === 'switch' && <Power className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">{dev.name}</h3>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wide">{dev.room}</span>
                </div>
              </div>

              {dev.type !== 'camera' && (
                <button
                  onClick={() => handleToggle(dev.id, dev.state)}
                  className={`p-2 rounded-lg border transition-all ${
                    dev.state === 'on'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(92,200,255,0.4)]'
                      : 'bg-slate-800 border-slate-700 text-slate-500'
                  }`}
                  title="Toggle State"
                >
                  <Power className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Special controls based on device type */}
            {dev.type === 'light' && dev.brightness !== undefined && (
              <div className="mt-4 pt-3 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                  <span className="flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5" /> Brightness
                  </span>
                  <span className="mono-font text-cyan-300 font-bold">{dev.brightness}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={dev.brightness}
                  onChange={(e) => handleBrightnessChange(dev.id, Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
            )}

            {dev.type === 'climate' && (
              <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">CURRENT</span>
                  <span className="text-base font-bold text-slate-200">{dev.temperature}°C</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[10px]">TARGET</span>
                  <span className="text-base font-bold text-cyan-300">{dev.target_temperature}°C</span>
                </div>
              </div>
            )}

            {dev.type === 'camera' && (
              <div className="mt-3 pt-3 border-t border-slate-800/80">
                <div className="w-full h-24 rounded-lg bg-black/60 border border-slate-800 flex flex-col items-center justify-center text-slate-500 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-400 mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="font-bold text-[10px] tracking-wider">LIVE FEED SECURE</span>
                  </div>
                  <span className="text-[10px] text-slate-600">Motion Detection: Inactive</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
