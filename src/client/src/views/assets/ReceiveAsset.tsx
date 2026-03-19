import { FC, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Copy, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNewTapAddressMutation } from '../../graphql/mutations/__generated__/newTapAddress.generated';
import { useGetTapBalancesQuery } from '../../graphql/queries/__generated__/getTapBalances.generated';
import { getErrorContent } from '../../utils/error';

export const ReceiveAsset: FC = () => {
  const [selectedKey, setSelectedKey] = useState('');
  const [customAssetId, setCustomAssetId] = useState('');
  const [amount, setAmount] = useState('');
  const [generatedAddr, setGeneratedAddr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: balancesData } = useGetTapBalancesQuery({
    variables: { groupBy: 'groupKey' },
  });

  const knownAssets = (balancesData?.getTapBalances?.balances || [])
    .filter(b => b.groupKey)
    .map(b => ({
      groupKey: b.groupKey!,
      assetId: b.assetId || '',
      name: b.name || 'Unknown',
    }));

  const isCustom = selectedKey === '__custom';
  const selectedEntry = knownAssets.find(a => a.groupKey === selectedKey);
  const resolvedGroupKey = isCustom ? undefined : selectedEntry?.groupKey;
  const resolvedAssetId = isCustom ? customAssetId : undefined;
  const canGenerate = isCustom ? !!customAssetId : !!resolvedGroupKey;

  const [newAddress, { loading }] = useNewTapAddressMutation({
    onError: error => toast.error(getErrorContent(error)),
    onCompleted: data => {
      const addr = data.newTapAddress?.encoded;
      if (addr) {
        setGeneratedAddr(addr);
        toast.success('Address generated');
      }
    },
  });

  const handleGenerate = () => {
    if (!canGenerate || !amount) {
      toast.error('Asset and amount are required');
      return;
    }
    setGeneratedAddr(null);
    newAddress({
      variables: {
        groupKey: resolvedGroupKey || null,
        assetId: resolvedAssetId || null,
        amt: parseInt(amount, 10),
      },
    });
  };

  const handleCopy = () => {
    if (generatedAddr) {
      navigator.clipboard.writeText(generatedAddr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold mb-3">Receive Asset</h3>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Asset
            </label>
            <select
              value={selectedKey}
              onChange={e => {
                setSelectedKey(e.target.value);
                setGeneratedAddr(null);
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select an asset...</option>
              {knownAssets.map(a => (
                <option key={a.groupKey} value={a.groupKey}>
                  {a.name} (group: {a.groupKey.slice(0, 16)}...)
                </option>
              ))}
              <option value="__custom">Enter ID manually...</option>
            </select>
            {isCustom && (
              <input
                type="text"
                value={customAssetId}
                onChange={e => setCustomAssetId(e.target.value)}
                placeholder="Asset ID (hex)"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono mt-2"
              />
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Amount
            </label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="100"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <Button
            onClick={handleGenerate}
            disabled={loading || !canGenerate || !amount}
            size="sm"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate Address
          </Button>
          {generatedAddr && (
            <div className="mt-2 p-3 rounded-md bg-muted">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-mono break-all">{generatedAddr}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={handleCopy}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
