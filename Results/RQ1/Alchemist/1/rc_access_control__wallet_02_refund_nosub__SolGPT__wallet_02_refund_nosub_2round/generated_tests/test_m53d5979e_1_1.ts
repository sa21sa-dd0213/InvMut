import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant m53d5979e detection test", function () {
  it("should revert when depositing zero ether (msg.value = 0) due to assertion failure", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to deposit 0 ether - the original contract's assertion should fail
    // (balances[msg.sender] + 0 > balances[msg.sender] is false)
    // The mutant would incorrectly pass this because of the +1 in the assertion
    await expect(
      instance.connect(owner).deposit({ value: ethers.parseEther("0") })
    ).to.be.reverted;
  });
});