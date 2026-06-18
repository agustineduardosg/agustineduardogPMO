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

const formatInputString = (s: string) => {
  if (!s) return '';
  const decimalIndex = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'));
  let integerPart = s;
  let decimalPart = '';
  
  if (decimalIndex !== -1) {
    integerPart = s.substring(0, decimalIndex);
    decimalPart = s.substring(decimalIndex + 1);
  }
  
  const cleanInteger = integerPart.replace(/\D/g, '');
  const formattedInteger = cleanInteger ? new Intl.NumberFormat('es-CL').format(parseInt(cleanInteger, 10)) : '';
  const cleanDecimal = decimalPart.replace(/\D/g, '');
  
  if (decimalIndex !== -1) {
    return `${formattedInteger},${cleanDecimal}`;
  }
  return formattedInteger;
};

const parseInputToNumber = (s: string): number | null => {
  if (!s) return null;
  const clean = s.replace(/\./g, '').replace(/,/g, '.');
  const num = Number(clean);
  return isNaN(num) ? null : num;
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
  const [val, setVal] = useState<string>(() => {
    if (initialValue !== null && initialValue !== undefined) {
      return formatType === 'percent' ? String(initialValue) : formatInputString(String(initialValue));
    }
    return '';
  });
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      if (initialValue !== null && initialValue !== undefined) {
        setVal(formatType === 'percent' ? String(initialValue) : formatInputString(String(initialValue)));
      } else {
        setVal('');
      }
    }
  }, [initialValue, isFocused, formatType]);

  const handleBlur = () => {
    setIsFocused(false);
    if (val === '') {
      if (initialValue !== null && initialValue !== undefined) {
        onSave(null);
      }
    } else {
      let numVal = formatType === 'percent' ? Number(val) : parseInputToNumber(val);
      if (numVal === null || isNaN(numVal)) {
        setVal(initialValue !== null && initialValue !== undefined ? (formatType === 'percent' ? String(initialValue) : formatInputString(String(initialValue))) : '');
        return;
      }
      if (min !== undefined) numVal = Math.max(min, numVal);
      if (max !== undefined) numVal = Math.min(max, numVal);
      if (numVal !== initialValue) {
        onSave(numVal);
      } else {
        setVal(formatType === 'percent' ? String(numVal) : formatInputString(String(numVal)));
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
        displayValue = `$${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 4 }).format(initialValue)}`;
      } else {
        displayValue = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 4 }).format(initialValue);
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
      type={formatType === 'percent' ? 'number' : 'text'}
      value={val}
      min={min}
      max={max}
      onChange={(e) => {
        const inputVal = e.target.value;
        if (formatType === 'percent') {
          setVal(inputVal);
        } else {
          setVal(formatInputString(inputVal));
        }
      }}
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
        textAlign: style?.textAlign || 'left',
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

export interface InlineComboboxProps {
  value: string;
  onSave: (val: string) => void;
  options: string[];
  placeholder?: string;
  style?: React.CSSProperties;
  className?: string;
  disabled?: boolean;
}

export const InlineCombobox: React.FC<InlineComboboxProps> = ({
  value: initialValue,
  onSave,
  options,
  placeholder,
  style,
  className,
  disabled
}) => {
  const [val, setVal] = useState(initialValue || '');
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const listId = React.useId();

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
        title={disabled ? undefined : 'Haga clic para editar'}
      >
        {initialValue || placeholder || '-'}
      </div>
    );
  }

  return (
    <>
      <input
        ref={(el) => { if (el) el.focus(); }}
        type="text"
        list={listId}
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
      <datalist id={listId}>
        {options.map((opt, i) => <option key={i} value={opt} />)}
      </datalist>
    </>
  );
};

interface InlineMoneyInputProps {
  amount: number;
  currency: string;
  taxType: string;
  exchangeRates: { usd: number; uf: number; date: string } | null;
  onSave: (amount: number, currency: string, taxType: string) => void;
  disabled?: boolean;
}

