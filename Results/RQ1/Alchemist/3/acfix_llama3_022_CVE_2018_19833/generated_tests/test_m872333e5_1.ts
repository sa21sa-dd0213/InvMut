import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant detection test", function () {
  it("should detect mutant m872333e5 by transferring partial balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";

    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Transfer a portion of the owner's balance (less than full balance)
    const transferAmount = 100;
    const tx = instance.transfer(addr1.address, transferAmount);
    
    // Original contract: should succeed (balanceOf[owner] >= 100)
    // Mutant contract: should revert (balanceOf[owner] == 100 is false, since owner has 1000)
    await expect(tx).to.be.reverted;
  });
});