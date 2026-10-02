import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant test - onlyOwner modifier removed from withdraw", function () {
  it("should revert when non-owner calls withdraw (mutant kills this)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so withdrawal is possible
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Non-owner tries to call withdraw - should revert in original, but mutant allows it
    await expect(
      instance.connect(addr1).withdraw(ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});