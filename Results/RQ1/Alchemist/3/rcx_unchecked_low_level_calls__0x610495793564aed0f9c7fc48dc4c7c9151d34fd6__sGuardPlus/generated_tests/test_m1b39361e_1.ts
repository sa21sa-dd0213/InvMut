import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant m1b39361e test", function () {
  it("should revert when non-owner calls withdrawAll (mutant removes onlyOwner check)", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so withdrawAll has balance to attempt to send
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Non-owner attempts to call withdrawAll - should revert in original,
    // but mutant will succeed (killing the test)
    await expect(
      instance.connect(nonOwner).withdrawAll()
    ).to.be.reverted;
  });
});