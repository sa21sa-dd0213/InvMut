import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant kill test - executeBatch length validation", function () {
  it("should revert when targets.length != datas.length in executeBatch (original behavior)", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();

    // Deploy with proposer and executor roles
    const Factory = await ethers.getContractFactory("TimelockController");
    const minDelay = 3600; // 1 hour
    const proposers = [proposer.address];
    const executors = [executor.address];
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();

    // Schedule a batch operation first
    const targets = [owner.address, owner.address];
    const values = [0, 0];
    const datas = ["0x01"]; // Only 1 data element vs 2 targets
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    const delay = minDelay;

    // Connect as proposer to schedule
    const instanceAsProposer = instance.connect(proposer);

    // Schedule the batch operation
    const scheduleTx = await instanceAsProposer.scheduleBatch(
      targets,
      values,
      datas,
      predecessor,
      salt,
      delay
    );
    await scheduleTx.wait();

    // Fast forward time past the delay
    await ethers.provider.send("evm_increaseTime", [delay + 1]);
    await ethers.provider.send("evm_mine", []);

    // Try to execute with mismatched lengths - this should revert on original
    const instanceAsExecutor = instance.connect(executor);

    // Use mismatched arrays: 2 targets but 1 data
    await expect(
      instanceAsExecutor.executeBatch(
        targets,
        values,
        datas,
        predecessor,
        salt,
        { value: 0 }
      )
    ).to.be.revertedWith("TimelockController: length mismatch");
  });
});