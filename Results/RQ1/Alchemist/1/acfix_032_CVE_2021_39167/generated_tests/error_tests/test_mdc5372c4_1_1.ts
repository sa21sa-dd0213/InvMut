import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant detection - scheduleBatch array length check", function () {
  it("should revert when targets.length > values.length in scheduleBatch", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();

    const minDelay = 3600; // 1 hour in seconds
    const proposers = [proposer.address];
    const executors = [executor.address];

    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();

    // Setup: Grant PROPOSER_ROLE to the proposer
    const TIMELOCK_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TIMELOCK_ADMIN_ROLE"));
    await instance.connect(owner).grantRole(TIMELOCK_ADMIN_ROLE, proposer.address);
    const PROPOSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PROPOSER_ROLE"));
    await instance.connect(proposer).grantRole(PROPOSER_ROLE, proposer.address);

    // Prepare arrays where targets.length > values.length
    const targets = [executor.address, executor.address, executor.address]; // 3 targets
    const values = [ethers.parseEther("1"), ethers.parseEther("2")]; // only 2 values
    const datas = ["0x", "0x", "0x"]; // 3 data items
    const predecessor = ethers.ZeroHash;
    const salt = ethers.hexlify(ethers.randomBytes(32));
    const delay = minDelay + 100;

    // This should revert because targets.length (3) != values.length (2)
    await expect(
      instance.connect(proposer).scheduleBatch(targets, values, datas, predecessor, salt, delay)
    ).to.be.revertedWith("TimelockController: length mismatch");
  });
});