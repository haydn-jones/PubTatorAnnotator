import React, { useState, useRef, useEffect } from 'react';
import AnnotationRow from './components/AnnotationRow';
import AnnotationDialog from './components/AnnotationDialog';
import { getEntityColor } from './utils/colorUtils';

const PubTatorEditor = () => {
  const [documents, setDocuments] = useState([]);
  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [knownEntityTypes, setKnownEntityTypes] = useState(['Chemical', 'Gene', 'Disease', 'Species', 'Mutation', 'CellLine']);
  const fullTextRef = useRef(null);

  // Get current document or empty placeholder
  const currentDoc = documents[currentDocIndex] || { id: '', title: '', abstract: '', annotations: [] };
  
  // Get combined text (title + abstract)
  const getCombinedText = () => {
    return currentDoc.title + (currentDoc.abstract ? " " + currentDoc.abstract : "");
  };

  // Render highlighted document text (title + abstract)
  const renderHighlightedText = () => {
    const combinedText = getCombinedText();
    if (!combinedText) return <p>No content available</p>;
    
    const annotations = [...currentDoc.annotations].sort((a, b) => a.start - b.start);
    let lastEnd = 0;
    const segments = [];
    
    for (const anno of annotations) {
      // Text before annotation
      if (anno.start > lastEnd) {
        segments.push({
          text: combinedText.substring(lastEnd, anno.start),
          highlighted: false
        });
      }
      
      // Highlighted annotation
      segments.push({
        text: combinedText.substring(anno.start, anno.end),
        highlighted: true,
        type: anno.type
      });
      
      lastEnd = anno.end;
    }
    
    // Remaining text
    if (lastEnd < combinedText.length) {
      segments.push({
        text: combinedText.substring(lastEnd),
        highlighted: false
      });
    }
    
    return (
      <p className="whitespace-pre-wrap">
        {segments.map((segment, i) => {
          if (segment.highlighted) {
            const colorClasses = getEntityColor(segment.type);
            console.log(colorClasses);
            return (
              <mark 
                key={i} 
                className={`border rounded px-1 ${colorClasses.highlight}`}
                title={segment.type}
              >
                {segment.text}
              </mark>
            );
          }
          return <span key={i}>{segment.text}</span>;
        })}
      </p>
    );
  };

  // Parse PubTator content
  const parsePubtator = (content) => {
    const lines = content.split('\n').filter(line => line.trim() !== '');
    const docs = [];
    let currentDoc = null;
    const entityTypes = new Set();

    for (const line of lines) {
      if (line.includes('|t|')) {
        // Title line
        if (currentDoc) {
          docs.push(currentDoc);
        }
        const [id, _, title] = line.split('|');
        currentDoc = { id, title, abstract: '', annotations: [] };
      } else if (line.includes('|a|')) {
        // Abstract line
        const [_, __, abstract] = line.split('|');
        currentDoc.abstract = abstract;
      } else if (line.trim() !== '') {
        // Annotation line
        const parts = line.split('\t');
        if (parts.length >= 5) {
          const [id, start, end, text, type] = parts;
          const normalizedId = parts.length >= 6 ? parts[5] : null;
          
          // Track entity type
          entityTypes.add(type);
          
          currentDoc.annotations.push({
            id,
            start: parseInt(start),
            end: parseInt(end),
            text,
            type,
            normalizedId
          });
        }
      }
    }

    if (currentDoc) {
      docs.push(currentDoc);
    }
    
    // Update global entity types
    setKnownEntityTypes([...entityTypes]);

    return docs;
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        const parsedDocs = parsePubtator(content);
        setDocuments(parsedDocs);
        setCurrentDocIndex(0);
      };
      reader.readAsText(file);
    }
  };

  // Handle pasting content
  const handleImportSubmit = () => {
    if (importText.trim()) {
      const parsedDocs = parsePubtator(importText);
      setDocuments(parsedDocs);
      setCurrentDocIndex(0);
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

  // Generate export content
  const generateExportContent = () => {
    let content = '';
    
    for (const doc of documents) {
      // Title line
      content += `${doc.id}|t|${doc.title}\n`;
      
      // Abstract line
      content += `${doc.id}|a|${doc.abstract}\n`;
      
      // Annotation lines
      for (const anno of doc.annotations) {
        let annoLine = `${anno.id}\t${anno.start}\t${anno.end}\t${anno.text}\t${anno.type}`;
        
        // Add normalized ID if it exists
        if (anno.normalizedId) {
          annoLine += `\t${anno.normalizedId}`;
        }
        
        content += annoLine + '\n';
      }
      
      // Empty line between documents
      content += '\n';
    }
    
    return content;
  };

  // Save to file
  const saveToFile = () => {
    const content = generateExportContent();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pubtator_annotations.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle text selection for annotation
  const handleTextSelection = () => {
    if (window.getSelection && fullTextRef.current) {
      const selection = window.getSelection();
      const text = selection.toString().trim();
      
      if (text) {
        const fullText = fullTextRef.current.textContent;
        
        // Find all occurrences of the selected text
        let selectionStart = -1;
        const selectionRange = selection.getRangeAt(0);
        const preSelectionRange = document.createRange();
        
        preSelectionRange.setStartBefore(fullTextRef.current);
        preSelectionRange.setEnd(selectionRange.startContainer, selectionRange.startOffset);
        
        // Determine exact start position considering the combined text
        selectionStart = preSelectionRange.toString().length;
        
        if (selectionStart >= 0) {
          // Find the dialog element and open it
          const dialog = document.getElementById('add-annotation-dialog');
          
          // Set form values
          document.getElementById('new-start').value = selectionStart;
          document.getElementById('new-end').value = selectionStart + text.length;
          document.getElementById('new-text').value = text;
          
          // Focus the type field
          setTimeout(() => {
            document.getElementById('new-type').focus();
          }, 100);
          
          if (dialog) {
            dialog.showModal();
          }
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

  // Update document title or abstract
  const updateDocument = (field, value) => {
    const updatedDocs = [...documents];
    const oldTitle = updatedDocs[currentDocIndex].title;
    const oldAbstract = updatedDocs[currentDocIndex].abstract;
    
    // Update the document field
    updatedDocs[currentDocIndex][field] = value;
    
    // If title or abstract changed, we need to adjust annotation positions
    if (field === 'title' || field === 'abstract') {
      const oldCombinedText = oldTitle + (oldAbstract ? " " + oldAbstract : "");
      const newCombinedText = updatedDocs[currentDocIndex].title + 
        (updatedDocs[currentDocIndex].abstract ? " " + updatedDocs[currentDocIndex].abstract : "");
      
      // If this is the first content being added, no need to adjust
      if (oldCombinedText.trim() !== "") {
        // For now, we'll warn the user that positions might be off
        if (updatedDocs[currentDocIndex].annotations.length > 0) {
          alert("Warning: Editing the title or abstract text may cause annotation positions to become incorrect.");
        }
      }
    }
    
    setDocuments(updatedDocs);
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
        <div className="mb-4 flex items-center gap-2">
          <button 
            onClick={() => setCurrentDocIndex(Math.max(0, currentDocIndex - 1))}
            disabled={currentDocIndex === 0}
            className="bg-gray-200 px-3 py-1 rounded disabled:opacity-50"
          >
            ← Previous
          </button>
          <span>Document {currentDocIndex + 1} of {documents.length}</span>
          <button 
            onClick={() => setCurrentDocIndex(Math.min(documents.length - 1, currentDocIndex + 1))}
            disabled={currentDocIndex === documents.length - 1}
            className="bg-gray-200 px-3 py-1 rounded disabled:opacity-50"
          >
            Next →
          </button>
        </div>
      )}

      {/* Document content */}
      {documents.length > 0 ? (
        <div className="space-y-6">
          {/* Document info */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Document ID:</label>
              <input 
                type="text" 
                value={currentDoc.id} 
                onChange={(e) => updateDocument('id', e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <div 
                className="w-full p-3 border rounded bg-gray-50 min-h-[100px]"
                onMouseUp={handleTextSelection}
                ref={fullTextRef}
              >
                {renderHighlightedText()}
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
                        getEntityColor={getEntityColor}
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