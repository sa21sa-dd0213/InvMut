import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant detection - withdraw modifier removed", function () {
  it("should revert when non-owner tries to withdraw", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the wallet with some ether so there's something to withdraw
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await tx.wait();

    // Non-owner tries to withdraw - should revert on original, pass on mutant
    await expect(
      instance.connect(nonOwner).withdraw(ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});