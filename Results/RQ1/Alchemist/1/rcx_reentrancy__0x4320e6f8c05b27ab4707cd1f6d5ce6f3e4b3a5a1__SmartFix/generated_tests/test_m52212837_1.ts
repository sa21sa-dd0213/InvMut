import { expect } from "chai";
import { ethers } from "hardhat";

describe("ACCURAL_DEPOSIT mutant kill test", function () {
  it("should revert when depositing 0 ether on mutant, but pass on original", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ACCURAL_DEPOSIT");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call Deposit with 0 ether - should revert on mutant due to msg.value-1 underflow
    await expect(
      instance.connect(addr1).Deposit({ value: 0 })
    ).to.be.reverted;
  });
});