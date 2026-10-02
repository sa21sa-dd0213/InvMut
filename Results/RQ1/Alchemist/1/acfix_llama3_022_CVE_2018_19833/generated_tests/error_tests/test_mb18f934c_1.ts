import { expect } from "chai";
import { ethers } } from "hardhat";

describe("ERCDDAToken mutant mb18f934c test", function () {
  it("should detect the mutant that changes >= to == in overflow check", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy with initial supply of 1000 tokens (0 decimals, so no need for parseEther)
    const initialSupply = 1000;
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, "TestToken", "TT");
    await instance.waitForDeployment();

    // Give addr1 some tokens first
    await instance.transfer(addr1.address, 100);
    
    // Now transfer from addr1 to addr2 who already has some tokens (addr2 starts with 0)
    // First give addr2 some tokens to have a positive balance
    await instance.transfer(addr2.address, 50);
    
    // Now try transferring from addr1 to addr2 with a non-zero amount
    // In the original contract, this should succeed because 50 + 30 >= 50
    // In the mutant, this will revert because 50 + 30 != 50
    await expect(
      instance.connect(addr1).transfer(addr2.address, 30)
    ).to.be.reverted;
  });
});