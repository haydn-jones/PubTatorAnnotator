import React, { useState, useRef } from 'react';
import AnnotationRow from './components/AnnotationRow';
import AnnotationDialog from './components/AnnotationDialog';
import DocumentNavigation from './components/DocumentNavigation';
import { parsePubtator, generateExportContent } from './utils/pubtatorUtils';
import { getCombinedText, renderHighlightedText, getTextSelectionInfo } from './components/textHighlight';
import { useAnnotationManager } from './hooks/useAnnotationManager';

const PubTatorEditor = () => {
  // Use our custom hook for annotation management
  const {
    documents,
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
  } = useAnnotationManager([], ['Chemical', 'Gene', 'Disease', 'Species', 'Mutation', 'CellLine']);

  const [originalFilename, setOriginalFilename] = useState('pubtator_annotations.txt');
  const [regexPattern, setRegexPattern] = useState('');
  const fullTextRef = useRef(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState(null);
  const [selectedText, setSelectedText] = useState(null);

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Store the original filename
      setOriginalFilename(file.name);

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        const { docs, entityTypes } = parsePubtator(content);
        setAllDocuments(docs);
        setKnownEntityTypes([...entityTypes]);
      };
      reader.readAsText(file);
    }
  };

  // Save to file
  const saveToFile = async () => {
    const content = generateExportContent(documents);

    // Try to use the File System Access API first
    if ('showSaveFilePicker' in window) {
      try {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: originalFilename,
          types: [
            {
              description: 'Text Files',
              accept: { 'text/plain': ['.txt', '.pubtator'] },
            },
          ],
        });

        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
      } catch (err) {
        // User cancelled the save dialog or other error
        console.error('Error saving file:', err);
        // Fall back to the download method
        downloadFile(content);
      }
    } else {
      // Fallback for browsers that don't support the File System Access API
      downloadFile(content);
    }
  };

  // Fallback download method
  const downloadFile = (content) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = originalFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle text selection for annotation
  const handleTextSelection = () => {
    if (window.getSelection && fullTextRef.current) {
      const selection = window.getSelection();
      const selectionInfo = getTextSelectionInfo(selection, fullTextRef.current);

      if (selectionInfo) {
        // Store the selection info in state
        setSelectedText(selectionInfo);

        // Find the dialog element and open it
        const dialog = document.getElementById('add-annotation-dialog');

        if (dialog) {
          dialog.showModal();
        }
      }
    }
  };

  // Handle annotation click
  const handleAnnotationClick = (annotation) => {
    setIsEditMode(true);
    setCurrentAnnotation(annotation);
    document.getElementById('add-annotation-dialog').showModal();
  };

  // Handle annotation deletion through right-click
  const handleRightClickDelete = (annotation) => {
    const index = findAnnotationIndex(annotation);
    if (index !== -1) {
      deleteAnnotation(index);
    }
  };

  // Delete an annotation from dialog
  const handleDeleteAnnotation = (annotation) => {
    const index = findAnnotationIndex(annotation);

    if (index !== -1) {
      deleteAnnotation(index);
    }

    // Reset editing state
    setIsEditMode(false);
    setCurrentAnnotation(null);
  };

  // Add or update an annotation from the form
  const handleAnnotationSubmit = (e, formData, isEditing) => {
    e.preventDefault();

    // Check if this is a new entity type and add it to known types
    if (formData.type && !knownEntityTypes.includes(formData.type)) {
      addNewEntityType(formData.type);
    }

    if (isEditing) {
      const index = findAnnotationIndex(currentAnnotation);

      if (index !== -1) {
        editAnnotation(index, {
          ...formData,
          id: currentDoc.id
        });
      }
    } else {
      addAnnotation({
        ...formData,
        id: currentDoc.id
      });
    }

    // Reset editing state
    setIsEditMode(false);
    setCurrentAnnotation(null);
  };

  // Open dialog for adding a new annotation
  const openAddAnnotationDialog = () => {
    setIsEditMode(false);
    setCurrentAnnotation(null);
    setSelectedText(null); // Clear any previous selection
    document.getElementById('add-annotation-dialog').showModal();
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2">PubTator Annotation Editor</h1>
        <div className="flex flex-wrap gap-2">
          <input
            type="file"
            accept=".txt,.tsv,.pubtator"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="bg-blue-600 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-700"
          >
            Load File
          </label>
          <button
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
            onClick={saveToFile}
            disabled={documents.length === 0}
          >
            Save
          </button>
        </div>
      </header>

      {/* Document navigation */}
      {documents.length > 0 && (
        <DocumentNavigation
          currentDocIndex={currentDocIndex}
          documentsCount={documents.length}
          onNavigate={setCurrentDocIndex}
          documents={documents}
        />
      )}

      {/* Document content */}
      {documents.length > 0 ? (
        <div className="space-y-6">
          {/* Document info */}
          <div className="bg-white rounded-lg shadow p-4">
            {/* Document ID display */}
            <div className="mb-3 pb-2 border-b">
              <div className="flex gap-2 items-center">
                <span className="font-medium text-gray-700">Document ID:</span>
                <span className="text-gray-900">{currentDoc.id}</span>
              </div>
            </div>

            {/* Add regex search box */}
            <div className="mb-3">
              <div className="flex gap-2 items-center">
                <label htmlFor="regex-search" className="font-medium text-gray-700">Regex Search:</label>
                <input
                  id="regex-search"
                  type="text"
                  value={regexPattern}
                  onChange={(e) => setRegexPattern(e.target.value)}
                  placeholder="Enter regex pattern..."
                  className="flex-1 border rounded px-3 py-1 text-sm"
                />
                <button
                  onClick={() => setRegexPattern('')}
                  className="bg-gray-200 px-2 py-1 rounded text-sm"
                  disabled={!regexPattern}
                >
                  Clear
                </button>
              </div>
            </div>

            <div>
              <div
                className="w-full p-3 border rounded bg-gray-50 min-h-[100px]"
                onMouseUp={handleTextSelection}
                ref={fullTextRef}
              >
                {renderHighlightedText(
                  currentDoc,
                  regexPattern,
                  handleAnnotationClick,
                  handleRightClickDelete
                )}
              </div>
            </div>
          </div>

          {/* Annotations table */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xl font-bold">Annotations</h2>
              <button
                onClick={openAddAnnotationDialog}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
              >
                Add Annotation
              </button>
            </div>

            {currentDoc.annotations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2 text-left">Start</th>
                      <th className="border p-2 text-left">End</th>
                      <th className="border p-2 text-left">Text</th>
                      <th className="border p-2 text-left">Type</th>
                      <th className="border p-2 text-left">Normalized ID</th>
                      <th className="border p-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentDoc.annotations.map((anno, index) => (
                      <AnnotationRow
                        key={index}
                        annotation={anno}
                        index={index}
                        onEdit={editAnnotation}
                        onDelete={deleteAnnotation}
                        knownEntityTypes={knownEntityTypes}
                        documentText={getCombinedText(currentDoc)}
                        onAddNewEntityType={addNewEntityType}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 italic">No annotations found. Select text in the abstract to add annotations.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-10 bg-gray-50 rounded">
          <p className="text-xl text-gray-600 mb-4">No documents loaded</p>
          <p className="text-gray-500">Upload a PubTator file to get started</p>
        </div>
      )}

      {/* Annotation dialog - now handles both adding, editing, and deletion */}
      <AnnotationDialog
        onSubmit={handleAnnotationSubmit}
        knownEntityTypes={knownEntityTypes}
        editMode={isEditMode}
        annotation={currentAnnotation}
        onDelete={handleDeleteAnnotation}
        documentText={getCombinedText(currentDoc)}
        selectedText={selectedText}
      />

    </div>
  );
};

export default PubTatorEditor;