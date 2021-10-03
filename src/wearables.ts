import { Address, BigInt } from "@graphprotocol/graph-ts"
import { store } from '@graphprotocol/graph-ts'
import {
  Wearables,
  TransferBatch,
  TransferSingle,
} from "../generated/Wearables/Wearables"
import { 
  User as UserEntity,
  Original as OriginalEntity,
  Print as PrintEntity,
  UserPrint as UserPrintEntity,
} from "../generated/schema"

import {
  isOriginal,
  getOriginalFromPrint,
  getOriginalSlot
} from "./utils"

export function handleTransferSingle(event: TransferSingle): void {
  let receiver = UserEntity.load(event.params.to.toHex())
  if (receiver == null) {
    receiver = new UserEntity(event.params.to.toHex())
    receiver.save()
  }

  if (isOriginal(event.params.id)) {
    handleOriginalTransfer(event.address, event.block.timestamp, event.params.id, event.params.to)
  } else {
    handlePrintTransfer(event.address, event.block.timestamp,  event.params.id, event.params.from, event.params.to, event.params.value)
  }
}

export function handleTransferBatch(event: TransferBatch): void {
  let receiver = UserEntity.load(event.params.to.toHex())
  if (receiver == null) {
    receiver = new UserEntity(event.params.to.toHex())
    receiver.save()
  }
  let ids: BigInt[] = event.params.ids
  let values: BigInt[] = event.params.values
  for (let i = 0; i < event.params.ids.length; i++) {
    if (isOriginal(ids[i])) {
      handleOriginalTransfer(event.address, event.block.timestamp, ids[i], event.params.to)
    }  else {
      handlePrintTransfer(event.address, event.block.timestamp, ids[i], event.params.from, event.params.to, values[i])
    }
  }
}

function handleOriginalTransfer(
  contractAddress: Address, 
  timestamp: BigInt,
  originalId: BigInt, 
  to: Address): void
{
  let contract = Wearables.bind(contractAddress)
  let original = OriginalEntity.load(originalId.toHex())
  if (original == null) {
    original = new OriginalEntity(originalId.toHex())
    original.createdAt = timestamp
    original.scalar = contract.getScalar(originalId)
    original.expiration = contract.getExpiration(originalId)
    original.slot = getOriginalSlot(originalId)
  }
  original.owner = to.toHex()
  let supply = contract.getPrintSupply(originalId)
  original.supply = supply
  if (original.expiration >= timestamp) {
    original.printPrice = contract.getPrintPrice(originalId, supply.plus(BigInt.fromI32(1)))
    original.burnPrice = contract.getBurnPrice(originalId, supply)
  } else {
    original.printPrice = BigInt.fromI32(0)
    original.burnPrice = BigInt.fromI32(0)
  }
  original.tradedAt = timestamp
  original.reserve = contract.getReserveAmount(originalId)
  original.royalties = contract.getRoyaltyAmount(originalId)
  original.save()
}

function handlePrintTransfer(
  contractAddress: Address, 
  timestamp: BigInt,
  printId: BigInt, 
  from: Address, 
  to: Address, 
  amount: BigInt): void 
{
  let contract = Wearables.bind(contractAddress)
  let originalId = getOriginalFromPrint(printId)

  let print = PrintEntity.load(printId.toHex())
  if (print == null) {
    print = new PrintEntity(printId.toHex())
    print.original = getOriginalFromPrint(printId).toHex()
  }
  print.tradedAt = timestamp
  print.totalPrints = contract.getPrintSupply(originalId)
  print.save()

  let senderPrint = UserPrintEntity.load(from.toHex() + '-' + printId.toHex())
  if (senderPrint != null) {
    senderPrint.amount = senderPrint.amount.minus(amount)
    if (senderPrint.amount.le(BigInt.fromI32(0))) {
      store.remove('UserPrint', senderPrint.id)
    } else {
      senderPrint.save()
    }
  }

  if (!to.equals(Address.fromI32(0))) {
    let receiverPrint = UserPrintEntity.load(to.toHex() + '-' + printId.toHex())
    if (receiverPrint == null) {
      receiverPrint = new UserPrintEntity(to.toHex() + '-' + printId.toHex())
      receiverPrint.user = to.toHex()
      receiverPrint.print = printId.toHex()
      receiverPrint.amount = BigInt.fromI32(0)
    }
    receiverPrint.amount = receiverPrint.amount.plus(amount)
    receiverPrint.save()
  }

  let original = OriginalEntity.load(originalId.toHex())
  if (original == null) {
    original = new OriginalEntity(originalId.toHex())
    original.createdAt = timestamp
    original.scalar = contract.getScalar(originalId)
    original.expiration = contract.getExpiration(originalId)
    original.slot = getOriginalSlot(originalId)
  }
  let supply = contract.getPrintSupply(originalId)
  original.supply = supply
  if (original.expiration >= timestamp) {
    original.printPrice = contract.getPrintPrice(originalId, supply.plus(BigInt.fromI32(1)))
    original.burnPrice = contract.getBurnPrice(originalId, supply)
  } else {
    original.printPrice = BigInt.fromI32(0)
    original.burnPrice = BigInt.fromI32(0)
  }
  original.tradedAt = timestamp
  original.reserve = contract.getReserveAmount(originalId)
  original.royalties = contract.getRoyaltyAmount(originalId)
  original.save()
}

