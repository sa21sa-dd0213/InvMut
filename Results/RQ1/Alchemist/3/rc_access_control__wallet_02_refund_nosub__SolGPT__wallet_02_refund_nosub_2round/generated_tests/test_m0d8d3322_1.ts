import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant detection - deposit with zero value", function () {
  it("should revert when depositing zero ether (kills mutant with >= instead of >)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changes assert(balances[msg.sender] + msg.value > balances[msg.sender])
    // to assert(balances[msg.sender] + msg.value >= balances[msg.sender]).
    // Original contract reverts on zero-value deposit (0 > 0 is false).
    // Mutant allows zero-value deposit (0 >= 0 is true).
    await expect(
      instance.connect(owner).deposit({ value: ethers.parseEther("0") })
    ).to.be.reverted;
  });
});