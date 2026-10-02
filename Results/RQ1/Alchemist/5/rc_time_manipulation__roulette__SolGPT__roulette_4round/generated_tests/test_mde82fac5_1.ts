import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mde82fac5 test", function () {
  it("should revert when sending more than 10 ether (original requires exact 10 ether)", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with initial balance so transfer can work if condition passes
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Get the contract's pastBlockTime to ensure block.timestamp > pastBlockTime
    const pastBlockTime = await instance.pastBlockTime();
    
    // Send 11 ether (more than required 10) - should revert in original, pass in mutant
    await expect(
      attacker.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("11")
      })
    ).to.be.reverted;
  });
});