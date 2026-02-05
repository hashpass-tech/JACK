'use client';

import React, { useEffect, useState } from 'react';
import { JACK_SDK, ExecutionStatus, Intent } from '../../../../packages/sdk';

interface ExecutionDetailViewProps {
	id: string;
	onBack: () => void;
}

export const ExecutionDetailView: React.FC<ExecutionDetailViewProps> = ({ id, onBack }) => {
	const [intent, setIntent] = useState<Intent | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const fetchStatus = async () => {
			try {
				const sdk = new JACK_SDK();
				const data = await sdk.getExecutionStatus(id);
				setIntent(data);
			} catch (error) {
				console.error('Failed to fetch execution status:', error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchStatus();
		const interval = setInterval(fetchStatus, 2000);
		return () => clearInterval(interval);
	}, [id]);

	const getStepIcon = (stepStatus: string) => {
		if (stepStatus === 'COMPLETED') {
			return (
				<div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
					<svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
					</svg>
				</div>
			);
		}
		return (
			<div className="w-6 h-6 bg-[#38BDF8] rounded-full flex items-center justify-center animate-pulse shadow-[0_0_15px_#38BDF8]">
				<div className="w-2 h-2 bg-white rounded-full" />
			</div>
		);
	};

	if (isLoading && !intent) {
		return <div className="p-20 text-center text-gray-500 font-mono animate-pulse">Accessing Kernel Memory for {id}...</div>;
	}

	return (
		<div className="space-y-8 animate-in fade-in duration-500">
			<div className="flex items-center justify-between">
				<div className="flex items-center space-x-6">
					<button onClick={onBack} className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all border border-white/5 hover:border-white/10 group">
						<svg className="w-5 h-5 text-gray-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
						</svg>
					</button>
					<div>
						<h2 className="text-3xl font-space font-black flex items-center space-x-4 uppercase tracking-tighter">
							<span>Execution</span>
							<span className="text-[#F2B94B] font-mono select-all">{id}</span>
						</h2>
					</div>
				</div>
				<div className="flex space-x-4">
					{intent?.settlementTx && (
						<a
							href={`https://sepolia.basescan.org/tx/${intent.settlementTx}`}
							target="_blank"
							rel="noreferrer"
							className="px-6 py-3 bg-[#38BDF8] text-[#0B1020] rounded-xl text-xs font-black uppercase tracking-widest shadow-[0_0_30px_rgba(56,189,248,0.4)] hover:scale-105 transition-all flex items-center space-x-2"
						>
							<span>View On Explorer</span>
						</a>
					)}
					<button className="px-6 py-3 bg-white/5 text-white border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all">
						JSON Manifest
					</button>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-10">
				<div className="md:col-span-2 space-y-8">
					<div className="bg-[#0F1A2E] border border-white/5 rounded-3xl p-10 shadow-2xl relative overflow-hidden">
						<div className="absolute top-0 right-0 w-64 h-64 bg-[#38BDF8]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />

						<h3 className="text-xs font-space font-black uppercase tracking-[0.4em] text-gray-500 mb-10">Kernel Execution Trace</h3>

						<div className="space-y-12 relative">
							<div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-green-500 via-[#38BDF8] to-white/5" />

							{intent?.executionSteps.map((step, index) => (
								<div key={index} className="flex items-start space-x-6 relative z-10 animate-in slide-in-from-left-4 duration-500">
									{getStepIcon(step.status)}
									<div>
										<p className="text-sm font-black text-white uppercase tracking-tight">{step.step}</p>
										<p className="text-[10px] font-mono text-gray-500 mt-1 uppercase">{step.details || 'Processing...'}</p>
									</div>
								</div>
							))}
						</div>
					</div>

					<div className="bg-[#0F1A2E] border border-white/5 rounded-3xl p-10 shadow-xl overflow-hidden group">
						<div className="flex items-center justify-between mb-8">
							<h3 className="text-xs font-space font-black uppercase tracking-[0.4em] text-gray-500">Intent Manifest (v1)</h3>
							<div className="text-[10px] text-[#38BDF8] font-bold uppercase animate-pulse">Live Link: Connected</div>
						</div>
						<pre className="text-[12px] font-mono text-gray-300 bg-[#0B1020] p-6 rounded-2xl border border-white/5 overflow-x-auto shadow-inner leading-relaxed">
							{JSON.stringify(intent, null, 2)}
						</pre>
					</div>
				</div>

				<div className="space-y-10">
					<div className="bg-gradient-to-b from-[#F2B94B]/20 to-transparent border border-[#F2B94B]/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
						<div className="absolute -bottom-4 -right-4 w-24 h-24 bg-[#F2B94B]/20 rounded-full blur-2xl" />
						<h3 className="text-[10px] font-space font-black uppercase tracking-[0.4em] text-[#F2B94B] mb-6">Confidentiality Metrics</h3>
						<div className="space-y-6">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold text-gray-500 uppercase">Provider</span>
								<span className="text-xs text-white font-black uppercase">Fhenix Shield</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold text-gray-500 uppercase">Obfuscation</span>
								<span className="text-xs text-white font-black uppercase">Full (CCM)</span>
							</div>
							<div className="space-y-2">
								<div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase">
									<span>Entropy Level</span>
									<span className="text-[#F2B94B]">Optimal</span>
								</div>
								<div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
									<div className="w-4/5 h-full bg-[#F2B94B] shadow-[0_0_10px_#F2B94B]" />
								</div>
							</div>
							<p className="text-[10px] text-gray-500 font-bold uppercase italic text-center leading-loose">Policy constraints are evaluating in ciphertext to prevent MEV leakage</p>
						</div>
					</div>

					<div className="bg-[#0F1A2E] border border-white/5 rounded-3xl p-8 shadow-xl relative">
						<h3 className="text-[10px] font-space font-black uppercase tracking-[0.4em] text-gray-500 mb-8">Performance Telemetry</h3>
						<div className="space-y-8">
							<div className="text-center">
								<p className="text-4xl font-space font-black text-[#38BDF8] tracking-tighter">0.02%</p>
								<p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-2">Realized Slippage</p>
							</div>
							<div className="text-center pt-8 border-t border-white/5">
								<p className="text-3xl font-space font-black text-white tracking-tighter">${intent?.params?.amountIn}</p>
								<p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-2">Yield Optimized</p>
							</div>
							<div className="px-4 py-3 bg-[#38BDF8]/10 rounded-xl border border-[#38BDF8]/20 flex items-center justify-center space-x-2">
								<div className="w-2 h-2 bg-[#38BDF8] rounded-full animate-ping" />
								<span className="text-[10px] font-black text-[#38BDF8] uppercase tracking-widest">Live Syncing</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
