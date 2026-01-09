'use client';

export default function Skeleton({ className = "" }) {
    // animate-pulse adalah class bawaan Tailwind untuk efek kedip
    return (
        <div className={`animate-pulse bg-slate-200 rounded ${className}`}></div>
    );
}