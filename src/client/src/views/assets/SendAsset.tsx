import { FC, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSendTapAssetMutation } from '../../graphql/mutations/__generated__/sendTapAsset.generated';
import { getErrorContent } from '../../utils/error';

export const SendAsset: FC = () => {
  const [address, setAddress] = useState('');

  const [sendAsset, { loading }] = useSendTapAssetMutation({
    onError: error => toast.error(getErrorContent(error)),
    onCompleted: () => {
      toast.success('Asset sent successfully');
      setAddress('');
    },
    refetchQueries: ['GetTapAssets', 'GetTapBalances', 'GetTapTransfers'],
  });

  const handleSend = () => {
    if (!address) {
      toast.error('Address is required');
      return;
    }
    sendAsset({ variables: { tapAddrs: [address] } });
  };

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold mb-3">Send Asset</h3>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Taproot Asset Address
            </label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="tap1..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
            />
          </div>
          <Button onClick={handleSend} disabled={loading || !address} size="sm">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
