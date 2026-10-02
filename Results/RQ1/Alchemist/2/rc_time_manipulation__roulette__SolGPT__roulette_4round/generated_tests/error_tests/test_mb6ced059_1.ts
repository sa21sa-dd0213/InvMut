import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test - mb6ced059", function () {
  it("should revert when sending exactly 10 ether to the fallback function (mutant requires 9 ether)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("0") });
    await instance.waitForDeployment();

    // Wait for block timestamp to be > pastBlockTime (initially 0)
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);

    // Send exactly 10 ether - should pass on original but revert on mutant
    const tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    await expect(tx).to.be.reverted;
  });
});