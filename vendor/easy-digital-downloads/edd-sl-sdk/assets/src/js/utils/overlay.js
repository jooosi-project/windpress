/**
 * Show overlay notices on a delay.
 */
const overlayNotice = document.querySelector( '.edd-sdk-notice--overlay' );
let overlayNoticeWrapper = null;

if ( overlayNotice ) {
	// Wrap the notice in a div so we can overlay it using vanilla JS
	overlayNoticeWrapper = document.createElement( 'div' );
	overlayNoticeWrapper.classList.add( 'edd-sdk__notice__overlay' );
	overlayNotice.parentNode.insertBefore( overlayNoticeWrapper, overlayNotice );
	overlayNoticeWrapper.appendChild( overlayNotice );

	document.addEventListener( 'click', ( event ) => {
		if ( event.target.classList.contains( 'edd-sdk__notice__trigger' ) ) {
			if ( event.target.classList.contains( 'edd-sdk__notice__trigger--ajax' ) ) {
				event.target.disabled = true;
				event.preventDefault();

				const data = {
					template: event.target.dataset.id ?? 'license-control',
					product_id: event.target.dataset.product ?? '',
					slug: event.target.dataset.slug ?? '',
					name: event.target.dataset.name ?? '',
				};

				data.action = 'edd_sdk_get_notice_' + data.slug;

				fetch( `${ ajaxurl }?${ new URLSearchParams( data ) }` )
					.then( ( response ) => response.json() )
					.then( ( response ) => {
						if ( response.data ) {
							overlayNotice.innerHTML = response.data;
							// Add a class to the overlay notice
							overlayNoticeWrapper.classList.add( 'edd-sdk__notice--ajax' );
						}
						triggerNoticeEnter( overlayNoticeWrapper );
						event.target.disabled = false;
					} );
			} else {
				triggerNoticeEnter( overlayNoticeWrapper );
			}
		}
	} );
}

// Use event delegation for dismiss buttons on dynamically created overlays
document.addEventListener( 'click', ( event ) => {
	if ( ! event.target.classList.contains( 'edd-sdk__notice--dismiss' ) ) {
		return;
	}
	// Find the closest overlay wrapper
	const overlayWrapper = event.target.closest( '.edd-sdk__notice__overlay' );
	if ( overlayWrapper ) {
		// Only prevent default behavior for buttons, not links.
		if ( !event.target.href ) {
			event.preventDefault();
		}

		triggerNoticeDismiss( overlayWrapper );
	}
} );

/**
 * Show notice and trigger event
 *
 * @param {HTMLElement} el The notice element to show
 */
function triggerNoticeEnter ( el ) {
	// Trigger native custom event
	document.dispatchEvent( new CustomEvent( 'edd_sdk_notice_enter', { detail: { notice: el } } ) );

	// Show the element with a fade-in effect using vanilla JS
	el.style.display = 'flex';
	el.style.opacity = '0';
	requestAnimationFrame( () => {
		el.style.transition = 'opacity 0.3s';
		el.style.opacity = '1';
	} );
}

/**
 * Dismiss notice and trigger event
 *
 * @param {HTMLElement} el The notice element to dismiss
 */
function triggerNoticeDismiss ( el ) {
	if ( el.style.display === 'none' ) {
		return;
	}

	// Fade out the element using vanilla JS
	el.style.transition = 'opacity 0.3s';
	el.style.opacity = '0';
	el.addEventListener( 'transitionend', () => {
		el.style.display = 'none';
	}, { once: true } );

	const overlay = document.querySelector( '.edd-sdk-notice--overlay' );
	if ( overlay ) {
		overlay.innerHTML = '';
	}

	// Trigger native custom event
	document.dispatchEvent( new CustomEvent( 'edd_sdk_notice_dismiss', { detail: { notice: el } } ) );
}
