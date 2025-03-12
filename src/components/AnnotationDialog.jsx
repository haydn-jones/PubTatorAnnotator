import React, { useEffect, useState } from 'react';

const AnnotationDialog = ({
  onSubmit,
  knownEntityTypes,
  editMode = false,
  annotation = null,
  onDelete = null,
  documentText = '',
  selectedText = null
}) => {
  const [formValues, setFormValues] = useState({
    start: '',
    end: '',
    text: '',
    type: '',
    newTypeName: '',
    normalizedId: ''
  });

  // Initialize form values when in edit mode, annotation changes, or selectedText changes
  useEffect(() => {
    if (editMode && annotation) {
      setFormValues({
        start: annotation.start,
        end: annotation.end,
        text: annotation.text,
        type: annotation.type,
        newTypeName: '',
        normalizedId: annotation.normalizedId || ''
      });
    } else if (!editMode && selectedText) {
      // Use the selected text info directly from props
      setFormValues({
        start: selectedText.start,
        end: selectedText.end,
        text: selectedText.text,
        type: '',
        newTypeName: '',
        normalizedId: ''
      });
    } else if (!editMode) {
      // Reset form for add mode without selection
      setFormValues({
        start: '',
        end: '',
        text: '',
        type: '',
        newTypeName: '',
        normalizedId: ''
      });
    }
  }, [editMode, annotation, selectedText]);

  // Add JavaScript to show/hide the new type field
  useEffect(() => {
    const typeSelect = document.getElementById('new-type');
    const newTypeContainer = document.getElementById('new-type-container');

    if (typeSelect && newTypeContainer) {
      const handleChange = function () {
        if (this.value === '__new__') {
          newTypeContainer.style.display = 'block';
          document.getElementById('new-type-name').focus();
        } else {
          newTypeContainer.style.display = 'none';
        }
      };

      typeSelect.addEventListener('change', handleChange);

      // Initial state
      if (typeSelect.value === '__new__') {
        newTypeContainer.style.display = 'block';
      } else {
        newTypeContainer.style.display = 'none';
      }

      return () => {
        if (typeSelect) {
          typeSelect.removeEventListener('change', handleChange);
        }
      };
    }
  }, [formValues.type]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: value
    }));

    // Update text when start or end positions change
    if ((name === 'start' || name === 'end') && documentText) {
      const start = name === 'start' ? parseInt(value) : parseInt(formValues.start);
      const end = name === 'end' ? parseInt(value) : parseInt(formValues.end);

      // Only update if both values are valid numbers and we have document text
      if (!isNaN(start) && !isNaN(end) && start >= 0 && end > start && end <= documentText.length) {
        const newText = documentText.substring(start, end);
        setFormValues(prev => ({
          ...prev,
          text: newText
        }));
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    let type = formValues.type;
    if (type === '__new__' && formValues.newTypeName.trim()) {
      type = formValues.newTypeName.trim();
    }

    const annotationData = {
      start: parseInt(formValues.start),
      end: parseInt(formValues.end),
      text: formValues.text,
      type: type,
      normalizedId: formValues.normalizedId.trim() || null
    };

    onSubmit(e, annotationData, editMode);
    document.getElementById('add-annotation-dialog').close();
  };

  const handleDelete = () => {
    if (onDelete && editMode && annotation) {
      onDelete(annotation);
      document.getElementById('add-annotation-dialog').close();
    }
  };

  return (
    <dialog id="add-annotation-dialog" className="p-0 rounded-lg shadow-xl w-full max-w-md">
      <div className="bg-gray-100 px-4 py-3 flex justify-between items-center">
        <h3 className="font-semibold">{editMode ? 'Edit Annotation' : 'Add New Annotation'}</h3>
        <button
          onClick={() => document.getElementById('add-annotation-dialog').close()}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      <form onSubmit={handleSubmit} className="p-4">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Position:</label>
            <input
              type="number"
              name="start"
              id="new-start"
              min="0"
              required
              value={formValues.start}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Position:</label>
            <input
              type="number"
              name="end"
              id="new-end"
              min="1"
              required
              value={formValues.end}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Text:</label>
          <input
            type="text"
            name="text"
            id="new-text"
            required
            value={formValues.text}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Type:</label>
          <select
            name="type"
            id="new-type"
            required
            value={formValues.type}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          >
            <option value="">Select entity type</option>
            {knownEntityTypes.sort().map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
            <option value="__new__">+ Add new type</option>
          </select>
        </div>
        <div className="mb-4" id="new-type-container" style={{ display: 'none' }}>
          <label className="block text-sm font-medium mb-1">New Type Name:</label>
          <input
            type="text"
            name="newTypeName"
            id="new-type-name"
            value={formValues.newTypeName}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Normalized ID (optional):</label>
          <input
            type="text"
            name="normalizedId"
            id="new-normalized-id"
            value={formValues.normalizedId}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            placeholder="Optional identifier for this entity"
          />
        </div>
        <div className="flex justify-end gap-2">
          {editMode && onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 mr-auto"
            >
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={() => document.getElementById('add-annotation-dialog').close()}
            className="px-4 py-2 border rounded"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            {editMode ? 'Update Annotation' : 'Add Annotation'}
          </button>
        </div>
      </form>
    </dialog>
  );
};

export default AnnotationDialog;
