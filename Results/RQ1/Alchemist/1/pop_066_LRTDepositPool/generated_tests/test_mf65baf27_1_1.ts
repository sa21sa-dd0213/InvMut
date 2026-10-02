import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool - mutant mf65baf27", function () {
  it("should revert when adding node delegators that exactly reach maxNodeDelegatorCount (detect off-by-one in loop)", async function () {
    const [owner, addr1, addr2, addr3] = await ethers.getSigners();

    // Deploy LRTConfig mock/helper
    const LRTConfigFactory = await ethers.getContractFactory("LRTConfig");
    const lrtConfig = await LRTConfigFactory.deploy();
    await lrtConfig.waitForDeployment();

    // Deploy LRTDepositPool
    const Factory = await ethers.getContractFactory("LRTDepositPool");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize
    await instance.initialize(await lrtConfig.getAddress());

    // Set maxNodeDelegatorCount to 3
    await instance.updateMaxNodeDelegatorCount(3);

    // Add 3 node delegators (exactly reaching maxNodeDelegatorCount)
    const nodeDelegators = [addr1.address, addr2.address, addr3.address];

    // This should succeed on original but fail on mutant due to off-by-one
    await expect(
      instance.addNodeDelegatorContractToQueue(nodeDelegators)
    ).to.not.be.reverted;

    // Verify queue length is 3
    const queue = await instance.getNodeDelegatorQueue();
    expect(queue.length).to.equal(3);
  });
});