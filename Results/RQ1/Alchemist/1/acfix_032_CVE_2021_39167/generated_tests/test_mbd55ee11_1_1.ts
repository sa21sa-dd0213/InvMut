import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant kill test - mbd55ee11", function () {
  it("should detect the inverted length check in scheduleBatch", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("TimelockController");

    // Deploy with minimal configuration
    const minDelay = 100; // 100 seconds
    const proposers = [owner.address];
    const executors = [owner.address];
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();

    const targets = [addr1.address];
    const values = [ethers.parseEther("1")];
    const datas = ["0x"];
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    const delay = minDelay + 10; // sufficient delay

    // Test 1: Equal-length arrays should succeed on original but fail on mutant
    await expect(
      instance.connect(owner).scheduleBatch(
        targets,
        values,
        datas,
        predecessor,
        salt,
        delay
      )
    ).to.not.be.reverted; // On original contract, equal-length arrays should succeed

    // Test 2: Mismatched-length arrays should fail on original but succeed on mutant
    const mismatchedValues = [ethers.parseEther("1"), ethers.parseEther("2")]; // 2 values for 1 target
    await expect(
      instance.connect(owner).scheduleBatch(
        targets,
        mismatchedValues,
        datas,
        predecessor,
        salt,
        delay
      )
    ).to.be.revertedWith("TimelockController: length mismatch"); // On original contract, mismatched arrays should revert
  });
});