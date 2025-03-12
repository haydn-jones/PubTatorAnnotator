import React, { useEffect } from 'react';

const AnnotationDialog = ({ onSubmit, knownEntityTypes }) => {

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

      return () => {
        if (typeSelect) {
          typeSelect.removeEventListener('change', handleChange);
        }
      };
    }
  }, []);

  return (
    <dialog id="add-annotation-dialog" className="p-0 rounded-lg shadow-xl w-full max-w-md">
      <div className="bg-gray-100 px-4 py-3 flex justify-between items-center">
        <h3 className="font-semibold">Add New Annotation</h3>
        <button
          onClick={() => document.getElementById('add-annotation-dialog').close()}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      <form onSubmit={onSubmit} className="p-4">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Position:</label>
            <input
              type="number"
              name="start"
              id="new-start"
              min="0"
              required
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
            className="w-full p-2 border rounded"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Type:</label>
          <select
            name="type"
            id="new-type"
            required
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
            className="w-full p-2 border rounded"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Normalized ID (optional):</label>
          <input
            type="text"
            name="normalizedId"
            id="new-normalized-id"
            className="w-full p-2 border rounded"
            placeholder="Optional identifier for this entity"
          />
        </div>
        <div className="flex justify-end gap-2">
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
            Add Annotation
          </button>
        </div>
      </form>
    </dialog>
  );
};

export default AnnotationDialog;
