'use client';

import { usePathname } from 'next/navigation';
import { useSyncExternalStore, type ReactNode } from 'react';

import { getPageAssignments, getServerPageAssignments, subscribeToPageAssignments } from './page-assignments';

export interface VarifyDebugPanelProps {
  uid: string | null;
}

export const VarifyDebugPanel = ({ uid }: VarifyDebugPanelProps): ReactNode => {
  const pathname = usePathname();
  const page = useSyncExternalStore(subscribeToPageAssignments, getPageAssignments, getServerPageAssignments);
  const rows = page.pathname === pathname ? [...page.assignments.values()] : [];

  return (
    <details
      data-varify-debug=""
      style={{
        position: 'fixed',
        bottom: 8,
        right: 8,
        padding: 8,
        background: '#fff',
        border: '1px solid #ccc',
        font: '12px monospace',
        zIndex: 2147483647,
      }}
    >
      <summary>Varify {uid === null ? '(no id: bot or outside the proxy matcher)' : `uid ${uid}`}</summary>
      {rows.length === 0 ? (
        <p>No experiment rendered on this page.</p>
      ) : (
        <table>
          <tbody>
            {rows.map((assignment) => (
              <tr key={assignment.experimentId}>
                <td>{assignment.experimentId}</td>
                <td>{assignment.variation ?? 'original'}</td>
                <td>{assignment.source}</td>
                <td>{assignment.tracking === null ? 'not tracked' : 'tracked'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </details>
  );
};
