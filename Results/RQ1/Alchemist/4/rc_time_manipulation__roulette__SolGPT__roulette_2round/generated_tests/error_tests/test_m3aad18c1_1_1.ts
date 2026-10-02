import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette - mutant m3aad18c1 detection", function () {
  it("should revert when sending 1 ether (not 10 ether) to fallback", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance to ensure transfer can succeed if condition passes
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Attempt to call fallback with 1 ether (should revert in original, succeed in mutant)
    await expect(
      user.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("1")
      })
    ).to.be.reverted;
  });
});