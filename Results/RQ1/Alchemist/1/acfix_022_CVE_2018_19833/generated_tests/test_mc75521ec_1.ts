import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant mc75521ec detection", function () {
  it("should detect the mutant by transferring 0 tokens to an address with existing balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TST";
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Transfer some tokens to addr1 first so it has a non-zero balance
    await instance.transfer(addr1.address, 100);
    
    // Now attempt to transfer 0 tokens to addr1
    // In the original contract, this should succeed (balance check: balanceOf[addr1] + 0 >= balanceOf[addr1])
    // In the mutant, this will revert (balance check: balanceOf[addr1] * 0 >= balanceOf[addr1] => 0 >= balanceOf[addr1] fails)
    await expect(
      instance.connect(owner).transfer(addr1.address, 0)
    ).to.be.reverted;
  });
});