import { useCallback, useState } from 'react';

// Modal state: `data` carries the row being edited/deleted.
export function useDisclosure() {
  const [state, setState] = useState({ open: false, data: null });
  const onOpen = useCallback((data = null) => setState({ open: true, data }), []);
  const onClose = useCallback(() => setState((s) => ({ ...s, open: false })), []);
  return { open: state.open, data: state.data, onOpen, onClose };
}
