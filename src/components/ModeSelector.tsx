import React from 'react';
import { Select } from '@chakra-ui/react';

export type Mode = 'customer' | 'operations' | 'sales';

interface ModeSelectorProps {
  selectedMode: Mode;
  onModeChange: (mode: Mode) => void;
}

export default function ModeSelector({ selectedMode, onModeChange }: ModeSelectorProps) {
  return (
    <Select
      value={selectedMode}
      onChange={(e) => onModeChange(e.target.value as Mode)}
      width="auto"
      size="sm"
      variant="filled"
      bg="white"
      ml={4}
    >
      <option value="customer">Customer Service</option>
      <option value="operations">Operations Support</option>
      <option value="sales">Sales Support</option>
    </Select>
  );
}