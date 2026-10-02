import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool mutant kill test - ma1c8181a", function () {
  it("should revert when depositing amount exceeding current asset limit", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy LRTConfig mock
    const LRTConfigFactory = await ethers.getContractFactory("LRTConfig");
    const lrtConfig = await LRTConfigFactory.deploy();
    await lrtConfig.waitForDeployment();

    // Deploy a mock ERC20 token for testing
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    const mockAsset = await ERC20Factory.deploy("MockAsset", "MA", 18);
    await mockAsset.waitForDeployment();

    // Deploy LRTDepositPool
    const Factory = await ethers.getContractFactory("LRTDepositPool");
    const depositPool = await Factory.deploy();
    await depositPool.waitForDeployment();

    // Initialize the deposit pool
    await depositPool.initialize(await lrtConfig.getAddress());

    // Setup: Add asset as supported and set deposit limit
    await lrtConfig.addNewSupportedAsset(await mockAsset.getAddress(), ethers.parseEther("1000"));

    // Fund addr1 with tokens and approve deposit pool
    await mockAsset.mint(addr1.address, ethers.parseEther("2000"));
    await mockAsset.connect(addr1).approve(await depositPool.getAddress(), ethers.parseEther("2000"));

    // First deposit to reduce available limit
    await depositPool.connect(addr1).depositAsset(await mockAsset.getAddress(), ethers.parseEther("800"));

    // Now try to deposit an amount that exceeds the remaining limit (200 remaining, try 300)
    await expect(
      depositPool.connect(addr1).depositAsset(await mockAsset.getAddress(), ethers.parseEther("300"))
    ).to.be.revertedWith("MaximumDepositLimitReached");
  });
});