import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController - Kill mutant m23db0802", function () {
  it("should revert when executeBatch is called with mismatched targets and values array lengths", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();

    // Deploy with proposer and executor roles
    const Factory = await ethers.getContractFactory("TimelockController");
    const minDelay = 3600; // 1 hour in seconds
    const proposers = [proposer.address];
    const executors = [executor.address];
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();

    // Setup: Proposer schedules a batch operation
    const targets = [owner.address];
    const values = [ethers.parseEther("1.0"), ethers.parseEther("2.0")]; // Mismatched: 1 target but 2 values
    const datas = ["0x"];
    const predecessor = ethers.ZeroHash;
    const salt = ethers.hexlify(ethers.randomBytes(32));
    const delay = minDelay;

    // Schedule the operation (this will succeed since scheduleBatch doesn't check value lengths)
    await instance.connect(proposer).scheduleBatch(
      targets,
      values,
      datas,
      predecessor,
      salt,
      delay
    );

    // Fast forward time past the delay
    await ethers.provider.send("evm_increaseTime", [delay + 1]);
    await ethers.provider.send("evm_mine");

    // Attempt to execute with mismatched arrays - should revert
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