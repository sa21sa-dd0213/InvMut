import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant kill test - mcb9a6769", function () {
  it("should detect the mutant by transferring tokens to an address with existing balance", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TST";
    
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();
    
    // Transfer some tokens to addr1 first to create a non-zero balance
    const transferToAddr1 = await instance.transfer(addr1.address, 100);
    await transferToAddr1.wait();
    
    // Now transfer from owner to addr1 (who already has balance)
    // Original contract: require(balanceOf[_to] + _value >= balanceOf[_to]) - this will pass
    // Mutant: require(balanceOf[_to] - _value >= balanceOf[_to]) - this will revert because subtraction can't be >=
    const transferToAddr1Again = instance.transfer(addr1.address, 50);
    
    // The mutant will revert, so we expect the transaction to fail
    await expect(transferToAddr1Again).to.be.reverted;
  });
});