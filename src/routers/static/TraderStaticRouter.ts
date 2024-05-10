import { inject, injectable } from "tsyringe";

import { TraderCallbacks } from "@spt-diffpatch/callbacks/TraderCallbacks";
import { RouteAction, StaticRouter } from "@spt-diffpatch/di/Router";

@injectable()
export class TraderStaticRouter extends StaticRouter
{
    constructor(@inject("TraderCallbacks") protected traderCallbacks: TraderCallbacks)
    {
        super([
            new RouteAction(
                "/client/trading/api/traderSettings",
                (url: string, info: any, sessionID: string, output: string): any =>
                {
                    return this.traderCallbacks.getTraderSettings(url, info, sessionID);
                },
            ),
        ]);
    }
}
