import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m4b20d086 by verifying transfers execute when _tos array has elements", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed for this contract)
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Deploy a simple ERC20-like token to test transferFrom
    // Using a minimal token contract for testing purposes
    const TokenFactory = await ethers.getContractFactory("contracts/ERC20Mock.sol:ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();

    // Fund owner with tokens and approve the airPort contract to spend them
    await token.approve(contractAddress, ethers.parseEther("100"));
    
    // Create recipients array
    const recipients = [addr1.address, addr2.address];
    const transferAmount = ethers.parseEther("10");

    // Call transfer function - original would execute transfers, mutant would not
    const tx = await instance.transfer(owner.address, tokenAddress, recipients, transferAmount);
    await tx.wait();

    // Verify that transfers actually occurred - mutant would leave balances unchanged
    const balance1 = await token.balanceOf(addr1.address);
    const balance2 = await token.balanceOf(addr2.address);

    // Original contract transfers tokens, mutant does not
    expect(balance1).to.equal(transferAmount);
    expect(balance2).to.equal(transferAmount);
  });
});