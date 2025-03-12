import React, { useState, useRef } from 'react';
import AnnotationRow from './components/AnnotationRow';
import AnnotationDialog from './components/AnnotationDialog';
import DocumentNavigation from './components/DocumentNavigation';
import { parsePubtator, generateExportContent } from './utils/pubtatorUtils';
import { getCombinedText, renderHighlightedText, getTextSelectionInfo } from './components/textHighlight';

const PubTatorEditor = () => {
  const [documents, setDocuments] = useState([]);
  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [knownEntityTypes, setKnownEntityTypes] = useState(['Chemical', 'Gene', 'Disease', 'Species', 'Mutation', 'CellLine']);
  const [originalFilename, setOriginalFilename] = useState('pubtator_annotations.txt');
  const [regexPattern, setRegexPattern] = useState('');
  const fullTextRef = useRef(null);

  // Get current document or empty placeholder
  const currentDoc = documents[currentDocIndex] || { id: '', title: '', abstract: '', annotations: [] };

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
        setDocuments(docs);
        setCurrentDocIndex(0);
        setKnownEntityTypes([...entityTypes]);
      };
      reader.readAsText(file);
    }
  };

  // Handle pasting content
  const handleImportSubmit = () => {
    if (importText.trim()) {
      const { docs, entityTypes } = parsePubtator(importText);
      setDocuments(docs);
      setCurrentDocIndex(0);
      setKnownEntityTypes([...entityTypes]);
      setShowImportModal(false);
      setImportText('');
    }
  };

  // Add a new annotation
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

  // Edit an annotation
  const editAnnotation = (index, updatedAnnotation) => {
    const updatedDocs = [...documents];
    updatedDocs[currentDocIndex].annotations[index] = {
      ...updatedAnnotation,
      id: currentDoc.id
    };
    setDocuments(updatedDocs);
  };

  // Delete an annotation
  const deleteAnnotation = (index) => {
    const updatedDocs = [...documents];
    updatedDocs[currentDocIndex].annotations.splice(index, 1);
    setDocuments(updatedDocs);
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
        // Find the dialog element and open it
        const dialog = document.getElementById('add-annotation-dialog');

        // Set form values
        document.getElementById('new-start').value = selectionInfo.start;
        document.getElementById('new-end').value = selectionInfo.end;
        document.getElementById('new-text').value = selectionInfo.text;

        // Focus the type field
        setTimeout(() => {
          document.getElementById('new-type').focus();
        }, 100);

        if (dialog) {
          dialog.showModal();
        }
      }
    }
  };

  // Add a new annotation from the form
  const handleAddAnnotationSubmit = (e) => {
    e.preventDefault();
    const form = e.target;
    const start = parseInt(form.start.value);
    const end = parseInt(form.end.value);
    const text = form.text.value;

    let type = form.type.value;
    if (type === '__new__' && form.newTypeName.value.trim()) {
      type = form.newTypeName.value.trim();
      if (!knownEntityTypes.includes(type)) {
        setKnownEntityTypes([...knownEntityTypes, type]);
      }
    }

    const normalizedId = form.normalizedId.value.trim() || null;

    if (start >= 0 && end > start && text && type) {
      addAnnotation({
        start,
        end,
        text,
        type,
        normalizedId
      });
      form.reset();
      document.getElementById('add-annotation-dialog').close();
    }
  };

  // Add a new entity type to the global list
  const addNewEntityType = (newType) => {
    if (newType && !knownEntityTypes.includes(newType)) {
      setKnownEntityTypes([...knownEntityTypes, newType]);
    }
  };

  // Create a new empty document
  const createNewDocument = () => {
    const newDoc = {
      id: `doc_${Date.now()}`,
      title: 'New Document',
      abstract: '',
      annotations: []
    };

    setDocuments([...documents, newDoc]);
    setCurrentDocIndex(documents.length);
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
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            onClick={() => setShowImportModal(true)}
          >
            Paste Content
          </button>
          <button
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            onClick={createNewDocument}
          >
            New Document
          </button>
          <button
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
            onClick={saveToFile}
            disabled={documents.length === 0}
          >
            Export
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
                {renderHighlightedText(currentDoc, regexPattern)}
              </div>
            </div>
          </div>

          {/* Annotations table */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xl font-bold">Annotations</h2>
              <button
                onClick={() => document.getElementById('add-annotation-dialog').showModal()}
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
          <p className="text-gray-500">Upload a PubTator file or paste content to get started</p>
        </div>
      )}

      {/* Add annotation dialog - replaced with component */}
      <AnnotationDialog
        onSubmit={handleAddAnnotationSubmit}
        knownEntityTypes={knownEntityTypes}
      />

      {/* Import text modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <div className="bg-gray-100 px-4 py-3 flex justify-between items-center">
              <h3 className="font-semibold">Paste PubTator Content</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="w-full p-2 border rounded h-64"
                placeholder="Paste PubTator content here..."
              />
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportSubmit}
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                  disabled={!importText.trim()}
                >
                  Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PubTatorEditor;