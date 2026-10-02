import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant m0d8d3322 test", function () {
  it("should revert when depositing zero value (mutant changes > to >=)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to deposit with msg.value = 0
    // Original contract: assert(balances[msg.sender] + msg.value > balances[msg.sender])
    // with msg.value = 0, this becomes 0 > 0 which is false → revert
    // Mutant: assert(balances[msg.sender] + msg.value >= balances[msg.sender])
    // with msg.value = 0, this becomes 0 >= 0 which is true → would not revert
    await expect(
      instance.connect(owner).deposit({ value: 0 })
    ).to.be.reverted;
  });
});