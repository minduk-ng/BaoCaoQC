import React, { useState, useRef, useCallback, memo } from 'react';
import useOnClickOutside from '../../Hooks/useOnClickOutside';

const Dropdown = memo(function Dropdown({ buttonLabel, icon, badge, align = 'left', children }) {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef(null);

    const close = useCallback(() => setIsOpen(false), []);
    useOnClickOutside(ref, close);

    return (
        <div className="filter-group dropdown-wrapper" ref={ref}>
            <button
                type="button"
                className="dropdown-btn"
                onClick={() => setIsOpen(prev => !prev)}
            >
                {icon}
                {buttonLabel}
                {badge > 0 && (
                    <span style={{
                        background: 'var(--accent)', color: '#fff',
                        fontSize: '10px', padding: '2px 6px',
                        borderRadius: '10px', marginLeft: '2px'
                    }}>
                        {badge}
                    </span>
                )}
            </button>
            {isOpen && (
                <div className={`dropdown-panel ${align}`}>
                    {children}
                </div>
            )}
        </div>
    );
});

export default Dropdown;
