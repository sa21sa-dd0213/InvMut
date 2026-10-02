import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant m4cb5f9e1 - setDistributeAddress", function () {
  it("should kill the mutant by verifying distributeAddress is set correctly", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy DCF with a liquidity receive address
    const liquidityReceiveAddress = addr1.address;
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(liquidityReceiveAddress);
    await instance.waitForDeployment();
    
    // Set the CFO (caller) to owner for testing
    await instance.setCaller(owner.address);
    
    // Set a specific distribute address (addr2)
    const expectedDistributeAddress = addr2.address;
    await instance.setDistributeAddress(expectedDistributeAddress);
    
    // Get the actual distribute address from storage
    // Since distributeAddress is private, we need to check the behavior
    // by calling distributeToken and checking where tokens go
    
    // First, mint some tokens to the contract for distribution
    // The contract already has initial supply, we need to transfer some to it
    const distributeAmount = ethers.parseEther("2000");
    
    // Transfer tokens to the contract address so it has balance to distribute
    await instance.transfer(await instance.getAddress(), distributeAmount);
    
    // Call distributeToken
    await instance.distributeToken();
    
    // Check that the tokens went to addr2 (the expected distribute address)
    const addr2Balance = await instance.balanceOf(expectedDistributeAddress);
    expect(addr2Balance).to.equal(distributeAmount);
    
    // Check that the contract balance decreased
    const contractBalance = await instance.balanceOf(await instance.getAddress());
    expect(contractBalance).to.equal(0);
  });
});