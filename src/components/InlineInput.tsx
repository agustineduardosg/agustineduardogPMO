"use client";

import React, { useState, useEffect } from 'react';

interface InlineInputProps {
  value: string;
  onSave: (val: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  className?: string;
  disabled?: boolean;
  title?: string;
}

export const InlineInput: React.FC<InlineInputProps> = ({
  value: initialValue,
  onSave,
  placeholder,
  style,
  className,
  disabled,
  title
}) => {
  const [val, setVal] = useState(initialValue || '');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setVal(initialValue || '');
    }
  }, [initialValue, isFocused]);

  const handleBlur = () => {
    setIsFocused(false);
    const trimmed = val.trim();
    if (trimmed !== (initialValue || '').trim()) {
      onSave(trimmed);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <input
      type="text"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      style={style}
      className={className}
      disabled={disabled}
      title={title}
    />
  );
};

interface InlineTextareaProps {
  value: string;
  onSave: (val: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  className?: string;
  disabled?: boolean;
}

export const InlineTextarea: React.FC<InlineTextareaProps> = ({
  value: initialValue,
  onSave,
  placeholder,
  style,
  className,
  disabled
}) => {
  const [val, setVal] = useState(initialValue || '');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setVal(initialValue || '');
    }
  }, [initialValue, isFocused]);

  const handleBlur = () => {
    setIsFocused(false);
    const trimmed = val.trim();
    if (trimmed !== (initialValue || '').trim()) {
      onSave(trimmed);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  return (
    <textarea
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      style={style}
      className={className}
      disabled={disabled}
    />
  );
};
