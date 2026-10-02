import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m2a879f35 test", function () {
  it("should revert when sending exactly 10 ether due to mutated require condition", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 ether - should succeed on original but revert on mutant
    // because mutant changes require(msg.value == 10 ether) to require(msg.value != 10 ether)
    const tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    await expect(tx).to.be.reverted;
  });
});