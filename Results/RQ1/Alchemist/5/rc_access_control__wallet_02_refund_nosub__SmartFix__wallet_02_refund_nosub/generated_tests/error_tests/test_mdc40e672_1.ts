import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant mdc40e672 - deposit with msg.value+1", function () {
  it("should revert when depositing 0 ether in the original, but mutant allows it", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to deposit 0 ether - original reverts, mutant passes
    await expect(
      instance.connect(owner).deposit({ value: ethers.parseEther("0") })
    ).to.be.reverted;
  });
});