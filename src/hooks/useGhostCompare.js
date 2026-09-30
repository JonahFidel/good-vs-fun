import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApiFetch } from '../lib/api';
import { groupByPosition } from '../lib/groupByPosition';
import { useGhostDeck } from './useGhostDeck';
export function useGhostCompare(deckId) {
    const apiFetch = useApiFetch();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const ghostDeckId = searchParams.get('ghost') ?? '';
    const ghost2DeckId = searchParams.get('ghost2') ?? '';
    const [allDecks, setAllDecks] = useState([]);
    const { movies: ghostMovies, name: ghostDeckName } = useGhostDeck(ghostDeckId);
    const { movies: ghost2Movies, name: ghost2DeckName } = useGhostDeck(ghost2DeckId);
    // Load all decks for the ghost selector
    useEffect(() => {
        let isActive = true;
        apiFetch('/api/decks')
            .then((data) => {
            if (isActive)
                setAllDecks((data?.decks ?? []));
        })
            .catch(() => { });
        return () => {
            isActive = false;
        };
    }, [apiFetch]);
    const ghostGroups = useMemo(() => groupByPosition(ghostMovies), [ghostMovies]);
    const ghost2Groups = useMemo(() => groupByPosition(ghost2Movies), [ghost2Movies]);
    const otherDecks = useMemo(() => allDecks.filter((deck) => deck.id !== deckId), [allDecks, deckId]);
    function writeGhostParams(nextGhost, nextGhost2) {
        const params = new URLSearchParams();
        if (nextGhost)
            params.set('ghost', nextGhost);
        if (nextGhost2)
            params.set('ghost2', nextGhost2);
        setSearchParams(params, { replace: true });
    }
    function handleSetGhostDeck(id) {
        // Don't allow the same deck in both ghost slots
        const nextGhost2 = id && id === ghost2DeckId ? '' : ghost2DeckId;
        writeGhostParams(id, nextGhost2);
    }
    function handleSetGhost2Deck(id) {
        const nextGhost = id && id === ghostDeckId ? '' : ghostDeckId;
        writeGhostParams(nextGhost, id);
    }
    function handleSwapDecks(withGhost = 1) {
        if (!deckId)
            return;
        const swapId = withGhost === 1 ? ghostDeckId : ghost2DeckId;
        if (!swapId)
            return;
        const params = new URLSearchParams();
        if (withGhost === 1) {
            params.set('ghost', deckId);
            if (ghost2DeckId)
                params.set('ghost2', ghost2DeckId);
        }
        else {
            if (ghostDeckId)
                params.set('ghost', ghostDeckId);
            params.set('ghost2', deckId);
        }
        const qs = params.toString();
        navigate(`/deck/${swapId}/movies${qs ? `?${qs}` : ''}`);
    }
    return {
        ghostDeckId,
        ghost2DeckId,
        ghostDeckName,
        ghost2DeckName,
        ghostGroups,
        ghost2Groups,
        otherDecks,
        handleSetGhostDeck,
        handleSetGhost2Deck,
        handleSwapDecks,
    };
}
