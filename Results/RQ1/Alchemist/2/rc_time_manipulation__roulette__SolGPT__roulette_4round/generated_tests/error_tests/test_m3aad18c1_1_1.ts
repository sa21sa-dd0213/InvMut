import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m3aad18c1 test", function () {
  it("should revert when sending value other than exactly 10 ether", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 1 ether (not 10 ether) to trigger fallback - original requires 10 ether
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("1")
      })
    ).to.be.reverted;
  });
});