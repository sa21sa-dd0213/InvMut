import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant kill test", function () {
  it("should revert when targets.length > datas.length in executeBatch", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    const minDelay = 100; // 100 seconds
    const proposers = [owner.address];
    const executors = [owner.address];

    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();

    const target = addr1.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;

    // Schedule the operation first
    const delay = 200;
    await instance.connect(owner).schedule(target, value, data, predecessor, salt, delay);

    // Wait for the delay to pass
    await ethers.provider.send("evm_increaseTime", [delay + 1]);
    await ethers.provider.send("evm_mine", []);

    // Attempt executeBatch with mismatched lengths: 2 targets but only 1 data array
    const targets = [target, target];
    const values = [value, value];
    const datas = [data]; // Only 1 data entry for 2 targets

    // The original contract requires targets.length == datas.length
    // The mutant allows targets.length >= datas.length
    // This should revert in the original but may not in the mutant
    await expect(
      instance.connect(owner).executeBatch(targets, values, datas, predecessor, salt)
    ).to.be.revertedWith("TimelockController: length mismatch");
  });
});