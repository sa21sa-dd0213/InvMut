import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet - kill mutant mafd2c245", function () {
  it("owner should be able to call withdrawAll (original passes, mutant reverts)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so withdrawAll has balance to send
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0"),
    });

    // Owner calls withdrawAll - should succeed in original, revert in mutant
    await expect(instance.connect(owner).withdrawAll()).to.not.be.reverted;
  });
});