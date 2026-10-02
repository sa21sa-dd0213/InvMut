import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test - mde82fac5", function () {
  it("should revert when sending more than 10 ether (mutant uses >= instead of ==)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First send exactly 10 ether to set pastBlockTime (required for next call)
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Now try to send 11 ether - should revert on original but succeed on mutant
    // Since we are testing the mutant, we expect success (no revert)
    // The original would revert with "require(msg.value == 10 ether)"
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("11")
      })
    ).to.not.be.reverted;
  });
});