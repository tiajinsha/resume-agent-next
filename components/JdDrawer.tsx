'use client';
import { Drawer } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import JdMatchPanel from './JdMatchPanel';
import type { MatchResult } from '@/lib/db/schema';

type Props = {
  open: boolean;
  onClose: () => void;
  candidateId: string;
  extractionStatus: string;
  initialMatchResults: MatchResult[];
  autoMatchFailed?: boolean;
  onMatchComplete?: () => void;
};

export default function JdDrawer({ open, onClose, candidateId, extractionStatus, initialMatchResults, autoMatchFailed, onMatchComplete }: Props) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="right"
      width={380}
      mask={false}
      title="JD 匹配"
      closeIcon={<CloseOutlined />}
      rootStyle={{ top: 44, bottom: 0, height: 'auto' }}
      styles={{ body: { padding: 16, overflow: 'auto' } }}
    >
      <JdMatchPanel
        candidateId={candidateId}
        extractionStatus={extractionStatus}
        initialMatchResults={initialMatchResults}
        autoMatchFailed={autoMatchFailed}
        onMatchComplete={onMatchComplete}
      />
    </Drawer>
  );
}
