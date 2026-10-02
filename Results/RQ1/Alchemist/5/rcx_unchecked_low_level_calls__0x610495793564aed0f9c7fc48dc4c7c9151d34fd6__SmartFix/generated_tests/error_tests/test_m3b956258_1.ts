import { expect } from "chai";
import { ethers } } from "hardhat";

describe("SimpleWallet mutant m3b956258 - kill by unauthorized withdrawAll", function () {
  it("should revert when non-owner calls withdrawAll (original behavior)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so withdrawAll has balance to transfer
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt to call withdrawAll from unauthorized address
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.revertedWith(""); // original modifier reverts without message
  });
});