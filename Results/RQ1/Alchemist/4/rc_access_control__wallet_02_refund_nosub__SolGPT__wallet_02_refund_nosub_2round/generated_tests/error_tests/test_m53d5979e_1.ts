import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant m53d5979e", function () {
  it("should revert on zero-value deposit (original behavior) but mutant allows it", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to deposit 0 ether - should revert due to the original assert
    // The mutant's assert will incorrectly pass, so this test will fail on the mutant
    await expect(
      instance.connect(owner).deposit({ value: ethers.parseEther("0") })
    ).to.be.reverted;
  });
});