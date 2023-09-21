import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import styles from './GalaxyUI.module.css';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);



  const showNotification = (input) => {
    if (typeof input === 'string') {
      setNotifications([...notifications, { type: 'info', message: input }]);
    } else {
      const { type, message } = input;
      setNotifications([...notifications, { type, message }]);
    }

    // Auto-hide the notification after 3 seconds
    setTimeout(() => {
      hideNotification();
    }, 3000);
  };

  const hideNotification = () => {
    setNotifications(notifications.slice(1)); // Remove the first notification
  };

  window.showNotification = useCallback(showNotification);

  useEffect(() => {
    // Auto-hide the first notification after 3 seconds
    const timer = setTimeout(() => {
      hideNotification();
    }, 3000);

    // Clear the timer when component unmounts
    return () => clearTimeout(timer);
  }, [notifications]);



  return (
    <NotificationContext.Provider value={{ showNotification, hideNotification }}>
      <div className={styles.bottomRight}>
        {notifications.map((notification, index) => (
          <div data-testid={`notification-${notification.type}`} key={index} className={styles.notification}>
            <p>{notification.message}</p>
          </div>
        ))}
      </div>
      {children}
    </NotificationContext.Provider>
  );
};
