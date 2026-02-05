'use client';

import React, { useEffect, useState } from 'react';
import { JACK_SDK, Intent } from '../../../../packages/sdk';

interface ExecutionsListViewProps {
	onSelectExecution: (id: string) => void;
}

export const ExecutionsListView: React.FC<ExecutionsListViewProps> = ({ onSelectExecution }) => {
	const [executions, setExecutions] = useState<Intent[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const fetchExecutions = async () => {
			try {
				const sdk = new JACK_SDK();
				const list = await sdk.listIntents();
				setExecutions(list);
			} catch (error) {
				console.error('Failed to fetch executions:', error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchExecutions();
		const interval = setInterval(fetchExecutions, 5000);
		return () => clearInterval(interval);
	}, []);

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'SETTLED': return 'text-green-400 bg-green-400/10 border-green-400/20';
			case 'EXECUTING':
			case 'ROUTING': return 'text-[#38BDF8] bg-[#38BDF8]/10 border-[#38BDF8]/20 animate-pulse';
			case 'SETTLING':
			case 'QUOTED': return 'text-[#F2B94B] bg-[#F2B94B]/10 border-[#F2B94B]/20';
			case 'ABORTED': return 'text-red-400 bg-red-400/10 border-red-400/20';
			default: return 'text-gray-400 bg-gray-400/10 border-gray-400/10';
		}
	};

	const getTimeAgo = (timestamp: number) => {
		const seconds = Math.floor((Date.now() - timestamp) / 1000);
		if (seconds < 60) return `${seconds}s ago`;
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}m ago`;
		return `${Math.floor(minutes / 60)}h ago`;
	};

	return (
		<div className="space-y-8 animate-in slide-in-from-bottom-6 duration-700">
			<div className="flex justify-between items-end mb-4">
				<div className="space-y-1">
					<h2 className="text-3xl font-space font-black uppercase tracking-tighter">Execution Registry</h2>
					<p className="text-xs text-gray-500 font-bold uppercase tracking-[0.2em]">Real-time Cross-chain orchestration log</p>
				</div>
				<div className="flex items-center space-x-2 text-[10px] font-black text-gray-600 uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full border border-white/5">
					<div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
					<span>Syncing with Kernel</span>
				</div>
			</div>

			<div className="bg-[#0F1A2E] border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative">
				<div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
				<table className="w-full text-left relative z-10">
					<thead>
						<tr className="bg-white/5 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
							<th className="px-8 py-6">ID</th>
							<th className="px-8 py-6">Route Topology</th>
							<th className="px-8 py-6">Asset Manifest</th>
							<th className="px-8 py-6">Status</th>
							<th className="px-8 py-6">Delta</th>
							<th className="px-8 py-6"></th>
						</tr>
					</thead>
					<tbody className="divide-y divide-white/5">
						{isLoading && executions.length === 0 ? (
							<tr><td colSpan={6} className="px-8 py-20 text-center text-gray-500 font-mono text-sm">Initializing Registry Surface...</td></tr>
						) : executions.length === 0 ? (
							<tr><td colSpan={6} className="px-8 py-20 text-center text-gray-500 font-mono text-sm">No Active Intents in Kernel Store</td></tr>
						) : executions.map((exec) => (
							<tr
								key={exec.id}
								className="hover:bg-white/[0.03] transition-all cursor-pointer group"
								onClick={() => onSelectExecution(exec.id)}
							>
								<td className="px-8 py-7">
									<span className="font-mono text-xs font-black text-[#F2B94B] tracking-tight">{exec.id}</span>
								</td>
								<td className="px-8 py-7">
									<div className="flex items-center space-x-3">
										<div className="px-2 py-1 bg-white/5 rounded-md text-[9px] font-black text-white border border-white/10 uppercase">{exec.params.sourceChain.substring(0, 3)}</div>
										<svg className="w-4 h-4 text-gray-700 group-hover:text-[#F2B94B] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7-7 7M5 12h14" />
										</svg>
										<div className="px-2 py-1 bg-[#F2B94B]/10 rounded-md text-[9px] font-black text-[#F2B94B] border border-[#F2B94B]/20 uppercase">{exec.params.destinationChain.substring(0, 3)}</div>
									</div>
								</td>
								<td className="px-8 py-7">
									<div className="space-y-0.5">
										<p className="text-sm font-black text-white">{exec.params.amountIn}</p>
										<p className="text-[10px] font-bold text-gray-500 uppercase">{exec.params.tokenIn}</p>
									</div>
								</td>
								<td className="px-8 py-7">
									<span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${getStatusColor(exec.status)}`}>
										{exec.status}
									</span>
								</td>
								<td className="px-8 py-7 text-xs font-bold text-gray-500 uppercase">{getTimeAgo(exec.createdAt)}</td>
								<td className="px-8 py-7 text-right">
									<div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-[#F2B94B] transition-all group-hover:scale-110 shadow-lg">
										<svg className="w-5 h-5 text-gray-400 group-hover:text-[#0B1020] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
										</svg>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
};
