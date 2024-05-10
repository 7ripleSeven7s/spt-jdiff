import { inject, injectable } from "tsyringe";

import { QuestCallbacks } from "@spt-diffpatch/callbacks/QuestCallbacks";
import { HandledRoute, ItemEventRouterDefinition } from "@spt-diffpatch/di/Router";
import { IPmcData } from "@spt-diffpatch/models/eft/common/IPmcData";
import { IItemEventRouterResponse } from "@spt-diffpatch/models/eft/itemEvent/IItemEventRouterResponse";
import { ILogger } from "@spt-diffpatch/models/spt/utils/ILogger";

@injectable()
export class QuestItemEventRouter extends ItemEventRouterDefinition
{
    constructor(
        @inject("WinstonLogger") protected logger: ILogger,
        @inject("QuestCallbacks") protected questCallbacks: QuestCallbacks,
    )
    {
        super();
    }

    public override getHandledRoutes(): HandledRoute[]
    {
        return [
            new HandledRoute("QuestAccept", false),
            new HandledRoute("QuestComplete", false),
            new HandledRoute("QuestHandover", false),
            new HandledRoute("RepeatableQuestChange", false),
        ];
    }

    public override handleItemEvent(
        eventAction: string,
        pmcData: IPmcData,
        body: any,
        sessionID: string,
    ): IItemEventRouterResponse
    {
        this.logger.debug(`${eventAction} ${body.qid}`);
        switch (eventAction)
        {
            case "QuestAccept":
                return this.questCallbacks.acceptQuest(pmcData, body, sessionID);
            case "QuestComplete":
                return this.questCallbacks.completeQuest(pmcData, body, sessionID);
            case "QuestHandover":
                return this.questCallbacks.handoverQuest(pmcData, body, sessionID);
            case "RepeatableQuestChange":
                return this.questCallbacks.changeRepeatableQuest(pmcData, body, sessionID);
        }
    }
}
