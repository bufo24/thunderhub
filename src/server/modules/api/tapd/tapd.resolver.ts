import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { TapdNodeService } from '../../node/tapd/tapd-node.service';
import { CurrentUser } from '../../security/security.decorators';
import { UserId } from '../../security/security.types';
import {
  TapAddress,
  TapAssetList,
  TapAssetType,
  TapBalances,
  TapFederationServerList,
  TapFinalizeBatchResponse,
  TapMintResponse,
  TapSyncResult,
  TapTransferList,
  TapUniverseInfo,
  TapUniverseStats,
} from './tapd.types';

const ASSET_TYPE_MAP: Record<string, number> = {
  NORMAL: 0,
  COLLECTIBLE: 1,
};

const bufToHex = (val: any): string | undefined => {
  if (!val) return undefined;
  if (Buffer.isBuffer(val)) return val.toString('hex');
  if (val instanceof Uint8Array) return Buffer.from(val).toString('hex');
  if (typeof val === 'string') return val;
  if (val?.type === 'Buffer' && Array.isArray(val?.data)) {
    return Buffer.from(val.data).toString('hex');
  }
  return undefined;
};

const serializeAsset = (asset: any) => ({
  assetGenesis: asset.assetGenesis
    ? {
        genesisPoint: asset.assetGenesis.genesisPoint,
        name: asset.assetGenesis.name,
        metaHash: bufToHex(asset.assetGenesis.metaHash),
        assetId: bufToHex(asset.assetGenesis.assetId),
        assetType:
          ASSET_TYPE_MAP[asset.assetGenesis.assetType] ??
          asset.assetGenesis.assetType,
        outputIndex: asset.assetGenesis.outputIndex,
      }
    : null,
  amount: asset.amount?.toString(),
  lockTime: asset.lockTime,
  relativeLockTime: asset.relativeLockTime,
  scriptVersion: asset.scriptVersion,
  scriptKey: bufToHex(asset.scriptKey),
  isSpent: asset.isSpent,
  isBurn: asset.isBurn,
});

@Resolver()
export class TapdResolver {
  constructor(private tapdNodeService: TapdNodeService) {}

  // ── Assets ──

  @Query(() => TapAssetList)
  async getTapAssets(@CurrentUser() { id }: UserId) {
    const result = await this.tapdNodeService.listAssets(id);
    const assets = (result.assets || []).map(serializeAsset);
    return { assets };
  }

  @Query(() => TapBalances)
  async getTapBalances(
    @CurrentUser() { id }: UserId,
    @Args('groupBy', { nullable: true, defaultValue: 'groupKey' })
    groupBy?: string,
    @Args('filter', { nullable: true }) filter?: string
  ) {
    const mode =
      groupBy === 'assetId' ? ('assetId' as const) : ('groupKey' as const);
    const result = await this.tapdNodeService.listBalances(id, mode, filter);

    if (mode === 'assetId') {
      const balances = Object.entries(result.assetBalances || {}).map(
        ([key, value]: [string, any]) => ({
          assetId: key,
          groupKey: bufToHex(value?.groupKey),
          name: value?.assetGenesis?.name,
          balance: value?.balance?.toString(),
        })
      );
      return { balances };
    }

    // For groupKey mode, also fetch by assetId to get names and asset IDs
    const assetResult = await this.tapdNodeService.listBalances(id, 'assetId');
    const assetMap = new Map<string, { assetId: string; name: string }>();
    for (const [assetId, value] of Object.entries(
      assetResult.assetBalances || {}
    )) {
      const gk = bufToHex((value as any)?.groupKey);
      if (gk) {
        assetMap.set(gk, {
          assetId,
          name: (value as any)?.assetGenesis?.name || '',
        });
      }
    }

    const balances = Object.entries(result.assetGroupBalances || {}).map(
      ([key, value]: [string, any]) => {
        const assetInfo = assetMap.get(key);
        return {
          assetId: assetInfo?.assetId,
          groupKey: key,
          name: assetInfo?.name,
          balance: value?.balance?.toString(),
        };
      }
    );

    return { balances };
  }

  @Query(() => TapTransferList)
  async getTapTransfers(@CurrentUser() { id }: UserId) {
    const result = await this.tapdNodeService.listTransfers(id);
    const transfers = (result.transfers || []).map((t: any) => ({
      anchorTxHash: bufToHex(t.anchorTxHash) || t.anchorTxHash,
      anchorTxHeightHint: t.anchorTxHeightHint,
      anchorTxChainFees: t.anchorTxChainFees?.toString(),
      transferTimestamp: t.transferTimestamp?.toString(),
      label: t.label || null,
      inputs: (t.inputs || []).map((i: any) => ({
        anchorPoint: i.anchorPoint,
        assetId: bufToHex(i.assetId),
        amount: i.amount?.toString(),
      })),
      outputs: (t.outputs || []).map((o: any) => ({
        assetId: bufToHex(o.assetId),
        amount: o.amount?.toString(),
        scriptKeyIsLocal: o.scriptKeyIsLocal,
        outputType: o.outputType?.toString(),
      })),
    }));
    return { transfers };
  }

