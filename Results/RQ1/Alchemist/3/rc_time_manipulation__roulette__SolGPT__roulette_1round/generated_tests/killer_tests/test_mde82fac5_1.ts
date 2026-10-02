import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mde82fac5 - require(msg.value >= 10 ether)", function () {
  it("should revert when sending exactly 10 ether (original behavior) but should pass with >10 ether (mutant behavior)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First send 10 ether to set pastBlockTime
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Now send 11 ether - should revert on original (requires exactly 10),
    // but should pass on mutant (requires >= 10)
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("11")
      })
    ).to.be.reverted;
  });
});