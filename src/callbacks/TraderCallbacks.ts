import { inject, injectable } from "tsyringe";

import { TraderController } from "@spt-diffpatch/controllers/TraderController";
import { OnLoad } from "@spt-diffpatch/di/OnLoad";
import { OnUpdate } from "@spt-diffpatch/di/OnUpdate";
import { IEmptyRequestData } from "@spt-diffpatch/models/eft/common/IEmptyRequestData";
import { ITraderAssort, ITraderBase } from "@spt-diffpatch/models/eft/common/tables/ITrader";
import { IGetBodyResponseData } from "@spt-diffpatch/models/eft/httpResponse/IGetBodyResponseData";
import { HttpResponseUtil } from "@spt-diffpatch/utils/HttpResponseUtil";

@injectable()
export class TraderCallbacks implements OnLoad, OnUpdate
{
    constructor(
        @inject("HttpResponseUtil") protected httpResponse: HttpResponseUtil, // TODO: delay required
        @inject("TraderController") protected traderController: TraderController,
    )
    {}

    public async onLoad(): Promise<void>
    {
        this.traderController.load();
    }

    public async onUpdate(): Promise<boolean>
    {
        return this.traderController.update();
    }

    public getRoute(): string
    {
        return "aki-traders";
    }

    /** Handle client/trading/api/traderSettings */
    public getTraderSettings(
        url: string,
        info: IEmptyRequestData,
        sessionID: string,
    ): IGetBodyResponseData<ITraderBase[]>
    {
        return this.httpResponse.getBody(this.traderController.getAllTraders(sessionID));
    }

    /** Handle client/trading/api/getTrader */
    public getTrader(url: string, info: IEmptyRequestData, sessionID: string): IGetBodyResponseData<ITraderBase>
    {
        const traderID = url.replace("/client/trading/api/getTrader/", "");
        return this.httpResponse.getBody(this.traderController.getTrader(sessionID, traderID));
    }

    /** Handle client/trading/api/getTraderAssort */
    public getAssort(url: string, info: IEmptyRequestData, sessionID: string): IGetBodyResponseData<ITraderAssort>
    {
        const traderID = url.replace("/client/trading/api/getTraderAssort/", "");
        return this.httpResponse.getBody(this.traderController.getAssort(sessionID, traderID));
    }
}