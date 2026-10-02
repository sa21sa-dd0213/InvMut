import { expect } from "chai";
import { ethers } from "hardhat";

describe("DnGmxBatchingManager - Mutant m876e8c45", function () {
    it("should detect mutant by verifying correct minUsdg calculation in executeBatchStake", async function () {
        const [owner, keeper, vault] = await ethers.getSigners();
        
        // Deploy mock contracts needed for initialization
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const MockGlpManager = await ethers.getContractFactory("MockGlpManager");
        const MockRewardRouter = await ethers.getContractFactory("MockRewardRouter");
        const MockVault = await ethers.getContractFactory("MockVault");
        const MockJuniorVault = await ethers.getContractFactory("MockJuniorVault");
        
        const sGlp = await MockERC20.deploy("sGLP", "sGLP", 18);
        const usdc = await MockERC20.deploy("USDC", "USDC", 6);
        const glpManager = await MockGlpManager.deploy();
        const rewardRouter = await MockRewardRouter.deploy();
        const gmxUnderlyingVault = await MockVault.deploy();
        const dnGmxJuniorVault = await MockJuniorVault.deploy();
        
        // Setup mock responses
        await glpManager.setVault(gmxUnderlyingVault.address);
        
        // Deploy main contract
        const Factory = await ethers.getContractFactory("DnGmxBatchingManager");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        
        // Initialize contract
        await instance.initialize(
            sGlp.target,
            usdc.target,
            rewardRouter.target,
            glpManager.target,
            dnGmxJuniorVault.target,
            keeper.address
        );
        
        // Set keeper
        await instance.setKeeper(keeper.address);
        
        // Set slippage threshold to a specific value for predictable calculation
        const slippageBps = 100; // 1% slippage
        await instance.setThresholds(slippageBps);
        
        // Setup test: deposit USDC to create round balance
        const depositAmount = ethers.parseUnits("1000", 6); // 1000 USDC
        await usdc.mint(owner.address, depositAmount);
        await usdc.connect(owner).approve(instance.target, depositAmount);
        await instance.connect(owner).depositUsdc(depositAmount, owner.address);
        
        // Setup mock price response
        const usdcPrice = ethers.parseUnits("1", 30); // $1 USDC price in 1e30 format
        await gmxUnderlyingVault.setMinPrice(usdc.target, usdcPrice);
        
        // Setup mock stake response
        const expectedStaked = ethers.parseUnits("990", 18); // ~99% of 1000 after slippage
        await rewardRouter.setMintAndStakeGlpReturn(expectedStaked);
        
        // Execute batch stake
        const tx = await instance.connect(keeper).executeBatchStake();
        const receipt = await tx.wait();
        
        // Check the roundGlpStaked value - original would produce ~990 GLP,
        // mutant with exponentiation would produce wildly different value or revert
        const roundGlpStaked = await instance.roundGlpStaked();
        
        // The correct calculation should give approximately 990 GLP (1000 USDC with 1% slippage)
        // The mutant would give either 0 (overflow) or astronomically different value
        expect(roundGlpStaked).to.be.closeTo(
            ethers.parseUnits("990", 18),
            ethers.parseUnits("10", 18) // Allow 1% tolerance for rounding
        );
    });
});