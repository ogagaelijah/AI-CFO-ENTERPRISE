import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const OfflineContext = createContext({});

export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    const loadQueue = async () => {
      const savedQueue = await AsyncStorage.getItem('@offline_sales_queue');
      if (savedQueue) setQueue(JSON.parse(savedQueue));
    };
    loadQueue();
  }, []);

  const saveQueue = async (newQueue) => {
    setQueue(newQueue);
    await AsyncStorage.setItem('@offline_sales_queue', JSON.stringify(newQueue));
  };

  const addSaleToQueue = async (saleData) => {
    const newSale = {
      ...saleData,
      offlineId: `offline_${Date.now()}`, // Unique ID for idempotency
      createdAt: new Date().toISOString(),
    };
    const newQueue = [...queue, newSale];
    await saveQueue(newQueue);
    return newSale;
  };

  const syncQueue = async () => {
    if (queue.length === 0) return;
    
    try {
      const remainingQueue = [];
      for (const sale of queue) {
        try {
          // Send to backend using the exact payload structure
          await api.post('/sales', sale); 
        } catch (err) {
          // If it fails (e.g., network drops again), keep it in the queue
          remainingQueue.push(sale);
        }
      }
      await saveQueue(remainingQueue);
    } catch (error) {
      console.error('Sync failed', error);
    }
  };

  return (
    <OfflineContext.Provider value={{ isOnline, setIsOnline, queue, addSaleToQueue, syncQueue }}>
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => useContext(OfflineContext);