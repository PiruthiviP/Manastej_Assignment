import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { fetchCandidates, updateStatus } from '../api/candidates';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';

/**
 * useCandidateSync
 * 
 * Orchestrates real-time state synchronization with:
 * 1. Initial REST fetch with skeleton loading state
 * 2. Socket.IO event subscription with version check (ignoring stale/older versions)
 * 3. Optimistic local UI updates with automatic rollback on network/conflict failure
 * 4. Proper cleanup on component unmount
 */
export function useCandidateSync(currentUser = 'Recruiter') {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [remoteUpdateInfo, setRemoteUpdateInfo] = useState(null);
  const [rollbackCandidateId, setRollbackCandidateId] = useState(null);

  // Keep a ref to the latest candidates to prevent stale closures in event handlers
  const candidatesRef = useRef(candidates);
  candidatesRef.current = candidates;

  // Track in-flight optimistic updates initiated by THIS client instance
  const pendingUpdatesRef = useRef(new Set());

  /**
   * Refetches all candidates from the server (e.g. on 409 conflict resolution)
   */
  const refreshCandidates = useCallback(async () => {
    try {
      const data = await fetchCandidates();
      setCandidates(data);
      setError(null);
    } catch (err) {
      setError({
        id: Date.now(),
        message: err.message || 'Failed to refresh candidates',
        isConflict: false,
      });
    }
  }, []);

  /**
   * Initial data load
   */
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetchCandidates()
      .then((data) => {
        if (isMounted) {
          setCandidates(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError({
            id: Date.now(),
            message: err.message || 'Failed to load initial candidates',
            isConflict: false,
          });
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * WebSocket setup and lifecycle management
   */
  useEffect(() => {
    const socket = io(API_BASE, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // Listen for broadcasted status updates from ANY client
    socket.on('candidate:updated', (incomingCandidate) => {
      setCandidates((prev) => {
        const existing = prev.find((c) => c._id === incomingCandidate._id);

        // Ignore events whose version is not strictly newer than the local one
        if (existing && incomingCandidate.version <= existing.version) {
          return prev;
        }

        // Check if this update was initiated by this client
        const wasPendingLocal = pendingUpdatesRef.current.has(incomingCandidate._id);

        if (!wasPendingLocal) {
          // Trigger remote update banner/toast and card flash animation
          setRemoteUpdateInfo({
            candidateId: incomingCandidate._id,
            name: incomingCandidate.name,
            to: incomingCandidate.status,
            timestamp: Date.now(),
          });
        }

        if (!existing) {
          return [incomingCandidate, ...prev];
        }

        return prev.map((c) =>
          c._id === incomingCandidate._id ? incomingCandidate : c
        );
      });
    });

    // Clean up socket listeners and disconnect on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  /**
   * Optimistically moves a candidate to a new stage.
   * Snapshots prior state synchronously to guarantee clean rollback on failure.
   */
  const changeStatus = useCallback(
    async (id, to) => {
      let snapshot = null;

      // Optimistic state transition
      setCandidates((prev) => {
        const target = prev.find((c) => c._id === id);
        if (!target) return prev;
        snapshot = target; // Synchronous snapshot capture (no stale closure)

        return prev.map((c) =>
          c._id === id
            ? {
                ...c,
                status: to,
                version: c.version + 1,
                updatedAt: new Date().toISOString(),
                _isOptimistic: true,
              }
            : c
        );
      });

      if (!snapshot) return;

      // Mark this candidate as pending local update
      pendingUpdatesRef.current.add(id);

      try {
        const serverCandidate = await updateStatus(id, to, snapshot.version, currentUser);

        // Success: replace with authoritative document from server
        setCandidates((prev) =>
          prev.map((c) => (c._id === id ? serverCandidate : c))
        );

        pendingUpdatesRef.current.delete(id);
        return serverCandidate;
      } catch (err) {
        pendingUpdatesRef.current.delete(id);

        // Failure: rollback immediately to pre-update snapshot
        setCandidates((prev) =>
          prev.map((c) => (c._id === id ? snapshot : c))
        );

        // Trigger shake animation on the failed card
        setRollbackCandidateId(id);
        setTimeout(() => setRollbackCandidateId(null), 600);

        const errorMessage = err.message || 'Failed to update candidate status';
        const isConflict = err.status === 409 || errorMessage.toLowerCase().includes('stale');

        setError({
          id: Date.now(),
          message: errorMessage,
          isConflict,
          candidateId: id,
          candidateName: snapshot.name,
        });

        throw err;
      }
    },
    [currentUser]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearRemoteUpdate = useCallback(() => {
    setRemoteUpdateInfo(null);
  }, []);

  return {
    candidates,
    loading,
    connected,
    error,
    clearError,
    changeStatus,
    refreshCandidates,
    remoteUpdateInfo,
    clearRemoteUpdate,
    rollbackCandidateId,
  };
}

