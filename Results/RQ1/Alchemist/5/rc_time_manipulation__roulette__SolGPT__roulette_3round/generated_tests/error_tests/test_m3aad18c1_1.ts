import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m3aad18c1", function () {
  it("should revert when sending less than 10 ether (mutant removed value check)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to send 5 ether instead of 10 ether - should revert on original but succeed on mutant
    const tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("5")
    });
    
    await expect(tx).to.be.reverted;
  });
});