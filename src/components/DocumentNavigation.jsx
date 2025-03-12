import React, { useState, useRef, useEffect } from 'react';

/**
 * Document navigation component that handles navigation between documents
 * and search by document ID
 */
const DocumentNavigation = ({
    currentDocIndex,
    documentsCount,
    onNavigate,
    documents
}) => {
    const [docIdSearch, setDocIdSearch] = useState('');
    const [showDocIdDropdown, setShowDocIdDropdown] = useState(false);
    const docSearchRef = useRef(null);

    // Navigate to a specific document by ID
    const navigateToDocumentById = (id = null) => {
        const searchId = id || docIdSearch.trim();
        if (!searchId) return;

        const docIndex = documents.findIndex(doc => doc.id === searchId);

        if (docIndex !== -1) {
            onNavigate(docIndex);
            setDocIdSearch('');
            setShowDocIdDropdown(false);
        } else {
            alert(`Document with ID "${searchId}" not found`);
        }
    };

    // Handle enter key press in search box
    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') {
            navigateToDocumentById();
        } else if (e.key === 'ArrowDown' && !showDocIdDropdown) {
            setShowDocIdDropdown(true);
        } else if (e.key === 'Escape') {
            setShowDocIdDropdown(false);
        }
    };

    // Filter document IDs based on search term
    const filteredDocIds = documents
        .map(doc => doc.id)
        .filter(id => id.toLowerCase().includes(docIdSearch.toLowerCase()));

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (docSearchRef.current && !docSearchRef.current.contains(event.target)) {
                setShowDocIdDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
            <button
                onClick={() => onNavigate(Math.max(0, currentDocIndex - 1))}
                disabled={currentDocIndex === 0}
                className="bg-gray-200 px-3 py-1 rounded disabled:opacity-50"
            >
                ← Previous
            </button>
            <span>Document {currentDocIndex + 1} of {documentsCount}</span>
            <button
                onClick={() => onNavigate(Math.min(documentsCount - 1, currentDocIndex + 1))}
                disabled={currentDocIndex === documentsCount - 1}
                className="bg-gray-200 px-3 py-1 rounded disabled:opacity-50"
            >
                Next →
            </button>

            <div className="flex ml-auto gap-1 relative" ref={docSearchRef}>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Enter document ID"
                        value={docIdSearch}
                        onChange={(e) => {
                            setDocIdSearch(e.target.value);
                            setShowDocIdDropdown(true);
                        }}
                        onClick={() => setShowDocIdDropdown(true)}
                        onKeyDown={handleSearchKeyDown}
                        className="border rounded px-2 py-1 text-sm"
                    />
                    {showDocIdDropdown && filteredDocIds.length > 0 && (
                        <div className="absolute left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto z-10">
                            {filteredDocIds.map((id, index) => (
                                <div
                                    key={index}
                                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                    onClick={() => navigateToDocumentById(id)}
                                >
                                    {id}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <button
                    onClick={() => navigateToDocumentById()}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
                >
                    Go to ID
                </button>
            </div>
        </div>
    );
};

export default DocumentNavigation;
