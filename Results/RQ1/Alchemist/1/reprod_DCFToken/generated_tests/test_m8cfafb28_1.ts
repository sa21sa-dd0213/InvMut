import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant m8cfafb28 - distributeToken balance check", function () {
  it("should revert when balance is greater than distributeAmount due to == check in mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy DCF with a liquidity receive address
    const liquidityReceiveAddress = addr1.address;
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(liquidityReceiveAddress);
    await instance.waitForDeployment();
    
    // Set the caller (cfo) to owner
    await instance.setCaller(owner.address);
    
    // Set distribute address
    await instance.setDistributeAddress(addr1.address);
    
    // Get the current balance of the contract (should be 0 initially)
    const initialBalance = await instance.balanceOf(await instance.getAddress());
    
    // Transfer some tokens to the contract so balance > distributeAmount
    const distributeAmount = ethers.parseEther("2000");
    const transferAmount = distributeAmount * 2n; // 4000 tokens, double the distribute amount
    
    // Owner has the initial supply, transfer to contract
    await instance.transfer(await instance.getAddress(), transferAmount);
    
    // Verify contract balance is greater than distributeAmount
    const contractBalance = await instance.balanceOf(await instance.getAddress());
    expect(contractBalance).to.be.gt(distributeAmount);
    
    // This should revert on the mutant because balance == distributeAmount is required
    // but balance is greater than distributeAmount
    await expect(
      instance.distributeToken()
    ).to.be.revertedWith("Insufficient token balance");
  });
});