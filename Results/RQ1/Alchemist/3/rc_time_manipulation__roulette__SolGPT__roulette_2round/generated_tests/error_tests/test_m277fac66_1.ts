import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m277fac66 test", function () {
  it("should revert when sending exactly 10 ether because mutant requires 11 ether", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The original requires msg.value == 10 ether to proceed
    // The mutant requires msg.value - 1 == 10 ether, i.e., msg.value == 11 ether
    // Sending exactly 10 ether should revert in the mutant
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted;
  });
});