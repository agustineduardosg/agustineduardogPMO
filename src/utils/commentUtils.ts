export interface CommentEntry {
  id: string;
  author: string;
  role: string;
  text: string;
  timestamp: string;
}

export const parseComments = (observaciones: string): CommentEntry[] => {
  if (!observaciones || observaciones.trim() === '' || observaciones === 'Ingresar historial...') {
    return [];
  }
  try {
    const parsed = JSON.parse(observaciones);
    if (Array.isArray(parsed)) {
      return parsed as CommentEntry[];
    }
  } catch (e) {
    // Return legacy plain text
  }
  return [
    {
      id: 'legacy',
      author: 'Historial Inicial',
      role: 'Sistema',
      text: observaciones,
      timestamp: new Date().toISOString()
    }
  ];
};