  // ── Addresses ──

  @Mutation(() => TapAddress)
  async newTapAddress(
    @CurrentUser() { id }: UserId,
    @Args('assetId', { nullable: true }) assetId?: string,
    @Args('groupKey', { nullable: true }) groupKey?: string,
    @Args('amt', { type: () => Int }) amt?: number
  ) {
    const result = await this.tapdNodeService.newAddr(id, {
      assetId: assetId || undefined,
      groupKey: groupKey || undefined,
      amt: amt || 0,
    });
    return {
      encoded: result.encoded,
      assetId: bufToHex(result.assetId),
      amount: result.amount?.toString(),
      scriptKey: bufToHex(result.scriptKey),
      internalKey: bufToHex(result.internalKey),
      taprootOutputKey: bufToHex(result.taprootOutputKey),
    };
  }

  @Query(() => TapAddress)
  async decodeTapAddress(
    @CurrentUser() { id }: UserId,
    @Args('addr') addr: string
  ) {
    const result = await this.tapdNodeService.decodeAddr(id, addr);
    return {
      encoded: result.encoded,
      assetId: bufToHex(result.assetId),
      groupKey: bufToHex(result.groupKey),
      amount: result.amount?.toString(),
      assetType: result.assetType?.toString(),
      scriptKey: bufToHex(result.scriptKey),
      internalKey: bufToHex(result.internalKey),
      taprootOutputKey: bufToHex(result.taprootOutputKey),
    };
  }

  // ── Transfers ──

  @Mutation(() => Boolean)
  async sendTapAsset(
    @CurrentUser() { id }: UserId,
    @Args('tapAddrs', { type: () => [String] }) tapAddrs: string[]
  ) {
    await this.tapdNodeService.sendAsset(id, tapAddrs);
    return true;
  }

  // ── Burn ──

  @Mutation(() => Boolean)
  async burnTapAsset(
    @CurrentUser() { id }: UserId,
    @Args('assetId') assetId: string,
    @Args('amount', { type: () => Int }) amount: number
  ) {
    await this.tapdNodeService.burnAsset(id, assetId, amount);
    return true;
  }

  // ── Minting ──

  @Mutation(() => TapMintResponse)
  async mintTapAsset(
    @CurrentUser() { id }: UserId,
    @Args('name') name: string,
    @Args('amount', { type: () => Int }) amount: number,
    @Args('assetType', {
      type: () => TapAssetType,
      defaultValue: TapAssetType.NORMAL,
    })
    assetType: TapAssetType,
    @Args('groupKey', { nullable: true }) groupKey?: string
  ) {
    const typeStr =
      assetType === TapAssetType.NORMAL ? 'NORMAL' : 'COLLECTIBLE';
    const result = await this.tapdNodeService.mintAsset(
      id,
      name,
      amount,
      typeStr,
      groupKey
    );
    return {
      batchKey: result.pendingBatch?.batchKey
        ? Buffer.from(result.pendingBatch.batchKey).toString('hex')
        : undefined,
    };
  }

  @Mutation(() => TapFinalizeBatchResponse)
  async finalizeTapBatch(@CurrentUser() { id }: UserId) {
    const result = await this.tapdNodeService.finalizeBatch(id);
    return {
      batchKey: result.batch?.batchKey
        ? Buffer.from(result.batch.batchKey).toString('hex')
        : undefined,
    };
  }

  @Mutation(() => Boolean)
  async cancelTapBatch(@CurrentUser() { id }: UserId) {
    await this.tapdNodeService.cancelBatch(id);
    return true;
  }

  // ── Universe ──

  @Query(() => TapUniverseInfo)
  async getTapUniverseInfo(@CurrentUser() { id }: UserId) {
    return this.tapdNodeService.universeInfo(id);
  }

  @Query(() => TapUniverseStats)
  async getTapUniverseStats(@CurrentUser() { id }: UserId) {
    return this.tapdNodeService.universeStats(id);
  }

  @Query(() => TapFederationServerList)
  async getTapFederationServers(@CurrentUser() { id }: UserId) {
    const result = await this.tapdNodeService.listFederationServers(id);
    return { servers: result.servers || [] };
  }

  @Mutation(() => Boolean)
  async addTapFederationServer(
    @CurrentUser() { id }: UserId,
    @Args('host') host: string
  ) {
    await this.tapdNodeService.addFederationServer(id, host);
    return true;
  }

  @Mutation(() => Boolean)
  async removeTapFederationServer(
    @CurrentUser() { id }: UserId,
    @Args('host') host: string
  ) {
    await this.tapdNodeService.deleteFederationServer(id, host);
    return true;
  }

  @Mutation(() => TapSyncResult)
  async syncTapUniverse(
    @CurrentUser() { id }: UserId,
    @Args('host') host: string
  ) {
    const result = await this.tapdNodeService.syncUniverse(id, host);
    const syncedUniverses = (result.syncedUniverses || []).map(
      (u: any) => u.id?.assetIdStr || bufToHex(u.id?.assetId) || 'unknown'
    );
    return { syncedUniverses };
  }
}
