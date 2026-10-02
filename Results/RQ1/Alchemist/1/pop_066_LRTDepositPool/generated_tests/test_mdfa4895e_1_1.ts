import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool mutant detection - mdfa4895e", function () {
  it("should revert when depositing without approval, detecting the mutant that removed transferFrom check", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy mock ERC20 token
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20Factory.deploy("Mock Token", "MTK", ethers.parseEther("1000000"));
    await mockToken.waitForDeployment();

    // Deploy LRTConfig mock
    const LRTConfigFactory = await ethers.getContractFactory("MockLRTConfig");
    const lrtConfig = await LRTConfigFactory.deploy();
    await lrtConfig.waitForDeployment();

    // Setup LRTConfig to support our mock asset
    await lrtConfig.setSupportedAsset(await mockToken.getAddress(), ethers.parseEther("1000000"));

    // Deploy LRTDepositPool
    const LRTDepositPoolFactory = await ethers.getContractFactory("LRTDepositPool");
    const depositPool = await LRTDepositPoolFactory.deploy();
    await depositPool.waitForDeployment();

    // Initialize the deposit pool
    await depositPool.initialize(await lrtConfig.getAddress());

    // Deploy mock rsETH token
    const MockRsETHFactory = await ethers.getContractFactory("MockRSETH");
    const rsethToken = await MockRsETHFactory.deploy();
    await rsethToken.waitForDeployment();

    // Set rsETH in config
    await lrtConfig.setRsETH(await rsethToken.getAddress());

    // Fund user with some tokens
    const depositAmount = ethers.parseEther("100");
    await mockToken.transfer(await user.getAddress(), depositAmount);

    // User tries to deposit WITHOUT approving the contract
    // The original contract should revert with TokenTransferFailed
    // The mutant would incorrectly proceed and mint rsETH
    await expect(
      depositPool.connect(user).depositAsset(
        await mockToken.getAddress(),
        depositAmount
      )
    ).to.be.revertedWith("TokenTransferFailed");
  });
});