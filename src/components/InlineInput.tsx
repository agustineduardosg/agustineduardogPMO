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
  const [isHovered, setIsHovered] = useState(false);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  if (!isFocused) {
    return (
      <div
        onClick={() => !disabled && setIsFocused(true)}
        onMouseEnter={() => !disabled && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          width: '100%',
          padding: '4px 6px',
          fontSize: style?.fontSize || '0.78rem',
          color: style?.color || (initialValue ? 'var(--text-primary)' : 'var(--text-muted)'),
          cursor: disabled ? 'not-allowed' : 'pointer',
          borderRadius: '4px',
          minHeight: '22px',
          display: 'flex',
          alignItems: 'center',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          border: isHovered ? '1px solid var(--border-light)' : '1px solid transparent',
          background: isHovered ? 'var(--bg-tertiary)' : 'transparent',
          transition: 'all 0.1s ease',
          ...style
        }}
        title={title || (disabled ? undefined : "Haga clic para editar")}
      >
        {initialValue || placeholder || '-'}
      </div>
    );
  }

  return (
    <input
      ref={(el) => { if (el) el.focus(); }}
      type="text"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      style={{
        width: '100%',
        padding: '3px 5px',
        fontSize: '0.78rem',
        color: 'var(--text-primary)',
        background: 'var(--bg-primary)',
        border: '1px solid var(--accent-primary)',
        borderRadius: '4px',
        outline: 'none',
        ...style
      }}
      className={className}
      disabled={disabled}
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
  const [isHovered, setIsHovered] = useState(false);

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

  if (!isFocused) {
    return (
      <div
        onClick={() => !disabled && setIsFocused(true)}
        onMouseEnter={() => !disabled && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          width: '100%',
          padding: '6px 8px',
          fontSize: style?.fontSize || '0.78rem',
          color: style?.color || (initialValue ? 'var(--text-primary)' : 'var(--text-muted)'),
          cursor: disabled ? 'not-allowed' : 'pointer',
          borderRadius: '4px',
          minHeight: '36px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          border: isHovered ? '1px solid var(--border-light)' : '1px solid transparent',
          background: isHovered ? 'var(--bg-tertiary)' : 'transparent',
          transition: 'all 0.1s ease',
          ...style
        }}
        title={disabled ? undefined : "Haga clic para editar"}
      >
        {initialValue || placeholder || '-'}
      </div>
    );
  }

  return (
    <textarea
      ref={(el) => { if (el) el.focus(); }}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={handleBlur}
      placeholder={placeholder}
      style={{
        width: '100%',
        padding: '6px 8px',
        fontSize: '0.78rem',
        color: 'var(--text-primary)',
        background: 'var(--bg-primary)',
        border: '1px solid var(--accent-primary)',
        borderRadius: '4px',
        minHeight: '60px',
        outline: 'none',
        resize: 'vertical',
        ...style
      }}
      className={className}
      disabled={disabled}
    />
  );
};

interface InlineNumberInputProps {
  value: number | null | undefined;
  onSave: (val: number | null) => void;
  min?: number;
  max?: number;
  placeholder?: string;
  style?: React.CSSProperties;
  className?: string;
  disabled?: boolean;
  formatType?: 'percent' | 'currency' | 'number';
}

