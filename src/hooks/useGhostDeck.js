import { useEffect, useState } from 'react';
import { useApiFetch } from '../lib/api';
export function useGhostDeck(deckId) {
    const apiFetch = useApiFetch();
    const [trackedDeckId, setTrackedDeckId] = useState(deckId);
    const [movies, setMovies] = useState([]);
    const [name, setName] = useState('');
    if (deckId !== trackedDeckId) {
        setTrackedDeckId(deckId);
        if (!deckId) {
            setMovies([]);
            setName('');
        }
    }
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
            setMovies((data?.movies ?? []));
            setName(String(data?.deck?.name ?? ''));
        })
            .catch(() => { });
        return () => {
            isActive = false;
        };
    }, [apiFetch, deckId]);
    return { movies, name };
}
