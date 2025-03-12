import React from 'react';
import { getEntityColor, getPotentialMatchStyle, getRegexMatchStyle } from '../utils/colorUtils';

/**
 * Get combined text from title and abstract
 * @param {Object} document - The document with title and abstract
 * @returns {string} Combined text
 */
export const getCombinedText = (document) => {
    return document.title + (document.abstract ? " " + document.abstract : "");
};

// Helper function to escape special regex characters
const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Helper function to check if two ranges overlap
const rangesOverlap = (start1, end1, start2, end2) => {
    return (start1 < end2 && end1 > start2);
};

/**
 * Process document text and create segments with all types of highlights in a single pass
 * @param {string} combinedText - Combined document text
 * @param {Array} annotations - Array of annotation objects
 * @param {string} regexPattern - Optional regex pattern to highlight
 * @returns {Array} Processed segments
 */
export const processTextSegments = (combinedText, annotations, regexPattern = '') => {
    if (!combinedText) return [];

    // Create a map of positions to mark in the text
    const positions = [];

    // Step 1: Add annotation positions
    annotations.forEach(anno => {
        positions.push({
            start: anno.start,
            end: anno.end,
            type: 'annotation',
            entityType: anno.type
        });
    });

    // Step 2: Create a map of unique annotated texts
    const uniqueAnnotatedTexts = new Map();
    for (const anno of annotations) {
        // Only consider annotations with reasonable length
        if (anno.text.length >= 1 && anno.text.length <= 50) {
            uniqueAnnotatedTexts.set(anno.text.toLowerCase(), anno.type);
        }
    }

    // Step 3: Find potential matches in text
    for (const [annoText, entityType] of uniqueAnnotatedTexts.entries()) {
        const pattern = new RegExp(escapeRegExp(annoText), 'gi');
        let match;

        while ((match = pattern.exec(combinedText)) !== null) {
            const matchStart = match.index;
            const matchEnd = matchStart + match[0].length;

            // Skip if this match overlaps with an existing annotation
            const overlapsAnnotation = positions.some(pos =>
                pos.type === 'annotation' &&
                rangesOverlap(matchStart, matchEnd, pos.start, pos.end)
            );

            if (!overlapsAnnotation) {
                positions.push({
                    start: matchStart,
                    end: matchEnd,
                    type: 'potential',
                    entityType
                });
            }
        }
    }

    // Step 4: Add regex matches if pattern provided
    if (regexPattern && regexPattern.trim()) {
        try {
            const regex = new RegExp(regexPattern, 'gi');
            let match;

            while ((match = regex.exec(combinedText)) !== null) {
                const matchStart = match.index;
                const matchEnd = matchStart + match[0].length;

                // Skip if this match overlaps with any existing position
                const overlapsOther = positions.some(pos =>
                    rangesOverlap(matchStart, matchEnd, pos.start, pos.end)
                );

                if (!overlapsOther) {
                    positions.push({
                        start: matchStart,
                        end: matchEnd,
                        type: 'regex'
                    });
                }
            }
        } catch (error) {
            console.error('Invalid regex pattern:', error);
        }
    }

    // Step 5: Sort positions by start index to create segments in order
    positions.sort((a, b) => a.start - b.start);

    // Step 6: Create segments based on positions
    const segments = [];
    let lastEnd = 0;

    for (const pos of positions) {
        // Add regular text before this position if needed
        if (pos.start > lastEnd) {
            segments.push({
                text: combinedText.substring(lastEnd, pos.start),
                highlighted: false
            });
        }

        // Add the highlighted segment
        segments.push({
            text: combinedText.substring(pos.start, pos.end),
            highlighted: pos.type === 'annotation' ? true : pos.type, // Maintain compatibility with existing code
            type: pos.entityType
        });

        lastEnd = pos.end;
    }

    // Add any remaining text
    if (lastEnd < combinedText.length) {
        segments.push({
            text: combinedText.substring(lastEnd),
            highlighted: false
        });
    }

    return segments;
};

/**
 * Render highlighted document text with annotations and regex matches
 * @param {Object} document - Document object with text and annotations
 * @param {string} regexPattern - Optional regex pattern to highlight
 * @returns {JSX.Element} Rendered JSX element with highlighted text
 */
export const renderHighlightedText = (document, regexPattern = '') => {
    const combinedText = getCombinedText(document);
    if (!combinedText) return <p>No content available</p>;

    const finalSegments = processTextSegments(combinedText, document.annotations, regexPattern);

    return (
        <p className="whitespace-pre-wrap">
            {finalSegments.map((segment, i) => {
                if (segment.highlighted === true) {
                    const colorClasses = getEntityColor(segment.type);
                    return (
                        <mark
                            key={i}
                            className={`border rounded px-[2px] ${colorClasses.highlight}`}
                            title={segment.type}
                        >
                            {segment.text}
                        </mark>
                    );
                } else if (segment.highlighted === 'potential') {
                    const potentialStyle = getPotentialMatchStyle();
                    return (
                        <span
                            key={i}
                            className={`${potentialStyle.text} ${potentialStyle.style}`}
                            title={`Potential ${segment.type}`}
                        >
                            {segment.text}
                        </span>
                    );
                } else if (segment.highlighted === 'regex') {
                    const regexStyle = getRegexMatchStyle();
                    return (
                        <span
                            key={i}
                            className={`${regexStyle.text} ${regexStyle.style}`}
                            title="Regex match"
                        >
                            {segment.text}
                        </span>
                    );
                }
                return <span key={i}>{segment.text}</span>;
            })}
        </p>
    );
};

/**
 * Calculate the exact text selection position in the document
 * @param {Object} selection - Window selection object
 * @param {HTMLElement} containerRef - Reference to the container element
 * @returns {Object} Selection start, end, and text
 */
export const getTextSelectionInfo = (selection, containerRef) => {
    if (!selection || !containerRef || selection.rangeCount === 0) {
        return null;
    }

    const text = selection.toString().trim();
    if (!text) return null;

    const selectionRange = selection.getRangeAt(0);
    const preSelectionRange = document.createRange();

    preSelectionRange.setStartBefore(containerRef);
    preSelectionRange.setEnd(selectionRange.startContainer, selectionRange.startOffset);

    const selectionStart = preSelectionRange.toString().length;

    return {
        start: selectionStart,
        end: selectionStart + text.length,
        text: text
    };
};