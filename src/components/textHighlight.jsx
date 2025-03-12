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
 * Create positions from annotation data
 * @param {Array} annotations - Array of annotation objects
 * @returns {Array} Positions for annotations
 */
const createAnnotationPositions = (annotations) => {
    return annotations.map(anno => ({
        start: anno.start,
        end: anno.end,
        type: 'annotation',
        entityType: anno.type
    }));
};

/**
 * Create positions for potential matches
 * @param {string} text - Text to search in
 * @param {Map} uniqueTexts - Map of unique annotated texts to their types
 * @param {Array} existingPositions - Existing positions to check for overlap
 * @returns {Array} Potential match positions
 */
const createPotentialMatches = (text, uniqueTexts, existingPositions) => {
    const potentialPositions = [];

    // Convert Map entries to array and sort by text length (descending)
    // This ensures that longer matches are processed first
    const sortedEntries = [...uniqueTexts.entries()]
        .sort((a, b) => b[0].length - a[0].length);

    for (const [annoText, entityType] of sortedEntries) {
        const pattern = new RegExp(escapeRegExp(annoText), 'gi');
        let match;

        while ((match = pattern.exec(text)) !== null) {
            const matchStart = match.index;
            const matchEnd = matchStart + match[0].length;

            // Skip if this match overlaps with an existing annotation or another potential match
            const overlapsExisting = [...existingPositions, ...potentialPositions].some(pos =>
                rangesOverlap(matchStart, matchEnd, pos.start, pos.end)
            );

            if (!overlapsExisting) {
                potentialPositions.push({
                    start: matchStart,
                    end: matchEnd,
                    type: 'potential',
                    entityType
                });
            }
        }
    }

    return potentialPositions;
};

/**
 * Create a map of unique annotated texts
 * @param {Array} annotations - Annotations array
 * @returns {Map} Map of lowercase text to entity type
 */
const createUniqueTextMap = (annotations) => {
    const uniqueTexts = new Map();

    for (const anno of annotations) {
        // For very short texts (length < 2), only include if they contain a number
        const hasNumber = anno.text.length < 2 ? /\d/.test(anno.text) : true;

        // Only consider annotations with reasonable length and short ones with numbers
        if (hasNumber && anno.text.length >= 1 && anno.text.length <= 50) {
            uniqueTexts.set(anno.text.toLowerCase(), anno.type);
        }
    }

    return uniqueTexts;
};

/**
 * Create positions for regex matches
 * @param {string} text - Text to search in
 * @param {string} regexPattern - Regex pattern to match
 * @param {Array} existingPositions - Existing positions to check for overlap
 * @returns {Array} Regex match positions
 */
const createRegexMatches = (text, regexPattern, existingPositions) => {
    const regexPositions = [];

    if (!regexPattern || !regexPattern.trim()) return regexPositions;

    try {
        const regex = new RegExp(regexPattern, 'gi');
        let match;

        while ((match = regex.exec(text)) !== null) {
            const matchStart = match.index;
            const matchEnd = matchStart + match[0].length;

            // Skip if this match overlaps with any existing position
            const overlapsOther = existingPositions.some(pos =>
                rangesOverlap(matchStart, matchEnd, pos.start, pos.end)
            );

            if (!overlapsOther) {
                regexPositions.push({
                    start: matchStart,
                    end: matchEnd,
                    type: 'regex'
                });
            }
        }
    } catch (error) {
        console.error('Invalid regex pattern:', error);
    }

    return regexPositions;
};

/**
 * Create text segments from positions
 * @param {string} text - Source text
 * @param {Array} positions - Sorted positions array
 * @returns {Array} Text segments
 */
