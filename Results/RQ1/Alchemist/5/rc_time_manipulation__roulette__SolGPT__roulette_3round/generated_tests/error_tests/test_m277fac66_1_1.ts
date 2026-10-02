import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m277fac66 test", function () {
  it("should kill mutant by sending 10 ether and expecting success on original but revert on mutant", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 ether to trigger the fallback
    const tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // On original: require(msg.value == 10 ether) passes -> no revert
    // On mutant: require(msg.value - 1 == 10 ether) becomes require(9 == 10) -> revert
    await expect(tx).to.be.reverted;
  });
});