import React, { useState, useEffect } from 'react';

export default function FilterModal({
    isOpen,
    onClose,
    onApply,
    groupMode,
    allSources,
    selectedSources,
    allRegions,
    selectedRegions,
    allOs,
    selectedOs,
    allFormats,
    selectedFormats,
    allTypes,
    selectedTypes,
    currency,
}) {
    // Local state to track selections before applying
    const [localSources, setLocalSources] = useState([...selectedSources]);
    const [localRegions, setLocalRegions] = useState([...selectedRegions]);
    const [localOs, setLocalOs] = useState([...selectedOs]);
    const [localFormats, setLocalFormats] = useState([...selectedFormats]);
    const [localTypes, setLocalTypes] = useState([...selectedTypes]);
    const [localCurrency, setLocalCurrency] = useState(currency || 'vnd');

    useEffect(() => {
        if (isOpen) {
            setLocalSources([...selectedSources]);
            setLocalRegions([...selectedRegions]);
            setLocalOs([...selectedOs]);
            setLocalFormats([...selectedFormats]);
            setLocalTypes([...selectedTypes]);
            setLocalCurrency(currency || 'vnd');
        }
    }, [isOpen, selectedSources, selectedRegions, selectedOs, selectedFormats, selectedTypes, currency]);

    if (!isOpen) return null;

    const toggleSelection = (item, currentList, setList) => {
        if (currentList.includes(item)) {
            setList(currentList.filter(i => i !== item));
        } else {
            setList([...currentList, item]);
        }
    };

    const handleApply = () => {
        onApply({
            sources: localSources,
            regions: localRegions,
            os_filter: groupMode === 'os' ? localOs : [],
            formats: groupMode === 'os' ? localFormats : [],
            types: groupMode === 'os' ? localTypes : [],
            currency: localCurrency,
        });
        onClose();
    };

    const renderSection = (title, items, selectedItems, setList) => {
        if (!items || items.length === 0) return null;
        return (
            <div className="filter-section">
                <div className="filter-section-title">{title}</div>
                <div className="filter-chips">
                    {items.map(item => (
                        <button
                            key={item}
                            className={`filter-chip ${selectedItems.includes(item) ? 'active' : ''}`}
                            onClick={() => toggleSelection(item, selectedItems, setList)}
                        >
                            {item}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="filter-modal-overlay" onClick={onClose}>
            
            <div className="filter-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="filter-modal-header">
                    <h3>Bộ lọc dữ liệu</h3>
                    <button className="filter-modal-close" onClick={onClose}>&times;</button>
                </div>
                
                <div className="filter-modal-body">
                    {/* Currency Section */}
                    <div className="filter-section">
                        <div className="filter-section-title">Tiền tệ</div>
                        <div className="currency-toggle" style={{ display: 'flex', maxWidth: '200px' }}>
                            <button
                                type="button"
                                className={`currency-btn ${localCurrency === 'vnd' ? 'active' : ''}`}
                                onClick={() => setLocalCurrency('vnd')}
                                style={{ flex: 1, padding: '8px 0', fontSize: '12px' }}
                            >VND</button>
                            <button
                                type="button"
                                className={`currency-btn ${localCurrency === 'usd' ? 'active' : ''}`}
                                onClick={() => setLocalCurrency('usd')}
                                style={{ flex: 1, padding: '8px 0', fontSize: '12px' }}
                            >USD</button>
                        </div>
                    </div>

                    {renderSection('Source', allSources, localSources, setLocalSources)}
                    {renderSection('Region', allRegions, localRegions, setLocalRegions)}
                    
                    {groupMode === 'os' && (
                        <>
                            {renderSection('OS', allOs, localOs, setLocalOs)}
                            {renderSection('Format', allFormats, localFormats, setLocalFormats)}
                            {renderSection('Type', allTypes, localTypes, setLocalTypes)}
                        </>
                    )}
                </div>

                <div className="filter-modal-footer">
                    <button className="filter-btn-outline" onClick={onClose}>Đóng</button>
                    <button className="filter-btn-primary" onClick={handleApply}>Xem kết quả</button>
                </div>
            </div>
            
        </div>
    );
}
