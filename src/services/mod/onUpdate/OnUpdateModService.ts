import { DependencyContainer, injectable } from "tsyringe";

import { OnUpdateMod } from "@spt-diffpatch/services/mod/onUpdate/OnUpdateMod";

@injectable()
export class OnUpdateModService
{
    constructor(protected container: DependencyContainer)
    {}

    public registerOnUpdate(name: string, onUpdate: (timeSinceLastRun: number) => boolean, getRoute: () => string): void
    {
        this.container.register(name, { useValue: new OnUpdateMod(onUpdate, getRoute) });
        this.container.registerType("OnUpdate", name);
    }
}
