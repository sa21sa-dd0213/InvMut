import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test - m277fac66", function () {
  it("should revert when sending exactly 10 ether to the mutant (msg.value-1 == 10 ether)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract first so it has balance to transfer in case block.number % 15 == 0
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // The original requires msg.value == 10 ether, mutant requires msg.value - 1 == 10 ether => msg.value == 11 ether
    // So sending exactly 10 ether should pass on original but revert on mutant
    await expect(
      addr1.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted;
  });
});