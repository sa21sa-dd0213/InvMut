import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m277fac66 - msg.value-1 == 10 ether", function () {
  it("should revert when sending exactly 10 ether, killing the mutant that requires 11 ether", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The original contract accepts exactly 10 ether.
    // The mutant changes the require to msg.value - 1 == 10 ether, meaning it needs 11 ether.
    // Sending 10 ether should succeed on original but revert on mutant.
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted;
  });
});