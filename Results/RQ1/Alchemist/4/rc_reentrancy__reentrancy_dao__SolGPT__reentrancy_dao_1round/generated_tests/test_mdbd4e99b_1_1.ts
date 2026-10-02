import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant kill test", function () {
  it("should revert on withdrawAll when deposit records inflated credit (mutant adds +1 wei)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");

    // Deposit exactly 1 ETH
    await instance.connect(owner).deposit({ value: depositAmount });

    // WithdrawAll should revert because mutant recorded credit = depositAmount + 1 wei,
    // but actual contract balance is only depositAmount, causing the call to send more ETH
    // than the contract holds, which makes the require(callResult) fail.
    await expect(
      instance.connect(owner).withdrawAll()
    ).to.be.reverted;
  });
});