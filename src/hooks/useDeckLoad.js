import { useEffect, useRef, useState } from 'react';
import { useApiFetch } from '../lib/api';
export function useDeckLoad(deckId) {
    const apiFetch = useApiFetch();
    const [deckName, setDeckName] = useState('');
    const [isExampleDeck, setIsExampleDeck] = useState(false);
    const [movies, setMovies] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(deckId !== null);
    const [trackedDeckLoad, setTrackedDeckLoad] = useState({
        deckId,
        apiFetch,
    });
    if (trackedDeckLoad.deckId !== deckId ||
        trackedDeckLoad.apiFetch !== apiFetch) {
        setTrackedDeckLoad({ deckId, apiFetch });
        if (deckId) {
            setLoading(true);
            setError(null);
        }
    }
    const moviesRef = useRef([]);
    useEffect(() => {
        moviesRef.current = movies;
    }, [movies]);
    useEffect(() => {
        if (!deckId) {
            return;
        }
        let isActive = true;
        apiFetch(`/api/decks/${deckId}`)
            .then((data) => {
            if (!isActive) {
                return;
            }
            setDeckName(String(data?.deck?.name ?? ''));
            setIsExampleDeck(Boolean(data?.deck?.isExample));
            setMovies((data?.movies ?? []));
        })
            .catch(() => {
            if (isActive) {
                setError('Failed to load deck.');
            }
        })
            .finally(() => {
            if (isActive) {
                setLoading(false);
            }
        });
        return () => {
            isActive = false;
        };
    }, [deckId, apiFetch]);
    return {
        deckName,
        isExampleDeck,
        movies,
        setMovies,
        error,
        setError,
        loading,
        setLoading,
        moviesRef,
    };
}