export const InlineNumberInput: React.FC<InlineNumberInputProps> = ({
  value: initialValue,
  onSave,
  min,
  max,
  placeholder,
  style,
  className,
  disabled,
  formatType = 'number'
}) => {
  const [val, setVal] = useState<string>(
    initialValue !== null && initialValue !== undefined ? String(initialValue) : ''
  );
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setVal(initialValue !== null && initialValue !== undefined ? String(initialValue) : '');
    }
  }, [initialValue, isFocused]);

  const handleBlur = () => {
    setIsFocused(false);
    if (val === '') {
      if (initialValue !== null && initialValue !== undefined) {
        onSave(null);
      }
    } else {
      let numVal = Number(val);
      if (isNaN(numVal)) {
        setVal(initialValue !== null && initialValue !== undefined ? String(initialValue) : '');
        return;
      }
      if (min !== undefined) numVal = Math.max(min, numVal);
      if (max !== undefined) numVal = Math.min(max, numVal);
      if (numVal !== initialValue) {
        onSave(numVal);
      } else {
        setVal(String(numVal));
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  if (!isFocused) {
    let displayValue = '-';
    if (initialValue !== null && initialValue !== undefined) {
      if (formatType === 'percent') {
        displayValue = `${initialValue}%`;
      } else if (formatType === 'currency') {
        displayValue = `$${initialValue.toLocaleString('es-CL')}`;
      } else {
        displayValue = String(initialValue);
      }
    }

    return (
      <div
        onClick={() => !disabled && setIsFocused(true)}
        onMouseEnter={() => !disabled && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          width: '100%',
          padding: '4px 6px',
          fontSize: style?.fontSize || '0.78rem',
          color: style?.color || (initialValue !== null && initialValue !== undefined ? 'var(--text-primary)' : 'var(--text-muted)'),
          cursor: disabled ? 'not-allowed' : 'pointer',
          borderRadius: '4px',
          minHeight: '22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: style?.textAlign === 'center' ? 'center' : style?.textAlign === 'right' ? 'flex-end' : 'flex-start',
          border: isHovered ? '1px solid var(--border-light)' : '1px solid transparent',
          background: isHovered ? 'var(--bg-tertiary)' : 'transparent',
          transition: 'all 0.1s ease',
          fontWeight: formatType === 'percent' || formatType === 'currency' ? 'bold' : 'normal',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          ...style
        }}
        title={disabled ? undefined : "Haga clic para editar"}
      >
        {displayValue}
      </div>
    );
  }

  return (
    <input
      ref={(el) => { if (el) el.focus(); }}
      type="number"
      value={val}
      min={min}
      max={max}
      onChange={(e) => setVal(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      style={{
        width: '100%',
        padding: '3px 5px',
        fontSize: '0.78rem',
        color: 'var(--text-primary)',
        background: 'var(--bg-primary)',
        border: '1px solid var(--accent-primary)',
        borderRadius: '4px',
        outline: 'none',
        ...style
      }}
      className={className}
      disabled={disabled}
    />
  );
};

interface InlineDateInputProps {
  value: Date | string | null | undefined;
  onSave: (val: string | null) => void;
  style?: React.CSSProperties;
  className?: string;
  disabled?: boolean;
}

export const InlineDateInput: React.FC<InlineDateInputProps> = ({
  value: initialValue,
  onSave,
  style,
  className,
  disabled
}) => {
  const getFormattedDate = (d: any) => {
    if (!d) return '';
    try {
      const dateObj = new Date(d);
      if (isNaN(dateObj.getTime())) return '';
      return dateObj.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const [val, setVal] = useState<string>(getFormattedDate(initialValue));
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setVal(getFormattedDate(initialValue));
    }
  }, [initialValue, isFocused]);

  const handleBlur = () => {
    setIsFocused(false);
    const initialFormatted = getFormattedDate(initialValue);
    if (val !== initialFormatted) {
      onSave(val ? val : null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  if (!isFocused) {
    let displayValue = '-';
    if (initialValue) {
      try {
        const d = new Date(initialValue);
        if (!isNaN(d.getTime())) {
          if (typeof initialValue === 'string' && initialValue.includes('-')) {
            const parts = initialValue.split('T')[0].split('-');
            if (parts.length === 3) {
              displayValue = `${parts[2]}/${parts[1]}/${parts[0]}`;
            } else {
              displayValue = initialValue;
            }
          } else {
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            displayValue = `${day}/${month}/${year}`;
          }
        }
      } catch (e) {
        displayValue = '-';
      }
    }

    return (
      <div
        onClick={() => !disabled && setIsFocused(true)}
        onMouseEnter={() => !disabled && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          width: '100%',
          padding: '4px 6px',
          fontSize: style?.fontSize || '0.78rem',
          color: style?.color || (initialValue ? 'var(--text-primary)' : 'var(--text-muted)'),
          cursor: disabled ? 'not-allowed' : 'pointer',
          borderRadius: '4px',
          minHeight: '22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: isHovered ? '1px solid var(--border-light)' : '1px solid transparent',
          background: isHovered ? 'var(--bg-tertiary)' : 'transparent',
          transition: 'all 0.1s ease',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          ...style
        }}
        title={disabled ? undefined : "Haga clic para editar"}
      >
        {displayValue}
      </div>
    );
  }

  return (
    <input
      ref={(el) => {
        if (el) {
          el.focus();
          try {
            if (typeof el.showPicker === 'function') {
              el.showPicker();
            }
          } catch (e) {}
        }
      }}
      type="date"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      style={{
        width: '100%',
        padding: '3px 5px',
        fontSize: '0.78rem',
        color: 'var(--text-primary)',
        background: 'var(--bg-primary)',
        border: '1px solid var(--accent-primary)',
        borderRadius: '4px',
        outline: 'none',
        ...style
      }}
      className={className}
      disabled={disabled}
    />
  );
};
