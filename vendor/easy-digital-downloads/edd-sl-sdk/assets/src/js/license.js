( function ( document ) {
	'use strict';

	// Helper function for selecting elements
	const $ = ( selector ) => document.querySelector( selector );
	const $$ = ( selector ) => document.querySelectorAll( selector );

	// Helper function for event delegation
	function on ( parent, event, selector, handler ) {
		parent.addEventListener( event, ( e ) => {
			if ( e.target.closest( selector ) ) {
				handler( e );
			}
		} );
	}

	// Handle license control actions (activate/deactivate)
	on( document, 'click', '.edd-sl-sdk__action', function ( e ) {
		e.preventDefault();

		const btn = e.target;
		const action = btn.getAttribute( 'data-action' );
		let ajaxAction = '';
		const text = btn.textContent;

		if ( btn.hasAttribute( 'disabled' ) ) {
			return;
		}

		switch ( action ) {
			case 'activate':
				ajaxAction = 'edd_sl_sdk_activate';
				btn.textContent = edd_sdk_notice.activating;
				break;
			case 'deactivate':
				ajaxAction = 'edd_sl_sdk_deactivate';
				btn.textContent = edd_sdk_notice.deactivating;
				break;
			default:
				return;
		}

		// Remove previous notices
		$$( '.edd-sl-sdk__license-control + .notice, .edd-sl-sdk__license-control + p' ).forEach( ( el ) => el.remove() );
		btn.classList.remove( 'button-primary' );
		btn.setAttribute( 'disabled', 'true' );
		btn.classList.add( 'updating-message' );

		const data = {
			token: btn.getAttribute( 'data-token' ),
			timestamp: btn.getAttribute( 'data-timestamp' ),
			nonce: btn.getAttribute( 'data-nonce' ),
			license: $( '.edd-sl-sdk__license--input' ).value,
			slug: $( '.edd-sl-sdk__license--input' ).getAttribute( 'data-slug' ),
		};

		data.action = ajaxAction + '_' + data.slug;

		// AJAX request
		fetch( ajaxurl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams( data ),
		} )
			.then( ( response ) => response.json() )
			.then( ( res ) => {
				if ( res.success ) {
					$( '.edd-sl-sdk-licensing__actions' ).outerHTML = res.data.actions;
					if ( res.data.message ) {
						$( '.edd-sl-sdk__license-control' ).insertAdjacentHTML(
							'afterend',
							`<div class="notice inline-notice notice-success">${ res.data.message }</div>`
						);
					}
					if ( data.license.length && action === 'deactivate' ) {
						$( '.edd-sl-sdk__license--input' ).removeAttribute( 'readonly' );
						$( '.edd-sl-sdk__license-status-message' ).remove();
					} else if ( action === 'activate' ) {
						$( '.edd-sl-sdk__license--input' ).setAttribute( 'readonly', 'true' );
						if ( res.data.url && res.data.url.length ) {
							setTimeout( () => {
								window.location.href = res.data.url;
							}, 1500 );
							return;
						}
					}
				} else {
					btn.textContent = text;
					$( '.edd-sl-sdk__license-control' ).insertAdjacentHTML(
						'afterend',
						`<div class="notice inline-notice notice-warning edd-sl-sdk__notice">${ res.data.message }</div>`
					);
				}
				btn.removeAttribute( 'disabled' );
				btn.classList.remove( 'updating-message' );
			} );
	} );

	// Handle license deletion
	on( document, 'click', '.edd-sl-sdk-license__delete', function ( e ) {
		e.preventDefault();

		const btn = e.target,
			input = $( '.edd-sl-sdk__license--input' );
		const ajaxAction = 'edd_sl_sdk_delete_' + input.getAttribute( 'data-slug' );

		const data = {
			action: ajaxAction,
			token: btn.getAttribute( 'data-token' ),
			timestamp: btn.getAttribute( 'data-timestamp' ),
			nonce: btn.getAttribute( 'data-nonce' ),
			license: input.value,
		};

		if ( !data.license ) {
			return;
		}

		// Remove previous notices
		$$( '.edd-sl-sdk__license-control + .notice, .edd-sl-sdk__license-control + p' ).forEach( ( el ) => el.remove() );
		btn.setAttribute( 'disabled', 'true' );
		btn.classList.add( 'updating-message' );

		// AJAX request
		fetch( ajaxurl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams( data ),
		} )
			.then( ( response ) => response.json() )
			.then( ( res ) => {
				if ( res.success ) {
					$( '.edd-sl-sdk__license-control' ).insertAdjacentHTML(
						'afterend',
						`<div class="notice inline-notice notice-success">${ res.data.message }</div>`
					);
					btn.style.display = 'none';
					$( '.edd-sl-sdk__license--input' ).value = '';
				} else {
					$( '.edd-sl-sdk__license-control' ).insertAdjacentHTML(
						'afterend',
						`<div class="notice inline-notice notice-warning">${ res.data.message }</div>`
					);
				}
				btn.removeAttribute( 'disabled' );
				btn.classList.remove( 'updating-message' );
			} );
	} );
} )( document );
