import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m3aad18c1", function () {
  it("should reject a fallback call with value not equal to 10 ether", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 1 ether (not 10 ether) to the contract - original reverts, mutant would not
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("1"),
      })
    ).to.be.reverted;
  });
});