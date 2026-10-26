import React, { useEffect, useState, useRef } from 'react';
import { useSession } from '../store/sessionContext';
import { fetchOutbreakClusters } from '../lib/api';
import { OutbreakCluster } from '../types';
import {
  Map as MapIcon,
  AlertTriangle,
  ShieldAlert,
  Calendar,
  CheckSquare,
  Info,
  Radio,
} from 'lucide-react';
import L from 'leaflet';

export const OutbreakMapScreen: React.FC = () => {
  const { t, selectedSpecies } = useSession();

  const [days, setDays] = useState(30);
  const [clusters, setClusters] = useState<OutbreakCluster[]>([]);
  const [totalCases, setTotalCases] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedCluster, setSelectedCluster] = useState<OutbreakCluster | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerLayerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    async function loadClusters() {
      setLoading(true);
      try {
        const res = await fetchOutbreakClusters(days, selectedSpecies?.id);
        setClusters(res.clusters);
        setTotalCases(res.total);
        if (res.clusters.length > 0 && !selectedCluster) {
          setSelectedCluster(res.clusters[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadClusters();
  }, [days, selectedSpecies]);

  // Leaflet Map Init
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [-0.6817, 34.7667],
        zoom: 9,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      markerLayerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !markerLayerGroupRef.current) return;

    markerLayerGroupRef.current.clearLayers();

    clusters.forEach((cluster) => {
      const lat = cluster.latitude || -0.68;
      const lng = cluster.longitude || 34.77;
      const radius = Math.min(Math.max(cluster.animalsAffected * 250, 4000), 16000);
      const color = cluster.animalsDead > 0 ? '#dc2626' : '#ea580c';

      const circle = L.circle([lat, lng], {
        color: color,
        fillColor: color,
        fillOpacity: 0.35,
        radius: radius,
        weight: 2,
      });

      circle.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
          <strong style="font-size: 13px; color: #111;">${cluster.county || 'Western Area'} Cluster</strong><br/>
          <strong>${cluster.animalsAffected}</strong> animals sick, <strong>${cluster.animalsDead}</strong> dead<br/>
          <span style="color: #666;">Top sign: ${cluster.symptoms[0]?.nameEn || 'Fever'}</span><br/>
          <em style="color: #999; font-size: 10px;">Simulated outbreak cluster</em>
        </div>
      `);

      circle.on('click', () => {
        setSelectedCluster(cluster);
      });

      circle.addTo(markerLayerGroupRef.current!);
    });
  }, [clusters]);

  return (
    <div className="space-y-4 pb-12">
      {/* 1. Mandatory Simulated Data Banner */}
      <div className="bg-purple-950 text-white px-5 py-3 rounded-2xl flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <Info className="w-5 h-5 text-purple-300 flex-shrink-0" />
          <span className="text-xs sm:text-sm font-bold">{t.simulatedBanner}</span>
        </div>
        <span className="bg-purple-800 text-[10px] uppercase font-black tracking-wider px-2.5 py-1 rounded-full">
          Demo Simulation
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Map & Controls */}
        <div className="lg:col-span-8 space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-purple-600 animate-pulse" />
              <span className="text-xs font-black text-gray-900">
                Active Outbreak Surveillance • {totalCases} Cases Logged
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-bold text-gray-500 mr-1">Time Horizon:</span>
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    days === d
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {d} Days
                </button>
              ))}
            </div>
          </div>

          {/* Leaflet Map */}
          <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xs relative">
            <div
              ref={mapContainerRef}
              className="w-full h-[400px] sm:h-[480px] z-10"
              style={{ minHeight: '380px' }}
            />
            {loading && (
              <div className="absolute inset-0 bg-white/70 z-20 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Hotspot Details & Biosecurity Checklist */}
        <div className="lg:col-span-4 space-y-4">
          {selectedCluster && (
            <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-3">
              <div className="flex items-start justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    {selectedCluster.county || 'Local Area'} Hotspot
                  </h3>
                  <p className="text-xs text-gray-500">
                    {selectedCluster.reportCount} reports in last {days} days
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-red-600 block">
                    {selectedCluster.animalsAffected} Sick
                  </span>
                  {selectedCluster.animalsDead > 0 && (
                    <span className="text-xs font-bold text-gray-400">
                      ({selectedCluster.animalsDead} Dead)
                    </span>
                  )}
                </div>
              </div>

              {/* Predominant Symptoms */}
              <div>
                <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wide block mb-2">
                  Observed Clinical Symptoms
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCluster.symptoms.map((s) => (
                    <span
                      key={s.key}
                      className="bg-red-50 text-red-800 border border-red-200 text-xs font-bold px-2.5 py-1 rounded-full"
                    >
                      {s.nameEn} ({s.count})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Standard Biosecurity Checklist */}
          <div className="bg-amber-50 border border-amber-300 rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-700" />
              <h4 className="text-xs font-black text-amber-950 uppercase tracking-wide">
                {t.quarantineChecklist} (Advisory)
              </h4>
            </div>
            <ul className="space-y-2 text-xs text-amber-950 font-medium">
              <li className="flex items-start gap-2">
                <CheckSquare className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
                <span>Immediately isolate animals displaying fever or lesions.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckSquare className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
                <span>Restrict animal sales, purchases and livestock transport.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckSquare className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
                <span>Notify the sub-county veterinary director immediately.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckSquare className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
                <span>Maintain footbaths with disinfectant at barn entrances.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
