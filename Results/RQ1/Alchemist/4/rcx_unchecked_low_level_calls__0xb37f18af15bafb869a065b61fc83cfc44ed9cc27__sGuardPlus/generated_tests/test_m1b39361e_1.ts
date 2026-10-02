import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant test - m1b39361e", function () {
  it("should revert when non-owner calls withdrawAll if onlyOwner modifier is present", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so there's something to withdraw
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt to call withdrawAll from non-owner address
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.reverted;
  });
});