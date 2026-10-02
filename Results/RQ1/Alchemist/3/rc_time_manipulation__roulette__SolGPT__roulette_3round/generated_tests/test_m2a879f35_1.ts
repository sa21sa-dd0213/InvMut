import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test - m2a879f35", function () {
  it("should kill mutant by sending exactly 10 ether and expecting success (mutant reverts)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 ether to the fallback function
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // In the original contract this succeeds; in the mutant it reverts
    await expect(tx).to.not.be.reverted;
  });
});