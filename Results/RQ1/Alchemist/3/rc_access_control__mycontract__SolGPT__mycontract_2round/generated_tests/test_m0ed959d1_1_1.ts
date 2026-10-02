import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when sending to zero address in original, but mutant allows it - kill mutant m0ed959d1", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // In the original contract, receiver != address(0) is required, so sending to zero address reverts.
    // In the mutant, receiver == address(0) is required, so sending to zero address succeeds.
    // This test expects the original behavior (revert), which will fail on the mutant (no revert) - killing it.
    await expect(
      instance.connect(owner).sendTo(ethers.ZeroAddress, ethers.parseEther("1"))
    ).to.be.reverted;
  });
});