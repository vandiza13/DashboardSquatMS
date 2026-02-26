'use client';

export default function Skeleton({ className = "" }) {
    // animate-pulse adalah class bawaan Tailwind untuk efek kedip
    return (
        <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded ${className}`}></div>
    );
}