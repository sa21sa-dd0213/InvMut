import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant kill test - md8a78e06", function () {
  it("should revert when transferring to an address with zero balance due to mutated require condition", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";

    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Owner has all tokens initially, transfer a small amount to addr1
    // In the original contract this should succeed
    // In the mutant, the require(balanceOf[_to] - _value >= balanceOf[_to]) will fail
    // because addr1's balance is 0, and 0 - 1 >= 0 is false
    await expect(
      instance.transfer(addr1.address, 1)
    ).to.be.reverted;
  });
});