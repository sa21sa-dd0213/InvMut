import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant kill test - symbol() return value", function () {
    it("should return the correct symbol from the underlying share token, not empty string", async function () {
        const [owner, addr1] = await ethers.getSigners();
        
        // Deploy a mock ERC20 to serve as asset token (needed for constructor)
        const MockERC20Factory = await ethers.getContractFactory("MockERC20");
        const assetToken = await MockERC20Factory.deploy("Asset Token", "ASSET", 18);
        await assetToken.waitForDeployment();
        
        // Deploy a mock TrancheToken that returns a known symbol
        const MockTrancheTokenFactory = await ethers.getContractFactory("MockTrancheToken");
        const shareToken = await MockTrancheTokenFactory.deploy("Tranche Token", "TRANCHE", 18);
        await shareToken.waitForDeployment();
        
        // Deploy mock InvestmentManager
        const MockInvestmentManagerFactory = await ethers.getContractFactory("MockInvestmentManager");
        const investmentManager = await MockInvestmentManagerFactory.deploy();
        await investmentManager.waitForDeployment();
        
        // Deploy LiquidityPool with constructor args: poolId, trancheId, asset, share, investmentManager
        const LiquidityPoolFactory = await ethers.getContractFactory("LiquidityPool");
        const poolId = 1;
        const trancheId = ethers.encodeBytes32String("tranche1");
        const instance = await LiquidityPoolFactory.deploy(
            poolId,
            trancheId,
            await assetToken.getAddress(),
            await shareToken.getAddress(),
            await investmentManager.getAddress()
        );
        await instance.waitForDeployment();
        
        // Call symbol() - the original returns share.symbol(), mutant just calls it without returning
        const symbol = await instance.symbol();
        
        // Assert that the returned symbol matches the underlying share token's symbol
        // The mutant will return empty string, so this assertion should fail on mutant
        expect(symbol).to.equal("TRANCHE");
    });
});