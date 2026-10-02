import { expect } from "chai";
import { ethers } from "hardhat";

describe("DnGmxBatchingManager mutant m73371faf test", function () {
  it("should detect mutant that sets keeper to address(this) instead of provided address", async function () {
    const [owner, keeper, unauthorized] = await ethers.getSigners();
    
    // Deploy the contract
    const Factory = await ethers.getContractFactory("DnGmxBatchingManager");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    const mockSGlp = await ethers.deployContract("MockERC20", ["sGLP", "sGLP"]);
    const mockUsdc = await ethers.deployContract("MockERC20", ["USDC", "USDC"]);
    const mockRewardRouter = await ethers.deployContract("MockRewardRouterV2");
    const mockGlpManager = await ethers.deployContract("MockGlpManager");
    const mockJuniorVault = await ethers.deployContract("MockDnGmxJuniorVault");
    
    await instance.initialize(
      mockSGlp.target,
      mockUsdc.target,
      mockRewardRouter.target,
      mockGlpManager.target,
      mockJuniorVault.target,
      keeper.address
    );
    
    // Call setKeeper with the keeper address
    await instance.connect(owner).setKeeper(keeper.address);
    
    // Now try to call pauseDeposit() from the keeper address
    // In the original contract, this should succeed because keeper is set to keeper.address
    // In the mutant, keeper is set to address(this) instead, so this should revert
    await expect(
      instance.connect(keeper).pauseDeposit()
    ).to.be.revertedWithCustomError(instance, "CallerNotKeeper");
    
    // Additionally verify that the owner can still call setKeeper
    // But the contract address should not be able to call keeper functions
    await expect(
      instance.connect(owner).pauseDeposit()
    ).to.be.revertedWithCustomError(instance, "CallerNotKeeper");
  });
});