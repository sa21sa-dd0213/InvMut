import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test - m3aad18c1", function () {
  it("should revert when sending value other than exactly 10 ether", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 1 ether (not 10 ether) - original should revert, mutant should not
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("1")
      })
    ).to.be.reverted;
  });
});