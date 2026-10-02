import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant m621f69bb", function () {
  it("should return correct token balance from getTokenBalance, killing mutant that removed return bal;", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the token's own address to check balance
    const tokenAddress = await instance.getAddress();

    // Transfer some tokens to addr1 so they have a non-zero balance
    const transferAmount = ethers.parseEther("100");
    await instance.transfer(addr1.address, transferAmount);

    // Call getTokenBalance with the token's own address and addr1
    // The contract should return the balance of addr1 in the token contract itself
    const balance = await instance.getTokenBalance(tokenAddress, addr1.address);

    // If the mutant is present (return bal; removed), this will return 0
    // If the original code is present, it will return the actual balance (100 tokens)
    expect(balance).to.equal(transferAmount);
  });
});