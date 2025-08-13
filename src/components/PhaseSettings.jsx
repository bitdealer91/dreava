// ✅ PhaseSettings with DateTimePicker in shadcn-style, time in UTC and step-switch
import { useState, useEffect, useCallback, useRef } from "react";
import { X, CalendarIcon, AlertTriangle, CheckCircle, Loader2, Play, Pause, HelpCircle } from "lucide-react";
import somniaLogo from "../assets/somnia-logo.svg";
import { Switch } from "@headlessui/react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

const DateTimePicker = ({ value, onChange, disabled = false }) => {
  const [step, setStep] = useState("date");
  const [tempDate, setTempDate] = useState(value ? new Date(value) : null);

  useEffect(() => {
    if (value) setTempDate(new Date(value));
  }, [value]);

  const handleDateSelect = (selectedDate) => {
    if (!selectedDate) return;
    const withTime = new Date(Date.UTC(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      tempDate?.getUTCHours() || 0,
      tempDate?.getUTCMinutes() || 0
    ));
    setTempDate(withTime);
    setStep("time");
    onChange(withTime.toISOString());
  };

  const handleTimeChange = (e) => {
    const { name, value } = e.target;
    const updated = tempDate ? new Date(tempDate.getTime()) : new Date();
    if (name === "hour") updated.setUTCHours(Math.max(0, Math.min(23, Number(value))));
    if (name === "minute") updated.setUTCMinutes(Math.max(0, Math.min(59, Number(value))));
    setTempDate(updated);
    onChange(updated.toISOString());
  };

  const formatUTCTime = (date) => {
    if (!date) return '';
    const h = date.getUTCHours().toString().padStart(2, '0');
    const m = date.getUTCMinutes().toString().padStart(2, '0');
    const d = date.getUTCDate().toString().padStart(2, '0');
    const mo = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const y = date.getUTCFullYear();
    return `${y}-${mo}-${d} ${h}:${m}`;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "w-full flex justify-between items-center p-1 rounded bg-zinc-800 border border-zinc-600 text-white text-sm",
            !value && "text-zinc-500"
          )}
          disabled={disabled}
        >
          {value ? formatUTCTime(new Date(value)) + " UTC" : "Pick date & time (UTC)"}
          <CalendarIcon className="ml-2 h-4 w-4 text-zinc-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto bg-zinc-900 border border-zinc-700 text-white">
        {step === "date" && (
          <div className="flex flex-col items-center">
            <Calendar
              mode="single"
              selected={tempDate}
              onSelect={handleDateSelect}
              className="bg-zinc-900"
            />
            {tempDate && (
              <button
                onClick={() => setStep("time")}
                className="mt-2 text-xs text-blue-400 hover:underline"
              >
                Set time for selected date
              </button>
            )}
          </div>
        )}
        {step === "time" && (
          <div className="flex flex-col items-center px-2 py-2 gap-2">
            <div className="text-xs text-zinc-400 mb-1">All times are in UTC</div>
            <div className="flex gap-2 items-center">
              <label className="text-xs">Hour (UTC):</label>
              <input
                type="number"
                name="hour"
                min={0}
                max={23}
                value={tempDate?.getUTCHours() ?? 0}
                onChange={handleTimeChange}
                className="w-16 p-1 rounded bg-zinc-800 border border-zinc-600 text-white text-sm"
              />
              <label className="text-xs">Minute:</label>
              <input
                type="number"
                name="minute"
                min={0}
                max={59}
                value={tempDate?.getUTCMinutes() ?? 0}
                onChange={handleTimeChange}
                className="w-16 p-1 rounded bg-zinc-800 border border-zinc-600 text-white text-sm"
              />
            </div>
            <button
              onClick={() => setStep("date")}
              className="mt-2 text-xs text-blue-400 hover:underline"
            >
              ← Back to date
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

const PhaseSettings = ({ collectionAddress, phases, onActivatePhase, onRemovePhase, nfts = [], saleStatus, onPauseSale, onResumeSale }) => {
  const [phaseData, setPhaseData] = useState({});
  const [timeValidationErrors, setTimeValidationErrors] = useState({});
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [activePhases, setActivePhases] = useState({
    Whitelist: false,
    FCFS: false,
    Public: true
  });
  
  const saveTimeouts = useRef({});
  const [nftCount, setNftCount] = useState(nfts.length);

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const PHASE_ORDER = ['Whitelist', 'FCFS', 'Public'];
  const getPrevPhaseKey = (key) => PHASE_ORDER[PHASE_ORDER.indexOf(key) - 1] || null;
  const getNextPhaseKey = (key) => PHASE_ORDER[PHASE_ORDER.indexOf(key) + 1] || null;

  const clampToNoOverlap = (draft, phaseKey) => {
    // Ensure start < end
    let start = draft[phaseKey]?.start ? new Date(draft[phaseKey].start) : null;
    let end = draft[phaseKey]?.end ? new Date(draft[phaseKey].end) : null;
    if (!start || !end) return draft;

    // Prev constraint: start >= prev.end
    const prevKey = getPrevPhaseKey(phaseKey);
    if (prevKey && draft[prevKey]?.end) {
      const prevEnd = new Date(draft[prevKey].end);
      if (start < prevEnd) start = new Date(prevEnd);
    }

    // Next constraint: end <= next.start
    const nextKey = getNextPhaseKey(phaseKey);
    if (nextKey && draft[nextKey]?.start) {
      const nextStart = new Date(draft[nextKey].start);
      if (end > nextStart) end = new Date(nextStart);
    }

    // Ensure min duration of 1 hour
    if (end <= start) {
      end = new Date(start.getTime() + 60 * 60 * 1000);
    }

    draft[phaseKey].start = new Date(Date.UTC(
      start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), start.getUTCHours(), start.getUTCMinutes()
    )).toISOString();
    draft[phaseKey].end = new Date(Date.UTC(
      end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), end.getUTCHours(), end.getUTCMinutes()
    )).toISOString();

    return draft;
  };

  // Auto-refresh handler simplified (keeps allocations), default Public = 3 days
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = JSON.parse(localStorage.getItem(`phases_${collectionAddress}`)) || {};

      const updatedNfts = JSON.parse(localStorage.getItem(`collection_${collectionAddress}_nfts`) || '[]');
      const newNftCount = updatedNfts.length;
      setNftCount(newNftCount);

      if (!saved.Public) {
        const now = new Date();
        const end = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        saved.Public = {
          price: '0.1',
          limit: 1,
          allocated: newNftCount,
          start: new Date(Date.UTC(
            now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes()
          )).toISOString(),
          end: new Date(Date.UTC(
            end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), end.getUTCHours(), end.getUTCMinutes()
          )).toISOString(),
          active: true,
          isPublic: true
        };
        localStorage.setItem(`phases_${collectionAddress}`, JSON.stringify(saved));
      } else {
        const otherAllocated = Object.entries(saved).reduce((sum, [k, p]) => k === 'Public' ? sum : sum + (Number(p.allocated) || 0), 0);
        saved.Public.allocated = Math.max(0, newNftCount - otherAllocated);
        saved.Public.limit = 1;
        localStorage.setItem(`phases_${collectionAddress}`, JSON.stringify(saved));
      }

      setPhaseData(saved);
      setActivePhases({
        Whitelist: !!saved.Whitelist,
        FCFS: !!saved.FCFS,
        Public: true
      });
    };

    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(handleStorageChange, 2000);
    return () => { window.removeEventListener('storage', handleStorageChange); clearInterval(interval); };
  }, [collectionAddress]);

  // Initial load with Public default = 3 days
  useEffect(() => {
    if (!collectionAddress) return;
    const nfts = JSON.parse(localStorage.getItem(`collection_${collectionAddress}_nfts`) || '[]');
    setNftCount(nfts.length);

    const saved = JSON.parse(localStorage.getItem(`phases_${collectionAddress}`)) || {};
    if (!saved.Public) {
      const now = new Date();
      const end = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      saved.Public = {
        price: '0.1',
        limit: 1,
        allocated: nfts.length,
        start: new Date(Date.UTC(
          now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes()
        )).toISOString(),
        end: new Date(Date.UTC(
          end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), end.getUTCHours(), end.getUTCMinutes()
        )).toISOString(),
        active: true,
        isPublic: true
      };
      localStorage.setItem(`phases_${collectionAddress}`, JSON.stringify(saved));
    } else {
      const otherAllocated = Object.entries(saved).reduce((sum, [k, p]) => k === 'Public' ? sum : sum + (Number(p.allocated) || 0), 0);
      saved.Public.allocated = Math.max(0, nfts.length - otherAllocated);
      saved.Public.limit = 1;
      localStorage.setItem(`phases_${collectionAddress}`, JSON.stringify(saved));
    }

    setPhaseData(saved);
    setActivePhases({ Whitelist: !!saved.Whitelist, FCFS: !!saved.FCFS, Public: true });
  }, [collectionAddress]);

  const togglePhase = (phaseKey) => {
    if (phaseKey === 'Public') return;
    setActivePhases(prev => {
      const newActive = { ...prev, [phaseKey]: !prev[phaseKey] };

      if (newActive[phaseKey] && !phaseData[phaseKey]) {
        const now = new Date();
        const start = new Date(now.getTime() + 60 * 60 * 1000);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        const defaultAllocated = Math.floor(nftCount / 3);
        const defaultPhase = {
          price: phaseKey === 'Whitelist' ? '0.05' : '0.08',
          allocated: defaultAllocated,
          start: new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), start.getUTCHours(), start.getUTCMinutes())).toISOString(),
          end: new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), end.getUTCHours(), end.getUTCMinutes())).toISOString(),
          active: false,
          isPublic: false
        };

        const newPhaseData = { ...phaseData, [phaseKey]: defaultPhase };

        if (newPhaseData.Public) {
          const currentPublicAllocated = Number(newPhaseData.Public.allocated) || 0;
          newPhaseData.Public.allocated = Math.max(0, currentPublicAllocated - defaultAllocated);
          newPhaseData.Public.start = '';
          newPhaseData.Public.end = '';
        }

        setPhaseData(newPhaseData);
        localStorage.setItem(`phases_${collectionAddress}`, JSON.stringify(newPhaseData));
        showToast(`Added ${phaseKey} phase. Public phase dates have been reset for easier configuration.`, 'success');
      }

      if (!newActive[phaseKey] && phaseData[phaseKey]) {
        const newPhaseData = { ...phaseData };
        const removedAllocation = Number(phaseData[phaseKey].allocated) || 0;
        if (newPhaseData.Public) {
          const currentPublicAllocated = Number(newPhaseData.Public.allocated) || 0;
          newPhaseData.Public.allocated = currentPublicAllocated + removedAllocation;
        }
        delete newPhaseData[phaseKey];
        setPhaseData(newPhaseData);
        localStorage.setItem(`phases_${collectionAddress}`, JSON.stringify(newPhaseData));
      }

      return newActive;
    });
  };

  const autoSave = useCallback(async (phaseKey, newData) => {
    if (saveTimeouts.current[phaseKey]) clearTimeout(saveTimeouts.current[phaseKey]);
    saveTimeouts.current[phaseKey] = setTimeout(async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 200));
        const updated = { ...phaseData, [phaseKey]: newData };
        localStorage.setItem(`phases_${collectionAddress}`, JSON.stringify(updated));
      } catch (error) {
        console.error(`❌ Failed to auto-save ${phaseKey} phase:`, error);
        showToast(`Failed to save ${phaseKey} settings`, 'error');
      }
    }, 300);
  }, [phaseData, collectionAddress]);

  const enforceAndSave = (phaseKey, draft) => {
    const adjusted = clampToNoOverlap({ ...draft }, phaseKey);
    setPhaseData(adjusted);
    autoSave(phaseKey, adjusted[phaseKey]);
    // Clear or set warning
    setTimeValidationErrors(prev => {
      const copy = { ...prev };
      delete copy[phaseKey];
      return copy;
    });
  };

  const validatePhaseTime = (phaseKey, newStart, newEnd) => {
    const errors = {};
    const newStartTime = new Date(newStart).getTime();
    const newEndTime = new Date(newEnd).getTime();
    if (newStartTime >= newEndTime) {
      errors[phaseKey] = "Start time must be before end time";
      return errors;
    }
    Object.entries(phaseData).forEach(([key, phase]) => {
      if (key === phaseKey || !phase.start || !phase.end) return;
      const existingStart = new Date(phase.start).getTime();
      const existingEnd = new Date(phase.end).getTime();
      if (newStartTime < existingEnd && newEndTime > existingStart) {
        errors[phaseKey] = `Time overlaps with ${key} phase`;
      }
    });
    return errors;
  };

  const handleChange = (phaseKey, field, value) => {
    if (field === "allocated") {
      if (phaseKey === 'Public') {
        const otherPhasesAllocated = Object.entries(phaseData).reduce((sum, [key, data]) => key === 'Public' ? sum : sum + (Number(data.allocated) || 0), 0);
        value = Math.max(0, nftCount - otherPhasesAllocated);
      } else {
        const oldAllocation = Number(phaseData[phaseKey]?.allocated) || 0;
        const newAllocation = Math.max(0, Number(value) || 0);
        const allocationDiff = newAllocation - oldAllocation;
        if (phaseData.Public) {
          const currentPublicAllocated = Number(phaseData.Public.allocated) || 0;
          phaseData.Public.allocated = Math.max(0, currentPublicAllocated - allocationDiff);
        }
        value = newAllocation;
      }
    }

    if (phaseKey === 'Public' && ['price', 'limit', 'start', 'end'].includes(field)) {
      if (phaseData[phaseKey]) phaseData[phaseKey].userModified = true;
    }

    let newPhaseData = { ...phaseData, [phaseKey]: { ...phaseData[phaseKey], [field]: value } };

    if ((field === "start" || field === "end") && value) {
      const currentPhase = newPhaseData[phaseKey] || {};
      const newStart = field === "start" ? value : currentPhase.start;
      const newEnd = field === "end" ? value : currentPhase.end;
      if (newStart && newEnd) {
        const errors = validatePhaseTime(phaseKey, newStart, newEnd);
        if (errors[phaseKey]) {
          // Enforce no-overlap by snapping
          newPhaseData = clampToNoOverlap(newPhaseData, phaseKey);
          showToast(errors[phaseKey], 'error');
        }
      }
    }

    setPhaseData(newPhaseData);
    autoSave(phaseKey, newPhaseData[phaseKey]);
  };

  const handleToggleActivate = (phaseKey, isActive, phaseEnum) => {
    const updated = { 
      ...phaseData,
      [phaseKey]: { 
        ...phaseData[phaseKey],
        active: isActive
      }
    };
    localStorage.setItem(`phases_${collectionAddress}`, JSON.stringify(updated));
    setPhaseData(updated);
    autoSave(phaseKey, updated[phaseKey]);

    const phaseSettings = updated[phaseKey];
    if (onActivatePhase) onActivatePhase(phaseEnum);
    showToast(`${phaseKey} phase ${isActive ? 'activated' : 'deactivated'}`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Sale Control Section */}
      {saleStatus?.isInitialized && (
        <div className="bg-zinc-800/50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${saleStatus.isPaused ? 'bg-red-500' : 'bg-green-500'}`} />
              <span className="text-sm font-medium text-white">
                Sale Status: {saleStatus.isPaused ? 'Paused' : 'Active'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {saleStatus.isPaused ? (
                <button onClick={onResumeSale} disabled={saleStatus.isLoading} className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors duration-200 disabled:opacity-50">
                  {saleStatus.isLoading ? (<Loader2 className="w-4 h-4 animate-spin" />) : (<Play className="w-4 h-4" />)}
                  {saleStatus.isLoading ? 'Resuming' : 'Resume Sale'}
                </button>
              ) : (
                <button onClick={onPauseSale} disabled={saleStatus.isLoading} className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors duration-200 disabled:opacity-50">
                  {saleStatus.isLoading ? (<Loader2 className="w-4 h-4 animate-spin" />) : (<Pause className="w-4 h-4" />)}
                  {saleStatus.isLoading ? 'Pausing' : 'Pause Sale'}
                </button>
              )}
            </div>
          </div>
          {saleStatus.isPaused && (
            <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-500/50 rounded-xl">
              <div className="flex items-center gap-2 text-yellow-400 mb-2">
                <AlertTriangle size={16} />
                <span className="font-semibold">Sale is Paused</span>
              </div>
              <p className="text-sm text-yellow-300">The sale is currently paused. Users cannot mint NFTs while the sale is paused. You can edit phase settings while paused, then resume the sale when ready.</p>
            </div>
          )}
        </div>
      )}

      {/* Phase Toggle Buttons with NFT Summary */}
      <div className="bg-zinc-800/50 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Add Phases</h3>
            <div className="flex gap-4">
              <button onClick={() => togglePhase('Whitelist')} disabled={saleStatus?.isPaused} className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${activePhases.Whitelist ? 'bg-gradient-to-r from-blue-500 to-pink-500 text-white shadow-lg' : 'bg-zinc-700 hover:bg-zinc-600 text-white'} ${saleStatus?.isPaused ? 'opacity-50 cursor-not-allowed' : ''}`}>
                Whitelist
              </button>
              <button onClick={() => togglePhase('FCFS')} disabled={saleStatus?.isPaused} className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${activePhases.FCFS ? 'bg-gradient-to-r from-blue-500 to-pink-500 text-white shadow-lg' : 'bg-zinc-700 hover:bg-zinc-600 text-white'} ${saleStatus?.isPaused ? 'opacity-50 cursor-not-allowed' : ''}`}>
                FCFS
              </button>
            </div>
            <p className="text-xs text-zinc-500 mt-2">Click to add/remove phases. Public phase is always available.</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-zinc-400">Total NFTs (added): <span className="text-white font-bold">{nftCount}</span></p>
            <p className="text-sm text-zinc-400">Allocated to phases: <span className="text-white font-bold">{Object.values(phaseData).reduce((sum, phase) => sum + (Number(phase.allocated) || 0), 0)}</span></p>
            <p className="text-sm text-zinc-400">Unallocated NFTs: <span className="text-white font-bold">{nftCount - Object.values(phaseData).reduce((sum, phase) => sum + (Number(phase.allocated) || 0), 0)}</span></p>
          </div>
        </div>
      </div>

      {/* Phase Settings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(activePhases).map(([key, isActive]) => {
          if (!isActive) return null;
          const phaseDataEntry = phaseData[key] || {};
          return (
            <div key={key} className="bg-zinc-900 rounded-xl p-4 border border-zinc-700">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-white">{key} Phase</h4>
                {key === 'Public' && (
                  <div className="group relative">
                    <div className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded flex items-center gap-1 cursor-help">
                      Auto-configured
                      <HelpCircle className="w-3 h-3 text-blue-400" />
                    </div>
                    <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl text-xs text-zinc-300 w-64 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                      <div className="font-semibold text-blue-400 mb-1">Auto-configured Public Phase:</div>
                      <div className="space-y-1">
                        <div>• Price: 0.1 STT (default, editable)</div>
                        <div>• Limit: 1 NFT per wallet (default, editable)</div>
                        <div>• Start: Now (UTC) when you enter this menu (editable)</div>
                        <div>• Duration: 3 days (editable)</div>
                        <div>• Allocation: Automatically calculated based on other phases</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-1">
                <label className="text-xs mr-1">Price (<img src={somniaLogo} alt="Somnia" className="inline w-4 h-4 mx-1" /> STT)</label>
                <input type="number" step="0.001" min="0" value={phaseDataEntry.price || ''} onChange={(e) => handleChange(key, 'price', e.target.value)} className={`w-full p-1 rounded bg-zinc-800 border border-zinc-600 text-white text-sm ${saleStatus?.isPaused ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={saleStatus?.isPaused} />
              </div>

              <div className="mb-1">
                <label className="text-xs">Limit per Wallet</label>
                <input type="number" min={0} value={phaseDataEntry.limit || ''} onChange={(e) => handleChange(key, 'limit', Math.max(0, e.target.value))} className={`w-full p-1 rounded bg-zinc-800 border border-zinc-600 text-white text-sm ${saleStatus?.isPaused ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={saleStatus?.isPaused} />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <label className="text-xs w-12">Start</label>
                  <DateTimePicker value={phaseDataEntry.start} onChange={(val) => handleChange(key, 'start', val)} disabled={saleStatus?.isPaused} />
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <label className="text-xs w-12">End</label>
                  <DateTimePicker value={phaseDataEntry.end} onChange={(val) => handleChange(key, 'end', val)} disabled={saleStatus?.isPaused} />
                </div>

                {timeValidationErrors[key] && (
                  <div className="mt-1 p-2 bg-yellow-900/20 border border-yellow-500/50 rounded text-xs text-yellow-400">
                    <div className="flex items-center gap-1 mb-1">
                      <AlertTriangle size={12} />
                      <span className="font-semibold">Time Warning</span>
                    </div>
                    <p className="text-xs">{timeValidationErrors[key]}</p>
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => {
                        const suggestion = (() => {
                          const prevKey = getPrevPhaseKey(key);
                          const base = prevKey && phaseData[prevKey]?.end ? new Date(phaseData[prevKey].end) : new Date();
                          const s = new Date(base);
                          const e = new Date(base.getTime() + 60 * 60 * 1000);
                          return { start: s.toISOString(), end: e.toISOString() };
                        })();
                        handleChange(key, 'start', suggestion.start);
                        handleChange(key, 'end', suggestion.end);
                      }} className="text-xs text-blue-400 hover:underline">Suggest optimal time</button>
                      <button onClick={() => setTimeValidationErrors(prev => { const ne = { ...prev }; delete ne[key]; return ne; })} className="text-xs text-zinc-400 hover:underline">Dismiss</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-1 mt-1">
                <label className="text-xs">Allocated NFTs</label>
                <input type="number" min={0} max={nftCount} value={phaseDataEntry.allocated || ''} onChange={(e) => handleChange(key, 'allocated', e.target.value)} className={`w-full p-1 rounded bg-zinc-800 border border-zinc-600 text-white text-sm ${saleStatus?.isPaused || key === 'Public' ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={saleStatus?.isPaused || key === 'Public'} title={key === 'Public' ? 'Public phase allocation is automatically calculated' : ''} />
              </div>

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-zinc-400">{phaseDataEntry.active ? 'Active' : 'Inactive'}</span>
                    {phaseDataEntry.active && <CheckCircle className="w-3 h-3 text-green-400" />}
                  </div>
                  <Switch checked={phaseDataEntry.active || false} onChange={(val) => handleToggleActivate(key, val, key)} disabled={saleStatus?.isPaused} className={`${phaseDataEntry.active ? 'bg-green-500' : 'bg-zinc-600'} relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${saleStatus?.isPaused ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${phaseDataEntry.active ? 'translate-x-5' : 'translate-x-1'}`} />
                  </Switch>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {toast.visible && (
        <div className={`fixed bottom-24 right-4 p-4 rounded-lg shadow-lg max-w-xs animate-fadeIn cursor-pointer hover:opacity-100 opacity-90 z-50 ${toast.type === 'error' ? 'bg-red-800 text-white' : toast.type === 'info' ? 'bg-blue-800 text-white' : 'bg-zinc-800 text-white'}`}>
          <p className="text-sm">{toast.message}</p>
        </div>
      )}
    </div>
  );
};

export default PhaseSettings;
