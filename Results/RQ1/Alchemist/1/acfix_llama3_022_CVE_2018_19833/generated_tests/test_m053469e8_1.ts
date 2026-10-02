import { expect } from "chai";
import { ethers } } from "hardhat";

describe("ERCDDAToken - kill mutant m053469e8", function () {
  it("should revert on normal transfer with positive amount when overflow guard is mutated to <= (kill mutant)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy contract with initial supply
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Perform a normal transfer with positive value
    const transferValue = 100;
    
    // In the mutant, require(balanceOf[_to] + _value <= balanceOf[_to]) will always revert
    // for any positive _value, because sum > original balance
    // Original contract would succeed, mutant should revert
    await expect(
      instance.connect(owner).transfer(addr1.address, transferValue)
    ).to.be.reverted;
  });
});