import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test - m3aad18c1", function () {
  it("should revert when sending value other than exactly 10 ether (mutant removes this check)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("0") });
    await instance.waitForDeployment();

    // Send 5 ether (not 10 ether) - should revert on original but pass on mutant
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("5")
      })
    ).to.be.reverted;
  });
});