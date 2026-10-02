import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant test - ma037e8a8", function () {
  it("should fail on mutant when calling scheduleBatch with matching array lengths", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();

    // Deploy TimelockController with proposer and executor roles
    const minDelay = 100; // 100 seconds minimum delay
    const proposers = [proposer.address];
    const executors = [executor.address];

    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();

    // Grant PROPOSER_ROLE to proposer for scheduling
    const PROPOSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PROPOSER_ROLE"));
    await instance.connect(owner).grantRole(PROPOSER_ROLE, proposer.address);

    // Prepare test data with matching array lengths
    const targets = [owner.address];
    const values = [ethers.parseEther("0")];
    const datas = ["0x"];
    const predecessor = ethers.ZeroHash;
    const salt = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const delay = minDelay + 50; // Ensure delay >= minDelay

    // On original contract this should succeed, on mutant it should revert
    // because mutant changed == to != in length check
    await expect(
      instance.connect(proposer).scheduleBatch(
        targets,
        values,
        datas,
        predecessor,
        salt,
        delay
      )
    ).to.not.be.reverted;
  });
});