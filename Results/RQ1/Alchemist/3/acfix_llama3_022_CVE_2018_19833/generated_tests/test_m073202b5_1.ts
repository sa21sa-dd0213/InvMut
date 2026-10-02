import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant detection", function () {
  it("should kill mutant m073202b5 by transferring 0 tokens to an address with non-zero balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";

    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // First, transfer some tokens to addr1 so it has a non-zero balance
    const transferAmount = ethers.parseEther("100");
    await instance.connect(owner).transfer(addr1.address, transferAmount);

    // Now try to transfer 0 tokens to addr1
    // Original: should succeed (balanceOf[addr1] + 0 >= balanceOf[addr1])
    // Mutant:  balanceOf[addr1] * 0 >= balanceOf[addr1] => 0 >= balanceOf[addr1] => false (since balance > 0)
    await expect(
      instance.connect(owner).transfer(addr1.address, 0)
    ).to.not.be.reverted;
  });
});