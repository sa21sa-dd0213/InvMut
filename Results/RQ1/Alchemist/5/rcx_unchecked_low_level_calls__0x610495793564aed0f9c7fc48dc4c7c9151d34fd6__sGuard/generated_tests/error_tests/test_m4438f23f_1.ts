import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant kill test - m4438f23f", function () {
  it("should revert when non-owner tries to withdraw", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether
    const fundingAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundingAmount
    });

    // Verify contract has balance
    expect(await ethers.provider.getBalance(await instance.getAddress())).to.equal(fundingAmount);

    // Non-owner tries to withdraw - should revert on original, pass on mutant
    await expect(
      instance.connect(addr1).withdraw(ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});