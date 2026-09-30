import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, } from 'react';
// The grid canvas and scoring region are sized via CSS vars (see .grid::before).
const INITIAL_SCALE = 1;
const MIN_SCALE = 0.3;
const MAX_SCALE = 8;
export const PlotGridZoom = forwardRef(function PlotGridZoom({ children }, forwardedRef) {
    const slotRef = useRef(null);
    const canvasRef = useRef(null);
    const gridRef = useRef(null);
    const stateRef = useRef({ scale: INITIAL_SCALE, tx: 0, ty: 0 });
    const panRef = useRef(null);
    useImperativeHandle(forwardedRef, () => gridRef.current);
    function applyTransform() {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const { scale, tx, ty } = stateRef.current;
        canvas.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    }
    function anchorCenter() {
        const slot = slotRef.current;
        const canvas = canvasRef.current;
        if (!slot || !canvas)
            return;
        const { scale } = stateRef.current;
        const scaledW = canvas.offsetWidth * scale;
        const scaledH = canvas.offsetHeight * scale;
        stateRef.current.tx = (slot.offsetWidth - scaledW) / 2;
        stateRef.current.ty = (slot.offsetHeight - scaledH) / 2;
    }
    useLayoutEffect(() => {
        anchorCenter();
        applyTransform();
    }, []);
    // Re-center when the pan viewport or plot canvas resizes.
    useEffect(() => {
        const slot = slotRef.current;
        const canvas = canvasRef.current;
        if (!slot || !canvas)
            return;
        const ro = new ResizeObserver(() => {
            anchorCenter();
            applyTransform();
        });
        ro.observe(slot);
        ro.observe(canvas);
        return () => ro.disconnect();
    }, []);
    // Cmd/Ctrl + scroll → zoom toward cursor
    useEffect(() => {
        const slot = slotRef.current;
        if (!slot)
            return;
        const capturedSlot = slot;
        function onWheel(e) {
            // Always zoom when the cursor is inside the slot.
            // - Trackpad pinch fires wheel with synthetic ctrlKey=true
            // - Cmd/Ctrl + scroll fires wheel with metaKey/ctrlKey=true
            // - Plain two-finger scroll (no modifier) is also captured here so that
            //   the grid behaves like a Figma canvas: scroll = zoom, drag = pan.
            e.preventDefault();
            e.stopPropagation();
            const { scale: oldScale, tx, ty } = stateRef.current;
            const rect = capturedSlot.getBoundingClientRect();
            const cursorX = e.clientX - rect.left;
            const cursorY = e.clientY - rect.top;
            const delta = e.deltaMode === 1 ? e.deltaY * 30 : e.deltaMode === 2 ? e.deltaY * 300 : e.deltaY;
            const factor = Math.exp(-delta / 800);
            const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, oldScale * factor));
            const ratio = newScale / oldScale;
            const newTx = cursorX - (cursorX - tx) * ratio;
            const newTy = cursorY - (cursorY - ty) * ratio;
            stateRef.current = { scale: newScale, tx: newTx, ty: newTy };
            applyTransform();
        }
        // { passive: false } is required so we can call preventDefault() and
        // suppress both native page-scroll and OS-level pinch-zoom.
        capturedSlot.addEventListener('wheel', onWheel, { passive: false });
        return () => capturedSlot.removeEventListener('wheel', onWheel);
    }, []);
    // Pointer drag on empty grid space → pan
    const PAN_DEAD_ZONE_PX = 22;
    function handlePointerDown(e) {
        if (e.button !== 0)
            return;
        // Don't pan when clicking on or near a movie point
        if (e.target.closest('.movie-point'))
            return;
        const slot = slotRef.current;
        if (slot) {
            for (const pt of slot.querySelectorAll('.movie-point')) {
                const r = pt.getBoundingClientRect();
                const dx = e.clientX - (r.left + r.width / 2);
                const dy = e.clientY - (r.top + r.height / 2);
                if (dx * dx + dy * dy < PAN_DEAD_ZONE_PX * PAN_DEAD_ZONE_PX)
                    return;
            }
        }
        e.currentTarget.setPointerCapture(e.pointerId);
        panRef.current = {
            x: e.clientX,
            y: e.clientY,
            tx: stateRef.current.tx,
            ty: stateRef.current.ty,
        };
        if (slotRef.current)
            slotRef.current.style.cursor = 'grabbing';
    }
    function handlePointerMove(e) {
        if (!panRef.current)
            return;
        const dx = e.clientX - panRef.current.x;
        const dy = e.clientY - panRef.current.y;
        stateRef.current.tx = panRef.current.tx + dx;
        stateRef.current.ty = panRef.current.ty + dy;
        applyTransform();
    }
    function handlePointerUp() {
        if (!panRef.current)
            return;
        panRef.current = null;
        if (slotRef.current)
            slotRef.current.style.cursor = '';
    }
    return (_jsx("div", { ref: slotRef, className: "grid-zoom-slot", onPointerDown: handlePointerDown, onPointerMove: handlePointerMove, onPointerUp: handlePointerUp, onPointerCancel: handlePointerUp, children: _jsx("div", { ref: canvasRef, className: "grid-zoom-canvas", children: _jsx("div", { ref: gridRef, className: "grid", children: children }) }) }));
});
