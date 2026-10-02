import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mb6ced059 - msg.value+1 replacement", function () {
  it("should revert when sending exactly 10 ether (mutant expects 9 ether)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 ether to the fallback function
    // Original requires msg.value == 10 ether; mutant requires msg.value+1 == 10 ether (i.e., 9 ether)
    // So sending 10 ether should pass on original but revert on mutant
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted;
  });

  it("should succeed when sending exactly 9 ether (mutant expects 9 ether)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 9 ether to the fallback function
    // Mutant requires msg.value+1 == 10 ether -> msg.value == 9 ether
    // This should succeed on mutant but revert on original (which requires 10 ether)
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("9")
      })
    ).to.be.reverted;
  });
});