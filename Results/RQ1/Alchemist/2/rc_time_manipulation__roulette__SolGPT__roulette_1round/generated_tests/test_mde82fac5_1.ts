import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mde82fac5 test", function () {
  it("should revert when sending more than exactly 10 ether (kills mutant that uses >= instead of ==)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethert.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 11 ether to the contract (more than exactly 10)
    const tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("11")
    });

    // On original: reverts because msg.value != 10 ether
    // On mutant: succeeds because msg.value >= 10 ether
    await expect(tx).to.be.reverted;
  });
});