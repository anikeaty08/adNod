// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IWETH} from "fhenix-confidential-contracts/contracts/interfaces/IWETH.sol";
import {FHERC20} from "fhenix-confidential-contracts/contracts/FHERC20/FHERC20.sol";
import {FHERC20NativeWrapper} from "fhenix-confidential-contracts/contracts/FHERC20/extensions/FHERC20NativeWrapper.sol";

contract AdNodePayoutWrapper is FHERC20NativeWrapper {
    constructor(IWETH wrappedNativeToken)
        FHERC20("AdNode Confidential ETH", "anETH", 6, "https://adnode.app/docs/payouts")
        FHERC20NativeWrapper(wrappedNativeToken)
    {}
}