export const InlineMoneyInput: React.FC<InlineMoneyInputProps> = ({
  amount,
  currency,
  taxType,
  exchangeRates,
  onSave,
  disabled
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const [tempAmount, setTempAmount] = useState('');
  const [tempCurrency, setTempCurrency] = useState(currency);
  const [tempTaxType, setTempTaxType] = useState(taxType);

  const containerRef = React.useRef<HTMLDivElement>(null);

  const formatInputString = (s: string) => {
    if (!s) return '';
    const decimalIndex = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'));
    let integerPart = s;
    let decimalPart = '';
    
    if (decimalIndex !== -1) {
      integerPart = s.substring(0, decimalIndex);
      decimalPart = s.substring(decimalIndex + 1);
    }
    
    const cleanInteger = integerPart.replace(/\D/g, '');
    const formattedInteger = cleanInteger ? new Intl.NumberFormat('es-CL').format(parseInt(cleanInteger, 10)) : '';
    const cleanDecimal = decimalPart.replace(/\D/g, '');
    
    if (decimalIndex !== -1) {
      return `${formattedInteger},${cleanDecimal}`;
    }
    return formattedInteger;
  };

  const parseInputToNumber = (s: string): number | null => {
    if (!s) return null;
    const clean = s.replace(/\./g, '').replace(/,/g, '.');
    const num = Number(clean);
    return isNaN(num) ? null : num;
  };

  useEffect(() => {
    if (isEditing) {
      setTempAmount(amount !== null && amount !== undefined ? formatInputString(String(amount)) : '');
      setTempCurrency(currency || 'CLP');
      setTempTaxType(taxType || 'NETO');
    }
  }, [isEditing, amount, currency, taxType]);

  const handleBlur = (e: React.FocusEvent) => {
    if (containerRef.current && containerRef.current.contains(e.relatedTarget as Node)) {
      return;
    }
    saveChanges();
  };

  const saveChanges = () => {
    setIsEditing(false);
    const parsedAmt = parseInputToNumber(tempAmount) || 0;
    if (parsedAmt !== amount || tempCurrency !== currency || tempTaxType !== taxType) {
      onSave(parsedAmt, tempCurrency, tempTaxType);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      saveChanges();
    }
  };

  const rate = tempCurrency === 'USD' ? (exchangeRates?.usd || 885) : tempCurrency === 'UF' ? (exchangeRates?.uf || 40787) : 1;
  const currentAmt = parseInputToNumber(tempAmount) || 0;
  
  const getNetAndGross = (val: number, r: number, tax: string) => {
    let net = 0;
    let gross = 0;
    if (tax === 'BRUTO') {
      gross = val * r;
      net = (val / 1.19) * r;
    } else if (tax === 'EXENTO') {
      net = val * r;
      gross = val * r;
    } else { // NETO
      net = val * r;
      gross = val * r * 1.19;
    }
    return { net, gross };
  };

  const readValues = getNetAndGross(amount, currency === 'USD' ? (exchangeRates?.usd || 885) : currency === 'UF' ? (exchangeRates?.uf || 40787) : 1, taxType);

  if (!isEditing) {
    let mainDisplay = '';
    if (currency === 'CLP') {
      mainDisplay = `${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount)}`;
    } else {
      mainDisplay = `${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 4 }).format(amount)} ${currency}`;
    }

    return (
      <div
        onClick={() => !disabled && setIsEditing(true)}
        onMouseEnter={() => !disabled && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          width: '100%',
          padding: '6px 8px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          borderRadius: '6px',
          border: isHovered ? '1px solid var(--border-light)' : '1px solid transparent',
          background: isHovered ? 'var(--bg-tertiary)' : 'transparent',
          transition: 'all 0.1s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          justifyContent: 'center',
          minHeight: '40px'
        }}
        title={disabled ? undefined : "Haga clic para editar"}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', justifyContent: 'flex-end' }}>
          <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
            {mainDisplay}
          </span>
          <span style={{
            fontSize: '0.65rem',
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: '4px',
            background: taxType === 'NETO' ? '#E0F2FE' : taxType === 'BRUTO' ? '#FFE4E6' : '#F1F5F9',
            color: taxType === 'NETO' ? '#0369A1' : taxType === 'BRUTO' ? '#E11D48' : '#475569',
            border: `1px solid ${taxType === 'NETO' ? '#BAE6FD' : taxType === 'BRUTO' ? '#FECDD3' : '#E2E8F0'}`
          }}>
            {taxType === 'NETO' ? 'NETO' : taxType === 'BRUTO' ? 'IVA INCLUIDO' : 'EXENTO'}
          </span>
        </div>

        {currency !== 'CLP' && (
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: '2px', fontFamily: 'monospace' }}>
            <span>Neto: ≈ {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(readValues.net)}</span>
            {taxType === 'NETO' && (
              <span>IVA Incluido: ≈ {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(readValues.gross)}</span>
            )}
          </div>
        )}
        {currency === 'CLP' && taxType === 'NETO' && (
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'monospace' }}>
            IVA Incluido: {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(readValues.gross)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onBlur={handleBlur}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: '6px',
        background: 'var(--bg-primary)',
        border: '1px solid var(--accent-primary)',
        borderRadius: '6px',
        width: '100%',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <input
          ref={(el) => { if (el) el.focus(); }}
          type="text"
          value={tempAmount}
          onChange={(e) => setTempAmount(formatInputString(e.target.value))}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            minWidth: '60px',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            textAlign: 'right',
            fontWeight: 'bold',
            fontSize: '0.82rem',
            color: 'var(--text-primary)'
          }}
          placeholder="0"
        />
        <select
          value={tempCurrency}
          onChange={(e) => setTempCurrency(e.target.value)}
          style={{
            border: 'none',
            outline: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--text-secondary)',
            padding: '2px'
          }}
        >
          <option value="CLP">CLP</option>
          <option value="USD">USD</option>
          <option value="UF">UF</option>
        </select>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '4px', marginTop: '2px' }}>
        <select
          value={tempTaxType}
          onChange={(e) => setTempTaxType(e.target.value)}
          style={{
            border: 'none',
            outline: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: '0.7rem',
            fontWeight: 600,
            color: 'var(--text-muted)'
          }}
        >
          <option value="NETO">Neto (Afecto)</option>
          <option value="EXENTO">Exento</option>
          <option value="BRUTO">IVA Incluido</option>
        </select>

        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
          {tempCurrency !== 'CLP' ? `≈ $${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(getNetAndGross(currentAmt, rate, tempTaxType).net)} Net` : ''}
        </span>
      </div>
    </div>
  );
};
