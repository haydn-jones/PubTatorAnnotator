// Utility function to generate consistent colors for entity types
export const getEntityColor = (type) => {
  if (!type) return { bg: 'bg-gray-100', text: 'text-gray-800', highlight: 'bg-gray-200 border-gray-400' };
  
  // Predefined colors for common entity types
  const colorMap = {
    'Chemical': { bg: 'bg-blue-100', text: 'text-blue-800', highlight: 'bg-blue-200 border-blue-400' },
    'Gene': { bg: 'bg-green-100', text: 'text-green-800', highlight: 'bg-green-200 border-green-400' },
    'Disease': { bg: 'bg-red-100', text: 'text-red-800', highlight: 'bg-red-200 border-red-400' },
    'Species': { bg: 'bg-purple-100', text: 'text-purple-800', highlight: 'bg-purple-200 border-purple-400' },
    'Mutation': { bg: 'bg-yellow-100', text: 'text-yellow-800', highlight: 'bg-yellow-200 border-yellow-400' },
    'CellLine': { bg: 'bg-indigo-100', text: 'text-indigo-800', highlight: 'bg-indigo-200 border-indigo-400' }
  };
  
  if (colorMap[type]) {
    return colorMap[type];
  }
  
  // Generate a color based on the type name
  let hash = 0;
  for (let i = 0; i < type.length; i++) {
    hash = type.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Convert hash to a limited set of predefined Tailwind colors
  // This ensures compatibility with Tailwind's JIT engine
  const colorOptions = [
    { bg: 'bg-sky-100', text: 'text-sky-800', highlight: 'bg-sky-200 border-sky-400' },
    { bg: 'bg-emerald-100', text: 'text-emerald-800', highlight: 'bg-emerald-200 border-emerald-400' },
    { bg: 'bg-amber-100', text: 'text-amber-800', highlight: 'bg-amber-200 border-amber-400' },
    { bg: 'bg-rose-100', text: 'text-rose-800', highlight: 'bg-rose-200 border-rose-400' },
    { bg: 'bg-fuchsia-100', text: 'text-fuchsia-800', highlight: 'bg-fuchsia-200 border-fuchsia-400' },
    { bg: 'bg-lime-100', text: 'text-lime-800', highlight: 'bg-lime-200 border-lime-400' },
    { bg: 'bg-teal-100', text: 'text-teal-800', highlight: 'bg-teal-200 border-teal-400' },
    { bg: 'bg-cyan-100', text: 'text-cyan-800', highlight: 'bg-cyan-200 border-cyan-400' },
    { bg: 'bg-orange-100', text: 'text-orange-800', highlight: 'bg-orange-200 border-orange-400' },
  ];
  
  return colorOptions[Math.abs(hash) % colorOptions.length];
};

// Utility function to get color for potential annotation matches
export const getPotentialMatchStyle = () => {
  return { 
    text: 'text-red-600',
    style: 'bg-red-50' // Removed border styles, keeping just light background
  };
};
