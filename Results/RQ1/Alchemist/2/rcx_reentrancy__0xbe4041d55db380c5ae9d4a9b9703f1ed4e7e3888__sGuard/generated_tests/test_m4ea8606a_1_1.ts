import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant m4ea8606a test", function () {
  it("should detect the block.timestamp vs block.prevrandao mutation in Collect", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to 0 so balance requirement is easily met
    await instance.connect(owner).SetMinSum(0);
    
    // Initialize the contract
    await instance.connect(owner).Initialized();

    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTimestamp = blockBefore!.timestamp;

    // addr1 deposits 1 ether with a lock time of 1 second
    const depositAmount = ethers.parseEther("1");
    await instance.connect(addr1).Put(1, { value: depositAmount });

    // Mine a new block to advance time (unlock time = currentTimestamp + 1)
    await ethers.provider.send("evm_mine", []);

    // Wait for unlock time to pass (mine blocks until timestamp > unlockTime)
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + 2]);
    await ethers.provider.send("evm_mine", []);

    // Now try to collect - should succeed on original but fail on mutant
    // because block.prevrandao is not guaranteed to be > unlockTime
    await expect(
      instance.connect(addr1).Collect(depositAmount)
    ).to.be.reverted;
  });
});