const createTextSegments = (text, positions) => {
    const segments = [];
    let lastEnd = 0;

    for (const pos of positions) {
        // Add regular text before this position if needed
        if (pos.start > lastEnd) {
            segments.push({
                text: text.substring(lastEnd, pos.start),
                highlighted: false
            });
        }

        // Add the highlighted segment
        segments.push({
            text: text.substring(pos.start, pos.end),
            highlighted: pos.type === 'annotation' ? true : pos.type, // Maintain compatibility with existing code
            type: pos.entityType,
            start: pos.start,
            end: pos.end
        });

        lastEnd = pos.end;
    }

    // Add any remaining text
    if (lastEnd < text.length) {
        segments.push({
            text: text.substring(lastEnd),
            highlighted: false
        });
    }

    return segments;
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

    // Step 1: Process annotations
    const annotationPositions = createAnnotationPositions(annotations);

    // Step 2: Create a map of unique annotated texts
    const uniqueAnnotatedTexts = createUniqueTextMap(annotations);

    // Step 3: Find potential matches in text
    const potentialPositions = createPotentialMatches(combinedText, uniqueAnnotatedTexts, annotationPositions);

    // Step 4: Add regex matches if pattern provided
    const allPositions = [...annotationPositions, ...potentialPositions];
    const regexPositions = createRegexMatches(combinedText, regexPattern, allPositions);

    // Combine all positions and sort by start index
    const positions = [...annotationPositions, ...potentialPositions, ...regexPositions];
    positions.sort((a, b) => a.start - b.start);

    // Step 5: Create segments based on positions
    const segments = createTextSegments(combinedText, positions);

    // Step 6: Update segments with exact annotation positions
    return updateSegmentsWithPositions(segments, annotations, combinedText);
};

/**
 * Render highlighted document text with annotations and regex matches
 * @param {Object} document - Document object with text and annotations
 * @param {string} regexPattern - Optional regex pattern to highlight
 * @param {Function} onAnnotationClick - Click handler for annotations
 * @param {Function} onAnnotationDelete - Right-click handler for annotations
 * @returns {JSX.Element} Rendered JSX element with highlighted text
 */
export const renderHighlightedText = (document, regexPattern = '', onAnnotationClick = null, onAnnotationDelete = null) => {
    const combinedText = getCombinedText(document);
    if (!combinedText) return <p>No content available</p>;

    const finalSegments = processTextSegments(combinedText, document.annotations, regexPattern);

    return (
        <p className="whitespace-pre-wrap">
            {finalSegments.map((segment, i) => {
                if (segment.highlighted === true) {
                    const colorClasses = getEntityColor(segment.type);
                    // Find the matching annotation for this segment
                    const annotation = document.annotations.find(
                        anno => anno.start === segment.start && anno.end === segment.end
                    );

                    return (
                        <mark
                            key={i}
                            className={`border rounded px-[2px] ${colorClasses.highlight} ${onAnnotationClick ? 'cursor-pointer hover:brightness-90' : ''}`}
                            title={`${segment.type}${annotation?.normalizedId ? ` (${annotation.normalizedId})` : ''}`}
                            onClick={() => onAnnotationClick && annotation && onAnnotationClick(annotation)}
                            onContextMenu={(e) => {
                                if (onAnnotationDelete && annotation) {
                                    e.preventDefault(); // Prevent default browser context menu
                                    onAnnotationDelete(annotation);
                                }
                            }}
                            data-annotation-index={annotation ? document.annotations.indexOf(annotation) : null}
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

/**
 * Update segments with start and end positions from annotations
 */
const updateSegmentsWithPositions = (segments, annotations, combinedText) => {
    let currentPosition = 0;

    return segments.map(segment => {
        const newSegment = { ...segment };
        newSegment.start = currentPosition;
        newSegment.end = currentPosition + segment.text.length;

        // For annotation segments, try to match with the original annotation
        if (segment.highlighted === true) {
            const matchingAnnotation = annotations.find(
                anno =>
                    combinedText.substring(anno.start, anno.end) === segment.text &&
                    Math.abs(anno.start - currentPosition) < 5 // Allow small position differences
            );

            if (matchingAnnotation) {
                newSegment.start = matchingAnnotation.start;
                newSegment.end = matchingAnnotation.end;
            }
        }

        currentPosition += segment.text.length;
        return newSegment;
    });
};