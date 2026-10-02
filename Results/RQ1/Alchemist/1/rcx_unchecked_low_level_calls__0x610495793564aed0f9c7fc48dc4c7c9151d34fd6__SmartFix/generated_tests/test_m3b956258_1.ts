import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant kill test", function () {
  it("should revert when non-owner calls withdrawAll (detects removed onlyOwner modifier)", async function () {
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

    // Non-owner tries to call withdrawAll - should revert in original, succeed in mutant
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.reverted;
  });
});