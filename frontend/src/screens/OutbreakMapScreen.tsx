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
  Maximize2,
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export const SPECIES_FILTER_TABS = [
  { id: null, name: 'All Animals', icon: '🌐', subtitle: 'National Epizootic Surveillance' },
  { id: 1, slug: 'dairy-cattle', name: 'Dairy Cattle', icon: '🐄', subtitle: 'FMD, Anthrax, ECF, LSD' },
  { id: 2, slug: 'goats', name: 'Goats', icon: '🐐', subtitle: 'CCPP, PPR, Goat Pox' },
  { id: 3, slug: 'sheep', name: 'Sheep', icon: '🐑', subtitle: 'PPR, Sheep Pox, Blue Tongue' },
  { id: 4, slug: 'poultry', name: 'Poultry', icon: '🐔', subtitle: 'Newcastle, Gumboro, Avian Flu' },
];

export const OutbreakMapScreen: React.FC = () => {
  const { t, selectedSpecies } = useSession();

  const [days, setDays] = useState(30);
  const [activeSpeciesId, setActiveSpeciesId] = useState<number | null>(selectedSpecies?.id ?? null);
  const [clusters, setClusters] = useState<OutbreakCluster[]>([]);
  const [totalCases, setTotalCases] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedCluster, setSelectedCluster] = useState<OutbreakCluster | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const outerRingLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const currentOuterRingClusterIdRef = useRef<string | null>(null);

  const getSpreadMetrics = (cluster: OutbreakCluster) => {
    const focalRadius = Math.min(Math.max(cluster.animalsAffected * 250, 4000), 16000); // 4km - 16km
    const biggestSpreadRadius = Math.min(Math.max(cluster.animalsAffected * 750, 15000), 45000); // 15km - 45km
    return { focalRadius, biggestSpreadRadius };
  };

  const buildClusterPopupHtml = (
    cluster: OutbreakCluster,
    focalRadius: number,
    biggestSpreadRadius: number
  ) => {
    const speciesEmojiMap: Record<string, string> = {
      'dairy-cattle': '🐄',
      'cattle': '🐄',
      'goats': '🐐',
      'goat': '🐐',
      'sheep': '🐑',
      'poultry': '🐔',
      'chicken': '🐔',
    };

    const speciesBreakdownHtml = (cluster.species || [])
      .map((sp) => {
        const icon = speciesEmojiMap[sp.slug] || '🐾';
        const affected = sp.affected !== undefined ? sp.affected : cluster.animalsAffected;
        const dead = sp.dead !== undefined ? sp.dead : 0;
        return `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 4px 7px; margin: 2px 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 11px;">
            <div style="display: flex; align-items: center; gap: 5px;">
              <span style="font-size: 13px;">${icon}</span>
              <strong style="color: #1e293b;">${sp.name}</strong>
            </div>
            <div style="text-align: right;">
              <span style="color: #dc2626; font-weight: 800;">${affected} sick</span>
              ${dead > 0 ? `<span style="color: #64748b; font-size: 10px; margin-left: 3px;">(${dead} dead)</span>` : ''}
            </div>
          </div>
        `;
      })
      .join('');

    return `
      <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 12px; line-height: 1.4; min-width: 240px; max-width: 320px; color: #0f172a;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0;">
          <strong style="font-size: 13px; color: #0f172a;">${cluster.county || 'Western Area'} Outbreak Zone</strong>
          <span style="background: #f3e8ff; color: #6b21a8; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 9999px;">
            ${(biggestSpreadRadius / 1000).toFixed(1)} km Spread
          </span>
        </div>

        <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 6px; background: #fef2f2; padding: 4px 8px; border-radius: 6px; border: 1px solid #fee2e2;">
          <span style="font-size: 11px; font-weight: 700; color: #991b1b; text-transform: uppercase;">Total Affected:</span>
          <span style="font-size: 12px; font-weight: 900; color: #b91c1c;">
            ${cluster.animalsAffected} sick ${cluster.animalsDead > 0 ? `(${cluster.animalsDead} dead)` : ''}
          </span>
        </div>

        <div style="margin-bottom: 6px;">
          <span style="font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.04em; display: block; margin-bottom: 3px;">
            Animal Type Breakdown:
          </span>
          ${speciesBreakdownHtml || `<div style="font-size: 11px; color: #64748b;">${cluster.animalsAffected} sick</div>`}
        </div>

        <div style="margin-bottom: 6px; font-size: 11px; color: #475569;">
          <strong style="color: #1e293b;">Top Clinical Sign:</strong> ${cluster.symptoms[0]?.nameEn || 'Fever / Systemic Infection'}
        </div>

        <div style="padding: 6px 8px; background: #faf5ff; border: 1px dashed #c084fc; border-radius: 8px;">
          <div style="color: #581c87; font-weight: 800; font-size: 11px;">
            🚨 Radius of Spread: ${(biggestSpreadRadius / 1000).toFixed(1)} km
          </div>
          <div style="color: #7e22ce; font-size: 10px; margin-top: 2px;">
            Focal Epicenter: ${(focalRadius / 1000).toFixed(1)} km (Active Zone)
          </div>
        </div>
      </div>
    `;
  };

  const openClusterPopup = (cluster: OutbreakCluster, latlng?: L.LatLngExpression) => {
    if (!mapInstanceRef.current) return;
    const lat = cluster.latitude || -0.68;
    const lng = cluster.longitude || 34.77;
    const target = latlng || [lat, lng];
    const { focalRadius, biggestSpreadRadius } = getSpreadMetrics(cluster);
    const html = buildClusterPopupHtml(cluster, focalRadius, biggestSpreadRadius);

    L.popup({
      minWidth: 250,
      maxWidth: 320,
      autoClose: false,
      closeOnClick: false,
      autoPan: true,
      className: 'outbreak-cluster-popup',
    })
      .setLatLng(target)
      .setContent(html)
      .openOn(mapInstanceRef.current);
  };

  const createOuterRingCircle = (cluster: OutbreakCluster): L.Circle => {
    const lat = cluster.latitude || -0.68;
    const lng = cluster.longitude || 34.77;
    const { focalRadius, biggestSpreadRadius } = getSpreadMetrics(cluster);

    const outerCircle = L.circle([lat, lng], {
      pane: 'outbreakZonePane',
      color: '#7c3aed',
      fillColor: '#9333ea',
      fillOpacity: 0.12,
      radius: biggestSpreadRadius,
      weight: 2,
      dashArray: '6, 8',
      interactive: true,
    });

    outerCircle.bindTooltip(`🚨 Outbreak Spread Zone: ${(biggestSpreadRadius / 1000).toFixed(1)} km (Click to view details)`, {
      permanent: false,
      direction: 'top',
      className: 'bg-purple-900 text-white text-xs font-bold px-2 py-1 rounded-md shadow',
    });

    outerCircle.on('click', (e: L.LeafletMouseEvent) => {
      setSelectedCluster(cluster);
      openClusterPopup(cluster, e.latlng);
    });

    return outerCircle;
  };

  const focusSpreadRadius = (cluster: OutbreakCluster, openPopupAfterFly: boolean = true) => {
    setSelectedCluster(cluster);
    if (!mapInstanceRef.current || !outerRingLayerGroupRef.current) return;

    const lat = cluster.latitude || -0.68;
    const lng = cluster.longitude || 34.77;
    const clusterKey = `${lat}_${lng}_${cluster.reportCount}`;

    currentOuterRingClusterIdRef.current = clusterKey;
    outerRingLayerGroupRef.current.clearLayers();

    const outerCircle = createOuterRingCircle(cluster);
    outerCircle.addTo(outerRingLayerGroupRef.current);

    mapInstanceRef.current.flyToBounds(outerCircle.getBounds(), {
      padding: [45, 45],
      maxZoom: 11,
      duration: 0.8,
    });

    if (openPopupAfterFly) {
      mapInstanceRef.current.once('moveend', () => {
        openClusterPopup(cluster, [lat, lng]);
      });
    }
  };

  const handleFocusLargestSpread = () => {
    if (clusters.length === 0) return;
    const largest = clusters.reduce(
      (max, c) => (c.animalsAffected > (max?.animalsAffected || 0) ? c : max),
      clusters[0]
    );
    focusSpreadRadius(largest, true);
  };

  useEffect(() => {
    async function loadClusters() {
      setLoading(true);
      try {
        const res = await fetchOutbreakClusters(days, activeSpeciesId || undefined);
        setClusters(res.clusters);
        setTotalCases(res.total);
        currentOuterRingClusterIdRef.current = null;
        if (res.clusters.length > 0) {
          setSelectedCluster(res.clusters[0]);
        } else {
          setSelectedCluster(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadClusters();
  }, [days, activeSpeciesId]);

  // Leaflet Map Init
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [-0.6817, 34.7667],
        zoom: 9,
        zoomControl: true,
      });

      // Dedicated pane for mapped outbreak quarantine ring
      // Keeping it at zIndex 350 ensures the focal center circles (overlayPane zIndex 400) remain easily clickable
      if (!map.getPane('outbreakZonePane')) {
        map.createPane('outbreakZonePane');
        const zonePane = map.getPane('outbreakZonePane');
        if (zonePane) {
          zonePane.style.zIndex = '350';
        }
      }

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      outerRingLayerGroupRef.current = L.layerGroup().addTo(map);
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
      const { focalRadius } = getSpreadMetrics(cluster);
      const color = cluster.animalsDead > 0 ? '#dc2626' : '#ea580c';

      const circle = L.circle([lat, lng], {
        color: color,
        fillColor: color,
        fillOpacity: 0.45,
        radius: focalRadius,
        weight: 2.5,
        interactive: true,
      });

      circle.bindTooltip(`📍 ${cluster.county || 'Local Area'} Outbreak (${cluster.animalsAffected} sick) • Click to view details`, {
        direction: 'top',
        className: 'bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded-md shadow',
      });

      circle.on('click', (e: L.LeafletMouseEvent) => {
        setSelectedCluster(cluster);
        openClusterPopup(cluster, e.latlng);
      });

      circle.addTo(markerLayerGroupRef.current!);
    });

    // Automatically display popup for the top cluster on initial load
    if (clusters.length > 0 && mapInstanceRef.current) {
      const first = clusters[0];
      const initialLat = first.latitude || -0.68;
      const initialLng = first.longitude || 34.77;
      const timer = setTimeout(() => {
        openClusterPopup(first, [initialLat, initialLng]);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [clusters]);

  // Sync outer ring when selectedCluster updates
  useEffect(() => {
    if (selectedCluster && mapInstanceRef.current && outerRingLayerGroupRef.current) {
      const lat = selectedCluster.latitude || -0.68;
      const lng = selectedCluster.longitude || 34.77;
      const clusterKey = `${lat}_${lng}_${selectedCluster.reportCount}`;

      if (currentOuterRingClusterIdRef.current === clusterKey) {
        return;
      }

      currentOuterRingClusterIdRef.current = clusterKey;
      outerRingLayerGroupRef.current.clearLayers();
      const outerCircle = createOuterRingCircle(selectedCluster);
      outerCircle.addTo(outerRingLayerGroupRef.current);
    }
  }, [selectedCluster]);

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

      {/* 2. Specific Animal Outbreak Zone Filter Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-purple-700" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
              Select Animal Species to Check Outbreak Zones
            </h3>
          </div>
          <span className="text-[11px] font-bold text-purple-800 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
            {activeSpeciesId === null
              ? 'All Epizootic Outbreaks'
              : `${SPECIES_FILTER_TABS.find((s) => s.id === activeSpeciesId)?.name} Only`}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {SPECIES_FILTER_TABS.map((tab) => {
            const isActive = activeSpeciesId === tab.id;
            return (
              <button
                key={String(tab.id)}
                type="button"
                onClick={() => setActiveSpeciesId(tab.id)}
                className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                  isActive
                    ? 'bg-purple-900 text-white border-purple-900 shadow-xs ring-2 ring-purple-600/30'
                    : 'bg-slate-50 hover:bg-purple-50/60 border-slate-200 text-slate-800'
                }`}
              >
                <span className="text-xl flex-shrink-0">{tab.icon}</span>
                <div className="min-w-0">
                  <span className={`text-xs font-black block truncate ${isActive ? 'text-white' : 'text-slate-900'}`}>
                    {tab.name}
                  </span>
                  <span className={`text-[9px] block truncate ${isActive ? 'text-purple-200' : 'text-slate-400'}`}>
                    {tab.subtitle}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Interactive Map & Controls */}
        <div className="lg:col-span-8 space-y-3">
          {/* Controls Bar */}
          <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
              <span className="text-xs font-black text-slate-900">
                Active Outbreak Surveillance • {totalCases} Cases Logged
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleFocusLargestSpread}
                className="px-2.5 py-1 rounded-lg text-xs font-black bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 flex items-center gap-1.5 transition-all shadow-2xs active:scale-95"
                title="Find and focus the largest outbreak spread radius in the area"
              >
                <Maximize2 className="w-3.5 h-3.5 text-purple-700" />
                <span>Focus Largest Spread Outbreak</span>
              </button>

              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-bold text-slate-500 mr-1">Time Horizon:</span>
                {[7, 14, 30].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(d)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      days === d
                        ? 'bg-purple-700 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {d} Days
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Leaflet Map */}
          <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs relative">
            <div
              ref={mapContainerRef}
              className="w-full h-[360px] sm:h-[440px] z-10"
              style={{ minHeight: '360px' }}
            />
            {loading && (
              <div className="absolute inset-0 bg-white/70 z-20 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Hotspot Details & Biosecurity Checklist */}
        <div className="lg:col-span-4 space-y-3">
          {selectedCluster && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
              <div className="flex items-start justify-between pb-2.5 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {selectedCluster.county || 'Local Area'} Hotspot
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {selectedCluster.reportCount} reports in last {days} days
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-rose-600 block">
                    {selectedCluster.animalsAffected} Sick Total
                  </span>
                  {selectedCluster.animalsDead > 0 && (
                    <span className="text-[10px] font-bold text-slate-400">
                      ({selectedCluster.animalsDead} Dead)
                    </span>
                  )}
                </div>
              </div>

              {/* Breakdown by Animal Type Card */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/90 space-y-1.5">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide block">
                  Affected by Animal Type ({selectedCluster.species.length})
                </span>
                <div className="space-y-1">
                  {selectedCluster.species.map((sp) => {
                    const icon =
                      sp.slug === 'dairy-cattle' || sp.slug === 'cattle'
                        ? '🐄'
                        : sp.slug === 'goats' || sp.slug === 'goat'
                        ? '🐐'
                        : sp.slug === 'sheep'
                        ? '🐑'
                        : sp.slug === 'poultry' || sp.slug === 'chicken'
                        ? '🐔'
                        : '🐾';
                    const aff = sp.affected !== undefined ? sp.affected : selectedCluster.animalsAffected;
                    const d = sp.dead !== undefined ? sp.dead : 0;
                    return (
                      <div
                        key={sp.slug}
                        className="flex items-center justify-between text-xs bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/80 shadow-2xs"
                      >
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <span className="text-sm">{icon}</span>
                          <span>{sp.name}</span>
                        </div>
                        <div className="text-right font-black">
                          <span className="text-rose-600">{aff} sick</span>
                          {d > 0 && (
                            <span className="text-slate-400 text-[10px] font-bold ml-1">
                              ({d} dead)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Biggest Radius of Spread Metric Card */}
              {(() => {
                const { focalRadius, biggestSpreadRadius } = getSpreadMetrics(selectedCluster);
                return (
                  <div className="bg-purple-50/80 border border-purple-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Radio className="w-4 h-4 text-purple-700 animate-pulse" />
                        <span className="text-xs font-black text-purple-950 uppercase tracking-wide">
                          Biggest Radius of Spread
                        </span>
                      </div>
                      <span className="text-xs font-black text-purple-900 bg-purple-200/80 px-2 py-0.5 rounded-full">
                        {(biggestSpreadRadius / 1000).toFixed(1)} km
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-white p-2 rounded-lg border border-purple-100">
                        <span className="text-[10px] text-purple-700 font-bold block uppercase">
                          Focal Epicenter
                        </span>
                        <span className="font-black text-slate-900 text-xs">
                          {(focalRadius / 1000).toFixed(1)} km
                        </span>
                        <span className="text-[9px] text-slate-500 block">Immediate cluster</span>
                      </div>

                      <div className="bg-white p-2 rounded-lg border border-purple-100">
                        <span className="text-[10px] text-purple-700 font-bold block uppercase">
                          Outer Containment
                        </span>
                        <span className="font-black text-purple-950 text-xs">
                          {(biggestSpreadRadius / 1000).toFixed(1)} km
                        </span>
                        <span className="text-[9px] text-purple-700 block">Quarantine boundary</span>
                      </div>
                    </div>

                    <p className="text-[10px] text-purple-900 font-medium leading-relaxed">
                      ⚠️ <strong>Biosecurity Cordon:</strong> Livestock movement and cattle sales should be restricted within this {(biggestSpreadRadius / 1000).toFixed(0)} km buffer perimeter.
                    </p>
                  </div>
                );
              })()}

              {/* Predominant Symptoms */}
              <div>
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide block mb-1.5">
                  Observed Clinical Symptoms
                </span>
                <div className="flex flex-wrap gap-1">
                  {selectedCluster.symptoms.map((s) => (
                    <span
                      key={s.key}
                      className="bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    >
                      {s.nameEn} ({s.count})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Standard Biosecurity Checklist */}
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 shadow-2xs space-y-2.5">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-700" />
              <h4 className="text-xs font-black text-amber-950 uppercase tracking-wide">
                {t.quarantineChecklist} (Advisory)
              </h4>
            </div>
            <ul className="space-y-1.5 text-xs text-amber-950 font-medium">
              <li className="flex items-start gap-2">
                <CheckSquare className="w-3.5 h-3.5 text-amber-700 mt-0.5 flex-shrink-0" />
                <span>Immediately isolate animals displaying fever or lesions.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckSquare className="w-3.5 h-3.5 text-amber-700 mt-0.5 flex-shrink-0" />
                <span>Restrict animal sales, purchases and livestock transport.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckSquare className="w-3.5 h-3.5 text-amber-700 mt-0.5 flex-shrink-0" />
                <span>Notify the sub-county veterinary director immediately.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckSquare className="w-3.5 h-3.5 text-amber-700 mt-0.5 flex-shrink-0" />
                <span>Maintain footbaths with disinfectant at barn entrances.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
