import { createContext, useState, useContext } from 'react';
import styles from './GalaxyUI.module.css';
import { NotificationContext } from './NotificationContext';  // Import NotificationContext

export const ModalContext = createContext();

export const ModalProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: "",
    description: "",
    callback: null,
    inputField: null
  });

  // Adjusting showModal to accept an object argument
  const showModal = ({ title, description, callback, inputField }) => {
    setModalState({
      isOpen: true,
      title,
      description,
      callback,
      inputField
    });
  };

  const closeModal = () => {
    setModalState({
      ...modalState,
      isOpen: false
    });
  };

  return (
    <ModalContext.Provider value={{ showModal, closeModal }}>
      {children}
      {modalState.isOpen && <ModalComponent {...modalState} />}
    </ModalContext.Provider>
  );
};

const ModalComponent = ({ title, description, callback, inputField }) => {
  const { closeModal } = useContext(ModalContext);
  const { showNotification } = useContext(NotificationContext); // Assuming the NotificationContext is available

  // Create a local state for the input value
  const [inputValue, setInputValue] = useState(inputField ? inputField.value : '');

  const handleInputChange = (e) => {
    setInputValue(e.target.value);

    if (inputField && inputField.onChange) {
      inputField.onChange(e);
    }
  };

  const handleConfirmClick = async () => {
    closeModal();
    if (inputField && inputField.onConfirm) {
      inputField.onConfirm(inputValue);
    }
    if (callback) {
      try {
        const message = await callback(inputValue);
        showNotification({ type: 'success', message: message }); // Notify success
      } catch (error) {
        console.error(error);
        const errorMessage = error.message || 'An error occurred';
        showNotification({ type: 'error', message: errorMessage }); // Notify error
      }
    }
  };

  return (
    <div className={styles.dialogCentered} data-testid="modal-dialog">
      <h3>{title}</h3>
      <div className={styles.dialogContent}>
        {description && <p>{description}</p>}
        {inputField && (
          <label>
            <input data-testid="modal-input"
              type="text"
              value={inputValue}
              placeholder={inputField.placeholder}
              onChange={handleInputChange}
            />
          </label>
        )}
        <button data-testid="modal-button" className={styles.customButton} onClick={handleConfirmClick}>Confirm</button>
        <button className={styles.customButton} onClick={closeModal}>Cancel</button>
      </div>
    </div>
  );
};
