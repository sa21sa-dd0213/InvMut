import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant m2f925acf - burn without balance check", function () {
  it("should revert when burning more tokens than balance (kills mutant that removed require)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy with initial supply of 1000 tokens (0 decimals)
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(1000, "TestToken", "TTK");
    await instance.waitForDeployment();

    // Transfer some tokens to addr1 so they have a non-zero balance
    await instance.transfer(addr1.address, 100);
    
    // Attempt to burn more tokens than addr1's balance (burn 200, but balance is 100)
    // Original contract should revert due to require(balanceOf[msg.sender] >= _value)
    // Mutant missing this require will either succeed or revert due to underflow (different behavior)
    await expect(
      instance.connect(addr1).burn(200)
    ).to.be.reverted;
  });
});