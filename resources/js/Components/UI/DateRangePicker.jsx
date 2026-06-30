import React, { useReducer, useRef, useCallback, memo } from 'react';
import useOnClickOutside from '../../Hooks/useOnClickOutside';

// ========== REDUCER ==========
const ACTIONS = {
    OPEN: 'OPEN',
    CLOSE: 'CLOSE',
    PREV_MONTH: 'PREV_MONTH',
    NEXT_MONTH: 'NEXT_MONTH',
    PICK_DATE: 'PICK_DATE',
    SET_TODAY: 'SET_TODAY',
};

function createInitialState(dateFrom, dateTo) {
    const start = dateFrom ? new Date(dateFrom + 'T00:00:00') : null;
    const end = dateTo ? new Date(dateTo + 'T00:00:00') : null;
    const calDate = start ? new Date(start) : new Date();
    return {
        isOpen: false,
        calYear: calDate.getFullYear(),
        calMonth: calDate.getMonth(),
        rangeStart: start,
        rangeEnd: end,
        clickCount: start && end ? 2 : start ? 1 : 0,
    };
}

function reducer(state, action) {
    switch (action.type) {
        case ACTIONS.OPEN:
            return { ...state, isOpen: true };
        case ACTIONS.CLOSE:
            return { ...state, isOpen: false };
        case ACTIONS.PREV_MONTH: {
            let m = state.calMonth - 1;
            let y = state.calYear;
            if (m < 0) { m = 11; y--; }
            return { ...state, calMonth: m, calYear: y };
        }
        case ACTIONS.NEXT_MONTH: {
            let m = state.calMonth + 1;
            let y = state.calYear;
            if (m > 11) { m = 0; y++; }
            return { ...state, calMonth: m, calYear: y };
        }
        case ACTIONS.PICK_DATE: {
            const picked = action.payload;
            if (state.clickCount === 0 || state.clickCount === 2) {
                return { ...state, rangeStart: picked, rangeEnd: null, clickCount: 1 };
            } else {
                // clickCount === 1
                if (picked.getTime() === state.rangeStart.getTime()) {
                    return { ...state, rangeEnd: picked, clickCount: 2 };
                } else if (picked < state.rangeStart) {
                    return { ...state, rangeEnd: state.rangeStart, rangeStart: picked, clickCount: 2 };
                } else {
                    return { ...state, rangeEnd: picked, clickCount: 2 };
                }
            }
        }
        case ACTIONS.SET_TODAY: {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return {
                ...state,
                rangeStart: today,
                rangeEnd: today,
                clickCount: 2,
                calYear: today.getFullYear(),
                calMonth: today.getMonth(),
            };
        }
        default:
            return state;
    }
}

// ========== HELPERS ==========
function pad(n) { return n < 10 ? '0' + n : n; }
function formatISO(dt) { return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate()); }
function formatDisplay(dt) { return pad(dt.getDate()) + '/' + pad(dt.getMonth() + 1) + '/' + dt.getFullYear(); }

const MONTH_NAMES = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];
const DOWS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

// ========== COMPONENT ==========
const DateRangePicker = memo(function DateRangePicker({ dateFrom, dateTo, onChange }) {
    const [state, dispatch] = useReducer(reducer, { dateFrom, dateTo }, () => createInitialState(dateFrom, dateTo));
    const ref = useRef(null);

    const close = useCallback(() => dispatch({ type: ACTIONS.CLOSE }), []);
    useOnClickOutside(ref, close);

    const { isOpen, calYear, calMonth, rangeStart, rangeEnd } = state;

    // Build calendar grid
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const adjustedFirst = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const calDays = [];
    for (let i = 0; i < adjustedFirst; i++) {
        calDays.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
        calDays.push(new Date(calYear, calMonth, d));
    }

    const handlePick = useCallback((dt) => {
        dispatch({ type: ACTIONS.PICK_DATE, payload: dt });
    }, []);

    const handleApply = useCallback(() => {
        if (!rangeStart) return;
        const from = rangeEnd && rangeEnd < rangeStart ? rangeEnd : rangeStart;
        const to = rangeEnd || rangeStart;
        onChange(formatISO(from), formatISO(to));
        dispatch({ type: ACTIONS.CLOSE });
    }, [rangeStart, rangeEnd, onChange]);

    const handleToday = useCallback(() => {
        dispatch({ type: ACTIONS.SET_TODAY });
    }, []);

    // Display text
    const displayText = (() => {
        const from = dateFrom ? new Date(dateFrom + 'T00:00:00') : null;
        const to = dateTo ? new Date(dateTo + 'T00:00:00') : null;
        if (!from) return 'Chọn ngày';
        if (!to || from.getTime() === to.getTime()) return formatDisplay(from);
        return formatDisplay(from) + ' — ' + formatDisplay(to);
    })();

    return (
        <div className="date-range-wrapper" ref={ref}>
            <div
                className={`date-range-display ${isOpen ? 'active' : ''}`}
                onClick={() => dispatch({ type: isOpen ? ACTIONS.CLOSE : ACTIONS.OPEN })}
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>{displayText}</span>
            </div>

            {isOpen && (
                <div className="calendar-popup open">
                    <div className="cal-header">
                        <button type="button" className="cal-nav" onClick={() => dispatch({ type: ACTIONS.PREV_MONTH })}>‹</button>
                        <span>{MONTH_NAMES[calMonth]}, {calYear}</span>
                        <button type="button" className="cal-nav" onClick={() => dispatch({ type: ACTIONS.NEXT_MONTH })}>›</button>
                    </div>

                    <div className="cal-grid">
                        {DOWS.map(d => <div key={d} className="cal-dow">{d}</div>)}
                        {calDays.map((dt, i) => {
                            if (!dt) return <div key={`e${i}`} className="cal-day empty"></div>;

                            let cls = 'cal-day';
                            if (dt.getTime() === today.getTime()) cls += ' today';
                            if (rangeStart && rangeEnd) {
                                const s = rangeStart.getTime(), e = rangeEnd.getTime(), c = dt.getTime();
                                if (c === s || c === e) cls += ' selected';
                                else if (c > s && c < e) cls += ' in-range';
                            } else if (rangeStart && dt.getTime() === rangeStart.getTime()) {
                                cls += ' selected';
                            }

                            return (
                                <div key={dt.getTime()} className={cls} onClick={() => handlePick(dt)}>
                                    {dt.getDate()}
                                </div>
                            );
                        })}
                    </div>

                    <div className="cal-footer">
                        <button type="button" className="cal-footer-btn secondary" onClick={handleToday}>Hôm nay</button>
                        <button type="button" className="cal-footer-btn primary" onClick={handleApply}>Áp dụng</button>
                    </div>
                </div>
                
            )}
        </div>
    );
});

export default DateRangePicker;
