import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when owner tries to burn more tokens than their balance (kills mutant that removes balance check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy with initial supply of 100 tokens (decimals = 0)
    const initialSupply = 100;
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, "TestToken", "TTK");
    await instance.waitForDeployment();
    
    // Owner has 100 tokens after deployment (initialSupply * 10^0 = 100)
    // Attempt to burn 200 tokens (more than owner's balance)
    // Original contract should revert due to require(balanceOf[msg.sender] >= _value)
    // Mutant without the check should not revert (or revert with underflow in Solidity 0.8+)
    await expect(
      instance.connect(owner).burn(200)
    ).to.be.reverted;
  });
});