import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mba127442 - require(msg.value <= 10 ether)", function () {
  it("should revert when sending less than 10 ether (kills mutant that allows <= instead of ==)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to send 9 ether (less than required 10) to the fallback function
    // Original contract reverts because msg.value != 10 ether
    // Mutant accepts it (msg.value <= 10 ether) - so test passes on original, fails on mutant
    await expect(
      addr1.sendTransaction({
        to: instance.target,
        value: ethers.parseEther("9")
      })
    ).to.be.reverted;
  });
});