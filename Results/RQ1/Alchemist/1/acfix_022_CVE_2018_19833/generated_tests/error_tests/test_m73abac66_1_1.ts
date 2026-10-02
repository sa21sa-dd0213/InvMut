import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant test - m73abac66", function () {
  it("should revert when transferring tokens to an address with non-zero balance (mutant changes >= to <= in overflow check)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const initialSupply = 1000;
    const name = "TestToken";
    const symbol = "TT";
    
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, name, symbol);
    await instance.waitForDeployment();

    // First, transfer some tokens to addr1 so they have a non-zero balance
    const firstTransferAmount = 100;
    await instance.transfer(addr1.address, firstTransferAmount);
    
    // Now transfer additional tokens to addr1 (who already has a non-zero balance)
    const secondTransferAmount = 50;
    
    // In the original contract, this transfer should succeed
    // In the mutant (where >= is replaced with <=), the require will fail because
    // balanceOf[addr1] + secondTransferAmount (100 + 50 = 150) is NOT <= balanceOf[addr1] (100)
    // The mutated require expects sum <= original balance, which is false for positive amounts
    await expect(
      instance.transfer(addr1.address, secondTransferAmount)
    ).to.be.reverted;
  });
});