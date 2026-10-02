import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant test", function () {
  it("should revert when collecting at exactly unlock time (mutant allows it)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to 0 so balance check passes easily
    await instance.SetMinSum(0);
    // Initialize the contract (required before Put/Collect)
    await instance.Initialized();

    // Set lock time to 0 so that unlock time equals current block.timestamp
    // (since Put adds block.timestamp + _lockTime, with _lockTime = 0, unlockTime = block.timestamp)
    const tx = await instance.connect(addr1).Put(0, { value: ethers.parseEther("1") });
    await tx.wait();

    // Now attempt to collect exactly at unlock time (block.timestamp == acc.unlockTime)
    // The original contract requires >, so this should revert
    // The mutant uses >=, so it would succeed
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("1"))
    ).to.be.reverted;
  });
});