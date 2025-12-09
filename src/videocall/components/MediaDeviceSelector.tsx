/**
 * MediaDeviceSelector Component
 * Dropdown menus for selecting audio/video input devices
 * Uses Headless UI Popover for proper positioning and accessibility
 * Uses LiveKit's useMediaDeviceSelect hook
 */

import { CloseButton, Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { useMediaDeviceSelect } from '@livekit/components-react';
import {
  Check,
  ChevronDown,
  Mic,
  Settings,
  Video,
  Volume2,
  X
} from 'lucide-react';
import { forwardRef, useCallback, useState } from 'react';

type DeviceKind = 'audioinput' | 'videoinput' | 'audiooutput';

interface MediaDeviceSelectorProps {
  /** Optional className for the trigger button */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md';
}

/**
 * Settings trigger button component
 * Must forward ref for Headless UI to work properly
 */
const SettingsTriggerButton = forwardRef<
  HTMLButtonElement,
  { isActive?: boolean; size?: 'sm' | 'md'; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>
>(function SettingsTriggerButton({ isActive, size = 'md', className = '', ...props }, ref) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
  };

  return (
    <button
      ref={ref}
      className={`
        ${sizeClasses[size]} 
        flex items-center justify-center rounded-full
        transition-all duration-200 hover:scale-105 active:scale-95
        ${isActive
          ? 'bg-primary text-white' 
          : 'bg-white/10 hover:bg-white/20 text-white'
        }
        ${className}
      `}
      {...props}
    >
      <Settings className={size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} />
    </button>
  );
});

/**
 * MediaDeviceSelector - Self-contained device settings button with popup
 * Uses Headless UI Popover for proper portal rendering and accessibility
 */
export function MediaDeviceSelector({
  size = 'md',
}: MediaDeviceSelectorProps) {
  const [activeTab, setActiveTab] = useState<DeviceKind>('audioinput');

  const tabs = [
    { kind: 'audioinput' as DeviceKind, icon: Mic, label: 'Microphone' },
    { kind: 'videoinput' as DeviceKind, icon: Video, label: 'Camera' },
    { kind: 'audiooutput' as DeviceKind, icon: Volume2, label: 'Speaker' },
  ];

  return (
    <Popover className={`relative \${className}`}>
      {({ open }) => (
        <>
          <PopoverButton
            as={SettingsTriggerButton}
            isActive={open}
            size={size}
            aria-label="Device settings"
          />
          
          <PopoverPanel
            anchor={{ to: 'top', gap: 12 }}
            transition
            className="z-[99999] w-80 origin-bottom transition duration-200 ease-out data-closed:scale-95 data-closed:opacity-0"
          >
            <div className="bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-white">Device Settings</span>
                </div>
                <CloseButton
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </CloseButton>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-white/5">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.kind}
                      onClick={() => setActiveTab(tab.kind)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs transition-colors \${
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
              <div className="p-2">
                <DeviceList kind={activeTab} />
              </div>
            </div>
          </PopoverPanel>
        </>
      )}
    </Popover>
  );
}

interface DeviceListProps {
  kind: DeviceKind;
  onSelect?: () => void;
}

function DeviceList({ kind, onSelect }: DeviceListProps) {
  const {
    devices,
    activeDeviceId,
    setActiveMediaDevice,
  } = useMediaDeviceSelect({ kind, requestPermissions: true });

  const handleDeviceSelect = useCallback(async (deviceId: string) => {
    try {
      await setActiveMediaDevice(deviceId);
      onSelect?.();
    } catch (error) {
      console.error('Failed to set device:', error);
    }
  }, [setActiveMediaDevice, onSelect]);

  const kindLabels: Record<DeviceKind, string> = {
    audioinput: 'Microphone',
    videoinput: 'Camera',
    audiooutput: 'Speaker',
  };

  if (devices.length === 0) {
    return (
      <div className="text-center py-4 text-gray-400 text-xs">
        No {kindLabels[kind].toLowerCase()} devices found
      </div>
    );
  }

  return (
    <div className="space-y-1" role="listbox" aria-label={`\${kindLabels[kind]} devices`}>
      {devices.map((device) => {
        const isActive = device.deviceId === activeDeviceId;
        return (
          <button
            key={device.deviceId}
            onClick={() => handleDeviceSelect(device.deviceId)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 hover:scale-[1.01] active:scale-[0.99] \${
              isActive
                ? 'bg-primary/10 border border-primary/30'
                : 'hover:bg-white/5 border border-transparent'
            }`}
            role="option"
            aria-selected={isActive}
          >
            <span className={`text-sm truncate \${isActive ? 'text-primary' : 'text-white'}`}>
              {device.label || `\${kindLabels[kind]} \${device.deviceId.slice(0, 5)}...`}
            </span>
            {isActive && (
              <Check className="w-4 h-4 text-primary flex-shrink-0 ml-2" />
            )}
          </button>
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

export function DeviceSelectorButton({ kind }: DeviceSelectorButtonProps) {
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
    <Popover className={`relative \${className}`}>
      {() => (
        <>
          <PopoverButton className="flex items-center gap-1.5 px-2 py-1 bg-white/10 hover:bg-white/15 rounded-lg transition-colors text-xs text-gray-300">
            <Icon className="w-3.5 h-3.5" />
            <span className="max-w-[120px] truncate">
              {activeDevice?.label || 'Select device'}
            </span>
            <ChevronDown className={`w-3 h-3 transition-transform \${open ? 'rotate-180' : ''}`} />
          </PopoverButton>
          
          <PopoverPanel
            anchor={{ to: 'top', gap: 8 }}
            transition
            className="z-[99999] w-52 origin-bottom transition duration-150 ease-out data-closed:scale-95 data-closed:opacity-0"
          >
            <div className="bg-gray-800/95 backdrop-blur-md rounded-xl shadow-2xl border border-white/10 p-1">
              {devices.map((device) => (
                <CloseButton
                  key={device.deviceId}
                  as="button"
                  onClick={() => setActiveMediaDevice(device.deviceId)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all duration-150 hover:scale-[1.01] active:scale-[0.99] \${
                    device.deviceId === activeDeviceId
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-white/5 text-white'
                  }`}
                >
                  <span className="text-xs truncate">
                    {device.label || `Device \${device.deviceId.slice(0, 5)}...`}
                  </span>
                  {device.deviceId === activeDeviceId && (
                    <Check className="w-3.5 h-3.5 flex-shrink-0 ml-2" />
                  )}
                </CloseButton>
              ))}
            </div>
          </PopoverPanel>
        </>
      )}
    </Popover>
  );
}
