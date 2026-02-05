'use client';

import { useState, type FormEvent, type FC } from 'react';
import { useSignTypedData, useAccount } from 'wagmi';
import { JACK_SDK, IntentParams } from '../../../../packages/sdk';

interface CreateIntentViewProps {
	onIntentSubmitted: (id: string) => void;
}

export const CreateIntentView: FC<CreateIntentViewProps> = ({ onIntentSubmitted }) => {
	const { address, isConnected } = useAccount();
	const { signTypedDataAsync } = useSignTypedData();

	const [form, setForm] = useState({
		sourceChain: 'Arbitrum',
		destChain: 'Base',
		tokenIn: 'USDC',
		tokenOut: 'WETH',
		amountIn: '1000',
		minOut: '0.45',
		privacy: false
	});

	const [status, setStatus] = useState<'IDLE' | 'SIGNING' | 'BROADCASTING' | 'DONE' | 'ERROR'>('IDLE');

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!isConnected) {
			alert('Please connect your wallet first');
			return;
		}

		try {
			setStatus('SIGNING');
			const sdk = new JACK_SDK();

			const intentParams: IntentParams = {
				sourceChain: form.sourceChain,
				destinationChain: form.destChain,
				tokenIn: form.tokenIn,
				tokenOut: form.tokenOut,
				amountIn: form.amountIn,
				minAmountOut: form.minOut,
				deadline: Math.floor(Date.now() / 1000) + 3600
			};

			const typedData = sdk.getIntentTypedData(intentParams);

			const signature = await signTypedDataAsync({
				domain: typedData.domain,
				types: typedData.types,
				primaryType: 'Intent',
				message: typedData.message,
			});

			setStatus('BROADCASTING');
			const executionId = await sdk.submitIntent(intentParams, signature);

			setTimeout(() => {
				setStatus('DONE');
				onIntentSubmitted(executionId);
			}, 1500);
		} catch (error) {
			console.error('Submission failed:', error);
			setStatus('ERROR');
			setTimeout(() => setStatus('IDLE'), 3000);
		}
	};

	return (
		<div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
			<div className="lg:col-span-2 space-y-6">
				<div className="bg-[#0F1A2E] border border-white/5 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
					{(status !== 'IDLE' && status !== 'ERROR') && (
						<div className="absolute inset-0 z-20 bg-[#0B1020]/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6">
							<div className="w-16 h-16 relative">
								<div className="absolute inset-0 border-2 border-[#F2B94B]/20 rounded-full" />
								<div className="absolute inset-0 border-t-2 border-[#F2B94B] rounded-full animate-spin" />
							</div>
							<div className="space-y-2">
								<h3 className="text-xl font-space font-bold text-white uppercase tracking-widest">
									{status === 'SIGNING' ? 'Awaiting Signature' : 'Kernel Broadcasting'}
								</h3>
								<p className="text-gray-400 text-sm font-mono">
									{status === 'SIGNING' ? 'Verify typed data in your wallet...' : 'Transmitting Broadside Intent to Solvers...'}
								</p>
							</div>
							<div className="w-64 bg-white/5 h-1 rounded-full overflow-hidden">
								<div className={`h-full bg-[#F2B94B] transition-all duration-1000 ${status === 'BROADCASTING' ? 'w-full' : 'w-1/3'}`} />
							</div>
						</div>
					)}

					{status === 'ERROR' && (
						<div className="absolute inset-0 z-20 bg-red-900/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-4">
							<div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center text-red-500">
								<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
								</svg>
							</div>
							<h3 className="text-xl font-space font-bold text-white uppercase tracking-widest">Broadcast Failed</h3>
							<p className="text-red-200 text-sm font-mono">Check console for details</p>
						</div>
					)}

					<h2 className="text-2xl font-space font-bold mb-6 text-[#F2B94B]">Submit Cross-Chain Intent</h2>
					<form onSubmit={handleSubmit} className="space-y-6">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-2">
								<label className="text-[10px] md:text-xs uppercase tracking-widest text-gray-500 font-bold">Source Chain</label>
								<select
									value={form.sourceChain}
									onChange={e => setForm({ ...form, sourceChain: e.target.value })}
									className="w-full bg-[#0B1020] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#F2B94B] transition-colors text-sm font-semibold"
								>
									<option>Arbitrum</option>
									<option>Optimism</option>
									<option>Base</option>
								</select>
							</div>
							<div className="space-y-2">
								<label className="text-[10px] md:text-xs uppercase tracking-widest text-gray-500 font-bold">Destination Chain</label>
								<select
									value={form.destChain}
									onChange={e => setForm({ ...form, destChain: e.target.value })}
									className="w-full bg-[#0B1020] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#F2B94B] transition-colors text-sm font-semibold"
								>
									<option>Base</option>
									<option>Polygon</option>
									<option>Arbitrum</option>
								</select>
							</div>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-2">
								<label className="text-[10px] md:text-xs uppercase tracking-widest text-gray-500 font-bold">Input Asset</label>
								<div className="flex space-x-2">
									<input
										type="number"
										value={form.amountIn}
										onChange={e => setForm({ ...form, amountIn: e.target.value })}
										className="w-2/3 bg-[#0B1020] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#F2B94B] text-sm font-mono"
									/>
									<select className="w-1/3 bg-[#0B1020] border border-white/10 rounded-xl px-2 md:px-4 py-3 outline-none text-sm font-bold">
										<option>USDC</option>
										<option>ETH</option>
										<option>LINK</option>
									</select>
								</div>
							</div>
							<div className="space-y-2">
								<label className="text-[10px] md:text-xs uppercase tracking-widest text-gray-500 font-bold">Min Out (Slippage Cap)</label>
								<div className="flex space-x-2">
									<input
										type="number"
										value={form.minOut}
										onChange={e => setForm({ ...form, minOut: e.target.value })}
										className="w-2/3 bg-[#0B1020] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#F2B94B] text-sm font-mono"
									/>
									<select className="w-1/3 bg-[#0B1020] border border-white/10 rounded-xl px-2 md:px-4 py-3 outline-none text-sm font-bold">
										<option>WETH</option>
										<option>WBTC</option>
										<option>USDC</option>
									</select>
								</div>
							</div>
						</div>

						<div className="p-5 bg-gradient-to-r from-[#38BDF8]/5 to-transparent rounded-xl border border-[#38BDF8]/20 flex items-center justify-between">
							<div className="flex items-center space-x-4">
								<div className="w-12 h-12 bg-[#38BDF8]/10 rounded-xl flex items-center justify-center border border-[#38BDF8]/20 shadow-[0_0_15px_rgba(56,189,248,0.2)]">
									<svg className="w-6 h-6 text-[#38BDF8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
									</svg>
								</div>
								<div>
									<p className="text-sm font-bold text-white uppercase tracking-tight">Fhenix Confidential Intent</p>
									<p className="text-[10px] text-gray-400 font-semibold tracking-wide">Encrypt constraints for agent-only visibility (CCM).</p>
								</div>
							</div>
							<button
								type="button"
								onClick={() => setForm({ ...form, privacy: !form.privacy })}
								className={`w-14 h-7 rounded-full transition-all duration-300 relative p-1 ${form.privacy ? 'bg-[#F2B94B]' : 'bg-gray-700'}`}
							>
								<div className={`w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-300 ${form.privacy ? 'translate-x-7' : 'translate-x-0'}`} />
							</button>
						</div>

						<button
							type="submit"
							disabled={status !== 'IDLE' || !isConnected}
							className="w-full py-5 bg-[#F2B94B] text-[#0B1020] font-black uppercase tracking-[0.2em] rounded-xl shadow-[0_10px_40px_rgba(242,185,75,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center space-y-0 space-x-3 text-sm"
						>
							<span>{isConnected ? 'Broadside Intent' : 'Connect to Broadside'}</span>
							<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
							</svg>
						</button>
					</form>
				</div>
			</div>

			<div className="space-y-6">
				<div className="bg-[#0F1A2E] border border-white/5 rounded-2xl p-6 shadow-xl">
					<h3 className="text-[10px] font-space font-bold uppercase tracking-[0.3em] text-gray-500 mb-6">Route Topology</h3>
					<div className="space-y-5">
						{[
							{ step: '1', title: 'Solver Selection', desc: 'Yellow Fusion+ Bonded' },
							{ step: '2', title: 'Confidentiality', desc: 'Fhenix Encrypted CCM' },
							{ step: '3', title: 'Cross-chain Hop', desc: 'LI.FI Stargate Abstraction' },
							{ step: '4', title: 'Atomic Settlement', desc: 'Uniswap v4 JACK Hook' }
						].map((item) => (
							<div key={item.step} className="flex items-start space-x-4">
								<div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-[10px] font-bold border border-white/5 text-[#F2B94B]">{item.step}</div>
								<div>
									<p className="text-xs font-bold text-white">{item.title}</p>
									<p className="text-[10px] text-gray-500 font-semibold">{item.desc}</p>
								</div>
							</div>
						))}
						<div className="mt-8 pt-6 border-t border-white/5">
							<div className="flex justify-between text-xs font-bold uppercase tracking-tighter">
								<span className="text-gray-500">Estimated Gas</span>
								<span className="text-[#38BDF8]">$12.40</span>
							</div>
							<div className="flex justify-between text-xs font-bold uppercase tracking-tighter mt-3">
								<span className="text-gray-500">Kernel Latency</span>
								<span className="text-[#38BDF8]">~45s</span>
							</div>
						</div>
					</div>
				</div>

				<div className="bg-gradient-to-br from-[#F2B94B]/20 to-transparent border border-[#F2B94B]/30 rounded-2xl p-6 shadow-2xl">
					<p className="text-[10px] font-black text-[#F2B94B] uppercase tracking-[0.2em] mb-3">Kernel Guardrails</p>
					<p className="text-xs text-gray-300 leading-relaxed font-medium">
						JACK employs Policy-Constrained Private Execution. Any violation of constraints triggers a fail-closed response at the settlement hook.
					</p>
				</div>
			</div>
		</div>
	);
};
