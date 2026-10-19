import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'

export function CustomDropdown({
  value,
  onChange,
  options = [],
  placeholder = 'Select…',
  icon: TriggerIcon = null,
  className = '',
  menuClassName = '',
  align = 'left',
  disabled = false,
  title = '',
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0, openUpwards: false })
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  const selectedOption = options.find((opt) => opt.value === value)

  const updatePosition = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    if (rect.bottom < 30 || rect.top > window.innerHeight) {
      setIsOpen(false)
      return
    }
    const spaceBelow = window.innerHeight - rect.bottom
    const openUpwards = spaceBelow < 220 && rect.top > 220

    setMenuPosition({
      top: openUpwards ? rect.top - 6 : rect.bottom + 6,
      left: align === 'right' ? rect.right : rect.left,
      width: rect.width,
      openUpwards,
    })
  }

  const toggle = () => {
    if (disabled) return
    if (!isOpen) {
      updatePosition()
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
  }

  // Reposition on resize/scroll when open
  useEffect(() => {
    if (!isOpen) return
    const handleScrollOrResize = () => updatePosition()
    window.addEventListener('resize', handleScrollOrResize)
    window.addEventListener('scroll', handleScrollOrResize, true)
    return () => {
      window.removeEventListener('resize', handleScrollOrResize)
      window.removeEventListener('scroll', handleScrollOrResize, true)
    }
  }, [isOpen])

  // Outside click & escape key
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        menuRef.current &&
        !menuRef.current.contains(e.target)
      ) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handleClickOutside, true)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleSelect = (opt) => {
    if (opt.disabled) return
    onChange?.(opt.value)
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  const menu = isOpen ? (
    <div
      ref={menuRef}
      className={`custom-dropdown-portal ${menuClassName}`}
      style={{
        position: 'fixed',
        top: `${menuPosition.top}px`,
        ...(align === 'right'
          ? { right: `${window.innerWidth - menuPosition.left}px` }
          : { left: `${menuPosition.left}px` }),
        minWidth: `${Math.max(160, menuPosition.width)}px`,
        transform: menuPosition.openUpwards ? 'translateY(-100%)' : 'none',
        zIndex: 999999,
      }}
      role="listbox"
    >
      <div className="custom-dropdown-menu-inner">
        {options.map((opt) => {
          const isSelected = opt.value === value
          const Icon = opt.icon
          return (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={isSelected}
              disabled={opt.disabled}
              className={`custom-dropdown-item ${isSelected ? 'active' : ''} ${
                opt.disabled ? 'disabled' : ''
              }`}
              onClick={() => handleSelect(opt)}
            >
              <div className="custom-dropdown-item-left">
                {opt.colorDot ? (
                  <span
                    className="custom-dropdown-color-dot"
                    style={{ backgroundColor: opt.colorDot }}
                  />
                ) : null}
                {Icon ? <Icon size={14} className="custom-dropdown-item-icon" /> : null}
                <span className="custom-dropdown-item-label">{opt.label}</span>
              </div>
              <div className="custom-dropdown-item-right">
                {opt.badge ? (
                  <span className="custom-dropdown-badge">{opt.badge}</span>
                ) : isSelected ? (
                  <Check size={13} className="custom-dropdown-check" />
                ) : null}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  ) : null

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`custom-dropdown-trigger ${isOpen ? 'active' : ''} ${className}`}
        onClick={toggle}
        disabled={disabled}
        title={title}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="custom-dropdown-trigger-content">
          {selectedOption?.colorDot ? (
            <span
              className="custom-dropdown-color-dot"
              style={{ backgroundColor: selectedOption.colorDot }}
            />
          ) : null}
          {TriggerIcon ? <TriggerIcon size={13} className="custom-dropdown-trigger-icon" /> : null}
          <span className="custom-dropdown-trigger-label">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown size={12} className={`custom-dropdown-chevron ${isOpen ? 'open' : ''}`} />
      </button>
      {typeof document !== 'undefined' ? createPortal(menu, document.body) : null}
    </>
  )
}

export default CustomDropdown
