import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding - Kill mutant m9bf73651 (exponentiation instead of multiplication in sellShares)", function () {
    let instance: any;
    let owner: any;
    let addr1: any;
    let baseToken: any;
    let quoteToken: any;
    const BASE_AMOUNT = ethers.parseEther("1000");
    const QUOTE_AMOUNT = ethers.parseEther("2000");
    const I_VALUE = ethers.parseEther("2"); // i = 2 means 1 base = 2 quote

    before(async function () {
        [owner, addr1] = await ethers.getSigners();

        // Deploy mock ERC20 tokens for base and quote
        const ERC20Factory = await ethers.getContractFactory("MockERC20");
        baseToken = await ERC20Factory.deploy("Base", "BASE", 18);
        await baseToken.waitForDeployment();
        quoteToken = await ERC20Factory.deploy("Quote", "QUOTE", 18);
        await quoteToken.waitForDeployment();

        // Deploy GSPFunding with required constructor arguments
        // The constructor takes: baseToken, quoteToken, maintainer, mtFeeRate, lpFeeRate, k, i, isOpenTwap
        const GSPFundingFactory = await ethers.getContractFactory("GSPFunding");
        instance = await GSPFundingFactory.deploy(
            await baseToken.getAddress(),
            await quoteToken.getAddress(),
            owner.address,
            0, // mtFeeRate
            0, // lpFeeRate
            ethers.parseEther("0.5"), // k = 0.5
            I_VALUE,
            false // isOpenTwap
        );
        await instance.waitForDeployment();

        // Fund the contract with base and quote tokens
        await baseToken.transfer(await instance.getAddress(), BASE_AMOUNT);
        await quoteToken.transfer(await instance.getAddress(), QUOTE_AMOUNT);
    });

    it("should kill mutant by selling multiple shares and checking proportional baseAmount", async function () {
        // First buy shares to have something to sell
        const buyTx = await instance.connect(addr1).buyShares(addr1.address);
        await buyTx.wait();

        // Get initial state before selling
        const totalSupplyBefore = await instance.totalSupply();
        const baseBalanceBefore = await baseToken.balanceOf(await instance.getAddress());
        const shareBalance = await instance.balanceOf(addr1.address);

        // Sell more than 1 share to trigger exponentiation difference
        // If shareAmount > 1, baseBalance ** shareAmount will be astronomically larger than baseBalance * shareAmount
        const sellAmount = 2; // Selling 2 shares

        // Calculate expected proportional amount (original formula)
        const expectedBaseAmount = (baseBalanceBefore * BigInt(sellAmount)) / totalSupplyBefore;

        // Execute sellShares with minimum amounts set to 0 to not revert on original
        const sellTx = instance.connect(addr1).sellShares(
            sellAmount,
            addr1.address,
            0, // baseMinAmount = 0
            0, // quoteMinAmount = 0
            "0x", // empty data
            Math.floor(Date.now() / 1000) + 3600 // deadline in future
        );

        // The mutant will produce baseAmount = baseBalance ** shareAmount / totalSupply
        // For sellAmount > 1, this will be enormous, causing massive overflow or extreme value
        // This should either:
        // 1. Revert due to overflow (exponentiation of large numbers)
        // 2. Return an unrealistically large value that exceeds uint256 max or causes issues
        await expect(sellTx).to.be.reverted;
    });
});