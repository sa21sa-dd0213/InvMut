import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test - kill mde82fac5", function () {
  it("should revert when sending more than exactly 10 ether to fallback", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance so transfer can work
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    // Attempt to send 10.5 ether (greater than 10) - should revert on original (==), pass on mutant (>=)
    await expect(
      addr1.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10.5")
      })
    ).to.be.reverted;
  });
});