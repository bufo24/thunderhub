import { FC, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useGetTapAssetsQuery } from '../../graphql/queries/__generated__/getTapAssets.generated';
import { useGetTapBalancesQuery } from '../../graphql/queries/__generated__/getTapBalances.generated';
import { getErrorContent } from '../../utils/error';
import { cn } from '../../lib/utils';

type GroupBy = 'groupKey' | 'assetId';

export const AssetsList: FC = () => {
  const [groupBy, setGroupBy] = useState<GroupBy>('groupKey');

  const {
    data: assetsData,
    loading: assetsLoading,
    error: assetsError,
  } = useGetTapAssetsQuery({
    onError: error => toast.error(getErrorContent(error)),
  });

  const { data: balancesData, loading: balancesLoading } =
    useGetTapBalancesQuery({
      variables: { groupBy },
      onError: error => toast.error(getErrorContent(error)),
    });

  if (assetsLoading || balancesLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="animate-spin text-muted-foreground" size={20} />
      </div>
    );
  }

  if (assetsError) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        <Info className="mr-2" size={16} />
        Unable to load assets. Make sure you are connected via litd.
      </div>
    );
  }

  const assets = assetsData?.getTapAssets?.assets || [];
  const balances = balancesData?.getTapBalances?.balances || [];

  if (assets.length === 0 && balances.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        <Info className="mr-2" size={16} />
        No assets found. Mint your first asset to get started.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Group by:</span>
        <div className="flex gap-1">
          {(['groupKey', 'assetId'] as const).map(option => (
            <Button
              key={option}
              variant={groupBy === option ? 'default' : 'outline'}
              size="sm"
              className={cn('text-xs h-7')}
              onClick={() => setGroupBy(option)}
            >
              {option === 'groupKey' ? 'Group Key' : 'Asset ID'}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        {balances.map((entry, i) => (
          <Card key={`${entry.assetId || entry.groupKey}-${i}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="font-semibold">
                    {entry.name || 'Unknown'}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono truncate max-w-[300px]">
                    {groupBy === 'groupKey'
                      ? entry.groupKey || entry.assetId
                      : entry.assetId}
                  </span>
                  {groupBy === 'groupKey' && entry.groupKey && (
                    <span className="text-[10px] text-muted-foreground/60">
                      Group
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-lg font-semibold">
                    {entry.balance || '0'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
