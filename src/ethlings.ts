import { Address, BigInt, log } from "@graphprotocol/graph-ts"
import { store } from '@graphprotocol/graph-ts'

import {
  Ethlings,
  Transfer,
  AvatarChanged,
  AvatarSlotsRerolled,
  AvatarSlotUnlocked
} from "../generated/Ethlings/Ethlings"
import {
  SkinDrop
} from "../generated/SkinDrop/SkinDrop"
import { 
  User as UserEntity,
  Avatar as AvatarEntity,
  Original as OriginalEntity,
  Info as InfoEntity
} from "../generated/schema"
import { Wearables } from "../generated/Wearables/Wearables"

import {
  getAvatarNumber,
  getAvatarColor,
  getAvatarSlots,
  getAvatarSpecies,
  getAvatarWorn,
  stripAvatarId,
  getOriginalSlot
} from "./utils"

const skinDropAddress = "0x9e28789EC0E126aDcDcB952ABFfA4Cb2A48f352b" //replace with address of Skin Drop

export function handleTransfer(event: Transfer): void {
  if (event.params.to.equals(Address.fromI32(0))) {
    store.remove('Avatar', event.params.tokenId.toHex())
    return
  }
  
  let receiver = UserEntity.load(event.params.to.toHex())
  if (receiver == null) {
    receiver = new UserEntity(event.params.to.toHex())
    receiver.save()
  }

  let contract = Ethlings.bind(event.address)
  

  let avatar = AvatarEntity.load(event.params.tokenId.toHex())
  if (avatar == null) {
    avatar = new AvatarEntity(event.params.tokenId.toHex())
    avatar.number = getAvatarNumber(event.params.tokenId)
    avatar.slots = getAvatarSlots(event.params.tokenId)
    avatar.slotCount = BigInt.fromI32(avatar.slots.filter(c => c.equals(BigInt.fromI32(1))).length)
    avatar.species = getAvatarSpecies(event.params.tokenId)
    avatar.color = getAvatarColor(event.params.tokenId)
    avatar.createdAt = event.block.timestamp

    let skinDropContract = SkinDrop.bind(Address.fromString(skinDropAddress))
    let resSelection = skinDropContract.try_claims(avatar.number)
    if (!resSelection.reverted) {
      avatar.skinDropSelection = BigInt.fromI32(resSelection.value);
    } else {
      avatar.skinDropSelection = BigInt.fromI32(0);
    }
  }
  avatar.owner = event.params.to.toHex()
  let worn = getAvatarWorn(contract.avatars(event.params.tokenId))
  let wornIds: string[] = []
  for (let x = 0; x < worn.length; x++) {
    wornIds.push(worn[x].toHex())
  }
  avatar.worn = wornIds
  avatar.tradedAt = event.block.timestamp
  avatar.save()

  let wearablesAddress = contract.wearables()
  updateSupplies(wearablesAddress, worn, event.block.timestamp)
}

export function handleAvatarChanged(event: AvatarChanged): void {
  let contract = Ethlings.bind(event.address)

  let avatarId = stripAvatarId(event.params.avatarId)
  let avatar = AvatarEntity.load(avatarId.toHex())
  if (avatar == null) {
    avatar = new AvatarEntity(avatarId.toHex())
    avatar.number = getAvatarNumber(event.params.avatarId)
    avatar.slots = getAvatarSlots(event.params.avatarId)
    avatar.slotCount = BigInt.fromI32(avatar.slots.filter(c => c.equals(BigInt.fromI32(1))).length)
    avatar.species = getAvatarSpecies(event.params.avatarId)
    avatar.color = getAvatarColor(event.params.avatarId)
    avatar.createdAt = event.block.timestamp

    let skinDropContract = SkinDrop.bind(Address.fromString(skinDropAddress))
    let resSelection = skinDropContract.try_claims(avatar.number)
    if (!resSelection.reverted) {
      avatar.skinDropSelection = BigInt.fromI32(resSelection.value);
    } else {
      avatar.skinDropSelection = BigInt.fromI32(0);
    }
  }
  let worn = getAvatarWorn(contract.avatars(avatarId))
  let wornIds: string[] = []
  for (let x = 0; x < worn.length; x++) {
    wornIds.push(worn[x].toHex())
  }
  avatar.worn = wornIds
  avatar.save()

  let wearablesAddress = contract.wearables()
  updateSupplies(wearablesAddress, worn, event.block.timestamp)
}

function updateSupplies(wearablesAddress: Address, worn: BigInt[], timestamp: BigInt): void {
  let wearables = Wearables.bind(wearablesAddress)
  for (let x = 0; x < worn.length; x++) {
    let id = worn[x]
    let original = OriginalEntity.load(id.toHex())
    if (original == null) {
      original = new OriginalEntity(id.toHex())
      original.createdAt = timestamp
      original.scalar = wearables.getScalar(id)
      original.expiration = wearables.getExpiration(id)
      original.slot = getOriginalSlot(id)
    }
    let supply = wearables.getPrintSupply(id)
    original.supply = supply
    if (original.expiration >= timestamp) {
      original.printPrice = wearables.getPrintPrice(id, supply.plus(BigInt.fromI32(1)))
      original.burnPrice = wearables.getBurnPrice(id, supply)
    } else {
      original.printPrice = BigInt.fromI32(0)
      original.burnPrice = BigInt.fromI32(0)
    }
    original.save()
  }
}

export function handleAvatarRerolled(event: AvatarSlotsRerolled): void {
  let stats = InfoEntity.load("0x0000000000000000000000000000000000000000")
  if (stats == null) {
    stats = new InfoEntity("0x0000000000000000000000000000000000000000")
    stats.rerolls = BigInt.fromI32(0)
    stats.unlocks = BigInt.fromI32(0)
    stats.tokensBurned = BigInt.fromI32(0)
  }
  stats.rerolls = stats.rerolls.plus(BigInt.fromI32(1))
  stats.tokensBurned = stats.tokensBurned.plus(BigInt.fromI32(2000))
  stats.save()
}

export function handleAvatarUnlocked(event: AvatarSlotUnlocked): void {
  let stats = InfoEntity.load("0x0000000000000000000000000000000000000000")
  if (stats == null) {
    stats = new InfoEntity("0x0000000000000000000000000000000000000000")
    stats.rerolls = BigInt.fromI32(0)
    stats.unlocks = BigInt.fromI32(0)
    stats.tokensBurned = BigInt.fromI32(0)
  }
  stats.unlocks = stats.unlocks.plus(BigInt.fromI32(1))
  stats.tokensBurned = stats.tokensBurned.plus(BigInt.fromI32(10000))
  stats.save()
}