import { PuzzlePiece } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { clickCount } from '../../storage.ts';

export default function App() {
	const [count, setCount] = useState<number>();

	useEffect(() => {
		void clickCount.getValue().then(setCount);
		return clickCount.watch(setCount);
	}, []);

	return (
		<main className='w-72 space-y-4 bg-white p-4 text-slate-900'>
			<header className='flex items-center gap-2'>
				<PuzzlePiece size={22} weight='duotone' />
				<h1 className='text-base font-semibold'>{browser.runtime.getManifest().name}</h1>
			</header>
			<p className='text-sm text-slate-600'>
				The count lives in extension storage, so it survives closing the popup and restarting the browser.
			</p>
			<button
				type='button'
				disabled={count === undefined}
				onClick={() => void clickCount.setValue((count ?? 0) + 1)}
				className='w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50'
			>
				Clicked {count ?? '…'} times
			</button>
		</main>
	);
}
