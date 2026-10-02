import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test - m277fac66", function () {
  it("should revert when sending exactly 10 ether to the mutant (which expects 11 ether)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with initial balance to allow potential transfer
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Send exactly 10 ether to the fallback function - should succeed on original but fail on mutant
    const tx = addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // On the mutant, require(msg.value-1 == 10 ether) means 10 ether becomes 9 ether, which is not equal to 10
    await expect(tx).to.be.reverted;
  });
});