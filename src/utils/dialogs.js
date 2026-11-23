export const showMessage = async (message, options = {}) => {
  if (window.electron?.showMessage) {
    await window.electron.showMessage({
      type: options.type || 'info',
      title: options.title,
      message
    });
    return;
  }

  window.alert(message);
};

export const showConfirm = async (message, options = {}) => {
  if (window.electron?.showConfirm) {
    const result = await window.electron.showConfirm({
      title: options.title,
      message,
      confirmLabel: options.confirmLabel,
      cancelLabel: options.cancelLabel
    });
    return !!result?.confirmed;
  }

  return window.confirm(message);
};
