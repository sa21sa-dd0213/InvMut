import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant detection", function () {
  it("should revert when unlockTime equals block.timestamp (kill mutant m05f9dbfb)", async function () {
    const [owner, dao, governedAddress, sender] = await ethers.getSigners();

    // Deploy with DAO address
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(dao.address);
    await instance.waitForDeployment();

    // Configure DAO and governance via DAO address
    // First, set DAO and configure the contract as needed for testing
    await instance.connect(dao).setDAO(dao.address);

    // Set up governed address
    await instance.connect(dao).setGoverned([governedAddress.address], [true]);

    // Deploy a mock ERC20 token for testing
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Test", "TST", ethers.parseEther("1000"));
    await mockToken.waitForDeployment();

    // Configure flash governance with asset, amount, and unlockTime
    const amount = ethers.parseEther("100");
    const unlockTime = 3600; // 1 hour
    const assetBurnable = false;

    // Need to configure through successful proposal - use DAO to bypass for testing
    // Configure flash governance parameters
    await instance.connect(dao).configureFlashGovernance(
      mockToken.target,
      amount,
      unlockTime,
      assetBurnable
    );

    // Transfer tokens to sender for the flash governance test
    await mockToken.transfer(sender.address, amount);
    await mockToken.connect(sender).approve(instance.target, amount);

    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTimestamp = blockBefore!.timestamp;

    // Set the pendingFlashDecision unlockTime to exactly equal current timestamp
    // We can manipulate this by calling withdrawGovernanceAsset or similar
    // For the test, we need to create a scenario where unlockTime == block.timestamp

    // First, make a successful flash governance decision to create pending entry
    // Then try to assert governance approval when unlockTime equals block.timestamp

    // The key test: try to call assertGovernanceApproved when unlockTime == block.timestamp
    // Original contract reverts (<), mutant allows (<=)

    // To set up the exact condition, we'll call configureFlashGovernance with unlockTime = 0
    // and then immediately call assertGovernanceApproved in the same block
    await instance.connect(dao).configureFlashGovernance(
      mockToken.target,
      amount,
      0, // unlockTime = 0, so when block.timestamp > 0, it's unlocked
      assetBurnable
    );

    // Now call assertGovernanceApproved through governed address
    // This should succeed because unlockTime (0) < block.timestamp
    await instance.connect(governedAddress).assertGovernanceApproved(
      sender.address,
      instance.target,
      false
    );

    // Now test the mutant: set unlockTime exactly equal to block.timestamp
    // We need to get the current timestamp again
    const blockNumAfter = await ethers.provider.getBlockNumber();
    const blockAfter = await ethers.provider.getBlock(blockNumAfter);
    const exactTimestamp = blockAfter!.timestamp;

    // Configure with unlockTime equal to current timestamp
    await instance.connect(dao).configureFlashGovernance(
      mockToken.target,
      amount,
      exactTimestamp, // unlockTime == block.timestamp
      assetBurnable
    );

    // This call should revert in original (unlockTime < block.timestamp is false)
    // but pass in mutant (unlockTime <= block.timestamp is true)
    await expect(
      instance.connect(governedAddress).assertGovernanceApproved(
        sender.address,
        instance.target,
        false
      )
    ).to.be.reverted;
  });
});