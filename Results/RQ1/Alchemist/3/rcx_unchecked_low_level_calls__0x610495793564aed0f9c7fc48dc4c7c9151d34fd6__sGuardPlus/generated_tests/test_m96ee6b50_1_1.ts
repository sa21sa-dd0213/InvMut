import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant test - m96ee6b50", function () {
  it("should revert when non-owner tries to call withdraw", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so there is balance to withdraw
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Non-owner tries to withdraw a small amount - should revert on original, pass on mutant
    await expect(
      instance.connect(addr1).withdraw(ethers.parseEther("0.1"))
    ).to.be.reverted;
  });
});