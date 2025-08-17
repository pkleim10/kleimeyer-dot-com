import { useState, useRef, useEffect, useCallback } from 'react';
import useClickOutside from './useClickOutside';

// Handles select input editing with option filtering
const useSelectEdit = ({ value, onValueChange, options, onAddOption, isEditable }) => {
    if (!isEditable) {
        return {
            currentValue: String(value || ''),
            setCurrentValue: () => {},
        };
    }

    const [currentValue, setCurrentValue] = useState(String(value || ''));
    const [isEditing, setIsEditing] = useState(false);
    const [filteredOptions, setFilteredOptions] = useState(options);
    const inputRef = useRef(null);
    const valueRef = useRef(null);
    const overlayRef = useRef(null);
    const optionsListRef = useRef(null);

    const handleClick = useCallback(() => {
        setCurrentValue(String(value || ''));
        setFilteredOptions(options);
        setIsEditing(true);
    }, [value, options]);

    const handleSave = useCallback(() => {
        setIsEditing(false);
        if (String(currentValue) !== String(value)) {
            const selectedOption = options.find(
                (opt) => String(opt.value) === String(currentValue)
            );
            onValueChange({
                value: currentValue,
                label: selectedOption ? selectedOption.label : currentValue,
                color: selectedOption?.color,
            });
        }
        setTimeout(() => valueRef.current?.focus(), 0);
    }, [currentValue, value, onValueChange, options]);

    const handleChange = useCallback(
        (e) => {
            const inputText = e.target.value;
            const filtered = options.filter((option) =>
                option.label.toLowerCase().includes(inputText.toLowerCase())
            );
            const exactMatch = options.find(
                (option) => option.label.toLowerCase() === inputText.toLowerCase()
            );
            const newCurrentValue = exactMatch ? String(exactMatch.value) : inputText;
            setCurrentValue(newCurrentValue);

            if (filtered.length === 0 && inputText && onAddOption) {
                setFilteredOptions([
                    {
                        isAddOption: true,
                        label: inputText,
                        value: `add-${inputText}`,
                    },
                ]);
            } else if (filtered.length === 0 && inputText) {
                setFilteredOptions([
                    {
                        isNoMatch: true,
                        label: 'No matches found',
                        value: 'no-match',
                    },
                ]);
            } else if (onAddOption && inputText && !exactMatch) {
                setFilteredOptions([
                    ...filtered,
                    {
                        isAddOption: true,
                        label: inputText,
                        value: `add-${inputText}`,
                    },
                ]);
            } else {
                setFilteredOptions(filtered);
            }
        },
        [options, onAddOption]
    );

    const handleSelectOption = useCallback(
        (optionValue) => {
            const newValue = String(optionValue);
            setCurrentValue(newValue);
            setIsEditing(false);
            if (String(newValue) !== String(value)) {
                const selectedOption = options.find(
                    (opt) => String(opt.value) === String(newValue)
                );
                onValueChange({
                    value: newValue,
                    label: selectedOption ? selectedOption.label : newValue,
                    color: selectedOption?.color,
                });
            }
            setTimeout(() => valueRef.current?.focus(), 0);
        },
        [value, onValueChange, options]
    );

    const handleAddOption = useCallback(
        (newLabel) => {
            if (onAddOption) {
                onAddOption(newLabel);
                setIsEditing(false);
                setCurrentValue('');
                setTimeout(() => valueRef.current?.focus(), 0);
            }
        },
        [onAddOption]
    );

    const handleKeyDown = useCallback(
        (e) => {
            if (!isEditing && e.key === 'Enter') {
                e.preventDefault();
                setCurrentValue(String(value || ''));
                setFilteredOptions(options);
                setIsEditing(true);
            } else if (isEditing) {
                if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                    const validOptions = filteredOptions.filter((opt) => !opt.isNoMatch);
                    if (validOptions.length > 0) {
                        handleSelectOption(validOptions[0].value);
                    } else if (filteredOptions[0]?.isAddOption && onAddOption) {
                        handleAddOption(filteredOptions[0].label);
                    }
                } else if (e.key === 'ArrowDown' && e.target === inputRef.current) {
                    e.preventDefault();
                    const firstValidIndex = filteredOptions.findIndex(
                        (opt) => !opt.isNoMatch
                    );
                    if (firstValidIndex >= 0 && optionsListRef.current) {
                        const optionElement =
                            optionsListRef.current.children[firstValidIndex];
                        optionElement?.focus();
                    }
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setIsEditing(false);
                    setCurrentValue(String(value || ''));
                    setFilteredOptions(options);
                    setTimeout(() => valueRef.current?.focus(), 0);
                }
            }
        },
        [
            isEditing,
            value,
            options,
            filteredOptions,
            onAddOption,
            handleSelectOption,
            handleAddOption,
        ]
    );

    useClickOutside(overlayRef, () => {
        setIsEditing(false);
        setCurrentValue(String(value || ''));
        setFilteredOptions(options);
        setTimeout(() => valueRef.current?.focus(), 0);
    }, isEditing);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select?.();
        }
    }, [isEditing]);

    useEffect(() => {
        if (!isEditing) {
            setCurrentValue(String(value || ''));
            setFilteredOptions(options);
        }
    }, [value, options, isEditing]);

    return {
        isEditing,
        currentValue,
        setCurrentValue,
        filteredOptions,
        setFilteredOptions,
        handleSelectOption,
        handleAddOption,
        inputRef,
        valueRef,
        overlayRef,
        optionsListRef,
        handleClick,
        handleSave,
        handleChange,
        handleKeyDown,
        setIsEditing,
        initialValue: String(value || ''),
    };
};

export default useSelectEdit;