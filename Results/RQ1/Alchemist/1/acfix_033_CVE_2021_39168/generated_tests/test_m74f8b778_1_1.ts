import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant m74f8b778 test", function () {
  it("should revert when executing an operation with an incomplete predecessor", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy with proposers and executors
    const minDelay = 100; // 100 seconds
    const proposers = [owner.address];
    const executors = [owner.address];

    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();

    // Create two operations: op2 depends on op1 as predecessor
    const target = owner.address;
    const value = 0;
    const data = "0x";
    const salt1 = ethers.keccak256(ethers.toUtf8Bytes("salt1"));
    const salt2 = ethers.keccak256(ethers.toUtf8Bytes("salt2"));

    // Schedule first operation (no predecessor)
    const id1 = await instance.hashOperation(target, value, data, ethers.ZeroHash, salt1);
    await instance.connect(owner).schedule(target, value, data, ethers.ZeroHash, salt1, minDelay);

    // Schedule second operation with id1 as predecessor
    const id2 = await instance.hashOperation(target, value, data, id1, salt2);
    await instance.connect(owner).schedule(target, value, data, id1, salt2, minDelay);

    // Fast forward past the delay for both operations
    await ethers.provider.send("evm_increaseTime", [minDelay + 10]);
    await ethers.provider.send("evm_mine", []);

    // Try to execute the second operation BEFORE executing the first one
    // This should revert because predecessor (id1) is not done yet
    await expect(
      instance.connect(owner).execute(target, value, data, id1, salt2, { value: 0 })
    ).to.be.revertedWith("TimelockController: missing dependency");
  });
});