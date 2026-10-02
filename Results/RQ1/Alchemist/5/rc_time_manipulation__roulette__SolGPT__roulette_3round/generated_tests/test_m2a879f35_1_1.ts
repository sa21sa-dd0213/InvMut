import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m2a879f35 detection", function () {
  it("should revert when sending exactly 10 ether to the mutant (where require uses !=)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changes require(msg.value == 10 ether) to require(msg.value != 10 ether)
    // So sending exactly 10 ether should revert in the mutant but succeed in the original
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted;
  });
});