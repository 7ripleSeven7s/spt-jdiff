import { inject, injectable } from "tsyringe";

import { IInventoryMagGen } from "@spt-diffpatch/generators/weapongen/IInventoryMagGen";
import { InventoryMagGen } from "@spt-diffpatch/generators/weapongen/InventoryMagGen";
import { BotWeaponGeneratorHelper } from "@spt-diffpatch/helpers/BotWeaponGeneratorHelper";

@injectable()
export class InternalMagazineInventoryMagGen implements IInventoryMagGen
{
    constructor(@inject("BotWeaponGeneratorHelper") protected botWeaponGeneratorHelper: BotWeaponGeneratorHelper)
    {}

    public getPriority(): number
    {
        return 0;
    }

    public canHandleInventoryMagGen(inventoryMagGen: InventoryMagGen): boolean
    {
        return inventoryMagGen.getMagazineTemplate()._props.ReloadMagType === "InternalMagazine";
    }

    public process(inventoryMagGen: InventoryMagGen): void
    {
        const bulletCount = this.botWeaponGeneratorHelper.getRandomizedBulletCount(
            inventoryMagGen.getMagCount(),
            inventoryMagGen.getMagazineTemplate(),
        );
        this.botWeaponGeneratorHelper.addAmmoIntoEquipmentSlots(
            inventoryMagGen.getAmmoTemplate()._id,
            bulletCount,
            inventoryMagGen.getPmcInventory(),
        );
    }
}