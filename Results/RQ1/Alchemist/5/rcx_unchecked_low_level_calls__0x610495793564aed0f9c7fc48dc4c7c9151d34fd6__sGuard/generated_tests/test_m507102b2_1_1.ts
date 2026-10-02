import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant detection - withdrawAll modifier", function () {
  it("should revert when non-owner calls withdrawAll (original has onlyOwner)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so there is something to withdraw
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Attempt withdrawAll from non-owner address - should revert in original
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.reverted;
  });
});