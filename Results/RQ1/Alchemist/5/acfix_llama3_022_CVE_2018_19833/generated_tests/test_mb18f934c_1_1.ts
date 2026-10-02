import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant kill test - mb18f934c", function () {
  it("should kill mutant by transferring non-zero amount to an address with existing balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";

    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // First, transfer some tokens to addr1 so it has a non-zero balance
    const initialTransferAmount = 100;
    await instance.transfer(addr1.address, initialTransferAmount);

    // Now transfer a non-zero amount to addr1 again - this should succeed in original but fail in mutant
    // because mutant requires balanceOf[_to] + _value == balanceOf[_to] which only holds for _value = 0
    const secondTransferAmount = 50;

    // In the original contract this succeeds; in the mutant it reverts
    await expect(
      instance.transfer(addr1.address, secondTransferAmount)
    ).to.not.be.reverted;
  });
});