import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m2a879f35 test", function () {
  it("should revert when sending exactly 10 ether (mutant changes == to !=)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // In the original contract, sending exactly 10 ether succeeds.
    // In the mutant (where require(msg.value != 10 ether)), sending exactly 10 ether should revert.
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10"),
      })
    ).to.be.reverted;
  });
});