import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m277fac66 - msg.value-1 replacement", function () {
  it("should revert when sending exactly 10 ether (original behavior) because mutant requires 11 ether", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("0") });
    await instance.waitForDeployment();

    // The original contract accepts exactly 10 ether
    // The mutant changes the require to msg.value - 1 == 10 ether, so it expects 11 ether
    // Sending exactly 10 ether should pass on original but fail on mutant
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted;
  });
});