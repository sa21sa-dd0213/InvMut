import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant maba26d4a - onlyOwner modifier removal", function () {
  it("should revert when non-owner tries to call withdraw", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so there is balance to withdraw
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Non-owner attempts to withdraw - should revert in original, pass in mutant
    await expect(
      instance.connect(nonOwner).withdraw(ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});