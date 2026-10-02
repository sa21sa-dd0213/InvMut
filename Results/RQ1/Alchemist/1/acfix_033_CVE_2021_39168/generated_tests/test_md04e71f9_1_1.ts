import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant test - cancel without modifier", function () {
  it("should revert when a non-proposer tries to cancel a pending operation", async function () {
    const [owner, proposer, executor, attacker] = await ethers.getSigners();

    // Deploy with minDelay = 1 day, one proposer, one executor
    const minDelay = 86400; // 1 day in seconds
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(
      minDelay,
      [proposer.address],
      [executor.address]
    );
    await instance.waitForDeployment();

    // Schedule an operation as proposer
    const target = owner.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    const delay = minDelay;

    await instance.connect(proposer).schedule(target, value, data, predecessor, salt, delay);

    // Get the operation id
    const id = await instance.hashOperation(target, value, data, predecessor, salt);

    // Verify operation is pending
    expect(await instance.isOperationPending(id)).to.be.true;

    // Attacker (non-proposer) tries to cancel - should revert
    await expect(
      instance.connect(attacker).cancel(id)
    ).to.be.reverted;

    // Also test that even executor without PROPOSER_ROLE cannot cancel
    await expect(
      instance.connect(executor).cancel(id)
    ).to.be.reverted;
  });
});