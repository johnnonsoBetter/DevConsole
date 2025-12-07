/**
 * MediaDeviceSelector Component
 * Dropdown menus for selecting audio/video input devices
 * Uses LiveKit's useMediaDeviceSelect hook
 */

import { useMediaDeviceSelect } from '@livekit/components-react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Check,
    ChevronDown,
    Mic,
    Video,
    Volume2,
    X
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

type DeviceKind = 'audioinput' | 'videoinput' | 'audiooutput';

interface MediaDeviceSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function MediaDeviceSelector({
  isOpen,
  onClose,
  className = '',
}: MediaDeviceSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<DeviceKind>('audioinput');

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  const tabs = [
    { kind: 'audioinput' as DeviceKind, icon: Mic, label: 'Microphone' },
    { kind: 'videoinput' as DeviceKind, icon: Video, label: 'Camera' },
    { kind: 'audiooutput' as DeviceKind, icon: Volume2, label: 'Speaker' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className={`absolute bottom-full mb-3 left-1/2 -translate-x-1/2 ${className}`}
          role="dialog"
          aria-label="Device settings"
        >
          <div className="bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-apple-lg border border-white/10 min-w-[320px] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-gray-400" />
                <span className="text-body font-medium text-white">
                  Device Settings
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Close settings"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/5">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.kind}
                    onClick={() => setActiveTab(tab.kind)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-caption transition-colors ${
                      activeTab === tab.kind
                        ? 'text-primary border-b-2 border-primary bg-primary/5'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Device list */}
            <div className="p-3">
              <DeviceList kind={activeTab} />
            </div>
          </div>

          {/* Pointer arrow */}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-gray-800/95 border-b border-r border-white/10 rotate-45" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface DeviceListProps {
  kind: DeviceKind;
}

function DeviceList({ kind }: DeviceListProps) {
  const {
    devices,
    activeDeviceId,
    setActiveMediaDevice,
  } = useMediaDeviceSelect({ kind, requestPermissions: true });

  const handleDeviceSelect = useCallback(async (deviceId: string) => {
    try {
      await setActiveMediaDevice(deviceId);
    } catch (error) {
      console.error('Failed to set device:', error);
    }
  }, [setActiveMediaDevice]);

  const kindLabels: Record<DeviceKind, string> = {
    audioinput: 'Microphone',
    videoinput: 'Camera',
    audiooutput: 'Speaker',
  };

  if (devices.length === 0) {
    return (
      <div className="text-center py-4 text-gray-400 text-caption">
        No {kindLabels[kind].toLowerCase()} devices found
      </div>
    );
  }

  return (
    <div className="space-y-1" role="listbox" aria-label={`${kindLabels[kind]} devices`}>
      {devices.map((device) => {
        const isActive = device.deviceId === activeDeviceId;
        return (
          <motion.button
            key={device.deviceId}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => handleDeviceSelect(device.deviceId)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors ${
              isActive
                ? 'bg-primary/10 border border-primary/30'
                : 'hover:bg-white/5 border border-transparent'
            }`}
            role="option"
            aria-selected={isActive}
          >
            <span className={`text-body truncate ${isActive ? 'text-primary' : 'text-white'}`}>
              {device.label || `${kindLabels[kind]} ${device.deviceId.slice(0, 5)}...`}
            </span>
            {isActive && (
              <Check className="w-4 h-4 text-primary flex-shrink-0 ml-2" />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

/**
 * Compact device selector button with dropdown
 */
interface DeviceSelectorButtonProps {
  kind: DeviceKind;
  className?: string;
}

export function DeviceSelectorButton({ kind, className = '' }: DeviceSelectorButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    devices,
    activeDeviceId,
    setActiveMediaDevice,
  } = useMediaDeviceSelect({ kind });

  const activeDevice = devices.find((d) => d.deviceId === activeDeviceId);
  
  const icons: Record<DeviceKind, typeof Mic> = {
    audioinput: Mic,
    videoinput: Video,
    audiooutput: Volume2,
  };
  
  const Icon = icons[kind];

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1 bg-white/10 hover:bg-white/15 rounded-lg transition-colors text-caption text-gray-300"
      >
        <Icon className="w-3.5 h-3.5" />
        <span className="max-w-[120px] truncate">
          {activeDevice?.label || 'Select device'}
        </span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute bottom-full mb-2 left-0 bg-gray-800/95 backdrop-blur-md rounded-xl shadow-apple-lg border border-white/10 min-w-[200px] p-2 z-50"
          >
            {devices.map((device) => (
              <button
                key={device.deviceId}
                onClick={() => {
                  setActiveMediaDevice(device.deviceId);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                  device.deviceId === activeDeviceId
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-white/5 text-white'
                }`}
              >
                <span className="text-caption truncate">
                  {device.label || `Device ${device.deviceId.slice(0, 5)}...`}
                </span>
                {device.deviceId === activeDeviceId && (
                  <Check className="w-3.5 h-3.5 flex-shrink-0 ml-2" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
