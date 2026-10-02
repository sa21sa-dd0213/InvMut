import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant m8ddb6827 test", function () {
  it("should detect mutant that changed >= to <= in _transfer balance check", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";
    
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Transfer tokens from owner to addr1 first so addr1 has some balance
    const transferAmount = 100;
    await instance.transfer(addr1.address, transferAmount);

    // Now addr1 has 100 tokens. Try to transfer 50 tokens (less than balance)
    // This should succeed in original contract (balance 100 >= 50)
    // But in mutant (balance 100 <= 50 is false), this should revert
    await expect(
      instance.connect(addr1).transfer(owner.address, 50)
    ).to.be.reverted;
  });
});