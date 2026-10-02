import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool - updateMaxNodeDelegatorCount event emission", function () {
  it("should emit MaxNodeDelegatorCountUpdated event when updating max node delegator count", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy LRTDepositPool
    const LRTDepositPoolFactory = await ethers.getContractFactory("LRTDepositPool");
    const lrtDepositPool = await LRTDepositPoolFactory.deploy();
    await lrtDepositPool.waitForDeployment();

    // Deploy a minimal LRTConfig for testing
    const LRTConfigFactory = await ethers.getContractFactory("LRTConfig");
    const lrtConfig = await LRTConfigFactory.deploy();
    await lrtConfig.waitForDeployment();

    // Initialize LRTDepositPool with the LRTConfig address
    await lrtDepositPool.initialize(await lrtConfig.getAddress());

    // Get the DEFAULT_ADMIN_ROLE to grant owner the admin role
    const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;

    // Grant owner the admin role in LRTConfig
    await lrtConfig.grantRole(DEFAULT_ADMIN_ROLE, owner.address);

    // Now call updateMaxNodeDelegatorCount and expect event emission
    const newMaxCount = 20;

    // Execute the transaction and capture the receipt
    const tx = await lrtDepositPool.connect(owner).updateMaxNodeDelegatorCount(newMaxCount);
    const receipt = await tx.wait();

    // Verify the event was emitted with the correct parameters
    await expect(tx)
      .to.emit(lrtDepositPool, "MaxNodeDelegatorCountUpdated")
      .withArgs(newMaxCount);
  });
});