import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant test for executeBatch length validation", function () {
  it("should revert when targets and datas arrays have different lengths in executeBatch", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();

    // Deploy with minimal delay and set proposer and executor roles
    const minDelay = 3600; // 1 hour
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(
      minDelay,
      [proposer.address], // proposers
      [executor.address]  // executors
    );
    await instance.waitForDeployment();

    // Setup: proposer schedules an operation (needed for executeBatch to have something to execute)
    const target = owner.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.hexlify(ethers.randomBytes(32));
    const delay = minDelay;

    // Schedule a single operation first (to have a valid id)
    await instance.connect(proposer).schedule(
      target,
      value,
      data,
      predecessor,
      salt,
      delay
    );

    // Fast forward time to make operation ready
    await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
    await ethers.provider.send("evm_mine", []);

    // Now test executeBatch with mismatched lengths between targets and datas
    const targets = [target, target]; // 2 targets
    const values = [value, value];    // 2 values
    const datas = [data];             // Only 1 data - this should cause a revert in original

    // The original contract should revert because targets.length (2) != datas.length (1)
    // The mutant removes this check, so it would not revert
    await expect(
      instance.connect(executor).executeBatch(
        targets,
        values,
        datas,
        predecessor,
        salt
      )
    ).to.be.revertedWith("TimelockController: length mismatch");
  });
});