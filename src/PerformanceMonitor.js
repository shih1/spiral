import React, { useState, useEffect, useRef } from 'react';
import { Activity, X } from 'lucide-react';

const PerformanceMonitor = () => {
  const [metrics, setMetrics] = useState({
    fps: 0,
    cls: null,
    fid: null,
    fcp: null,
    lcp: null,
    ttfb: null,
    renderTime: 0,
  });
  const [isMinimized, setIsMinimized] = useState(false);
  const [history, setHistory] = useState([]);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const renderStart = useRef(0);

  // FPS Counter
  useEffect(() => {
    const measureFPS = () => {
      frameCount.current++;
      const now = performance.now();
      const delta = now - lastTime.current;

      if (delta >= 1000) {
        const fps = Math.round((frameCount.current * 1000) / delta);
        setMetrics((prev) => ({ ...prev, fps }));
        setHistory((prev) => [...prev.slice(-29), { time: Date.now(), fps }]);
        frameCount.current = 0;
        lastTime.current = now;
      }

      requestAnimationFrame(measureFPS);
    };

    const rafId = requestAnimationFrame(measureFPS);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Render time tracker
  useEffect(() => {
    renderStart.current = performance.now();
    return () => {
      const renderTime = performance.now() - renderStart.current;
      setMetrics((prev) => ({ ...prev, renderTime: renderTime.toFixed(2) }));
    };
  });

  // Web Vitals collection
  useEffect(() => {
    if ('web-vitals' in window) return;

    const collectMetric = (metric) => {
      setMetrics((prev) => ({
        ...prev,
        [metric.name.toLowerCase()]: metric.value.toFixed(2),
      }));
    };

    // Import web-vitals dynamically
    import('web-vitals')
      .then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getCLS(collectMetric);
        getFID(collectMetric);
        getFCP(collectMetric);
        getLCP(collectMetric);
        getTTFB(collectMetric);
      })
      .catch((err) => console.log('Web vitals not available:', err));
  }, []);

  const getColor = (fps) => {
    if (fps >= 55) return 'text-green-400';
    if (fps >= 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (isMinimized) {
    return (
      <div className="fixed top-20 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="p-2 bg-gray-800/90 backdrop-blur rounded-lg text-white hover:bg-gray-700 transition-colors border border-gray-600 shadow-lg"
        >
          <Activity size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-20 right-4 w-80 bg-gray-900/95 backdrop-blur border border-gray-700 rounded-lg shadow-2xl z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gray-800/50 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-blue-400" />
          <h3 className="text-sm font-semibold text-white">Performance Monitor</h3>
        </div>
        <button
          onClick={() => setIsMinimized(true)}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
        >
          <X size={16} className="text-gray-400" />
        </button>
      </div>

      {/* Metrics */}
      <div className="p-3 space-y-2">
        {/* FPS - Most Important */}
        <div className="bg-gray-800/50 rounded p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">FPS</span>
            <span className={`text-lg font-bold ${getColor(metrics.fps)}`}>{metrics.fps}</span>
          </div>
          {/* Mini FPS Graph */}
          <div className="h-8 flex items-end gap-0.5">
            {history.map((h, i) => (
              <div
                key={i}
                className={`flex-1 ${getColor(h.fps)} bg-current opacity-50`}
                style={{ height: `${(h.fps / 60) * 100}%` }}
              />
            ))}
          </div>
        </div>

        {/* Render Time */}
        <MetricRow
          label="Render Time"
          value={`${metrics.renderTime}ms`}
          warning={parseFloat(metrics.renderTime) > 16}
        />

        {/* Web Vitals */}
        <div className="text-xs text-gray-500 font-semibold mt-3 mb-1">Core Web Vitals</div>

        <MetricRow
          label="CLS (Cumulative Layout Shift)"
          value={metrics.cls || 'measuring...'}
          info="< 0.1 is good"
        />
        <MetricRow
          label="FID (First Input Delay)"
          value={metrics.fid ? `${metrics.fid}ms` : 'measuring...'}
          info="< 100ms is good"
        />
        <MetricRow
          label="FCP (First Contentful Paint)"
          value={metrics.fcp ? `${metrics.fcp}ms` : 'measuring...'}
          info="< 1800ms is good"
        />
        <MetricRow
          label="LCP (Largest Contentful Paint)"
          value={metrics.lcp ? `${metrics.lcp}ms` : 'measuring...'}
          info="< 2500ms is good"
        />
        <MetricRow
          label="TTFB (Time to First Byte)"
          value={metrics.ttfb ? `${metrics.ttfb}ms` : 'measuring...'}
          info="< 800ms is good"
        />
      </div>

      {/* Performance Tips */}
      {metrics.fps < 30 && (
        <div className="p-3 bg-red-900/20 border-t border-red-800/30">
          <p className="text-xs text-red-300">
            ⚠️ Low FPS detected! Check fade animations and state updates.
          </p>
        </div>
      )}
    </div>
  );
};

const MetricRow = ({ label, value, info, warning }) => (
  <div className="flex items-center justify-between text-xs bg-gray-800/30 rounded p-2">
    <div>
      <div className={`${warning ? 'text-yellow-400' : 'text-gray-300'}`}>{label}</div>
      {info && <div className="text-gray-500 text-[10px]">{info}</div>}
    </div>
    <span className={`font-mono ${warning ? 'text-yellow-400' : 'text-blue-400'}`}>{value}</span>
  </div>
);

export default PerformanceMonitor;
