import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m2a879f35 - kill test", function () {
  it("should revert when sending exactly 10 ether to the fallback function (mutant requires != 10 ether)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 ether - should succeed on original, but revert on mutant
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted;
  });
});