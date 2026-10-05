// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {LeagueEscrow} from "../src/LeagueEscrow.sol";

interface IERC20 {
    function balanceOf(address) external view returns (uint256);
    function approve(address, uint256) external returns (bool);
}

/// Runs the escrow against REAL BSC mainnet tokens on a fork: can bStocks
/// and BSC USDT be locked in a fresh contract and returned?
///
///   BSC_RPC_URL=https://bsc-dataseed.bnbchain.org forge test --match-contract LeagueEscrowFork -vv
///
/// Skipped when BSC_RPC_URL is not set.
contract LeagueEscrowForkTest is Test {
    address constant USDT = 0x55d398326f99059fF775485246999027B3197955;
    address constant NVDAB = 0x02Fca66C1D1aFB4E2A7884261eB00F63598a7436;
    address constant MSFTB = 0x80106cb3EAD06659A5ad19DF39D9b4733863B9b0;
    address constant TSLAB = 0x5b1910eAaD6450E50f816082Aa078C41F10C292f;

    LeagueEscrow escrow;
    address creator = makeAddr("creator");
    bool forked;

    function setUp() public {
        string memory rpc = vm.envOr("BSC_RPC_URL", string(""));
        if (bytes(rpc).length == 0) return;
        vm.createSelectFork(rpc);
        forked = true;
        escrow = new LeagueEscrow(USDT, address(this));
        escrow.setTokenAllowed(NVDAB, true);
        escrow.setTokenAllowed(MSFTB, true);
        escrow.setTokenAllowed(TSLAB, true);
    }

    function test_realBStocksLockAndReturn() public {
        if (!forked) return;
        uint64 close = uint64(block.timestamp + 1 hours);
        uint256 roundId = escrow.openRound(close, close + 1 hours, 5e18, 100, 20);

        address[3] memory toks = [NVDAB, MSFTB, TSLAB];
        address[] memory t = new address[](3);
        uint256[] memory a = new uint256[](3);
        for (uint256 i; i < 3; ++i) {
            t[i] = toks[i];
            a[i] = 0.01e18;
            deal(toks[i], creator, 0.01e18);
        }
        deal(USDT, creator, 5e18);

        vm.startPrank(creator);
        IERC20(USDT).approve(address(escrow), type(uint256).max);
        for (uint256 i; i < 3; ++i) IERC20(toks[i]).approve(address(escrow), type(uint256).max);
        escrow.enterCreator(roundId, keccak256("basket"), t, a);
        vm.stopPrank();

        for (uint256 i; i < 3; ++i) {
            assertEq(IERC20(toks[i]).balanceOf(address(escrow)), 0.01e18, "locked");
        }

        escrow.voidRound(roundId);
        vm.prank(creator);
        escrow.claim(roundId);
        for (uint256 i; i < 3; ++i) {
            assertEq(IERC20(toks[i]).balanceOf(creator), 0.01e18, "returned");
        }
        assertEq(IERC20(USDT).balanceOf(creator), 5e18, "stake refunded");
    }
}
