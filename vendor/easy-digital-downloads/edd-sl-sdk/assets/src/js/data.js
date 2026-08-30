( function ( document ) {
	'use strict';

	// Helper function for selecting elements
	const $ = ( selector ) => document.querySelector( selector );
	const $$ = ( selector ) => document.querySelectorAll( selector );

	// Handle data tracking checkbox changes
	document.addEventListener( 'change', function ( e ) {
		if ( ! e.target.matches( 'input[id^="edd_sl_sdk_allow_data"]' ) ) {
			return;
		}

		const checkbox = e.target;
		const slug = checkbox.getAttribute( 'data-slug' );
		const itemId = checkbox.id.match( /\[(\d+)\]/ )?.[1];

		if ( ! itemId ) {
			return;
		}

		// Get security attributes from the checkbox
		const timestamp = checkbox.getAttribute( 'data-timestamp' );
		const token = checkbox.getAttribute( 'data-token' );
		const nonce = checkbox.getAttribute( 'data-nonce' );

		if ( ! timestamp || ! token || ! nonce ) {
			console.warn( 'Missing security attributes on data tracking checkbox' );
			return;
		}

		// Remove previous notices
		$$( '.edd-sl-sdk__data + .notice' ).forEach( ( el ) => el.remove() );

		// Disable checkbox during request
		checkbox.setAttribute( 'disabled', 'true' );

		const data = {
			action: 'edd_sl_sdk_update_tracking_' + slug,
			token: token,
			timestamp: timestamp,
			nonce: nonce,
			item_id: itemId,
			allow_tracking: checkbox.checked ? '1' : '0',

		};

		// AJAX request
		fetch( ajaxurl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams( data ),
		} )
			.then( ( response ) => response.json() )
			.then( ( res ) => {
				if ( res.success ) {
					if ( res.data.message ) {
						$( '.edd-sl-sdk__data' ).insertAdjacentHTML(
							'afterend',
							`<div class="notice inline-notice notice-success">${ res.data.message }</div>`
						);
					}
				} else {
					$( '.edd-sl-sdk__data' ).insertAdjacentHTML(
						'afterend',
						`<div class="notice inline-notice notice-warning">${ res.data.message }</div>`
					);
					// Revert checkbox state on error
					checkbox.checked = ! checkbox.checked;
				}
				checkbox.removeAttribute( 'disabled' );
			} )
			.catch( ( error ) => {
				console.error( 'Error updating tracking preference:', error );
				$( '.edd-sl-sdk__data' ).insertAdjacentHTML(
					'afterend',
					`<div class="notice inline-notice notice-error"><p>${ edd_sdk_notice.error }</p></div>`
				);
				// Revert checkbox state on error
				checkbox.checked = ! checkbox.checked;
				checkbox.removeAttribute( 'disabled' );
			} );
	} );
} )( document );
