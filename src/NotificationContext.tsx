import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import styles from './GalaxyUI.module.css';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const showNotification = (input) => {
console.log('! showNotification', JSON.stringify(input));
    
    let notification;

    if (typeof input === 'string') {
      notification = { type: 'info', message: input };
    } else {
      const { type, message } = input;
      notification = { type, message };
    }

    const timeoutId = setTimeout(() => {
      hideNotification(notification.id);
    }, 3000);

    notification.id = Date.now();  // Assuming this gives a unique ID
    notification.timeoutId = timeoutId;

    setNotifications([...notifications, notification]);
  };

  const hideNotification = (notificationId) => {
    clearTimeout(notifications.find(n => n.id === notificationId)?.timeoutId);
    setNotifications(notifications => notifications.filter(n => n.id !== notificationId));
  };

  return (
    <NotificationContext.Provider value={{ showNotification, hideNotification }}>
      <div className={styles.bottomRight}>
        {notifications.map((notification, index) => {
          const notificationId = `notification-${notification.type}`
          // console.log('! notificationId', notificationId);
          return (
          <div data-testid={notificationId} key={index} className={styles.notification}>
            <p>{notification.message}</p>
          </div>
        ) })}
      </div>
      {children}
    </NotificationContext.Provider>
  );
};
