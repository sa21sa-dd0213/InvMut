import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant test - m4438f23f", function () {
  it("should revert when non-owner calls withdraw without onlyOwner modifier", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether
    const fundAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount,
    });

    // Attempt to withdraw from non-owner address - should revert in original but succeed in mutant
    const withdrawAmount = ethers.parseEther("0.5");
    await expect(
      instance.connect(addr1).withdraw(withdrawAmount)
    ).to.be.reverted;
  });
});