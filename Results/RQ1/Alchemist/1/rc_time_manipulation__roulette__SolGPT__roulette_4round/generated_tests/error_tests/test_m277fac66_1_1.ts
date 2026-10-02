import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m277fac66 detection", function () {
  it("should revert when sending exactly 10 ether to the fallback function (mutant expects 11 ether)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 ether - should succeed on original, but revert on mutant
    // because mutant requires msg.value - 1 == 10 ether, i.e., 11 ether
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted;
  });
});