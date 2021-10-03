import { Address, BigInt } from "@graphprotocol/graph-ts"

function isOriginal(id: BigInt): boolean {
    return id.bitAnd(BigInt.fromI32(1).leftShift(208)).gt(BigInt.fromI32(0))
}

function getOriginalFromPrint(id: BigInt): BigInt {
    return id.bitOr(BigInt.fromI32(1).leftShift(208))
}

function getOriginalSlot(id: BigInt): BigInt {
    let slotMask = BigInt.fromI32(0xFFFF)
    let index = 0
    while (index < 13) {
        if (id.bitAnd(slotMask).gt(BigInt.fromI32(0)))
            return BigInt.fromI32(index)
        slotMask = slotMask.leftShift(16)
        index += 1
    }
    return BigInt.fromI32(13)
}

function isAvatar(id: BigInt): boolean {
    return id.ge(BigInt.fromI32(1).leftShift(224))
}

function getAvatarSlots(id: BigInt): BigInt[] {
    let slotMask = id.rightShift(240)
    let slots: BigInt[] = []
    for (let x = 0; x < 13; x++) {
        slots.push(slotMask.bitAnd(BigInt.fromI32(1)))
        slotMask = slotMask.rightShift(1)
    }
    
    return slots
}

function getAvatarNumber(id: BigInt): BigInt {
    return id.rightShift(224).bitAnd(BigInt.fromI32(0x3FFF))
}

function getAvatarSpecies(id: BigInt): BigInt {
    return id.rightShift(254).bitAnd(BigInt.fromI32(0x3))
}

function getAvatarColor(id: BigInt): BigInt {
    return id.rightShift(238).bitAnd(BigInt.fromI32(0x3))
}

function getAvatarWorn(avatar: BigInt): BigInt[] {
    let mask = BigInt.fromI32(0xFFFF)
    let worn: BigInt[] = []
    for (let x = 0; x < 13; x++) {
        let print: BigInt = avatar.bitAnd(mask)
        if (print != BigInt.fromI32(0)) {
            let wearable: BigInt = getOriginalFromPrint(avatar.bitAnd(mask))
            worn.push(wearable)
        }
        mask = mask.leftShift(16)
    }
    return worn
}

function stripAvatarId(avatar: BigInt): BigInt {
    return avatar.bitAnd(BigInt.fromI32(0xFFFFFFFF).leftShift(224))
}

export {
    isOriginal,
    getOriginalFromPrint,
    getOriginalSlot,
    isAvatar,
    getAvatarSlots,
    getAvatarNumber,
    getAvatarSpecies,
    getAvatarColor,
    getAvatarWorn,
    stripAvatarId
}