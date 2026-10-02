import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant detection - mintToken access control", function () {
  it("should revert when non-owner calls mintToken (original behavior)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    
    // Constructor: initialSupply, tokenName, tokenSymbol
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";
    
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();
    
    // Attempt to call mintToken from a non-owner address
    // Original contract would revert due to onlyOwner modifier
    // Mutant would allow this call to succeed
    await expect(
      instance.connect(addr1).mintToken(addr1.address, 100)
    ).to.be.reverted;
  });
});