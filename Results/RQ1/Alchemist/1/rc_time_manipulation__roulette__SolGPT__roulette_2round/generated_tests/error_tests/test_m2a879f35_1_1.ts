import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test - m2a879f35", function () {
  it("should succeed when sending exactly 10 ether (original behavior), but mutant will revert", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 ether to trigger the fallback function
    // Original: require(msg.value == 10 ether) => should succeed
    // Mutant: require(msg.value != 10 ether) => will revert
    const tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // The transaction should succeed in the original, but fail in the mutant
    // We expect it to revert in the mutant
    await expect(tx).to.be.reverted;
  });
});