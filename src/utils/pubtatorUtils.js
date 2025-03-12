/**
 * Parse PubTator content into structured documents
 * @param {string} content - The PubTator format content
 * @returns {Array} Array of parsed document objects
 */
export const parsePubtator = (content) => {
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
  
  return { docs, entityTypes: [...entityTypes] };
};

/**
 * Generate PubTator format content from structured documents
 * @param {Array} documents - Array of document objects
 * @returns {string} PubTator format content
 */
export const generateExportContent = (documents) => {
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
