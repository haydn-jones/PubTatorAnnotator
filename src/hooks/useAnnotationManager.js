import { useState } from 'react';

/**
 * Custom hook for managing annotations in documents
 * @param {Array} initialDocuments - Initial array of documents
 * @param {Array} initialEntityTypes - Initial array of entity types
 * @returns {Object} Annotation management functions and state
 */
export const useAnnotationManager = (initialDocuments = [], initialEntityTypes = []) => {
  const [documents, setDocuments] = useState(initialDocuments);
  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const [knownEntityTypes, setKnownEntityTypes] = useState(initialEntityTypes);

  // Get current document or empty placeholder
  const currentDoc = documents[currentDocIndex] || { id: '', title: '', abstract: '', annotations: [] };

  // Set all documents
  const setAllDocuments = (docs) => {
    setDocuments(docs);
    setCurrentDocIndex(0);
  };

  // Add a new annotation to current document
  const addAnnotation = (annotation) => {
    const updatedDocs = [...documents];
    updatedDocs[currentDocIndex].annotations.push({
      ...annotation,
      id: currentDoc.id
    });

    // Sort annotations by start position
    updatedDocs[currentDocIndex].annotations.sort((a, b) => a.start - b.start);
    setDocuments(updatedDocs);
  };

  // Edit an annotation in current document
  const editAnnotation = (index, updatedAnnotation) => {
    const updatedDocs = [...documents];
    updatedDocs[currentDocIndex].annotations[index] = {
      ...updatedAnnotation,
      id: currentDoc.id
    };
    setDocuments(updatedDocs);
  };

  // Delete an annotation from current document
  const deleteAnnotation = (index) => {
    const updatedDocs = [...documents];
    updatedDocs[currentDocIndex].annotations.splice(index, 1);
    setDocuments(updatedDocs);
  };

  // Find index of an annotation by its properties
  const findAnnotationIndex = (annotation) => {
    return currentDoc.annotations.findIndex(
      anno => anno.start === annotation.start &&
        anno.end === annotation.end &&
        anno.text === annotation.text
    );
  };

  // Add new entity type if it doesn't exist
  const addNewEntityType = (newType) => {
    if (newType && !knownEntityTypes.includes(newType)) {
      setKnownEntityTypes([...knownEntityTypes, newType]);
    }
  };

  return {
    documents,
    setDocuments,
    currentDocIndex, 
    setCurrentDocIndex,
    currentDoc,
    knownEntityTypes,
    setKnownEntityTypes,
    addAnnotation,
    editAnnotation,
    deleteAnnotation,
    findAnnotationIndex,
    addNewEntityType,
    setAllDocuments
  };
};
