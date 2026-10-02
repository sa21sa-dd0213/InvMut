import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test - m3aad18c1", function () {
  it("should revert when sending value other than exactly 10 ether (mutant removed the require)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to send 1 ether instead of the required 10 ether
    // Original contract would revert due to require(msg.value == 10 ether)
    // Mutant removed this require, so the call would succeed - killing the mutant
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("1"),
      })
    ).to.be.reverted;
  });
});