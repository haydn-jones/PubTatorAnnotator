import React, { useState } from 'react';

const AnnotationRow = ({ annotation, index, onEdit, onDelete, knownEntityTypes, getEntityColor }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedAnnotation, setEditedAnnotation] = useState({ ...annotation });
  const [isCreatingNewType, setIsCreatingNewType] = useState(false);
  
  const colorClasses = getEntityColor(annotation.type);
  
  const handleSave = () => {
    let updatedAnnotation = { ...editedAnnotation };
    
    // If creating new type, use the custom type name
    if (isCreatingNewType && editedAnnotation.customType) {
      updatedAnnotation.type = editedAnnotation.customType;
    }
    
    onEdit(index, updatedAnnotation);
    setIsEditing(false);
    setIsCreatingNewType(false);
  };
  
  const handleTypeChange = (e) => {
    if (e.target.value === '__new__') {
      setIsCreatingNewType(true);
      setEditedAnnotation({
        ...editedAnnotation,
        type: '__new__',
        customType: ''
      });
    } else {
      setIsCreatingNewType(false);
      setEditedAnnotation({
        ...editedAnnotation,
        type: e.target.value
      });
    }
  };
  
  return isEditing ? (
    <tr className="border-b">
      <td className="border p-2">
        <input
          type="number"
          value={editedAnnotation.start}
          onChange={(e) => setEditedAnnotation({ ...editedAnnotation, start: parseInt(e.target.value) })}
          className="border p-1 w-full"
        />
      </td>
      <td className="border p-2">
        <input
          type="number"
          value={editedAnnotation.end}
          onChange={(e) => setEditedAnnotation({ ...editedAnnotation, end: parseInt(e.target.value) })}
          className="border p-1 w-full"
        />
      </td>
      <td className="border p-2">
        <input
          type="text"
          value={editedAnnotation.text}
          onChange={(e) => setEditedAnnotation({ ...editedAnnotation, text: e.target.value })}
          className="border p-1 w-full"
        />
      </td>
      <td className="border p-2">
        <div className="flex flex-col gap-1">
          <select
            value={editedAnnotation.type}
            onChange={handleTypeChange}
            className="border p-1"
          >
            {knownEntityTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
            <option value="__new__">Create new type...</option>
          </select>
          
          {isCreatingNewType && (
            <input
              type="text"
              value={editedAnnotation.customType || ''}
              onChange={(e) => setEditedAnnotation({ ...editedAnnotation, customType: e.target.value })}
              placeholder="New type name"
              className="border p-1"
            />
          )}
        </div>
      </td>
      <td className="border p-2">
        <input
          type="text"
          value={editedAnnotation.normalizedId || ''}
          onChange={(e) => setEditedAnnotation({ ...editedAnnotation, normalizedId: e.target.value })}
          className="border p-1 w-full"
        />
      </td>
      <td className="border p-2">
        <div className="flex gap-1">
          <button onClick={handleSave} className="bg-green-600 text-white px-2 py-1 rounded text-sm">Save</button>
          <button onClick={() => setIsEditing(false)} className="bg-gray-300 px-2 py-1 rounded text-sm">Cancel</button>
        </div>
      </td>
    </tr>
  ) : (
    <tr className="border-b">
      <td className="border p-2">{annotation.start}</td>
      <td className="border p-2">{annotation.end}</td>
      <td className="border p-2">{annotation.text}</td>
      <td className="border p-2">
        <span className={`inline-block px-2 py-1 rounded text-sm ${colorClasses.bg} ${colorClasses.text}`}>
          {annotation.type}
        </span>
      </td>
      <td className="border p-2">{annotation.normalizedId || '-'}</td>
      <td className="border p-2">
        <div className="flex gap-1">
          <button onClick={() => setIsEditing(true)} className="bg-blue-600 text-white px-2 py-1 rounded text-sm">Edit</button>
          <button onClick={() => onDelete(index)} className="bg-red-600 text-white px-2 py-1 rounded text-sm">Delete</button>
        </div>
      </td>
    </tr>
  );
};

export default AnnotationRow;
