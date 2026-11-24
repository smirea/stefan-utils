<script lang="ts">
	import PuzzlePiece from 'phosphor-svelte/lib/PuzzlePiece';
	import { browser } from 'wxt/browser';
	import { clickCount } from '../../storage.ts';

	let count = $state<number>();
	const name = browser.runtime.getManifest().name;

	$effect(() => {
		void clickCount.getValue().then(value => (count = value));
		return clickCount.watch(value => {
			count = value;
		});
	});
</script>

<main class="w-72 space-y-4 bg-white p-4 text-slate-900">
	<header class="flex items-center gap-2">
		<PuzzlePiece size={22} weight="duotone" />
		<h1 class="text-base font-semibold">{name}</h1>
	</header>
	<p class="text-sm text-slate-600">
		The count lives in extension storage, so it survives closing the popup and restarting the browser.
	</p>
	<button
		type="button"
		disabled={count === undefined}
		onclick={() => void clickCount.setValue((count ?? 0) + 1)}
		class="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
	>
		Clicked {count ?? '…'} times
	</button>
</main>
