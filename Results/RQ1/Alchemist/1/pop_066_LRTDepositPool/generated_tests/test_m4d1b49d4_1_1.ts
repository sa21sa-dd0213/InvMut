import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool - kill mutant m4d1b49d4", function () {
  it("should detect arithmetic change in getTotalAssetDeposits when both assetLyingInNDCs and assetStakedInEigenLayer are non-zero", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy LRTConfig mock first (since LRTDepositPool requires it)
    const LRTConfigFactory = await ethers.getContractFactory("LRTConfig");
    const lrtConfig = await LRTConfigFactory.deploy();
    await lrtConfig.waitForDeployment();

    // Deploy LRTDepositPool with constructor arguments
    const Factory = await ethers.getContractFactory("LRTDepositPool");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.initialize(await lrtConfig.getAddress());

    // Deploy a mock ERC20 token for testing
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const mockAsset = await ERC20Factory.deploy("Test Asset", "TST", 18);
    await mockAsset.waitForDeployment();

    // Add the asset as supported in LRTConfig
    await lrtConfig.addNewSupportedAsset(await mockAsset.getAddress(), ethers.parseEther("1000000"));

    // Deploy a mock NodeDelegator
    const NodeDelegatorFactory = await ethers.getContractFactory("MockNodeDelegator");
    const mockND = await NodeDelegatorFactory.deploy();
    await mockND.waitForDeployment();

    // Add node delegator to queue
    await instance.addNodeDelegatorContractToQueue([await mockND.getAddress()]);

    // Transfer some tokens to the deposit pool
    await mockAsset.mint(owner.address, ethers.parseEther("1000"));
    await mockAsset.approve(await instance.getAddress(), ethers.parseEther("1000"));
    await instance.depositAsset(await mockAsset.getAddress(), ethers.parseEther("100"));

    // Transfer some tokens to the node delegator
    await mockAsset.mint(await mockND.getAddress(), ethers.parseEther("200"));

    // Set asset balance in node delegator to simulate staked amount
    await mockND.setAssetBalance(await mockAsset.getAddress(), ethers.parseEther("300"));

    // Now get total asset deposits
    const totalDeposits = await instance.getTotalAssetDeposits(await mockAsset.getAddress());

    // Original: 100 (in pool) + 200 (in NDC) + 300 (staked) = 600
    // Mutant: 100 + 200 * 300 = 60100
    // The test should expect the correct sum (600)
    expect(totalDeposits).to.equal(ethers.parseEther("600"));
  });
});