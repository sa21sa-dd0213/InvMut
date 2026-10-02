import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant m4438f23f - unauthorized withdraw", function () {
  it("should revert when non-owner tries to withdraw funds", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send some ETH to the contract so there's balance to withdraw
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Non-owner (addr1) attempts to withdraw - should revert in original, succeed in mutant
    await expect(
      instance.connect(addr1).withdraw(ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});