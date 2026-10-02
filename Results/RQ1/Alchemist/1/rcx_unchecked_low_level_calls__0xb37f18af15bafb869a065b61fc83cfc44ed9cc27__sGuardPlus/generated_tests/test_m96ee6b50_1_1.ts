import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant m96ee6b50 test", function () {
  it("should revert when non-owner tries to withdraw after the mutant removes onlyOwner modifier", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so there is balance to withdraw
    const fundAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });

    // Non-owner tries to withdraw - should revert on original, succeed on mutant
    // This test will fail (kill the mutant) because the mutant allows unauthorized withdrawal
    await expect(
      instance.connect(addr1).withdraw(ethers.parseEther("0.5"))
    ).to.be.revertedWith(""); // Empty revert reason as original uses onlyOwner modifier without custom error
  });
});