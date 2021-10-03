import { Address, BigInt, log } from "@graphprotocol/graph-ts"

import {
  RedeemedSkins
} from "../generated/SkinDrop/SkinDrop"
import { 
  Avatar as AvatarEntity,
} from "../generated/schema"

export function handleRedeemedSkin(event: RedeemedSkins): void {
  let ids: BigInt[] = event.params.ethlingIds
  let selections: BigInt[] = event.params.selections
  for (let i = 0; i < event.params.ethlingIds.length; i++) {
    let ethling = AvatarEntity.load(ids[i].toHex())
    ethling.skinDropSelection = selections[i]
    ethling.save()
  }
}