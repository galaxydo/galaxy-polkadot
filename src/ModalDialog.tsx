import { createContext, useState, useContext } from 'react';
import styles from './GalaxyUI.module.css';

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

  // Create a local state for the input value
  const [inputValue, setInputValue] = useState(inputField ? inputField.value : '');

  const handleInputChange = (e) => {
    setInputValue(e.target.value);

    // If an onChange handler is provided in inputField, call it
    if (inputField && inputField.onChange) {
      inputField.onChange(e);
    }
  };

  const handleConfirmClick = () => {
    if (inputField && inputField.onConfirm) {
      inputField.onConfirm(inputValue);
    }
    callback();
    closeModal();
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
              value={inputValue} // Use the local state value
              placeholder={inputField.placeholder}
              onChange={handleInputChange} // Use the new handler
            />
          </label>
        )}
        <button data-testid="modal-button" className={styles.customButton} onClick={handleConfirmClick}>Confirm</button>
        <button className={styles.customButton} onClick={closeModal}>Cancel</button>
      </div>
    </div>
  );
};
