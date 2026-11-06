import { defineContentScript } from 'wxt/utils/define-content-script';

export default defineContentScript({
	matches: ['*://*.example.com/*'],
	main() {
		console.log(`Content script loaded on ${location.href}`);
	},
});
