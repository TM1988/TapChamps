// Vercel Debug Script - Add this to test button interactions
(function() {
    'use strict';
    
    console.log('=== VERCEL DEBUGGING SCRIPT LOADED ===');
    
    // Function to test button clicks
    function debugButtons() {
        const buttons = document.querySelectorAll('button, .btn, [role="button"]');
        console.log(`Found ${buttons.length} buttons to debug`);
        
        buttons.forEach((btn, index) => {
            const rect = btn.getBoundingClientRect();
            const styles = window.getComputedStyle(btn);
            
            console.log(`Button ${index + 1}:`, {
                id: btn.id,
                className: btn.className,
                text: btn.textContent?.trim(),
                pointerEvents: styles.pointerEvents,
                display: styles.display,
                visibility: styles.visibility,
                zIndex: styles.zIndex,
                position: styles.position,
                opacity: styles.opacity,
                cursor: styles.cursor,
                touchAction: styles.touchAction,
                rect: {
                    width: rect.width,
                    height: rect.height,
                    x: rect.x,
                    y: rect.y
                },
                isVisible: rect.width > 0 && rect.height > 0,
                isClickable: styles.pointerEvents !== 'none'
            });
            
            // Add debug click handler
            const debugHandler = (e) => {
                console.log(`✅ BUTTON ${index + 1} CLICKED!`, btn.id || btn.className);
                console.log('Event details:', {
                    type: e.type,
                    target: e.target,
                    currentTarget: e.currentTarget,
                    bubbles: e.bubbles,
                    cancelable: e.cancelable,
                    defaultPrevented: e.defaultPrevented
                });
            };
            
            btn.addEventListener('click', debugHandler, { capture: true });
            btn.addEventListener('touchstart', debugHandler, { capture: true });
        });
    }
    
    // Test on load and with delays
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', debugButtons);
    } else {
        debugButtons();
    }
    
    setTimeout(debugButtons, 1000);
    setTimeout(debugButtons, 3000);
    
    // Global click tracker
    document.addEventListener('click', (e) => {
        console.log('🖱️ Global click detected:', {
            target: e.target,
            tagName: e.target.tagName,
            id: e.target.id,
            className: e.target.className,
            x: e.clientX,
            y: e.clientY
        });
    }, { capture: true });
    
    // Touch tracker
    document.addEventListener('touchstart', (e) => {
        console.log('👆 Global touch detected:', {
            target: e.target,
            tagName: e.target.tagName,
            id: e.target.id,
            className: e.target.className,
            touches: e.touches.length
        });
    }, { capture: true });
    
    console.log('=== DEBUG SCRIPT READY ===');
})();
