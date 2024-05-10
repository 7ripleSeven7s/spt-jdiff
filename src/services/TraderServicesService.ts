import { ProfileHelper } from "@spt-diffpatch/helpers/ProfileHelper";
import { QuestStatus } from "@spt-diffpatch/models/enums/QuestStatus";
import { ITraderServiceModel } from "@spt-diffpatch/models/spt/services/ITraderServiceModel";
import { ILogger } from "@spt-diffpatch/models/spt/utils/ILogger";
import { DatabaseServer } from "@spt-diffpatch/servers/DatabaseServer";
import { JsonUtil } from "@spt-diffpatch/utils/JsonUtil";
import { inject, injectable } from "tsyringe";

@injectable()
export class TraderServicesService
{
    constructor(
        @inject("ProfileHelper") protected profileHelper: ProfileHelper,
        @inject("JsonUtil") protected jsonUtil: JsonUtil,
        @inject("WinstonLogger") protected logger: ILogger,
        @inject("DatabaseServer") protected databaseServer: DatabaseServer,
    )
    {}

    public getTraderServices(sessionId: string, traderId: string): ITraderServiceModel[]
    {
        const pmcData = this.profileHelper.getPmcProfile(sessionId);
        let traderServices = this.jsonUtil.clone(this.databaseServer.getTables().traders[traderId]?.services);
        if (!traderServices)
        {
            return [];
        }

        // Filter out any service the user doesn't meet the conditions for
        const servicesToDelete = [];
        for (const service of traderServices)
        {
            if (service.requirements?.standings)
            {
                for (const [standingTrader, standing] of Object.entries(service.requirements.standings))
                {
                    if (pmcData.TradersInfo[standingTrader].standing < standing)
                    {
                        servicesToDelete.push(service.serviceType);
                        break;
                    }
                }
            }

            if (service.requirements?.completedQuests)
            {
                for (const questId of service.requirements.completedQuests)
                {
                    const quest = pmcData.Quests.find((x) => x.qid === questId);
                    if (!quest || quest.status !== QuestStatus.Success)
                    {
                        servicesToDelete.push(service.serviceType);
                        break;
                    }
                }
            }
        }

        // Clear any unavailable services from the list
        traderServices = traderServices.filter((x) => !servicesToDelete.includes(x.serviceType));

        return traderServices;
    }
}
