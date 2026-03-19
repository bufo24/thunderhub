import { AuthenticatedLnd } from 'lightning';
import { TapdRpcApis } from '@lightningpolar/tapd-api';

export type LitdConnectionMode = 'grpc' | 'session' | 'lnc';

export type LitdConnection = {
  lnd: AuthenticatedLnd;
  tapd: TapdRpcApis;
  mode: LitdConnectionMode;
};
