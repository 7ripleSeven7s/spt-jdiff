import { inject, injectable } from "tsyringe";

import { TradeController } from "@spt-diffpatch/controllers/TradeController";
import { IPmcData } from "@spt-diffpatch/models/eft/common/IPmcData";
import { IItemEventRouterResponse } from "@spt-diffpatch/models/eft/itemEvent/IItemEventRouterResponse";
import { IProcessBaseTradeRequestData } from "@spt-diffpatch/models/eft/trade/IProcessBaseTradeRequestData";
import { IProcessRagfairTradeRequestData } from "@spt-diffpatch/models/eft/trade/IProcessRagfairTradeRequestData";
import { ISellScavItemsToFenceRequestData } from "@spt-diffpatch/models/eft/trade/ISellScavItemsToFenceRequestData";

@injectable()
export class TradeCallbacks
{
    constructor(@inject("TradeController") protected tradeController: TradeController)
    {}

    /**
     * Handle client/game/profile/items/moving TradingConfirm event
     */
    public processTrade(
        pmcData: IPmcData,
        body: IProcessBaseTradeRequestData,
        sessionID: string,
    ): IItemEventRouterResponse
    {
        // body can be IProcessBuyTradeRequestData or IProcessSellTradeRequestData
        return this.tradeController.confirmTrading(pmcData, body, sessionID);
    }

    /** Handle RagFairBuyOffer event */
    public processRagfairTrade(
        pmcData: IPmcData,
        body: IProcessRagfairTradeRequestData,
        sessionID: string,
    ): IItemEventRouterResponse
    {
        return this.tradeController.confirmRagfairTrading(pmcData, body, sessionID);
    }

    /** Handle SellAllFromSavage event */
    public sellAllFromSavage(
        pmcData: IPmcData,
        body: ISellScavItemsToFenceRequestData,
        sessionID: string,
    ): IItemEventRouterResponse
    {
        return this.tradeController.sellScavItemsToFence(pmcData, body, sessionID);
    }
}